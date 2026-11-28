/** Pitmaster Copilot — auditable deterministic race assistance.
 * No AI services, track GPS, or future race outcomes are claimed.
 * Inputs must come from the selected race only. Recommendations never mutate state.
 */
import type { Projection } from './projection.ts'
import type { PaceSummary } from './pace.ts'
import type { RaceRules, ActualTurn } from './strategy.ts'
import { formatPitDurationMs } from './pitTime.ts'

export type CopilotMode = 'live' | 'sim' | 'demo' | 'import' | 'empty'
export type CopilotSeverity = 'normal' | 'info' | 'attention' | 'critical'
export type CopilotActionKind = 'confirm' | 'pit' | 'driver' | 'plan' | 'timing' | 'details' | 'monitor'
export type CopilotAction = {
  kind: CopilotActionKind
  severity: CopilotSeverity
  title: string
  description: string
  button: string
}
export type CopilotWindow = {
  laps: number
  delayMs: number
  stintAtPitMs: number
  marginToMaxMs: number | null
  status: 'possible' | 'tight' | 'too-early' | 'late' | 'unknown'
  reason: string
  relativeToFieldSeconds: number | null
}
export type CopilotDriver = {
  name: string
  origin: 'planeado' | 'sugerido' | 'indisponível'
  note: string
}
export type CopilotInput = {
  mode: CopilotMode
  timingFresh: boolean
  liveAgeMs: number | null
  hasKart: boolean
  phase: string
  rules: RaceRules
  activeDriver: string | null
  elapsedMs: number | null
  lapMs: number | null
  raceRemainingMs: number | null
  completedPits: number
  pitActive: boolean
  pitElapsedMs: number | null
  waitingForDriver: boolean
  driverNames: string[]
  turns: ActualTurn[]
  plannedNextDriver: string | null
  now: number
  penalties: number
  warnings: number
  pace: PaceSummary | null
  projection: Projection | null
  selectedKart: string
  rivalBattles?: {side:'ahead'|'behind'; name:string; kart:string; position:number; gap:string; remainingPits:number; paceDifferenceMs:number|null}[]
  lapConfidence?:'high'|'low'|'none'
}
export type CopilotAnalysis = {
  action: CopilotAction
  windows: CopilotWindow[]
  nextDriver: CopilotDriver
  remainingMandatoryPits: number | null
  reliability: 'simulada' | 'limitada' | 'moderada' | 'indisponível'
  reliabilityDetail: string
  notes: { tone: CopilotSeverity; text: string }[]
  projectionText: string | null
  paceText: string | null
  rivalInsights: string[]
}
const valid = (n: number | null): n is number => n !== null && Number.isFinite(n) && n >= 0
const minutes = (m: number) => `${Number(m.toFixed(1)).toLocaleString('pt-PT')} min`
const seconds = (ms: number) => `${(Math.max(0,ms)/1000).toFixed(1).replace('.',',')} s`
const action = (kind:CopilotActionKind,severity:CopilotSeverity,title:string,description:string,button:string):CopilotAction => ({kind,severity,title,description,button})

