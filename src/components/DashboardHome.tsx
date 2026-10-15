import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, Bell, BookOpen, ChevronDown, ChevronLeft, ChevronRight, Mic2, MoreVertical, Newspaper, Play, Video } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { areas, type ContentArea } from '../data/content'
import { usePublishedCourses } from '../data/usePublishedCourses'
import { img } from '../lib/publicUrl'
import { cardCover } from '../lib/cardCover'
import { getProfessorPhoto } from '../lib/adminAuthors'
import { useInterviews } from '../data/useInterviews'
import type { Interview } from '../types/interview'
import { useArticles } from '../data/useArticles'
import { supabase } from '../lib/supabase'
import { SearchHeader, Sidebar } from './Chrome'
import { useNotifications } from '../data/useNotifications'

type Progress = {
  courseSlug: string
  lessonTitle?: string
  lessonPosition?: number
  percent: number
  completed: boolean
  currentTime: number
  duration: number
  lastWatched: string
}

function LearningCard({ course, itemProgress, cardWidth, carousel = false, loading = false }: { course: ContentArea; itemProgress?: Progress; cardWidth: number; carousel?: boolean; loading?: boolean }) {
  const isPodcast = course.category === 'Podcasts'
  const contentHref = isPodcast ? '/podcasts?podcast=' + encodeURIComponent(course.slug) : '/assistir/' + course.slug
  const percent = Math.min(100, Math.max(0, Math.round(itemProgress?.completed ? 100 : itemProgress?.percent ?? 0)))
  const rawAuthorName = course.author.replace('Com ', '').trim()
  const authorName = rawAuthorName.toLocaleLowerCase('pt-BR') === 'eric' ? 'Eric Pereira' : rawAuthorName
  const professorPhoto = course.professorImage || getProfessorPhoto(authorName)
  const shownLesson = itemProgress?.lessonTitle
    ? { title: itemProgress.lessonTitle, position: itemProgress.lessonPosition ?? 0, durationSeconds: itemProgress.duration }
    : course.lessons?.[0]
  const lessonCount = course.lessons?.length || course.videoCount || 0
  const contentCountLabel = `${lessonCount} ${isPodcast ? lessonCount === 1 ? 'episódio' : 'episódios' : lessonCount === 1 ? 'aula' : 'aulas'}`

  return <article className="home-learning-card" style={carousel && cardWidth ? {flex: '0 0 ' + cardWidth + 'px'} : undefined}>
    <Link to={contentHref} className={`home-learning-image${loading ? ' home-learning-image--loading' : ''}`} aria-label={(isPodcast ? 'Abrir podcast ' : 'Abrir ') + course.title}>
      <img key={cardCover(course.image)} src={cardCover(course.image)} alt="" />
      <span className="home-video-count">{contentCountLabel}</span>
    </Link>
    <div className="home-learning-body">
      {shownLesson && <p className="home-card-lesson-number">Aula {shownLesson.position + 1}</p>}
      <div className="home-card-title"><h3>{course.title}</h3><MoreVertical size={15}/></div>
      <p className="home-card-author">
        {professorPhoto
          ? <img src={img(professorPhoto)} className="home-author-avatar home-author-avatar--photo" alt=""/>
          : <span className="home-author-avatar">{authorName[0]?.toUpperCase()}</span>}
        {authorName}
      </p>
      <div className="home-progress-row"><div className="home-progress-track"><span style={{width: percent + '%'}}/></div><span>{percent}% concluído</span></div>
      <Link className="home-continue-button" to={contentHref}><Play size={11} fill="currentColor"/>{itemProgress ? isPodcast ? 'Continuar podcast' : 'Continuar aula' : isPodcast ? 'Ouvir podcast' : 'Explorar curso'}</Link>
    </div>
  </article>
}


function InterviewCard({ interview, cardWidth }: { interview: Interview; cardWidth: number }) {
  const guestPhoto = getProfessorPhoto(interview.guest)

  return <article className="home-learning-card home-interview-card" style={cardWidth ? {flex: '0 0 ' + cardWidth + 'px'} : undefined}>
    <Link to={'/entrevistas/' + interview.slug} className="home-learning-image" aria-label={'Assistir ' + interview.title}>
      <img src={cardCover(interview.thumb)} alt="" />
      <span className="home-video-count">{interview.duration}</span>
    </Link>
    <div className="home-learning-body">
      <div className="home-card-title"><h3>{interview.title}</h3><MoreVertical size={15}/></div>
      <p className="home-card-author">
        {guestPhoto
          ? <img src={img(guestPhoto)} className="home-author-avatar home-author-avatar--photo" alt=""/>
          : <span className="home-author-avatar">{interview.guest[0]?.toUpperCase()}</span>}
        {interview.guest}
      </p>
      <p className="home-card-detail">{interview.guestRole || interview.subtitle}</p>
      <Link className="home-continue-button" to={'/entrevistas/' + interview.slug}><Play size={11} fill="currentColor"/>Assistir entrevista</Link>
    </div>
  </article>
}

