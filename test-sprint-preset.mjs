import assert from 'node:assert/strict'
import {palmelaSprintRules,palmelaSprintPhases} from './src/sprintPreset.ts'
import {EMPTY_RULES} from './src/strategy.ts'
import {DEFAULT_PHASES} from './src/racePhases.ts'
const initial={...EMPTY_RULES,minPitStops:7,maxStintMinutes:45,minPitSeconds:181.104,raceMinutes:420}
const r=palmelaSprintRules(initial)
assert.equal(r.raceMinutes,30)
assert.equal(r.minPitStops,null)
assert.equal(r.maxStintMinutes,null)
assert.equal(r.minPitSeconds,null)
assert.equal(initial.raceMinutes,420)
const p=palmelaSprintPhases({...DEFAULT_PHASES,superqualifying:true})
assert.equal(p.qualifyingMinutes,10)
assert.equal(p.superqualifying,false)
console.log('10 + 30: duração correta sem presumir regulamento OK')
