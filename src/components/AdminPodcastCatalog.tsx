import { useMemo, useState } from 'react'
import { ArrowUpRight, CalendarDays, Eye, FileText, Grid2X2, List, Mic2, Pencil, Play, Plus, Search, Trash2, User, Video } from 'lucide-react'
import { Link } from 'react-router-dom'
import { img } from '../lib/publicUrl'
import { cardCover } from '../lib/cardCover'
import { getProfessorPhoto } from '../lib/adminAuthors'
import { areas } from '../data/content'
import type { Course } from './AdminCoursesPage'
import { AdminHeroArtwork } from './AdminHeroArtwork'
import { AdminSelect } from './AdminSelect'
import './AdminPodcastCatalog.css'

type Props = {
  courses: Course[]
  loading: boolean
  onCreate: () => void
  onEdit: (course: Course) => void
  onDelete: (course: Course) => void
  variant?: 'podcast' | 'interview'
}

const dateLabel = (value: string) => new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium' }).format(new Date(value))
const waveBars = [3, 7, 4, 12, 19, 9, 4, 15, 26, 11, 5, 8, 17, 31, 19, 8, 4, 13, 23, 10, 5, 3]

export function Waveform({ color = 'blue' }: { color?: 'blue' | 'green' | 'silver' | 'purple' }) {
  return <span className={`podcast-admin-wave podcast-admin-wave--${color}`} aria-hidden="true">{waveBars.map((height, index) => <i key={index} style={{ height }}/>)}</span>
}

const areaImage: Record<string, string> = Object.fromEntries(areas.map(a => [a.slug, a.image]))

