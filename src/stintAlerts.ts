/** Race-sensitive four-lap alert window. All amounts are milliseconds. */
export function medianRaceLap(values: number[], fallback: number | null): {ms:number|null;confidence:'high'|'low'|'none'} {
  const clean=values.filter(n=>Number.isFinite(n)&&n>=20_000&&n<=240_000).slice(-7).sort((a,b)=>a-b)
  if (clean.length>=3) return {ms:clean.length%2?clean[Math.floor(clean.length/2)]:(clean[clean.length/2-1]+clean[clean.length/2])/2,confidence:'high'}
  if (clean.length>0) return {ms:clean[Math.floor(clean.length/2)],confidence:'low'}
  return {ms:fallback!==null&&fallback>=20_000&&fallback<=240_000?fallback:null,confidence:fallback!==null?'low':'none'}
}
export type StintAlertStage='none'|'four'|'two'|'one'|'limit'
export function stintAlertStage(remainingMs:number|null,lapMs:number|null):StintAlertStage {
  if (remainingMs===null||!Number.isFinite(remainingMs))return 'none'
  if (remainingMs<=0)return 'limit'
  if (lapMs===null || !Number.isFinite(lapMs)||lapMs<=0)return 'none'
  if (remainingMs<=lapMs)return 'one'
  if (remainingMs<=2*lapMs)return 'two'
  if (remainingMs<=4*lapMs)return 'four'
  return 'none'
}
export const stintStagePriority: Record<StintAlertStage,number> = {none:0,four:1,two:2,one:3,limit:4}
