import { parseRaceControl } from './raceControl'
import { parseLapTime } from './pace'
import { emptyTiming } from './timing/types'
import type { Racer, Passage, TimingState } from './timing/types'
export { emptyTiming } from './timing/types'
export type { Racer, Passage, TimingState } from './timing/types'

// The Apex grid is HTML nested inside a text protocol. DOMParser is used on a
// detached document; no HTML from Apex is inserted into the application DOM.
function parseGrid(grid: string): Racer[] {
  const doc = new DOMParser().parseFromString(grid, 'text/html')
  const header = doc.querySelector('tr.head')
  if (!header) return []
  const types = Array.from(header.querySelectorAll('td')).map(td => td.getAttribute('data-type') || '')
  return Array.from(doc.querySelectorAll('tr[data-pos]'))
    .filter(tr => tr !== header)
    .map(tr => {
      const cells = Array.from(tr.querySelectorAll(':scope > td'))
      const get = (type: string) => {
        const idx = types.indexOf(type)
        return idx < 0 ? '' : (cells[idx]?.textContent || '').trim()
      }
      const pos = Number(get('rk'))
      const count = Number(get('tlp'))
      return {
        id: tr.getAttribute('data-id') || '', position: Number.isFinite(pos) && pos > 0 ? pos : null,
        kart: get('no'), name: get('dr'), gap: get('gap'), interval: get('int'),
        lastLap: get('llp'), bestLap: get('blp'), onTrack: get('otr'), pits: get('pit'),
        laps: get('tlp') && Number.isFinite(count) ? count : null,
        sectors: [get('s1'), get('s2'), get('s3')] as [string,string,string]
      }
    })
    .filter(r => r.id && r.kart)
}

// The initial message declares column ordering, which can differ by venue.
export class ApexParser {
  private colTypes: Record<string,string> = {}
  private state: TimingState = structuredClone(emptyTiming)
  public reset() { this.colTypes = {}; this.state = structuredClone(emptyTiming) }
  public snapshot(): TimingState { return { ...this.state, racers: this.state.racers.map(r => ({...r, sectors: [...r.sectors] as [string,string,string]})), passages: [...this.state.passages], lapHistory: [...this.state.lapHistory], raceControl: [...this.state.raceControl] } }
  public apply(raw: string, timestamp = Date.now()): TimingState {
    const lines = raw.split(/\r?\n/).filter(Boolean)
    if (lines.some(line => line.startsWith('init|'))) this.reset()
    for (const line of lines) {
      const p1 = line.indexOf('|')
      if (p1 < 0) continue
      const p2 = line.indexOf('|', p1 + 1)
      if (p2 < 0) continue
      const key = line.slice(0, p1), style = line.slice(p1+1, p2), value = line.slice(p2+1)
      if (key === 'grid') {
        const doc = new DOMParser().parseFromString(value, 'text/html')
        const header = doc.querySelector('tr.head')
        if (header) this.colTypes = Object.fromEntries(Array.from(header.querySelectorAll('td')).map((td, idx) => [`c${idx+1}`, td.getAttribute('data-type') || '']))
        this.state.racers = parseGrid(value)
      } else if (key === 'title1') this.state.title = value
      else if (key === 'title2') this.state.session = value
      else if (key === 'track') this.state.track = value
      else if (key === 'com') this.state.raceControl = parseRaceControl(value)
      else if (key === 'dyn1' && style === 'count') this.state.counter = value
      else {
        const cell = key.match(/^(r\d+)(c\d+)$/)
        if (cell) {
          const racer = this.state.racers.find(r => r.id === cell[1]); if (!racer) continue
          const field = this.colTypes[cell[2]]
          if (field === 'rk') racer.position = Number(value) || null
          else if (field === 'no') racer.kart = value
          else if (field === 'dr') racer.name = value
          else if (field === 'gap') racer.gap = value
          else if (field === 'int') racer.interval = value
          else if (field === 'llp') racer.lastLap = value
          else if (field === 'blp') racer.bestLap = value
          else if (field === 'pit') racer.pits = value
          else if (field === 'otr') racer.onTrack = value
          else if (field === 'tlp') racer.laps = value === '' ? null : Number(value)
          else if (field === 's1') racer.sectors[0] = value
          else if (field === 's2') racer.sectors[1] = value
          else if (field === 's3') racer.sectors[2] = value
        } else if (/^r\d+$/.test(key) && style === '#') {
          // Apex also broadcasts ranking changes as `r5|#|2`, in addition
          // to updating the visible ranking cell (`r5c3||2`).
          const racer = this.state.racers.find(r => r.id === key)
          if (racer) racer.position = /^\d+$/.test(value.trim()) && Number(value) > 0 ? Number(value) : null
        } else if (/^r\d+$/.test(key) && style.startsWith('*')) {
          const racer = this.state.racers.find(r => r.id === key)
          if (!racer) continue
          const marker = style === '*' ? 'META' : style === '*i1' ? 'S1' : style === '*i2' ? 'S2' : style
          racer.lastEvent = marker
          // For `*` and `*iN`, Apex's numeric payload is not always
          // identical to the newly displayed sector/lap. Treat it as
          // internal data and use the named timing cells for lap values.
          this.state.passages.push({ id: `${timestamp}-${key}-${this.state.passages.length}`, kart: racer.kart, name: racer.name, marker, receivedAt: timestamp, lap: racer.laps })
          this.state.passages = this.state.passages.slice(-1200)
          if (marker === 'META') {
            const durationMs = parseLapTime(racer.lastLap)
            const key = `${racer.id}-${racer.laps ?? 'sem-volta'}-${durationMs ?? 'sem-tempo'}`
            if (durationMs !== null && !this.state.lapHistory.some(l => l.id === key)) {
              this.state.lapHistory.push({ id: key, kart: racer.kart, lap: racer.laps,
                durationMs, receivedAt: timestamp,
                sectors: racer.sectors.map(s => parseLapTime(s)) as [number | null,number | null,number | null] })
              this.state.lapHistory = this.state.lapHistory.slice(-5000)
            }
          }
        }
      }
    }
    return this.snapshot()
  }
}

// Returns only passage-based provisional relative order, not an exact physical
// position. The same checkpoint and a recent time window are required.
export function passageNeighbors(state: TimingState, kart: string, now: number) {
  const mine = [...state.passages].reverse().find(p => p.kart === kart && ['META','S1','S2'].includes(p.marker))
  if (!mine || now - mine.receivedAt > 180_000) return null
  const peers = state.passages.filter(p => p.marker === mine.marker && Math.abs(p.receivedAt - mine.receivedAt) <= 180_000 && p.kart !== kart)
  const byKart = new Map<string,Passage>()
  for (const p of peers) { const old = byKart.get(p.kart); if (!old || Math.abs(p.receivedAt-mine.receivedAt)<Math.abs(old.receivedAt-mine.receivedAt)) byKart.set(p.kart,p) }
  const arr = [...byKart.values()]
  const ahead = arr.filter(p=>p.receivedAt < mine.receivedAt).sort((a,b)=>b.receivedAt-a.receivedAt)[0]
  const behind = arr.filter(p=>p.receivedAt > mine.receivedAt).sort((a,b)=>a.receivedAt-b.receivedAt)[0]
  const gap = (p:Passage)=> Math.abs(p.receivedAt-mine.receivedAt)/1000
  return { mine, ahead: ahead ? { ...ahead, seconds:gap(ahead) } : null, behind: behind ? {...behind,seconds:gap(behind)} : null }
}
