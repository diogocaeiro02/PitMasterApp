import assert from 'node:assert/strict'
import {createRace,restoreRaces,updateProfile} from './src/races.ts'
const a=createRace('a',12)
assert.equal(a.status,'preparation')
const b={...createRace('b',14),name:'Endurance Batalha',track:'Batalha',status:'live'}
const col={activeId:'b',races:[a,b]}
const restored=restoreRaces(JSON.stringify(col))
assert.equal(restored.activeId,'b')
assert.equal(restored.races[1].status,'live')
const modified=updateProfile(restored,{...b,status:'finished'})
assert.equal(modified.races[1].status,'finished')
assert.equal(modified.races[0].status,'preparation')
console.log('✓ Provas: estado, restauração e isolamento de perfis')
