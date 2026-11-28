import { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Activity, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CalendarDays, Check, ChevronDown, CircleHelp, ClipboardList,
  Expand, Flag, FlagTriangleRight, Focus, Gauge, History,
  Link2, Pause, Play, Radio, Settings2, ShieldAlert, Timer, Unplug,
  X, Zap, Layers3, AlertTriangle, Volume2, VolumeX, BarChart3, PartyPopper, LockKeyhole, SlidersHorizontal
} from 'lucide-react'
import { emptyTiming, passageNeighbors, type TimingState } from './apex'
import { paceSummary, lapPerformance } from './pace'
import { paceInsight } from './pacePresentation'
import { compareRivalPace, rivalPaceText } from './rivalPace'
import { stintSummaries } from './stintAnalysis'
import { reconcileRaceNotices } from './incidentSignals'
import { RankingPanel } from './RankingPanel'
import { pitOverview } from './pit'
import { formatPitDurationMs } from './pitTime'
import { StrategyPanel } from './StrategyPanel'
import { directRivalKarts, noticeTypeLabel, parseRaceControl, type RaceNotice } from './raceControl'
import demoRaceControl from './palmelaRaceControl.json'
import { restoreStrategy, validateStrategy, type PlannedStint } from './strategy'
import palmela from './palmela.json'
import { RaceSetup } from './RaceSetup'
import { RACES_STORE, WORKSPACE_PREFIX, createRace, restoreRaces, updateProfile, type RaceProfile } from './races'
import { restoreWorkspace, newWorkspace } from './raceWorkspace'
import { connectTiming, type TimingConnection } from './timing/connection'
import { importTimingJSON } from './timing/importer'
import { PROVIDERS } from './timing/types'
import { createSimulation, advanceSimulation, setSimulationScenario, triggerSimulationIncident, triggerSimulationPit, simulatedNow, type Simulation, type SimulationScenario, type SimulationSpeed } from './simulator'
import { comparePitWindows } from './oracle'
import { PaceTrendGraph, LapRankTrendGraph, StintPaceGraph, RivalBarGraph, PitDurationGraph, OracleWindowGraph } from './IntelligenceCharts'
import { computeStintHud } from './stintHud'
import { StintHUD } from './PersistentStintBar'
import { buildProjection, neighboringProjected, projectedGap, type ProjectionSettings } from './projection'
import { VirtualRivals } from './VirtualRivals'
import { parseLapTime } from './pace'
import {QualificationPanel} from './QualificationPanel'
import {readPhases,PHASES,type PhaseConfig, type RacePhase} from './racePhases'
import { palmelaSprintRules, palmelaSprintPhases } from './sprintPreset'
import {medianRaceLap,stintAlertStage,stintStagePriority,type StintAlertStage} from './stintAlerts'
import {pitTransition,type PitObservation} from './pitAutomation'
import {shouldCelebrate} from './finishCelebration'
import {resumeAfterSimulation, type SessionOrigin} from './simulatorSession'
import {buildCopilot, type CopilotActionKind} from './copilot'
import {CopilotPanel} from './CopilotPanel'
import {RaceLibrary} from './RaceLibrary'
import {RaceCalendar} from './RaceCalendar'
import {firstRacePage,isRacePage,type AppPage} from './raceNavigation'
import './style.css'
import './visual-system.css'
import './workflow.css'
import './pitmaster-v20.css'

