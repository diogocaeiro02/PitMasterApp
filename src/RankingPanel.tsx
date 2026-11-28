import { useMemo, useState } from 'react'
import { ArrowLeft, FlagTriangleRight, Search, ListOrdered, Radio, CircleHelp, Info } from 'lucide-react'
import type { Racer } from './timing/types'
import type { Projection, ProjectionSettings, ProjectionRow } from './projection'
import { projectedGap } from './projection'

type Props = {
  racers:Racer[]; selectedKart:string; onSelectKart:(kart:string)=>void
  onBack:()=>void; source:string; mode:'demo'|'live'|'sim'|'import'|'empty'
  projection:Projection; projectionMode:'official'|'projected'; onProjectionMode:(v:'official'|'projected')=>void
  settings:ProjectionSettings; onSettings:(v:ProjectionSettings)=>void
  minPits:number|null; onGoRules:()=>void
}
const fmt=(v:string|number|null|undefined)=>v===null||v===undefined||v===''?'—':String(v)
const position=(v:number|null)=>v===null?'—':`${v}º`
export function RankingPanel({racers,selectedKart,onSelectKart,onBack,source,mode,projection,projectionMode,onProjectionMode,settings,onSettings,minPits,onGoRules}:Props){
  const [search,setSearch]=useState('')
  const [nearby,setNearby]=useState(false)
  const virtual=projectionMode==='projected'
  const mineOfficial=racers.find(r=>r.kart===selectedKart)
  const mineProjected=projection.rows.find(r=>r.kart===selectedKart)
  const filtered=useMemo(()=>virtual?projection.rows.filter(r=>{
    const q=search.toLocaleLowerCase('pt-PT').trim()
    if(nearby&&(!mineProjected||Math.abs(r.predictedPosition-mineProjected.predictedPosition)>5))return false
    return !q||`${r.name} ${r.kart} ${r.predictedPosition}`.toLocaleLowerCase('pt-PT').includes(q)
  }):racers.filter(r=>{
    const q=search.toLocaleLowerCase('pt-PT').trim()
    if(nearby&&(!mineOfficial?.position||!r.position||Math.abs(r.position-mineOfficial.position)>5))return false
    return !q||`${r.name} ${r.kart} ${r.position}`.toLocaleLowerCase('pt-PT').includes(q)
  }),[virtual,projection.rows,racers,search,nearby,mineOfficial,mineProjected])
  const projectedFiltered = filtered as ProjectionRow[]
  const officialFiltered = filtered as Racer[]
  const feed=mode==='sim'?'SIMULAÇÃO FICTÍCIA':mode==='demo'?'ARQUIVO HISTÓRICO':mode==='import'?'DADOS IMPORTADOS':mode==='live'?'TIMING AO VIVO':'SEM FEED'
  return <section className="rankingPage" aria-labelledby="ranking-title">
    <div className="rankingTop"><div><div className="overline"><ListOrdered size={15}/> RACE STANDINGS · {feed}</div><h1 id="ranking-title">Classificação</h1><p>Consulta a posição oficial ou experimenta uma previsão de chegada condicionada pelos pits e pelo ritmo.</p></div><button type="button" className="quietBtn" onClick={onBack}><ArrowLeft size={17}/> Voltar à corrida</button></div>
    <div className="standingsModes" role="group" aria-label="Modo da classificação"><button type="button" className={!virtual?'selected':''} onClick={()=>onProjectionMode('official')}>Oficial <small>Live Timing</small></button><button type="button" className={virtual?'selected':''} onClick={()=>onProjectionMode('projected')}>Virtual · final projetado <small>Estimativa Pitmaster</small></button></div>
    {virtual&&<details className="rankingProjectionOptions"><summary><Info size={17}/> Hipóteses do cenário de chegada <span>Editar</span></summary><div className="projectionMethod card">
      <div className="projectionMethodHeading"><Info size={18}/><strong>Cenário de chegada</strong><span>{projection.simulated?'HIPÓTESES DE SIMULAÇÃO':'HIPÓTESES DA PROVA'}</span></div>
      {mode==='sim'?<p>Treino fictício com {projection.minPitStops} pits mínimos, {projection.pitLossSeconds} s perdidos por pit e {projection.remainingMinutes.toFixed(0)} min restantes. Não corresponde a regulamento oficial.</p>:
      <div className="projectionInputs"><label><span>RESTANTE (MIN)</span><input type="number" min="1" max="1440" step="1" value={settings.remainingMinutes??''} onChange={e=>onSettings({...settings,remainingMinutes:e.target.value===''?null:Number(e.target.value)})} placeholder="Ex.: 120"/></label><label><span>PERDA MÉDIA / PIT (S)</span><input type="number" min="1" max="1800" step="1" value={settings.pitLossSeconds??''} onChange={e=>onSettings({...settings,pitLossSeconds:e.target.value===''?null:Number(e.target.value)})} placeholder="Ex.: 60"/></label><div><span>PITS MÍNIMOS</span><button type="button" className="quietBtn" onClick={onGoRules}>{minPits??'Por definir'} · Configurar regulamento</button></div></div>}
      <p className="projectionCaution">Modelo de ritmo constante. Não prevê tráfego, bandeiras, trocas de kart, incidentes ou penalizações não confirmadas. Gaps projetados são aproximações à chegada.</p>
    </div></details>}
    {virtual&&projection.reasons.length>0?<div className="card projectionEmpty"><CircleHelp size={27}/><div><h2>A classificação virtual ainda não pode ser calculada</h2>{projection.reasons.map((reason,i)=><p key={i}>{reason}</p>)}{mode==='demo'&&<p>O arquivo da final de Palmela não inclui todas as voltas necessárias. Experimenta o simulador.</p>}</div></div>:<>
      <div className="rankingSummary"><div className="rankingOwnPosition"><span>{virtual?'POSIÇÃO FINAL ESTIMADA':'A NOSSA EQUIPA'}</span><strong>{virtual?position(mineProjected?.predictedPosition??null):position(mineOfficial?.position??null)} <small>/ {racers.length||'—'}</small></strong><div>#{selectedKart||'—'} · {mineOfficial?.name||'Seleciona um kart'}</div></div><div className="rankingDetail"><span>{virtual?'POSIÇÃO ATUAL':'ÚLTIMA VOLTA'}</span><strong>{virtual?position(mineOfficial?.position??null):fmt(mineOfficial?.lastLap)}</strong></div><div className="rankingDetail"><span>{virtual?'PITS RESTANTES':'MELHOR VOLTA'}</span><strong>{virtual?mineProjected?.remainingPits??'—':fmt(mineOfficial?.bestLap)}</strong></div><div className="rankingDetail"><span>{virtual?'CONFIANÇA':'GAP OFICIAL'}</span><strong>{virtual?projection.confidence:fmt(mineOfficial?.gap)}</strong></div></div>
      <div className="rankingTools"><label className="rankingSearch"><Search size={18}/><input aria-label="Procurar kart ou equipa" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar equipa, kart, posição…"/></label><button className={`rankingFilter ${nearby?'on':''}`} onClick={()=>setNearby(s=>!s)}>{nearby?'✓ ':''}±5 posições da nossa equipa</button><span className="rankingCount"><Radio size={14}/>{filtered.length} / {racers.length} karts · {virtual?'projeção':source}</span></div>
      <div className="rankingTableScroll"><table className="rankingTable"><thead><tr><th>POS.</th><th>EQUIPA / KART</th>{virtual?<><th>ATUAL</th><th>RITMO</th><th>PITS REST.</th><th>GAP PROJETADO</th><th>VARIAÇÃO</th></>:<><th>VOLTAS</th><th>ÚLTIMA</th><th>MELHOR</th><th>GAP</th><th>INTERVALO</th><th>PITS</th></>}</tr></thead><tbody>
        {virtual?projectedFiltered.map(r=>{const previous=projection.rows.find(t=>t.predictedPosition===r.predictedPosition-1);return <tr key={r.kart} className={r.kart===selectedKart?'rankingMine':''}><td className="rankingPosition">P{r.predictedPosition}</td><td className="rankingIdentity"><button onClick={()=>onSelectKart(r.kart)}><span className="rankingKart">#{r.kart}</span><strong>{r.name}</strong></button></td><td>{position(r.officialPosition)}</td><td>{(r.typicalLapMs/1000).toFixed(3)} s</td><td>{r.remainingPits}</td><td>{previous?projectedGap(r,previous):'Líder'}</td><td>{r.officialPosition===null?'—':r.officialPosition>r.predictedPosition?`↑ ${r.officialPosition-r.predictedPosition}`:r.officialPosition<r.predictedPosition?`↓ ${r.predictedPosition-r.officialPosition}`:'—'}</td></tr>}):officialFiltered.map(r=><tr key={r.id} className={r.kart===selectedKart?'rankingMine':''}><td className="rankingPosition">{position(r.position)}</td><td className="rankingIdentity"><button onClick={()=>onSelectKart(r.kart)}><span className="rankingKart">#{r.kart}</span><strong>{r.name}</strong></button></td><td>{fmt(r.laps)}</td><td>{fmt(r.lastLap)}</td><td className="rankingBest">{fmt(r.bestLap)}</td><td>{fmt(r.gap)}</td><td>{fmt(r.interval)}</td><td>{fmt(r.pits)}</td></tr>)}
      </tbody></table></div>
      <div className="rankingNote"><CircleHelp size={16}/><span>{virtual?'Esta tabela é uma previsão condicional, não uma classificação oficial; apenas os dados suportados entram no cálculo.':'Classificação fornecida pela cronometragem. A posição não representa a ordem física dos karts na pista.'}</span></div>
    </>}
    <button className="rankingBackBottom" onClick={onBack}><FlagTriangleRight size={16}/> Regressar ao controlo da corrida</button>
  </section>
}
