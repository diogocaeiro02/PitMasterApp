export type PitVisit = { id: string; enteredAt: number; exitedAt?: number; source?: 'live'|'manual'; driverConfirmed?: string }
export const PIT_STORE = 'pitmaster-pits-v1'
export function restorePits(raw: string|null): PitVisit[] {
  if (!raw) return []
  try {
    const data: unknown = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    return data.filter((p): p is PitVisit => typeof p === 'object' && p !== null &&
      typeof p.id === 'string' && typeof p.enteredAt === 'number' && Number.isFinite(p.enteredAt) &&
      (p.exitedAt === undefined || (typeof p.exitedAt === 'number' && p.exitedAt >= p.enteredAt)))
      .slice(-120)
  } catch { return [] }
}
export function pitOverview(visits: PitVisit[], now: number, minSeconds: number|null, minStops: number|null) {
  const completed = visits.filter(p => p.exitedAt !== undefined)
  const active = [...visits].reverse().find(p => p.exitedAt === undefined) || null
  const currentMs = active ? Math.max(0,now-active.enteredAt):0
  return { completed: completed.length, active, currentMs,
    remaining: Math.max(0,(minStops ?? 0)-completed.length),
    minTimeRemainingMs: active && minSeconds !== null ? Math.max(0,minSeconds*1000-currentMs) : null,
    shortVisits: minSeconds === null ? [] : completed.filter(p => (p.exitedAt! - p.enteredAt) < minSeconds*1000) }
}
