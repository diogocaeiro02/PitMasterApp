import assert from 'node:assert/strict'
import { buildProjection, neighboringProjected, projectedGap } from './src/projection.ts'
const racers=[
 {id:'a',kart:'1',name:'A',position:1,laps:100,pits:'2'},
 {id:'b',kart:'2',name:'B',position:2,laps:99,pits:'5'},
 {id:'c',kart:'3',name:'C',position:3,laps:98,pits:'4'}
]
const history=racers.flatMap(r=>[1,2,3,4,5].map(l=>({id:`${r.kart}-${l}`,kart:r.kart,lap:l,durationMs:65000,receivedAt:l*65000,sectors:[null,null,null]})))
const state={racers,lapHistory:history,passages:[],raceControl:[],track:'',session:'',title:'',counter:''}
const result=buildProjection(state,6,{remainingMinutes:60,pitLossSeconds:60})
assert.equal(result.reasons.length,0)
assert.equal(result.rows[0].kart,'2')
assert.equal(result.rows.find(x=>x.kart==='1').remainingPits,4)
assert.equal(neighboringProjected(result.rows,'2').ours?.predictedPosition,1)
assert.ok(projectedGap(result.rows[0],result.rows[1]).startsWith('~'))
assert.ok(buildProjection(state,null,{remainingMinutes:60,pitLossSeconds:60}).reasons.length)
assert.ok(buildProjection(state,6,{remainingMinutes:null,pitLossSeconds:60}).reasons.length)
assert.ok(buildProjection({...state,racers:[...racers,{id:'d',kart:'4',name:'D',position:4,laps:5,pits:''}]},6,{remainingMinutes:60,pitLossSeconds:60}).reasons.length)
console.log('✓ Projeção final: pit stops, gaps, insuficiência de dados e rivais')
