import assert from 'node:assert/strict'
import {resumeAfterSimulation} from './src/simulatorSession.ts'
const original={mode:'import',data:{racers:[{kart:'88'}]},kart:'88'}
assert.deepEqual(resumeAfterSimulation(original),{mode:'import',data:original.data,kart:'88',reconnectRequired:false})
const live={mode:'live',data:{racers:[{kart:'7'}]},kart:'7'}
assert.deepEqual(resumeAfterSimulation(live),{mode:'empty',data:null,kart:'7',reconnectRequired:true})
assert.deepEqual(resumeAfterSimulation(null),{mode:'empty',data:null,kart:null,reconnectRequired:false})
console.log('Simulador: regressar a importação; live exige reconexão; saída segura OK')
