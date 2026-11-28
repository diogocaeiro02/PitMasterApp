import type { TimedLap } from '../pace'
import type { RaceNotice } from '../raceControl'

/** Every timing provider is converted into this common, provider-neutral model. */
export type Racer = {
  id: string; position: number | null; kart: string; name: string
  gap: string; interval: string; lastLap: string; bestLap: string
  onTrack: string; pits: string; laps: number | null
  sectors: [string, string, string]; lastEvent?: string; driverName?: string
  inPit?: boolean; pitCount?: number; lastPassing?: number
}
export type Passage = { id: string; kart: string; name: string; marker: string; receivedAt: number; lap: number | null }
export type TimingState = {
  racers: Racer[]; title: string; session: string; track: string
  passages: Passage[]; lapHistory: TimedLap[]; counter: string; raceControl: RaceNotice[]
  meta?: { provider: TimingProvider; sessionId: string; status: string; isFinished: boolean; rankingKey: string; isEndurance: boolean; hasPits: boolean; hasStint: boolean; timeLeftSeconds: number|null; numberOfSectors:number|null; newFinishKarts?:string[] }
}
export const emptyTiming: TimingState = {
  racers: [], title: '', session: '', track: '', passages: [],
  lapHistory: [], counter: '', raceControl: []
}
export type TimingProvider = 'apex' | 'racefacer' | 'manual'
export type ProviderCapabilities = {
  live: boolean; laps: boolean; sectors: boolean; raceControl: boolean; passages: boolean
}
export type ProviderDefinition = {
  id: TimingProvider; label: string; status: string; description: string
  capabilities: ProviderCapabilities
}
export const PROVIDERS: Record<TimingProvider, ProviderDefinition> = {
  apex: {
    id: 'apex', label: 'Apex Timing', status: 'Live experimental',
    description: 'WebSocket identificado em pistas Apex. A ligação exige permissão do servidor.',
    capabilities: {live: true, laps: true, sectors: true, raceControl: true, passages: true}
  },
  racefacer: {
    id: 'racefacer', label: 'RaceFacer', status: 'Live experimental · Socket.IO',
    description: 'Conector Socket.IO experimental: foram observados eventos RaceFacer. Subscrição, acesso e endurance por validar.',
    capabilities: {live: true, laps: true, sectors: true, raceControl: false, passages: true}
  },
  manual: {
    id: 'manual', label: 'Manual / ficheiro', status: 'Importação disponível',
    description: 'Carrega classificações no formato JSON Pitmaster sem ligação ao serviço.',
    capabilities: {live: false, laps: true, sectors: false, raceControl: false, passages: false}
  }
}
