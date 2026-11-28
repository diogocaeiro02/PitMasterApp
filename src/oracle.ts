import type { Simulation, SimParticipant } from './simulator'

export type OracleWindow = {
  delayLaps: number
  exitAtMs: number
  aheadKart: string | null
  behindKart: string | null
  aheadSeconds: number | null
  behindSeconds: number | null
  trafficCostSeconds: number
  confidence: 'BAIXA' | 'MÉDIA'
}
export type OracleComparison = { now: OracleWindow; later: OracleWindow; advantageSeconds: number; recommendation: string }

/** Fictional traffic model based on simulated lap phases. It is NOT a prediction from Apex data. */
export function comparePitWindows(sim: Simulation, pitSeconds = 55, delayLaps = 2): OracleComparison | null {
  const own = sim.participants.find(p => p.kart === sim.selectedKart)
  if (!own || sim.participants.length < 3 || own.pitUntilMs !== null) return null
  const avg = own.lapMs
  const estimate = (delay: number): OracleWindow => {
    const exitAtMs = sim.timeMs + delay * avg + pitSeconds * 1000
    const others = sim.participants.filter(p => p.kart !== own.kart && p.pitUntilMs === null)
    // Position along the circuit at forecast exit, as a fraction of one full lap.
    // Each opponent holds its current pace: no stochastic future prediction is claimed.
    const phase = (p: SimParticipant) => {
      const elapsed = Math.max(0, exitAtMs - p.startedMs)
      return ((elapsed / p.lapMs) % 1 + 1) % 1
    }
    const ourPhase = (((exitAtMs - own.startedMs) / Math.max(own.lapMs, 1)) % 1 + 1) % 1
    const ahead = others.map(p => ({p, delta: (phase(p) - ourPhase + 1) % 1})).filter(x=>x.delta>0.00001).sort((a,b)=>a.delta-b.delta)[0]
    const behind = others.map(p => ({p, delta: (ourPhase - phase(p) + 1) % 1})).filter(x=>x.delta>0.00001).sort((a,b)=>a.delta-b.delta)[0]
    const aheadSeconds = ahead ? ahead.delta * own.lapMs / 1000 : null
    const behindSeconds = behind ? behind.delta * own.lapMs / 1000 : null
    // Extra time behind slower vehicles: heuristic, capped, illustrative only.
    const slowGap = ahead ? Math.max(0, (ahead.p.lapMs - own.lapMs) / 1000) : 0
    const pressure = aheadSeconds === null ? 0 : Math.max(0, (10 - aheadSeconds) / 10)
    const trafficCostSeconds = Math.round(slowGap * pressure * 4 * 10) / 10
    return {delayLaps:delay,exitAtMs,aheadKart:ahead?.p.kart??null,behindKart:behind?.p.kart??null,
      aheadSeconds:aheadSeconds===null?null:Math.round(aheadSeconds*10)/10,
      behindSeconds:behindSeconds===null?null:Math.round(behindSeconds*10)/10,
      trafficCostSeconds,confidence: delay===0?'MÉDIA':'BAIXA'}
  }
  const now=estimate(0),later=estimate(delayLaps)
  const advantageSeconds = Math.round((now.trafficCostSeconds-later.trafficCostSeconds)*10)/10
  const recommendation = advantageSeconds>1.5 ? `Esperar ${delayLaps} voltas pode reduzir o tráfego` : advantageSeconds< -1.5 ? 'Parar agora pode evitar tráfego' : 'Sem vantagem clara entre as janelas'
  return {now,later,advantageSeconds,recommendation}
}