export function AdminPodcastCatalog({ courses, loading, onCreate, onEdit, onDelete, variant = 'podcast' }: Props) {
  const isInterview = variant === 'interview'
  const title = isInterview ? 'Entrevistas' : 'Podcasts'
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | 'published' | 'draft' | 'scheduled'>('all')
  const [author, setAuthor] = useState('')
  const [order, setOrder] = useState<'newest' | 'oldest'>('newest')
  const [layout, setLayout] = useState<'list' | 'grid'>('list')
  const authors = [...new Set(courses.map(course => course.instructor).filter(Boolean))].sort()
  const filtered = useMemo(() => courses
    .filter(course => !query || [course.title, course.instructor, course.description].some(value => value.toLowerCase().includes(query.toLowerCase())))
    .filter(course => status === 'all' || course.status === status)
    .filter(course => !author || course.instructor === author)
    .sort((a, b) => (order === 'newest' ? -1 : 1) * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime())),
    [courses, query, status, author, order])

  return <section className={`podcast-admin${isInterview ? ' podcast-admin--interviews' : ''}`} aria-label={isInterview ? 'Administração de entrevistas' : 'Administração de podcasts'}>
    <div className={`podcast-admin-hero${isInterview ? ' podcast-admin-hero--interviews' : ''}`}>
      <AdminHeroArtwork variant={isInterview ? 'interview' : 'podcast'}/>
      <div className="podcast-admin-hero-inner">
        <p className="podcast-admin-eyebrow"><Grid2X2 size={14}/> PAINEL DA ACADEMIA</p>
        <h1>{title}</h1>
        <p>{isInterview ? 'Organize e publique as entrevistas disponíveis na Academia.' : 'Organize e publique os podcasts disponíveis na Academia.'}</p>
        <div className="podcast-admin-hero-actions">
          <button className="podcast-admin-create" type="button" onClick={onCreate}><Plus size={18}/> Criar {isInterview ? 'entrevista' : 'podcast'}</button>
          <Link className="podcast-admin-site" to={isInterview ? '/entrevistas' : '/podcasts'}><Eye size={16}/> Ver no site <ArrowUpRight size={15}/></Link>
        </div>
      </div>
    </div>

    <div className="podcast-admin-content">
      <div className="podcast-admin-stats">
        <article className="podcast-admin-stat podcast-admin-stat--blue"><span className="podcast-admin-stat-icon">{isInterview ? <Video size={25}/> : <Mic2 size={25}/>}</span><div><span>Total de {isInterview ? 'entrevistas' : 'podcasts'}</span><strong>{loading ? '—' : courses.length}</strong></div><Waveform/></article>
        <article className="podcast-admin-stat podcast-admin-stat--green"><span className="podcast-admin-stat-icon"><Play size={24}/></span><div><span>Publicados</span><strong>{loading ? '—' : courses.filter(course => course.status === 'published').length}</strong></div><Waveform color="green"/></article>
        <article className="podcast-admin-stat podcast-admin-stat--silver"><span className="podcast-admin-stat-icon"><FileText size={24}/></span><div><span>Rascunhos</span><strong>{loading ? '—' : courses.filter(course => course.status === 'draft').length}</strong></div><Waveform color="silver"/></article>
      </div>

      <div className="podcast-admin-filters">
        <label className="podcast-admin-search"><Search size={19}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder={isInterview ? 'Pesquisar entrevistas ou convidados...' : 'Pesquisar podcasts ou autores...'} aria-label={isInterview ? 'Pesquisar entrevistas ou convidados' : 'Pesquisar podcasts ou autores'}/></label>
        <AdminSelect className="podcast-admin-filter-select" ariaLabel="Filtrar por estado" value={status} onChange={value => setStatus(value as typeof status)} options={[{ value: 'all', label: 'Todos os estados' }, { value: 'published', label: 'Publicados' }, { value: 'scheduled', label: 'Agendados' }, { value: 'draft', label: 'Rascunhos' }]}/>
        <AdminSelect className="podcast-admin-filter-select" ariaLabel={isInterview ? 'Filtrar por convidado' : 'Filtrar por autor'} value={author} onChange={setAuthor} options={[{ value: '', label: isInterview ? 'Todos os convidados' : 'Todos os autores' }, ...authors.map(name => ({ value: name, label: name, avatar: getProfessorPhoto(name) ? img(getProfessorPhoto(name)!) : undefined }))]}/>
        <AdminSelect className="podcast-admin-filter-select" ariaLabel={`Ordenar ${title.toLowerCase()}`} value={order} onChange={value => setOrder(value as typeof order)} options={[{ value: 'newest', label: 'Mais recentes' }, { value: 'oldest', label: 'Mais antigos' }]}/>
      </div>

      <div className="podcast-admin-catalog-heading">
        <div><p className="podcast-admin-eyebrow">CATÁLOGO</p><h2>{title}</h2></div>
        <div className="podcast-admin-layout" role="group" aria-label="Modo de visualização">
          <button type="button" className={layout === 'list' ? 'active' : ''} aria-pressed={layout === 'list'} onClick={() => setLayout('list')}><List size={18}/> Lista</button>
          <button type="button" className={layout === 'grid' ? 'active' : ''} aria-pressed={layout === 'grid'} onClick={() => setLayout('grid')}><Grid2X2 size={17}/> Grelha</button>
        </div>
      </div>

      {loading ? <p className="podcast-admin-empty">A carregar {title.toLowerCase()}…</p> : filtered.length ? <div className={`podcast-admin-items podcast-admin-items--${layout}`}>
        {filtered.map(course => <article className={`podcast-admin-item${isInterview ? ' podcast-admin-item--interview' : ''}`} key={course.id}>
          <div className="podcast-admin-cover"><img src={cardCover(course.cover_url || areaImage[course.slug])} alt=""/>{isInterview && <span className="podcast-admin-interview-tag"><Video size={12}/> Entrevista</span>}{!isInterview && course.lesson_count != null && course.lesson_count > 0 && <span className="podcast-admin-duration"><Play size={12} fill="currentColor"/> {course.lesson_count} ep.</span>}{(!course.lesson_count || course.lesson_count === 0) && course.duration_text && <span className="podcast-admin-duration"><Play size={12} fill="currentColor"/> {course.duration_text}</span>}</div>
          <div className="podcast-admin-item-copy"><h3>{course.title}</h3><span className="podcast-admin-author"><User size={14}/> {isInterview ? 'Convidado' : 'Participantes'}: {course.instructor || 'Não informado'}</span><p>{course.description}</p><div className="podcast-admin-item-meta"><span className={`podcast-admin-status podcast-admin-status--${course.status}`}><i/>{course.status === 'published' ? 'Publicado' : course.status === 'scheduled' ? 'Agendado' : 'Rascunho'}</span><span><CalendarDays size={15}/> {dateLabel(course.published_at || course.created_at)}</span></div></div>
          <Waveform color={course.status === 'published' ? 'blue' : 'silver'}/>
          <div className="podcast-admin-item-actions"><Link to={isInterview ? `/entrevistas/${course.slug}` : `/podcasts?podcast=${course.slug}`} className="podcast-admin-action" title="Ver no site" aria-label={`Ver ${course.title} no site`}><Eye size={18}/></Link><button className="podcast-admin-action" type="button" title="Editar" aria-label={`Editar ${course.title}`} onClick={() => onEdit(course)}><Pencil size={18}/></button><button className="podcast-admin-action podcast-admin-action--danger" type="button" title="Eliminar" aria-label={`Eliminar ${course.title}`} onClick={() => onDelete(course)}><Trash2 size={18}/></button></div>
        </article>)}
      </div> : <div className="podcast-admin-empty">{courses.length ? `Nenhuma ${isInterview ? 'entrevista' : 'podcast'} corresponde aos filtros.` : `Nenhuma ${isInterview ? 'entrevista' : 'podcast'} registada. Crie a primeira para começar.`}</div>}
    </div>
  </section>
}
