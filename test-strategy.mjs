import assert from 'node:assert/strict'
import { EMPTY_RULES, generatePlan, validateStrategy, budgetMinutes, restoreStrategy, plannedPitStops, actualDriverStats } from './src/strategy.ts'
const rules = { ...EMPTY_RULES, raceMinutes:420, minStintMinutes:30, maxStintMinutes:45, minTeamStints:10, minDriverStints:2, minPitStops:9, minPitSeconds:60 }
const drivers = ['Piloto A','Piloto B','Piloto C']
const result = generatePlan(rules, drivers)
assert.equal(result.error, null)
assert.equal(result.plan.length,10)
assert.equal(plannedPitStops(result.plan),9)
assert.ok(Math.abs(budgetMinutes({rules,plan:result.plan}) - 420) < 0.07)
assert.deepEqual(validateStrategy({rules,plan:result.plan},drivers),[])
assert.ok(validateStrategy({rules,plan:[{id:'bad',driver:'Piloto A',minutes:12}]},drivers).length>0)
assert.match(generatePlan({...rules,minStintMinutes:46},drivers).error,/mínimo/)
assert.match(generatePlan({...rules,raceMinutes:100, minTeamStints:10},drivers).error,/Não existe/)
assert.match(generatePlan(EMPTY_RULES,drivers).error,/define/)
assert.equal(restoreStrategy(JSON.stringify({rules,plan:result.plan})).plan.length,10)
assert.equal(restoreStrategy(JSON.stringify({rules,plan:[{id:'one',driver:'Piloto A',minutes:45,pitSeconds:181.104}]})).plan[0].pitSeconds,181.104)
assert.equal(restoreStrategy('invalid json').plan.length,0)
assert.equal(actualDriverStats([{driver:'A',startedAt:0,endedAt:60000},{driver:'A',startedAt:60000}],120000).A.minutes,2)
console.log('11 testes de estratégia passaram.')
import { actualRuleAlerts } from './src/strategy.ts'
assert.equal(actualRuleAlerts([{driver:'A',startedAt:0,endedAt:10*60_000}], rules, 1000000).length, 1)
assert.equal(actualRuleAlerts([{driver:'A',startedAt:0}], rules, 46*60_000).length, 1)
assert.equal(actualRuleAlerts([{driver:'A',startedAt:0,endedAt:31*60_000}], rules, 45*60_000).length, 0)
console.log('3 testes de alertas reais passaram.')
