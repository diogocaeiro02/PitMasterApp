import assert from 'node:assert/strict'
import { paceInsight } from './src/pacePresentation.ts'
const common={ownMedianMs:66000,fieldMedianMs:66000,sampleKarts:10,sampleOwn:5,status:'stable'}
let result=paceInsight({...common,deltaMs:-500,trendMs:-250,ownChangeMs:1500,fieldChangeMs:1750})
assert.equal(result.tone,'positive')
assert.match(result.headline,/GANHOS/)
assert.match(result.comparison,/mais rápidos/)
assert.match(result.conditionNote,/Ambos abrandaram/)
result=paceInsight({...common,deltaMs:620,trendMs:350,ownChangeMs:700,fieldChangeMs:350})
assert.equal(result.tone,'negative')
assert.match(result.headline,/PERDIDOS/)
assert.match(result.comparison,/mais lentos/)
result=paceInsight({...common,deltaMs:20,trendMs:null,ownChangeMs:null,fieldChangeMs:null,status:'unknown'})
assert.equal(result.tone,'neutral')
assert.match(result.headline,/SEMELHANTE/)
console.log('Pace V0.8: mensagens, tendência, sinal e contexto validados.')