function ArticleHomeCard({ article, cardWidth }: { article: { slug: string; title: string; category: string; readTime: string; excerpt: string; image: string }; cardWidth: number }) {
  return <article className="home-learning-card home-article-card" style={cardWidth ? {flex: '0 0 ' + cardWidth + 'px'} : undefined}>
    <Link to={'/blog/' + article.slug} className="home-learning-image" aria-label={'Ler ' + article.title}>
      <img src={article.image} alt="" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = img('/images/blog-page-banner.png') }}/>
      <span className="home-video-count">{article.readTime}</span>
    </Link>
    <div className="home-learning-body">
      <div className="home-card-title"><h3>{article.title}</h3><MoreVertical size={15}/></div>
      <p className="home-card-author home-article-category">{article.category}</p>
      <p className="home-card-detail">{article.excerpt || 'Leia este artigo na biblioteca.'}</p>
      <Link className="home-continue-button" to={'/blog/' + article.slug}>Ler artigo</Link>
    </div>
  </article>
}

const categoryShortcuts = [
  { title: 'Minisséries', description: 'Séries de aulas para aprofundar seus conhecimentos.', to: '/minisseries' },
  { title: 'Podcasts', description: 'Conversas e episódios para ouvir quando quiser.', to: '/podcasts' },
  { title: 'Blog e artigos', description: 'Ideias, análises e conteúdos para leitura.', to: '/blog' },
  { title: 'Entrevistas', description: 'Conversas com empreendedores e especialistas.', to: '/entrevistas' },
  { title: 'Gravações do Zoom', description: 'Encontros gravados para assistir no seu ritmo.', to: '/gravacoes-zoom' },
]

function CategoryShortcutCard({ title, description, to, cardWidth }: { title: string; description: string; to: string; cardWidth: number }) {
  return <article className="home-learning-card home-category-card" style={cardWidth ? { flex: '0 0 ' + cardWidth + 'px' } : undefined}>
    <Link to={to} className="home-learning-image" aria-label={'Explorar ' + title}>
      <img src={img('/images/category-placeholder.svg')} alt="" />
    </Link>
    <div className="home-learning-body">
      <div className="home-card-title"><h3>{title}</h3><MoreVertical size={15}/></div>
      <p className="home-card-detail">{description}</p>
      <Link className="home-continue-button" to={to}>Explorar <ArrowRight size={15}/></Link>
    </div>
  </article>
}


const sectionIcons: Record<string, string> = {
  'Explore a biblioteca': 'fa-book-open',
  'Explore por categoria': 'fa-layer-group',
  'Continue assistindo': 'fa-circle-play',
  'Minisséries': 'fa-film',
  'Podcasts': 'fa-microphone',
  'Entrevistas': 'fa-comments',
  'Artigos e conteúdos': 'fa-newspaper',
}

function SectionTitle({ title }: { title: string }) {
  return <h2><i className={'fa-solid ' + (sectionIcons[title] ?? 'fa-book-open')} aria-hidden="true"/><span>{title}</span></h2>
}

function HomeShelf({ title, children, itemCount, cardWidth, id }: { title: string; children: ReactNode; itemCount: number; cardWidth: number; id?: string }) {
  const [index, setIndex] = useState(0)
  const VISIBLE = 3
  const GAP = 16
  const viewportRef = useRef<HTMLDivElement>(null)
  const [viewportWidth, setViewportWidth] = useState(0)
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const measure = () => setViewportWidth(viewport.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [])
  const visibleCount = viewportWidth && cardWidth ? Math.max(1, Math.floor((viewportWidth + GAP) / (cardWidth + GAP))) : VISIBLE
  const lastIndex = Math.max(0, itemCount - visibleCount)
  const canPrev = index > 0
  const canNext = index < lastIndex
  return <section className="home-shelf" id={id}>
    <div className="home-section-heading home-shelf-heading"><SectionTitle title={title}/></div>
    <div className="home-carousel-wrap">
      {canPrev && <button type="button" className="home-carousel-btn home-carousel-btn--left" onClick={() => setIndex(i => i - 1)} aria-label="Anterior"><ChevronLeft size={28}/></button>}
      {canNext && <button type="button" className="home-carousel-btn home-carousel-btn--right" onClick={() => setIndex(i => i + 1)} aria-label="Próximo"><ChevronRight size={28}/></button>}
      <div className="home-carousel-inner" ref={viewportRef}>
        <div className="home-carousel-track" style={{transform: `translateX(-${index * (cardWidth + GAP)}px)`}}>
          {children}
        </div>
      </div>
    </div>
  </section>
}

