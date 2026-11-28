import { ApexParser } from '../apex'
import type { TimingState, TimingProvider } from './types'
import {RaceFacerParser,parseRaceFacerFrame,raceFacerUrl} from './racefacer'

export type TimingCallbacks = {
  onState: (state: TimingState, at: number, raw: string) => void
  onStatus: (connected: boolean, message?: string) => void
}
export type TimingConnection = { disconnect: () => void }

export function providerSupportsLive(provider: TimingProvider): boolean {
  return provider === 'apex' || provider === 'racefacer'
}

/**
 * A browser connector for Apex's observed public WebSocket format.
 * Nothing attempts to bypass server origin rules, access controls or closed feeds.
 */
export function connectTiming(provider: TimingProvider, address: string, callbacks: TimingCallbacks): TimingConnection {
  if (!providerSupportsLive(provider)) {
    throw Error('Este fornecedor ainda não tem um protocolo de Live Timing validado. Usa a importação JSON.')
  }
  if(provider==='racefacer') return connectRaceFacer(address,callbacks)
  let parsed: URL
  try { parsed = new URL(address) } catch { throw Error('Endereço WebSocket inválido.') }
  if (parsed.protocol !== 'wss:' || !parsed.hostname || parsed.username || parsed.password || parsed.hash) {
    throw Error('É necessário um endereço wss:// válido, sem credenciais embutidas.')
  }
  const parser = new ApexParser()
  const ws = new WebSocket(parsed.toString())
  let active = true
  ws.onopen = () => { if (active) callbacks.onStatus(true) }
  ws.onmessage = event => {
    if (!active || typeof event.data !== 'string') return
    const at = Date.now()
    try { callbacks.onState(parser.apply(event.data, at), at, event.data) }
    catch { callbacks.onStatus(true, 'Mensagem não interpretada; o conector mantém o estado anterior.') }
  }
  ws.onerror = () => { if (active) callbacks.onStatus(false, 'Não foi possível comunicar com este endpoint Apex. Verifica a sessão e as permissões da origem.') }
  ws.onclose = () => { if (active) callbacks.onStatus(false, 'Ligação Apex encerrada. O controlo dos pilotos continua independente.') }
  return { disconnect: () => { active = false; ws.close() } }
}


/** Native Socket.IO/Engine.IO v4 transport, read only. Event subscriptions are
 * not documented; a successful socket connection does not guarantee timing data. */
function connectRaceFacer(address: string,callbacks:TimingCallbacks):TimingConnection {
  const {slug,websocket}=raceFacerUrl(address)
  const parser=new RaceFacerParser(slug)
  let closed=false,attempt=0,ws:WebSocket|null=null,retry:number|undefined
  function open() {
    if(closed)return
    ws=new WebSocket(websocket)
    const socket=ws
    socket.onopen=()=>{if(!closed)callbacks.onStatus(true,'Socket.IO ligado; à espera de dados de cronometragem da pista.')}
    socket.onmessage=event=>{
      if(closed||typeof event.data!=='string')return
      const raw=event.data as string
      if(raw.startsWith('0')) { // Engine.IO open packet: initiate Socket.IO namespace.
        try{socket.send('40')}catch{/* connection may close */}
        return
      }
      if(raw==='2'){try{socket.send('3')}catch{/* closed */};return}
      if(raw.startsWith('40'))return
      const frame=parseRaceFacerFrame(raw,slug)
      if(!frame)return
      attempt=0
      try{callbacks.onState(parser.apply(frame,Date.now()),Date.now(),raw)}
      catch{callbacks.onStatus(true,'Snapshot RaceFacer inválido; dados anteriores mantidos.')}
    }
    socket.onerror=()=>{if(!closed)callbacks.onStatus(false,'Não foi possível estabelecer ligação RaceFacer. Verifica acesso do navegador ao servidor.')}
    socket.onclose=()=>{
      if(closed)return
      callbacks.onStatus(false,'Ligação RaceFacer interrompida; a tentar reconectar.')
      if(attempt<5){attempt++;retry=window.setTimeout(open,Math.min(30_000,2000*2**(attempt-1)))}
      else callbacks.onStatus(false,'RaceFacer indisponível. Usa o registo manual ou importa um snapshot.')
    }
  }
  open()
  return {disconnect:()=>{closed=true;if(retry!==undefined)window.clearTimeout(retry);ws?.close()}}
}
