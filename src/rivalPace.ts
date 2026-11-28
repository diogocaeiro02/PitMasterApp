/** Rival pace is a recent-lap comparison, NOT an exact on-track gap or passing prediction. */
import { median, type TimedLap } from './pace.ts'
export type RivalPace = {
  rivalMedianMs: number
  ownMedianMs: number
  /** Positive = rival slower, negative = rival faster. */
  differenceMs: number
  status: 'faster' | 'slower' | 'similar'
  rivalSamples: number
  ownSamples: number
}
const VALID_MIN_MS = 40_000
const VALID_MAX_MS = 240_000
const MAX_AGE_MS = 5 * 60_000
const WINDOW_MS = 10 * 60_000
export function compareRivalPace(laps: TimedLap[], ownKart: string, rivalKart: string, now: number, sampleSize = 5): RivalPace | null {
  if (!ownKart || !rivalKart || ownKart === rivalKart) return null
  const lapsFor = (kart: string) => laps.filter(l => l.kart === kart && l.durationMs >= VALID_MIN_MS && l.durationMs <= VALID_MAX_MS && Number.isFinite(l.receivedAt) && l.receivedAt <= now && l.receivedAt >= now - WINDOW_MS).slice(-sampleSize)
  const ours = lapsFor(ownKart), rival = lapsFor(rivalKart)
  if (ours.length < 2 || rival.length < 2 || now - ours.at(-1)!.receivedAt > MAX_AGE_MS || now - rival.at(-1)!.receivedAt > MAX_AGE_MS) return null
  const ownMedianMs = median(ours.map(l => l.durationMs))!
  const rivalMedianMs = median(rival.map(l => l.durationMs))!
  const differenceMs = rivalMedianMs - ownMedianMs
  return { ownMedianMs, rivalMedianMs, differenceMs, status: differenceMs < -150 ? 'faster' : differenceMs > 150 ? 'slower' : 'similar', ownSamples: ours.length, rivalSamples: rival.length }
}
export function rivalPaceText(pace: RivalPace | null, relative: 'ahead' | 'behind') {
  if (!pace) return { title: 'Ritmo por comparar', detail: 'Aguardar voltas recentes', tone: 'unknown' }
  if (pace.status === 'similar') return { title: 'Ritmo semelhante', detail: 'Diferença inferior a 0,15 s/volta', tone: 'similar' }
  const delta = `${(Math.abs(pace.differenceMs) / 1000).toFixed(2)} s/volta`
  const faster = pace.status === 'faster'
  return { title: `${faster ? 'Mais rápido' : 'Mais lento'} · ${delta}`,
    detail: relative === 'ahead' ? faster ? 'Está a afastar-se ao ritmo atual' : 'Estamos a recuperar ritmo' : faster ? 'Pode aproximar-se' : 'Estamos a ganhar vantagem',
    tone: faster ? 'danger' : 'positive' }
}
