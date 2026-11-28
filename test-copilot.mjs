import assert from 'node:assert/strict'
import {buildCopilot,chooseCopilotDriver,evaluatePitWindows,proposePitWindowChange} from './src/copilot.ts'
import {EMPTY_RULES} from './src/strategy.ts'
const r={...EMPTY_RULES,raceMinutes:180,minStintMinutes:20,maxStintMinutes:45,minPitStops:3,minPitSeconds:181.104,maxDriverMinutes:90}
const base={mode:'live',timingFresh:true,liveAgeMs:1000,hasKart:true,phase:'race',rules:r,
  activeDriver:'Ana',elapsedMs:39*60_000,lapMs:60_000,raceRemainingMs:45*60_000,
  completedPits:1,pitActive:false,pitElapsedMs:null,waitingForDriver:false,
  driverNames:['Ana','Bruno','Carla'],turns:[{driver:'Ana',startedAt:0,endedAt:30*60_000},{driver:'Bruno',startedAt:30*60_000,endedAt:60*60_000},{driver:'Ana',startedAt:60*60_000}],plannedNextDriver:'Bruno',now:99*60_000,
  penalties:0,warnings:0,pace:null,projection:null,selectedKart:'7'}
const withInput=(patch={})=>({...base,...patch})
const a=buildCopilot(withInput());assert.equal(a.action.title,'Corrida sob controlo');assert.equal(a.remainingMandatoryPits,2)
assert.equal(a.nextDriver.name,'Bruno');assert.equal(a.windows.length,4)
assert.deepEqual(a.windows.map(w=>w.status),['possible','possible','possible','possible'])
assert.equal(a.reliability,'moderada')
assert.equal(buildCopilot(withInput({elapsedMs:44.5*60_000})).action.severity,'critical')
assert.equal(buildCopilot(withInput({elapsedMs:46*60_000})).action.title,'Limite máximo de stint atingido')
assert.equal(buildCopilot(withInput({waitingForDriver:true,elapsedMs:46*60_000})).action.kind,'confirm')
assert.equal(buildCopilot(withInput({pitActive:true,pitElapsedMs:60_000})).action.kind,'pit')
assert.match(buildCopilot(withInput({pitActive:true,pitElapsedMs:60_000})).action.description,/2:01:104/)
assert.equal(buildCopilot(withInput({timingFresh:false})).action.kind,'timing')
assert.equal(buildCopilot(withInput({phase:'qualifying'})).action.title,'Fase sem estratégia de pits')
assert.equal(buildCopilot(withInput({mode:'demo'})).reliability,'indisponível')
assert.equal(buildCopilot(withInput({mode:'sim'})).reliability,'simulada')
assert.equal(buildCopilot(withInput({rules:{...r,minPitStops:null}})).remainingMandatoryPits,null)
assert.equal(buildCopilot(withInput({rules:{...r,maxStintMinutes:null}})).action.kind,'plan')
const w=evaluatePitWindows(44*60_000,60_000,r,null)
assert.deepEqual(w.map(x=>x.status),['possible','tight','late','late'])
assert.equal(evaluatePitWindows(10*60_000,60_000,r,null)[0].status,'too-early')
assert.equal(proposePitWindowChange({rules:r,plan:[{id:'a',driver:'Ana',minutes:44},{id:'b',driver:'Carla',minutes:40}],completedTurns:0,activeDriver:'Ana',elapsedMs:44*60_000,window:evaluatePitWindows(44*60_000,60_000,r,null)[1]}).plan,null)
assert.equal(evaluatePitWindows(10*60_000,null,r,null).length,0)
assert.equal(evaluatePitWindows(null,60_000,r,null).length,0)
const driver=chooseCopilotDriver({...base,plannedNextDriver:'Ana'})
assert.notEqual(driver.name,'Ana')
assert.equal(driver.origin,'sugerido')
const maxed=chooseCopilotDriver({...base,plannedNextDriver:'Bruno',rules:{...r,maxDriverMinutes:30}})
assert.equal(maxed.name,'Carla')
const noDriver=chooseCopilotDriver({...base,driverNames:['Ana']});assert.equal(noDriver.origin,'indisponível')
const plan=[{id:'one',driver:'Ana',minutes:30},{id:'two',driver:'Bruno',minutes:30},{id:'three',driver:'Ana',minutes:40},{id:'four',driver:'Carla',minutes:40}]
const scenario=evaluatePitWindows(39*60_000,60_000,r,null)[2]
const changed=proposePitWindowChange({rules:r,plan,completedTurns:2,activeDriver:'Ana',elapsedMs:39*60_000,window:scenario})
assert.ok(changed.plan);assert.equal(changed.plan[0],plan[0]);assert.equal(changed.plan[1],plan[1]);
assert.equal(changed.plan[2].minutes,41);assert.equal(changed.plan[3].minutes,39)
assert.equal(changed.plan.reduce((n,s)=>n+s.minutes,0),plan.reduce((n,s)=>n+s.minutes,0))
assert.equal(proposePitWindowChange({rules:r,plan,completedTurns:2,activeDriver:'Bruno',elapsedMs:39*60_000,window:scenario}).plan,null)
assert.equal(proposePitWindowChange({rules:r,plan,completedTurns:3,activeDriver:'Carla',elapsedMs:39*60_000,window:scenario}).plan,null)
assert.equal(proposePitWindowChange({rules:r,plan,completedTurns:2,activeDriver:'Ana',elapsedMs:39*60_000,window:w[2]}).plan,null)
assert.equal(proposePitWindowChange({rules:{...r,maxStintMinutes:60,minStintMinutes:30},plan,completedTurns:2,activeDriver:'Ana',elapsedMs:55*60_000,window:evaluatePitWindows(55*60_000,60_000,{...r,maxStintMinutes:60,minStintMinutes:30},null)[2]}).plan,null)
console.log('Copilot: casos de prioridade, fonte, janelas, pilotos e plano protegido passaram.')
const insight=buildCopilot(withInput({
  pace:{ownMedianMs:64_000,fieldMedianMs:65_000,deltaMs:-1000,trendMs:-500,ownChangeMs:-300,fieldChangeMs:200,sampleKarts:8,sampleOwn:5,status:'improved'},
  projection:{rows:[{kart:'7',name:'A nossa equipa',officialPosition:8,predictedPosition:7,completedLaps:100,completedPits:1,remainingPits:2,typicalLapMs:64000,projectedLapTotal:120,projectedGapSeconds:0,sourceSamples:5}],reasons:[],confidence:'baixa',minPitStops:3,remainingMinutes:30,pitLossSeconds:180,sampleSize:5,simulated:false},
  rivalBattles:[{side:'ahead',name:'Racing Aces',kart:'12',position:6,gap:'~7,0 s',remainingPits:3,paceDifferenceMs:230}],lapConfidence:'low'
}))
assert.equal(insight.rivalInsights.length,1)
assert.match(insight.rivalInsights[0],/Racing Aces/)
assert.ok(insight.projectionText?.includes('P7 projetado'))
assert.ok(insight.paceText?.includes('melhor'))
assert.ok(insight.notes.some(x=>x.text.includes('poucas voltas')))
const staleInsight=buildCopilot(withInput({...{
  pace:{ownMedianMs:64000,fieldMedianMs:65000,deltaMs:-1000,trendMs:null,ownChangeMs:null,fieldChangeMs:null,sampleKarts:2,sampleOwn:3,status:'unknown'},
  rivalBattles:[{side:'ahead',name:'Racing Aces',kart:'12',position:6,gap:'~7,0 s',remainingPits:3,paceDifferenceMs:230}]
},timingFresh:false}))
assert.equal(staleInsight.paceText,null)
assert.deepEqual(staleInsight.rivalInsights,[])
console.log('Copilot: prudência com feed antigo, ritmo e rivais verificada.')

assert.equal(buildCopilot(withInput({raceRemainingMs:3*60_000,elapsedMs:30*60_000})).action.title,'Rever pits obrigatórios com urgência')
