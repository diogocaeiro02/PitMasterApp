import { ArrowRight, Clock3, Timer, AlertTriangle } from 'lucide-react'
import { stintClock, type StintHudResult } from './stintHud'

type Props = {
  driver: string | null
  result: StintHudResult
  simulated: boolean
  paused: boolean
  onManage: () => void
}

export function StintHUD({ driver, result, simulated, paused, onManage }: Props) {
  const urgent = result.status === 'limit-exceeded' || result.status === 'late'
  const attention = result.status === 'approaching'
  return (
    <aside className={`stintHud stintHud--${result.status}`} aria-label="Cronómetro fixo do stint">
      <div className="stintHudIdentity">
        <div className="stintHudEyebrow"><span className="stintHudDot"/> CONTROLO DO STINT {simulated && <b>· SIMULAÇÃO{paused ? ' PAUSADA' : ''}</b>}</div>
        <strong title={driver || 'Nenhum piloto ativo'}>{driver || 'Sem piloto em pista'}</strong>
        <span className="stintHudContext">{result.status === 'idle' ? 'A aguardar início' : result.status === 'pit' ? 'Pit stop em curso' : result.isPlan ? 'Janela prevista no plano' : 'Referência: regulamento'}</span>
      </div>
      <div className="stintHudMetric">
        <span><Timer size={13}/> STINT ATUAL</span>
        <strong className="stintHudDigits">{stintClock(result.elapsedMs)}</strong>
      </div>
      <div className="stintHudMetric stintHudDeadline">
        <span>{urgent ? <AlertTriangle size={13}/> : <Clock3 size={13}/>} {result.targetLabel}</span>
        <strong className="stintHudDigits">{result.status === 'pit' ? 'BOXES' : stintClock(result.remainingMs)}</strong>
      </div>
      <div className="stintHudTools">
        <span className="stintHudNote" title={result.explanation}>{result.explanation}</span>
        <button type="button" className="stintHudButton" onClick={onManage}>
          {simulated ? 'VER PILOTO' : result.status === 'idle' ? 'INICIAR TURNO' : 'GERIR PILOTO'} <ArrowRight size={15}/>
        </button>
      </div>
      <div className="stintHudTrack" role="progressbar" aria-label="Progresso do stint para o objetivo" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(result.progress)}>
        <span style={{ width: `${result.progress}%` }}/>
      </div>
      {attention && <span className="stintHudSr" role="status">Aproximação à entrada nas boxes.</span>}
    </aside>
  )
}
