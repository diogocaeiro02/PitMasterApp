import type {Strategy,ActualTurn} from './strategy'
import type {PitVisit} from './pit'
/** Replan the future without retroactively editing actual stints/pit durations.
 * Estimated total remains a scenario; the official finishing clock is separate. */
export function liveStrategyBudget(strategy:Strategy, turns:ActualTurn[], pits:PitVisit[], now:number){
  let drivingMs=0,pitMs=0
  let finished=0
  strategy.plan.forEach((stint,i)=>{
    const actual=turns[i]
    if(actual?.endedAt!==undefined){
      drivingMs+=Math.max(0,actual.endedAt-actual.startedAt)
      finished++
    }else if(actual){drivingMs+=Math.max(stint.minutes*60_000,Math.max(0,now-actual.startedAt))}
    else drivingMs+=Math.max(0,stint.minutes)*60_000
    if(i<strategy.plan.length-1){
      const pit=pits[i]
      const plannedMs=Math.max(0,(stint.pitSeconds??strategy.rules.minPitSeconds??0)*1000)
      pitMs+=pit?.exitedAt!==undefined?Math.max(0,pit.exitedAt-pit.enteredAt):pit?Math.max(plannedMs,Math.max(0,now-pit.enteredAt)):plannedMs
    }
  })
  const totalMs=drivingMs+pitMs
  const deltaMs=strategy.rules.raceMinutes===null?null:totalMs-strategy.rules.raceMinutes*60_000
  return {totalMs,drivingMs,pitMs,deltaMs,finished}
}
