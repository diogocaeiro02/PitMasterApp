import assert from 'node:assert/strict'
import {computeStintHud,stintClock} from './src/stintHud.ts'
const base={driver:'Piloto 1',elapsedMs:33*60000,minMinutes:25,maxMinutes:45,plannedMinutes:null,inPit:false}
const deadline=computeStintHud(base)
assert.equal(deadline.targetLabel,'ATÉ LIMITE DE BOX')
assert.equal(deadline.remainingMs,12*60000)
assert.equal(deadline.status,'running')
assert.equal(stintClock(deadline.remainingMs),'00:12:00')
const planned=computeStintHud({...base,plannedMinutes:40})
assert.equal(planned.remainingMs,7*60000)
assert.equal(planned.targetLabel,'BOX PLANEADA EM')
assert.equal(computeStintHud({...base,elapsedMs:38*60000,plannedMinutes:40}).status,'approaching')
assert.equal(computeStintHud({...base,elapsedMs:41*60000,plannedMinutes:40}).status,'late')
assert.equal(computeStintHud({...base,elapsedMs:46*60000}).status,'limit-exceeded')
assert.equal(computeStintHud({...base,elapsedMs:0,plannedMinutes:20}).remainingMs,45*60000) // invalid: below minimum
assert.equal(computeStintHud({...base,inPit:true}).status,'pit')
assert.equal(computeStintHud({...base,driver:null}).status,'idle')
assert.equal(computeStintHud({...base,maxMinutes:null,plannedMinutes:null}).remainingMs,null)
assert.equal(computeStintHud({...base,maxMinutes:43,plannedMinutes:50}).targetLabel,'ATÉ LIMITE DE BOX')
assert.equal(stintClock(0),'00:00:00')
console.log('Stint HUD: 12 verificações passaram.')
