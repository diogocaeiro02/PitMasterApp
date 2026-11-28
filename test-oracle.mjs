import assert from 'node:assert/strict'
import { comparePitWindows } from './src/oracle.ts'
const p=(kart,startedMs,lapMs)=>({id:kart,kart,name:kart,baseMs:lapMs,lap:1,startedMs,lapMs,stage:0,nextAtMs:100000,sectorMs:[null,null,null],lastLapMs:null,bestLapMs:null,pitUntilMs:null})
const sim={timeMs:100000,selectedKart:'7',participants:[p('7',0,65000),p('3',1500,68000),p('4',2000,63000)]}
const result=comparePitWindows(sim)
assert.ok(result)
assert.equal(result.now.delayLaps,0)
assert.equal(result.later.delayLaps,2)
assert.ok(Number.isFinite(result.advantageSeconds))
assert.equal(comparePitWindows({...sim,participants:[]}),null)
console.log('ORACLE: cenários e limites OK')
