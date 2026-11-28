/** Pace Intelligence — estimates, not official classification or live GPS data. */
export type TimedLap = {
  id: string
  kart: string
  lap: number | null
  durationMs: number
  receivedAt: number
  sectors: [number | null, number | null, number | null]
}
export type PaceSummary = {
  ownMedianMs: number
  fieldMedianMs: number
  deltaMs: number
  trendMs: number | null
  ownChangeMs: number | null
  fieldChangeMs: number | null
  sampleKarts: number
  sampleOwn: number
  status: 'improved'|'worse'|'stable'|'unknown'
}
export type LapRank = { rank: number; total: number; seconds: number; projected: boolean; checkpoint: 'S1'|'S2'|'META'; confidence: 'média'|'baixa'|'confirmada' }
export function parseLapTime(value: string): number | null {
  const s = value.trim()
  if (!s) return null
  const parts = s.split(':')
  if (parts.length > 3 || !parts.every(v => /^\d+(?:\.\d+)?$/.test(v))) return null
  const seconds = parts.reduce((acc, v) => acc * 60 + Number(v), 0)
  return seconds > 0 && seconds < 3600 && Number.isFinite(seconds) ? Math.round(seconds * 1000) : null
}
export function median(values: number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a,b) => a-b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid-1]+sorted[mid])/2
}
export function lastValidByKart(laps: TimedLap[], count = 5): Map<string, TimedLap[]> {
  const result = new Map<string, TimedLap[]>()
  for (const item of laps) {
    // 40–240 seconds default bounds protect against box/pause times; configurable later by circuit.
    if (item.durationMs < 40_000 || item.durationMs > 240_000) continue
    const group = result.get(item.kart) || []
    group.push(item)
    if (group.length > count * 2) group.shift()
    result.set(item.kart, group)
  }
  for (const [kart, group] of result) result.set(kart, group.slice(-count))
  return result
}
function mediansOfField(laps: TimedLap[], myKart: string, sampleSize: number, offset: number): number[] {
  const groups = new Map<string, number[]>()
  for (const item of laps) {
    if (item.kart === myKart || item.durationMs < 40_000 || item.durationMs > 240_000) continue
    const arr = groups.get(item.kart) || []
    arr.push(item.durationMs)
    groups.set(item.kart, arr)
  }
  return [...groups.values()].map(times => median(times.slice(-sampleSize-offset, offset ? -offset : undefined)))
    .filter((v):v is number => v !== null)
}
export function paceSummary(laps: TimedLap[], myKart: string, sampleSize = 5): PaceSummary | null {
  const ours = laps.filter(l => l.kart === myKart && l.durationMs >= 40_000 && l.durationMs <= 240_000)
  const latestOwn = ours.slice(-sampleSize)
  if (latestOwn.length < 2) return null
  const ownMedianMs = median(latestOwn.map(l => l.durationMs))!
  const others = mediansOfField(laps, myKart, sampleSize, 0)
  if (!others.length) return null
  const fieldMedianMs = median(others)!
  const prevOwn = ours.slice(-sampleSize*2, -sampleSize)
  const olderField = mediansOfField(laps, myKart, sampleSize, sampleSize)
  const previousOwnMs = prevOwn.length >= 2 ? median(prevOwn.map(l=>l.durationMs)) : null
  const previousFieldMs = olderField.length ? median(olderField) : null
  const ownChangeMs = previousOwnMs === null ? null : ownMedianMs-previousOwnMs
  const fieldChangeMs = previousFieldMs === null ? null : fieldMedianMs-previousFieldMs
  const trendMs = ownChangeMs === null || fieldChangeMs === null ? null : ownChangeMs-fieldChangeMs
  const status = trendMs === null ? 'unknown' : trendMs < -150 ? 'improved' : trendMs > 150 ? 'worse' : 'stable'
  return { ownMedianMs, fieldMedianMs, deltaMs: ownMedianMs-fieldMedianMs, trendMs,
    ownChangeMs, fieldChangeMs, sampleKarts: others.length, sampleOwn: latestOwn.length, status }
}
/** Compare one completed or projected lap with the latest median lap per rival kart. */
export function lapPerformance(laps: TimedLap[], myKart: string, partial: { sectors: [string,string,string], checkpoint?: string, lastEvent?: string }, sampleSize = 5): LapRank | null {
  const ours = laps.filter(l => l.kart === myKart && l.durationMs >= 40_000 && l.durationMs <= 240_000)
  const checkpoints = partial.checkpoint || partial.lastEvent
  const ownHistory = ours.slice(-sampleSize)
  const ownSectorTimes = [0,1,2].map(i => median(ownHistory.map(l => l.sectors[i]).filter((v):v is number => v !== null)))
  let estimate: number | null = null
  let checkpoint: LapRank['checkpoint'] = 'META'
  let projected = false
  if (checkpoints === 'S1') {
    const s1 = parseLapTime(partial.sectors[0]); const r1 = ownSectorTimes[1]; const r2 = ownSectorTimes[2]
    if (s1 !== null && r1 !== null && r2 !== null && ours.length >= 2) { estimate = s1+r1+r2; checkpoint = 'S1'; projected = true }
  } else if (checkpoints === 'S2') {
    const s1 = parseLapTime(partial.sectors[0]); const s2 = parseLapTime(partial.sectors[1]); const r2 = ownSectorTimes[2]
    if (s1 !== null && s2 !== null && r2 !== null && ours.length >= 2) { estimate = s1+s2+r2; checkpoint = 'S2'; projected = true }
  } else if (ours.length) estimate = ours.at(-1)!.durationMs
  if (estimate === null) return null
  const peers = mediansOfField(laps, myKart, sampleSize, 0)
  if (!peers.length) return null
  return { rank: 1 + peers.filter(t => t < estimate!).length, total: peers.length + 1,
    seconds: estimate/1000, projected, checkpoint,
    confidence: !projected ? 'confirmada' : checkpoint === 'S2' && ownHistory.length >= 3 ? 'média' : 'baixa' }
}
