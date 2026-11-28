/** A race simulator is a sandbox. Never continue showing a disconnected live feed as if it were current. */
export type SourceMode = 'demo'|'live'|'import'|'empty'
export type SessionOrigin<T> = { mode: SourceMode; data: T; kart: string }
export function resumeAfterSimulation<T>(origin: SessionOrigin<T>|null): {
  mode: Exclude<SourceMode,'live'>; data: T|null; kart: string|null; reconnectRequired: boolean
} {
  if(!origin) return {mode:'empty',data:null,kart:null,reconnectRequired:false}
  if(origin.mode==='live') return {mode:'empty',data:null,kart:origin.kart,reconnectRequired:true}
  return {mode:origin.mode,data:origin.data,kart:origin.kart,reconnectRequired:false}
}
