import {useMemo,useState} from 'react'
import {ArrowLeft,ArrowRight,CalendarCheck2,CalendarDays,Check,ChevronRight,Clock3,Flag,LayoutGrid,List,MapPin,Plus,RotateCcw} from 'lucide-react'
import type {RaceCollection,RaceProfile} from './races'

type Props={collection:RaceCollection;onOpen:(id:string)=>void;onCreate:()=>void}
type Entry={race:RaceProfile;date:Date}
type CalendarView='month'|'list'
const parseDate=(date:string)=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return null
  const [y,m,d]=date.split('-').map(Number)
  const parsed=new Date(y,m-1,d)
  return parsed.getFullYear()===y&&parsed.getMonth()===m-1&&parsed.getDate()===d?parsed:null
}
const sameDay=(a:Date,b:Date)=>a.getDate()===b.getDate()&&a.getMonth()===b.getMonth()&&a.getFullYear()===b.getFullYear()
const dateKey=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
const statusTitle=(race:RaceProfile)=>race.status==='live'?'Em curso':race.status==='finished'?'Concluída':'Em preparação'
const statusClass=(race:RaceProfile)=>`status-${race.status||'preparation'}`

export function RaceCalendar({collection,onOpen,onCreate}:Props){
  const today=new Date()
  const [month,setMonth]=useState(()=>new Date(today.getFullYear(),today.getMonth(),1))
  const [selectedDate,setSelectedDate]=useState<string|null>(null)
  const [view,setView]=useState<CalendarView>('month')
  const yr=month.getFullYear(),mo=month.getMonth()
  const {dated,undated}=useMemo(()=>{
    const dated:Entry[]=[],undated:RaceProfile[]=[]
    for(const race of collection.races){const date=parseDate(race.date);if(date)dated.push({race,date});else undated.push(race)}
    dated.sort((a,b)=>a.date.getTime()-b.date.getTime())
    return {dated,undated}
  },[collection.races])
  const thisMonth=dated.filter(e=>e.date.getFullYear()===yr&&e.date.getMonth()===mo)
  const upcoming=dated.filter(e=>e.date.getTime()>=new Date(today.getFullYear(),today.getMonth(),today.getDate()).getTime())
  const selected=thisMonth.filter(e=>selectedDate===null||dateKey(e.date)===selectedDate)
  const first=(new Date(yr,mo,1).getDay()+6)%7
  const numberOfDays=new Date(yr,mo+1,0).getDate()
  const cells=Array.from({length:Math.ceil((first+numberOfDays)/7)*7},(_,i)=>i-first+1)
  const changeMonth=(offset:number)=>{setMonth(new Date(yr,mo+offset,1));setSelectedDate(null)}
  const resetMonth=()=>{setMonth(new Date(today.getFullYear(),today.getMonth(),1));setSelectedDate(null)}
  const openDate=(date:Date)=>{const key=dateKey(date);setSelectedDate(current=>current===key?null:key)}
  return <section className="hubPage calendarPage calendarV21">
    <header className="hubHeading"><div><div className="hubKicker"><CalendarDays size={16}/> RACING SEASON / AGENDA</div><h1>Calendário<span>.</span></h1><p>Todas as tuas provas, numa vista rápida da época.</p></div><button className="solidBtn" onClick={onCreate}><Plus size={19}/> Nova prova</button></header>
    <div className="calendarOverview" aria-label="Resumo da época"><div><span>PROVAS REGISTADAS</span><strong>{collection.races.length}</strong></div><div><span>PRÓXIMAS PROVAS</span><strong>{upcoming.length}</strong></div><div><span>EM CURSO</span><strong>{collection.races.filter(r=>r.status==='live').length}</strong></div><div className="calendarNextUp"><span>PRÓXIMA BANDEIRA VERDE</span><strong>{upcoming[0]?upcoming[0].race.name:'Sem data marcada'}</strong><small>{upcoming[0]?upcoming[0].date.toLocaleDateString('pt-PT',{day:'numeric',month:'short',year:'numeric'}):'Adiciona uma prova ao calendário'}</small></div></div>
    <div className="calendarV21Top"><div className="calendarViewSwitch" role="group" aria-label="Tipo de visualização"><button className={view==='month'?'selected':''} aria-pressed={view==='month'} onClick={()=>setView('month')}><LayoutGrid size={17}/> Mês</button><button className={view==='list'?'selected':''} aria-pressed={view==='list'} onClick={()=>setView('list')}><List size={17}/> Lista</button></div><div className="calendarLegend"><span><i className="legendDot scheduled"/> Preparação</span><span><i className="legendDot live"/> Em curso</span><span><i className="legendDot finished"/> Concluída</span></div></div>
    <div className="calendarLayout calendarV21Layout">
      <section className="calendarMain"><div className="calendarMonthHeading"><div><div className="hubKicker">RACE SCHEDULE</div><h2>{month.toLocaleDateString('pt-PT',{month:'long',year:'numeric'})}</h2></div><div className="calendarMonthActions"><button aria-label="Mês anterior" onClick={()=>changeMonth(-1)}><ArrowLeft size={18}/></button><button aria-label="Voltar ao mês atual" onClick={resetMonth}><RotateCcw size={15}/> Hoje</button><button aria-label="Mês seguinte" onClick={()=>changeMonth(1)}><ArrowRight size={18}/></button></div></div>
      {view==='month'?<div className="calendarGrid calendarGridV21" role="grid" aria-label={month.toLocaleDateString('pt-PT',{month:'long',year:'numeric'})}>{['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(day=><div className="calendarWeekday" key={day}>{day}</div>)}{cells.map((day,i)=>{
        const valid=day>0&&day<=numberOfDays
        const date=valid?new Date(yr,mo,day):null
        const entries=date?thisMonth.filter(e=>sameDay(e.date,date)):[]
        const isToday=!!date&&sameDay(date,today)
        const isSelected=!!date&&selectedDate===dateKey(date)
        return <div key={i} className={`calendarDay ${!valid?'isOutside':''} ${isToday?'isToday':''} ${isSelected?'isSelected':''} ${entries.length?'hasRace':''}`}>
          {date&&<button type="button" className="calendarDayDate" onClick={()=>openDate(date)} aria-label={`${date.toLocaleDateString('pt-PT',{dateStyle:'long'})}, ${entries.length} prova(s)`} aria-pressed={isSelected}>{String(day).padStart(2,'0')}{isToday&&<span className="calendarTodayText">HOJE</span>}</button>}
          {entries.slice(0,2).map(e=><button type="button" key={e.race.id} className={`calendarRaceChip ${statusClass(e.race)}`} title={e.race.name} onClick={()=>onOpen(e.race.id)}>{e.race.name}</button>)}
          {entries.length>2&&<button type="button" className="calendarMoreEvents" onClick={()=>date&&openDate(date)}>+{entries.length-2} provas</button>}
        </div>
      })}</div>:<div className="calendarListView">{thisMonth.map(e=><button type="button" key={e.race.id} className="calendarListRow" onClick={()=>onOpen(e.race.id)}><time>{e.date.toLocaleDateString('pt-PT',{day:'2-digit',month:'short'})}</time><div><strong>{e.race.name}</strong><small><MapPin size={13}/>{e.race.track||'Kartódromo por definir'}</small></div><span className={`hubStatus ${statusClass(e.race)}`}>{statusTitle(e.race)}</span><ChevronRight size={18}/></button>)}{!thisMonth.length&&<div className="calendarListEmpty"><CalendarCheck2 size={26}/><b>Sem provas neste mês</b><span>Cria uma nova prova ou muda de mês.</span></div>}</div>}</section>
      <aside className="calendarAgenda calendarV21Agenda"><div className="calendarAgendaHeader"><div><span className="hubKicker"><Flag size={14}/> RACE BOARD</span><h2>{selectedDate?'Provas do dia':'Agenda do mês'} <span>{selected.length}</span></h2></div>{selectedDate&&<button type="button" onClick={()=>setSelectedDate(null)}>Ver todas</button>}</div>
        <p className="calendarAgendaIntro">{selectedDate?new Date(Number(selectedDate.slice(0,4)),Number(selectedDate.slice(5,7))-1,Number(selectedDate.slice(8,10))).toLocaleDateString('pt-PT',{day:'numeric',month:'long',year:'numeric'}):'Seleciona um dia ou abre diretamente uma prova.'}</p>
        <div className="calendarAgendaItems">{selected.map(e=><button type="button" key={e.race.id} className={`calendarAgendaItem calendarAgendaV21Item ${statusClass(e.race)}`} onClick={()=>onOpen(e.race.id)}><time>{e.date.toLocaleDateString('pt-PT',{day:'2-digit',month:'short'})}</time><strong>{e.race.name}</strong><small><MapPin size={12}/>{e.race.track||'Pista por definir'}</small><span className="calendarAgendaState">{statusTitle(e.race)}</span><ChevronRight size={16}/></button>)}</div>
        {!selected.length&&<div className="calendarAgendaEmpty"><Clock3 size={22}/><strong>Nenhuma prova agendada</strong><span>Neste período ainda não há competições.</span></div>}
        {!!undated.length&&<div className="calendarUndated"><h3>Sem data <span>{undated.length}</span></h3>{undated.map(r=><button type="button" key={r.id} onClick={()=>onOpen(r.id)}><Flag size={14}/>{r.name}<ChevronRight size={15}/></button>)}</div>}
        <div className="calendarBottomNote"><Check size={16}/> Cada evento pertence a uma prova guardada neste dispositivo.</div>
      </aside>
    </div>
  </section>
}
