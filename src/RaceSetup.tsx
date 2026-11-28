import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, Check, CheckCircle2, Circle, ClipboardList, Copy, FileJson2, Flag, Gauge, Link2, Plus, Radio, Search, Trash2, Upload, Clock3, ShieldCheck, SlidersHorizontal, Info, X } from 'lucide-react'
import type { RaceCollection, RaceProfile } from './races'
import type { RaceRules } from './strategy'
import { formatPitDurationSeconds, parsePitDurationSeconds } from './pitTime'
import { PROVIDERS, type TimingProvider } from './timing/types'

type Step = 'identity' | 'rules' | 'team' | 'timing' | 'review'
type Props = {
  collection: RaceCollection; active: RaceProfile
  drivers: string[]; planCount: number; timingConnected: boolean
  rules: RaceRules; onRulesChange: (rules:RaceRules)=>void
  onAddDriver:(name:string)=>void; onRemoveDriver:(name:string)=>void
  onUpdate: (r: RaceProfile) => void; onCreate: () => void; onDuplicate: () => void
  onSelect: (id: string) => void; onRemove: (id: string) => void
  onViewRace: () => void; onViewStrategy: () => void; onViewQualifying: () => void; phaseLabel: string
  onImport: (file: File) => void; importMessage: string
  onPalmelaSprintPreset:()=>void; qualifyingMinutes?:number|null
}
const statusText = {preparation:'Em preparação',live:'Em curso',finished:'Terminada'}
const steps: {id:Step;label:string;description:string}[] = [
  {id:'identity',label:'Prova',description:'Nome, pista e kart'},
  {id:'rules',label:'Regulamento',description:'Duração e limites'},
  {id:'team',label:'Pilotos',description:'Quem vai conduzir'},
  {id:'timing',label:'Live Timing',description:'Fonte dos dados'},
  {id:'review',label:'Revisão',description:'Tudo pronto?'}
]
const isPlaceholder = (s:string)=>/^Piloto\s+\d+$/i.test(s)
const validPositive = (n:number|null)=>n!==null&&Number.isFinite(n)&&n>0