/** A driver recommendation never assumes a competitor is physically ready to enter. */
export function chooseCopilotDriver(input: Pick<CopilotInput,'driverNames'|'plannedNextDriver'|'activeDriver'|'turns'|'rules'|'now'>):CopilotDriver {
  const names=[...new Set(input.driverNames.map(s=>s.trim()).filter(Boolean))]
  const totals=new Map<string,{minutes:number;stints:number}>()
  for(const name of names) totals.set(name,{minutes:0,stints:0})
  for(const turn of input.turns){
    const item=totals.get(turn.driver)
    if(!item)continue
    item.stints++
    item.minutes+=Math.max(0,((turn.endedAt??input.now)-turn.startedAt)/60000)
  }
  const max=input.rules.maxDriverMinutes
  const validCandidate=(name:string)=>names.includes(name) && name!==input.activeDriver &&
    (max===null || (totals.get(name)?.minutes??0)+Math.max(input.rules.minStintMinutes??0,0)<=max+0.001)
  if(input.plannedNextDriver && validCandidate(input.plannedNextDriver))
    return {name:input.plannedNextDriver,origin:'planeado',note:'Do plano ativo · confirmar disponibilidade do piloto'}
  const eligible=names.filter(validCandidate)
  if(!eligible.length)return {name:'Por definir',origin:'indisponível',note:'Nenhum piloto alternativo elegível nos dados configurados; verifica as regras'}
  const minimum=input.rules.minDriverStints
  eligible.sort((a,b)=>{
    const A=totals.get(a)!, B=totals.get(b)!
    const shortageA=minimum===null?0:Math.max(0,minimum-A.stints)
    const shortageB=minimum===null?0:Math.max(0,minimum-B.stints)
    return shortageB-shortageA || A.minutes-B.minutes || A.stints-B.stints || a.localeCompare(b)
  })
  return {name:eligible[0],origin:'sugerido',note:input.plannedNextDriver && !validCandidate(input.plannedNextDriver)
    ? 'Piloto planeado não elegível; alternativa baseada nos tempos registados'
    : 'Alternativa baseada na utilização registada; confirmar disponibilidade'}
}

/** Examine possible pit windows without inferring traffic, grip or an unverified timing rule. */
export function evaluatePitWindows(elapsedMs:number|null, lapMs:number|null, rules:Pick<CopilotInput,'rules'>['rules'], paceDeltaMs:number|null):CopilotWindow[] {
  if(!valid(elapsedMs)||!valid(lapMs)||lapMs<20_000 || lapMs>240_000)return []
  return [0,1,2,4].map(laps=>{
    const delayMs=Math.round(lapMs*laps)
    const target=elapsedMs+delayMs
    const min=rules.minStintMinutes === null?null:rules.minStintMinutes*60000
    const max=rules.maxStintMinutes === null?null:rules.maxStintMinutes*60000
    const marginToMaxMs=max===null?null:max-target
    let status:CopilotWindow['status']='unknown',reason='Limites de stint não configurados; não é possível validar.'
    if(min!==null && max!==null && min>max){status='unknown';reason='Regulamento inconsistente: o stint mínimo ultrapassa o máximo.'}
    else if(min!==null && target<min-100){status='too-early';reason=`Abaixo do mínimo de ${minutes(rules.minStintMinutes!)}.`}
    else if(max!==null && target>max+100){status='late';reason=`Excede o máximo de ${minutes(rules.maxStintMinutes!)}.`}
    else if(min!==null&&max!==null){
      const safetyBuffer=Math.min(lapMs,150_000) // at least ~one lap to account for timing/box-entry uncertainty
      if(marginToMaxMs!==null && marginToMaxMs<safetyBuffer){status='tight';reason='Margem inferior a aproximadamente uma volta. Sem garantia de entrada na box antes do limite.'}
      else {status='possible';reason='Dentro dos limites de stint configurados, com margem estimada.'}
    }
    return {laps,delayMs,stintAtPitMs:target,marginToMaxMs,status,reason,
      relativeToFieldSeconds:paceDeltaMs===null?null:Math.round(-paceDeltaMs*laps/100)/10}
  })
}

