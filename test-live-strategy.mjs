import assert from 'node:assert/strict'
import {liveStrategyBudget} from './src/liveStrategy.ts'
const strategy={rules:{raceMinutes:93,minPitSeconds:180},plan:[{id:'a',driver:'A',minutes:45},{id:'b',driver:'B',minutes:45}]}
const b=liveStrategyBudget(strategy,[{driver:'A',startedAt:1000,endedAt:1000+40*60_000}],[{id:'pit',enteredAt:1000,exitedAt:1000+4*60_000}],Date.now())
assert.equal(b.totalMs,(40+4+45)*60_000)
assert.equal(b.deltaMs,-4*60_000)
assert.equal(b.finished,1)
const ongoing=liveStrategyBudget(strategy,[{driver:'A',startedAt:0}],[{id:'pit',enteredAt:0}],50*60_000)
assert.equal(ongoing.drivingMs,(50+45)*60_000)
console.log('Estratégia dinâmica: tempos reais preservados e futuro recalculado OK')
