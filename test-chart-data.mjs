import assert from 'node:assert/strict'
import { buildPaceSeries, buildLapRankSeries, buildStintPaceBars } from './src/chartData.ts'
const mk=(kart,lap,durationMs,receivedAt)=>({id:`${kart}-${lap}`,kart,lap,durationMs,receivedAt,sectors:[null,null,null]})
const laps=[]
for(let i=1;i<=6;i++){
  laps.push(mk('7',i,64000+i*20, i*65000))
  laps.push(mk('2',i,65000+i*20, i*65000-100))
  laps.push(mk('3',i,66000+i*20, i*65000-50))
}
const trend=buildPaceSeries(laps,'7')
assert.equal(trend.length,6)
assert.equal(trend[0].field,null,'only one per rival does not qualify')
assert.ok(trend[2].field !== null,'after 2 per rival can compute field')
assert.ok(trend[2].own < trend[2].field)
const rank=buildLapRankSeries(laps,'7')
assert.ok(rank.length>=3)
assert.ok(rank.every(x=>x.rank===1 && x.total===3))
const noFake=buildPaceSeries(laps.filter(l=>l.kart==='7'),'7')
assert.ok(noFake.every(x=>x.field===null),'no rivals, no invented field')
const sparse=buildLapRankSeries(laps.filter(l=>l.kart!=='3'),'7')
assert.equal(sparse.length,0,'at least 2 rivals required')
const bars=buildStintPaceBars([{number:1,driver:'A',laps:6,deltaToFieldMs:-300},{number:2,driver:'B',laps:0,deltaToFieldMs:null}])
assert.deepEqual(bars,[{label:'S1 · A',deltaSeconds:-.3,laps:6}])
console.log('Chart-data tests passed')