export function buildCopilot(input:CopilotInput):CopilotAnalysis {
  const {mode,rules}=input
  const driver=chooseCopilotDriver(input)
  const remainingMandatoryPits=rules.minPitStops===null?null:Math.max(0,rules.minPitStops-input.completedPits)
  const elapsed=valid(input.elapsedMs)?input.elapsedMs:null
  const minMs=rules.minStintMinutes===null?null:rules.minStintMinutes*60000
  const maxMs=rules.maxStintMinutes===null?null:rules.maxStintMinutes*60000
  const left=maxMs===null||elapsed===null?null:maxMs-elapsed
  const lap=valid(input.lapMs)&&input.lapMs>=20_000&&input.lapMs<=240_000?input.lapMs:null
  const active=!!input.activeDriver && elapsed!==null
  const scenarios=!input.pitActive && active && !input.waitingForDriver ? evaluatePitWindows(elapsed,lap,rules,input.pace?.deltaMs??null):[]
  const reliability:CopilotAnalysis['reliability']=mode==='sim'?'simulada':mode==='live' && input.timingFresh && input.hasKart?'moderada':mode==='live'?'limitada':'indisponível'
  const reliabilityDetail= mode==='sim'?'Os números vêm do simulador e não representam uma corrida real.' :
    mode!=='live'?'Sem cronometragem ao vivo; apenas regras e registos locais podem orientar as decisões.' :
    !input.timingFresh?'O Live Timing não tem dados recentes. Evita decisões baseadas em diferenças de ritmo.' :
    !input.hasKart?'O kart da equipa não foi identificado no Live Timing.' :
    'Live Timing recente; previsões dependem de amostras e pressupostos. Não há GPS nem previsão validada de tráfego.'
  const notes:CopilotAnalysis['notes']=[]
  if(input.lapConfidence==='low' && lap!==null)notes.push({tone:'info',text:'Janela de pit estimada com poucas voltas válidas; confirma o ritmo antes de agir.'})
  if(input.lapConfidence==='none')notes.push({tone:'info',text:'Sem voltas válidas para calcular janelas em voltas; usa o cronómetro.'})
  if(remainingMandatoryPits===null)notes.push({tone:'attention',text:'Número obrigatório de pits por configurar.'})
  else notes.push({tone:'info',text:`Pits obrigatórios por realizar: ${remainingMandatoryPits}.`})
  if(!valid(input.raceRemainingMs)) notes.push({tone:'info',text:'Tempo restante da corrida não confirmado; não avaliamos a viabilidade global do plano.'})
  else if(remainingMandatoryPits!==null && valid(rules.minPitSeconds)){
    const mandatoryPitMs=remainingMandatoryPits*rules.minPitSeconds!*1000
    if(remainingMandatoryPits>0 && input.raceRemainingMs!<mandatoryPitMs+60_000)
      notes.push({tone:'critical',text:'Pouco tempo restante para cumprir os pits mínimos, mesmo sem contar voltas ou outras restrições.'})
  }
  if(input.penalties>0)notes.push({tone:'attention',text:`Existem ${input.penalties} penalização(ões) comunicadas à nossa equipa. Verificar Race Control; não inferimos se estão cumpridas.`})
  else if(input.warnings>0)notes.push({tone:'info',text:`Existem ${input.warnings} warning(s) no feed. Consulta o histórico.`})
  if(driver.origin==='indisponível')notes.push({tone:'attention',text:'Não há próximo piloto elegível identificado.'})
  if(!input.pitActive && active && left!==null && lap!==null){
    if(left<lap*2 && left>0)notes.push({tone:'attention',text:'A margem de stint já é inferior a duas voltas estimadas. Considera o ponto exato de entrada previsto no regulamento.'})
  }
  const projectionRow=input.projection?.rows.find(r=>r.kart===input.selectedKart)
  const canUseTiming=reliability==='moderada'||reliability==='simulada'
  const projectionText=!canUseTiming||!projectionRow?null:
    `P${projectionRow.predictedPosition} projetado (confiança ${input.projection?.confidence ?? 'baixa'}). Cálculo de ritmo constante e pits; não é classificação oficial.`
  const rivalInsights:string[]=[]
  if(canUseTiming && input.projection?.rows.length && input.rivalBattles?.length){
    for(const opponent of input.rivalBattles){
      const paceText=opponent.paceDifferenceMs===null?'Ritmo relativo sem amostras atuais suficientes':
        `rival ${opponent.paceDifferenceMs>150?'mais lento':opponent.paceDifferenceMs < -150?'mais rápido':'com ritmo semelhante'} (${seconds(Math.abs(opponent.paceDifferenceMs))}/volta)`
      rivalInsights.push(`${opponent.side==='ahead'?'À frente':'Atrás'} na projeção: P${opponent.position} · ${opponent.name} · Kart #${opponent.kart}, diferença ${opponent.gap}, ${opponent.remainingPits} pits por realizar; ${paceText}. Estimativa, não posição física.`)
    }
  }
  if(input.pace?.ownChangeMs!=null && input.pace?.fieldChangeMs!=null && canUseTiming){
    const ownChange=input.pace.ownChangeMs, fieldChange=input.pace.fieldChangeMs
    if(ownChange>350 && fieldChange>350)notes.push({tone:'info',text:'Ritmo geral mais lento: o pelotão também perdeu tempo. Pode ser efeito de tráfego ou pista; causa não confirmada.'})
    else if(ownChange-fieldChange>350)notes.push({tone:'attention',text:'A nossa equipa está a perder ritmo relativo face ao pelotão. Verificar tráfego, piloto e condições antes de alterar a estratégia.'})
    else if(fieldChange-ownChange>350)notes.push({tone:'info',text:'Estamos a melhorar o ritmo relativo ao pelotão. É tendência, não garantia de ganhar posições.'})
  }
  const paceText=input.pace && canUseTiming
    ? `Ritmo recente ${input.pace.deltaMs<0?'melhor':'mais lento'} que o pelotão em ${seconds(Math.abs(input.pace.deltaMs))}/volta (medianas, ${input.pace.sampleOwn} voltas nossas e ${input.pace.sampleKarts} adversários).`
    : null

  let next:CopilotAction
  if(input.waitingForDriver) next=action('confirm','attention','Confirmar piloto após o pit','O pit já foi registado; falta confirmar quem entrou.','CONFIRMAR PILOTO')
  else if(input.pitActive){
    const minPit=rules.minPitSeconds===null?null:rules.minPitSeconds*1000
    const pitElapsed=input.pitElapsedMs??0
    if(minPit===null)next=action('pit','attention','Pit em curso · mínimo por confirmar','Não há tempo mínimo de pit configurado. Confirma o regulamento.','VER PIT')
    else if(pitElapsed<minPit)next=action('pit','attention','Pit em curso · aguardar mínimo',`Faltam ${formatPitDurationMs(minPit-pitElapsed)} para o tempo mínimo configurado.`, 'VER PIT')
    else next=action('pit','normal','Tempo mínimo de pit cumprido','A saída real depende da equipa e do regulamento; não será registada automaticamente sem evento.', 'VER PIT')
  }
  else if(mode==='live' && !input.timingFresh)next=action('timing','attention','Verificar ligação Live Timing','Sem dados recentes para recomendações de ritmo e posições. Os cronómetros locais continuam.', 'VER LIGAÇÃO')
  else if(mode==='live' && !input.hasKart)next=action('timing','attention','Selecionar kart da equipa','O kart acompanhado não está no feed recebido. Verifica a prova e a fonte de cronometragem.','CONFIGURAR')
  else if(active && left!==null && left<=0)next=action('details','critical','Limite máximo de stint atingido','Contacta o piloto e confirma a entrada na box. O Copilot não executa pits automaticamente.', 'VER OPÇÕES')
  else if(active && left!==null && lap!==null && left<=lap)next=action('details','critical','Box urgente · menos de uma volta','Margem estimada para o limite de stint inferior a uma volta. Confirma o ponto de pit.', 'VER OPÇÕES')
  else if(active && left!==null && lap!==null && left<=4*lap)next=action('details','attention','Preparar próxima paragem',`Faltam ~${Math.ceil(left/lap)} voltas até ao máximo regulamentar. Próximo piloto: ${driver.name}.`, 'SIMULAR JANELAS')
  else if(active && left!==null && lap===null && left<=5*60000)next=action('details','attention','Aproximação ao limite de stint','Sem ritmo recente para estimar voltas; verifica a hora de entrada na box.', 'VER OPÇÕES')
  else if(active && remainingMandatoryPits!==null && remainingMandatoryPits>0 && valid(rules.minPitSeconds) && valid(input.raceRemainingMs) && input.raceRemainingMs <= remainingMandatoryPits*rules.minPitSeconds!*1000+(lap??60_000))next=action('plan','attention','Rever pits obrigatórios com urgência','O tempo publicado para a corrida está próximo do tempo mínimo total das paragens em falta. Confirma o plano e o regulamento.','ABRIR ESTRATÉGIA')
  else if(active && input.raceRemainingMs===0 && (mode==='live'||mode==='sim'))next=action('details','info','Tempo de corrida esgotado','Aguardar a passagem final do nosso kart. A chegada não é confirmada apenas pelo relógio.', 'VER ANÁLISE')
  else if(!active && mode!=='sim')next=action('driver','info','Identificar piloto em pista','Nenhum stint ativo nos registos locais. Confirma o piloto atual.', 'INICIAR STINT')
  else if(active && (minMs===null||maxMs===null))next=action('plan','attention','Confirmar limites de stint','Sem limites mínimo e máximo não é possível avaliar janelas seguras.', 'CONFIGURAR REGRAS')
  else if(active && driver.origin==='indisponível')next=action('plan','attention','Definir o próximo piloto','Não existe piloto alternativo elegível nos dados configurados.', 'ABRIR ESTRATÉGIA')
  else if(active)next=action('details','normal','Corrida sob controlo',`Piloto ${input.activeDriver} · seguinte: ${driver.name}. Consulta janelas quando for necessário.`, 'VER ANÁLISE')
  else next=action('timing','info','Preparar a corrida','Escolhe a prova e liga o Live Timing ou inicia o simulador.', 'CONFIGURAR')

  // Do not mistake a sprint qualifying session for an endurance; no pit strategy is inferred.
  if(input.phase!=='race' && input.phase!=='preparation' && mode!=='sim'){
    next=action('timing','info','Fase sem estratégia de pits','O Copilot de endurance fica disponível durante a fase Corrida.', 'VER PROVA')
  }
  return {action:next,windows:scenarios,nextDriver:driver,remainingMandatoryPits,reliability,reliabilityDetail,notes,projectionText,paceText,rivalInsights}
}

