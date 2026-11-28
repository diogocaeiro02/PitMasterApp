import assert from 'node:assert/strict'
import { compareRivalPace, rivalPaceText } from './src/rivalPace.ts'
import { stintSummaries } from './src/stintAnalysis.ts'
const at = Date.UTC(2026, 10, 24, 10, 0)
const lap = (kart, duration, n, offset = n*60_000) => ({id:`${kart}-${n}`,kart,lap:n,durationMs:duration,receivedAt:at+offset,sectors:[null,null,null]})
const history = [lap('7',64500,1),lap('7',65000,2),lap('7',64000,3),lap('12',63800,1),lap('12',63000,2),lap('12',64100,3),lap('22',66400,1),lap('22',66000,2),lap('22',65400,3)]
const sample = compareRivalPace(history,'7','12',at+210_000)
assert.equal(sample?.status,'faster')
assert.match(rivalPaceText(sample,'behind').detail,/aproximar/)
assert.equal(compareRivalPace(history,'7','22',at+210_000)?.status,'slower')
assert.equal(compareRivalPace(history,'7','12',at+900_000),null,'stale data withheld')
assert.equal(compareRivalPace(history,'7','7',at+210_000),null)
const stints = stintSummaries([{driver:'A',startedAt:at,endedAt:at+200_000},{driver:'B',startedAt:at+200_000}],history,'7',at+240_000)
assert.equal(stints[0].laps,3)
assert.equal(stints[0].durationMs,200_000)
assert.equal(stints[0].fieldKarts,2)
assert.equal(stints[1].laps,0)
console.log('rival pace and stint analysis OK')
