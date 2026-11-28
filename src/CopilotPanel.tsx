import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle, ArrowRight, BrainCircuit, Check, ChevronRight,
  Clock3, FlagTriangleRight, Gauge, Radio,
  ShieldCheck, SlidersHorizontal, Timer, X
} from 'lucide-react'
import { proposePitWindowChange, type CopilotAnalysis, type CopilotActionKind, type CopilotWindow } from './copilot'
import type { RaceRules, PlannedStint } from './strategy'
import './copilot.css'

type Props = {
  analysis: CopilotAnalysis
  rules: RaceRules
  plan: PlannedStint[]
  currentDriver: string | null
  completedTurns: number
  elapsedMs: number | null
  mode: 'live' | 'sim' | 'demo' | 'import' | 'empty'
  onAction: (action: CopilotActionKind) => void
  onApply: (plan: PlannedStint[]) => boolean
}
const time = (ms: number) => {
  const s = Math.max(0, Math.floor(ms/1000))
  return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`
}
const windowTitle = (laps:number) => laps===0?'Pit agora':`Pit em ${laps} volta${laps===1?'':'s'}`
const statusTitle = (stage:CopilotWindow['status']) => ({possible:'DENTRO DOS LIMITES', 'too-early':'CEDO DEMAIS',late:'LIMITE EXCEDIDO',tight:'MARGEM CURTA',unknown:'NÃO VALIDADO'})[stage]

export function CopilotPanel({analysis,rules,plan,currentDriver,completedTurns,elapsedMs,mode,onAction,onApply}:Props){
  const [open,setOpen]=useState(false)
  const [chosen,setChosen]=useState<number|null>(null)
  const [resultMessage,setResultMessage]=useState('')
  const selectedWindow=analysis.windows.find(w=>w.laps===chosen) ?? null
  const evaluation=useMemo(()=>selectedWindow?proposePitWindowChange({rules,plan,completedTurns,activeDriver:currentDriver,elapsedMs,window:selectedWindow}):null,
    [rules,plan,completedTurns,currentDriver,elapsedMs,selectedWindow])
  useEffect(()=>{setChosen(null);setResultMessage('')},[mode,currentDriver,completedTurns])
  useEffect(()=>{
    if(!open)return
    const old=document.body.style.overflow
    document.body.style.overflow='hidden'
    const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false)}
    document.addEventListener('keydown',onKey)
    return ()=>{document.body.style.overflow=old;document.removeEventListener('keydown',onKey)}
  },[open])

  function runPrimary(){
    if(analysis.action.kind==='details'){setOpen(true);return}
    onAction(analysis.action.kind)
  }
  function save(){
    if(!evaluation?.plan||!selectedWindow||mode==='sim')return
    if(!window.confirm(`Guardar ${windowTitle(selectedWindow.laps).toLowerCase()} no plano?\n\nSerão ajustados apenas o stint atual e o seguinte. Nenhum pit será executado nem serão alterados stints concluídos.`))return
    const saved=onApply(evaluation.plan)
    setResultMessage(saved?'Plano ativo atualizado. A paragem continua a exigir confirmação real.':'Não foi possível aplicar: verifica as restrições do plano.')
    if(saved){setChosen(null);setOpen(false)}
  }

  const a=analysis.action
  const available=analysis.windows.some(w=>w.status==='possible')
  return <>
    <section className={`copilotCommand copilotCommand--${a.severity}`} aria-label="Pitmaster Copilot: próxima decisão">
      <div className="copilotCommandIcon"><BrainCircuit size={25}/></div>
      <div className="copilotCommandText">
        <div className="copilotEyebrow"><span className="copilotSpark"/> PITMASTER COPILOT <span className="copilotConfidence">{analysis.reliability==='simulada'?'DADOS SIMULADOS':`CONFIANÇA ${analysis.reliability.toUpperCase()}`}</span></div>
        <h2>{a.title}</h2>
        <p>{a.description}</p>
      </div>
      <div className="copilotCommandButtons">
        <button type="button" className="copilotPrimary" onClick={runPrimary}>
          {a.kind==='confirm'?<Check size={18}/>:a.kind==='timing'?<Radio size={18}/>:<ArrowRight size={18}/>} {a.button}
        </button>
        <button type="button" className="copilotSecondary" onClick={()=>setOpen(true)}>Porquê? / Cenários <ChevronRight size={15}/></button>
      </div>
    </section>

    {open&&<div className="copilotOverlay" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}>
      <aside className="copilotDrawer" role="dialog" aria-modal="true" aria-labelledby="copilot-drawer-title">
        <header className="copilotDrawerHead">
          <div><span className="copilotEyebrow"><BrainCircuit size={15}/> COPILOT · APOIO À DECISÃO</span><h2 id="copilot-drawer-title">O que fazer a seguir?</h2></div>
          <button type="button" className="copilotClose" onClick={()=>setOpen(false)} aria-label="Fechar Copilot"><X size={21}/></button>
        </header>
        <div className="copilotDrawerBody">
          <section className={`copilotVerdict copilotVerdict--${a.severity}`}>
            <strong>{a.title}</strong><p>{a.description}</p>
          </section>
          <section className="copilotExplanation">
            <div className="copilotSectionLabel"><ShieldCheck size={17}/> Fiabilidade dos dados</div>
            <p>{analysis.reliabilityDetail}</p>
            <span className="copilotSmallTag">{analysis.reliability==='moderada'?'Dados recentes · análise condicional':analysis.reliability==='simulada'?'Apenas demonstração':analysis.reliability==='limitada'?'Informação insuficiente':'Sem dados ao vivo'}</span>
          </section>
          <section className="copilotNextDriver">
            <div><div className="copilotSectionLabel"><FlagTriangleRight size={17}/> Próximo piloto</div><strong>{analysis.nextDriver.name}</strong><small>{analysis.nextDriver.note}</small></div>
            <span className={`copilotSmallTag ${analysis.nextDriver.origin==='planeado'?'copilotPlanTag':''}`}>{analysis.nextDriver.origin}</span>
          </section>
          {analysis.windows.length>0&&<section className="copilotSim">
            <div className="copilotSectionLabel"><SlidersHorizontal size={17}/> Simular janelas de pit</div>
            <p>Compara o momento previsto de entrada com os limites de stint. <strong>Não é uma previsão de tráfego nem executa paragens.</strong></p>
            <div className="copilotScenarioGrid">
              {analysis.windows.map(w=><button type="button" key={w.laps} className={`copilotScenario copilotScenario--${w.status} ${chosen===w.laps?'isSelected':''}`} aria-pressed={chosen===w.laps} onClick={()=>{setChosen(w.laps);setResultMessage('')}}>
                <span>{windowTitle(w.laps)}</span>
                <strong>{time(w.stintAtPitMs)}</strong>
                <small>{statusTitle(w.status)}</small>
              </button>)}
            </div>
            {selectedWindow&&<div className="copilotScenarioDetail">
              <strong>{windowTitle(selectedWindow.laps)}</strong>
              <p>{selectedWindow.reason}</p>
              <div className="copilotScenarioRows"><span>Daqui até à entrada</span><b>{time(selectedWindow.delayMs)}</b></div>
              <div className="copilotScenarioRows"><span>Margem ao máximo</span><b>{selectedWindow.marginToMaxMs===null?'Por definir':selectedWindow.marginToMaxMs<0?`Excede ${time(-selectedWindow.marginToMaxMs)}`:time(selectedWindow.marginToMaxMs)}</b></div>
              {selectedWindow.relativeToFieldSeconds!==null && selectedWindow.laps>0 && <p className="copilotEstimate"><Gauge size={15}/> Se os ritmos se mantiverem, diferença de ritmo acumulada face à mediana do pelotão nestas {selectedWindow.laps} voltas: {selectedWindow.relativeToFieldSeconds>0?'+':''}{selectedWindow.relativeToFieldSeconds.toFixed(1)} s. <strong>Não é um ganho previsto de posição.</strong></p>}
              <p className="copilotScenarioInfo">{evaluation?.reason}</p>
              <button type="button" className="copilotSave" disabled={mode==='sim'||!evaluation?.plan} onClick={save}><Check size={17}/> {mode==='sim'?'Não alterar estratégia real no simulador':'Guardar cenário no plano'}</button>
              {resultMessage&&<p role="status">{resultMessage}</p>}
            </div>}
            {!available&&<p className="copilotHint"><AlertTriangle size={15}/> Nenhuma das janelas avaliadas tem confirmação de validade regulamentar. Confirma primeiro as regras.</p>}
          </section>}
          <section className="copilotFacts">
            <div className="copilotSectionLabel"><Clock3 size={17}/> O que estamos a considerar</div>
            {analysis.paceText&&<p><Gauge size={16}/> {analysis.paceText}</p>}
            {analysis.rivalInsights.map((insight,i)=><p key={'rival-'+i}><FlagTriangleRight size={16}/> {insight}</p>)}
            {analysis.projectionText&&<p><FlagTriangleRight size={16}/> {analysis.projectionText}</p>}
            {analysis.notes.map((note,index)=><p key={index} className={`copilotFact--${note.tone}`}><Timer size={16}/> {note.text}</p>)}
            {!analysis.paceText&&!analysis.projectionText&&!analysis.notes.length&&<p>Faltam dados para conclusões adicionais. O Copilot não inventa métricas.</p>}
          </section>
          <div className="copilotFoot">O Pitmaster apoia a equipa, mas não substitui o regulamento oficial, o Race Control ou uma confirmação visual na box. Os dados de Live Timing podem chegar com atraso.</div>
        </div>
        <footer className="copilotDrawerActions">
          <button type="button" className="copilotOutline" onClick={()=>{setOpen(false);onAction('plan')}}><SlidersHorizontal size={16}/> Abrir estratégia</button>
          <button type="button" className="copilotOutline" onClick={()=>setOpen(false)}><X size={16}/> Fechar</button>
        </footer>
      </aside>
    </div>}
  </>
}
