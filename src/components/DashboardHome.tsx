import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, Bell, ChevronDown, ChevronLeft, ChevronRight, MoreVertical, Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { areas, courseVideoUrls, type ContentArea } from '../data/content'
import { usePublishedCourses } from '../data/usePublishedCourses'
import { img } from '../lib/publicUrl'
import { cardCover } from '../lib/cardCover'
import { getProfessorPhoto } from '../lib/adminAuthors'
import { useInterviews } from '../data/useInterviews'
import type { Interview } from '../types/interview'
import { useArticles } from '../data/useArticles'
import { supabase } from '../lib/supabase'
import { SearchHeader, Sidebar } from './Chrome'

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

function formatVideoDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}


function LearningCard({ course, itemProgress, cardWidth, carousel = false, loading = false }: { course: ContentArea; itemProgress?: Progress; cardWidth: number; carousel?: boolean; loading?: boolean }) {
  const isPodcast = course.category === 'Podcasts'
  const contentHref = isPodcast ? '/podcasts?podcast=' + encodeURIComponent(course.slug) : '/assistir/' + course.slug
  const percent = Math.min(100, Math.max(0, Math.round(itemProgress?.completed ? 100 : itemProgress?.percent ?? 0)))
  const hasVideo = Boolean(course.videoUrl || courseVideoUrls[course.slug])
  const authorName = course.author.replace('Com ', '')
  const professorPhoto = course.professorImage || getProfessorPhoto(authorName)
  const shownLesson = itemProgress?.lessonTitle
    ? { title: itemProgress.lessonTitle, position: itemProgress.lessonPosition ?? 0, durationSeconds: itemProgress.duration }
    : course.lessons?.[0]
  const durationLabel = itemProgress?.duration || shownLesson?.durationSeconds
    ? formatVideoDuration(itemProgress?.duration || shownLesson?.durationSeconds || 0)
    : course.durationText || ((course.videoCount ?? 0) > 0 ? course.videoCount + ' aulas' : 'Em breve')
  const lessonDetail = shownLesson
    ? 'Aula ' + (shownLesson.position + 1) + ' • ' + shownLesson.title
    : hasVideo ? 'Aula disponível • ' + course.category.replace(/s$/, '') : 'Conteúdo em breve'

  return <article className="home-learning-card" style={carousel && cardWidth ? {flex: '0 0 ' + cardWidth + 'px'} : undefined}>
    <Link to={contentHref} className={`home-learning-image${loading ? ' home-learning-image--loading' : ''}`} aria-label={(isPodcast ? 'Abrir podcast ' : 'Abrir ') + course.title}>
      <img key={cardCover(course.image)} src={cardCover(course.image)} alt="" />
      <span className="home-video-count">{durationLabel}</span>
    </Link>
    <div className="home-learning-body">
      <div className="home-card-title"><h3>{course.title}</h3><MoreVertical size={15}/></div>
      <p className="home-card-author">
        {professorPhoto
          ? <img src={img(professorPhoto)} className="home-author-avatar home-author-avatar--photo" alt=""/>
          : <span className="home-author-avatar">{authorName[0]?.toUpperCase()}</span>}
        {authorName}
      </p>
      <p className="home-card-detail">{lessonDetail}</p>
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


function HomeShelf({ title, children, itemCount, cardWidth }: { title: string; children: ReactNode; itemCount: number; cardWidth: number }) {
  const [index, setIndex] = useState(0)
  const VISIBLE = 3
  const GAP = 16
  const canPrev = itemCount > VISIBLE && index > 0
  const canNext = itemCount > VISIBLE && index < itemCount - VISIBLE
  return <section className="home-shelf">
    <div className="home-section-heading home-shelf-heading"><h2>{title}</h2></div>
    <div className="home-carousel-wrap">
      {canPrev && <button type="button" className="home-carousel-btn home-carousel-btn--left" onClick={() => setIndex(i => i - 1)} aria-label="Anterior"><ChevronLeft size={28}/></button>}
      {canNext && <button type="button" className="home-carousel-btn home-carousel-btn--right" onClick={() => setIndex(i => i + 1)} aria-label="Próximo"><ChevronRight size={28}/></button>}
      <div className="home-carousel-inner">
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
  const featured = courses.find(course => course.slug === 'literacia-financeira') ?? courses[0]
  const miniseriesCourses = courses.filter(course => course.category === 'Minisséries')
  const podcastCourses = courses.filter(course => course.category === 'Podcasts')

  return <div className="app-shell app-shell--home">
    <Sidebar />
    <div className="site-shell"><main className="dashboard-home dashboard-home--reference">
      <div className="home-content">
        <section className="home-welcome">
          <div className="home-welcome-copy"><h1>Olá, {displayName}</h1><p>Continue sua jornada de aprendizagem.</p></div>
          <div className="home-search-bar"><SearchHeader /></div>
          <div className="home-welcome-actions">
            <span className="topbar-notification"><Bell size={21}/><i/></span>
            <Link className="topbar-account" to="/perfil"><span className="avatar">{displayName[0]?.toUpperCase()}</span><strong>{displayName}</strong><ChevronDown size={16}/></Link>
          </div>
        </section>

        {featured && <section className="home-feature" style={{backgroundImage: `url(${img('/images/hero-bg.png')})`}}>
          <div className="home-feature-shade" aria-hidden="true" />
          <div className="home-feature-copy">
            <span>TRILHA EM DESTAQUE</span>
            <h2>{featured.title}</h2>
            <p>Aprenda a organizar suas finanças e tomar melhores decisões.</p>
            <Link to={`/assistir/${featured.slug}`}>Explorar trilha <ArrowRight size={18}/></Link>
          </div>
          <div className="home-feature-dots" aria-hidden="true"><i className="active"/><i/><i/></div>
        </section>}

        <HomeShelf title="Explore a biblioteca" itemCount={courses.length} cardWidth={cardWidth}>
          {courses.map(course => <LearningCard key={course.slug} course={course} itemProgress={progress[course.slug]} cardWidth={cardWidth} carousel loading={coursesLoading}/>)}
        </HomeShelf>

        <section className="home-learning" id="meus-cursos">
          <div className="home-section-heading">
            <h2>Continue assistindo</h2>
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
      </div>
    </main></div>
  </div>
}
