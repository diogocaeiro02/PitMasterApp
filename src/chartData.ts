/** Data preparation for optional visualisations. Never fabricate missing laps or opponents. */
import { median, type TimedLap } from './pace.ts'
import type { StintSummary } from './stintAnalysis.ts'

export type PacePoint = { label: string; own: number; field: number | null }
export type RankPoint = { label: string; rank: number; total: number }
const valid = (lap: TimedLap) => Number.isFinite(lap.durationMs) && lap.durationMs >= 40_000 && lap.durationMs <= 240_000 && Number.isFinite(lap.receivedAt)

/** Field estimate at each OWN crossing: median of each rival's last five valid laps in the preceding 5 minutes. */
export function buildPaceSeries(laps: TimedLap[], myKart: string, maxPoints = 14): PacePoint[] {
  const sorted = laps.filter(valid).sort((a,b) => a.receivedAt-b.receivedAt)
  const ours = sorted.filter(l => l.kart === myKart).slice(-maxPoints)
  return ours.map((lap, index) => {
    const recent = new Map<string, number[]>()
    for (const rival of sorted) {
      if (rival.kart === myKart || rival.receivedAt > lap.receivedAt || rival.receivedAt < lap.receivedAt-300_000) continue
      const current = recent.get(rival.kart) || []
      current.push(rival.durationMs)
      if (current.length > 5) current.shift()
      recent.set(rival.kart, current)
    }
    const samples = [...recent.values()].filter(a => a.length >= 2).map(a=>median(a)!)
    return { label: lap.lap !== null ? `V${lap.lap}` : `${index+1}`, own: lap.durationMs/1000, field: samples.length >= 2 ? median(samples)!/1000 : null }
  })
}

/** Completed lap's placement versus rivals' recent medians available AT that lap's crossing. */
export function buildLapRankSeries(laps: TimedLap[], myKart: string, maxPoints = 12): RankPoint[] {
  const sorted = laps.filter(valid).sort((a,b) => a.receivedAt-b.receivedAt)
  return sorted.filter(l=>l.kart === myKart).slice(-maxPoints).flatMap((lap,index) => {
    const grouped = new Map<string, number[]>()
    for (const rival of sorted) {
      if (rival.kart === myKart || rival.receivedAt > lap.receivedAt || rival.receivedAt < lap.receivedAt-600_000) continue
      const a = grouped.get(rival.kart) || []
      a.push(rival.durationMs)
      if (a.length > 5) a.shift()
      grouped.set(rival.kart, a)
    }
    const peers = [...grouped.values()].filter(a=>a.length >= 2).map(a=>median(a)!)
    if (peers.length < 2) return []
    return [{label:lap.lap !== null ? `V${lap.lap}` : `${index+1}`,rank:1+peers.filter(x=>x<lap.durationMs).length,total:peers.length+1}]
  })
}

export function buildStintPaceBars(stints: StintSummary[]) {
  return stints.filter(s=>s.deltaToFieldMs!==null && s.laps >= 2)
    .map(s=>({label:`S${s.number} · ${s.driver}`,deltaSeconds:s.deltaToFieldMs!/1000, laps:s.laps}))
}
