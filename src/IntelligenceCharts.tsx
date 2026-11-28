import type { ReactNode } from 'react'
import { buildLapRankSeries, buildPaceSeries, buildStintPaceBars } from './chartData'
import type { TimedLap } from './pace'
import { formatPitDurationSeconds } from './pitTime'
import type { StintSummary } from './stintAnalysis'

const text = (n:number) => n.toFixed(2).replace('.', ',')
function GraphCard({ title, subtitle, children }: { title: string, subtitle: string, children: ReactNode }) {
  return <section className="graphCard"><div className="graphHeader"><h3>{title}</h3><p>{subtitle}</p></div>{children}</section>
}
function GraphEmpty({ children }: {children:ReactNode}) { return <div className="graphEmpty">{children}</div> }

type Series = {key:string,label:string,color:string}
type Point = {label:string,[name:string]:string|number|null}
/** Plain SVG, keyboard-friendly, no extra chart dependency; lower times/ranks are shown higher. */
export function LineGraph({ points, series, unit, minPoints = 2, domainMin, domainMax }: {
  points: Point[], series: Series[], unit:string, minPoints?:number, domainMin?:number, domainMax?:number
}) {
  const all=points.flatMap(p=>series.map(s=>p[s.key]).filter((v):v is number=>typeof v==='number' && Number.isFinite(v)))
  if (points.length < minPoints || all.length < minPoints) return <GraphEmpty>Sem histórico suficiente para desenhar uma tendência fiável.</GraphEmpty>
  const rawMin=Math.min(...all),rawMax=Math.max(...all)
  const margin=Math.max((rawMax-rawMin)*.16,unit==='s'?0.12:0.8)
  const min=domainMin??Math.max(unit==='posição'?1:0,rawMin-margin)
  const max=domainMax??rawMax+margin
  const left=54, right=14, top=16,bottom=40,width=650,height=230, plotW=width-left-right,plotH=height-top-bottom
  const x=(i:number)=>left+(points.length===1?plotW/2:i*plotW/(points.length-1))
  const y=(v:number)=>top+(v-min)/Math.max(0.0001,max-min)*plotH
  const ticks=[0,0.25,0.5,0.75,1]
  return <div className="graphCanvas"><div className="graphLegend">{series.map(s=><span key={s.key}><i style={{background:s.color}}/>{s.label}</span>)}</div>
    <svg className="graphSvg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Evolução de ${series.map(s=>s.label).join(' e ')}. Valores menores aparecem no topo.`}>
      {ticks.map((t,i)=><g key={i}><line x1={left} x2={width-right} y1={top+t*plotH} y2={top+t*plotH} stroke="#395142" strokeDasharray="4 7" strokeWidth=".8"/><text x={left-9} y={top+t*plotH+4} textAnchor="end" fill="#9eb8a2" fontSize="11">{unit==='posição'?`P${Math.max(1,Math.round(min+t*(max-min)))}`:text(min+t*(max-min))}</text></g>)}
      {points.map((p,i)=>(i%Math.max(1,Math.ceil(points.length/7))===0 || i===points.length-1) && <text key={i} x={x(i)} y={height-13} textAnchor="middle" fill="#9eb8a2" fontSize="11">{p.label}</text>)}
      {series.map(s=>{
        const segments: string[][]=[];let segment:string[]=[]
        points.forEach((p,i)=>{ const v=p[s.key];if(typeof v==='number'&&Number.isFinite(v)){segment.push(`${x(i)},${y(v)}`)}else if(segment.length){segments.push(segment);segment=[]} })
        if(segment.length)segments.push(segment)
        return <g key={s.key}>{segments.map((seg,i)=><polyline key={i} points={seg.join(' ')} fill="none" stroke={s.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>)}
          {points.map((p,i)=>typeof p[s.key]==='number'&&<circle key={i} cx={x(i)} cy={y(p[s.key] as number)} r={3.2} fill={s.color}><title>{`${p.label} · ${s.label}: ${unit==='posição'?`P${p[s.key]}`:`${text(p[s.key] as number)} s`}`}</title></circle>)}
        </g>
      })}
    </svg><p className="graphGuide">{unit==='posição'?'Mais perto de P1 = melhor posição de ritmo.':'Mais alto no gráfico = tempo mais rápido (menos segundos).'}</p></div>
}

export function PaceTrendGraph({laps,kart}:{laps:TimedLap[],kart:string}) {
  const series=buildPaceSeries(laps,kart)
  return <GraphCard title="Evolução do ritmo" subtitle="Últimas voltas nossas vs. mediana recente dos rivais no momento da passagem">
    {series.filter(p=>p.field!==null).length<2
      ? <GraphEmpty>Precisamos de pelo menos duas passagens nossas e de dois adversários com histórico recente. Os dados históricos sem voltas não permitem este gráfico.</GraphEmpty>
      : <LineGraph points={series.map(p=>({label:p.label,own:p.own,field:p.field}))} series={[{key:'own',label:'A nossa equipa',color:'#b6fc64'},{key:'field',label:'Pelotão',color:'#68baff'}]} unit="s"/>}
  </GraphCard>
}
export function LapRankTrendGraph({laps,kart}:{laps:TimedLap[],kart:string}) {
  const points=buildLapRankSeries(laps,kart)
  return <GraphCard title="Ranking das últimas voltas" subtitle="Posição de ritmo de cada volta concluída face às medianas recentes dos outros karts">
    {points.length<2 ? <GraphEmpty>Ainda não existem duas voltas comparáveis com pelo menos dois rivais.</GraphEmpty> :
      <LineGraph points={points.map(p=>({label:p.label,rank:p.rank}))} series={[{key:'rank',label:'Posição de ritmo',color:'#b6fc64'}]} unit="posição" domainMin={1} domainMax={Math.max(5,...points.map(p=>p.total))}/>}
    <p className="graphGuide">Não é a posição oficial nem a classificação projetada no final. A dimensão da amostra pode variar entre voltas.</p>
  </GraphCard>
}
export function StintPaceGraph({stints}:{stints:StintSummary[]}) {
  const items=buildStintPaceBars(stints)
  const max=Math.max(0.3,...items.map(x=>Math.abs(x.deltaSeconds)))*1.12
  return <GraphCard title="Ritmo de cada stint vs. pelotão" subtitle="Diferença em segundos por volta · à esquerda melhor; à direita pior">
    {items.length===0 ? <GraphEmpty>Precisamos de voltas comparáveis durante os stints para representar o desempenho.</GraphEmpty> :
      <div className="deltaGraph"><div className="deltaAxis"><span>Mais rápido</span><span>0 s</span><span>Mais lento</span></div>
        {items.map(item=><div className="deltaRow" key={item.label}><div className="deltaLabel"><strong>{item.label}</strong><small>{item.laps} voltas</small></div><div className="deltaTrack"><i className="deltaZero"/><span className={`deltaBar ${item.deltaSeconds>0.15?'slower':item.deltaSeconds<-.15?'faster':'similar'}`} style={{left:item.deltaSeconds<0?`${50-Math.abs(item.deltaSeconds)/max*48}%`:'50%',width:`${Math.max(1,Math.abs(item.deltaSeconds)/max*48)}%`}}/></div><strong className="deltaValue">{item.deltaSeconds>0?'+':''}{text(item.deltaSeconds)}s</strong></div>)}
      </div>}
  </GraphCard>
}
export function RivalBarGraph({rows}:{rows:{kart:string,name:string,ms:number|null,ours?:boolean}[]}) {
  const valid=rows.filter((r):r is typeof r & {ms:number} =>r.ms!==null && Number.isFinite(r.ms))
  const best=Math.min(...valid.map(r=>r.ms))
  const worstDelta=Math.max(200,...valid.map(r=>r.ms-best))
  return <GraphCard title="Quem está a rodar mais rápido?" subtitle="Vantagem/perda face ao kart mais rápido nesta comparação · mediana de 5 voltas">
    {valid.length<2 ? <GraphEmpty>São necessárias voltas recentes de pelo menos dois karts. Sem dados comparáveis.</GraphEmpty> : <div className="comparisonBars">{rows.map(r=><div className="comparisonRow" key={r.kart}><div className="comparisonName"><b>#{r.kart}</b><span>{r.ours?'Nós':r.name}</span></div><div className="comparisonTrack">{r.ms!==null&&<i style={{width:`${Math.max(2,(r.ms-best)/worstDelta*100)}%`,background:r.ours?'#b6fc64':'#68baff'}}/>}</div><strong>{r.ms===null?'—':r.ms===best?'MAIS RÁPIDO':`+${((r.ms-best)/1000).toFixed(2)} s`}</strong></div>)}</div>}
    <p className="graphGuide">Barra mais curta = menor diferença para o mais rápido. Não representa distância em pista ou gap oficial.</p>
  </GraphCard>
}

export function OracleWindowGraph({now,later}:{now:number,later:number}) {
  const max=Math.max(1,now,later)
  return <GraphCard title="Custo de tráfego estimado" subtitle="Comparação ilustrativa entre duas janelas de pit stop">
    <div className="comparisonBars">{[{label:'Parar agora',seconds:now},{label:'Esperar 2 voltas',seconds:later}].map(item=><div key={item.label} className="comparisonRow"><div className="comparisonName"><span>{item.label}</span></div><div className="comparisonTrack"><i style={{width:`${Math.max(2,item.seconds/max*100)}%`,background:item.seconds===Math.min(now,later)?'#b6fc64':'#ffb46a'}}/></div><strong>{item.seconds.toFixed(1)} s</strong></div>)}</div>
    <p className="graphGuide">Cálculo heurístico do simulador. Não é um tempo real medido nem uma previsão garantida.</p>
  </GraphCard>
}

export function PitDurationGraph({ visits, minSeconds, now }: {visits:{id:string,enteredAt:number,exitedAt?:number}[],minSeconds:number|null,now:number}) {
  const completed=visits.filter(v=>v.exitedAt!==undefined).slice(-12)
  const max=Math.max(1,(minSeconds??0),...completed.map(v=>(v.exitedAt!-v.enteredAt)/1000))
  return <GraphCard title="Duração das paragens" subtitle="Últimos pits registados · tempo em m:ss:SSS e mínimo regulamentar">
    {completed.length===0?<GraphEmpty>Ainda sem paragens concluídas nesta prova.</GraphEmpty>:<div className="pitGraph">{completed.map((v,i)=>{
      const sec=(v.exitedAt!-v.enteredAt)/1000
      return <div className="pitGraphRow" key={v.id}><span>Stop {i+1}</span><div className="pitGraphTrack"><i style={{width:`${sec/max*100}%`,background:minSeconds!==null&&sec<minSeconds?'#ff967a':'#b6fc64'}}/>{minSeconds!==null&&<span style={{left:`${Math.min(100,minSeconds/max*100)}%`}}/>}</div><strong>{formatPitDurationSeconds(sec)}</strong></div>
    })}</div>}
    <p className="graphGuide">{minSeconds===null?'Tempo mínimo de pit não configurado.':`Linha vertical = mínimo de ${formatPitDurationSeconds(minSeconds)}.`} Hora de referência: {new Date(now).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'})}.</p>
  </GraphCard>
}