/** A single proposed target is saved only in the PLANNED future, never in actual turns.
 * The next planned stint is shortened/extended equally to keep the total budget unchanged.
 */
export function proposePitWindowChange(input:{
  rules: RaceRules; plan:{id:string;driver:string;minutes:number;pitSeconds?:number|null}[]
  completedTurns:number; activeDriver:string|null; elapsedMs:number|null; window:CopilotWindow
}):{plan:typeof input.plan|null;reason:string} {
  const {rules,plan,completedTurns,activeDriver,elapsedMs,window}=input
  if(!activeDriver||elapsedMs===null||!Number.isFinite(elapsedMs))return {plan:null,reason:'Não há stint real em curso.'}
  if(window.status!=='possible')return {plan:null,reason:window.reason}
  const current=plan[completedTurns],following=plan[completedTurns+1]
  if(!current||current.driver!==activeDriver)return {plan:null,reason:'Alinha o plano ativo com o piloto atual na Estratégia antes de aplicar.'}
  if(!following)return {plan:null,reason:'É necessário existir um stint futuro para preservar a duração do plano.'}
  const target=window.stintAtPitMs/60000
  const delta=target-current.minutes
  const newFollowing=following.minutes-delta
  const min=rules.minStintMinutes,max=rules.maxStintMinutes
  if((min!==null && newFollowing<min-0.0001)||(max!==null&&newFollowing>max+0.0001)||newFollowing<=0)
    return {plan:null,reason:'A alteração tornaria o stint seguinte incompatível com os limites. Ajusta manualmente o plano completo.'}
  const result=plan.map((s,i)=>i===completedTurns?{...s,minutes:target}:i===completedTurns+1?{...s,minutes:newFollowing}:s)
  return {plan:result,reason:'Ajusta apenas o stint atual e o seguinte; os stints concluídos ficam intactos. Confirmar antes de guardar.'}
}