export function DashboardHome() {
  const { user } = useAuth()
  const { courses: published, loading: coursesLoading } = usePublishedCourses()
  const { interviews } = useInterviews()
  const { articles } = useArticles()
  const { notifications, loading: notifsLoading, unreadCount, markRead } = useNotifications()
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!notifOpen) return
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [notifOpen])
  const publishedSlugs = new Set(published.map(c => c.slug))
  const areaImage = Object.fromEntries(areas.map(a => [a.slug, a.image]))
  const withFallback = published.map(c => ({ ...c, image: c.image || areaImage[c.slug] || '' }))
  const staticPlaceholders = (!supabase || coursesLoading) ? areas.filter(a => !publishedSlugs.has(a.slug)) : []
  const courses = [...staticPlaceholders, ...withFallback]
  const [progress, setProgress] = useState<Record<string, Progress>>({})

  useEffect(() => {
    if (!supabase || !user) return
    const client = supabase
    let active = true
    client.from('lesson_progress')
      .select('course_slug,lesson_id,progress_percent,completed,current_time_seconds,duration_seconds,last_watched_at')
      .eq('user_id', user.id)
      .order('last_watched_at', { ascending: false })
      .then(async ({ data }) => {
        if (!active || !data) return
        const lessonIds = [...new Set(data.map(row => String(row.lesson_id ?? '')).filter(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)))]
        const lessonTitles = new Map<string, { title: string; position: number }>()
        if (lessonIds.length) {
          const { data: lessonRows } = await client.from('lessons').select('id,title,position').in('id', lessonIds)
          for (const lesson of lessonRows ?? []) lessonTitles.set(lesson.id, { title: lesson.title, position: lesson.position })
        }
        if (!active) return
        const next: Record<string, Progress> = {}
        for (const row of data) {
          if (next[row.course_slug]) continue
          next[row.course_slug] = {
            courseSlug: row.course_slug,
            lessonTitle: lessonTitles.get(String(row.lesson_id))?.title,
            lessonPosition: lessonTitles.get(String(row.lesson_id))?.position,
            percent: Number(row.progress_percent) || 0,
            completed: Boolean(row.completed),
            currentTime: Number(row.current_time_seconds) || 0,
            duration: Number(row.duration_seconds) || 0,
            lastWatched: row.last_watched_at,
          }
        }
        setProgress(next)
      })
    return () => { active = false }
  }, [user])

  const displayName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Membro'
  const continueCourses = courses
    .filter(course => progress[course.slug])
    .sort((a, b) => progress[b.slug].lastWatched.localeCompare(progress[a.slug].lastWatched))
  const [carouselIndex, setCarouselIndex] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [cardWidth, setCardWidth] = useState(0)
  const GAP = 16
  const VISIBLE = 3
  useEffect(() => {
    const measure = () => { if (wrapRef.current) setCardWidth((wrapRef.current.clientWidth - GAP * (VISIBLE - 1)) / VISIBLE) }
    measure()
    const ro = new ResizeObserver(measure)
    if (wrapRef.current) ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [])
  const canPrev = carouselIndex > 0
  const canNext = carouselIndex < continueCourses.length - VISIBLE
  const miniseriesCourses = courses.filter(course => course.category === 'Minisséries')
  const podcastCourses = courses.filter(course => course.category === 'Podcasts')
  const categoryCardWidth = Math.min(cardWidth || 335, 335)

  return <div className="app-shell app-shell--home">
    <Sidebar />
    <div className="site-shell"><main className="dashboard-home dashboard-home--reference dashboard-home--spacious-cards">
      <div className="home-content">
        <section className="home-welcome">
          <div className="home-welcome-copy"><h1>Olá, {displayName}</h1><p>Continue sua jornada de aprendizagem.</p></div>
          <div className="home-search-bar"><SearchHeader /></div>
          <div className="home-welcome-actions">
            <div className="topbar-notification" ref={notifRef}>
              <button type="button" className="topbar-bell-btn" onClick={() => { setNotifOpen(v => { if (!v) markRead(); return !v }) }} aria-label="Notificações">
                <Bell size={21}/>
                {unreadCount > 0 && <i/>}
              </button>
              {notifOpen && <div className="notif-panel">
                <div className="notif-panel-header"><span>Notificações</span></div>
                {notifsLoading
                  ? <div className="notif-empty">Carregando…</div>
                  : notifications.length === 0
                    ? <div className="notif-empty">Nenhuma notificação ainda.</div>
                    : <div className="notif-list">
                        {notifications.map(n => {
                          const TypeIcon = n.type === 'podcast' ? Mic2 : n.type === 'article' ? Newspaper : n.type === 'interview' ? Video : BookOpen
                          return <Link key={n.id} to={n.href} className="notif-item" onClick={() => setNotifOpen(false)}>
                            <div className="notif-thumb">
                              {n.image ? <img src={n.image} alt=""/> : <span className="notif-thumb-icon"><TypeIcon size={18}/></span>}
                            </div>
                            <div className="notif-body">
                              <p className="notif-desc">{n.description}</p>
                              <p className="notif-title">{n.title}</p>
                              <span className="notif-time">{n.timeAgo}</span>
                            </div>
                          </Link>
                        })}
                      </div>
                }
              </div>}
            </div>
            <Link className="topbar-account" to="/perfil"><span className="avatar">{displayName[0]?.toUpperCase()}</span><strong>{displayName}</strong><ChevronDown size={16}/></Link>
          </div>
        </section>

        <section className="home-feature" style={{backgroundImage: `url(${img('/images/hero-bg.png')})`}}>
          <div className="home-feature-shade" aria-hidden="true" />
          <div className="home-feature-copy">
            <h2>Ideias que movem o seu negócio.</h2>
            <Link to="#explore-academia">Explorar conteúdos <ArrowRight size={18}/></Link>
          </div>
          <div className="home-feature-dots" aria-hidden="true"><i className="active"/><i/><i/></div>
        </section>

        <HomeShelf title="Explore a biblioteca" itemCount={courses.length} cardWidth={cardWidth}>
          {courses.map(course => <LearningCard key={course.slug} course={course} itemProgress={progress[course.slug]} cardWidth={cardWidth} carousel loading={coursesLoading}/>)}
        </HomeShelf>

        <section className="home-learning" id="meus-cursos">
          <div className="home-section-heading">
            <SectionTitle title="Continue assistindo"/>
            <Link to="/minisseries">Ver meus cursos <ArrowRight size={16}/></Link>
          </div>
          <div className="home-carousel-wrap">
            {canPrev && <button type="button" className="home-carousel-btn home-carousel-btn--left" onClick={() => setCarouselIndex(i => i - 1)} aria-label="Anterior"><ChevronLeft size={28}/></button>}
            {canNext && <button type="button" className="home-carousel-btn home-carousel-btn--right" onClick={() => setCarouselIndex(i => i + 1)} aria-label="Próximo"><ChevronRight size={28}/></button>}
          <div className="home-carousel-inner" ref={wrapRef}>
          <div className="home-carousel-track" style={{transform: `translateX(-${carouselIndex * (cardWidth + GAP)}px)`}}>
            {continueCourses.length
              ? continueCourses.map(course => <LearningCard key={course.slug} course={course} itemProgress={progress[course.slug]} cardWidth={cardWidth} carousel />)
              : <p className="home-library-empty">Os conteúdos que você assistir aparecerão aqui.</p>}
          </div>
          </div>
          </div>
        </section>


        <div className="home-content-shelves">
          {miniseriesCourses.length > 0 && <HomeShelf title="Minisséries" itemCount={miniseriesCourses.length} cardWidth={cardWidth}>{miniseriesCourses.map(course => <LearningCard key={course.slug} course={course} itemProgress={progress[course.slug]} cardWidth={cardWidth} carousel loading={coursesLoading}/>)}</HomeShelf>}
          {podcastCourses.length > 0 && <HomeShelf title="Podcasts" itemCount={podcastCourses.length} cardWidth={cardWidth}>{podcastCourses.map(course => <LearningCard key={course.slug} course={course} itemProgress={progress[course.slug]} cardWidth={cardWidth} carousel loading={coursesLoading}/>)}</HomeShelf>}
          {interviews.length > 0 && <HomeShelf title="Entrevistas" itemCount={interviews.length} cardWidth={cardWidth}>{interviews.map(interview => <InterviewCard key={interview.slug} interview={interview} cardWidth={cardWidth}/>)}</HomeShelf>}
          {articles.length > 0 && <HomeShelf title="Artigos e conteúdos" itemCount={articles.length} cardWidth={cardWidth}>{articles.map(article => <ArticleHomeCard key={article.slug} article={article} cardWidth={cardWidth}/>)}</HomeShelf>}
        </div>

        <HomeShelf title="Explore por categoria" itemCount={categoryShortcuts.length} cardWidth={categoryCardWidth} id="explore-academia">
          {categoryShortcuts.map(category => <CategoryShortcutCard key={category.to} {...category} cardWidth={categoryCardWidth}/>) }
        </HomeShelf>
      </div>
    </main></div>
  </div>
}