type Turn = { driver: string; startedAt: number; endedAt?: number }
type DriverData = { names: string[]; turns: Turn[]; maxMinutes: number }
type RaceFlash = { id: string; type: 'warning' | 'penalty'; message: string; kart: string; ours: boolean }
const PROJECTION_STORE = 'pitmaster-projection-race-'
const PHASES_STORE='pitmaster-phases-'
const QUAL_SNAPSHOTS_STORE='pitmaster-qual-snapshots-'
const CELEBRATED_STORE='pitmaster-celebrated-'
const PHASES_WITH_TIMING:RacePhase[]=['practice','qualifying','superqualifying']
function savedProjection(raceId:string):ProjectionSettings {
  try {const p=JSON.parse(localStorage.getItem(PROJECTION_STORE+raceId)||'{}');return {remainingMinutes:Number.isFinite(p.remainingMinutes)&&p.remainingMinutes>0?p.remainingMinutes:null,pitLossSeconds:Number.isFinite(p.pitLossSeconds)&&p.pitLossSeconds>0?p.pitLossSeconds:null}}catch{return {remainingMinutes:null,pitLossSeconds:null}}
}
function formatDelta(ms:number|null){return ms===null?'—':`${ms>=0?'+':'−'}${(Math.abs(ms)/1000).toFixed(3)} s`}
const demo: TimingState = {
  ...emptyTiming,
  title: '7H XMAS RACE', session: 'Final', track: 'KIP Palmela',
  racers: palmela.map(p => ({ ...p, sectors: ['', '', ''] as [string, string, string] })),
  passages: [], raceControl: parseRaceControl(demoRaceControl)
}
const DEFAULT_WS = '' // cada pista pode utilizar uma porta/endpoint diferente
function clock(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(seconds / 3600)
  return `${hours ? `${String(hours).padStart(2, '0')}:` : ''}${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}
function value(v?: string | number | null) { return v === null || v === undefined || v === '' ? '—' : String(v) }
function shortTeam(name: string, max = 24) { return name.length > max ? name.slice(0, max - 1) + '…' : name }
function rankText(rank?: number | null) { return rank ? `${rank}º` : '—' }

function App() {
  const [collection, setCollection] = useState(() => {
    try { return restoreRaces(localStorage.getItem(RACES_STORE)) } catch { return restoreRaces(null) }
  })
  const activeRace = collection.races.find(r => r.id === collection.activeId) || collection.races[0]
  const [importMessage, setImportMessage] = useState('')
  const [simulation, setSimulation] = useState<Simulation | null>(null)
  const [mode, setMode] = useState<'demo' | 'live' | 'sim' | 'import' | 'empty'>('empty')
  const [data, setData] = useState<TimingState>(emptyTiming)
  const [connected, setConnected] = useState(false)
  const [connectionError, setConnectionError] = useState('')
  const [url, setUrl] = useState(() => activeRace.sourceUrl || DEFAULT_WS)
  const [selectedKart, setSelectedKart] = useState(() => {
    try { return restoreWorkspace(localStorage.getItem(WORKSPACE_PREFIX + activeRace.id), activeRace.id, activeRace.kart).selectedKart || activeRace.kart || '' }
    catch { return activeRace.kart || '' }
  })
  const [drivers, setDrivers] = useState<DriverData>(() => {
    try { const stored = localStorage.getItem(WORKSPACE_PREFIX + activeRace.id)
      return stored ? restoreWorkspace(stored, activeRace.id, activeRace.kart).drivers : newWorkspace(activeRace.id, activeRace.kart).drivers
    } catch { return newWorkspace(activeRace.id, activeRace.kart).drivers }
  })
  const [now, setNow] = useState(Date.now())
  const [lastReceivedAt, setLastReceivedAt] = useState<number | null>(null)
  const [nextDriver, setNextDriver] = useState('')
  const [showSwap, setShowSwap] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [view, setView] = useState<AppPage>('races')
  const [phases,setPhases]=useState<PhaseConfig>(()=>readPhases(localStorage.getItem(PHASES_STORE+activeRace.id)))
  const [qualSnapshots,setQualSnapshots]=useState<Partial<Record<RacePhase,TimingState>>>(()=>{try{return JSON.parse(localStorage.getItem(QUAL_SNAPSHOTS_STORE+activeRace.id)||'{}')}catch{return {}}})
  const [rankingMode,setRankingMode] = useState<'official'|'projected'>('official')
  const [projectionSettings,setProjectionSettings] = useState<ProjectionSettings>(()=>savedProjection(activeRace.id))
  const [strategy, setStrategy] = useState(() => {
    try { const stored = localStorage.getItem(WORKSPACE_PREFIX + activeRace.id)
      return stored ? restoreWorkspace(stored, activeRace.id).strategy : newWorkspace(activeRace.id).strategy
    } catch { return newWorkspace(activeRace.id).strategy }
  })
  const [focusMode, setFocusMode] = useState(false)
  const [followedRivals, setFollowedRivals] = useState<string[]>(() => {
    try { const stored = localStorage.getItem(WORKSPACE_PREFIX + activeRace.id)
      return stored ? restoreWorkspace(stored, activeRace.id).followedRivals : []
    } catch { return [] }
  })
  const [rivalToFollow, setRivalToFollow] = useState('')
  const [raceControlOpen, setRaceControlOpen] = useState(false)
  const [raceControlFilter, setRaceControlFilter] = useState<'mine' | 'rivals' | 'all'>('all')
  const [lastMessage, setLastMessage] = useState('')
  const [pitVisits, setPitVisits] = useState(() => {
    try { const stored = localStorage.getItem(WORKSPACE_PREFIX + activeRace.id)
      return stored ? restoreWorkspace(stored, activeRace.id).pitVisits : []
    } catch { return [] }
  })
  const [paceOpen, setPaceOpen] = useState(false)
  const [stintsOpen, setStintsOpen] = useState(false)
  const [rivalsOpen, setRivalsOpen] = useState(false)
  const [projectionOpen, setProjectionOpen] = useState(false)
  const [pitsOpen, setPitsOpen] = useState(false)
  const [oracleOpen, setOracleOpen] = useState(false)
  const [raceFlash, setRaceFlash] = useState<RaceFlash | null>(null)
  const [pitConfirmOpen,setPitConfirmOpen]=useState(false)
  const [pitConfirmDriver,setPitConfirmDriver]=useState('')
  const [stintBanner,setStintBanner]=useState<{stage:StintAlertStage;remainingMs:number;lapMs:number|null}|null>(null)
  const [celebration,setCelebration]=useState<{position:number|null;team:string}|null>(null)
  const lastPitObservation=useRef<{raceId:string;session:string;value:PitObservation}|null>(null)
  const stintNotified=useRef<{key:string;priority:number}>({key:'',priority:0})
  const [soundOn, setSoundOn] = useState(true)
  const soundRef = useRef<AudioContext | null>(null)
  const [noticeAlert, setNoticeAlert] = useState('')
  const knownNotices = useRef<Set<string> | null>(null)
  const raceConnection = useRef<TimingConnection | null>(null)
  const [showRaw, setShowRaw] = useState(false)
  const liveGeneration = useRef(0)
  // The simulator must be an isolated, reversible preview, never the active race data.
  const simulationOrigin = useRef<SessionOrigin<TimingState>|null>(null)

  // Navigating between race sections should not strand mobile users halfway down a long page.
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }) }, [view])

  // Keep the track dashboard from scrolling behind a mobile sheet.
  const anyDialogOpen = settingsOpen || showSwap || stintsOpen || paceOpen || rivalsOpen ||
    projectionOpen || pitsOpen || oracleOpen || raceControlOpen || pitConfirmOpen || !!celebration
  useEffect(() => {
    if (!anyDialogOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [anyDialogOpen])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  useEffect(() => {
    if (mode !== 'sim' || !simulation?.running) return
    let previous = Date.now()
    const id = window.setInterval(() => {
      const current = Date.now()
      const elapsed = Math.min(2000, current - previous)
      previous = current
      setSimulation(old => old?.running ? advanceSimulation(old, elapsed * old.speed) : old)
    }, 250)
    return () => window.clearInterval(id)
  }, [mode, simulation?.running, simulation?.speed])
  useEffect(() => {
    if (mode === 'sim' && simulation) setData(simulation.timing)
  }, [mode, simulation])
  useEffect(()=>{try{localStorage.setItem(PHASES_STORE+activeRace.id,JSON.stringify(phases))}catch{/* storage full */}},[phases,activeRace.id])
  useEffect(()=>{try{localStorage.setItem(QUAL_SNAPSHOTS_STORE+activeRace.id,JSON.stringify(qualSnapshots))}catch{/* storage full */}},[qualSnapshots,activeRace.id])
  useEffect(()=>{if(mode==='live'&&data.meta?.sessionId&&PHASES_WITH_TIMING.includes(phases.current))setQualSnapshots(prev=>({...prev,[phases.current]:{...data,lapHistory:data.lapHistory.slice(-250),passages:data.passages.slice(-150)}}))},[mode,data])
  useEffect(() => {
    try { localStorage.setItem(RACES_STORE, JSON.stringify(collection)) } catch { /* browser quota */ }
  }, [collection])
  useEffect(()=>{try{localStorage.setItem(PROJECTION_STORE+activeRace.id,JSON.stringify(projectionSettings))}catch{/* quota */}},[activeRace.id,projectionSettings])
  useEffect(() => {
    // Never persist sandbox kart selections into the real race workspace.
    if(mode === 'sim') return
    try { localStorage.setItem(WORKSPACE_PREFIX + activeRace.id, JSON.stringify({
      raceId: activeRace.id, drivers, strategy, pitVisits, followedRivals, selectedKart
    })) } catch { /* browser quota */ }
  }, [activeRace.id, drivers, strategy, pitVisits, followedRivals, selectedKart, mode])
  useEffect(() => { if (!noticeAlert) return; const id=window.setTimeout(()=>setNoticeAlert(''),9000);return ()=>window.clearTimeout(id) }, [noticeAlert])
  useEffect(() => { if (!raceFlash) return; const id=window.setTimeout(()=>setRaceFlash(null),6500);return ()=>window.clearTimeout(id) }, [raceFlash])
  useEffect(() => () => { raceConnection.current?.disconnect() }, [])

  const racers = useMemo(() => [...data.racers].sort((a, b) => (a.position ?? 999) - (b.position ?? 999)), [data.racers])
  const mine = racers.find(r => r.kart === selectedKart)
  const projection = useMemo(() => buildProjection(data.meta?.provider==='racefacer' && !data.meta.isEndurance ? emptyTiming : data,
    mode==='sim' ? strategy.rules.minPitStops ?? 6 : strategy.rules.minPitStops,
    mode==='sim' && simulation ? {
      remainingMinutes: Math.max(0.1,(strategy.rules.raceMinutes ?? 420)-simulation.timeMs/60000),
      pitLossSeconds: projectionSettings.pitLossSeconds ?? (strategy.rules.minPitSeconds ?? 60),
    } : projectionSettings,mode==='sim'
  ),[data,mode,strategy.rules.minPitStops,strategy.rules.raceMinutes,strategy.rules.minPitSeconds,simulation?.timeMs,projectionSettings])
  const projectedNeighbors = neighboringProjected(projection.rows,selectedKart)
  const projectedRivalKarts = projection.rows.flatMap(r=>projectedNeighbors.ours&&Math.abs(r.predictedPosition-projectedNeighbors.ours.predictedPosition)<=2&&r.kart!==selectedKart?[r.kart]:[])
  const previousLap = data.lapHistory.filter(l=>l.kart===selectedKart && l.durationMs>40_000 && l.durationMs<240_000).slice(-2)
  const lastLapDeltaMs = previousLap.length===2? previousLap[1].durationMs-previousLap[0].durationMs : null
  const lastMs = mine?.lastLap ? parseLapTime(mine.lastLap) : null
  const bestMs = mine?.bestLap ? parseLapTime(mine.bestLap) : null
  const lastVsBest = lastMs === null || bestMs === null ? null : lastMs - bestMs
  const proximity = passageNeighbors(data, selectedKart, mode === 'sim' && simulation ? simulatedNow(simulation) : now)
  const rivalKarts = [...new Set([...(projectedRivalKarts.length ? projectedRivalKarts : directRivalKarts(racers,selectedKart,[])),...followedRivals,...(proximity?.ahead?[proximity.ahead.kart]:[]),...(proximity?.behind?[proximity.behind.kart]:[])])]
  const pace = useMemo(() => paceSummary(data.lapHistory, selectedKart, 5), [data.lapHistory, selectedKart])
  const paceReadout = useMemo(() => pace ? paceInsight(pace) : null, [pace])
  const lapRank = useMemo(() => mine ? lapPerformance(data.lapHistory, selectedKart, mine, 5) : null, [data.lapHistory, selectedKart, mine])
  const timingNow = mode === 'sim' && simulation ? simulatedNow(simulation) : now
  const frontPace = proximity?.ahead ? rivalPaceText(compareRivalPace(data.lapHistory, selectedKart, proximity.ahead.kart, timingNow), 'ahead') : null
  const rearPace = proximity?.behind ? rivalPaceText(compareRivalPace(data.lapHistory, selectedKart, proximity.behind.kart, timingNow), 'behind') : null
  // Standings rivals: comparison is based on recent valid laps, never on the official gap.
  const stintHistory = mode === 'sim' && simulation ? simulation.stints : drivers.turns
  const stintDetails = useMemo(() => stintSummaries(stintHistory, data.lapHistory, selectedKart, timingNow), [stintHistory, data.lapHistory, selectedKart, timingNow])
  const pits = pitOverview(mode === 'sim' && simulation ? simulation.pitVisits : pitVisits, mode === 'sim' && simulation ? simulatedNow(simulation) : now, strategy.rules.minPitSeconds, strategy.rules.minPitStops)
  const oracle = useMemo(() => mode === 'sim' && simulation ? comparePitWindows(simulation) : null, [mode, simulation])
  const myNotices = data.raceControl.filter(notice => notice.kart === selectedKart)
  const rivalNotices = data.raceControl.filter(notice => notice.kart !== selectedKart && notice.kart !== null && rivalKarts.includes(notice.kart))
  const shownNotices = raceControlFilter === 'mine' ? myNotices : raceControlFilter === 'rivals' ? rivalNotices : data.raceControl
  // New notices are handled once across every source (Apex, imported data, simulator).
  // The initial snapshot is a baseline: historical notices never trigger alarms.
  useEffect(() => {
    const {seen,alert:event} = reconcileRaceNotices(knownNotices.current, data.raceControl, selectedKart, rivalKarts)
    knownNotices.current = seen
    if (!event || (mode !== 'sim' && mode !== 'live')) return
    const ours = event.kart === selectedKart
    setRaceFlash({id:`${event.id}-${Date.now()}`,type:event.type as 'warning'|'penalty',message:event.message,kart:event.kart!,ours})
    setNoticeAlert(`${ours?'NOSSA EQUIPA':(data.racers.find(r=>r.kart===event.kart)?.name||`Kart #${event.kart}`)+` · Kart #${event.kart}`} · ${noticeTypeLabel(event.type)}: ${event.message}`)
    playSignal(event.type as 'warning'|'penalty')
  }, [data.raceControl, selectedKart, rivalKarts.join(','), mode])

  const warningCount = myNotices.filter(notice => notice.type === 'warning').length
  const penaltyCount = myNotices.filter(notice => notice.type === 'penalty').length
  const lastAge = lastReceivedAt === null ? null : Math.max(0, now - lastReceivedAt)
  const feedStale = mode === 'live' && (lastAge === null || lastAge > 45_000)
  const liveFresh = mode === 'live' && connected && !feedStale
  const active = [...drivers.turns].reverse().find(turn => turn.endedAt === undefined)
  const turnMs = active ? Math.max(0, now - active.startedAt) : 0
  const maxStint = strategy.rules.maxStintMinutes
  const minStint = strategy.rules.minStintMinutes
  const turnLimitMs = maxStint === null ? null : maxStint * 60_000
  const turnRatio = turnLimitMs && turnLimitMs > 0 ? Math.min(100, (turnMs / turnLimitMs) * 100) : 0
  const remaining = turnLimitMs === null ? null : Math.max(0, turnLimitMs - turnMs)
  const turnWarning = !!active && turnLimitMs !== null && turnLimitMs > 0 && turnRatio >= 90
  const turnExceeded = !!active && turnLimitMs !== null && turnMs > turnLimitMs
  const nextPlanned = strategy.plan[drivers.turns.length]
  // Read the same persisted turn data on every page. In demo mode the driver clock remains manual.
  // During simulation use the simulated clock, so the countdown follows pause and acceleration.
  const simulatedTurn = mode === 'sim' && simulation !== null
  const hudDriver = simulatedTurn ? simulation!.driverNames[simulation!.driverIndex] : (active?.driver || null)
  const hudElapsed = simulatedTurn ? Math.max(0, simulation!.timeMs - simulation!.driverStartedMs) : turnMs
  const hudStintIndex = simulatedTurn ? simulation!.turnCount - 1 : drivers.turns.length - 1
  const hudPlannedStint = strategy.plan[hudStintIndex]
  const hudPlannedMinutes = hudDriver && hudPlannedStint?.driver === hudDriver ? hudPlannedStint.minutes : null
  const hudResult = computeStintHud({
    driver: hudDriver, elapsedMs: hudElapsed, plannedMinutes: hudPlannedMinutes,
    minMinutes: minStint, maxMinutes: maxStint,
    inPit: Boolean(pits.active),
  })
  const recentOurLaps=data.lapHistory.filter(l=>l.kart===selectedKart).map(l=>l.durationMs)
  const referenceLap=medianRaceLap(recentOurLaps,bestMs)
  const limitLeft = maxStint === null || !hudDriver ? null : maxStint*60_000 - hudElapsed
  const alertStage=stintAlertStage(limitLeft,referenceLap.ms)
  const waitingPit=[...pitVisits].reverse().find(p=>p.source==='live'&&!p.driverConfirmed)
  // Simulator-only defaults make the Copilot explorable without writing fictional rules into the real race.
  const copilotRules=mode==='sim'?{
    ...strategy.rules,
    raceMinutes:strategy.rules.raceMinutes??420,
    minStintMinutes:strategy.rules.minStintMinutes??15,
    maxStintMinutes:strategy.rules.maxStintMinutes??45,
    minPitStops:strategy.rules.minPitStops??6,
    minPitSeconds:strategy.rules.minPitSeconds??60,
  }:strategy.rules
  // The Copilot is a pure, read-only decision engine. A scenario changes the plan only on explicit approval.
  const copilot = buildCopilot({
    mode, timingFresh:liveFresh, liveAgeMs:lastAge, hasKart:!!mine,
    phase: mode==='sim'?'race':phases.current, rules:copilotRules,
    activeDriver:hudDriver, elapsedMs:hudDriver?hudElapsed:null,
    lapMs:referenceLap.ms,
    raceRemainingMs:mode==='sim' && simulation
      ?Math.max(0,copilotRules.raceMinutes!*60000-simulation.timeMs)
      :mode==='live' && data.meta?.timeLeftSeconds!=null ?data.meta.timeLeftSeconds*1000:null,
    completedPits:pits.completed,pitActive:!!pits.active,pitElapsedMs:pits.active?pits.currentMs:null,
    waitingForDriver:!!waitingPit,
    driverNames:mode==='sim' && simulation?simulation.driverNames:drivers.names,
    turns:stintHistory,
    plannedNextDriver:mode==='sim'&&simulation?simulation.driverNames[(simulation.driverIndex+1)%simulation.driverNames.length]:nextPlanned?.driver||null,
    now:timingNow, penalties:penaltyCount, warnings:warningCount, pace,
    projection:projection.rows.length?projection:null, selectedKart,lapConfidence:referenceLap.confidence,
    rivalBattles:projectedNeighbors.ours ? ([
      ...(projectedNeighbors.ahead?[{side:'ahead' as const,row:projectedNeighbors.ahead}]:[]),
      ...(projectedNeighbors.behind?[{side:'behind' as const,row:projectedNeighbors.behind}]:[])
    ].map(entry=>({side:entry.side,name:entry.row.name,kart:entry.row.kart,
        position:entry.row.predictedPosition,gap:projectedGap(entry.row,projectedNeighbors.ours!),
        remainingPits:entry.row.remainingPits,
        paceDifferenceMs:compareRivalPace(data.lapHistory,selectedKart,entry.row.kart,timingNow)?.differenceMs??null}))) : []
  })

  // Start alert when an estimated four laps remain. Each severity sounds at most once per stint.
  useEffect(()=>{
    const key=`${activeRace.id}:${mode}:${simulatedTurn ? simulation?.turnCount : active?.startedAt || 'none'}`
    if(stintNotified.current.key!==key){stintNotified.current={key,priority:0};setStintBanner(null)}
    if(!hudDriver||pits.active||!soundOn && alertStage==='none')return
    const priority=stintStagePriority[alertStage]
    if(priority>stintNotified.current.priority){
      stintNotified.current.priority=priority
      setStintBanner({stage:alertStage,remainingMs:limitLeft??0,lapMs:referenceLap.ms})
      if(mode==='live'||mode==='sim')playSignal(priority>=3?'penalty':'warning')
    }
  },[activeRace.id,mode,simulatedTurn,simulation?.turnCount,active?.startedAt,hudDriver,alertStage,pits.active,referenceLap.ms,limitLeft])

  // RaceFacer exposes explicit in_pit boolean. Never infer entry from a pit count alone.
  useEffect(()=>{
    if(mode!=='live'||!data.meta?.sessionId||!selectedKart){lastPitObservation.current=null;return}
    const racer=data.racers.find(r=>r.kart===selectedKart)
    if(!racer||typeof racer.inPit!=='boolean'||!data.meta.hasPits)return
    const current={kart:racer.kart,inPit:racer.inPit,pitCount:racer.pitCount,lastPassing:racer.lastPassing}
    const previous=lastPitObservation.current
    const action=previous&&previous.raceId===activeRace.id&&previous.session===data.meta.sessionId?pitTransition(previous.value,current):null
    lastPitObservation.current={raceId:activeRace.id,session:data.meta.sessionId,value:current}
    if(!action)return
    const at=Date.now() // reception timestamp; feed has no verified pit entry/exit timestamp
    if(action==='enter'){
      setPitVisits(visits=>visits.some(p=>!p.exitedAt)?visits:[...visits,{id:`rf-${activeRace.id}-${at}`,enteredAt:at,source:'live'}])
      setDrivers(d=>({...d,turns:d.turns.map(t=>t.endedAt===undefined?{...t,endedAt:at}:t)}))
      setPitConfirmDriver(strategy.plan[drivers.turns.length]?.driver||drivers.names.find(n=>n!==active?.driver)||drivers.names[0]||'')
      setPitConfirmOpen(true)
    }else if(action==='exit'){
      const openVisit=[...pitVisits].reverse().find(p=>!p.exitedAt)
      if(openVisit){
        setPitVisits(visits=>visits.map(p=>p.id===openVisit.id?{...p,exitedAt:at}:p))
        setDrivers(d=>({...d,turns:[...d.turns,{driver:openVisit.driverConfirmed||'Piloto por confirmar',startedAt:at}]}))
      }
    }
  },[mode,data,selectedKart,activeRace.id])

  // Celebrate only on the OWN kart's newly observed finish-line passage, with finish status.
  useEffect(()=>{
    if(!data.meta?.sessionId||!selectedKart)return
    const hasOurFinishPass=data.meta.newFinishKarts?.includes(selectedKart)===true
    const already=localStorage.getItem(CELEBRATED_STORE+activeRace.id+':'+data.meta.sessionId)==='1'
    if(!shouldCelebrate({sessionFinished:data.meta.isFinished||activeRace.status==='finished',oursCrossed:hasOurFinishPass,alreadyCelebrated:already,live:mode==='live'}))return
    localStorage.setItem(CELEBRATED_STORE+activeRace.id+':'+data.meta.sessionId,'1')
    const our=data.racers.find(r=>r.kart===selectedKart)
    setCelebration({position:our?.position??null,team:our?.name||`Kart #${selectedKart}`})
  },[data,selectedKart,activeRace.id,activeRace.status,mode])
  function confirmLivePit(name:string){
    if(!name||!waitingPit)return
    const visit=waitingPit
    setPitVisits(all=>all.map(p=>p.id===visit.id?{...p,driverConfirmed:name}:p))
    if(visit.exitedAt!==undefined){
      setDrivers(d=>({...d,turns:d.turns.map(t=>t.startedAt===visit.exitedAt&&t.driver==='Piloto por confirmar'?{...t,driver:name}:t)}))
    }
    setPitConfirmOpen(false);setPitConfirmDriver('')
  }
  function handleCopilotAction(kind:CopilotActionKind){
    if(kind==='confirm'){
      if(!waitingPit)return
      setPitConfirmDriver(waitingPit.driverConfirmed||strategy.plan[drivers.turns.length-1]?.driver||drivers.names[0]||'')
      setPitConfirmOpen(true)
    }else if(kind==='pit')setPitsOpen(true)
    else if(kind==='driver')launchTurn()
    else if(kind==='timing'){
      if(mode==='live')setSettingsOpen(true)
      else setView('setup')
    }else if(kind==='plan')setView('strategy')
    else if(kind==='details')setView('strategy')
  }
  function applyCopilotPlan(plan:PlannedStint[]):boolean{
    if(mode==='sim'||!active)return false
    const old=new Set(validateStrategy(strategy,drivers.names))
    const issues=validateStrategy({...strategy,plan},drivers.names).filter(message=>!old.has(message))
    if(issues.length){setNoticeAlert(`Copilot: alteração recusada. ${issues[0]}`);return false}
    setStrategy(s=>({...s,plan}))
    return true
  }

  function openStintFromHud() {
    setView('race')
    setFocusMode(false)
    window.setTimeout(() => document.getElementById('pitmaster-driver-management')?.scrollIntoView({behavior:'smooth',block:'center'}), 40)
  }

  function armAudio() {
    if (soundRef.current) {
      if (soundRef.current.state === 'suspended') void soundRef.current.resume().catch(()=>{})
      return
    }
    try {
      const AudioCtor = window.AudioContext
      if (!AudioCtor) return
      soundRef.current = new AudioCtor()
      void soundRef.current.resume().catch(()=>{})
    } catch { /* Web Audio might not be supported */ }
  }
  function playSignal(kind: 'warning'|'penalty') {
    if (!soundOn || !soundRef.current || soundRef.current.state !== 'running') return
    try {
      const ctx = soundRef.current
      const notes = kind === 'penalty' ? [440,340,440] : [680,570]
      const start = ctx.currentTime + 0.02
      notes.forEach((frequency,index)=>{
        const osc=ctx.createOscillator(), gain=ctx.createGain()
        osc.type = kind === 'penalty' ? 'sawtooth' : 'sine'
        osc.frequency.value = frequency
        const at=start+index*(kind === 'penalty' ? 0.23 : 0.2)
        gain.gain.setValueAtTime(0.0001,at)
        gain.gain.exponentialRampToValueAtTime(kind==='penalty'?0.055:0.035,at+0.022)
        gain.gain.exponentialRampToValueAtTime(0.0001,at+0.17)
        osc.connect(gain);gain.connect(ctx.destination)
        osc.start(at);osc.stop(at+0.19)
      })
    } catch { /* Sound must never interrupt timing */ }
  }

  function disconnect() {
    lastPitObservation.current=null
    liveGeneration.current += 1
    raceConnection.current?.disconnect()
    raceConnection.current = null
    setConnected(false)
  }
  function connect() {
    disconnect()
    knownNotices.current = null
    setData(emptyTiming)
    setSimulation(null)
    setMode('live')
    setLastReceivedAt(null)
    setLastMessage('')
    setConnectionError('')
    const provider = activeRace.provider
    const address = activeRace.sourceUrl.trim()
    const generation = liveGeneration.current
    try {
      raceConnection.current = connectTiming(provider, address, {
        onState: (result, instant, raw) => {
          if (generation !== liveGeneration.current) return
          setLastReceivedAt(instant)
          setLastMessage(raw.slice(0, 1800))
          setData(result)
        },
        onStatus: (isOnline, message) => {
          if (generation !== liveGeneration.current) return
          setConnected(isOnline)
          if (message) setConnectionError(message)
          else if (isOnline) setConnectionError('')
        }
      })
    } catch (error) { setConnectionError(error instanceof Error ? error.message : String(error)) }
  }
  function persistWorkspace() {
    if(mode==='sim') return // sandbox selections never overwrite the real race
    try { localStorage.setItem(WORKSPACE_PREFIX + activeRace.id, JSON.stringify({
      raceId: activeRace.id, drivers, strategy, pitVisits, followedRivals, selectedKart
    })) } catch { /* browser quota */ }
  }
  function selectRace(id: string) {
    simulationOrigin.current=null
    const next = collection.races.find(r => r.id === id)
    if (!next) return
    if (next.id === activeRace.id) { setView('setup'); setFocusMode(false); return }
    persistWorkspace()
    disconnect()
    const loaded = restoreWorkspace(localStorage.getItem(WORKSPACE_PREFIX + next.id), next.id, next.kart)
    setDrivers(loaded.drivers); setStrategy(loaded.strategy); setPitVisits(loaded.pitVisits)
    setPhases(readPhases(localStorage.getItem(PHASES_STORE+id)))
    try{setQualSnapshots(JSON.parse(localStorage.getItem(QUAL_SNAPSHOTS_STORE+id)||'{}'))}catch{setQualSnapshots({})}
    lastPitObservation.current=null;setPitConfirmOpen(false);setCelebration(null)
    setFollowedRivals(loaded.followedRivals); setSelectedKart(loaded.selectedKart || next.kart)
    setProjectionSettings(savedProjection(id))
    setRankingMode('official')
    setRacesActive(id)
    knownNotices.current = null; setRaceFlash(null)
    setSimulation(null); setData(emptyTiming); setMode('empty'); setImportMessage('')
    setUrl(next.sourceUrl); setLastReceivedAt(null); setConnectionError('')
    setView('setup')
  }
  function setRacesActive(id: string) { setCollection(c => ({...c, activeId:id})) }
  function makeRace() {
    simulationOrigin.current=null
    persistWorkspace()
    disconnect()
    const next = createRace(`race-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
    setCollection(c => ({activeId:next.id, races:[...c.races,next]}))
    setProjectionSettings({remainingMinutes:null,pitLossSeconds:null})
    const workspace = newWorkspace(next.id)
    setDrivers(workspace.drivers);setStrategy(workspace.strategy);setPitVisits([]);setPhases(readPhases(null));setQualSnapshots({});lastPitObservation.current=null;setPitConfirmOpen(false);setCelebration(null)
    setFollowedRivals([]);setSelectedKart('')
    knownNotices.current = null; setRaceFlash(null)
    setSimulation(null);setData(emptyTiming);setMode('empty');setImportMessage('');setUrl('')
    setLastReceivedAt(null);setView('setup')
  }
  function duplicateRace() {
    simulationOrigin.current=null
    persistWorkspace()
    disconnect()
    const copy={...activeRace,id:`race-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,name:`${activeRace.name} · Cópia`,sourceUrl:'',status:'preparation' as const,createdAt:Date.now()}
    const cloned={...newWorkspace(copy.id),drivers:{...drivers,turns:[]},strategy:{rules:{...strategy.rules},plan:[]},selectedKart:activeRace.kart,followedRivals:[]}
    try{localStorage.setItem(WORKSPACE_PREFIX+copy.id,JSON.stringify(cloned))}catch{/* quota */}
    setCollection(c=>({activeId:copy.id,races:[...c.races,copy]}))
    setDrivers(cloned.drivers);setStrategy(cloned.strategy);setPitVisits([]);setFollowedRivals([]);setPhases(readPhases(null));setQualSnapshots({});lastPitObservation.current=null;setPitConfirmOpen(false);setCelebration(null)
    setSelectedKart(copy.kart);setProjectionSettings({remainingMinutes:null,pitLossSeconds:null})
    setSimulation(null);setData(emptyTiming);setMode('empty');setView('setup');setUrl('')
    knownNotices.current=null;setRaceFlash(null);setLastReceivedAt(null)
  }
  function updateRace(profile: RaceProfile) {
    if (profile.id !== activeRace.id) return
    setCollection(c => updateProfile(c, profile))
    setUrl(profile.sourceUrl)
    if (profile.kart !== activeRace.kart) setSelectedKart(profile.kart)
  }
  function removeRace(id: string) {
    simulationOrigin.current=null
    if (collection.races.length < 2 || !window.confirm('Apagar esta prova e os dados guardados neste dispositivo?')) return
    disconnect()
    const remaining = collection.races.filter(r => r.id !== id)
    const next = remaining[0]
    try {localStorage.removeItem(WORKSPACE_PREFIX + id);localStorage.removeItem(PROJECTION_STORE + id)} catch { /* local */ }
    const loaded = restoreWorkspace(localStorage.getItem(WORKSPACE_PREFIX + next.id), next.id, next.kart)
    setCollection({activeId:next.id,races:remaining});setDrivers(loaded.drivers)
    setStrategy(loaded.strategy);setPitVisits(loaded.pitVisits);setFollowedRivals(loaded.followedRivals)
    setPhases(readPhases(localStorage.getItem(PHASES_STORE+next.id)))
    try{setQualSnapshots(JSON.parse(localStorage.getItem(QUAL_SNAPSHOTS_STORE+next.id)||'{}'))}catch{setQualSnapshots({})}
    lastPitObservation.current=null;setPitConfirmOpen(false);setCelebration(null)
    setSelectedKart(loaded.selectedKart || next.kart);setUrl(next.sourceUrl);setProjectionSettings(savedProjection(next.id))
    knownNotices.current = null; setRaceFlash(null)
    setSimulation(null);setData(emptyTiming);setMode('empty');setView('setup')
  }
  async function importFile(file: File) {
    if (file.size > 5_000_000) { setImportMessage('O ficheiro excede 5 MB.'); return }
    try {
      const parsed: unknown = JSON.parse(await file.text())
      const result = importTimingJSON(parsed)
      disconnect();knownNotices.current = null;setRaceFlash(null);setSimulation(null);setData(result.state);setMode('import');setConnected(false)
      setLastReceivedAt(null);setConnectionError('');setView('race')
      setImportMessage(`Importados ${result.state.racers.length} karts, ${result.state.lapHistory.length} voltas. ${result.warnings.slice(0,3).join(' ')}`)
      if (!result.state.racers.some(r=>r.kart===selectedKart)) setSelectedKart(result.state.racers[0]?.kart || '')
    } catch (error) { setImportMessage(error instanceof Error ? error.message : 'Não foi possível importar o JSON.') }
  }
  function exitSimulation() {
    if (mode !== 'sim') return
    const origin=simulationOrigin.current
    simulationOrigin.current=null
    setSimulation(null)
    setFocusMode(false)
    setStintBanner(null)
    setRaceFlash(null)
    knownNotices.current=null
    setSettingsOpen(false)
    const restored=resumeAfterSimulation(origin)
    setMode(restored.mode)
    setData(restored.data ?? emptyTiming)
    if(restored.kart !== null)setSelectedKart(restored.kart)
    setConnectionError(restored.reconnectRequired?'Simulador fechado. Volta a ligar o Live Timing em Definições para retomar os dados reais.':'')
    setView('race')
  }
  function useSimulation() {
    if(mode!=='sim') simulationOrigin.current={mode,data,kart:selectedKart}
    disconnect()
    const kart = selectedKart && demo.racers.some(r=>r.kart===selectedKart) ? selectedKart : '7'
    const simRacers=demo.racers.map(r=>r.kart===kart?{...r,name:activeRace.teamName?.trim()||'Nossa equipa (simulação)'}:r)
    const sim = createSimulation(simRacers, kart, drivers.names)
    knownNotices.current = null
    setRaceFlash(null)
    setSimulation(sim)
    setMode('sim');setData(sim.timing)
    setSelectedKart(kart);setLastReceivedAt(null);setConnectionError('');setSettingsOpen(false);setView('race')
  }
  function setSimScenario(scenario: SimulationScenario) {
    setSimulation(sim=>sim ? setSimulationScenario(sim,scenario) : sim)
  }
  function simIncident(type: 'warning' | 'penalty', target: string) {
    setSimulation(sim=>sim ? triggerSimulationIncident(sim,type,target) : sim)
  }
  function simPit() {
    setSimulation(sim=>sim ? triggerSimulationPit(sim) : sim)
  }
  function enterPit() {
    if (mode === 'sim') { simPit(); return }
    if (pits.active) return
    setPitVisits(visits=>[...visits,{id:`pit-${Date.now()}`,enteredAt:Date.now(),source:'manual'}])
  }
  function exitPit() {
    if (mode === 'sim') return
    if (!pits.active) return
    if (pits.minTimeRemainingMs !== null && pits.minTimeRemainingMs > 0 &&
      !window.confirm(`A paragem está abaixo do mínimo regulamentar. Faltam ${formatPitDurationMs(pits.minTimeRemainingMs)}. Confirmar saída?`)) return
    const timestamp=Date.now()
    setPitVisits(visits=>visits.map(p=>p.exitedAt===undefined?{...p,exitedAt:timestamp}:p))
  }
  function changeDriver(name: string) {
    if (mode === 'sim') return
    if (!name) return
    if (active && minStint !== null && turnMs < minStint * 60_000 && !window.confirm(`O stint mínimo configurado é ${minStint} min. Este piloto só conduziu ${clock(turnMs)}. Confirmar a troca antecipada?`)) return
    const time = Date.now()
    setDrivers(d => ({
      ...d,
      turns: [...d.turns.map(t => t.endedAt === undefined ? { ...t, endedAt: time } : t), { driver: name, startedAt: time }]
    }))
    setShowSwap(false)
    setNextDriver('')
  }
  function finishTurn() {
    if (mode === 'sim') return
    if (active && minStint !== null && turnMs < minStint * 60_000 && !window.confirm(`O stint mínimo é ${minStint} min. Confirmar o fim antecipado do turno?`)) return
    const time = Date.now()
    setDrivers(d => ({ ...d, turns: d.turns.map(t => t.endedAt === undefined ? { ...t, endedAt: time } : t) }))
  }
  function launchTurn() {
    if (mode === 'sim') return
    setNextDriver(nextPlanned?.driver || drivers.names.find(name => name !== active?.driver) || drivers.names[0] || '')
    setShowSwap(true)
  }

  function exportData() {
    const bundle = { version: 'pitmaster-0.20', exportedAt: new Date().toISOString(), race: activeRace,
      drivers, strategy, pitVisits, followedRivals, projectionSettings, phases, qualSnapshots,
      timing: { title: data.title, session: data.session, track: data.track,
        racers: data.racers, lapHistory: data.lapHistory, passages: data.passages, raceControl: data.raceControl } }
    const blob=new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'})
    const href=URL.createObjectURL(blob)
    const anchor=document.createElement('a')
    anchor.href=href;anchor.download=`pitmaster-backup-${new Date().toISOString().slice(0,10)}.json`
    document.body.appendChild(anchor);anchor.click();anchor.remove()
    window.setTimeout(()=>URL.revokeObjectURL(href),3000)
  }
  function resetRace() {
    if (!window.confirm('Reiniciar os dados operacionais desta prova? Serão apagados o regulamento, a estratégia, os turnos e o histórico de pits locais. Os nomes dos pilotos serão mantidos.')) return
    setStrategy(restoreStrategy(null))
    setDrivers(d => ({ ...d, turns: [] }))
    setFollowedRivals([])
    setPitVisits([])
    setPitConfirmOpen(false);setStintBanner(null);setCelebration(null)
  }
  function watchKart(kart: string) {
    setSelectedKart(kart)
    if (mode === 'sim') setSimulation(sim => sim ? { ...sim, selectedKart: kart } : sim)
    if(mode!=='sim') setCollection(c => updateProfile(c, { ...activeRace, kart }))
  }
  function stageDriver(name: string) {
    setNextDriver(name)
    setView('race')
    setShowSwap(true)
  }

  const insideRace = isRacePage(view)
  function goToHub(destination: 'races' | 'calendar') {
    if (mode === 'sim') exitSimulation()
    setFocusMode(false)
    setView(destination)
  }
  function openRace(id: string) {
    selectRace(id)
    const item = collection.races.find(r => r.id === id)
    setView(item?firstRacePage(item):'races')
    setFocusMode(false)
  }

  return <div className={`app ${focusMode && view === 'race' ? 'focus-mode' : ''} ${!insideRace ? 'app--hub' : ''}`} onPointerDownCapture={()=>{if(soundOn)armAudio()}} onKeyDownCapture={()=>{if(soundOn)armAudio()}}>
    <div className="ambient" aria-hidden="true"/>
    {insideRace && raceFlash && <><div key={raceFlash.id} className={`raceFlashScreen ${raceFlash.type}`} aria-hidden="true"/>
      <div className={`raceFlashBanner ${raceFlash.type}`} role="alert">
        <ShieldAlert size={23}/><div><strong>{raceFlash.type==='penalty'?'PENALIZAÇÃO!':'WARNING!'} · {raceFlash.ours?'A NOSSA EQUIPA':`${racers.find(r=>r.kart===raceFlash.kart)?.name||`Kart #${raceFlash.kart}`} · Kart #${raceFlash.kart}`}</strong><p>{raceFlash.message}</p></div><button type="button" aria-label="Fechar aviso" onClick={()=>setRaceFlash(null)}><X size={19}/></button>
      </div></>}

    <header className="topbar">
      <div className="brand" aria-label="Pitmaster">
        <div className="brandMark"><Flag size={22} strokeWidth={2.8}/><span className="markPulse"/></div>
        <div className="brandType"><strong>PIT<span>MASTER</span><span className="brandPeriod">.</span></strong><small>RACE INTELLIGENCE</small></div>
        <span className="version">BETA / 0.20</span>
      </div>
      <nav className={`pageNav ${insideRace ? 'raceNav' : 'hubNav'}`} aria-label={insideRace ? 'Páginas desta prova' : 'Biblioteca de provas'}>
        {insideRace ? <>
          <button className="navReturn" onClick={()=>goToHub('races')}><ArrowLeft size={17}/> Provas</button>
          <button className={view === 'setup' ? 'selected' : ''} onClick={() => {setView('setup');setFocusMode(false)}}><Settings2 size={17}/> Preparar</button>
          <button className={view === 'qualifying' ? 'selected' : ''} onClick={() => {setView('qualifying');setFocusMode(false)}}><Flag size={17}/> Qualificação</button>
          <button className={view === 'race' ? 'selected' : ''} onClick={() => setView('race')}><Gauge size={17}/> Corrida</button>
          <button className={view === 'ranking' ? 'selected' : ''} onClick={() => {setView('ranking');setFocusMode(false)}}><FlagTriangleRight size={17}/> Classificação</button>
          <button className={view === 'strategy' ? 'selected' : ''} onClick={() => {setView('strategy');setFocusMode(false)}}><ClipboardList size={17}/> Estratégia</button>
        </> : <>
          <button className={view === 'races' ? 'selected' : ''} onClick={()=>setView('races')}><Flag size={18}/> Provas</button>
          <button className={view === 'calendar' ? 'selected' : ''} onClick={()=>setView('calendar')}><CalendarDays size={18}/> Calendário</button>
        </>}
      </nav>
      {insideRace && <div className="topright">
        <span className={`connectionBadge ${mode !== 'live' ? 'isDemo' : liveFresh ? 'isConnected' : 'isOffline'}`}>
          <i/>{mode === 'sim' ? 'DADOS SIMULADOS' : mode === 'demo' ? 'DADOS HISTÓRICOS' : mode === 'import' ? 'DADOS IMPORTADOS' : mode === 'empty' ? 'SEM CRONOMETRAGEM' : liveFresh ? 'TIMING ONLINE' : connected ? 'SEM DADOS RECENTES' : 'TIMING OFFLINE'}
        </span>
        {view === 'race' && <button className={`navBtn ${focusMode ? 'active' : ''}`} onClick={() => setFocusMode(f => !f)} title={focusMode ? 'Sair do modo foco' : 'Modo foco'}>
          {focusMode ? <Expand size={17}/> : <Focus size={17}/>}<span>{focusMode ? 'Vista normal' : 'Modo foco'}</span>
        </button>}
        {mode==='sim'?<button className="navBtn simExitTop" onClick={exitSimulation} title="Sair do simulador e regressar à prova real"><X size={17}/> <span>Sair do simulador</span></button>
          :<button className="navBtn simQuickLaunch" onClick={useSimulation} title="Experimentar com dados fictícios"><Layers3 size={16}/> <span>Simular</span></button>}
        <button className={`iconBtn ${soundOn ? 'soundOn' : 'soundOff'}`} onClick={() => {if(!soundOn)armAudio();setSoundOn(v=>!v)}} title={soundOn?'Desativar som das ocorrências':'Ativar som das ocorrências'} aria-label={soundOn?'Desativar som dos avisos':'Ativar som dos avisos'} aria-pressed={soundOn}>{soundOn?<Volume2 size={20}/>:<VolumeX size={20}/>}</button>
        <button className="iconBtn" onClick={() => setSettingsOpen(true)} title="Definições"><Settings2 size={21}/></button>
      </div>}
    </header>
    {insideRace && <div className="activeRaceStrip" role="group" aria-label="Prova e etapa atuais">
      <div className="activeRaceName"><span>PROVA SELECIONADA</span><strong>{activeRace.name}</strong><small>{activeRace.teamName ? `${activeRace.teamName} · ${activeRace.track||'Pista por definir'}` : activeRace.track || 'Pista por definir'}</small></div>
      <div className="activeRaceStage"><span>FASE CONFIGURADA</span><strong>{PHASES.find(p=>p.value===phases.current)?.label || 'Preparação'}</strong></div>
      <button type="button" className="activeRaceConfig" onClick={()=>setView('setup')}><Settings2 size={15}/> Preparar</button>
    </div>}

    {insideRace&&stintBanner&&hudDriver&&!pits.active&&<div className={`stintWarningRibbon alert-${stintBanner.stage}`} role="alert"><AlertTriangle size={21}/><div><strong>{stintBanner.stage==='limit'?'STINT MÁXIMO ATINGIDO':stintBanner.stage==='one'?'BOX URGENTE':stintBanner.stage==='two'?'BOX IMINENTE':'PREPARAR BOX'}</strong><span>{stintBanner.stage==='limit'?'Confirma a entrada na box.':`~${stintBanner.stage==='four'?4:stintBanner.stage==='two'?2:1} volta(s) até ao limite · ${clock(Math.max(0,limitLeft??0))}`}</span></div><button onClick={()=>setStintBanner(null)} aria-label="Dispensar aviso"><X size={18}/></button></div>}
    {insideRace&&waitingPit&&!pitConfirmOpen&&<button className="pitConfirmNudge" onClick={()=>{setPitConfirmDriver(waitingPit.driverConfirmed||strategy.plan[drivers.turns.length-1]?.driver||drivers.names[0]||'');setPitConfirmOpen(true)}}><LockKeyhole size={17}/> Confirmar o piloto que entrou no pit <ArrowRight size={15}/></button>}
    {insideRace && (view==='race'||view==='strategy') && !!hudDriver && <StintHUD driver={hudDriver} result={hudResult} simulated={simulatedTurn} paused={simulatedTurn && !simulation!.running} onManage={openStintFromHud}/>}

    <main key={view} className={`workspace workspace--${view}`}>
      {view === 'races' ? <RaceLibrary collection={collection} onCreate={makeRace} onOpen={openRace} onCalendar={()=>setView('calendar')}/>
      : view === 'calendar' ? <RaceCalendar collection={collection} onOpen={openRace} onCreate={makeRace}/>
      : view === 'setup' ? <RaceSetup collection={collection} active={activeRace}
        drivers={drivers.names} planCount={strategy.plan.length} rules={strategy.rules} onRulesChange={rules=>setStrategy(s=>({...s,rules}))}
        onAddDriver={name=>setDrivers(d=>({...d,names:d.names.includes(name)?d.names:[...d.names,name]}))} onRemoveDriver={name=>setDrivers(d=>({...d,names:d.names.filter(n=>n!==name)}))}
        timingConnected={liveFresh}
        onDuplicate={duplicateRace} onCreate={makeRace} onSelect={selectRace} onRemove={removeRace}
        onUpdate={updateRace} onViewRace={()=>setView('race')} onViewStrategy={()=>setView('strategy')} onViewQualifying={()=>{setView('qualifying');setPhases(p=>({...p,current:'qualifying'}))}} phaseLabel={PHASES.find(p=>p.value===phases.current)?.label||'Preparação'}
        qualifyingMinutes={phases.qualifyingMinutes} onPalmelaSprintPreset={()=>{
          const today=new Date().toLocaleDateString('sv-SE')
          const existing=activeRace
          updateRace({...existing,name:existing.name==='Primeira prova'||existing.name==='Nova prova'?'Palmela · Qualificação 10 + Corrida 30':existing.name,track:'KIP Palmela',date:existing.date||today,status:'preparation'})
          setStrategy(prev=>({...prev,rules:palmelaSprintRules(prev.rules),plan:[]}))
          setPhases(prev=>palmelaSprintPhases(prev))
        }}
        onImport={importFile} importMessage={importMessage}/>
      : view === 'qualifying' ? <QualificationPanel config={phases} onChange={setPhases} data={qualSnapshots[PHASES_WITH_TIMING.includes(phases.current)?phases.current:'qualifying']||emptyTiming} selectedKart={selectedKart} onRace={()=>{setPhases(p=>({...p,current:'race'}));setView('race')}} activeSource={PROVIDERS[activeRace.provider].label}/>
      : view === 'ranking' ? <RankingPanel racers={racers} selectedKart={selectedKart} onSelectKart={watchKart} onBack={()=>setView('race')} source={PROVIDERS[activeRace.provider].label} mode={mode} projection={projection} projectionMode={rankingMode} onProjectionMode={setRankingMode} settings={projectionSettings} onSettings={setProjectionSettings} minPits={strategy.rules.minPitStops} onGoRules={()=>setView('strategy')}/>
      : view === 'race' ? <>
      <div className="raceHeader">
        <div className="raceIdentity">
          <div className="overline"><span className="limeDot"/> CORRIDA / {liveFresh?'EM DIRETO':'PAINEL'} <span className="headerSlash">/</span> {mode === 'sim' ? 'SIMULAÇÃO' : mode === 'demo' ? 'REPLAY' : mode === 'import' ? 'IMPORTAÇÃO' : mode === 'empty' ? 'SEM FEED' : 'LIVE TIMING'}</div>
          <h1>{mode==='sim'?'Laboratório de simulação':activeRace.name || 'A aguardar corrida'}</h1>
          <p><FlagTriangleRight size={15}/>{value(activeRace.track || data.track)}<span className="separator">/</span>{mode==='sim'?'Dados fictícios — não pertencem a esta prova':mode==='live'?value(data.session):mode==='import'?'Importação de dados': 'A aguardar cronometragem da prova'}</p>
        </div>
        <div className="raceControls">
          <label htmlFor="team" className="selectTitle">A ACOMPANHAR</label>
          <div className="teamSelect"><span className="hash">#</span><select id="team" value={selectedKart} onChange={e => watchKart(e.target.value)}>
            {racers.length === 0 && <option value={selectedKart}>{selectedKart?`Kart #${selectedKart} · Configurado`:'Configura o kart da equipa'}</option>}
            {racers.length > 0 && !!selectedKart && !racers.some(r=>r.kart===selectedKart) && <option value={selectedKart}>#{selectedKart} · Não identificado no feed</option>}
            {racers.map(r => <option value={r.kart} key={r.id}>{r.kart} · {r.name}</option>)}
          </select><ChevronDown size={16}/></div>
          <button className="linkSettings" onClick={() => setView('setup')}><Radio size={15}/> {PROVIDERS[activeRace.provider].label} · Configurar</button>
        </div>
      </div>

      {connectionError && <div className="alert"><ShieldAlert size={19}/><span>{connectionError}</span><button onClick={() => setConnectionError('')} aria-label="Fechar alerta"><X size={16}/></button></div>}


      {mode === 'empty' || (mode === 'live' && !racers.length) ? <section className="raceAwaiting" aria-label="A aguardar dados desta corrida">
        <div className="raceAwaitingIcon"><Radio size={30}/></div>
        <span className="hubKicker">{mode==='live'?'A AGUARDAR EQUIPAS E TEMPOS DA CRONOMETRAGEM':'ESTA PROVA AINDA NÃO TEM DADOS DE LIVE TIMING'}</span>
        <h2>{activeRace.name}</h2>
        <p>As voltas, posições, rivais e projeções só aparecem quando houver dados desta prova. Não usamos resultados de outras corridas para preencher os cartões.</p>
        <div className="raceAwaitingActions"><button className="solidBtn" onClick={()=>{setSettingsOpen(true)}}><Radio size={17}/> Configurar Live Timing</button><button className="quietBtn" onClick={useSimulation}><Layers3 size={17}/> Testar com dados fictícios</button></div>
        <div className="raceAwaitingManual"><div><b>Operação manual</b><span>{active?.driver || 'Ainda sem piloto registado'}{pits.active?` · Em box ${formatPitDurationMs(pits.currentMs)}`:''}</span></div><div className="raceManualActions"><button className="quietBtn" onClick={launchTurn}><Timer size={17}/> {active?'Trocar piloto':'Iniciar turno'}</button><button className="quietBtn" onClick={pits.active?exitPit:enterPit}><Flag size={17}/> {pits.active?'Registar saída da box':'Registar entrada na box'}</button></div></div><div className="raceAwaitingSteps"><span><Check size={16}/> Prova: {activeRace.name}</span><span>{selectedKart?`Kart da equipa: #${selectedKart}`:'Kart da equipa: por definir'}</span><span>Fonte: {PROVIDERS[activeRace.provider].label}</span></div>
      </section> : <>
      {mode === 'sim' && simulation && <section className="simConsole" aria-label="Simulador de corrida">
        <div className="simHead"><div><div className="overline">RACE LAB · SIMULAÇÃO 100% FICTÍCIA</div><h2><Layers3 size={19}/> Race Simulator <span className="simClock">{clock(simulation.timeMs)}</span></h2><p>Alterações não afetam pilotos, provas nem paragens reais.</p></div>
          <div className="simButtons"><button className="solidBtn" onClick={()=>setSimulation(old=>old?{...old,running:!old.running}:old)}>{simulation.running?<Pause size={15}/>:<Play size={15}/>} {simulation.running?'Pausar':'Continuar'}</button>
          <select className="simSelect" aria-label="Velocidade da simulação" value={simulation.speed} onChange={e=>setSimulation(old=>old?{...old,speed:Number(e.target.value) as SimulationSpeed}:old)}>{[1,5,20,60].map(v=><option key={v} value={v}>{v}×</option>)}</select>
          <button className="quietBtn" onClick={useSimulation}>Reiniciar</button><button className="simLeaveBtn" onClick={exitSimulation}><X size={16}/> Sair do simulador</button></div></div>
        <details className="simAdvanced"><summary><SlidersHorizontal size={15}/> Cenários e eventos de teste <ChevronDown size={16}/></summary><div className="simScenario"><span>CONDIÇÕES:</span>{([['normal','Normal'],['slow-track','Pista lenta'],['slow-us','A nossa equipa lenta'],['push','Ataque']] as const).map(([id,label])=><button key={id} className={simulation.scenario===id?'isActive':''} onClick={()=>setSimScenario(id)}>{label}</button>)}</div>
        <div className="simEvents"><span>PROVOCAR:</span><button onClick={()=>simIncident('warning',selectedKart)}>Warning nosso</button><button onClick={()=>simIncident('penalty',selectedKart)}>Penalização nossa</button><button onClick={()=>simIncident('warning',rivalKarts[0] || racers.find(r=>r.kart!==selectedKart)?.kart || selectedKart)}>Warning rival</button><button onClick={simPit}>Entrada nas boxes</button></div>
        <div className="simLog">{simulation.log.slice(0,3).map(e=><span key={e.id}><b>{clock(e.atMs)}</b> {e.text}</span>)}</div></details>
      </section>}
      <button className={`lapSpotlight ${lapRank ? 'hasRank' : 'isWaiting'}`} type="button" onClick={()=>setPaceOpen(true)}>
        <span className="lapSpotlightIcon"><Zap size={21}/></span>
        <span className="lapSpotlightTitle"><b>LAP PERFORMANCE</b><small>{lapRank ? (lapRank.projected ? 'Volta projetada · setores' : 'Volta concluída · classificação por ritmo') : 'Ainda sem voltas comparáveis desta prova'}</small></span>
        <strong>{lapRank?`TOP ${lapRank.rank} / ${lapRank.total}`:'—'}</strong>
        <span className="lapSpotlightOpen">Analisar <ArrowRight size={15}/></span>
      </button>
      <div className="heroMetrics">
        <section className="metric positionMetric">
          <div className="metricLabel">POSIÇÃO OFICIAL</div>
          <div className="positionValue">{mine?.position ?? '—'}<span>{mine?.position ? 'º' : ''}</span><small>/ {racers.length || '—'}</small></div>
          <div className="metricSub"><span className="tinyAccent"/> KART #{value(mine?.kart)} <span className="muted">· {shortTeam(mine?.name || 'Seleciona o kart', 18)}</span></div>
          <div className="metricSub topGapLine">GAP OFICIAL PARA P1 <strong>{value(mine?.gap)}</strong></div>
        </section>
        <button type="button" className="metric doubleLapMetric lapMetricButton" onClick={()=>setPaceOpen(true)} aria-label="Abrir evolução de tempos de volta">
          <div className="metricLabel">TEMPOS DE VOLTA</div>
          <div className="lapTimes">
            <div className="lapTimeLine"><span>ÚLTIMA</span><strong>{value(mine?.lastLap)}</strong></div>
            <div className="lapTimeLine best"><span>MELHOR</span><strong>{value(mine?.bestLap)}</strong></div>
          </div><div className="lapMetricInsight"><span>{lastLapDeltaMs===null?'Sem volta anterior para comparar':`${lastLapDeltaMs<=0?'Melhorou':'Piorou'} ${formatDelta(lastLapDeltaMs)} face à anterior`}</span><small>{lastVsBest===null?'Sem melhor volta':`${formatDelta(lastVsBest)} da melhor volta`}</small></div>
        </button>
        <button type="button" className="metric projectedHeroMetric" onClick={()=>setProjectionOpen(true)}>
          <div className="metricLabel">FINAL PROJETADO <ArrowRight size={15}/></div>
          <div className="projectedHeroValue">{projectedNeighbors.ours?`P${projectedNeighbors.ours.predictedPosition}`:'—'}</div>
          <div className="metricSub">{projectedNeighbors.ours&&mine?.position?`${mine.position>projectedNeighbors.ours.predictedPosition?'↑':mine.position<projectedNeighbors.ours.predictedPosition?'↓':'='} ${Math.abs(mine.position-projectedNeighbors.ours.predictedPosition)} posições`:'Aguarda dados e hipóteses'}</div>
          <span className="projectedHeroNote">{projection.reasons.length?'Configurar previsão':'Estimativa · confiança '+projection.confidence}</span>
        </button>
      </div>

      <CopilotPanel analysis={copilot} rules={copilotRules} plan={strategy.plan}
        mode={mode} currentDriver={hudDriver} completedTurns={mode==='sim' ? simulation?.stints.filter(t=>t.endedAt!==undefined).length||0 : drivers.turns.filter(t=>t.endedAt!==undefined).length}
        elapsedMs={hudDriver?hudElapsed:null}
        onAction={handleCopilotAction} onApply={applyCopilotPlan}/>

      <div className="dashboardGrid">
        {proximity ? <section className="card trackCard">
          <div className="cardHeading"><div><div className="overline">TRACK INTELLIGENCE</div><h2><Gauge size={21}/> Quem está à tua volta</h2><p>Ordem estimada pelas passagens no mesmo ponto</p></div><span className="sectionTag">{proximity ? `PONTO ${proximity.mine.marker}` : 'SEM MEDIÇÃO'}</span></div>
          <div className="trackNeighbors">
            <div className="neighbor front">
              <div className="neighborTitle"><ArrowUp size={17}/> À TUA FRENTE</div>
              <div className="neighborMain"><div className="neighborTeam"><strong>{proximity?.ahead ? `#${proximity.ahead.kart}` : '—'}</strong><span>{proximity?.ahead ? shortTeam(proximity.ahead.name, 25) : 'Sem passagem comparável'}</span></div><div className="neighborGap">{proximity?.ahead ? `−${proximity.ahead.seconds.toFixed(3)}` : '—'}<small>{proximity?.ahead ? 'SEGUNDOS' : 'AGUARDA DADOS'}</small></div></div>
              {proximity?.ahead && <div className={`neighborPace ${frontPace?.tone || 'unknown'}`}><Activity size={15}/><strong>{frontPace?.title}</strong><span>{frontPace?.detail}</span></div>}
            </div>
            <div className="trajectory" aria-hidden="true"><span className="rail"/><span className="railDash"/><span className="dotStart"/><span className="carIndicator"><FlagTriangleRight size={16}/></span><span className="dotEnd"/></div>
            <div className="neighbor mineNeighbor"><div className="neighborTitle"><span className="pulse"/> TU NA PISTA <span className="mineTime">{proximity ? `Medido ${new Date(proximity.mine.receivedAt).toLocaleTimeString('pt-PT')}` : 'Sem telemetria de posição'}</span></div><div className="mineInfo"><div className="mineNumber">#{value(mine?.kart)}</div><div><strong>{mine?.name || 'Escolhe um kart'}</strong><small>{mine ? `POSIÇÃO ${rankText(mine.position)} · ${value(mine.laps)} VOLTAS` : 'SEM EQUIPA SELECIONADA'}</small></div><Activity size={24}/></div></div>
            <div className="trajectory" aria-hidden="true"><span className="rail"/><span className="railDash"/><span className="dotStart"/><span className="carIndicator"><FlagTriangleRight size={16}/></span><span className="dotEnd"/></div>
            <div className="neighbor behind"><div className="neighborTitle"><ArrowDown size={17}/> ATRÁS DE TI</div><div className="neighborMain"><div className="neighborTeam"><strong>{proximity?.behind ? `#${proximity.behind.kart}` : '—'}</strong><span>{proximity?.behind ? shortTeam(proximity.behind.name, 25) : 'Sem passagem comparável'}</span></div><div className="neighborGap">{proximity?.behind ? `+${proximity.behind.seconds.toFixed(3)}` : '—'}<small>{proximity?.behind ? 'SEGUNDOS' : 'AGUARDA DADOS'}</small></div></div>{proximity?.behind && <div className={`neighborPace ${rearPace?.tone || 'unknown'}`}><Activity size={15}/><strong>{rearPace?.title}</strong><span>{rearPace?.detail}</span></div>}</div>
          </div>
          <div className="signalNote"><CircleHelp size={17}/><span>{mode === 'sim' ? 'Separações fictícias por pontos de passagem. O indicador «mais rápido/lento» compara as últimas 5 voltas válidas e não mede a distância física.' : mode !== 'live' ? 'Este conjunto não tem passagens de pista validadas; por isso não mostramos distâncias inventadas.' : 'Intervalos por passagem no setor/meta. «Mais rápido/lento» utiliza as últimas 5 voltas válidas; atenção a dobragens, latência e dados antigos.'}</span></div>
        </section> : <section className="trackCompact"><Gauge size={19}/><span><b>Proximidade em pista</b><small>À espera de passagens comparáveis — não apresentamos gaps inventados.</small></span></section>}

        {mode === 'sim' && simulation ? <section id="pitmaster-driver-management" className="card stintCard"><div className="cardHeading"><div><div className="overline">DRIVER MANAGEMENT · SIMULAÇÃO</div><h2><Timer size={21}/> Piloto simulado</h2><p>Os teus registos reais permanecem intactos.</p></div><span className="sectionTag">FICTÍCIO</span></div><div className="stintDetails"><div><span className="stintLabel">PILOTO</span><div className="driverName">{simulation.driverNames[simulation.driverIndex]}</div></div><div className="turnClock"><span>STINT FICTÍCIO</span><strong>{clock(simulation.timeMs-simulation.driverStartedMs)}</strong></div></div><p className="hint">O piloto muda automaticamente no fim do pit stop simulado. Turnos realizados: {simulation.turnCount}.</p><button className="stintExtraLink" onClick={()=>setStintsOpen(true)}><BarChart3 size={16}/> Analisar stints simulados <ArrowRight size={14}/></button><button className="quietBtn" onClick={simPit} disabled={simulation.participants.find(p=>p.kart===selectedKart)?.pitUntilMs!==null}>Simular troca nas boxes</button></section> : <>
        <section id="pitmaster-driver-management" className={`card stintCard ${turnWarning ? 'stintWarning' : ''} ${turnExceeded ? 'stintExceeded' : ''}`}>
          <div className="cardHeading"><div><div className="overline">DRIVER MANAGEMENT</div><h2><Timer size={21}/> Piloto em pista</h2><p>Controlo manual do turno</p></div><span className={`sectionTag ${active ? 'liveTag' : ''}`}>{active ? 'TURNO ATIVO' : 'SEM TURNO'}</span></div>
          <div className="stintDetails"><div><span className="stintLabel">PILOTO ATUAL</span><div className="driverName">{active?.driver || 'Nenhum piloto ativo'}</div></div><div className="turnClock"><span>TEMPO DE CONDUÇÃO</span><strong>{clock(turnMs)}</strong></div></div>
          <div className="stintProgress"><div className="stintProgressBar"><span style={{ width: `${turnRatio}%` }}/></div><div className="stintProgressLabels"><span>{active ? turnExceeded ? 'LIMITE MÁXIMO EXCEDIDO' : turnWarning ? 'Atenção: perto do limite máximo' : remaining === null ? 'Sem máximo definido' : `${clock(remaining)} até ao máximo` : 'Pronto para iniciar'}</span><span>{maxStint === null ? 'MÁXIMO POR DEFINIR' : `MÁXIMO ${maxStint} MIN`}</span></div>
          <div className="stintStrategyStrip"><span>{minStint === null ? 'Mínimo por definir' : turnMs < minStint * 60_000 && active ? `Mínimo: faltam ${clock(minStint * 60_000 - turnMs)}` : `Mínimo: ${minStint} min ✓`}</span><span>{nextPlanned ? `Próximo: ${nextPlanned.driver}` : 'Sem próximo piloto planeado'}</span></div></div>
          <div className="stintActions"><button className="solidBtn" onClick={launchTurn}><Zap size={19}/>{active ? 'Trocar piloto' : 'Iniciar turno'}<ArrowRight size={17}/></button>{active && <button className="quietBtn" onClick={finishTurn}><Pause size={16}/> Terminar turno</button>}<button className="quietBtn settingsStint" onClick={() => setView('strategy')}><ClipboardList size={17}/> Estratégia</button><button className="stintExtraLink" onClick={()=>setStintsOpen(true)}><BarChart3 size={16}/> Detalhes por stint <ArrowRight size={14}/></button></div>
        </section>

        </>}

        <VirtualRivals projection={projection} selectedKart={selectedKart} history={data.lapHistory} now={timingNow} onDetails={()=>setRivalsOpen(true)} onSetup={()=>{setRankingMode('projected');setView('ranking')}}/>
      </div>

      <div className="intelligenceGrid">
        <div className={`intelTile pitTile ${pits.active ? 'pitActive' : ''}`}>
          <span className="intelEyebrow"><Timer size={15}/> PIT STOP INTELLIGENCE</span>
          <strong>{pits.active ? formatPitDurationMs(pits.currentMs) : `${pits.completed} PIT${pits.completed === 1 ? '' : 'S'}`}</strong>
          <small>{pits.active ? pits.minTimeRemainingMs === null ? 'Paragem a decorrer' : pits.minTimeRemainingMs === 0 ? 'Mínimo cumprido' : `Mínimo: faltam ${formatPitDurationMs(pits.minTimeRemainingMs)}` : strategy.rules.minPitStops === null ? 'Mínimo de paragens por definir' : `Faltam ${pits.remaining} paragens regulamentares`}</small>
          <button className="pitAction" disabled={mode==='sim' && !!simulation?.participants.find(p=>p.kart===selectedKart)?.pitUntilMs} title="Registo manual de reserva quando não há evento fiável do Live Timing" onClick={mode==='sim'?simPit:pits.active?exitPit:enterPit}>{mode==='sim' ? 'SIMULAR PIT' : pits.active ? 'REGISTAR SAÍDA' : 'REGISTAR ENTRADA'} <ArrowRight size={14}/></button><button type="button" className="pitDetailsBtn" onClick={()=>setPitsOpen(true)}><BarChart3 size={15}/> Ver gráfico das paragens</button>
        </div>
      </div>
      {pits.shortVisits.length > 0 && <div className="pitNotice"><AlertTriangle size={16}/> {pits.shortVisits.length} paragem(ns) registada(s) abaixo do mínimo configurado. Verifica o regulamento.</div>}
      <details className="raceAnalyticsDisclosure" aria-label="Análise aprofundada">
        <summary><span><BarChart3 size={20}/><strong>Análise avançada</strong><small>Pace Intelligence, ORACLE e Race Control</small></span><ChevronDown size={20}/></summary>
      <section className={`paceSpotlight ${paceReadout ? `pace-${paceReadout.tone}` : ''}`} aria-label="Pace Intelligence: comparação do ritmo com o pelotão">
        <div className="paceSpotlightTitle"><div className="overline"><Activity size={16}/> PACE INTELLIGENCE · RITMO VS PELOTÃO</div><h2>Estamos realmente mais rápidos ou lentos?</h2><p>Comparamos as últimas 5 voltas válidas da nossa equipa com o ritmo recente dos outros karts.</p></div>
        {pace && paceReadout ? <>
          <div className="paceMainReadout"><small>{paceReadout.label}</small><strong>{paceReadout.headline}</strong><span>{paceReadout.detail}</span></div>
          <div className="paceQuickCompare"><div><span>NÓS</span><strong>{(pace.ownMedianMs/1000).toFixed(3)}s</strong></div><span className="paceVs">VS</span><div><span>PELOTÃO</span><strong>{(pace.fieldMedianMs/1000).toFixed(3)}s</strong></div><small>{paceReadout.comparison}</small></div>
        </> : <div className="paceWaiting"><strong>SEM VOLTAS PARA COMPARAR</strong><span>{mode==='demo'?'O arquivo de Palmela só inclui o estado final. Não tem o histórico completo das voltas.':'São necessárias pelo menos duas voltas válidas nossas e dos adversários.'}</span>{mode!=='sim'&&<button className="paceTrySim" onClick={useSimulation}><Play size={15}/> Experimentar com corrida simulada</button>}</div>}
        <button type="button" className="paceDetailsLink" onClick={()=>setPaceOpen(true)}>COMO FUNCIONA <ArrowRight size={15}/></button>
      </section>


      <section className="oracleCard" aria-label="Pitmaster ORACLE">
        <div className="oracleHeader"><div><div className="overline">PITMASTER ORACLE · PIT WINDOW INTELLIGENCE</div><h2><Zap size={20}/> Parar agora ou esperar?</h2></div><span className="sectionTag">{mode==='sim'?'MODELO EXPERIMENTAL':'AGUARDA SIMULAÇÃO'}</span></div>
        {mode === 'sim' && oracle ? <><div className="oracleOptions">{[oracle.now,oracle.later].map((w,i)=><div className={`oracleOption ${oracle.advantageSeconds>1.5 ? (i===1?'preferred':'') : oracle.advantageSeconds< -1.5 && i===0?'preferred':''}`} key={i}><span>{i===0?'PIT AGORA':'PIT EM 2 VOLTAS'}</span><strong>{w.trafficCostSeconds.toFixed(1)} s</strong><small>Custo de tráfego simulado</small><p>À frente: {w.aheadKart?`${racers.find(r=>r.kart===w.aheadKart)?.name||`Kart #${w.aheadKart}`} · #${w.aheadKart} · ${w.aheadSeconds?.toFixed(1)} s`:'—'}</p><p>Atrás: {w.behindKart?`${racers.find(r=>r.kart===w.behindKart)?.name||`Kart #${w.behindKart}`} · #${w.behindKart} · ${w.behindSeconds?.toFixed(1)} s`:'—'}</p></div>)}</div><div className="oracleVerdict"><Zap size={16}/><strong>{oracle.recommendation}</strong><span>Diferença estimada: {Math.abs(oracle.advantageSeconds).toFixed(1)} s</span></div><button type="button" className="pitDetailsBtn" onClick={()=>setOracleOpen(true)}><BarChart3 size={15}/> Comparar janelas em gráfico <ArrowRight size={14}/></button><p className="oracleFoot">Simulação ilustrativa: ritmo congelado, pit de 55 s e uma penalização heurística por tráfego. Não representa previsão real, classificação projetada ou recomendação regulamentar.</p></>
        : <p className="hint">Abre o simulador para comparar janelas fictícias. Dados Apex ou RaceFacer não são suficientes para apresentar esta previsão como fiável.</p>}
      </section>

      <section className="card rcCard" aria-label="Race Control Intelligence">
        <div className="rcCol rcMine">
          <div className="rcHeader"><div className="overline">RACE CONTROL INTELLIGENCE</div><button className="rcMore" onClick={() => { setRaceControlFilter('mine'); setRaceControlOpen(true) }}>Ver histórico <ArrowRight size={14}/></button></div>
          <div className="rcTitle"><ShieldAlert size={21}/><strong>As nossas ocorrências</strong><span className="rcKartBadge">#{selectedKart || '—'}</span></div>
          <div className="rcCounts">
            <div className={`rcCount ${warningCount ? 'hasWarning' : ''}`}><span>WARNINGS</span><strong>{warningCount}</strong></div>
            <div className={`rcCount ${penaltyCount ? 'hasPenalty' : ''}`}><span>PENALIZAÇÕES</span><strong>{penaltyCount}</strong></div>
          </div>
          {myNotices.length ? <div className="rcLast">
            <span className={`rcMarker ${myNotices[0].type}`}>{noticeTypeLabel(myNotices[0].type)}</span>
            <span className="rcLastText">{myNotices[0].message}</span><time>{myNotices[0].time || '—'}</time>
          </div> : <div className="rcEmpty">Sem warnings ou penalizações comunicados no feed disponível.</div>}
        </div>
        <div className="rcCol rcRivals">
          <div className="rcHeader"><div className="overline">CONCORRENTES DIRETOS</div><button className="rcMore" onClick={() => { setRaceControlFilter('rivals'); setRaceControlOpen(true) }}>Ver todos <ArrowRight size={14}/></button></div>
          <div className="rcTitle"><FlagTriangleRight size={20}/><strong>Rivais em atenção</strong><span className="rcKartBadge">{rivalKarts.length} karts</span></div>
          <div className="rcRivalEvents">
            {rivalNotices.slice(0, 2).map(notice => <div className="rcRivalEvent" key={notice.id}>
              <span className="rcEventKart">{racers.find(r=>r.kart===notice.kart)?.name||`Kart #${notice.kart}`} · #{notice.kart}</span><span className={`rcMarker ${notice.type}`}>{noticeTypeLabel(notice.type)}</span>
              <span className="rcLastText">{notice.message}</span><time>{notice.time || '—'}</time>
            </div>)}
            {rivalNotices.length === 0 && <div className="rcEmpty">Sem comunicações para os rivais acompanhados.</div>}
          </div>
          <div className="rcFollow">
            <span>{projection.rows.length?'Rivais projetados ±2 + próximos em pista.':'Rivais oficiais ±2 + próximos em pista (sem projeção).'}</span>
            <label className="srOnly" htmlFor="rc-add-rival">Seguir kart adicional</label>
            <select id="rc-add-rival" value={rivalToFollow} onChange={event => setRivalToFollow(event.target.value)}><option value="">Outro kart…</option>{racers.filter(r => r.kart !== selectedKart && !followedRivals.includes(r.kart)).map(r => <option key={r.id} value={r.kart}>#{r.kart} · {shortTeam(r.name, 21)}</option>)}</select>
            <button className="rcAdd" disabled={!rivalToFollow} onClick={() => { setFollowedRivals(current => [...new Set([...current, rivalToFollow])]); setRivalToFollow('') }}>Seguir</button>
          </div>
          {followedRivals.length > 0 && <div className="rcPinned">{followedRivals.map(kart => <button key={kart} onClick={() => setFollowedRivals(rivals => rivals.filter(k => k !== kart))} title={`Deixar de seguir #${kart}`}>#{kart} <X size={12}/></button>)}</div>}
        </div>
      </section>
      </details>


      </>}
      </> : <StrategyPanel
        strategy={strategy} onChange={setStrategy} drivers={drivers.names}
        turns={drivers.turns} pitVisits={pitVisits} now={now}
        onAddDriver={name => setDrivers(d => ({ ...d, names: d.names.includes(name) ? d.names : [...d.names, name] }))}
        onRemoveDriver={name => setDrivers(d => ({ ...d, names: d.names.filter(n => n !== name) }))}
        onSelectNext={stageDriver} onResetRace={resetRace} onBack={() => setView('race')}
      />}
      <footer className="footer"><span>PITMASTER <b>© 2026</b> · FEITO PARA DECIDIR MAIS DEPRESSA</span><span>{drivers.turns.length} TURNOS REGISTADOS · DADOS DE PILOTOS GUARDADOS NESTE DISPOSITIVO</span></footer>
    </main>

    {projectionOpen && <div className="overlay" onMouseDown={event=>{if(event.target===event.currentTarget)setProjectionOpen(false)}}>
      <div className="modal analyticsModal" role="dialog" aria-modal="true" aria-labelledby="projection-card-title">
        <div className="modalHead"><div><div className="overline">PITMASTER / PROJECTED FINISH</div><h2 id="projection-card-title">Posição final projetada</h2></div><button className="iconBtn" onClick={()=>setProjectionOpen(false)} aria-label="Fechar"><X size={20}/></button></div>
        {projection.reasons.length>0?<div className="projectionEmpty"><CircleHelp size={20}/><div><h3>Faltam dados para projetar a chegada</h3>{projection.reasons.map((reason,i)=><p key={i}>{reason}</p>)}</div></div>:
        <><div className="projectionDrawerNumbers"><div><span>POSIÇÃO OFICIAL</span><strong>P{mine?.position??'—'}</strong></div><ArrowRight size={23}/><div><span>FINAL PROJETADO</span><strong>P{projectedNeighbors.ours?.predictedPosition??'—'}</strong></div></div>
        <div className="projectionDrawerRivals"><h3>Disputa provável na chegada</h3>{[projectedNeighbors.ahead,projectedNeighbors.ours,projectedNeighbors.behind].filter((r):r is NonNullable<typeof r>=>!!r).map(r=><div key={r.kart}><strong>P{r.predictedPosition} · {r.name}</strong><span>Kart #{r.kart} · {r.remainingPits} pits restantes · {projectedNeighbors.ours&&r.kart!==selectedKart?projectedGap(r,projectedNeighbors.ours):'Nossa equipa'}</span></div>)}</div>
        <RivalBarGraph rows={[projectedNeighbors.ahead,projectedNeighbors.ours,projectedNeighbors.behind].filter((r):r is NonNullable<typeof r>=>!!r).map(r=>({kart:r.kart,name:r.name,ms:r.typicalLapMs,ours:r.kart===selectedKart}))}/>
        <p className="hint">Simulação de ritmo constante, pit stops obrigatórios e tempo restante. Não constitui resultado oficial nem tem em conta tráfego ou incidentes inesperados.</p></>}
        <button className="solidBtn full" onClick={()=>{setProjectionOpen(false);setRankingMode('projected');setView('ranking');setFocusMode(false)}}>Abrir classificação virtual completa <ArrowRight size={16}/></button>
      </div>
    </div>}
    {stintsOpen && <div className="overlay" onMouseDown={event=>{if(event.target===event.currentTarget)setStintsOpen(false)}}>
      <div className="modal stintAnalysisModal" role="dialog" aria-modal="true" aria-labelledby="stints-title">
        <div className="modalHead"><div><div className="overline">DRIVER INTELLIGENCE · {mode==='sim'?'DADOS FICTÍCIOS':'DADOS DA PROVA'}</div><h2 id="stints-title">Análise por stint</h2></div><button className="iconBtn" onClick={()=>setStintsOpen(false)} aria-label="Fechar"><X size={20}/></button></div>
        <p className="stintAnalysisIntro">Detalhe para consulta: piloto, duração, voltas e ritmo relativo ao pelotão no mesmo período. Os resultados dependem das voltas disponíveis na fonte de dados.</p>
        <StintPaceGraph stints={stintDetails} />
        <div className="stintReportScroll"><table className="stintReport"><thead><tr><th>STINT</th><th>PILOTO</th><th>INÍCIO / FIM</th><th>DURAÇÃO</th><th>VOLTAS</th><th>MÉDIA TÍPICA*</th><th>VS PELOTÃO</th></tr></thead><tbody>
          {stintDetails.map(item=><tr key={`${item.number}-${item.startedAt}`}><td>#{item.number}</td><td><strong>{item.driver}</strong>{item.endedAt===null&&<small>Em curso</small>}</td><td>{new Date(item.startedAt).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'})} – {item.endedAt===null?'Agora':new Date(item.endedAt).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'})}</td><td>{clock(item.durationMs)}</td><td>{item.laps || '—'}</td><td>{item.medianMs===null?'—':`${(item.medianMs/1000).toFixed(3)} s`}</td><td><span className={`stintPaceTag ${item.deltaToFieldMs===null?'unknown':item.deltaToFieldMs<=-150?'positive':item.deltaToFieldMs>=150?'danger':'similar'}`}>{item.deltaToFieldMs===null?'Sem comparação':Math.abs(item.deltaToFieldMs)<=150?'Ritmo semelhante':`${Math.abs(item.deltaToFieldMs/1000).toFixed(2)}s ${item.deltaToFieldMs<0?'mais rápido':'mais lento'}`}</span></td></tr>)}
          {!stintDetails.length&&<tr><td colSpan={7} className="stintNoData">Ainda não foi registado nenhum stint.</td></tr>}
        </tbody></table></div>
        <p className="hint">*Utiliza a mediana das voltas válidas, não a média aritmética. Diferenças vs pelotão calculadas no mesmo intervalo de tempo, quando há pelo menos duas voltas por adversário. Voltas de boxes podem exigir exclusão manual.</p>
        <button className="quietBtn full" onClick={()=>setStintsOpen(false)}>Voltar à corrida</button>
      </div>
    </div>}
    {paceOpen && <div className="overlay" onMouseDown={event=>{ if(event.target===event.currentTarget) setPaceOpen(false) }}>
      <div className="modal paceModal" role="dialog" aria-modal="true" aria-labelledby="pace-title">
        <div className="modalHead"><div><div className="overline">PITMASTER / PACE INTELLIGENCE</div><h2 id="pace-title">Ritmo relativo e ranking de volta</h2></div><button className="iconBtn" onClick={()=>setPaceOpen(false)} aria-label="Fechar"><X size={20}/></button></div>
        <div className="paceHowTo"><strong>Como ler esta métrica?</strong><p>Não basta uma volta ser lenta. Se todos abrandarem, podes continuar competitivo. O Pitmaster compara o teu ritmo com o pelotão e mostra se estás a ganhar ou perder tempo <em>relativamente aos outros</em>.</p></div>
        {pace && paceReadout ? <>
          <div className={`paceVerdict ${paceReadout.tone}`}><small>{paceReadout.label}</small><strong>{paceReadout.headline}</strong><p>{paceReadout.comparison}</p><p>{paceReadout.detail}</p></div>
          <div className="paceNumbers">
            <div><small>NÓS · MEDIANA DAS ÚLTIMAS 5</small><strong>{(pace.ownMedianMs/1000).toFixed(3)} s</strong><span>Menor tempo = mais rápido</span></div>
            <div><small>OUTROS · RITMO RECENTE</small><strong>{(pace.fieldMedianMs/1000).toFixed(3)} s</strong><span>Mediana por kart, depois do pelotão</span></div>
            <div><small>DIFERENÇA ATUAL</small><strong>{(Math.abs(pace.deltaMs)/1000).toFixed(3)} s</strong><span>{Math.abs(pace.deltaMs)<=150?'Ritmo semelhante':pace.deltaMs<0?'Somos mais rápidos':'Somos mais lentos'}</span></div>
          </div>
          <div className="paceEvolution"><h3>O que mudou desde o período anterior?</h3><strong>{paceReadout.change}</strong><p>{paceReadout.conditionNote || (pace.trendMs===null?'Ainda não há duas amostras completas para avaliar evolução.':'Compara a mudança do nosso tempo com a mudança do pelotão, não apenas o tempo absoluto.')}</p></div>
          <p className="hint">Amostra atual: {pace.sampleOwn} voltas da equipa e {pace.sampleKarts} karts adversários. Voltas de 40–240 s; a identificação de voltas de box ainda depende dos dados disponíveis. A análise sugere tendências, não comprova causas.</p>
        </> : <div className="paceEmptyExplain"><strong>Ainda não há comparação disponível.</strong><p>{mode==='demo'?'O arquivo histórico de Palmela contém a classificação final, mas não o histórico de cada volta. Experimenta o simulador para veres esta análise em funcionamento.':'Precisamos de várias voltas válidas da nossa equipa e dos restantes karts.'}</p>{mode!=='sim'&&<button className="solidBtn" onClick={()=>{setPaceOpen(false);useSimulation()}}><Play size={16}/> Testar no simulador</button>}</div>}
        <div className="intelligenceGraphs"><PaceTrendGraph laps={data.lapHistory} kart={selectedKart}/><LapRankTrendGraph laps={data.lapHistory} kart={selectedKart}/></div>
        <div className="paceMiniHead"><h3>Ranking da volta atual</h3><strong>{lapRank ? `P${lapRank.rank}/${lapRank.total}` : 'Sem ranking'}</strong></div>
        <p className="hint">{lapRank ? `${lapRank.projected ? `Projeção pelo ${lapRank.checkpoint}` : 'Última volta concluída'}: ${(lapRank.seconds).toFixed(3)} s · confiança ${lapRank.confidence}. Comparação com a mediana recente dos rivais presentes na amostra.` : 'O ranking é calculado após haver histórico suficiente de setores e voltas dos participantes.'}</p>
        <div className="paceMiniHead"><h3>Últimas voltas recebidas da equipa</h3><span>{data.lapHistory.filter(l=>l.kart===selectedKart).length} voltas</span></div>
        <div className="paceLaps">{data.lapHistory.filter(l=>l.kart===selectedKart).slice(-10).reverse().map(l=><div key={l.id}><span>Volta {l.lap ?? '—'}</span><strong>{(l.durationMs/1000).toFixed(3)} s</strong></div>)}{!data.lapHistory.some(l=>l.kart===selectedKart)&&<span>Sem histórico de voltas recebido nesta sessão.</span>}</div>
        <button className="quietBtn full" onClick={()=>setPaceOpen(false)}>Voltar à corrida</button>
      </div>
    </div>}
    {rivalsOpen && <div className="overlay" onMouseDown={event=>{if(event.target===event.currentTarget)setRivalsOpen(false)}}>
      <div className="modal analyticsModal" role="dialog" aria-modal="true" aria-labelledby="rivals-title">
        <div className="modalHead"><div><div className="overline">PITMASTER / RIVAIS</div><h2 id="rivals-title">Comparação com os rivais virtuais</h2></div><button className="iconBtn" onClick={()=>setRivalsOpen(false)} aria-label="Fechar"><X size={20}/></button></div>
        <p className="hint">O gráfico compara o ritmo típico das equipas vizinhas na classificação virtual. A projeção não representa a ordem física atual nem é um resultado garantido.</p>
        <RivalBarGraph rows={[
          ...(projectedNeighbors.ahead ? [{kart:projectedNeighbors.ahead.kart,name:projectedNeighbors.ahead.name,ms:projectedNeighbors.ahead.typicalLapMs}] : []),
          {kart:selectedKart,name:mine?.name || 'Nossa equipa',ms:projectedNeighbors.ours?.typicalLapMs ?? null,ours:true},
          ...(projectedNeighbors.behind ? [{kart:projectedNeighbors.behind.kart,name:projectedNeighbors.behind.name,ms:projectedNeighbors.behind.typicalLapMs}] : []),
        ]}/>
        <div className="analysisExplanations"><span>À frente (virtual): {projectedNeighbors.ahead?`${projectedNeighbors.ahead.name} · #${projectedNeighbors.ahead.kart}`:'—'}</span><span>Atrás (virtual): {projectedNeighbors.behind?`${projectedNeighbors.behind.name} · #${projectedNeighbors.behind.kart}`:'—'}</span></div>
        <button className="solidBtn full" onClick={()=>{setRivalsOpen(false);setRankingMode('projected');setView('ranking')}}>Ver classificação virtual completa <ArrowRight size={15}/></button><button className="quietBtn full" onClick={()=>setRivalsOpen(false)}>Voltar à corrida</button>
      </div>
    </div>}
    {pitsOpen && <div className="overlay" onMouseDown={event=>{if(event.target===event.currentTarget)setPitsOpen(false)}}>
      <div className="modal analyticsModal" role="dialog" aria-modal="true" aria-labelledby="pits-chart-title">
        <div className="modalHead"><div><div className="overline">PITMASTER / PIT STOP INTELLIGENCE</div><h2 id="pits-chart-title">Histórico das paragens</h2></div><button className="iconBtn" onClick={()=>setPitsOpen(false)} aria-label="Fechar"><X size={20}/></button></div>
        <PitDurationGraph visits={mode==='sim'&&simulation?simulation.pitVisits:pitVisits} minSeconds={strategy.rules.minPitSeconds} now={timingNow}/>
        <p className="hint">Paragens registadas pelo gestor ou pelo simulador, não necessariamente o contador oficial do sistema de cronometragem.</p>
        <button className="quietBtn full" onClick={()=>setPitsOpen(false)}>Voltar à corrida</button>
      </div>
    </div>}
    {oracleOpen && oracle && mode==='sim' && <div className="overlay" onMouseDown={event=>{if(event.target===event.currentTarget)setOracleOpen(false)}}>
      <div className="modal analyticsModal" role="dialog" aria-modal="true" aria-labelledby="oracle-chart-title">
        <div className="modalHead"><div><div className="overline">PITMASTER ORACLE · SIMULAÇÃO</div><h2 id="oracle-chart-title">Comparação visual de janelas</h2></div><button className="iconBtn" onClick={()=>setOracleOpen(false)} aria-label="Fechar"><X size={20}/></button></div>
        <OracleWindowGraph now={oracle.now.trafficCostSeconds} later={oracle.later.trafficCostSeconds}/>
        <p className="hint">O modelo assume ritmos constantes e usa aproximações. Não o utilizes para decisões reais sem validação.</p>
        <button className="quietBtn full" onClick={()=>setOracleOpen(false)}>Voltar à corrida</button>
      </div>
    </div>}
    {raceControlOpen && <div className="overlay" onMouseDown={event => { if (event.target === event.currentTarget) setRaceControlOpen(false) }}><div className="modal rcModal" role="dialog" aria-modal="true" aria-labelledby="rc-history-title">
      <div className="modalHead"><div><div className="overline">RACE CONTROL / {PROVIDERS[activeRace.provider].label.toUpperCase()}</div><h2 id="rc-history-title">Histórico de ocorrências</h2></div><button className="iconBtn" onClick={() => setRaceControlOpen(false)} aria-label="Fechar"><X size={20}/></button></div>
      <div className="rcFilters"><button className={raceControlFilter === 'mine' ? 'selected' : ''} onClick={() => setRaceControlFilter('mine')}>A nossa equipa ({myNotices.length})</button><button className={raceControlFilter === 'rivals' ? 'selected' : ''} onClick={() => setRaceControlFilter('rivals')}>Rivais ({rivalNotices.length})</button><button className={raceControlFilter === 'all' ? 'selected' : ''} onClick={() => setRaceControlFilter('all')}>Todos ({data.raceControl.length})</button></div>
      <div className="rcHistory">{shownNotices.map((notice: RaceNotice) => <div key={notice.id} className="rcHistoryRow"><div className="rcHistoryMeta"><time>{notice.time || '—'}</time><strong>{notice.kart ? `${racers.find(r=>r.kart===notice.kart)?.name||`Kart #${notice.kart}`} · Kart #${notice.kart}` : 'Geral'}</strong><span className={`rcMarker ${notice.type}`}>{noticeTypeLabel(notice.type)}</span></div><p>{notice.message}</p></div>)}{!shownNotices.length && <div className="rcEmpty">Não existem ocorrências deste tipo na informação recebida.</div>}</div>
      <p className="rcDisclaimer">Fonte: comunicados disponíveis no feed. O Pitmaster não assume que uma penalização foi cumprida, cancelada ou aplicada à classificação sem confirmação expressa. Correções são apresentadas separadamente.</p>
    </div></div>}
    {pitConfirmOpen&&waitingPit&&<div className="overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setPitConfirmOpen(false)}}><div className="modal pitQuickConfirm" role="dialog" aria-modal="true" aria-labelledby="pit-confirm-title"><div className="modalHead"><div><div className="overline">LIVE TIMING · PIT AUTOMÁTICO</div><h2 id="pit-confirm-title">Quem entrou no kart?</h2></div><button className="iconBtn" onClick={()=>setPitConfirmOpen(false)} aria-label="Fechar, confirmar depois"><X size={20}/></button></div><div className="pitDetected"><Check size={22}/><div><strong>Pit registado automaticamente · Kart #{selectedKart}</strong><small>{waitingPit.exitedAt?'Saída da box detetada':'Aguardar saída da box'} · Hora de receção do sinal</small></div></div><label className="inputLabel" htmlFor="pit-confirm-driver">PILOTO QUE ENTROU</label><select id="pit-confirm-driver" className="formInput" value={pitConfirmDriver} onChange={e=>setPitConfirmDriver(e.target.value)}><option value="">Escolher piloto…</option>{drivers.names.map(n=><option key={n}>{n}</option>)}</select><button className="solidBtn full" disabled={!pitConfirmDriver} onClick={()=>confirmLivePit(pitConfirmDriver)}><Check size={19}/> CONFIRMAR {pitConfirmDriver.toUpperCase()}</button><p className="hint">A confirmação não altera os timestamps reais guardados. Se fechares esta janela, fica uma ação pendente no ecrã.</p></div></div>}
    {celebration&&<div className="overlay victoryOverlay"><div className="confettiArea" aria-hidden="true">{Array.from({length:48},(_,i)=><i key={i} style={{left:`${(i*37)%100}%`,background:['#b7f56c','#f7c66e','#bd9afb','#5bdcf2'][i%4],animationDelay:`${(i%13)*0.11}s`,animationDuration:`${2+(i%5)*0.31}s`}}/>)}</div><div className="modal victoryModal" role="dialog" aria-modal="true" aria-labelledby="victory-title"><PartyPopper size={48} color="#b7f56c"/><div className="overline">A NOSSA EQUIPA CRUZOU A META</div><h2 id="victory-title">BANDEIRA DE XADREZ!</h2><h3>{celebration.team} · Kart #{selectedKart}</h3><p>Conseguimos, equipa! Mais uma endurance concluída. Grande trabalho de todos os pilotos e de quem ajudou nas boxes.</p><div className="victoryPosition">{celebration.position?`P${celebration.position} · classificação provisória`:'Classificação final por confirmar'}</div><button className="solidBtn full" onClick={()=>{setCelebration(null);setView('ranking')}}>VER RESULTADOS <ArrowRight size={17}/></button><button className="quietBtn full" onClick={()=>setCelebration(null)}>Fechar</button></div></div>}
    {showSwap && <div className="overlay" onMouseDown={event => { if (event.target === event.currentTarget) setShowSwap(false) }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="swap-title"><div className="modalHead"><div><div className="overline">DRIVER CHANGE</div><h2 id="swap-title">{active ? 'Troca de piloto' : 'Iniciar turno'}</h2></div><button className="iconBtn" onClick={() => setShowSwap(false)} aria-label="Fechar"><X size={20}/></button></div><p className="modalCopy">{active ? `Terminar o turno de ${active.driver} e iniciar o do próximo piloto.` : 'Seleciona o piloto que vai começar a conduzir.'}</p><label className="inputLabel" htmlFor="driver-next">PRÓXIMO PILOTO</label><select id="driver-next" className="formInput" value={nextDriver} onChange={event => setNextDriver(event.target.value)}><option value="">Selecionar piloto…</option>{drivers.names.map(name => <option key={name} value={name}>{name}</option>)}</select><button className="solidBtn full" disabled={!nextDriver} onClick={() => changeDriver(nextDriver)}><Check size={18}/> Confirmar {active ? 'troca' : 'início'}<ArrowRight size={17}/></button></div></div>}
    {settingsOpen && <div className="overlay" onMouseDown={event => { if (event.target === event.currentTarget) setSettingsOpen(false) }}><div className="modal settingsModal" role="dialog" aria-modal="true" aria-labelledby="settings-title"><div className="modalHead"><div><div className="overline">PITMASTER SYSTEM</div><h2 id="settings-title">Definições</h2></div><button className="iconBtn" onClick={() => setSettingsOpen(false)} aria-label="Fechar"><X size={20}/></button></div>
      <div className="modalSection"><div className="settingsTitle"><Link2 size={19}/> Fonte de cronometragem · {PROVIDERS[activeRace.provider].label}</div><label className="inputLabel" htmlFor="ws-url">{activeRace.provider === 'apex' ? 'ENDEREÇO WEBSOCKET (WSS)' : 'LINK DA PISTA RACEFACER'}</label><input id="ws-url" className="formInput" value={url} onChange={event => {setUrl(event.target.value);setCollection(c=>updateProfile(c,{...activeRace,sourceUrl:event.target.value}))}} placeholder={activeRace.provider === 'apex' ? 'wss://servidor:porta/' : 'https://live.racefacer.com/...'} autoComplete="off"/><p className="hint">{activeRace.provider==='apex'?'O conector Apex é experimental e pode ser recusado pelo servidor. Usa apenas um endereço autorizado.':activeRace.provider==='racefacer'?'Conector Socket.IO experimental baseado em mensagens observadas. A subscrição da pista e o acesso a partir deste navegador ainda não foram validados.':'Utiliza importação de snapshots normalizados.'}</p><div className="modalActions"><button className="solidBtn" disabled={activeRace.provider==='manual'} onClick={connect}><Radio size={17}/> Ligar {PROVIDERS[activeRace.provider].label}</button><button className="quietBtn" onClick={useSimulation}><Layers3 size={17}/> Race Simulator</button>{connected && <button className="quietBtn" onClick={disconnect}><Unplug size={17}/> Desligar</button>}</div><button className="textButton" onClick={() => setShowRaw(s => !s)}>{showRaw ? 'Ocultar' : 'Ver'} última mensagem recebida</button>{showRaw && <pre className="rawBox">{lastMessage || 'Ainda sem mensagens'}</pre>}</div>
      <div className="modalSection"><div className="settingsTitle"><ClipboardList size={19}/> Regulamento e equipa</div><p className="hint">O tempo mínimo e máximo dos stints, o número de paragens, os pilotos e a estratégia definem-se na área Estratégia.</p><button className="quietBtn full" onClick={() => { setSettingsOpen(false); setView('strategy'); setFocusMode(false) }}><ClipboardList size={17}/> Abrir estratégia</button></div>
      <div className="modalSection"><div className="settingsTitle"><Volume2 size={19}/> Alertas sonoros de stint</div><p className="hint">Emite avisos a ~4, 2 e 1 voltas do limite máximo e ao atingir o limite. O navegador pode bloquear áudio sem interação prévia; testa-o neste dispositivo antes da prova.</p><button className="quietBtn full" onClick={()=>{setSoundOn(true);armAudio();window.setTimeout(()=>playSignal('warning'),150)}}><Volume2 size={17}/> Ativar e testar som</button></div>
      <div className="modalSection"><div className="settingsTitle"><History size={19}/> Cópia dos dados</div><p className="hint">Exporta um JSON com pilotos, estratégia, paragens e histórico de cronometragem recebido. Não sincroniza entre dispositivos nem restaura dados automaticamente.</p><button className="quietBtn full" onClick={exportData}>Exportar registos da corrida (.json)</button></div>
      <button className="quietBtn full" onClick={() => {setSettingsOpen(false);setView('setup')}}>Configurar prova e fonte</button><button className="quietBtn full" onClick={() => setSettingsOpen(false)}>Fechar definições</button>
    </div></div>}
  </div>
}

createRoot(document.getElementById('root')!).render(<App/>)