export function RaceSetup({collection, active, drivers, planCount, timingConnected,rules,onRulesChange,onAddDriver,onRemoveDriver,onUpdate,onCreate,onDuplicate,onSelect,onRemove,onViewRace,onViewStrategy,onViewQualifying,phaseLabel,onImport,importMessage,onPalmelaSprintPreset,qualifyingMinutes}: Props) {
  const [query,setQuery] = useState('')
  const [filter,setFilter] = useState<'all'|'preparation'|'live'|'finished'>('all')
  const [step,setStep] = useState<Step>('identity')
  const [advanced,setAdvanced] = useState(false)
  const [driverName,setDriverName] = useState('')
  const [driverError,setDriverError] = useState('')
  const [pitDraft,setPitDraft] = useState(()=>rules.minPitSeconds===null?'':formatPitDurationSeconds(rules.minPitSeconds))
  const [pitError,setPitError] = useState('')
  const set = (change: Partial<RaceProfile>) => onUpdate({...active,...change})
  const setRule = (key:keyof RaceRules, raw:string) => {
    const value=raw.trim()===''?null:Number(raw)
    onRulesChange({...rules,[key]:value!==null&&Number.isFinite(value)&&value>=0?value:null})
  }
  useEffect(()=>{setStep('identity');setAdvanced(false);setDriverName('');setDriverError('');setPitError('')},[active.id])
  useEffect(()=>{setPitDraft(rules.minPitSeconds===null?'':formatPitDurationSeconds(rules.minPitSeconds))},[rules.minPitSeconds])
  const filtered = useMemo(()=>collection.races.filter(r=>(filter==='all'||(r.status||'preparation')===filter)&&`${r.name} ${r.track} ${r.date}`.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>(b.date||'').localeCompare(a.date||'') || b.createdAt-a.createdAt),[collection.races,query,filter])
  const realDrivers=drivers.filter(d=>d.trim()&&!isPlaceholder(d))
  const identityReady=active.name.trim()!==''&&active.name!=='Nova prova'&&!!active.track.trim()&&!!active.kart.trim()
  const ruleErrors:string[]=[]
  if(rules.minStintMinutes!==null&&rules.maxStintMinutes!==null&&rules.minStintMinutes>rules.maxStintMinutes) ruleErrors.push('O stint mínimo não pode superar o máximo.')
  if(rules.raceMinutes!==null&&!validPositive(rules.raceMinutes))ruleErrors.push('A duração da corrida tem de ser superior a zero.')
  if(rules.minStintMinutes!==null&&!validPositive(rules.minStintMinutes))ruleErrors.push('O stint mínimo tem de ser superior a zero.')
  if(rules.maxStintMinutes!==null&&!validPositive(rules.maxStintMinutes))ruleErrors.push('O stint máximo tem de ser superior a zero.')
  const essentialRulesReady=validPositive(rules.raceMinutes)&&validPositive(rules.minStintMinutes)&&validPositive(rules.maxStintMinutes)&&rules.minPitStops!==null&&rules.minPitStops>=0&&rules.minPitSeconds!==null&&rules.minPitSeconds>=0&&ruleErrors.length===0
  const checks=[
    {title:'Prova e kart identificados',done:identityReady,step:'identity' as Step},
    {title:'Regulamento essencial preenchido',done:essentialRulesReady,step:'rules' as Step},
    {title:'Pilotos identificados',done:realDrivers.length>0,step:'team' as Step},
    {title:'Estratégia preparada',done:planCount>0,step:'review' as Step},
    {title:'Cronometragem ligada',done:timingConnected,step:'timing' as Step},
  ]
  const passed=checks.filter(c=>c.done).length
  const stepIndex=steps.findIndex(s=>s.id===step)
  function addDriver(){
    const name=driverName.trim().replace(/\s+/g,' ')
    if(!name){setDriverError('Escreve o nome do piloto.');return}
    if(drivers.some(d=>d.toLocaleLowerCase('pt-PT')===name.toLocaleLowerCase('pt-PT'))){setDriverError('Este piloto já está inscrito.');return}
    onAddDriver(name);setDriverName('');setDriverError('')
  }
  function commitPit(){
    const parsed=parsePitDurationSeconds(pitDraft)
    if(parsed!==null&&!Number.isFinite(parsed)){setPitError('Usa minutos:segundos:milésimos, por exemplo 3:01:104.');return false}
    onRulesChange({...rules,minPitSeconds:parsed})
    setPitDraft(parsed===null?'':formatPitDurationSeconds(parsed));setPitError('')
    return true
  }
  const numeric = (key:keyof RaceRules, title:string,description:string,unit:string,placeholder:string,required=false) => <label className="wizardField" key={key}>
    <span className="wizardFieldTitle">{title}{required&&<b aria-label="obrigatório"> *</b>}</span>
    <span className="wizardFieldHelp">{description}</span>
    <span className="wizardInputGroup"><input type="number" min="0" step={key==='minTeamStints'||key==='minDriverStints'||key==='minPitStops'?'1':'any'} inputMode="decimal" value={rules[key]??''} placeholder={placeholder} onChange={e=>setRule(key,e.target.value)}/><em>{unit}</em></span>
  </label>
  const source=PROVIDERS[active.provider]
  return <div className="racesHub raceWizardPage">
    <div className="raceHubIntro"><div><div className="overline">PITMASTER / RACE HUB</div><h1>As tuas provas</h1><p>Configura uma corrida passo a passo. Os dados são guardados automaticamente.</p></div><button className="solidBtn" onClick={onCreate}><Plus size={18}/> Nova prova</button></div>
    <div className="raceHubGrid">
      <aside className="card raceHubLibrary" aria-label="Biblioteca de provas">
        <div className="raceHubSectionTitle"><h2><Flag size={19}/> Provas guardadas</h2><span className="sectionTag">{collection.races.length}</span></div>
        <div className="raceHubFilters">{([['all','Todas'],['preparation','A preparar'],['live','Em curso'],['finished','Terminadas']] as const).map(([id,label])=><button type="button" key={id} className={filter===id?'selected':''} onClick={()=>setFilter(id)}>{label}</button>)}</div>
        <label className="raceHubSearch"><Search size={17}/><input placeholder="Pesquisar provas ou pistas…" value={query} onChange={e=>setQuery(e.target.value)} aria-label="Pesquisar provas"/></label>
        <div className="raceHubList">{filtered.map(r=><button type="button" key={r.id} className={`raceHubListItem ${r.id===active.id?'isSelected':''}`} onClick={()=>onSelect(r.id)}><span className="raceHubItemTop"><strong>{r.name}</strong>{r.id===active.id&&<CheckCircle2 size={16}/>}</span><span className="raceHubSub">{r.track||'Pista por definir'} · {r.date||'Sem data'}</span><span className={`raceHubStatus status-${r.status||'preparation'}`}>{statusText[r.status||'preparation']}</span></button>)}{!filtered.length&&<p className="hint">Nenhuma prova corresponde à pesquisa.</p>}</div>
        <button className="quietBtn full" type="button" onClick={onDuplicate}><Copy size={15}/> Duplicar configuração</button>
        {collection.races.length>1&&<button className="textButton dangerText" onClick={()=>onRemove(active.id)}><Trash2 size={15}/> Apagar prova selecionada</button>}
      </aside>
      <div className="raceHubMain">
        <section className="card sprintPresetCard" aria-label="Preparação rápida de prova curta"><div><span className="overline">PREPARAÇÃO RÁPIDA</span><h2>10 min de qualificação + 30 min de corrida</h2><p>Preenche Palmela, a data e as durações. Os pits e limites de stint ficam por confirmar no regulamento.</p></div><button type="button" className="solidBtn" onClick={()=>{onPalmelaSprintPreset();setStep('identity')}}><Flag size={17}/> Usar formato 10 + 30</button></section>
        <section className="card wizardHeadline"><div className="wizardHeadlineText"><span className="overline"><span className="limeDot"/> PROVA SELECIONADA</span><h2>{active.name}</h2><p>{active.track||'Kartódromo por definir'} · Kart #{active.kart||'—'} · {phaseLabel}</p></div><div className="wizardProgressSummary"><strong>{passed}/{checks.length}</strong><span>itens preparados</span></div></section>
        <section className="card wizardShell" aria-label="Assistente de configuração da prova">
          <div className="wizardHeader"><div><span className="overline">CONFIGURAÇÃO GUIADA</span><h2>Prepara a corrida</h2><p>Começa pelo essencial. As opções técnicas ficam disponíveis quando precisares.</p></div><span className="wizardSaved"><Check size={14}/> Guardado automaticamente</span></div>
          <div className="wizardSteps" role="tablist" aria-label="Etapas de preparação">{steps.map((s,i)=><button type="button" role="tab" aria-selected={step===s.id} aria-controls="wizardContent" key={s.id} onClick={()=>setStep(s.id)} className={`wizardStep ${step===s.id?'active':''} ${i<stepIndex?'visited':''}`}><span className="wizardStepNumber">{i+1}</span><span className="wizardStepLabel">{s.label}</span></button>)}</div>
          <div id="wizardContent" className="wizardContent" role="tabpanel" key={step}>
            <div className="wizardSectionIntro"><span className="wizardStepCaption">PASSO {stepIndex+1} DE {steps.length}</span><h3>{steps[stepIndex].label}</h3><p>{steps[stepIndex].description}</p></div>
            {step==='identity'&&<div className="wizardFields">
              <label className="wizardField"><span className="wizardFieldTitle">Nome da prova *</span><span className="wizardFieldHelp">Como queres identificar esta corrida?</span><input className="formInput" value={active.name} maxLength={90} onChange={e=>set({name:e.target.value})} placeholder="7H XMAS RACE"/></label>
              <label className="wizardField"><span className="wizardFieldTitle">Kartódromo *</span><span className="wizardFieldHelp">Pista onde decorre a prova.</span><input className="formInput" value={active.track} maxLength={90} onChange={e=>set({track:e.target.value})} placeholder="KIP Palmela"/></label>
              <div className="wizardTwo"><label className="wizardField"><span className="wizardFieldTitle"><CalendarDays size={15}/> Data</span><span className="wizardFieldHelp">Opcional.</span><input className="formInput" type="date" value={active.date} onChange={e=>set({date:e.target.value})}/></label><label className="wizardField"><span className="wizardFieldTitle">O nosso kart *</span><span className="wizardFieldHelp">Pode ser alterado se houver troca.</span><input className="formInput" value={active.kart} maxLength={12} onChange={e=>set({kart:e.target.value})} placeholder="7"/></label></div>
              <label className="wizardField"><span className="wizardFieldTitle">Estado da prova</span><span className="wizardFieldHelp">Controla se a corrida está em preparação, em curso ou terminada.</span><select className="formInput" value={active.status||'preparation'} onChange={e=>set({status:e.target.value as RaceProfile['status']})}><option value="preparation">Em preparação</option><option value="live">Em curso</option><option value="finished">Terminada</option></select></label>
            </div>}
            {step==='rules'&&<div className="wizardRules">
              <div className="wizardInfo"><ShieldCheck size={19}/><p><strong>Introduz as regras do regulamento oficial.</strong> Não são aplicados valores fictícios ou regras automáticas à tua prova.</p></div>
              <div className="wizardInfo"><Clock3 size={19}/><p>Qualificação prevista: <strong>{qualifyingMinutes??'a definir'} min</strong>. A sua duração pode ser alterada no separador Qualificação. Os valores da corrida são independentes.</p></div>
              <div className="wizardRuleGroup"><h4><Clock3 size={17}/> Duração e stints</h4><div className="wizardTwo">{numeric('raceMinutes','Duração da corrida','Duração total prevista.','min','420',true)}{numeric('minPitStops','Pits obrigatórios','Paragens regulamentares da equipa.','pits','7',true)}{numeric('minStintMinutes','Stint mínimo','Tempo mínimo de cada piloto em pista.','min','20',true)}{numeric('maxStintMinutes','Stint máximo','Limite regulamentar de condução.','min','45',true)}</div></div>
              <div className="wizardRuleGroup"><h4><Clock3 size={17}/> Tempo mínimo nas boxes</h4><label className="wizardField"><span className="wizardFieldTitle">Tempo de pit *</span><span className="wizardFieldHelp">Formato minutos:segundos:milésimos. Exemplo: 3:01:104.</span><span className="wizardInputGroup"><input value={pitDraft} inputMode="text" placeholder="3:01:104" aria-label="Tempo mínimo de pit" aria-invalid={!!pitError} onChange={e=>{setPitDraft(e.target.value);setPitError('')}} onBlur={commitPit} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur()}}/><em>m:ss:SSS</em></span>{pitError&&<span className="wizardError" role="alert">{pitError}</span>}</label></div>
              {ruleErrors.length>0&&<div className="wizardErrors" role="alert">{ruleErrors.map((e,i)=><p key={i}>{e}</p>)}</div>}
              <button className="wizardAdvancedToggle" type="button" aria-expanded={advanced} onClick={()=>setAdvanced(v=>!v)}><SlidersHorizontal size={17}/>{advanced?'Ocultar regras avançadas':'Ver regras avançadas'}<span>Opcional</span></button>
              {advanced&&<div className="wizardRuleGroup wizardAdvanced"><h4>Limites adicionais</h4><div className="wizardTwo">{numeric('minTeamStints','Stints mínimos da equipa','Número mínimo de turnos.','stints','8')}{numeric('minDriverStints','Stints por piloto','Mínimo por piloto.','stints','2')}{numeric('maxDriverMinutes','Máximo total por piloto','Tempo máximo acumulado de condução.','min','180')}</div><p className="wizardMuted">As janelas de pit e outras regras específicas devem ser confirmadas no regulamento. A estratégia detalhada continua disponível no separador Estratégia.</p></div>}
            </div>}
            {step==='team'&&<div className="wizardTeam"><p className="wizardMuted">Adiciona os pilotos da equipa. A ordem das trocas será definida depois na Estratégia.</p><form className="wizardAddDriver" onSubmit={e=>{e.preventDefault();addDriver()}}><input className="formInput" value={driverName} placeholder="Nome do piloto" maxLength={70} onChange={e=>{setDriverName(e.target.value);setDriverError('')}} aria-label="Nome do novo piloto"/><button type="submit" className="solidBtn"><Plus size={17}/> Adicionar</button></form>{driverError&&<p role="alert" className="wizardError">{driverError}</p>}<div className="wizardDriverList">{drivers.map((name,i)=><div className={`wizardDriver ${isPlaceholder(name)?'placeholder':''}`} key={`${name}-${i}`}><span className="wizardDriverIndex">{i+1}</span><strong>{name}</strong>{isPlaceholder(name)&&<small>Nome provisório</small>}<button type="button" onClick={()=>onRemoveDriver(name)} aria-label={`Retirar ${name}`} title={`Retirar ${name}`}><X size={17}/></button></div>)}</div>{!drivers.length&&<p className="hint">Adiciona pelo menos um piloto.</p>}</div>}
            {step==='timing'&&<div className="wizardTiming"><p className="wizardMuted">Escolhe como receber as voltas. Podes terminar a preparação sem uma ligação ativa e ligá-la mais tarde.</p><div className="wizardProviderGrid">{Object.values(PROVIDERS).map(p=><button type="button" key={p.id} className={`wizardProvider ${active.provider===p.id?'selected':''}`} aria-pressed={active.provider===p.id} onClick={()=>set({provider:p.id as TimingProvider,sourceUrl:''})}><Radio size={19}/><strong>{p.label}</strong>{active.provider===p.id&&<CheckCircle2 size={17}/>}</button>)}</div><div className="wizardInfo"><Info size={19}/><p><strong>{source.status}</strong> — {source.description}</p></div>{active.provider!=='manual'&&<label className="wizardField"><span className="wizardFieldTitle"><Link2 size={15}/> {active.provider==='apex'?'Endereço WebSocket Apex':'URL do RaceFacer · Experimental'}</span><span className="wizardFieldHelp">Utiliza a ligação correspondente à pista e à sessão atual.</span><input className="formInput" type="url" value={active.sourceUrl} onChange={e=>set({sourceUrl:e.target.value})} placeholder={active.provider==='apex'?'wss://servidor:porta/':'https://live.racefacer.com/...'} autoComplete="off"/></label>}<div className="wizardConnectionStatus"><Radio size={17}/><span>{timingConnected?'A receber dados do Live Timing':'Ainda não existe uma ligação ativa. Podes continuar a preparação.'}</span></div></div>}
            {step==='review'&&<div className="wizardReview"><div className="wizardReviewSummary"><div><span>PROVA</span><strong>{active.name}</strong><small>{active.track||'Sem pista'} · Kart #{active.kart||'—'}</small></div><div><span>REGULAMENTO</span><strong>{rules.raceMinutes??'—'} min · {rules.minPitStops??'—'} pits</strong><small>Stint {rules.minStintMinutes??'—'}–{rules.maxStintMinutes??'—'} min · Box {rules.minPitSeconds===null?'—':formatPitDurationSeconds(rules.minPitSeconds)}</small></div><div><span>EQUIPA</span><strong>{realDrivers.length} pilotos identificados</strong><small>{realDrivers.join(', ')||'Por definir'}</small></div><div><span>FONTE</span><strong>{source.label}</strong><small>{timingConnected?'Online':'Ainda não ligada'}</small></div></div><div className="wizardChecklist"><h4><ClipboardList size={18}/> Preparação</h4>{checks.map(c=><button type="button" className="wizardCheck" onClick={()=>setStep(c.step)} key={c.title}>{c.done?<CheckCircle2 color="#aef47b" size={19}/>:<Circle size={19}/>}<span>{c.title}</span><ArrowRight size={15}/></button>)}</div><div className="wizardReviewActions"><button className="solidBtn" type="button" onClick={onViewRace}><Gauge size={18}/> Abrir corrida <ArrowRight size={17}/></button><button className="quietBtn" onClick={onViewStrategy}><ClipboardList size={17}/> Preparar estratégia</button><button className="quietBtn" onClick={onViewQualifying}><Flag size={17}/> Qualificação</button></div>{passed<checks.length&&<p className="wizardMuted">Podes abrir a corrida com passos pendentes; confirma os limites regulamentares antes de competir.</p>}</div>}
          </div>
          <div className="wizardFooter"><button className="quietBtn" type="button" disabled={stepIndex===0} onClick={()=>setStep(steps[Math.max(0,stepIndex-1)].id)}><ArrowLeft size={16}/> Anterior</button><span>Passo {stepIndex+1} de {steps.length}</span>{stepIndex<steps.length-1?<button className="solidBtn" type="button" onClick={()=>{if(step==='rules'&&!commitPit())return;setStep(steps[stepIndex+1].id)}}>Continuar <ArrowRight size={17}/></button>:<button className="solidBtn" type="button" onClick={onViewRace}><Gauge size={17}/> Abrir corrida</button>}</div>
        </section>
        <details className="raceHubAdvanced card"><summary><FileJson2 size={17}/> Importação de cronometragem <span>Ferramenta avançada</span></summary><div className="raceHubImportContent"><p className="hint">Importa um ficheiro JSON no formato universal Pitmaster. Não interpreta automaticamente qualquer exportação RaceFacer.</p><label className="importDrop"><Upload size={21}/><strong>Escolher ficheiro .json</strong><span>Máximo 5 MB</span><input type="file" accept="application/json,.json" onChange={e=>{const f=e.target.files?.[0];if(f)onImport(f);e.target.value=''}}/></label>{importMessage&&<p className="setupImportResult" role="status">{importMessage}</p>}<p className="hint">A importação não cria passagens de setor ou meta fictícias.</p></div></details>
      </div>
    </div>
  </div>
}
