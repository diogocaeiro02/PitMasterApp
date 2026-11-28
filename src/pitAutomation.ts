/** Never trigger a live pit from the baseline snapshot or unconfirmed numerical pit counter. */
export type PitObservation = {kart:string;inPit?:boolean;pitCount?:number;lastPassing?:number}
export type PitTransition='enter'|'exit'|null
export function pitTransition(previous:PitObservation|null,current:PitObservation|null):PitTransition {
  if(!previous||!current||current.kart!==previous.kart)return null
  if(previous.inPit===false&&current.inPit===true)return 'enter'
  if(previous.inPit===true&&current.inPit===false)return 'exit'
  return null
}
