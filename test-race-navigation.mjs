import assert from 'node:assert/strict'
import {firstRacePage,isRacePage} from './src/raceNavigation.ts'
import {createRace,updateProfile,restoreRaces} from './src/races.ts'
assert.equal(isRacePage('races'),false)
assert.equal(isRacePage('calendar'),false)
for (const tab of ['setup','qualifying','race','ranking','strategy']) assert.equal(isRacePage(tab),true)
const prepared=createRace('work-a')
assert.equal(firstRacePage(prepared),'setup')
assert.equal(firstRacePage({...prepared,status:'live'}),'race')
const withTeam={...prepared,teamName:'Verstappen Boraaa',name:'Palmela 10+30',track:'KIP Palmela',kart:'17'}
const restored=restoreRaces(JSON.stringify({activeId:'work-a',races:[withTeam]}))
assert.equal(restored.races[0].teamName,'Verstappen Boraaa')
assert.equal(updateProfile(restored,{...withTeam,name:'Outra prova'}).races[0].name,'Outra prova')
console.log('Navegação: biblioteca, calendário, páginas da prova e nome de equipa preservados.')
