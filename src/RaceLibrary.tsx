import {useMemo,useState} from 'react'
import {ArrowRight,CalendarDays,Flag,Plus,Search,SlidersHorizontal} from 'lucide-react'
import type {RaceCollection,RaceProfile} from './races'

type Props={collection:RaceCollection;onCreate:()=>void;onOpen:(id:string)=>void;onCalendar:()=>void}
const statusLabel={preparation:'Em preparação',live:'Em curso',finished:'Terminada'}
function humanDate(date:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return 'Data por definir'; const [y,m,d]=date.split('-').map(Number);return new Date(y,m-1,d).toLocaleDateString('pt-PT',{day:'numeric',month:'short',year:'numeric'})}
export function RaceLibrary({collection,onCreate,onOpen,onCalendar}:Props){
  const [query,setQuery]=useState('')
  const [filter,setFilter]=useState<'all'|'preparation'|'live'|'finished'>('all')
  const races=useMemo(()=>collection.races.filter(r=>(filter==='all'||(r.status||'preparation')===filter)&&`${r.name} ${r.track} ${r.date}`.toLocaleLowerCase('pt-PT').includes(query.toLocaleLowerCase('pt-PT'))).sort((a,b)=>(b.date||'').localeCompare(a.date||'')||b.createdAt-a.createdAt),[collection,query,filter])
  return <section className="hubPage">
    <header className="hubHeading"><div><div className="hubKicker"><Flag size={16}/> BASE DE CORRIDAS</div><h1>As tuas provas<span>.</span></h1><p>Todas as competições num só lugar. Escolhe uma prova para aceder à sua área de corrida.</p></div><div className="hubHeadingActions"><button className="quietBtn" onClick={onCalendar}><CalendarDays size={18}/> Calendário</button><button className="solidBtn" onClick={onCreate}><Plus size={19}/> Criar prova</button></div></header>
    <div className="hubToolbar"><label className="hubSearch"><Search size={19}/><input aria-label="Pesquisar provas" placeholder="Procurar prova ou kartódromo..." value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="hubFilters" aria-label="Filtrar provas"><SlidersHorizontal size={17}/>{([['all','Todas'],['preparation','Preparação'],['live','Em curso'],['finished','Terminadas']] as const).map(([v,label])=><button key={v} className={filter===v?'isActive':''} onClick={()=>setFilter(v)}>{label}</button>)}</div></div>
    <div className="hubRaceGrid">{races.map((r:RaceProfile)=><button type="button" className={`hubRaceCard hubRaceCard--${r.status||'preparation'}`} key={r.id} onClick={()=>onOpen(r.id)}>
      <div className="hubRaceCardTop"><span className={`hubStatus status-${r.status||'preparation'}`}>{statusLabel[r.status||'preparation']}</span><ArrowRight size={20}/></div>
      <h2>{r.name==='Nova prova'?'Prova por configurar':r.name}</h2><p>{r.track||'Kartódromo ainda por definir'}{r.teamName ? ` · ${r.teamName}` : ''}</p><div className="hubRaceMeta"><span><CalendarDays size={15}/>{humanDate(r.date)}</span><span><Flag size={15}/>{r.kart?`Kart #${r.kart}`:'Kart por definir'}</span></div>
      <span className="hubRaceEnter">{r.status==='live'?'Aceder à corrida':'Abrir prova'} <ArrowRight size={16}/></span>
    </button>)}{!races.length&&<div className="hubEmpty"><Flag size={30}/><h2>Não há provas para mostrar</h2><p>Altera os filtros ou cria a tua primeira competição.</p><button className="solidBtn" onClick={onCreate}><Plus size={18}/> Criar prova</button></div>}</div>
    <p className="hubFootNote">Os dados de cada prova são independentes e ficam guardados neste navegador. O simulador nunca é uma prova real.</p>
  </section>
}
