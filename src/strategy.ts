/** Strategy rules are entered by the team manager; null means not configured. */
export type RaceRules = {
  raceMinutes: number | null
  minStintMinutes: number | null
  maxStintMinutes: number | null
  minTeamStints: number | null
  minDriverStints: number | null
  minPitStops: number | null
  minPitSeconds: number | null
  maxDriverMinutes: number | null
}
export type PlannedStint = { id: string; driver: string; minutes: number; pitSeconds?: number | null }
export type Strategy = { rules: RaceRules; plan: PlannedStint[] }
export type ActualTurn = { driver: string; startedAt: number; endedAt?: number }

export const EMPTY_RULES: RaceRules = {
  raceMinutes: null,
  minStintMinutes: null,
  maxStintMinutes: null,
  minTeamStints: null,
  minDriverStints: null,
  minPitStops: null,
  minPitSeconds: null,
  maxDriverMinutes: null,
}
export const EMPTY_STRATEGY: Strategy = { rules: { ...EMPTY_RULES }, plan: [] }
export const STRATEGY_STORE = 'pitmaster-strategy-v1'

const RULE_KEYS = Object.keys(EMPTY_RULES) as (keyof RaceRules)[]
function validNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}
export function restoreStrategy(raw: string | null): Strategy {
  if (!raw) return structuredClone(EMPTY_STRATEGY)
  try {
    const item = JSON.parse(raw) as Partial<Strategy>
    const rules = { ...EMPTY_RULES }
    for (const key of RULE_KEYS) rules[key] = validNumber(item.rules?.[key])
    const plan = Array.isArray(item.plan) ? item.plan
      .filter(s => s && typeof s.id === 'string' && typeof s.driver === 'string' && Number.isFinite(s.minutes) && s.minutes >= 0)
      .slice(0, 120).map(s => ({ id: s.id, driver: s.driver, minutes: Number(s.minutes) })) : []
    return { rules, plan }
  } catch { return structuredClone(EMPTY_STRATEGY) }
}
export const sumStintMinutes = (plan: PlannedStint[]) => plan.reduce((sum, s) => sum + s.minutes, 0)
export const plannedPitStops = (plan: PlannedStint[]) => Math.max(0, plan.length - 1)
export const budgetMinutes = (strategy: Strategy): number =>
  sumStintMinutes(strategy.plan) + strategy.plan.slice(0,-1).reduce((sum,stint)=>sum+(stint.pitSeconds ?? strategy.rules.minPitSeconds ?? 0)/60,0)
