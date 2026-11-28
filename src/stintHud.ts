/** Single source of truth for the persistent stint countdown.
 * It never invents a pit target when neither the current plan nor the race limit is configured.
 */
export type StintHudInput = {
  driver: string | null
  elapsedMs: number
  plannedMinutes: number | null
  minMinutes: number | null
  maxMinutes: number | null
  inPit: boolean
}
export type StintHudStatus = 'idle' | 'running' | 'approaching' | 'late' | 'limit-exceeded' | 'pit'
export type StintHudResult = {
  status: StintHudStatus
  elapsedMs: number
  remainingMs: number | null
  progress: number
  targetLabel: string
  explanation: string
  isPlan: boolean
}
const toMs = (minutes: number | null): number | null =>
  minutes !== null && Number.isFinite(minutes) && minutes > 0 ? minutes * 60_000 : null

export function computeStintHud(input: StintHudInput): StintHudResult {
  const elapsedMs = Number.isFinite(input.elapsedMs) ? Math.max(0, input.elapsedMs) : 0
  const maxMs = toMs(input.maxMinutes)
  const minMs = toMs(input.minMinutes)
  const requestedPlanMs = toMs(input.plannedMinutes)
  const validPlanMs = requestedPlanMs !== null && (minMs === null || requestedPlanMs >= minMs) ? requestedPlanMs : null
  const targetMs = validPlanMs === null ? maxMs : maxMs === null ? validPlanMs : Math.min(validPlanMs, maxMs)
  const isPlan = validPlanMs !== null && targetMs === validPlanMs

  if (!input.driver) {
    return { status: 'idle', elapsedMs: 0, remainingMs: null, progress: 0,
      targetLabel: 'BOX POR DEFINIR', explanation: 'Inicia um turno para ativar o contador.', isPlan: false }
  }
  if (input.inPit) {
    return { status: 'pit', elapsedMs, remainingMs: null,
      progress: targetMs === null ? 0 : Math.min(100, elapsedMs / targetMs * 100),
      targetLabel: 'EM BOXES', explanation: 'Paragem em curso. Confirma a troca de piloto ao sair.', isPlan }
  }
  if (maxMs !== null && elapsedMs > maxMs) {
    return { status: 'limit-exceeded', elapsedMs, remainingMs: 0, progress: 100,
      targetLabel: 'LIMITE EXCEDIDO', explanation: 'Stint acima do máximo configurado. Verifica o regulamento.', isPlan: false }
  }
  if (targetMs === null) {
    return { status: 'running', elapsedMs, remainingMs: null, progress: 0,
      targetLabel: 'BOX POR DEFINIR', explanation: 'Define o plano de stints ou o limite máximo na Estratégia.', isPlan: false }
  }
  const remainingMs = Math.max(0, targetMs - elapsedMs)
  const progress = Math.min(100, elapsedMs / targetMs * 100)
  const status: StintHudStatus = remainingMs === 0 ? 'late' : remainingMs <= Math.min(5 * 60_000, targetMs * 0.15) ? 'approaching' : 'running'
  const explanation = status === 'late' ? (isPlan ? 'Hora de box planeada ultrapassada; confirma a estratégia.' : 'Atingiste o limite máximo: prepara a entrada nas boxes.')
    : isPlan ? 'Contagem para a entrada nas boxes planeada.' : 'Sem pit planeado: contagem até ao máximo permitido.'
  return { status, elapsedMs, remainingMs, progress, targetLabel: isPlan ? 'BOX PLANEADA EM' : 'ATÉ LIMITE DE BOX', explanation, isPlan }
}

export function stintClock(ms: number | null): string {
  if (ms === null) return '—'
  const seconds = Math.floor(Math.max(0, ms) / 1000)
  return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}
