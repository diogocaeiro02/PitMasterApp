import assert from 'node:assert/strict'
import { parseLapTime, median, paceSummary, lapPerformance } from './src/pace.ts'
assert.equal(parseLapTime('1:04.354'),64354)
assert.equal(parseLapTime('1:33.732'),93732)
assert.equal(parseLapTime(''), null)
assert.equal(parseLapTime('bad'), null)
assert.equal(median([5,1,4,2]),3)
const laps=[]; let id=0
for(const kart of ['7','8','9']) for(let lap=1;lap<=10;lap++) {
  const base= kart==='7' ? 64000 : kart==='8' ? 64500 : 65000
  const slowdown=lap>5?1900:0
  laps.push({id:String(++id),kart,lap,durationMs:base+slowdown+((lap%2)*100), receivedAt:lap*70000, sectors:[21000,22000,base-43000+slowdown]})
}
laps.sort((a,b)=>a.lap-b.lap)
const summary=paceSummary(laps,'7',5)
assert(summary); assert.equal(summary.sampleKarts,2)
assert(Math.abs(summary.trendMs)<200)
const rank=lapPerformance(laps,'7',{sectors:['21.000','22.000',''],lastEvent:'S2'})
assert(rank); assert.equal(rank.rank,1); assert.equal(rank.projected,true)
console.log('Testes Pace Intelligence passaram.')
