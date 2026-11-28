import type { TimingState, Racer } from './types'
import type { TimedLap } from '../pace'

/** Untrusted public RaceFacer frame; we only accept timing snapshots for the requested slug. */
type RawRun = Record<string, unknown>
type RawData = Record<string, unknown>
export type RaceFacerFrame = { slug: string; data: RawData; type: string }
const text = (v: unknown) => typeof v === 'string' ? v : typeof v === 'number' ? String(v) : ''
const integer = (v: unknown): number | null => typeof v === 'number' && Number.isFinite(v) ? v : null
const validMs = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v > 0 && v < 600_000 ? v : null
const safeClock = (v: unknown) => typeof v === 'string' && /^(?:\d{1,3}:)?\d{1,2}:\d{2}$/.test(v) ? v : ''
const sectorList = (r: RawRun) => [text(r.s1), text(r.s2), text(r.s3)] as [string,string,string]

export function parseRaceFacerFrame(message: string, expectedSlug: string): RaceFacerFrame | null {
  if (!message.startsWith('42') || message.length > 2_000_000) return null
  let packet: unknown
  try { packet = JSON.parse(message.slice(2)) } catch { return null }
  if (!Array.isArray(packet) || packet.length < 2 || packet[0] !== expectedSlug) return null
  const body = packet[1]
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  const obj = body as Record<string, unknown>
  if (obj.type !== 'live-timing' || obj.slug !== expectedSlug || !obj.data || typeof obj.data !== 'object' || Array.isArray(obj.data)) return null
  return {slug: expectedSlug, type:'live-timing', data: obj.data as RawData}
}

export function raceFacerUrl(input: string): {slug: string; websocket: string} {
  const url = new URL(input)
  if (!['https:','wss:'].includes(url.protocol) || url.hostname !== 'live.racefacer.com' || url.username || url.password || url.hash) throw Error('Utiliza um endereço público https://live.racefacer.com/NOME-DA-PISTA')
  const slug = url.pathname.replace(/^\/+|\/+$/g,'').toLowerCase()
  if (!/^[a-z0-9_-]{2,80}$/.test(slug)) throw Error('O endereço RaceFacer deve identificar uma pista.')
  return {slug, websocket:'wss://live.racefacer.com/socket.io/?EIO=4&transport=websocket'}
}

/** Only one authoritative stream per session; never mix lap histories from different sessions. */
export class RaceFacerParser {
  private session = ''
  private last = new Map<string, {laps: number | null; passing: number | null}>()
  private history: TimedLap[] = []
  private passageHistory: TimingState['passages'] = []
  private readonly slug: string
  constructor(slug: string) { this.slug = slug }
  apply(frame: RaceFacerFrame, receivedAt: number): TimingState {
    const data = frame.data
    const session = `${this.slug}/${text(data.event_name)}/${text(data.track_configuration_id)}`
    if (this.session !== session) { this.session = session;this.last.clear();this.history=[];this.passageHistory=[] }
    const runs = Array.isArray(data.runs) ? data.runs.slice(0,250) : []
    const racers: Racer[] = []
    const passages: TimingState['passages'] = []
    const notices: TimingState['raceControl'] = []
    for (const raw of runs) {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue
      const run = raw as RawRun
      const kart = text(run.kart_number || run.kart)
      if (!kart) continue
      const laps = integer(run.total_laps)
      const passing = integer(run.last_passing)
      const time = validMs(run.last_time_raw)
      const team = text(run.team) || text(run.name) || `Kart #${kart}`
      const prev = this.last.get(kart)
      // First received snapshot is baseline, not a new lap or finish crossing.
      if (prev && laps !== null && prev.laps !== null && laps > prev.laps && passing !== null && passing !== prev.passing) {
        passages.push({id:`rf-${session}-${kart}-${passing}`,kart,name:team,marker:'META',receivedAt,lap:laps})
        if (time !== null) this.history.push({id:`rf-${session}-${kart}-${passing}`,kart,lap:laps,durationMs:time,receivedAt,
          sectors: sectorList(run).map(t => { const n=Number(t);return Number.isFinite(n)&&n>0?n*1000:null }) as [number|null,number|null,number|null]})
      }
      const penaltyCount=integer(run.total_penalties)
      if(penaltyCount!==null&&penaltyCount>0){
        const tag=text(run.penalty_tag).trim()
        notices.push({id:`rf-${session}-${kart}-penalty-${penaltyCount}`,time:'',kart,type:'penalty',message:tag||`${penaltyCount} penalização(ões) registada(s) pelo RaceFacer (detalhes não disponíveis)`})
      }
      this.last.set(kart,{laps,passing})
      racers.push({id:text(run.id)||kart,position:integer(run.pos),kart,name:team,driverName:text(run.name),gap:text(run.gap),
        interval:text(run.int),lastLap:text(run.last_time),bestLap:text(run.best_time),
        onTrack:run.in_pit===true?'BOX':'PISTA',pits:text(run.number_of_pits),laps,sectors:sectorList(run),
        inPit:typeof run.in_pit==='boolean'?run.in_pit:undefined,pitCount:integer(run.number_of_pits)??undefined,
        lastPassing:passing??undefined})
    }
    this.history=this.history.slice(-5000)
    this.passageHistory=[...this.passageHistory,...passages].slice(-1000)
    const status=text(data.status_string)
    return {racers,title:text(data.event_name)||'RaceFacer',session:text(data.event_name),track:this.slug,
      passages:[...this.passageHistory],lapHistory:[...this.history],counter:safeClock(data.time_left),raceControl:notices,
      meta:{provider:'racefacer',sessionId:session,status,isFinished: data.is_finished_results===true || ['finished','completed','checkered','race_finished'].includes(status.toLowerCase()),
        rankingKey:text(data.ranking_key),isEndurance:data.is_endurance===true,hasPits:data.has_pits===true,
        hasStint:data.has_stint===true,timeLeftSeconds:integer(data.time_left_in_seconds),numberOfSectors:integer(data.number_of_sectors),newFinishKarts:passages.map(p=>p.kart)}}
  }
}