export function actualDriverStats(turns: ActualTurn[], now: number) {
  const stats: Record<string, { stints: number; minutes: number }> = {}
  for (const turn of turns) {
    if (!stats[turn.driver]) stats[turn.driver] = { stints: 0, minutes: 0 }
    stats[turn.driver].stints += 1
    stats[turn.driver].minutes += Math.max(0, ( (turn.endedAt ?? now) - turn.startedAt) / 60_000)
  }
  return stats
}
export function validateStrategy(strategy: Strategy, drivers: string[]): string[] {
  const { rules, plan } = strategy
  const errors: string[] = []
  const max = rules.maxStintMinutes, min = rules.minStintMinutes
  if (min !== null && min <= 0) errors.push('O stint mínimo tem de ser superior a 0 minutos.')
  if (max !== null && max <= 0) errors.push('O stint máximo tem de ser superior a 0 minutos.')
  if (min !== null && max !== null && min > max) errors.push('O stint mínimo não pode superar o máximo.')
  if (rules.raceMinutes !== null && rules.raceMinutes <= 0) errors.push('Define uma duração de corrida superior a 0.')
  if (rules.maxDriverMinutes !== null && rules.maxDriverMinutes <= 0) errors.push('O limite total por piloto tem de ser superior a 0.')
  if (!plan.length) return errors
  if (rules.raceMinutes === null) errors.push('Indica a duração da corrida para validar a estratégia.')
  if (min === null || max === null) errors.push('Indica o stint mínimo e máximo para validar a estratégia.')
  if (rules.minTeamStints !== null && plan.length < rules.minTeamStints) errors.push(`São necessários pelo menos ${rules.minTeamStints} stints no total.`)
  if (rules.minPitStops !== null && plannedPitStops(plan) < rules.minPitStops) errors.push(`O plano prevê apenas ${plannedPitStops(plan)} paragens entre stints, abaixo das ${rules.minPitStops} obrigatórias.`)
  plan.forEach((stint, i) => {
    if (i < plan.length-1 && stint.pitSeconds != null && (!Number.isFinite(stint.pitSeconds) || stint.pitSeconds < 0 || (rules.minPitSeconds !== null && stint.pitSeconds < rules.minPitSeconds))) errors.push(`Pit após stint ${i+1}: tempo inferior ao mínimo ou inválido.`)
    if (!drivers.includes(stint.driver)) errors.push(`Stint ${i + 1}: escolhe um piloto da equipa.`)
    if (stint.minutes <= 0 || !Number.isFinite(stint.minutes)) errors.push(`Stint ${i + 1}: duração inválida.`)
    if (min !== null && stint.minutes < min - 0.015) errors.push(`Stint ${i + 1}: ${stint.minutes} min, inferior ao mínimo de ${min}.`)
    if (max !== null && stint.minutes > max + 0.015) errors.push(`Stint ${i + 1}: ${stint.minutes} min, superior ao máximo de ${max}.`)
  })
  const counts: Record<string, number> = {}
  const totals: Record<string, number> = {}
  plan.forEach(s => { counts[s.driver] = (counts[s.driver] ?? 0) + 1; totals[s.driver] = (totals[s.driver] ?? 0) + s.minutes })
  for (const driver of drivers) {
    if (rules.minDriverStints !== null && (counts[driver] ?? 0) < rules.minDriverStints)
      errors.push(`${driver}: ${counts[driver] ?? 0} stint(s); mínimo exigido: ${rules.minDriverStints}.`)
    if (rules.maxDriverMinutes !== null && (totals[driver] ?? 0) > rules.maxDriverMinutes + 0.015)
      errors.push(`${driver}: ${totals[driver].toFixed(1)} min de condução; máximo total: ${rules.maxDriverMinutes}.`)
  }
  if (rules.raceMinutes !== null && Math.abs(budgetMinutes(strategy) - rules.raceMinutes) > 0.07) {
    errors.push(`O plano cobre ${budgetMinutes(strategy).toFixed(2)} de ${rules.raceMinutes} minutos de prova (incluindo boxes configuradas).`)
  }
  return [...new Set(errors)]
}
export type GenerateResult = { plan: PlannedStint[]; error: string | null }
/** Generates a balanced baseline only. It does not account for race pace, cautions or pit windows. */
export function generatePlan(rules: RaceRules, drivers: string[]): GenerateResult {
  const available = drivers.filter(Boolean)
  if (!available.length) return { plan: [], error: 'Adiciona pelo menos um piloto à equipa.' }
  const min = rules.minStintMinutes, max = rules.maxStintMinutes, race = rules.raceMinutes
  if (min === null || max === null || race === null || min <= 0 || max <= 0 || race <= 0)
    return { plan: [], error: 'Para gerar o plano, define duração da corrida, stint mínimo e máximo.' }
  if (min > max) return { plan: [], error: 'O stint mínimo não pode superar o máximo.' }
  const countFloor = Math.max(1, rules.minTeamStints ?? 1, (rules.minPitStops ?? 0) + 1, (rules.minDriverStints ?? 0) * available.length)
  for (let count = countFloor; count <= 120; count++) {
    const pitSeconds = (count - 1) * (rules.minPitSeconds ?? 0)
    const drivingMinutes = race - pitSeconds / 60
    if (drivingMinutes <= 0) break
    const average = drivingMinutes / count
    if (average > max + 0.00001) continue
    if (average < min - 0.00001) break
    const totalHundredths = Math.round(drivingMinutes * 100)
    const normal = Math.floor(totalHundredths / count)
    const remainder = totalHundredths - normal * count
    const plan: PlannedStint[] = Array.from({ length: count }, (_, idx) => ({
      id: `stint-${idx + 1}-${Date.now()}`,
      driver: available[idx % available.length],
      minutes: (normal + (idx < remainder ? 1 : 0)) / 100,
    }))
    if (validateStrategy({ rules, plan }, available).length === 0) return { plan, error: null }
  }
  return { plan: [], error: 'Não existe uma distribuição equilibrada que cumpra todas as regras. Ajusta os limites ou edita os stints manualmente.' }
}
/** Actual-driving alerts are independent of whether the planned strategy is valid. */
export function actualRuleAlerts(turns: ActualTurn[], rules: RaceRules, now: number): string[] {
  const warnings: string[] = []
  turns.forEach((turn, index) => {
    const minutes = Math.max(0, ((turn.endedAt ?? now) - turn.startedAt) / 60_000)
    if (turn.endedAt !== undefined && rules.minStintMinutes !== null && minutes + 0.0001 < rules.minStintMinutes)
      warnings.push(`Stint real ${index + 1} (${turn.driver}): ${minutes.toFixed(1)} min, abaixo do mínimo.`)
    if (rules.maxStintMinutes !== null && minutes > rules.maxStintMinutes + 0.0001)
      warnings.push(`Stint real ${index + 1} (${turn.driver}): ${minutes.toFixed(1)} min, acima do máximo.`)
  })
  if (rules.maxDriverMinutes !== null) {
    const stats = actualDriverStats(turns, now)
    Object.entries(stats).forEach(([driver, info]) => {
      if (info.minutes > rules.maxDriverMinutes! + 0.0001)
        warnings.push(`${driver}: ${info.minutes.toFixed(1)} min acumulados, acima do máximo total.`)
    })
  }
  return warnings
}
