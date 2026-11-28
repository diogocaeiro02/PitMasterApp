import type { TimingProvider } from './timing/types'
export type RaceProfile = {
  id: string; name: string; track: string; date: string; provider: TimingProvider
  sourceUrl: string; kart: string; createdAt: number; status?: 'preparation' | 'live' | 'finished'
}
export type RaceCollection = { activeId: string; races: RaceProfile[] }
export const RACES_STORE = 'pitmaster-races-v1'
export const WORKSPACE_PREFIX = 'pitmaster-race-workspace-'
export const DEFAULT_APEX_URL = '' // O endpoint correto depende do circuito
const PROVIDERS = new Set<TimingProvider>(['apex','racefacer','manual'])
export function createRace(id: string, now = Date.now()): RaceProfile {
  return { id, name: 'Nova prova', track: '', date: '', provider: 'apex', sourceUrl: '', kart: '', createdAt: now, status: 'preparation' }
}
export function restoreRaces(raw: string | null): RaceCollection {
  if (raw) try {
    const data: unknown = JSON.parse(raw)
    if (data && typeof data === 'object' && 'races' in data && 'activeId' in data) {
      const c = data as {races: unknown;activeId: unknown}
      if (Array.isArray(c.races)) {
        const races = c.races.filter((r): r is RaceProfile => !!r && typeof r === 'object' &&
          typeof r.id === 'string' && typeof r.name === 'string' && typeof r.track === 'string' &&
          typeof r.provider === 'string' && PROVIDERS.has(r.provider as TimingProvider) &&
          typeof r.sourceUrl === 'string' && typeof r.kart === 'string')
          .slice(0, 40).map(r=>({...r, date: typeof r.date === 'string' ? r.date : '', createdAt: Number(r.createdAt) || 0, status: (r.status === 'live' || r.status === 'finished' ? r.status : 'preparation') as RaceProfile['status']}))
        if (races.length) return { races, activeId: races.some(r => r.id === c.activeId) ? String(c.activeId) : races[0].id }
      }
    }
  } catch { /* fallback */ }
  const first = {...createRace('legacy'), name: 'Primeira prova', track: 'KIP Palmela', kart: '7', sourceUrl: DEFAULT_APEX_URL}
  return {activeId: first.id, races: [first]}
}
export function updateProfile(collection: RaceCollection, profile: RaceProfile): RaceCollection {
  return {...collection, races: collection.races.map(r=>r.id===profile.id?profile:r)}
}
