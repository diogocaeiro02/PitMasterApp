import assert from 'node:assert/strict'
import {parseRaceFacerFrame, raceFacerUrl, RaceFacerParser} from './src/timing/racefacer.ts'
const slug='e1gokartkielce'
const run=(laps,passing,last)=>({id:300336,pos:1,team:'E1 Team',name:'Adam',kart_number:'19',total_laps:laps,last_passing:passing,last_time_raw:last,last_time:(last/1000).toFixed(3),best_time:'40.945',number_of_pits:0,in_pit:false,s1:'14.000',s2:'27.000'})
const raw=(data)=>`42["${slug}",${JSON.stringify({data:{event_name:'Session #85',track_configuration_id:6,time_left:'00:04:30',status_string:'in_progress',ranking_key:'by_time',is_endurance:false,has_pits:false,runs:[data]},type:'live-timing',slug})}]`
assert.equal(raceFacerUrl('https://live.racefacer.com/e1gokartkielce').slug,slug)
assert.throws(()=>raceFacerUrl('https://evil.example/e1gokartkielce'))
assert.equal(parseRaceFacerFrame('2',slug),null)
assert.equal(parseRaceFacerFrame(raw(run(6,1000,41696)),'other'),null)
const parser=new RaceFacerParser(slug)
const baseline=parser.apply(parseRaceFacerFrame(raw(run(6,1000,41696)),slug),100)
assert.equal(baseline.racers[0].name,'E1 Team')
assert.equal(baseline.racers[0].driverName,'Adam')
assert.equal(baseline.passages.length,0)
const later=parser.apply(parseRaceFacerFrame(raw(run(7,42227,41227)),slug),200)
assert.equal(later.passages.length,1)
assert.equal(later.passages[0].marker,'META')
assert.equal(later.lapHistory[0].durationMs,41227)
const repeat=parser.apply(parseRaceFacerFrame(raw(run(7,42227,41227)),slug),300)
assert.equal(repeat.meta.newFinishKarts.length,0)
assert.equal(repeat.passages.length,1)
assert.equal(repeat.lapHistory.length,1)
console.log('RaceFacer: protocolo, nomes, voltas, deduplicação e validação OK')
