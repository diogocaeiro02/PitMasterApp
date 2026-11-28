import assert from 'node:assert/strict'
import { restorePits,pitOverview } from './src/pit.ts'
assert.deepEqual(restorePits('broken'),[])
const list=[{id:'a',enteredAt:0,exitedAt:35000},{id:'b',enteredAt:100000}]
const v=pitOverview(list,130000,40,4)
assert.equal(v.completed,1)
assert.equal(v.currentMs,30000)
assert.equal(v.remaining,3)
assert.equal(v.minTimeRemainingMs,10000)
assert.equal(v.shortVisits.length,1)
console.log('Testes Pit Stop Intelligence passaram.')
