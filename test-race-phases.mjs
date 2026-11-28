import assert from 'node:assert/strict'
import {readPhases} from './src/racePhases.ts'
assert.equal(readPhases(null).current,'preparation')
assert.equal(readPhases('{"current":"qualifying","karts":{"qualifying":"19","race":"7"},"superqualifying":true}').karts.race,'7')
assert.equal(readPhases('{"current":"bogus"}').current,'preparation')
console.log('Fases: qualificação, configuração por kart e defaults OK')
