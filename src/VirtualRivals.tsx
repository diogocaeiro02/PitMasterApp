import { Activity, BarChart3, CircleHelp, FlagTriangleRight } from 'lucide-react'
import type { Projection, ProjectionRow } from './projection'
import { neighboringProjected, projectedGap } from './projection'
import { compareRivalPace, rivalPaceText } from './rivalPace'
import type { TimedLap } from './pace'

type Props = {projection: Projection; selectedKart: string; history: TimedLap[]; now:number; onDetails:()=>void; onSetup:()=>void}
export function VirtualRivals({projection,selectedKart,history,now,onDetails,onSetup}:Props){
  const neighbors = neighboringProjected(projection.rows,selectedKart)
  const row=(r:ProjectionRow|undefined,side:'ahead'|'behind')=>{
    if(!r||!neighbors.ours)return <div className="virtualRivalRow isEmpty">{side==='ahead'?'Não existem rivais projetados à frente.':'Não existem rivais projetados atrás.'}</div>
    const pace=rivalPaceText(compareRivalPace(history,selectedKart,r.kart,now),side)
    return <div className="virtualRivalRow" key={r.kart}>
      <div className="virtualRivalIdentity"><span>P{r.predictedPosition} · {r.name}</span><small>Kart #{r.kart} · {r.remainingPits} pits por realizar</small></div>
      <div className="virtualRivalInfo"><strong>{side==='ahead'?'−':'+'}{projectedGap(r,neighbors.ours)}</strong><span className={`contextPace ${pace.tone}`}><Activity size={12}/>{pace.title}</span></div>
    </div>
  }
  return <section className="card virtualRivalsCard">
    <div className="cardHeading"><div><div className="overline">PROJECTED RIVALS</div><h2><FlagTriangleRight size={21}/> Rivais na classificação virtual</h2><p>Quem prevemos enfrentar no final, não quem está perto em pista</p></div><button type="button" className="openRanking" onClick={onDetails}><BarChart3 size={16}/> VER DETALHES</button></div>
    {projection.reasons.length ? <div className="virtualNoData"><CircleHelp size={20}/><div><strong>Projeção indisponível</strong><p>{projection.reasons[0]}</p><button type="button" onClick={onSetup}>Configurar prova e estratégia</button></div></div>:
      <div className="virtualRivalsRows">{row(neighbors.ahead,'ahead')}<div className="virtualRivalRow own"><div className="virtualRivalIdentity"><span>P{neighbors.ours?.predictedPosition||'—'} · {neighbors.ours?.name||'Nossa equipa'}</span><small>Kart #{selectedKart} · {neighbors.ours?.remainingPits??'—'} pits por realizar</small></div><strong>ALVO</strong></div>{row(neighbors.behind,'behind')}</div>}
    {!projection.reasons.length&&<div className="virtualRivalsFoot">Estimativa de ritmo constante · confiança {projection.confidence} · {projection.simulated?'treino fictício':'hipóteses configuradas'}</div>}
  </section>
}
