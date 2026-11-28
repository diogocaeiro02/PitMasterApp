import type { TimingState, Racer, Passage } from './timing/types'
import type { TimedLap } from './pace'
import type { RaceNotice } from './raceControl'
import type { PitVisit } from './pit'

/** An entirely local, deterministic race simulator. Never opens a network connection. */
export type SimulationScenario = 'normal' | 'slow-track' | 'slow-us' | 'push'
export type SimulationSpeed = 1 | 5 | 20 | 60
export type SimLog = { id: string; atMs: number; kind: 'lap' | 'pit' | 'incident' | 'system'; text: string }
export type SimStint = { driver: string; startedAt: number; endedAt?: number }
type Stage = 0 | 1 | 2
export type SimParticipant = {
  id: string; kart: string; name: string; baseMs: number; lap: number
  startedMs: number; lapMs: number; stage: Stage; nextAtMs: number
  sectorMs: [number | null, number | null, number | null]
  lastLapMs: number | null; bestLapMs: number | null; pitUntilMs: number | null
}
export type Simulation = {
  epochMs: number; timeMs: number; running: boolean; speed: SimulationSpeed
  scenario: SimulationScenario; selectedKart: string; participants: SimParticipant[]
  timing: TimingState; pitVisits: PitVisit[]; driverNames: string[]
  driverIndex: number; driverStartedMs: number; turnCount: number; stints: SimStint[]
  log: SimLog[]; eventNo: number
}
const S1 = 0.34, S2 = 0.69
function seconds(ms: number) { const n=Math.max(0,ms);return `${Math.floor(n/60000)}:${String(Math.floor(n/1000)%60).padStart(2,'0')}.${String(Math.floor(n%1000)).padStart(3,'0')}` }
function split(ms: number) {return (ms/1000).toFixed(3)}
function seeded(kart: string) {return [...kart].reduce((acc,ch)=>Math.imul(acc+ch.charCodeAt(0),31)>>>0,13) }
function duration(p: SimParticipant, scenario: SimulationScenario, mine: string) {
  const cyc=((seeded(p.kart)+p.lap*13)%11-5)*71
  const slow=scenario==='slow-track'? 1900 : scenario==='slow-us'&&p.kart===mine? 2400 : 0
  const push=scenario==='push'&&p.kart===mine ? -800:0
  return Math.max(60_000,Math.round(p.baseMs+600+cyc+slow+push))
}
function log(sim: Simulation, kind: SimLog['kind'], text: string) {
  sim.log.unshift({id:String(++sim.eventNo),atMs:sim.timeMs,kind,text})
  sim.log=sim.log.slice(0,25)
}
function refreshRank(sim: Simulation) {
  const at=sim.timeMs
  const scores=sim.participants.map(p=>({p,score:p.lap + (p.pitUntilMs !== null && at < p.pitUntilMs ? 0 : Math.max(0,Math.min(0.999,(at-p.startedMs)/p.lapMs)))}))
    .sort((a,b)=>b.score-a.score || a.p.kart.localeCompare(b.p.kart))
  const leader=scores[0]?.score ?? 0
  const racers: Racer[]=scores.map(({p,score},i)=>{
    const prior=i ? scores[i-1].score : score
    const diff=leader-score, interval=prior-score
    const gap=diff>=1 ? `${Math.floor(diff)} Lap${Math.floor(diff)===1?'':'s'}` : (diff*65000/1000).toFixed(3)
    const inter=interval>=1?`${Math.floor(interval)} Lap`:(interval*65000/1000).toFixed(3)
    const existing=sim.timing.racers.find(r=>r.kart===p.kart)
    return {id:p.id,kart:p.kart,name:p.name,position:i+1,gap:i?gap:'',interval:i?inter:'',
      lastLap:p.lastLapMs===null?'':seconds(p.lastLapMs),bestLap:p.bestLapMs===null?'':seconds(p.bestLapMs),
      laps:p.lap,pits:p.kart===sim.selectedKart ? String(sim.pitVisits.filter(v=>v.exitedAt!==undefined).length) : '0',
      onTrack:'',sectors:p.sectorMs.map(s=>s===null?'':split(s)) as [string,string,string],lastEvent:existing?.lastEvent}
  })
  sim.timing={...sim.timing,racers,counter:String(sim.timeMs)}
}
function passage(sim: Simulation,p:SimParticipant,marker:'S1'|'S2'|'META',at:number) {
  const items=sim.timing.passages
  const event:Passage={id:`sim-${++sim.eventNo}`,kart:p.kart,name:p.name,marker,receivedAt:sim.epochMs+at,lap:p.lap}
  items.push(event)
  if (items.length>2000)items.splice(0,items.length-2000)
  if (p.kart===sim.selectedKart && marker==='META' && p.lap%4===0)log(sim,'lap',`Kart #${p.kart} · volta ${p.lap} concluída em ${seconds(p.lastLapMs??0)}`)
}
function runEvent(sim:Simulation,p:SimParticipant,at:number){
  if(p.stage===0){
    p.sectorMs[0]=Math.round(p.lapMs*S1)
    passage(sim,p,'S1',at)
    p.stage=1;p.nextAtMs=p.startedMs+Math.round(p.lapMs*S2)
  } else if(p.stage===1){
    p.sectorMs[1]=Math.round(p.lapMs*(S2-S1))
    passage(sim,p,'S2',at)
    p.stage=2;p.nextAtMs=p.startedMs+p.lapMs
  } else {
    p.sectorMs[2]=p.lapMs-(p.sectorMs[0]??0)-(p.sectorMs[1]??0)
    p.lastLapMs=p.lapMs;p.bestLapMs=p.bestLapMs===null? p.lapMs:Math.min(p.bestLapMs,p.lapMs)
    p.lap++
    const sectors=[...p.sectorMs] as [number,number,number]
    const history:TimedLap= {id:`sim-${p.kart}-${p.lap}`,kart:p.kart,lap:p.lap,durationMs:p.lapMs,receivedAt:sim.epochMs+at,sectors}
    sim.timing.lapHistory.push(history)
    if(sim.timing.lapHistory.length>5000) sim.timing.lapHistory.splice(0,sim.timing.lapHistory.length-5000)
    passage(sim,p,'META',at)
    p.sectorMs=[null,null,null]
    p.startedMs=at;p.stage=0;p.lapMs=duration(p,sim.scenario,sim.selectedKart)
    p.nextAtMs=p.startedMs+Math.round(p.lapMs*S1)
  }
}
function startInternal(racers:Racer[],selectedKart:string,drivers:string[],epochMs:number):Simulation {
  const participants=racers.filter(r=>r.kart).map((r,i)=>{
    const baseline=(r.bestLap.match(/^(\d+):(\d{2})\.(\d{3})$/)?Number(r.bestLap.split(':')[0])*60000+Number(r.bestLap.split(':')[1])*1000:64000)
    const phase=(i*2467)%baseline
    const participant:SimParticipant={ id:r.id||`sim-r${i}`,kart:r.kart,name:r.name,
      baseMs:Math.max(62_500,Math.min(67_500,baseline+((i%7)-3)*180)), lap:0,
      startedMs:-phase,lapMs:0,stage:0,nextAtMs:0,sectorMs:[null,null,null],lastLapMs:null,bestLapMs:null,pitUntilMs:null}
    participant.lapMs=duration(participant,'normal',selectedKart)
    participant.stage=phase>=participant.lapMs*S2?2:phase>=participant.lapMs*S1?1:0
    participant.nextAtMs=participant.startedMs+Math.round(participant.lapMs*(participant.stage===0?S1:participant.stage===1?S2:1))
    return participant
  })
  const sim:Simulation={epochMs,timeMs:0,running:false,speed:20,scenario:'normal',selectedKart,
    participants,timing:{racers:[],title:'SIMULADOR · ENDURANCE',session:'Treino controlado · dados fictícios',track:'Circuito de demonstração',
      counter:'',lapHistory:[],passages:[],raceControl:[]},pitVisits:[],
    driverNames:drivers.length?drivers:['Piloto 1','Piloto 2','Piloto 3'],driverIndex:0,driverStartedMs:0,turnCount:1,stints:[{driver:(drivers.length?drivers[0]:'Piloto 1'),startedAt:epochMs}],log:[],eventNo:0}
  return sim
}
/** Starts with 12 fictional minutes already elapsed, providing a useful pace sample. */
export function createSimulation(racers:Racer[],selectedKart:string,drivers:string[],epochMs=Date.now()):Simulation {
  const warmingMs=12*60_000
  const sim=startInternal(racers,selectedKart,drivers,epochMs-warmingMs)
  const prewarmed=advanceSimulation(sim,warmingMs)
  return {...prewarmed,running:false,log:[{id:`start-${prewarmed.eventNo}`,atMs:warmingMs,kind:'system',text:'Treino pronto. A corrida já tem 12 minutos de dados fictícios.'}]}
}
export function advanceSimulation(previous:Simulation,advanceMs:number):Simulation {
  if(!Number.isFinite(advanceMs)||advanceMs<=0)return previous
  const target=previous.timeMs+Math.min(advanceMs,900_000)
  const sim:Simulation={...previous,timeMs:target,participants:previous.participants.map(p=>({...p,sectorMs:[...p.sectorMs] as [number|null,number|null,number|null]})),
    timing:{...previous.timing,racers:[...previous.timing.racers],passages:[...previous.timing.passages],lapHistory:[...previous.timing.lapHistory],raceControl:[...previous.timing.raceControl]},
    pitVisits:previous.pitVisits.map(p=>({...p})),stints:previous.stints.map(t=>({...t})),log:[...previous.log]}
  for(const p of sim.participants){
    if(p.pitUntilMs!==null){
      if(p.pitUntilMs>target)continue
      const finish=p.pitUntilMs
      const v=[...sim.pitVisits].reverse().find(v=>v.exitedAt===undefined)
      if(v)v.exitedAt=sim.epochMs+finish
      p.pitUntilMs=null;p.startedMs=finish;p.stage=0;p.sectorMs=[null,null,null]
      p.lapMs=duration(p,sim.scenario,sim.selectedKart)
      p.nextAtMs=finish+Math.round(p.lapMs*S1)
      sim.stints=sim.stints.map(t=>t.endedAt===undefined?{...t,endedAt:sim.epochMs+finish}:t)
      sim.driverIndex=(sim.driverIndex+1)%sim.driverNames.length
      sim.driverStartedMs=finish;sim.turnCount++
      sim.stints.push({driver:sim.driverNames[sim.driverIndex],startedAt:sim.epochMs+finish})
      log(sim,'pit',`Saída das boxes · entra ${sim.driverNames[sim.driverIndex]}`)
    }
    let guard=0
    while(p.nextAtMs<=target&&++guard<100){
      const at=p.nextAtMs
      runEvent(sim,p,at)
    }
  }
  sim.timing.passages.sort((a,b)=>a.receivedAt-b.receivedAt)
  sim.timing.lapHistory.sort((a,b)=>a.receivedAt-b.receivedAt)
  refreshRank(sim)
  return sim
}
export function setSimulationScenario(sim:Simulation,scenario:SimulationScenario):Simulation {
  const newState={...sim,scenario,log:[...sim.log]}
  log(newState,'system',({normal:'Condições normais', 'slow-track':'Pista mais lenta para todo o pelotão',
    'slow-us':'A nossa equipa perdeu ritmo','push':'A nossa equipa está a ganhar ritmo'})[scenario])
  return newState
}
export function triggerSimulationIncident(sim:Simulation,type:'warning'|'penalty',kart:string):Simulation {
  const target=sim.participants.find(p=>p.kart===kart)
  if(!target)return sim
  const at=new Date(sim.epochMs+sim.timeMs)
  const time=at.toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit',second:'2-digit'})
  const notice:RaceNotice={id:`sim-incident-${sim.eventNo+1}`,time,kart,type,
    message:type==='warning'?'Warning — condução antidesportiva (SIMULAÇÃO)':'Penalização de 10 segundos (SIMULAÇÃO)'}
  const next={...sim,timing:{...sim.timing,raceControl:[notice,...sim.timing.raceControl]},log:[...sim.log]}
  log(next,'incident',`Kart #${kart} · ${type==='warning'?'warning':'penalização'} simulado`)
  return next
}
export function triggerSimulationPit(sim:Simulation):Simulation {
  const participants=sim.participants.map(p=>({...p,sectorMs:[...p.sectorMs] as [number|null,number|null,number|null]}))
  const selected=participants.find(p=>p.kart===sim.selectedKart)
  if(!selected||selected.pitUntilMs!==null)return sim
  selected.pitUntilMs=sim.timeMs+55_000
  const pit: PitVisit={id:`sim-pit-${sim.eventNo+1}`,enteredAt:sim.epochMs+sim.timeMs}
  const next:Simulation={...sim,participants,pitVisits:[...sim.pitVisits,pit],log:[...sim.log]}
  log(next,'pit',`Kart #${selected.kart} entrou nas boxes · paragem de 55 s (simulação)`)
  refreshRank(next)
  return next
}
export function simulatedNow(sim:Simulation){return sim.epochMs+sim.timeMs}
