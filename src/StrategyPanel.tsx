import { useEffect, useMemo, useState } from 'react'
import type {PitVisit} from './pit'
import {formatPitDurationMs, formatPitDurationSeconds, parsePitDurationSeconds} from './pitTime'
import {liveStrategyBudget} from './liveStrategy'
import {
  AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CheckCircle2,
  ClipboardList, Clock3, Flag, Lightbulb, Minus, Plus, RotateCcw, ShieldCheck,
  Timer, Trash2, Users, WandSparkles, LockKeyhole, FlaskConical, Save, X
} from 'lucide-react'
import {
  actualDriverStats, actualRuleAlerts, budgetMinutes, generatePlan, plannedPitStops,
  sumStintMinutes, validateStrategy,
  type ActualTurn, type RaceRules, type Strategy, type PlannedStint
} from './strategy'

type Props = {
  strategy: Strategy
  onChange: (next: Strategy) => void
  drivers: string[]
  onAddDriver: (name: string) => void
  onRemoveDriver: (name: string) => void
  turns: ActualTurn[]
  pitVisits?: PitVisit[]
  now: number
  onSelectNext: (driver: string) => void
  onBack: () => void
  onResetRace: () => void
}
const ruleFields: { key: keyof RaceRules; label: string; unit: string; placeholder: string; help: string }[] = [
  { key: 'raceMinutes', label: 'Duração da corrida', unit: 'min', placeholder: '420', help: 'Tempo total da prova' },
  { key: 'minStintMinutes', label: 'Stint mínimo', unit: 'min', placeholder: '20', help: 'Mínimo de condução por turno' },
  { key: 'maxStintMinutes', label: 'Stint máximo', unit: 'min', placeholder: '45', help: 'Máximo de condução por turno' },
  { key: 'minTeamStints', label: 'Stints mínimos da equipa', unit: 'stints', placeholder: '10', help: 'Total mínimo de turnos' },
  { key: 'minDriverStints', label: 'Stints mínimos por piloto', unit: 'stints', placeholder: '2', help: 'Aplicado a todos os pilotos inscritos' },
  { key: 'minPitStops', label: 'Paragens mínimas', unit: 'pits', placeholder: '9', help: 'Paragens obrigatórias da equipa' },
  { key: 'minPitSeconds', label: 'Tempo mínimo por paragem', unit: 'm:ss:SSS', placeholder: '3:01:104', help: 'Formato minutos:segundos:milésimos, descontado do tempo de corrida' },
  { key: 'maxDriverMinutes', label: 'Máximo total por piloto', unit: 'min', placeholder: '180', help: 'Opcional: tempo acumulado na prova' },
]
const wholeNumber = new Set<keyof RaceRules>(['minTeamStints', 'minDriverStints', 'minPitStops'])
const minutesText = (minutes: number) => `${minutes.toLocaleString('pt-PT', { maximumFractionDigits: 2 })} min`
function raceClock(minutes: number) {
  const wholeSeconds = Math.round(minutes * 60)
  return `${String(Math.floor(wholeSeconds / 3600)).padStart(2,'0')}:${String(Math.floor(wholeSeconds / 60) % 60).padStart(2,'0')}`
}
/** Edit milliseconds without rounding or replacing partial text while a pilot types. */
function PitTimeInput({seconds, onCommit, disabled=false, label, minimum=0}: {
  seconds:number|null|undefined; onCommit:(seconds:number|null)=>void; disabled?:boolean; label:string; minimum?:number
}) {
  const [text,setText]=useState(()=>formatPitDurationSeconds(seconds))
  const [error,setError]=useState('')
  useEffect(()=>{setText(seconds==null?'':formatPitDurationSeconds(seconds));setError('')},[seconds])
  function commit(){
    if (disabled) return
    const parsed=parsePitDurationSeconds(text)
    if (parsed!==null && !Number.isFinite(parsed)) {
      setError('Formato inválido. Ex.: 3:01:104')
      return
    }
    if (parsed!==null && parsed<minimum) {
      setError(`Mínimo: ${formatPitDurationSeconds(minimum)}`)
      return
    }
    onCommit(parsed)
    setText(parsed===null?'':formatPitDurationSeconds(parsed))
    setError('')
  }
  return <span className="pitTimeInputWrap">
    <input type="text" className="formInput pitTimeInput" inputMode="text" spellCheck={false}
      autoComplete="off" aria-label={label} aria-invalid={!!error} title="Minutos:segundos:milésimos — 3:01:104"
      value={text} disabled={disabled} placeholder="3:01:104"
      onChange={event=>{setText(event.target.value);setError('')}} onBlur={commit}
      onKeyDown={event=>{if(event.key==='Enter')event.currentTarget.blur();if(event.key==='Escape'){setText(seconds==null?'':formatPitDurationSeconds(seconds));setError('')}}}/>
    {error&&<span className="pitTimeError" role="alert">{error}</span>}
  </span>
}

