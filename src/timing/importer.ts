import { emptyTiming, type Racer, type TimingState } from './types.ts'
import type { TimedLap } from '../pace'
import type { RaceNotice, NoticeType } from '../raceControl'

export type ImportResult = { state: TimingState; warnings: string[] }
type Item = Record<string, unknown>
function obj(v: unknown): v is Item { return !!v && typeof v === 'object' && !Array.isArray(v) }
function str(v: unknown): string { return typeof v === 'string' || typeof v === 'number' ? String(v) : '' }
function rank(v: unknown): number | null {
  if (v === '' || v === undefined || v === null) return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) && n > 0 && Number.isInteger(n) ? n : null
}
function lapsCount(v: unknown): number | null {
  if (v === '' || v === undefined || v === null) return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) && n >= 0 && Number.isInteger(n) ? n : null
}
function racerFrom(v: Item, index: number): Racer | null {
  const kart = str(v.kart).trim()
  if (!kart) return null
  const sectors = Array.isArray(v.sectors) ? v.sectors.slice(0, 3) : []
  return {
    id: str(v.id) || `import-${index + 1}`, position: rank(v.position), kart,
    name: str(v.name) || `Kart ${kart}`, gap: str(v.gap), interval: str(v.interval),
    lastLap: str(v.lastLap), bestLap: str(v.bestLap), onTrack: str(v.onTrack),
    pits: str(v.pits), laps: lapsCount(v.laps),
    sectors: [str(sectors[0]), str(sectors[1]), str(sectors[2])]
  }
}
function lapFrom(v: Item, index: number): TimedLap | null {
  const kart = str(v.kart).trim()
  const durationMs = typeof v.durationMs === 'number' ? v.durationMs : Number(v.durationMs)
  if (!kart || !Number.isFinite(durationMs) || durationMs <= 0 || durationMs > 3_600_000) return null
  const secs = Array.isArray(v.sectors) ? v.sectors : []
  const sector = (i: number) => typeof secs[i] === 'number' && Number.isFinite(secs[i]) && secs[i] > 0 ? secs[i] as number : null
  return {
    id: str(v.id) || `import-${kart}-${index}`, kart,
    lap: lapsCount(v.lap), durationMs,
    receivedAt: typeof v.receivedAt === 'number' && Number.isFinite(v.receivedAt) ? v.receivedAt : Date.now(),
    sectors: [sector(0), sector(1), sector(2)]
  }
}
const NOTICE_TYPES = new Set<NoticeType>(['warning', 'penalty', 'correction'])
function noticeFrom(v: Item, index: number): RaceNotice | null {
  if (!NOTICE_TYPES.has(v.type as NoticeType) || typeof v.message !== 'string') return null
  return {id: str(v.id) || `import-notice-${index}`, time: str(v.time), kart: v.kart == null ? null : str(v.kart),
    type: v.type as NoticeType, message: v.message}
}
/** Accept only the Pitmaster interchange JSON schema, not scraped/guessed RaceFacer formats. */
export function importTimingJSON(input: unknown): ImportResult {
  if (!obj(input)) throw Error('O ficheiro deve conter um objeto JSON.')
  // The complete Pitmaster backup embeds the snapshot in its `timing` property.
  const root = obj(input.timing) ? input.timing : input
  if (!Array.isArray(root.racers)) throw Error('Formato inválido: falta a lista racers[].')
  if (root.racers.length > 300) throw Error('O ficheiro contém demasiados participantes (máximo 300).')
  const warnings: string[] = []
  const racers: Racer[] = []
  const used = new Set<string>()
  for (let i = 0; i < root.racers.length; i++) {
    const item = root.racers[i]
    const racer = obj(item) ? racerFrom(item, i) : null
    if (!racer) { warnings.push(`Participante ${i + 1} ignorado: sem kart.`); continue }
    if (used.has(racer.kart)) { warnings.push(`Kart ${racer.kart} duplicado, ignorado.`); continue }
    used.add(racer.kart)
    racers.push(racer)
  }
  const lapHistory = Array.isArray(root.lapHistory) ? root.lapHistory.slice(-8000).flatMap((v, i) => {
    const lap = obj(v) ? lapFrom(v, i) : null
    return lap ? [lap] : []
  }) : []
  const notices = Array.isArray(root.raceControl) ? root.raceControl.slice(0, 1000).flatMap((v, i) => {
    const n = obj(v) ? noticeFrom(v, i) : null
    return n ? [n] : []
  }) : []
  // No inferred checkpoint events: imported snapshots alone cannot establish physical proximity.
  const state: TimingState = {...emptyTiming, racers, lapHistory,
    title: str(root.title), track: str(root.track), session: str(root.session), raceControl: notices,
    counter: str(root.counter)}
  if (racers.length === 0) warnings.push('Sem karts válidos. Confirma o formato dos dados.')
  return {state, warnings}
}
export const SAMPLE_SNAPSHOT = {
  format: 'pitmaster-timing-v1', title: 'Corrida de exemplo', track: 'Kartódromo de exemplo',
  session: 'Final', racers: [
    {kart: '7', name: 'Equipa A', position: 1, laps: 25, lastLap: '1:04.123', bestLap: '1:03.800', gap: '', interval: ''},
    {kart: '12', name: 'Equipa B', position: 2, laps: 25, lastLap: '1:04.850', bestLap: '1:04.100', gap: '4.1', interval: '4.1'}
  ], lapHistory: [], raceControl: []
}
