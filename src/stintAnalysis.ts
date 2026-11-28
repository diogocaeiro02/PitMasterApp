/** Secondary strategy view. Timing and pilot-change data must share the same session clock. */
import { median, type TimedLap } from './pace.ts'
export type StintTurn = { driver: string; startedAt: number; endedAt?: number }
export type StintSummary = {
  number: number; driver: string; startedAt: number; endedAt: number | null
  durationMs: number; laps: number; medianMs: number | null; bestMs: number | null
  deltaToFieldMs: number | null; fieldKarts: number
}
export function stintSummaries(turns: StintTurn[], history: TimedLap[], myKart: string, now: number): StintSummary[] {
  return turns.map((turn, i) => {
    const end = turn.endedAt ?? now
    const usable = history.filter(l => l.receivedAt >= turn.startedAt && l.receivedAt <= end && l.durationMs >= 40_000 && l.durationMs <= 240_000)
    const ours = usable.filter(l => l.kart === myKart).map(l => l.durationMs)
    const rivals = new Map<string, number[]>()
    usable.filter(l => l.kart !== myKart).forEach(l => rivals.set(l.kart, [...(rivals.get(l.kart) || []), l.durationMs]))
    const fieldMedians = [...rivals.values()].filter(v => v.length >= 2).map(v => median(v)!).filter(v => Number.isFinite(v))
    const ourMedian = median(ours)
    const field = median(fieldMedians)
    return { number:i+1, driver:turn.driver, startedAt:turn.startedAt, endedAt:turn.endedAt ?? null,
      durationMs:Math.max(0,end-turn.startedAt), laps:ours.length,
      medianMs:ourMedian, bestMs:ours.length?Math.min(...ours):null,
      deltaToFieldMs:ourMedian !== null && field !== null ? ourMedian-field : null,
      fieldKarts:fieldMedians.length }
  })
}