export function StrategyPanel({ strategy, onChange, drivers, onAddDriver, onRemoveDriver, turns, pitVisits=[], now, onSelectNext, onBack, onResetRace }: Props) {
  const [draft, setDraft] = useState<Strategy|null>(null)
  const [confirmMessage,setConfirmMessage]=useState('')
  const actualLocked = turns.filter(turn=>turn.endedAt !== undefined).length
  const runningIndex = turns.findIndex(turn=>turn.endedAt===undefined)
  // Persisted actual records always override editable plans.
  const editing = draft ?? strategy
  const updatePlan = (candidate: Strategy) => draft ? setDraft(candidate) : onChange(candidate)
  const locked = (index:number) => index < actualLocked
  const baseline = strategy
  const [driverDraft, setDriverDraft] = useState('')
  const [generatorError, setGeneratorError] = useState('')
  const { rules, plan } = editing
  const errors = useMemo(() => validateStrategy(editing, drivers), [editing, drivers])
  const configured = rules.raceMinutes !== null && rules.minStintMinutes !== null && rules.maxStintMinutes !== null
  const good = !!plan.length && configured && errors.length === 0
  const elapsed = actualDriverStats(turns, now)
  const actualAlerts = actualRuleAlerts(turns, rules, now)
  const nextPlanned = plan[turns.length]
  const active = turns.some(t => t.endedAt === undefined)
  const liveBudget=useMemo(()=>liveStrategyBudget(editing,turns,pitVisits,now),[editing,turns,pitVisits,now])

  function changeRule(key: keyof RaceRules, raw: string) {
    const v = raw === '' ? null : Number(raw)
    updatePlan({ ...editing, rules: { ...rules, [key]: v === null || !Number.isFinite(v) || v < 0 ? null : v } })
    setGeneratorError('')
  }
  function updateStint(id: string, patch: Partial<PlannedStint>) {
    updatePlan({ ...editing, plan: plan.map((stint,index) => stint.id === id && !locked(index) ? { ...stint, ...patch, ...(runningIndex===index?{driver:stint.driver}: {}) } : stint) })
  }
  function moveStint(idx: number, direction: number) {
    const target = idx + direction
    if (target < 0 || target >= plan.length || locked(idx) || locked(target) || runningIndex===idx || runningIndex===target) return
    const copied = [...plan]
    ;[copied[idx], copied[target]] = [copied[target], copied[idx]]
    updatePlan({ ...editing, plan: copied })
  }
  function addStint() {
    updatePlan({ ...editing, plan: [...plan, { id: `stint-${crypto.randomUUID()}`, driver: drivers[plan.length % drivers.length] ?? '', minutes: rules.minStintMinutes ?? 0 }] })
  }
  function autoGenerate() {
    const result = generatePlan(rules, drivers)
    if (result.error) { setGeneratorError(result.error); return }
    if (plan.length && !window.confirm('Recalcular apenas os turnos futuros? Os turnos concluídos e o piloto atual não serão alterados.')) return
    const count=Math.max(actualLocked,runningIndex+1)
    updatePlan({ ...editing, plan: [...plan.slice(0,count),...result.plan.slice(count)] })
    setGeneratorError('')
  }
  function addDriver() {
    const name = driverDraft.trim()
    if (!name) return
    onAddDriver(name)
    setDriverDraft('')
  }
  const scheduledCount: Record<string, { count: number; minutes: number }> = {}
  plan.forEach(s => {
    if (!scheduledCount[s.driver]) scheduledCount[s.driver] = { count: 0, minutes: 0 }
    scheduledCount[s.driver].count++
    scheduledCount[s.driver].minutes += s.minutes
  })
  let cursor = 0

  return <div className="strategyScreen">
    <div className="strategyHeading">
      <div><div className="overline"><span className="limeDot"/> PITMASTER / RACE PLANNING</div><h1>Estratégia<span>.</span></h1><p>O que já aconteceu fica bloqueado. Planeia ou simula apenas os turnos que faltam.</p></div>
      <div className="strategyHeaderActions"><button className="quietBtn" onClick={onResetRace}><RotateCcw size={16}/> Nova prova</button><button className="quietBtn" onClick={onBack}><ArrowLeft size={16}/> Voltar à corrida</button></div>
    </div>

    <section className={`strategySandbox ${draft?'isDraft':''}`}>
      <div><span className="overline">ESTRATÉGIA VIVA</span><strong>{draft?'A SIMULAR · PLANO ATIVO PROTEGIDO':'Plano ativo'}</strong><small>{actualLocked} stints concluídos bloqueados. {runningIndex>=0?'Piloto atual protegido. ':''}Altera os próximos stints e os tempos de box.</small></div>
      <div className="strategySandboxButtons">
        {!draft?<button className="solidBtn" onClick={()=>{setDraft(structuredClone(strategy));setConfirmMessage('')}}><FlaskConical size={17}/> Simular alterações</button>:<>
          <button className="quietBtn" onClick={()=>setDraft(null)}><X size={16}/> Descartar</button>
          <button className="solidBtn" onClick={()=>{
            const problems=validateStrategy(editing,drivers)
            if(problems.length && !window.confirm(`O plano simulado tem ${problems.length} alerta(s). Aplicar mesmo assim?`))return
            onChange({...editing,plan:editing.plan.map((item,i)=>i<actualLocked?baseline.plan[i]||item:runningIndex===i?{...item,driver:baseline.plan[i]?.driver||turns[i]?.driver||item.driver}:item)})
            setDraft(null);setConfirmMessage('Plano futuro atualizado. O histórico real mantém-se bloqueado.')
          }}><Save size={17}/> Aplicar plano</button>
        </>}
      </div>
    </section>
    {confirmMessage&&<p className="strategyHint" role="status">{confirmMessage}</p>}
    <div className="strategyScoreGrid">
      <div className="strategyScore"><small>STINTS PLANEADOS</small><strong>{plan.length || '—'}</strong><span>Mínimo: {rules.minTeamStints ?? 'por definir'}</span></div>
      <div className="strategyScore"><small>TEMPO DE CONDUÇÃO</small><strong>{plan.length ? raceClock(sumStintMinutes(plan)) : '—'}</strong><span>{rules.raceMinutes === null ? 'Duração da prova não definida' : `Prova: ${raceClock(rules.raceMinutes)}`}</span></div>
      <div className="strategyScore"><small>PARAGENS PLANEADAS</small><strong>{plan.length ? plannedPitStops(plan) : '—'}</strong><span>Mínimo: {rules.minPitStops ?? 'por definir'}</span></div>
      <div className={`strategyScore strategyStatus ${good ? 'statusValid' : errors.length ? 'statusInvalid' : ''}`}><small>ESTADO DO PLANO</small><strong>{good ? 'VALIDADO' : errors.length ? 'REVER' : 'POR DEFINIR'}</strong><span>{good ? 'Cumpre as regras configuradas' : errors.length ? `${errors.length} ponto(s) a verificar` : 'Configura as regras e os turnos'}</span></div>
    </div>

    <details className="strategyConfigDisclosure">
      <summary><span><ClipboardList size={19}/><strong>Regras e pilotos</strong><small>{drivers.length} pilotos · regras configuradas na preparação da prova</small></span><ArrowDown size={18}/></summary>
    <div className="strategyTwoCols">
      <section className="card strategyConfig">
        <div className="cardHeading"><div><div className="overline">01 / REGULAMENTO</div><h2><ClipboardList size={21}/> Regras da corrida</h2><p>Campos vazios significam «não configurado».</p></div><span className="sectionTag">EDITÁVEL</span></div>
        <div className="rulesGrid">{ruleFields.map(field => <label className="ruleField" key={field.key}><span className="ruleLabel">{field.label}</span><div className="ruleInputWrap">{field.key === 'minPitSeconds' ? <PitTimeInput label="Tempo mínimo por paragem" seconds={rules.minPitSeconds} onCommit={value=>changeRule('minPitSeconds',value===null?'':String(value))}/> : <input type="number" min={field.key === 'minStintMinutes' || field.key === 'maxStintMinutes' || field.key === 'raceMinutes' || field.key === 'maxDriverMinutes' ? 0.01 : 0} step={wholeNumber.has(field.key) ? 1 : 0.01} value={rules[field.key] ?? ''} placeholder={field.placeholder} onChange={event => changeRule(field.key, event.target.value)}/>}<span>{field.unit}</span></div><small>{field.help}</small></label>)}</div>
        <div className="strategyHint"><Lightbulb size={18}/> Os valores nas caixas são apenas exemplos. Confirma-os no regulamento oficial da tua prova antes de os introduzir.</div>
      </section>

      <section className="card strategyTeam">
        <div className="cardHeading"><div><div className="overline">02 / EQUIPA</div><h2><Users size={21}/> Pilotos inscritos</h2><p>Participantes e distribuição de turnos.</p></div><span className="sectionTag">{drivers.length} PILOTOS</span></div>
        <div className="strategyDriverAdd"><input className="formInput" value={driverDraft} placeholder="Nome do piloto" onChange={e => setDriverDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addDriver() }}/><button className="quietBtn" onClick={addDriver} aria-label="Adicionar piloto"><Plus size={18}/></button></div>
        <div className="strategyDriverList">{drivers.map((driver, idx) => <div className="strategyDriverRow" key={driver}><div className="driverAvatar">{String(idx + 1).padStart(2, '0')}</div><div className="strategyDriverInfo"><strong>{driver}</strong><small>Plano: {scheduledCount[driver]?.count ?? 0} stint(s) · {minutesText(scheduledCount[driver]?.minutes ?? 0)}</small><small>Real: {elapsed[driver]?.stints ?? 0} stint(s) · {minutesText(elapsed[driver]?.minutes ?? 0)}</small></div><button className="minimalIconBtn" disabled={turns.some(t => t.driver === driver && t.endedAt === undefined)} title="Remover piloto" aria-label={`Remover ${driver}`} onClick={() => onRemoveDriver(driver)}><Trash2 size={16}/></button></div>)}{drivers.length === 0 && <p className="emptyPlan">Adiciona os pilotos que vão participar na prova.</p>}</div>
        <div className="strategyHint"><Timer size={17}/> O tempo real é contado desde o início manual do turno no painel de corrida.</div>
      </section>
    </div>
    </details>

    {actualAlerts.length > 0 && <section className="strategyActualAlerts" aria-live="polite"><div><AlertTriangle size={19}/><strong>Alertas dos turnos reais ({actualAlerts.length})</strong></div><ul>{actualAlerts.map((alert, index) => <li key={index}>{alert}</li>)}</ul></section>}

    <section className="card strategyPlanner">
      <div className="cardHeading plannerHeading"><div><div className="overline">03 / RACE PLAN</div><h2><Flag size={21}/> Plano de stints</h2><p>Distribuição editável dos turnos por ordem de entrada em pista.</p></div><div className="plannerActions"><button className="quietBtn" onClick={addStint}><Plus size={17}/> Adicionar stint</button><button className="solidBtn" onClick={autoGenerate}><WandSparkles size={18}/> Gerar plano equilibrado</button></div></div>
      {generatorError && <div className="strategyIssue"><AlertTriangle size={18}/>{generatorError}</div>}
      <div className="planSummary"><span><Clock3 size={16}/> {plan.length ? `Duração projetada: ${minutesText(budgetMinutes(editing))}` : 'Ainda sem plano'}</span><span>Inclui {rules.minPitSeconds === null ? '—' : formatPitDurationSeconds(rules.minPitSeconds)} por paragem prevista{rules.minPitSeconds === null ? ' (tempo de boxes não configurado)' : ''}</span></div>
      {plan.length>0&&<div className="liveBudgetPanel"><span>PROJEÇÃO COM TEMPOS REAIS + PLANO FUTURO</span><strong>{raceClock(liveBudget.totalMs/60_000)} h</strong><small>{liveBudget.deltaMs===null?'Configura a duração da corrida para comparar':`${liveBudget.deltaMs>=0?'+':'−'}${raceClock(Math.abs(liveBudget.deltaMs)/60000)} h face à duração da prova`}</small><small>{liveBudget.finished} stint(s) concluído(s) incluído(s) com tempo real; os restantes são estimativas.</small></div>}
      {plan.length > 0 ? <>
        <div className="strategyTimeline" aria-label="Distribuição dos stints">{plan.map((stint, index) => <div className="strategyTimelineSegment" key={stint.id} style={{ flex: Math.max(0.15, stint.minutes) }} title={`Stint ${index + 1} · ${stint.driver} · ${minutesText(stint.minutes)}`}><span>{index + 1}</span></div>)}</div>
        <div className="planTableHead"><span>STINT</span><span>PILOTO</span><span>DURAÇÃO</span><span>PROGRESSO DA PROVA / BOX</span><span>AÇÕES</span></div>
        <div className="planRows">{plan.map((stint, idx) => {
          const start = cursor
          cursor += stint.minutes + (idx < plan.length - 1 ? (stint.pitSeconds ?? rules.minPitSeconds ?? 0) / 60 : 0)
          const finished = idx < turns.length && turns[idx].endedAt !== undefined
          const running = idx < turns.length && turns[idx].endedAt === undefined
          const hasDeviation = idx < turns.length && turns[idx].driver !== stint.driver
          return <div className={`planRow ${running ? 'planRunning' : ''} ${finished?'planLocked':''}`} key={stint.id}>
            <div className="planIndex"><strong>{finished?<LockKeyhole size={17}/>:String(idx+1).padStart(2,'0')}</strong><small>{finished ? 'BLOQUEADO' : running ? 'EM PISTA' : 'PLANEADO'}</small></div>
            <select className="formInput planDriver" aria-label={`Piloto do stint ${idx+1}`} value={finished?turns[idx]?.driver||stint.driver:running?turns[idx]?.driver||stint.driver:stint.driver} disabled={finished||running} onChange={event => updateStint(stint.id, { driver: event.target.value })}><option value="">Seleciona</option>{drivers.map(driver => <option key={driver} value={driver}>{driver}</option>)}{stint.driver && !drivers.includes(stint.driver) && <option value={stint.driver}>{stint.driver} (removido)</option>}</select>
            <div className="planMinutes"><input className="formInput" type="number" min="0.01" step="0.01" value={finished?Math.max(0,((turns[idx]?.endedAt??now)-(turns[idx]?.startedAt??now))/60000).toFixed(2):stint.minutes} disabled={finished} aria-label={`Duração em minutos do stint ${idx+1}`} onChange={event => updateStint(stint.id, { minutes: Number(event.target.value) || 0 })}/><small>min</small></div>
            <div className="planTimes"><strong>{raceClock(start)} — {raceClock(start + stint.minutes)}</strong><small>{hasDeviation ? 'Piloto real diferente do plano' : finished ? 'Tempo real imutável' : running ? 'Turno em curso' : 'Tempo estimado de prova'}</small>{idx<plan.length-1&&<label className="pitPlanInput">BOX PREVISTA <PitTimeInput label={`Tempo previsto do pit após stint ${idx+1}`} minimum={rules.minPitSeconds??0} seconds={finished&&pitVisits[idx]?.exitedAt!==undefined?(pitVisits[idx].exitedAt!-pitVisits[idx].enteredAt)/1000:stint.pitSeconds??rules.minPitSeconds} disabled={finished} onCommit={value=>updateStint(stint.id,{pitSeconds:value})}/></label>}</div>
            <div className="planRowTools"><button onClick={() => moveStint(idx, -1)} disabled={idx === 0 || finished || running || locked(idx-1)} title="Mover para cima" aria-label={`Subir stint ${idx + 1}`}><ArrowUp size={15}/></button><button onClick={() => moveStint(idx, 1)} disabled={idx === plan.length-1 || finished || running || locked(idx+1)||runningIndex===idx+1} title="Mover para baixo" aria-label={`Descer stint ${idx+1}`}><ArrowDown size={15}/></button><button disabled={finished||running} onClick={() => updatePlan({ ...editing, plan: plan.filter(s => s.id !== stint.id) })} title="Remover stint" aria-label={`Remover stint ${idx+1}`}><Minus size={15}/></button></div>
          </div>
        })}</div>
      </> : <div className="emptyPlanner"><RotateCcw size={33}/><strong>Estratégia ainda por criar</strong><p>Define as regras e escolhe «Gerar plano equilibrado» ou adiciona stints manualmente.</p></div>}
      {plan.length > 0 && <div className={`strategyValidation ${good ? 'good' : 'needsWork'}`}><div className="validationTitle">{good ? <CheckCircle2 size={20}/> : <AlertTriangle size={20}/>}<strong>{good ? 'Plano compatível com as regras configuradas' : 'Pontos a verificar'}</strong></div>{errors.length ? <ul>{errors.map((message, i) => <li key={i}>{message}</li>)}</ul> : <p>{good ? 'Verificações concluídas. Confirma também as regras não configuradas e quaisquer exceções do regulamento.' : 'Preenche as regras principais para validar o plano.'}</p>}{rules.minPitSeconds === null && <p>O tempo de boxes ainda não foi introduzido. O plano não inclui essas paragens no orçamento temporal.</p>}</div>}
    </section>

    <section className="card pitHistoryPanel"><div className="cardHeading"><div><div className="overline">HISTÓRICO AUTOMÁTICO / MANUAL</div><h2><Timer size={20}/> Tempos de pit</h2><p>Entrada, saída e duração exata de cada paragem · minutos:segundos:milésimos.</p></div><span className="sectionTag">{pitVisits.length} REGISTOS</span></div>
      {pitVisits.length ? <div className="pitHistoryList">{pitVisits.map((pit,index)=><div className="pitHistoryItem" key={pit.id}><strong>Box #{index+1} · {pit.source==='live'?'Live Timing':'Manual'}</strong><span>Entrada: {new Date(pit.enteredAt).toLocaleTimeString('pt-PT')} · Saída: {pit.exitedAt?new Date(pit.exitedAt).toLocaleTimeString('pt-PT'):'a decorrer'}</span><b>{formatPitDurationMs(pit.exitedAt!==undefined?pit.exitedAt-pit.enteredAt:now-pit.enteredAt)}</b><small className="pitHistoryState">{pit.exitedAt!==undefined?'PIT CONCLUÍDO':'EM BOX · TEMPO A DECORRER'}</small></div>)}</div> : <p className="hint">Ainda não há paragens registadas.</p>}
    </section>
    <div className="strategyBottomBar"><div><span>PRÓXIMO TURNO</span><strong>{nextPlanned ? `${nextPlanned.driver} · ${minutesText(nextPlanned.minutes)}` : 'Sem stint planeado'}</strong><small>{active ? 'A troca ficará registada no painel de corrida' : 'O início do turno será registado manualmente'}</small></div><button className="solidBtn" disabled={!nextPlanned?.driver} onClick={() => nextPlanned && onSelectNext(nextPlanned.driver)}><Flag size={17}/> {active ? 'Preparar troca' : 'Iniciar piloto planeado'} <ArrowRight size={17}/></button></div>
    <div className="strategyDisclaimer"><ShieldCheck size={16}/> Planeamento local, não integrado nas regras oficiais do Apex. O gerador distribui o tempo equilibradamente; não antecipa incidentes, penalizações, mudanças de kart ou tempos de paragem superiores ao mínimo.</div>
  </div>
}
