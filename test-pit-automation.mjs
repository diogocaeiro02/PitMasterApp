import assert from 'node:assert/strict'
import {pitTransition} from './src/pitAutomation.ts'
assert.equal(pitTransition(null,{kart:'19',inPit:true}),null)
assert.equal(pitTransition({kart:'19',inPit:false},{kart:'19',inPit:true}),'enter')
assert.equal(pitTransition({kart:'19',inPit:true},{kart:'19',inPit:true}),null)
assert.equal(pitTransition({kart:'19',inPit:true},{kart:'19',inPit:false}),'exit')
assert.equal(pitTransition({kart:'19',inPit:false},{kart:'19',inPit:false,pitCount:2}),null)
assert.equal(pitTransition({kart:'19',inPit:true},{kart:'20',inPit:false}),null)
console.log('Pit automatico: transições reais, isolamento de kart e deduplicação OK')
