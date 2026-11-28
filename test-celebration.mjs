import assert from 'node:assert/strict'
import {shouldCelebrate} from './src/finishCelebration.ts'
const b={sessionFinished:false,oursCrossed:false,alreadyCelebrated:false,live:true}
assert.equal(shouldCelebrate({...b,sessionFinished:true}),false)
assert.equal(shouldCelebrate({...b,oursCrossed:true}),false)
assert.equal(shouldCelebrate({...b,oursCrossed:true,sessionFinished:true}),true)
assert.equal(shouldCelebrate({...b,oursCrossed:true,sessionFinished:true,alreadyCelebrated:true}),false)
assert.equal(shouldCelebrate({...b,oursCrossed:true,sessionFinished:true,live:false}),false)
console.log('Celebração: só passagem nossa após fim e apenas uma vez OK')
