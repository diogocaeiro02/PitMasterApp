import { restoreStrategy, type Strategy } from './strategy'
import { restorePits, type PitVisit } from './pit'

export type DriverTurn = {driver: string; startedAt: number; endedAt?: number}
export type DriverData = { names: string[]; turns: DriverTurn[]; maxMinutes: number }
export type RaceWorkspace = {
  raceId: string; drivers: DriverData; strategy: Strategy; pitVisits: PitVisit[];
  followedRivals: string[]; selectedKart: string
}
export const DEFAULT_DRIVERS: DriverData = { names: ['Piloto 1','Piloto 2','Piloto 3'], turns: [], maxMinutes: 45 }
export function newWorkspace(raceId: string, kart = ''): RaceWorkspace {
  return {raceId, drivers: structuredClone(DEFAULT_DRIVERS), strategy: restoreStrategy(null),
    pitVisits: [], followedRivals: [], selectedKart: kart}
}
export function restoreWorkspace(raw: string | null, raceId: string, kart = ''): RaceWorkspace {
  const empty = newWorkspace(raceId, kart)
  if (!raw) return empty
  try {
    const w = JSON.parse(raw) as Partial<RaceWorkspace>
    if (!w || typeof w !== 'object') return empty
    const names = Array.isArray(w.drivers?.names) ? w.drivers!.names.filter((n):n is string=>typeof n==='string').slice(0,35) : empty.drivers.names
    const turns = Array.isArray(w.drivers?.turns) ? w.drivers!.turns.filter((t):t is DriverTurn=>!!t && typeof t.driver==='string' &&
      typeof t.startedAt==='number' && Number.isFinite(t.startedAt) &&
      (t.endedAt === undefined || (typeof t.endedAt === 'number' && t.endedAt >= t.startedAt))).slice(-300) : []
    const maxMinutes = typeof w.drivers?.maxMinutes === 'number' && w.drivers.maxMinutes > 0 ? w.drivers.maxMinutes : 45
    return {
      raceId, selectedKart: typeof w.selectedKart === 'string' ? w.selectedKart : kart,
      drivers: {names, turns, maxMinutes},
      strategy: restoreStrategy(JSON.stringify(w.strategy || null)),
      pitVisits: restorePits(JSON.stringify(w.pitVisits || [])),
      followedRivals: Array.isArray(w.followedRivals) ? w.followedRivals.filter((n):n is string=>typeof n==='string').slice(0,30) : []
    }
  } catch { return empty }
}
