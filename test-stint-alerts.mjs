import assert from 'node:assert/strict'
import {medianRaceLap,stintAlertStage} from './src/stintAlerts.ts'
assert.equal(medianRaceLap([65000,66000,64500,350000,65200],null).ms,65100)
assert.equal(medianRaceLap([],70000).ms,70000)
assert.equal(stintAlertStage(5*65000,65000),'none')
assert.equal(stintAlertStage(4*65000,65000),'four')
assert.equal(stintAlertStage(2*65000,65000),'two')
assert.equal(stintAlertStage(65000,65000),'one')
assert.equal(stintAlertStage(0,null),'limit')
console.log('Alertas de stint: 4/2/1 voltas e limite OK')
