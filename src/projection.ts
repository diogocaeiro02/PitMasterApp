/**
 * Conservative end-of-race projection. This is NOT the official classification.
 * It is a constant-pace scenario with an explicit pit-loss assumption; it is not
 * a probabilistic forecast and cannot know traffic, neutralisations or penalties.
 */
import type { TimingState } from './timing/types'
import { lastValidByKart, median } from './pace.ts'

export type ProjectionSettings = { remainingMinutes: number | null; pitLossSeconds: number | null }
export type ProjectionRow = {
  kart: string; name: string; officialPosition: number | null; predictedPosition: number
  completedLaps: number; completedPits: number; remainingPits: number
  typicalLapMs: number; projectedLapTotal: number; projectedGapSeconds: number
  sourceSamples: number
}
export type Projection = {
  rows: ProjectionRow[]; reasons: string[]; confidence: 'média' | 'baixa'
  minPitStops: number; remainingMinutes: number; pitLossSeconds: number
  sampleSize: number; simulated: boolean
}
export function buildProjection(state: TimingState, minPitStops: number | null, settings: ProjectionSettings, simulated = false): Projection {
  const reasons: string[] = []
  if (!Number.isInteger(minPitStops) || minPitStops === null || minPitStops < 0) reasons.push('Define o número mínimo de pit stops no regulamento.')
  if (settings.remainingMinutes === null || !Number.isFinite(settings.remainingMinutes) || settings.remainingMinutes <= 0)
    reasons.push('Indica quantos minutos faltam para terminar a prova.')
  if (settings.pitLossSeconds === null || !Number.isFinite(settings.pitLossSeconds) || settings.pitLossSeconds <= 0)
    reasons.push('Indica o tempo médio perdido por pit stop, em segundos.')
  if (state.racers.length < 2) reasons.push('São necessárias pelo menos duas equipas com classificação.')
  const byKart = lastValidByKart(state.lapHistory, 5)
  const prepared = state.racers.map(r => {
    const samples = byKart.get(r.kart) ?? []
    const pace = median(samples.map(l => l.durationMs))
    const pits = r.pits.trim() === '' ? null : Number(r.pits)
    const laps = r.laps
    return {r, samples, pace, pits, laps}
  })
  const ready = prepared.filter(({r,samples,pace,pits,laps}) => r.kart && r.position !== null &&
    samples.length >= 2 && pace !== null && laps !== null && Number.isFinite(laps) && laps >= 0 &&
    pits !== null && Number.isInteger(pits) && pits >= 0)
  if (ready.length < state.racers.length) reasons.push(`Dados insuficientes para ${state.racers.length - ready.length} equipa(s): faltam voltas válidas, número de voltas ou pits confirmados.`)
  const inputPits = minPitStops ?? 0
  const minutes = settings.remainingMinutes ?? 0
  const pitLoss = settings.pitLossSeconds ?? 0
  const rows: ProjectionRow[] = reasons.length ? [] : ready.map(({r,samples,pace,pits,laps}) => {
    const remainingPits = Math.max(0,inputPits - pits!)
    const driveMs = Math.max(0,minutes*60_000 - remainingPits*pitLoss*1000)
    return { kart:r.kart,name:r.name || `Kart #${r.kart}`,officialPosition:r.position,
      predictedPosition:0,completedLaps:laps!,completedPits:pits!,remainingPits,
      typicalLapMs:pace!,projectedLapTotal:laps!+driveMs/pace!,projectedGapSeconds:0,sourceSamples:samples.length }
  })
  rows.sort((a,b)=>b.projectedLapTotal-a.projectedLapTotal || (a.officialPosition??999)-(b.officialPosition??999))
  const fastest=rows[0]?.projectedLapTotal ?? 0
  rows.forEach((r,i)=>{r.predictedPosition=i+1;r.projectedGapSeconds=(fastest-r.projectedLapTotal)*r.typicalLapMs/1000})
  return {rows,reasons,confidence:minutes <= 20 && rows.every(r=>r.sourceSamples>=5)?'média':'baixa',minPitStops:inputPits,
    remainingMinutes:minutes,pitLossSeconds:pitLoss,sampleSize:5,simulated}
}
export function projectedGap(a: ProjectionRow, b: ProjectionRow): string {
  // Positive distance between finish laps, converted using target's typical lap.
  const fractional = Math.abs(a.projectedLapTotal-b.projectedLapTotal)
  if (fractional >= 1) return `~${fractional.toFixed(1).replace('.',',')} voltas`
  return `~${(fractional*((a.typicalLapMs+b.typicalLapMs)/2)/1000).toFixed(1).replace('.',',')} s`
}
export function neighboringProjected(rows: ProjectionRow[], selectedKart: string): {ahead?: ProjectionRow; ours?: ProjectionRow; behind?: ProjectionRow} {
  const at=rows.findIndex(r=>r.kart===selectedKart)
  if(at<0)return {}
  return {ahead:rows[at-1],ours:rows[at],behind:rows[at+1]}
}
