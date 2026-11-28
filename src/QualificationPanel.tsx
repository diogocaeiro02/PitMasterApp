import {FlagTriangleRight,Target,Clock,ArrowRight,Flag} from 'lucide-react'
import type {TimingState} from './timing/types'
import {parseLapTime} from './pace'
import type {PhaseConfig,RacePhase} from './racePhases'
import {PHASES} from './racePhases'

type Props={config:PhaseConfig;onChange:(next:PhaseConfig)=>void;data:TimingState;selectedKart:string;onRace:()=>void;activeSource:string}
const qualStages:RacePhase[]=['practice','qualifying','superqualifying']
export function QualificationPanel({config,onChange,data,selectedKart,onRace,activeSource}:Props){
  const stage=qualStages.includes(config.current)?config.current:'qualifying'
  const items=[{value:'practice' as const,label:'Treinos'}, {value:'qualifying' as const,label:'Qualificação'},...(config.superqualifying?[{value:'superqualifying' as const,label:'Superqualificação'}]:[])]
  const rows=[...data.racers].filter(r=>parseLapTime(r.bestLap)!==null).sort((a,b)=>(parseLapTime(a.bestLap)||Infinity)-(parseLapTime(b.bestLap)||Infinity))
  const myKart=config.karts[stage]||selectedKart
  const mine=rows.find(r=>r.kart===myKart)
  const myTime=parseLapTime(mine?.bestLap??'')
  const poleTime=parseLapTime(rows[0]?.bestLap??'')
  const rank=mine?rows.indexOf(mine)+1:null
  const minutesClock=(ms:number|null)=>ms===null?'—':(ms/1000).toFixed(3)+' s'
  const sourceValid=data.meta?.rankingKey==='by_time' || !data.meta
  return <div className="qualificationPage">
    <div className="raceHubIntro"><div><div className="overline">PITMASTER / QUALIFYING</div><h1>Qualificação<span>.</span></h1><p>A melhor volta decide. Os tempos desta fase não entram na análise da corrida endurance.</p></div><button className="quietBtn" onClick={onRace}>Ir para corrida <ArrowRight size={17}/></button></div>
    <div className="qualTabs">{items.map(item=><button key={item.value} className={stage===item.value?'selected':''} onClick={()=>onChange({...config,current:item.value})}>{item.label}</button>)}</div>
    <div className="qualGrid">
      <section className="card qualHero"><span className="overline"><Target size={14}/> NOSSA EQUIPA · {PHASES.find(p=>p.value===stage)?.label}</span>{config.qualifyingMinutes&&stage==='qualifying'&&<p className="qualPresetNote">Qualificação prevista: {config.qualifyingMinutes} min · o cronómetro mostrado é o do Live Timing</p>}<div className="qualHeroTop"><div><small>POSIÇÃO POR MELHOR VOLTA</small><strong>{rank?`P${rank}`:'—'}</strong></div><div><small>SESSÃO</small><strong className="qualCountdown">{data.counter||'—'}</strong></div></div><div className="qualMetrics"><div><span>MELHOR VOLTA</span><strong>{mine?.bestLap||'—'}</strong></div><div><span>ÚLTIMA VOLTA</span><strong>{mine?.lastLap||'—'}</strong></div><div><span>GAP PARA P1</span><strong>{myTime!==null&&poleTime!==null?`+${minutesClock(myTime-poleTime)}`:'—'}</strong></div></div><div className="qualSectorStrip">{(mine?.sectors||[]).filter((_,i)=>i<Math.max(1,data.meta?.numberOfSectors||3)).map((sector,i)=><div key={i}><span>SETOR {i+1}</span><strong>{sector&&sector!=='-'?sector:'—'}</strong></div>)}</div><div className="qualMap"><label>O NOSSO KART NESTA FASE</label><input className="formInput" value={config.karts[stage]??selectedKart} onChange={event=>{onChange({...config,karts:{...config.karts,[stage]:event.target.value}})}} placeholder="Número do kart"/><p>O kart pode ser diferente na qualificação, superqualificação e corrida.</p></div></section>
      <section className="card qualStandings"><div className="cardHeading"><div><div className="overline"><FlagTriangleRight size={14}/> CLASSIFICAÇÃO DA FASE</div><h2>Melhores voltas</h2></div><span className="sectionTag">{activeSource}</span></div>{!sourceValid&&<p className="strategyIssue">A sessão atual não está ordenada por melhor volta; os resultados aqui são calculados pelas melhores voltas recebidas.</p>}<div className="qualRows">{rows.slice(0,40).map((r,i)=><div key={r.id} className={`qualRow ${r.kart===myKart?'qualRowMine':''}`}><b>P{i+1}</b><span><strong>{r.name}</strong><small>Kart #{r.kart} · {r.laps??0} voltas</small></span><div><strong>{r.bestLap}</strong><small>{poleTime!==null&&parseLapTime(r.bestLap)!==null?`+${((parseLapTime(r.bestLap)!-poleTime)/1000).toFixed(3)}s`:'—'}</small></div></div>)}{rows.length===0&&<p className="hint">A aguardar voltas válidas desta sessão. Escolhe a fonte na página Provas.</p>}</div></section>
    </div>
    <section className="card qualSetup"><div><h2><Flag size={19}/> Fases da prova</h2><p>A qualificação é independente da corrida. Altera a fase manualmente quando a cronometragem não a identificar.</p></div><div className="qualChecks"><label className="qualDurationField">Duração prevista da qualificação (min) <input className="formInput" type="number" min="1" max="240" inputMode="numeric" value={config.qualifyingMinutes??''} placeholder="Ex.: 10" onChange={e=>onChange({...config,qualifyingMinutes:e.target.value?Math.max(1,Number(e.target.value)):null})}/></label><label><input type="checkbox" checked={config.practice} onChange={e=>onChange({...config,practice:e.target.checked})}/> Treinos livres previstos</label><label><input type="checkbox" checked={config.superqualifying} onChange={e=>onChange({...config,superqualifying:e.target.checked})}/> Superqualificação prevista</label></div><div className="qualStageNav">{PHASES.filter(p=>(p.value!=='practice'||config.practice)&&(p.value!=='superqualifying'||config.superqualifying)).map(p=><button key={p.value} className={config.current===p.value?'current':''} onClick={()=>onChange({...config,current:p.value})}>{p.label}</button>)}</div><p className="hint"><Clock size={14}/> A mudança de fase não transfere tempos ou voltas para outra fase. A gravação local de snapshots por fase é separada.</p></section>
  </div>
}
