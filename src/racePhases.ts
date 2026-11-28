export type RacePhase='preparation'|'practice'|'qualifying'|'superqualifying'|'race'|'results'
export const PHASES: {value:RacePhase; label:string}[]=[
  {value:'preparation',label:'Preparação'},{value:'practice',label:'Treinos'},
  {value:'qualifying',label:'Qualificação'},{value:'superqualifying',label:'Superqualificação'},
  {value:'race',label:'Corrida'},{value:'results',label:'Resultados'}]
export type PhaseConfig={current:RacePhase; karts:Partial<Record<RacePhase,string>>;superqualifying:boolean;practice:boolean;qualifyingMinutes?:number|null}
export const DEFAULT_PHASES:PhaseConfig={current:'preparation',karts:{},superqualifying:false,practice:false,qualifyingMinutes:null}
export function readPhases(raw:string|null):PhaseConfig {
  try {const p=JSON.parse(raw||'null');if(!p||!PHASES.some(x=>x.value===p.current))return structuredClone(DEFAULT_PHASES)
    return {current:p.current,karts:typeof p.karts==='object'&&p.karts?p.karts:{},superqualifying:!!p.superqualifying,practice:!!p.practice,qualifyingMinutes:Number.isFinite(p.qualifyingMinutes)&&p.qualifyingMinutes>0?p.qualifyingMinutes:null}
  }catch{return structuredClone(DEFAULT_PHASES)}
}
