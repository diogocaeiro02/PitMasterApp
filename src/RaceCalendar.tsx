import {useMemo,useState} from 'react'
import {ArrowLeft,ArrowRight,CalendarDays,Flag,Plus} from 'lucide-react'
import type {RaceCollection} from './races'

type Props={collection:RaceCollection;onOpen:(id:string)=>void;onCreate:()=>void}
const parseDate=(date:string)=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return null;const [y,m,d]=date.split('-').map(Number);const result=new Date(y,m-1,d);return result.getFullYear()===y&&result.getMonth()===m-1&&result.getDate()===d?result:null}
export function RaceCalendar({collection,onOpen,onCreate}:Props){
 const [month,setMonth]=useState(()=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth(),1)})
 const today=new Date(),yr=month.getFullYear(),mo=month.getMonth()
 const known=useMemo(()=>collection.races.map(r=>({race:r,date:parseDate(r.date)})),[collection])
 const inMonth=known.filter(x=>x.date?.getFullYear()===yr&&x.date.getMonth()===mo)
 const noDate=known.filter(x=>!x.date)
 const firstDay=(new Date(yr,mo,1).getDay()+6)%7
 const days=new Date(yr,mo+1,0).getDate()
 const cells=Array.from({length:Math.ceil((firstDay+days)/7)*7},(_,i)=>i-firstDay+1)
 return <section className="hubPage calendarPage"><header className="hubHeading"><div><div className="hubKicker"><CalendarDays size={16}/> AGENDA DE COMPETIÇÕES</div><h1>Calendário<span>.</span></h1><p>Consulta rapidamente todas as tuas provas por data.</p></div><button className="solidBtn" onClick={onCreate}><Plus size={18}/> Criar prova</button></header>
 <div className="calendarLayout"><section className="calendarMain"><div className="calendarMonthHeading"><h2>{month.toLocaleDateString('pt-PT',{month:'long',year:'numeric'})}</h2><div className="calendarMonthActions"><button aria-label="Mês anterior" onClick={()=>setMonth(new Date(yr,mo-1,1))}><ArrowLeft size={18}/></button><button onClick={()=>setMonth(new Date(today.getFullYear(),today.getMonth(),1))}>Hoje</button><button aria-label="Mês seguinte" onClick={()=>setMonth(new Date(yr,mo+1,1))}><ArrowRight size={18}/></button></div></div>
 <div className="calendarGrid" role="grid" aria-label={month.toLocaleDateString('pt-PT',{month:'long',year:'numeric'})}>{['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(d=><div className="calendarWeekday" key={d}>{d}</div>)}{cells.map((d,i)=>{const entry=d>0&&d<=days?inMonth.filter(x=>x.date?.getDate()===d):[];const isToday=d===today.getDate()&&mo===today.getMonth()&&yr===today.getFullYear();return <div className={`calendarDay ${d<1||d>days?'isOutside':''} ${isToday?'isToday':''}`} key={i}><span>{d>0&&d<=days?d:''}</span>{entry&&entry.slice(0,2).map(x=><button title={x.race.name} key={x.race.id} onClick={()=>onOpen(x.race.id)}>{x.race.name}</button>)}{entry&&entry.length>2&&<small>+{entry.length-2} provas</small>}</div>})}</div></section>
 <aside className="calendarAgenda"><h2><Flag size={18}/> Provas do mês <span>{inMonth.length}</span></h2>{inMonth.sort((a,b)=>(a.date?.getTime()||0)-(b.date?.getTime()||0)).map(x=><button key={x.race.id} className="calendarAgendaItem" onClick={()=>onOpen(x.race.id)}><time>{x.date?.toLocaleDateString('pt-PT',{day:'numeric',month:'short'})}</time><strong>{x.race.name}</strong><small>{x.race.track||'Kartódromo por definir'}</small><ArrowRight size={16}/></button>)}{!inMonth.length&&<p className="hubFootNote">Sem provas com data neste mês.</p>}{noDate.length>0&&<><h3>Sem data definida</h3>{noDate.map(x=><button className="calendarAgendaItem" key={x.race.id} onClick={()=>onOpen(x.race.id)}><strong>{x.race.name}</strong><small>Adicionar data na preparação</small><ArrowRight size={16}/></button>)}</>}</aside></div>
 </section>
}
