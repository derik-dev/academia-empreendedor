import { useEffect, useRef, useState, useMemo, type FormEvent } from 'react'
import type { YouTubeIframeApi, YouTubePlayerInstance, YouTubeReadyEvent, YouTubePlayerEvent } from './types/youtube'
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Bookmark, Calendar, CheckCircle2, ChevronDown, ChevronRight, Clock, FileText, Info, ScanText, LayoutGrid, LoaderCircle, LockKeyhole, Mail, MoreVertical, Pause, Play, Search, ShieldCheck, SkipBack, SkipForward, SlidersHorizontal, Sun, Moon, Video, Volume2, X } from 'lucide-react'
import { useAuth } from './auth/useAuth'
import { useAdminAuth } from './auth/useAdminAuth'
import { AdminAuthProvider } from './auth/AdminAuthProvider'
import { supabase } from './lib/supabase'
import { areas, courseVideoUrls, type ContentArea } from './data/content'
import { useInterviews } from './data/useInterviews'
import { useArticles } from './data/useArticles'
import { useArticle } from './data/useArticle'
import { useZoomRecordings } from './data/useZoomRecordings'
import { usePublishedCourses } from './data/usePublishedCourses'
import { YouTubeLessonPlayer } from './components/YouTubeLessonPlayer'
import { ButtonLink, PageContent, PageHero } from './components/UI'
import { ProfilePage, SearchHeader, Sidebar } from './components/Chrome'
import { AdminCoursesPage } from './components/AdminCoursesPage'
import { AdminLoginPage } from './components/AdminLoginPage'
import { DashboardHome } from './components/DashboardHome'
import { img } from './lib/publicUrl'
import { cardCover } from './lib/cardCover'
import { getProfessorPhoto } from './lib/adminAuthors'
import { sanitizeHtml } from './lib/sanitizeHtml'

let _ytApiPromise: Promise<YouTubeIframeApi> | null = null
function loadYT(): Promise<YouTubeIframeApi> {
  const YT = window.YT
  if (YT?.Player) return Promise.resolve(YT)
  if (_ytApiPromise) return _ytApiPromise
  _ytApiPromise = new Promise<YouTubeIframeApi>((resolve, reject) => {
    let settled = false
    const done = (v: YouTubeIframeApi | Error) => {
      if (settled) return
      settled = true
      if (v instanceof Error) reject(v)
      else resolve(v)
    }
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      const yt = window.YT
      if (yt?.Player) done(yt)
      else done(new Error('YT unavailable'))
    }
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.async = true; document.head.appendChild(s)
    }
    const yt = window.YT
    if (yt?.Player) done(yt)
  }).catch(e => { _ytApiPromise = null; throw e })
  return _ytApiPromise
}

function ScrollToTop() { const { pathname } = useLocation(); useEffect(() => { window.scrollTo(0, 0) }, [pathname]); return null }
function Protected({ children }: { children: React.ReactNode }) { const { user, loading } = useAuth(); if (loading) return <div className="screen-loader"><div className="loader-dot"/><span>A preparar a Academia…</span></div>; return user ? <>{children}</> : <Navigate to="/login" replace /> }
function AdminProtected({ children }: { children: React.ReactNode }) { const { user, loading, isAdmin } = useAdminAuth(); if (loading) return <div className="admin-login-loading">Verificando sessão administrativa…</div>; return user && isAdmin ? <>{children}</> : <Navigate to="/admin/login" replace /> }

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="site-shell">
        <div className="site-main">{children}</div>
      </div>
    </div>
  )
}

function WatchShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell app-shell--watch">
      <Sidebar />
      <div className="site-shell">
        <div className="site-main">{children}</div>
      </div>
    </div>
  )
}

function useLibraryCourses() {
  const { courses: published, loading } = usePublishedCourses()
  const publishedSlugs = new Set(published.map(c => c.slug))
  const areaImage = Object.fromEntries(areas.map(a => [a.slug, a.image]))
  const withFallback = published.map(c => ({ ...c, image: c.image || areaImage[c.slug] || '' }))
  // After Supabase loads, show only what it returned — no static placeholders for managed slugs
  const staticPlaceholders = (!supabase || loading) ? areas.filter(a => !publishedSlugs.has(a.slug)) : []
  return { courses: [...staticPlaceholders, ...withFallback], loading }
}

function getYouTubeEmbedUrl(videoUrl?: string) {
  if (!videoUrl) return null
  try {
    const url = new URL(videoUrl)
    const videoId = url.hostname.includes('youtu.be') ? url.pathname.slice(1) : url.searchParams.get('v') ?? url.pathname.match(/\/embed\/([^/]+)/)?.[1]
    return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&controls=1&playsinline=1` : null
  } catch { return null }
}

function MinisSeriesPage() {
  const { user } = useAuth()
  const { courses: libraryCourses, loading: coursesLoading } = useLibraryCourses()
  const items = libraryCourses.filter(item => item.category === 'Minisséries')
  const [progress, setProgress] = useState<Record<string, { percent: number; completed: boolean }>>({})
  const gridRef = useRef<HTMLDivElement>(null)
  const [cardWidth, setCardWidth] = useState(0)

  useEffect(() => {
    if (!supabase || !user) return
    let active = true
    supabase.from('lesson_progress').select('course_slug,progress_percent,completed').eq('user_id', user.id)
      .then(({ data }) => {
        if (!active || !data) return
        const next: Record<string, { percent: number; completed: boolean }> = {}
        for (const row of data) {
          const percent = Number(row.progress_percent) || 0
          if (!next[row.course_slug] || row.completed || percent > next[row.course_slug].percent) next[row.course_slug] = { percent, completed: Boolean(row.completed) }
        }
        setProgress(next)
      })
    return () => { active = false }
  }, [user])

  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    const measure = () => {
      const columns = window.getComputedStyle(grid).gridTemplateColumns.split(' ').length
      setCardWidth((grid.clientWidth - 16 * (columns - 1)) / columns)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(grid)
    return () => ro.disconnect()
  }, [items.length])

  return <div className="app-shell app-shell--home">
    <Sidebar />
    <div className="site-shell"><main className="dashboard-home dashboard-home--reference miniseries-page"><div className="home-content">
    <section className="ms-hero" style={{ backgroundImage: `url(${img('/images/hero-minisseries.png')})` }}>
      <div className="ms-hero-shade" aria-hidden="true"/>
      <div className="ms-hero-content">
        <div className="ms-hero-copy">
          <span className="ms-hero-eyebrow">MINISSÉRIE EM DESTAQUE</span>
          <h2 className="ms-hero-title">MINISSÉRIES</h2>
          <p>Conteúdos práticos e profundos para você aprender,<br/>evoluir e construir o futuro que deseja.</p>
          <div className="ms-hero-actions">
            <Link to="/assistir/literacia-financeira" className="ms-btn-primary"><Play size={14} fill="currentColor"/> Explorar minisséries</Link>
            <button type="button" className="ms-btn-secondary"><Info size={14}/> Mais informações</button>
          </div>
        </div>
      </div>
      <div className="ms-hero-dots"><i className="active"/><i/><i/><i/></div>
    </section>

    <section className="ms-library">
      <div className="ms-library-heading">
        <h2>Explore as minisséries</h2>
        <div className="ms-hero-search"><SearchHeader /></div>
      </div>
      <div className="ms-card-grid" ref={gridRef}>
        {items.map(item => {
          const itemProgress = progress[item.slug]
          const percent = Math.min(100, Math.max(0, Math.round(itemProgress?.completed ? 100 : itemProgress?.percent ?? 0)))
          const authorName = item.author.replace('Com ', '')
          const professorPhoto = item.professorImage || getProfessorPhoto(authorName)
          const shownLesson = item.lessons?.[0]
          const durationLabel = item.durationText || (shownLesson?.durationSeconds ? formatPodcastTime(shownLesson.durationSeconds) : (item.videoCount ?? 0) > 0 ? item.videoCount + ' aulas' : 'Em breve')
          const thumbnailHeight = cardWidth > 300 ? Math.max(0, (cardWidth - 14) * 9 / 16 - 70) : undefined
          const lessonDetail = shownLesson ? 'Aula ' + (shownLesson.position + 1) + ' • ' + shownLesson.title : item.status === 'published' ? 'Aula disponível • Minissérie' : 'Conteúdo em breve'
          return <article className="home-learning-card" key={item.slug}>
            <Link to={'/assistir/' + item.slug} className={`home-learning-image${coursesLoading ? ' home-learning-image--loading' : ''}`} aria-label={'Abrir ' + item.title} style={thumbnailHeight ? {height: thumbnailHeight + 'px', aspectRatio: 'auto'} : undefined}>
              <img key={cardCover(item.image)} src={cardCover(item.image)} alt=""/>
              <span className="home-video-count">{durationLabel}</span>
            </Link>
            <div className="home-learning-body">
              <div className="home-card-title"><h3>{item.title}</h3><MoreVertical size={15}/></div>
              <p className="home-card-author">
                {professorPhoto ? <img src={img(professorPhoto)} className="home-author-avatar home-author-avatar--photo" alt=""/> : <span className="home-author-avatar">{authorName[0]?.toUpperCase()}</span>}
                {authorName}
              </p>
              <p className="home-card-detail">{lessonDetail}</p>
              <div className="home-progress-row"><div className="home-progress-track"><span style={{width: percent + '%'}}/></div><span>{percent}% concluído</span></div>
              {itemProgress || item.status === 'published'
                ? <Link className="home-continue-button" to={'/assistir/' + item.slug}><Play size={11} fill="currentColor"/>{itemProgress ? 'Continuar aula' : 'Explorar minissérie'}</Link>
                : <span className="home-continue-button home-continue-button--disabled">Em breve</span>}
            </div>
          </article>
        })}
      </div>
    </section>
  </div></main></div>
  </div>
}

function getYouTubeId(url: string) {
  try { const u = new URL(url); return u.searchParams.get('v') ?? u.pathname.slice(1) } catch { return null }
}

function formatPodcastTime(s: number) {
  const m = Math.floor(s / 60); return `${m}:${String(Math.round(s % 60)).padStart(2, '0')}`
}

function PodcastAudioPlayer({ videoId, title, author, image, playing, onPlayingChange, onClose }: { videoId: string; title: string; author: string; image?: string; playing: boolean; onPlayingChange: (playing: boolean) => void; onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YouTubePlayerInstance | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval>>()
  const playingRef = useRef(playing)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(80)

  useEffect(() => {
    let active = true
    loadYT().then(YT => {
      if (!active || !containerRef.current) return
      playerRef.current = new YT.Player(containerRef.current, {
        videoId,
        playerVars: { autoplay: 0, controls: 0, playsinline: 1 },
        events: {
          onReady: (e: YouTubeReadyEvent) => {
            if (!active) return
            const dur = e.target.getDuration()
            if (dur > 0) setDuration(dur)
            e.target.setVolume(80)
            if (playingRef.current) e.target.playVideo()
          },
          onStateChange: (e: YouTubePlayerEvent) => {
            if (!active) return
            if (e.data === 1) onPlayingChange(true)
            else if (e.data === 0 || e.data === 2) onPlayingChange(false)
            if (e.data === 1) {
              intervalRef.current = setInterval(() => setCurrentTime(Math.round(playerRef.current?.getCurrentTime?.() ?? 0)), 500)
            } else {
              clearInterval(intervalRef.current)
              if (playerRef.current?.getDuration) setDuration(Math.round(playerRef.current.getDuration()))
            }
          }
        }
      })
    }).catch(console.error)
    return () => {
      active = false
      clearInterval(intervalRef.current)
      try { playerRef.current?.destroy?.() } catch { /* ignore */ }
      playerRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId])

  useEffect(() => {
    playingRef.current = playing
    const player = playerRef.current
    if (!player) return
    const state = player.getPlayerState?.()
    if (playing && state !== 1 && state !== 3) player.playVideo()
    else if (!playing && state !== 2 && state !== 0) player.pauseVideo()
  }, [playing])

  const toggle = () => { if (playing) playerRef.current?.pauseVideo(); else playerRef.current?.playVideo() }
  const seek = (e: React.ChangeEvent<HTMLInputElement>) => { const t = Number(e.target.value); playerRef.current?.seekTo(t, true); setCurrentTime(t) }
  const changeVolume = (e: React.ChangeEvent<HTMLInputElement>) => { const v = Number(e.target.value); setVolume(v); playerRef.current?.setVolume(v) }
  const skip = (s: number) => { const t = Math.max(0, currentTime + s); playerRef.current?.seekTo(t, true); setCurrentTime(t) }

  return <div className="podcast-player-bar">
    <div style={{position:'fixed',top:0,left:0,width:'320px',height:'180px',opacity:0,pointerEvents:'none',zIndex:-1}}><div ref={containerRef}/></div>
    <div className="podcast-player-left">
      <div className="podcast-player-thumb"><img src={cardCover(image)} alt=""/></div>
      <div className="podcast-player-meta"><strong>{title}</strong><span>{author}</span></div>
    </div>
    <div className="podcast-player-center">
      <div className="podcast-player-btns">
        <button onClick={() => skip(-15)} className="podcast-ctrl-btn" aria-label="-15s"><SkipBack size={18}/></button>
        <button onClick={toggle} className="podcast-ctrl-play" aria-label={playing ? 'Pausar' : 'Reproduzir'}>
          {playing ? <Pause size={22} fill="currentColor"/> : <Play size={22} fill="currentColor"/>}
        </button>
        <button onClick={() => skip(15)} className="podcast-ctrl-btn" aria-label="+15s"><SkipForward size={18}/></button>
      </div>
      <div className="podcast-player-progress">
        <span>{formatPodcastTime(currentTime)}</span>
        <input type="range" min={0} max={duration || 100} value={currentTime} onChange={seek} className="podcast-range"/>
        <span>{formatPodcastTime(duration)}</span>
      </div>
    </div>
    <div className="podcast-player-right">
      <Volume2 size={16} className="podcast-vol-icon"/>
      <input type="range" min={0} max={100} value={volume} onChange={changeVolume} className="podcast-range podcast-range--vol"/>
      <button onClick={onClose} className="podcast-player-close" aria-label="Fechar"><X size={16}/></button>
    </div>
  </div>
}

function NativePodcastPlayer({ signedUrl, title, author, image, playing, onPlayingChange, onClose }: { signedUrl: string; title: string; author: string; image?: string; playing: boolean; onPlayingChange: (playing: boolean) => void; onClose: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(80)
  const [audioError, setAudioError] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTimeUpdate = () => setCurrentTime(Math.round(audio.currentTime))
    const onDurationChange = () => { if (isFinite(audio.duration)) setDuration(Math.round(audio.duration)) }
    const onPlay = () => { setAudioError(false); onPlayingChange(true) }
    const onPause = () => onPlayingChange(false)
    const onEnded = () => onPlayingChange(false)
    const onError = () => { onPlayingChange(false); setAudioError(true) }
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('durationchange', onDurationChange)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('durationchange', onDurationChange)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (playing && audio.paused) audio.play().catch(() => {})
    else if (!playing && !audio.paused) audio.pause()
  }, [playing])

  const toggle = () => { const a = audioRef.current; if (!a) return; if (playing) a.pause(); else { a.play().catch(() => {}) } }
  const seek = (e: React.ChangeEvent<HTMLInputElement>) => { const t = Number(e.target.value); if (audioRef.current) { audioRef.current.currentTime = t; setCurrentTime(t) } }
  const changeVolume = (e: React.ChangeEvent<HTMLInputElement>) => { const v = Number(e.target.value); setVolume(v); if (audioRef.current) audioRef.current.volume = v / 100 }
  const skip = (s: number) => { const a = audioRef.current; if (!a) return; const t = Math.max(0, Math.min(duration, currentTime + s)); a.currentTime = t; setCurrentTime(t) }

  return <div className="podcast-player-bar">
    <audio ref={audioRef} src={signedUrl} preload="metadata"/>
    <div className="podcast-player-left">
      <div className="podcast-player-thumb"><img src={cardCover(image)} alt=""/></div>
      <div className="podcast-player-meta"><strong>{title}</strong><span>{audioError ? 'Não foi possível reproduzir o áudio. Feche e tente novamente.' : author}</span></div>
    </div>
    <div className="podcast-player-center">
      <div className="podcast-player-btns">
        <button onClick={() => skip(-15)} className="podcast-ctrl-btn" aria-label="-15s" disabled={audioError}><SkipBack size={18}/></button>
        <button onClick={toggle} className="podcast-ctrl-play" aria-label={playing ? 'Pausar' : 'Reproduzir'} disabled={audioError}>
          {playing ? <Pause size={22} fill="currentColor"/> : <Play size={22} fill="currentColor"/>}
        </button>
        <button onClick={() => skip(15)} className="podcast-ctrl-btn" aria-label="+15s" disabled={audioError}><SkipForward size={18}/></button>
      </div>
      <div className="podcast-player-progress">
        <span>{formatPodcastTime(currentTime)}</span>
        <input type="range" min={0} max={duration || 100} value={currentTime} onChange={seek} className="podcast-range" disabled={audioError}/>
        <span>{formatPodcastTime(duration)}</span>
      </div>
    </div>
    <div className="podcast-player-right">
      <Volume2 size={16} className="podcast-vol-icon"/>
      <input type="range" min={0} max={100} value={volume} onChange={changeVolume} className="podcast-range podcast-range--vol" disabled={audioError}/>
      <button onClick={onClose} className="podcast-player-close" aria-label="Fechar"><X size={16}/></button>
    </div>
  </div>
}

function PodcastDetailPanel({ item, allItems, activeSlug, playing, onClose, onPlay }: { item: ContentArea; allItems: ContentArea[]; activeSlug: string | null; playing: boolean; onClose: () => void; onPlay: (item: ContentArea) => void }) {
  const nextItems = allItems.filter(i => i.slug !== item.slug)
  const authorName = item.author.replace('Com ', '')
  const authorPhoto = item.professorImage || getProfessorPhoto(authorName)
  return <aside className="pd-panel">
      <div className="pd-cover"><img src={cardCover(item.image)} alt={`Capa de ${item.title}`}/></div>
      <div className="pd-head">
        <div>
          <h2 className="pd-title">{item.title}</h2>
          <span className="pd-author">{item.author.replace('Com ', '')}</span>
        </div>
        <button className="pd-close" onClick={onClose} aria-label="Fechar"><X size={16}/></button>
      </div>
      <div className="pd-body">
        <p className="pd-desc">{item.description}</p>
        <button type="button" className="pd-play-btn" onClick={() => onPlay(item)} aria-label={activeSlug === item.slug && playing ? 'Pausar' : 'Reproduzir'}>{activeSlug === item.slug && playing ? <Pause size={16} fill="currentColor"/> : <Play size={16} fill="currentColor"/>} {activeSlug === item.slug && playing ? 'Pausar' : 'Reproduzir'}</button>
        <div className="pd-section">
          <div className="pd-section-head"><span>Créditos</span><button type="button">Mostrar tudo</button></div>
          <div className="pd-credit-card">
            <div className="pd-credit-avatar">{authorPhoto ? <img src={img(authorPhoto)} alt=""/> : authorName[0]}</div>
            <div className="pd-credit-info">
              <strong>{authorName}</strong>
              <span>Criador Principal · {item.category}</span>
            </div>
          </div>
        </div>
        {nextItems.length > 0 && <div className="pd-section">
          <div className="pd-section-head"><span>A seguir</span><button type="button">Abrir fila</button></div>
          {nextItems.map(next => <div className="pd-next-item" key={next.slug}>
            <div className="pd-next-thumb">
              <img src={cardCover(next.image)} alt=""/>
              <button type="button" className="pd-next-play" aria-label={activeSlug === next.slug && playing ? `Pausar ${next.title}` : `Reproduzir ${next.title}`} onClick={() => onPlay(next)}>{activeSlug === next.slug && playing ? <Pause size={15} fill="currentColor"/> : <Play size={15} fill="currentColor"/>}</button>
            </div>
            <div className="pd-next-info">
              <strong>{next.title}</strong>
              <span>{next.category} · {next.author.replace('Com ', '')}</span>
            </div>
          </div>)}
        </div>}
      </div>
    </aside>
}

function PodcastsPage() {
  const { courses: podcastLibrary, loading: podcastsLoading } = useLibraryCourses()
  const items = podcastLibrary.filter(item => item.category === 'Podcasts')
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedPodcastSlug = searchParams.get('podcast')
  type ActivePodcastPlayer =
    | { kind: 'youtube'; slug: string; url: string; title: string; author: string; image?: string }
    | { kind: 'native'; slug: string; signedUrl: string; title: string; author: string; image?: string }
  const [activePlayer, setActivePlayer] = useState<ActivePodcastPlayer | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playerLoading, setPlayerLoading] = useState<string | null>(null)
  const [detailItem, setDetailItem] = useState<ContentArea | null>(null)

  useEffect(() => { loadYT().catch(() => {}) }, [])
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!selectedPodcastSlug) { setDetailItem(null); return }
    const selected = items.find(item => item.slug === selectedPodcastSlug)
    if (selected) setDetailItem(selected)
  }, [selectedPodcastSlug, items])

  const openPodcast = (item: ContentArea) => {
    setDetailItem(item)
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('podcast', item.slug)
    setSearchParams(nextParams)
  }
  const togglePodcast = async (podcast: ContentArea) => {
    if (activePlayer?.slug === podcast.slug) { setIsPlaying(current => !current); openPodcast(podcast); return }
    if (podcast.audioPath && supabase) {
      setPlayerLoading(podcast.slug)
      try {
        const { data } = await supabase.storage.from('podcast-audio').createSignedUrl(podcast.audioPath, 3600)
        if (data?.signedUrl) {
          setActivePlayer({ kind: 'native', slug: podcast.slug, signedUrl: data.signedUrl, title: podcast.title, author: podcast.author.replace('Com ', ''), image: podcast.image })
          setIsPlaying(true)
          openPodcast(podcast)
          return
        }
      } catch { /* fallback to YouTube */ }
      finally { setPlayerLoading(null) }
    }
    const url = podcast.spotifyUrl || podcast.videoUrl || courseVideoUrls[podcast.slug]
    if (!url) return
    setActivePlayer({ kind: 'youtube', slug: podcast.slug, url, title: podcast.title, author: podcast.author.replace('Com ', ''), image: podcast.image })
    setIsPlaying(true)
    openPodcast(podcast)
  }

  const closePodcast = () => {
    setDetailItem(null)
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('podcast')
    setSearchParams(nextParams, { replace: true })
  }

  return <div className="app-shell app-shell--home">
    <Sidebar />
    <div className="site-shell"><main className="dashboard-home dashboard-home--reference miniseries-page"><div className="home-content">
    <section className="ms-hero" style={{ backgroundImage: `url(${img('/images/hero-minisseries.png')})` }}>
      <div className="ms-hero-shade" aria-hidden="true"/>
      <div className="ms-hero-content">
        <div className="ms-hero-copy">
          <span className="ms-hero-eyebrow">PODCAST EM DESTAQUE</span>
          <h2 className="ms-hero-title">PODCASTS</h2>
          <p>Conversas que abrem caminhos sobre mentalidade,<br/>decisões e crescimento empresarial.</p>
          <div className="ms-hero-actions">
            <Link to="/assistir/mente-blindada" className="ms-btn-primary"><Play size={14} fill="currentColor"/> Explorar podcasts</Link>
            <button type="button" className="ms-btn-secondary"><Info size={14}/> Mais informações</button>
          </div>
        </div>
      </div>
      <div className="ms-hero-dots"><i className="active"/><i/><i/></div>
    </section>

    <section className="ms-library">
      <div className="podcast-heading">
        <div className="podcast-heading-top">
          <h2>Explore os podcasts</h2>
          <div className="ms-hero-search"><SearchHeader /></div>
        </div>
        <div className="podcast-filters">
          {['Todos','Mentalidade','Negócios','Crescimento','Estratégia','Empreendedorismo'].map(f => <button type="button" key={f} className={f === 'Todos' ? 'active' : ''}>{f}</button>)}
        </div>
      </div>
      <div className="podcast-list">
        {items.map(item => (
          <article className="podcast-item" key={item.slug} onClick={() => openPodcast(item)} style={{cursor:'pointer'}}>
            <button type="button" className={`podcast-thumb${podcastsLoading ? ' podcast-thumb--loading' : ''}`} aria-label={activePlayer?.slug === item.slug && isPlaying ? `Pausar ${item.title}` : `Reproduzir ${item.title}`} onClick={e => { e.stopPropagation(); void togglePodcast(item) }}>
              <img key={cardCover(item.image)} src={cardCover(item.image)} alt=""/>
              <span className="podcast-thumb-play">{playerLoading === item.slug ? <LoaderCircle size={20} className="podcast-play-spinner"/> : activePlayer?.slug === item.slug && isPlaying ? <Pause size={20} fill="currentColor"/> : <Play size={20} fill="currentColor"/>}</span>
            </button>
            <div className="podcast-info">
              <div className="podcast-title-row">
                <span className="podcast-dot"/>
                <h3 className="podcast-title">{item.title}</h3>
              </div>
              <span className="podcast-show">{item.author.replace('Com ', '')}</span>
              <p className="podcast-desc">{item.description}</p>
              <div className="podcast-meta"><span>Em breve</span></div>
            </div>
            <div className="podcast-actions" onClick={e => e.stopPropagation()}>
              <button type="button" className="podcast-play" aria-label={activePlayer?.slug === item.slug && isPlaying ? `Pausar ${item.title}` : `Reproduzir ${item.title}`} onClick={() => void togglePodcast(item)}>{playerLoading === item.slug ? <LoaderCircle size={20} className="podcast-play-spinner"/> : activePlayer?.slug === item.slug && isPlaying ? <Pause size={20} fill="currentColor"/> : <Play size={20} fill="currentColor"/>}</button>
            </div>
          </article>
        ))}
      </div>
    </section>

    {activePlayer?.kind === 'native' && <NativePodcastPlayer key={activePlayer.slug} signedUrl={activePlayer.signedUrl} title={activePlayer.title} author={activePlayer.author} image={activePlayer.image} playing={isPlaying} onPlayingChange={setIsPlaying} onClose={() => { setIsPlaying(false); setActivePlayer(null) }}/>}
    {activePlayer?.kind === 'youtube' && <PodcastAudioPlayer videoId={getYouTubeId(activePlayer.url)!} title={activePlayer.title} author={activePlayer.author} image={activePlayer.image} playing={isPlaying} onPlayingChange={setIsPlaying} onClose={() => { setIsPlaying(false); setActivePlayer(null) }}/>}
  </div></main></div>
  {detailItem && <PodcastDetailPanel item={detailItem} allItems={items} activeSlug={activePlayer?.slug ?? null} playing={isPlaying} onClose={closePodcast} onPlay={(item) => { void togglePodcast(item) }}/>}
  </div>
}

function CourseNotes({ slug }: { slug: string }) {
  const { user } = useAuth()
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setMessage('')
    if (!supabase || !user) { setLoading(false); return () => { active = false } }
    supabase.from('course_notes').select('body').eq('user_id', user.id).eq('course_slug', slug).maybeSingle()
      .then(({ data, error }) => {
        if (!active) return
        if (error) setMessage('Não foi possível carregar suas notas.')
        else setNotes(data?.body ?? '')
        setLoading(false)
      })
    return () => { active = false }
  }, [slug, user])

  const saveNotes = async () => {
    if (!supabase || !user || saving) return
    setSaving(true); setMessage('')
    const { error } = await supabase.from('course_notes').upsert({ user_id: user.id, course_slug: slug, body: notes, updated_at: new Date().toISOString() }, { onConflict: 'user_id,course_slug' })
    setSaving(false)
    setMessage(error ? 'Não foi possível salvar. Tente novamente.' : 'Nota salva no banco de dados.')
  }

  return <section className="watch-notes" aria-labelledby="watch-notes-heading">
    <div className="watch-notes-heading"><div><p className="eyebrow">SEU ESPAÇO DE ESTUDO</p><h2 id="watch-notes-heading">Minhas notas</h2><p className="watch-notes-description">Anote ideias e aprendizados enquanto assiste. Suas notas são privadas e ficam salvas na sua conta.</p></div><span>{message || (loading ? 'Carregando suas notas…' : 'Suas anotações ficam vinculadas a este curso.')}</span></div>
    <textarea id="course-notes" aria-label="Anotações deste curso" value={notes} onChange={e => { setNotes(e.target.value); setMessage('') }} onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void saveNotes() } }} placeholder="Anote ideias, aprendizados e próximos passos deste curso..." disabled={loading}/>
    <div className="watch-notes-actions"><span>As notas são privadas e salvas na sua conta.</span><button className="button" type="button" onClick={saveNotes} disabled={loading || saving || !user || !supabase}>{saving ? 'Salvando…' : 'Salvar nota'}</button></div>
  </section>
}

type WatchLesson = { id: string; title: string; videoUrl: string; durationSeconds: number; position: number }

const formatWatchDuration = (secs: number): string => {
  const m = Math.floor(secs / 60), s = secs % 60
  return secs >= 3600
    ? `${Math.floor(secs / 3600)}:${String(m % 60).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    : `${m}:${String(s).padStart(2,'0')}`
}

function WatchPage() {
  const { slug } = useParams()
  const { user } = useAuth()
  const { courses: libraryCourses, loading: coursesLoading } = useLibraryCourses()
  const item = libraryCourses.find(area => area.slug === slug)
  const userId = user?.id
  const [lessons, setLessons] = useState<WatchLesson[]>([])
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null)

  useEffect(() => {
    if (item?.category === 'Podcasts') return
    if (supabase && userId && item?.slug) void supabase.from('course_access_events').insert({ user_id: userId, course_slug: item.slug })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, item?.slug])

  useEffect(() => {
    const client = supabase
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLessons([])
    setCurrentLessonId(null)
    if (!client || !item?.slug || item.category === 'Podcasts') return
    let active = true
    const loadLessons = async () => {
      const { data: courseRow } = await client.from('courses').select('id').eq('slug', item.slug).maybeSingle()
      if (!active || !courseRow) return
      const { data: lessonRows } = await client.from('lessons').select('id,title,video_url,duration_seconds,position').eq('course_id', courseRow.id).order('position')
      if (!active || !lessonRows?.length) return
      const loaded: WatchLesson[] = lessonRows.map((l: { id: string; title: string; video_url: string; duration_seconds: number; position: number }) => ({ id: l.id, title: l.title, videoUrl: l.video_url, durationSeconds: l.duration_seconds, position: l.position }))
      setLessons(loaded)
      setCurrentLessonId(loaded[0].id)
    }
    void loadLessons()
    return () => { active = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.slug])

  if (!item && coursesLoading) return <WatchShell><div className="watch-loading"><LoaderCircle size={28} className="watch-loading-icon"/></div></WatchShell>
  if (!item) return <NotFound />
  if (item.category === 'Podcasts') return <Navigate to={`/podcasts?podcast=${encodeURIComponent(item.slug)}`} replace />

  const currentLesson = lessons.find(l => l.id === currentLessonId) ?? null
  const legacyVideoUrl = item.videoUrl ?? courseVideoUrls[item.slug]
  const legacyEmbedUrl = getYouTubeEmbedUrl(legacyVideoUrl)

  return (
    <WatchShell>
      <div className="watch-page">
        <div className="watch-topbar">
          <Link className="watch-back" to="/" aria-label="Voltar"><ArrowLeft size={19}/></Link>
          <div>
            <span className="watch-top-category">{item.category}</span>
            <h1>{item.title}</h1>
          </div>
          <span className="watch-status">{(currentLesson || legacyEmbedUrl) ? item.status === 'published' ? 'AULA DISPONÍVEL' : 'VÍDEO DE EXEMPLO' : 'EM BREVE'}</span>
        </div>

        <div className="watch-stage">
          <div className="watch-video-col">
            {currentLesson
              ? <YouTubeLessonPlayer courseSlug={item.slug} lessonId={currentLesson.id} videoUrl={currentLesson.videoUrl}/>
              : legacyEmbedUrl
                ? <iframe className="watch-player" src={legacyEmbedUrl} title={`Aula de ${item.title}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/>
                : <div className="watch-player watch-player-placeholder"><div className="watch-play-icon"><Play size={25} fill="currentColor"/></div><span className="eyebrow">PLAYER DO CURSO</span><h2>O vídeo será adicionado em breve</h2><p>O link oficial deste curso ainda não foi fornecido.</p></div>
            }
          </div>
          <div className="watch-playlist">
            <div className="watch-playlist-header">
              <div className="watch-playlist-header-cover" style={{ backgroundImage: `url(${cardCover(item.image)})` }}/>
              <div className="watch-playlist-header-content">
                <p className="watch-playlist-eyebrow">CONTEÚDO DO CURSO</p>
                <h3>{item.title}</h3>
                <span className="watch-playlist-count">{lessons.length > 0 ? `${lessons.length} aula${lessons.length !== 1 ? 's' : ''}` : `${libraryCourses.length} cursos`}</span>
              </div>
            </div>
            <div className="watch-playlist-items">
              {lessons.length > 0
                ? lessons.map((l, i) => (
                    <button key={l.id} type="button" className={`watch-playlist-item${l.id === currentLessonId ? ' watch-playlist-item--active' : ''}`} onClick={() => setCurrentLessonId(l.id)}>
                      {l.id === currentLessonId
                        ? <span className="watch-playlist-num watch-playlist-num--playing"><span/><span/><span/></span>
                        : <span className="watch-playlist-num">{String(i + 1).padStart(2, '0')}</span>}
                      <div className="watch-playlist-info">
                        <span className="watch-playlist-title">{l.title}</span>
                        {l.durationSeconds > 0 && <span className="watch-playlist-dur">{formatWatchDuration(l.durationSeconds)}</span>}
                      </div>
                      {l.id !== currentLessonId && <span className="watch-playlist-play-btn"><Play size={12} fill="currentColor"/></span>}
                    </button>
                  ))
                : libraryCourses.map((c, i) => (
                    <Link key={c.slug} to={`/assistir/${c.slug}`} className={`watch-playlist-item watch-playlist-item--card${c.slug === slug ? ' watch-playlist-item--active' : ''}`}>
                      <div className="watch-playlist-thumb">
                        <img src={cardCover(c.image)} alt=""/>
                        {c.slug === slug
                          ? <div className="watch-playlist-thumb-active"><span/><span/><span/></div>
                          : <span className="watch-playlist-thumb-n">{String(i + 1).padStart(2, '0')}</span>}
                      </div>
                      <div className="watch-playlist-info">
                        <span className="watch-playlist-category">{c.category}</span>
                        <span className="watch-playlist-title">{c.title}</span>
                      </div>
                    </Link>
                  ))
              }
            </div>
          </div>
        </div>

        <div className="watch-below">
          <section className="watch-about">
            <p className="eyebrow">{item.author}</p>
            <h2>{currentLesson ? currentLesson.title : item.title}</h2>
            <p>{item.description}</p>
          </section>
        </div>

        {item.notesEnabled !== false && <CourseNotes key={item.slug} slug={item.slug}/>}
      </div>
    </WatchShell>
  )
}


const sortOptions = [
  { key: 'recentes', label: 'Mais recentes' },
  { key: 'antigos', label: 'Mais antigos' },
  { key: 'vistos', label: 'Mais vistos' },
] as const
type SortKey = typeof sortOptions[number]['key']

function interviewThumb(thumb?: string): string {
  return cardCover(thumb)
}

function InterviewsPage() {
  const { interviews: allInterviews, loading } = useInterviews()
  const [filter, setFilter] = useState('Todos')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('recentes')
  const [showSort, setShowSort] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)
  const [cardWidth, setCardWidth] = useState(0)
  const ivFilters = ['Todos', 'Negócios', 'Mentalidade', 'Marketing', 'Vendas', 'Produtividade', 'Gestão', 'Carreira']

  const interviews = [...allInterviews]
    .filter(iv => filter === 'Todos' || iv.subtitle?.toLowerCase().includes(filter.toLowerCase()))
    .filter(iv => {
      const q = normalizeSearch(search)
      if (!q) return true
      return normalizeSearch(iv.title).includes(q) || normalizeSearch(iv.guest).includes(q) || normalizeSearch(iv.subtitle ?? '').includes(q)
    })
    .sort((a, b) => {
      if (sortBy === 'antigos') return allInterviews.indexOf(b) - allInterviews.indexOf(a)
      return 0
    })

  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    const measure = () => {
      const columns = window.getComputedStyle(grid).gridTemplateColumns.split(' ').length
      setCardWidth((grid.clientWidth - 16 * (columns - 1)) / columns)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(grid)
    return () => ro.disconnect()
  }, [interviews.length])

  return <div className="app-shell app-shell--home">
    <Sidebar />
    <div className="site-shell"><main className="dashboard-home dashboard-home--reference miniseries-page interviews-page"><div className="home-content">
    <section className="ms-hero iv-hero" style={{ backgroundImage: `url(${img('/images/interviews-page-banner.png')})`, backgroundPosition: '100% 35%' }}>
      <div className="ms-hero-shade" aria-hidden="true"/>
      <div className="ms-hero-content">
        <div className="ms-hero-copy">
          <span className="ms-hero-eyebrow">ENTREVISTA EM DESTAQUE</span>
          <h2 className="ms-hero-title">ENTREVISTAS</h2>
          <p>Conversas com pessoas e percursos que acrescentam<br/>novas perspetivas ao caminho empreendedor.</p>
          <div className="ms-hero-actions">
            <button type="button" className="ms-btn-primary"><Play size={14} fill="currentColor"/> Explorar entrevistas</button>
            <button type="button" className="ms-btn-secondary"><Info size={14}/> Mais informações</button>
          </div>
        </div>
      </div>
      <div className="ms-hero-dots"><i className="active"/><i/><i/></div>
    </section>

    <section className="ms-library">
      <div className="iv-library-top">
        <h2>Explore as entrevistas</h2>
        <div className="iv-library-controls">
          <div className="iv-search"><Search size={15}/><input type="text" placeholder="Pesquisar entrevistas, convidados ou temas..." value={search} onChange={e => setSearch(e.target.value)}/></div>
          <div className="iv-sort-wrap">
            <button type="button" className={`iv-sort-btn${showSort ? ' active' : ''}`} onClick={() => setShowSort(v => !v)}>
              {sortOptions.find(o => o.key === sortBy)?.label} <ChevronDown size={14}/>
            </button>
            {showSort && <div className="iv-sort-dropdown">
              {sortOptions.map(o => <button type="button" key={o.key} className={`iv-sort-option${sortBy === o.key ? ' active' : ''}`} onClick={() => { setSortBy(o.key); setShowSort(false) }}>{o.label}</button>)}
            </div>}
          </div>
        </div>
      </div>
      <div className="iv-filters">
        {ivFilters.map(f => <button type="button" key={f} className={`iv-filter-btn${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>{f === 'Todos' && <LayoutGrid size={13}/>}{f}</button>)}
      </div>
      {!loading && interviews.length === 0 && <div style={{padding:'40px 0',textAlign:'center',color:'#5a7a9a',fontSize:14}}>Nenhuma entrevista encontrada.</div>}
      <div className="iv-card-grid" ref={gridRef}>
        {interviews.map(iv => {
          const thumbnailHeight = cardWidth > 300 ? Math.max(0, (cardWidth - 14) * 9 / 16 - 70) : undefined
          const authorName = iv.author || iv.guest
          const authorPhoto = getProfessorPhoto(authorName)
          return <article className="home-learning-card iv-home-card" key={iv.slug}>
            <Link to={`/entrevistas/${iv.slug}`} className="home-learning-image" aria-label={`Assistir ${iv.title}`} style={thumbnailHeight ? {height: thumbnailHeight + 'px', aspectRatio: 'auto'} : undefined}>
              <img src={interviewThumb(iv.thumb)} alt=""/>
              <span className="home-video-count">{iv.duration}</span>
            </Link>
            <div className="home-learning-body">
              <div className="home-card-title"><h3>{iv.title}</h3><MoreVertical size={15}/></div>
              <p className="home-card-author">
                {authorPhoto ? <img src={img(authorPhoto)} className="home-author-avatar home-author-avatar--photo" alt=""/> : <span className="home-author-avatar">{authorName[0]?.toUpperCase()}</span>}
                {authorName}
              </p>
              <p className="home-card-detail">{iv.guestRole || iv.subtitle}</p>
              <Link className="home-continue-button" to={`/entrevistas/${iv.slug}`}><Play size={11} fill="currentColor"/>Assistir entrevista</Link>
            </div>
          </article>
        })}
      </div>
    </section>
  </div></main></div>
  </div>
}
const zoomCategoryColors: Record<string, string> = {
  'vendas': '#3b82f6',
  'marketing': '#8b5cf6',
  'gestão e operação': '#06b6d4',
  'planejamento': '#f59e0b',
  'produtividade': '#10b981',
  'mentalidade': '#ec4899',
  'finanças': '#ef4444',
  'perguntas e respostas': '#6366f1',
}
function parseDurationToMinutes(text: string): number {
  const h = Number(text.match(/(\d+)h/)?.[1] ?? 0)
  const m = Number(text.match(/(\d+)min/)?.[1] ?? 0)
  return h * 60 + m
}

function ZoomPage() {
  const { recordings } = useZoomRecordings()
  const categoryCounts = new Map<string, { name: string; count: number }>()
  recordings.forEach(recording => {
    const name = recording.category.trim()
    if (!name) return
    const key = name.toLocaleLowerCase('pt-BR')
    const current = categoryCounts.get(key)
    if (current) current.count += 1
    else categoryCounts.set(key, { name, count: 1 })
  })
  const zoomCategories = Array.from(categoryCounts.values()).map(category => ({
    ...category,
    color: zoomCategoryColors[category.name.toLocaleLowerCase('pt-BR')] ?? '#64748b',
  }))
  const totalMinutes = recordings.reduce((sum, r) => sum + parseDurationToMinutes(r.duration), 0)
  const totalHoursLabel = totalMinutes >= 60
    ? `${Math.floor(totalMinutes / 60)}h${totalMinutes % 60 > 0 ? ` ${totalMinutes % 60}min` : ''}`
    : totalMinutes > 0 ? `${totalMinutes}min` : '—'

  const [filter, setFilter] = useState('Todos')
  const [search, setSearch] = useState('')
  const zoomGridRef = useRef<HTMLDivElement>(null)
  const [zoomCardWidth, setZoomCardWidth] = useState(0)
  const zoomFilters = ['Todos', 'Aulas', 'Mentorias', 'Workshops', 'Vendas', 'Marketing', 'Gestão', 'Produtividade', 'Planejamento']

  const filtered = recordings.filter(r => {
    const matchType = filter === 'Todos' || r.type + 's' === filter || r.category === filter || r.type === filter
    const q = normalizeSearch(search)
    const matchSearch = !q || normalizeSearch(r.title).includes(q) || normalizeSearch(r.description).includes(q)
    return matchType && matchSearch
  })

  useEffect(() => {
    const grid = zoomGridRef.current
    if (!grid) return
    const measure = () => {
      const columns = window.getComputedStyle(grid).gridTemplateColumns.split(' ').length
      setZoomCardWidth((grid.clientWidth - 16 * (columns - 1)) / columns)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(grid)
    return () => ro.disconnect()
  }, [filtered.length])

  return (
    <div className="app-shell app-shell--home">
      <Sidebar />
      <div className="site-shell">
        <main className="dashboard-home dashboard-home--reference miniseries-page">
          <div className="home-content">

            {/* Hero */}
            <section className="zoom-hero">
              <div className="zoom-hero-left">
                <span className="ms-hero-eyebrow">REVER · APRENDER · APLICAR</span>
                <h1 className="zoom-hero-title">Gravações Zoom</h1>
                <p className="zoom-hero-desc">Aulas e encontros gravados para rever os principais temas ao seu ritmo.</p>
                <a href="#gravacoes" className="zoom-cta"><Play size={13}/> Ver gravações <ArrowRight size={13}/></a>
                <div className="zoom-stats">
                  <div className="zoom-stat"><Video size={18}/><div><strong>{recordings.length}</strong><span>replays disponíveis</span></div></div>
                  <div className="zoom-stat"><Clock size={18}/><div><strong>{totalHoursLabel}</strong><span>de conteúdo gravado</span></div></div>
                  <div className="zoom-stat"><LayoutGrid size={18}/><div><strong>{zoomCategories.length}</strong><span>categorias de temas</span></div></div>
                </div>
              </div>
              <div className="zoom-hero-img" style={{ backgroundImage: `url(${img('/images/zoom-page-banner.png')})` }}/>
            </section>

            {/* Body */}
            <div className="zoom-body" id="gravacoes">

              {/* Library */}
              <div className="zoom-library">
                <div className="zoom-lib-header">
                  <div className="zoom-lib-title">
                    <Video size={20} className="zoom-lib-icon"/>
                    <div>
                      <h2>Biblioteca de gravações</h2>
                      <p>Explore todas as aulas, mentorias e encontros gravados.</p>
                    </div>
                  </div>
                  <div className="iv-search zoom-search-input"><Search size={15}/><input type="text" placeholder="Buscar gravações..." value={search} onChange={e => setSearch(e.target.value)}/></div>
                </div>

                <div className="zoom-filters">
                  <div className="zoom-filter-pills">
                    {zoomFilters.map(f => <button key={f} type="button" className={`zoom-pill${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>{f}</button>)}
                  </div>
                  <button type="button" className="zoom-sort-btn"><SlidersHorizontal size={13}/> Mais recentes <ChevronDown size={12}/></button>
                </div>

                <div className="zoom-list" ref={zoomGridRef}>
                  {filtered.map(r => {
                    const thumbnailHeight = zoomCardWidth > 300 ? Math.max(0, (zoomCardWidth - 14) * 9 / 16 - 70) : undefined
                    return <article key={r.id} className="home-learning-card zoom-home-card">
                      <div className="home-learning-image" style={thumbnailHeight ? {height: thumbnailHeight + 'px', aspectRatio: 'auto'} : undefined}>
                        <img src={r.thumb} alt={r.title}/>
                        <span className="home-video-count">{r.duration}</span>
                      </div>
                      <div className="home-learning-body">
                        <div className="home-card-title"><h3>{r.title}</h3><MoreVertical size={15}/></div>
                        <p className="home-card-author">{r.type} · {r.category}</p>
                        <p className="home-card-detail">{r.description}</p>
                        <div className="home-progress-row zoom-card-meta"><span><Calendar size={12}/>{r.date}</span><span><Clock size={12}/>{r.duration}</span></div>
                        <Link to={`/gravacoes-zoom/${r.id}`} className="home-continue-button"><Play size={11} fill="currentColor"/>Assistir</Link>
                      </div>
                    </article>
                  })}
                  {filtered.length === 0 && <div style={{padding:'40px 0',textAlign:'center',color:'#5a7a9a',fontSize:14}}>Nenhuma gravação encontrada.</div>}
                </div>
              </div>

              {/* Sidebar */}
              <aside className="zoom-sidebar">
                <div className="zoom-latest">
                  <div className="zoom-latest-header">
                    <span className="zoom-sidebar-label"><Clock size={14}/> Últimas adicionadas</span>
                    
                  </div>
                  {recordings.slice(0, 3).map(r => (
                    <Link key={r.id} to={`/gravacoes-zoom/${r.id}`} className="zoom-latest-card">
                      <div className="zoom-latest-thumb">
                        <img src={r.thumb} alt={r.title}/>
                        <span className="zoom-duration zoom-duration--sm">{r.duration}</span>
                      </div>
                      <div className="zoom-latest-info">
                        <p className="zoom-latest-title">{r.title}</p>
                        <span className="zoom-latest-date"><Calendar size={10}/> {r.date}</span>
                      </div>
                    </Link>
                  ))}
                </div>

                <div className="zoom-cats">
                  <div className="zoom-sidebar-label" style={{marginBottom:14}}><LayoutGrid size={14}/> Categorias</div>
                  {zoomCategories.map(c => (
                    <button key={c.name} type="button" className="zoom-cat-row" onClick={() => setFilter(c.name)}>
                      <span className="zoom-cat-dot" style={{ background: c.color }}/>
                      <span className="zoom-cat-name">{c.name}</span>
                      <span className="zoom-cat-count">{c.count}</span>
                      <ChevronRight size={12}/>
                    </button>
                  ))}
                </div>
              </aside>

            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
function normalizeSearch(text: string): string {
  const aliases: Record<string, string> = {
    'oque': 'o que', 'oq': 'o que',
    'pq': 'porque', 'porq': 'porque', 'por que': 'porque', 'por quê': 'porque',
    'tb': 'tambem', 'tbm': 'tambem',
    'pro': 'para o', 'pra': 'para',
    'vc': 'voce', 'vcs': 'voces',
    'q ': 'que ', 'n ': 'nao ',
    'td': 'tudo', 'tds': 'todos',
    'mt': 'muito', 'mto': 'muito',
  }
  let s = text
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  for (const [abbr, full] of Object.entries(aliases)) {
    s = s.replace(new RegExp(`\\b${abbr}\\b`, 'g'), full)
  }
  return s
}

function BlogPage() {
  const { articles, loading } = useArticles()
  const [filter, setFilter] = useState('Todos')
  const [search, setSearch] = useState('')
  const blogFilters = ['Todos', 'Mentalidade', 'Negócios', 'Produtividade', 'Carreira', 'Dinheiro', 'Hábitos']

  const filtered = articles
    .filter(a => filter === 'Todos' || a.category === filter)
    .filter(a => {
      const q = normalizeSearch(search)
      if (!q) return true
      return normalizeSearch(a.title).includes(q) || normalizeSearch(a.excerpt).includes(q)
    })

  const [featured, ...rest] = filtered
  const sideArticles = rest.slice(0, 4)
  const moreArticles = filtered.slice(5)
  const moreSmall = moreArticles.slice(0, Math.min(moreArticles.length - 1, 4))
  const moreFeatured = moreArticles.length > 0 ? moreArticles[moreArticles.length - 1] : undefined

  return <div className="app-shell app-shell--home">
    <Sidebar />
    <div className="site-shell"><main className="dashboard-home dashboard-home--reference miniseries-page"><div className="home-content">
    <section className="ms-hero blog-hero" style={{ backgroundImage: `url(${img('/images/bg-blog.png')})` }}>
      <div className="ms-hero-shade" aria-hidden="true"/>
      <div className="ms-hero-content">
        <div className="ms-hero-copy">
          <span className="ms-hero-eyebrow">IDEIAS PARA FAZER ACONTECER</span>
          <h2 className="ms-hero-title">BLOG</h2>
          <p>Reflexões e conhecimento para quem está<br/>a construir o próximo passo.</p>
        </div>
      </div>
      <div className="ms-hero-dots"><i className="active"/><i/><i/></div>
    </section>

    <div className="blog-toolbar">
      <div className="blog-cat-filters">
        {blogFilters.map(f => <button type="button" key={f} className={`blog-cat-btn${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>{f}</button>)}
      </div>
      <div className="iv-search blog-search"><Search size={15}/><input type="text" placeholder="Pesquisar artigos..." value={search} onChange={e => setSearch(e.target.value)}/></div>
    </div>

    {loading && <div className="screen-loader" style={{padding:'60px 0',textAlign:'center',color:'#5a7a9a'}}>A carregar artigos…</div>}
    {!loading && !featured && <div style={{padding:'60px 0',textAlign:'center',color:'#5a7a9a',fontSize:15}}>Nenhum artigo encontrado.</div>}
    {!loading && featured && <div className="blog-grid">
      <Link to={`/blog/${featured.slug}`} className="blog-card blog-card--featured">
        <div className="blog-card-img" style={{ backgroundImage: `url(${featured.image})` }}>
          <span className="blog-cat-tag">{featured.category.toUpperCase()}</span>
        </div>
        <div className="blog-card-body">
          <h2 className="blog-card-title blog-card-title--lg">{featured.title}</h2>
          {featured.excerpt && <p className="blog-card-desc">{featured.excerpt}</p>}
          <div className="blog-article-meta">
            <span><Calendar size={13}/> {featured.date}</span>
            <span className="blog-meta-sep"/>
            <span><Clock size={13}/> {featured.readTime}</span>
          </div>
        </div>
      </Link>

      <div className="blog-side-grid">
        {sideArticles.map(a => <Link to={`/blog/${a.slug}`} className="blog-card" key={a.slug}>
          <div className="blog-card-img blog-card-img--sm" style={{ backgroundImage: `url(${a.image})` }}>
            <span className="blog-cat-tag blog-cat-tag--sm">{a.category.toUpperCase()}</span>
          </div>
          <div className="blog-card-body blog-card-body--sm">
            <h3 className="blog-card-title">{a.title}</h3>
            <div className="blog-article-meta">
              <span><Calendar size={12}/> {a.date}</span>
              <span className="blog-meta-sep"/>
              <span><Clock size={12}/> {a.readTime}</span>
            </div>
          </div>
        </Link>)}
      </div>
    </div>}

    {!loading && moreArticles.length > 0 && <section className="blog-more">
      <div className="blog-more-heading"><h2>Mais artigos</h2><Link to="/blog" className="blog-ver-todos">Ver todos <ArrowRight size={14}/></Link></div>
      {moreArticles.length >= 4
        ? <div className="blog-more-row">
            <div className="blog-more-small-grid">
              {moreSmall.map(a => <Link to={`/blog/${a.slug}`} className="blog-card" key={a.slug}>
                <div className="blog-card-img blog-card-img--sm" style={{ backgroundImage: `url(${a.image})` }}>
                  <span className="blog-cat-tag blog-cat-tag--sm">{a.category.toUpperCase()}</span>
                </div>
                <div className="blog-card-body blog-card-body--sm">
                  <h3 className="blog-card-title">{a.title}</h3>
                  <div className="blog-article-meta">
                    <span><Calendar size={12}/> {a.date}</span>
                    <span className="blog-meta-sep"/>
                    <span><Clock size={12}/> {a.readTime}</span>
                  </div>
                </div>
              </Link>)}
            </div>
            {moreFeatured && <Link to={`/blog/${moreFeatured.slug}`} className="blog-card blog-card--featured">
              <div className="blog-card-img" style={{ backgroundImage: `url(${moreFeatured.image})`, height: '520px' }}>
                <span className="blog-cat-tag">{moreFeatured.category.toUpperCase()}</span>
              </div>
              <div className="blog-card-body">
                <h2 className="blog-card-title blog-card-title--lg">{moreFeatured.title}</h2>
                {moreFeatured.excerpt && <p className="blog-card-desc">{moreFeatured.excerpt}</p>}
                <div className="blog-article-meta">
                  <span><Calendar size={13}/> {moreFeatured.date}</span>
                  <span className="blog-meta-sep"/>
                  <span><Clock size={13}/> {moreFeatured.readTime}</span>
                </div>
              </div>
            </Link>}
          </div>
        : <div className={`blog-more-compact${moreArticles.length === 1 ? ' blog-more-compact--single' : ''}`}>
            {moreArticles.map(a => <Link to={`/blog/${a.slug}`} className="blog-card" key={a.slug}>
              <div className="blog-card-img blog-card-img--sm" style={{ backgroundImage: `url(${a.image})` }}>
                <span className="blog-cat-tag blog-cat-tag--sm">{a.category.toUpperCase()}</span>
              </div>
              <div className="blog-card-body blog-card-body--sm">
                <h3 className="blog-card-title">{a.title}</h3>
                <div className="blog-article-meta">
                  <span><Calendar size={12}/> {a.date}</span>
                  <span className="blog-meta-sep"/>
                  <span><Clock size={12}/> {a.readTime}</span>
                </div>
              </div>
            </Link>)}
          </div>
      }
    </section>}
  </div></main></div>
  </div>
}
function BlogArticlePage() {
  const { slug } = useParams()
  const { article, loading } = useArticle(slug)
  const { articles } = useArticles()
  const related = articles.filter(a => a.slug !== slug).slice(0, 3)
  const [focusMode, setFocusMode] = useState(false)
  const [lightMode, setLightMode] = useState(false)
  const safeContent = useMemo(() => sanitizeHtml(article?.content ?? ''), [article?.content])

  useEffect(() => {
    if (!focusMode) return
    const exitOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setFocusMode(false) }
    document.addEventListener('keydown', exitOnEscape)
    return () => document.removeEventListener('keydown', exitOnEscape)
  }, [focusMode])

  if (loading) return (
    <div className="app-shell app-shell--home"><Sidebar/>
      <div className="site-shell"><main className="dashboard-home dashboard-home--reference miniseries-page">
        <div className="screen-loader" style={{padding:'80px 0',textAlign:'center',color:'#5a7a9a'}}>A carregar artigo…</div>
      </main></div>
    </div>
  )

  if (!article) return (
    <div className="app-shell app-shell--home"><Sidebar/>
      <div className="site-shell"><main className="dashboard-home dashboard-home--reference miniseries-page">
        <div className="screen-loader" style={{padding:'80px 0',textAlign:'center',color:'#5a7a9a'}}>Artigo não encontrado.</div>
      </main></div>
    </div>
  )

  return <div className={`app-shell app-shell--home${focusMode ? ' blog-focus-mode' : ''}${lightMode ? ' blog-light-mode' : ''}`}>
    <Sidebar/>
    <div className="site-shell"><main className="dashboard-home dashboard-home--reference miniseries-page"><div className="home-content"><div className="ba-wrap">
      {/* Hero */}
      <div className="ba-hero">
        <div className="ba-hero-text">
          <div className="ba-breadcrumb">
            <Link to="/blog" className="ba-breadcrumb-link">Blog</Link>
            <ChevronRight size={13}/>
            <span>{article.category}</span>
          </div>
          <span className="blog-cat-tag" style={{marginBottom:14,display:'inline-block'}}>{article.category.toUpperCase()}</span>
          <h1 className="ba-title">{article.title}</h1>
          <p className="ba-excerpt">{article.excerpt}</p>
          <div className="ba-meta">
            <span><Calendar size={13}/> {article.date}</span>
            <span className="blog-meta-sep"/>
            <span><Clock size={13}/> {article.readTime}</span>
          </div>
        </div>
        <div className="ba-hero-img" style={{ backgroundImage: `url(${article.image})` }}/>
      </div>

      {/* Vídeo */}
      {article.videoUrl && (() => {
        const embedUrl = getYouTubeEmbedUrl(article.videoUrl)
        return embedUrl ? <div className="ba-video-wrap"><iframe className="ba-video" src={embedUrl} title={article.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/></div> : null
      })()}

      {/* Body */}
      <div className="ba-layout">
        <aside className="ba-share">
          <button type="button" className="ba-share-btn ba-focus-toggle" onClick={() => setFocusMode(enabled => !enabled)} aria-pressed={focusMode} aria-label={focusMode ? 'Sair do modo foco' : 'Ativar modo foco'} title={focusMode ? 'Sair do modo foco' : 'Ativar modo foco'}><ScanText size={16}/></button>
          <button type="button" className="ba-share-btn ba-theme-toggle" onClick={() => setLightMode(light => !light)} aria-pressed={lightMode} aria-label={lightMode ? 'Ativar modo escuro' : 'Ativar modo claro'} title={lightMode ? 'Ativar modo escuro' : 'Ativar modo claro'}>{lightMode ? <Moon size={16}/> : <Sun size={16}/>}</button>
        </aside>

        <article className="ba-content" dangerouslySetInnerHTML={{ __html: safeContent }}/>
      </div>

      {/* Relacionados */}
      {related.length > 0 && <section className="ba-related">
        <h2 className="ba-related-title">Artigos relacionados</h2>
        <div className="ba-related-grid">
          {related.map(a => <Link to={`/blog/${a.slug}`} key={a.slug} className="ba-related-card">
            <div className="ba-related-img" style={{ backgroundImage: `url(${a.image})` }}>
              <span className="blog-cat-tag blog-cat-tag--sm">{a.category.toUpperCase()}</span>
            </div>
            <div className="ba-related-body">
              <h3 className="ba-related-card-title">{a.title}</h3>
              <div className="blog-article-meta">
                <span><Calendar size={12}/> {a.date}</span>
                <span className="blog-meta-sep"/>
                <span><Clock size={12}/> {a.readTime}</span>
              </div>
            </div>
          </Link>)}
        </div>
      </section>}

    </div></div></main></div>
  </div>
}

function NoticesPage() { return <Shell><PageContent><PageHero eyebrow="COMUNIDADE EXCLUSIVA" title="Canal de Avisos" description="Acompanhe novidades sobre agenda, novas aulas e eventos online e presenciais." image={img('/images/avisos-comunidade-central.png')} action={{ label: 'Ver avisos', to: '#avisos' }}/><div id="avisos" className="notice-panel notice-page-panel"><div className="notice-copy"><p className="eyebrow"><span className="whatsapp-dot"/> CANAL DE AVISOS</p><h2>Faça parte da conversa.</h2><p>"Temos um grupo no WhatsApp privado e exclusivo onde colocamos informações sobre agenda, novas aulas e até sobre eventos online e presenciais."</p><div className="notice-coming"><span className="notice-lock"><LockKeyhole size={14}/></span> O convite estará disponível em breve.</div></div><div className="notice-page-art"><img src={img('/images/avisos-comunidade-central.png')} alt="Telemóvel com notificações da comunidade da Academia"/></div></div></PageContent></Shell> }

function InterviewWatchPage() {
  const { slug } = useParams()
  const { user } = useAuth()
  const { interviews } = useInterviews()
  const current = interviews.find(iv => iv.slug === slug) ?? interviews[0]
  const related = interviews.filter(iv => iv.slug !== current?.slug)

  const [watched, setWatched] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [saved, setSaved] = useState(false)
  const notesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWatched(false)
    if (!supabase || !user || !current) return
    let active = true
    supabase.from('lesson_progress').select('completed').eq('user_id', user.id).eq('course_slug', current.slug).maybeSingle()
      .then(({ data }) => { if (active && data?.completed) setWatched(true) })
    return () => { active = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, current?.slug])

  if (!current) return <WatchShell><div className="screen-loader"><div className="loader-dot"/><span>A carregar entrevista…</span></div></WatchShell>

  const embedUrl = current.videoId ? `https://www.youtube-nocookie.com/embed/${current.videoId}?rel=0&controls=1&playsinline=1` : null

  const toggleWatched = async () => {
    const next = !watched
    setWatched(next)
    if (!supabase || !user) return
    await supabase.from('lesson_progress').upsert({
      user_id: user.id, course_slug: current.slug, lesson_id: current.slug,
      completed: next, progress_percent: next ? 100 : 0,
      current_time_seconds: 0, duration_seconds: 0,
      last_watched_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,course_slug,lesson_id' })
  }

  return <WatchShell>
    <div className="iv-watch">
      <div className="iv-watch-main">
        <h1 className="iv-watch-title">{current.title}</h1>
        <div className="iv-watch-player-wrap">
          {embedUrl
            ? <iframe className="iv-watch-player" src={embedUrl} title={current.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/>
            : <div className="iv-watch-player iv-watch-no-video"><Play size={32} fill="currentColor"/><p>Vídeo em breve</p></div>
          }
        </div>
        <div className="iv-watch-info">
          <div className="iv-watch-meta-row">
            <div className="iv-watch-guest">
              <span className="iv-watch-avatar">{current.guest[0]}</span>
              <div className="iv-watch-guest-info">
                <strong>{current.guest}</strong>
                <span>{current.guestRole}</span>
              </div>
            </div>
            <div className="iv-watch-actions">
              <button type="button" className={`iv-watch-btn${watched ? ' iv-watch-btn--done' : ''}`} onClick={toggleWatched}>
                <CheckCircle2 size={15}/> {watched ? 'Visto' : 'Marcar como visto'}
              </button>
              <button type="button" className={`iv-watch-btn${showNotes ? ' iv-watch-btn--active' : ''}`} onClick={() => { setShowNotes(v => { if (!v) setTimeout(() => notesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); return !v }) }}>
                <FileText size={15}/> Anotações
              </button>
              <button type="button" className={`iv-watch-btn${saved ? ' iv-watch-btn--active' : ''}`} onClick={() => setSaved(v => !v)}>
                <Bookmark size={15} fill={saved ? 'currentColor' : 'none'}/> {saved ? 'Salvo' : 'Salvar na lista'}
              </button>
            </div>
          </div>
          <p className="iv-watch-desc">{current.subtitle}</p>
          <span className="iv-watch-stats">{current.timeAgo}</span>
          {showNotes && <div ref={notesRef}><CourseNotes key={current.slug} slug={current.slug}/></div>}
        </div>
      </div>

      <aside className="iv-watch-sidebar">
        <div className="iv-watch-sidebar-tabs">
          <button type="button" className="active">Todos</button>
          <button type="button">Da mesma série</button>
        </div>
        <div className="iv-watch-related">
          {related.map(iv => <Link to={`/entrevistas/${iv.slug}`} key={iv.slug} className="iv-related-card">
            <div className="iv-related-thumb">
              <div className="iv-related-play"><Play size={14} fill="currentColor"/></div>
              <span className="iv-related-duration">{iv.duration}</span>
            </div>
            <div className="iv-related-info">
              <strong>{iv.title}</strong>
              <span>{iv.guest} · {iv.guestRole}</span>
              <span>{iv.timeAgo}</span>
            </div>
          </Link>)}
        </div>
      </aside>
    </div>
  </WatchShell>
}

function ZoomWatchPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const { recordings, loading } = useZoomRecordings()
  const current = recordings.find(r => r.id === id) ?? (loading ? null : recordings[0])
  const related = recordings.filter(r => r.id !== current?.id)
  const [watched, setWatched] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWatched(false)
    if (!supabase || !user || !current) return
    let active = true
    supabase.from('lesson_progress').select('completed').eq('user_id', user.id).eq('course_slug', 'zoom-' + current.id).maybeSingle()
      .then(({ data }) => { if (active && data?.completed) setWatched(true) })
    return () => { active = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, current?.id])

  if (loading || !current) return <WatchShell><div className="screen-loader"><div className="loader-dot"/><span>A carregar gravação…</span></div></WatchShell>

  const embedUrl = current.videoUrl ? getYouTubeEmbedUrl(current.videoUrl) : null

  const toggleWatched = async () => {
    const next = !watched
    setWatched(next)
    if (!supabase || !user) return
    await supabase.from('lesson_progress').upsert({
      user_id: user.id, course_slug: 'zoom-' + current.id, lesson_id: current.id,
      completed: next, progress_percent: next ? 100 : 0,
      current_time_seconds: 0, duration_seconds: 0,
      last_watched_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,course_slug,lesson_id' })
  }

  return <WatchShell>
    <div className="iv-watch">
      <div className="iv-watch-main">
        <Link to="/gravacoes-zoom" className="zoom-watch-back"><ArrowLeft size={15}/> Biblioteca de gravações</Link>
        <h1 className="iv-watch-title">{current.title}</h1>
        <div className="iv-watch-player-wrap">
          {embedUrl
            ? <iframe className="iv-watch-player" src={embedUrl} title={current.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/>
            : <div className="iv-watch-player iv-watch-no-video"><Play size={32} fill="currentColor"/><p>Vídeo em breve</p></div>}
        </div>
        <div className="iv-watch-info">
          <div className="iv-watch-meta-row">
            <div className="iv-watch-guest">
              <span className="zoom-type-badge">{current.type}</span>
              <div className="iv-watch-guest-info">
                <strong>{current.category}</strong>
                <span><Calendar size={11}/> {current.date} · <Clock size={11}/> {current.duration}</span>
              </div>
            </div>
            <div className="iv-watch-actions">
              <button type="button" className={`iv-watch-btn${watched ? ' iv-watch-btn--done' : ''}`} onClick={toggleWatched}>
                <CheckCircle2 size={15}/> {watched ? 'Visto' : 'Marcar como visto'}
              </button>
            </div>
          </div>
          <p className="iv-watch-desc">{current.description}</p>
        </div>
      </div>

      <aside className="iv-watch-sidebar">
        <div className="iv-watch-sidebar-tabs"><button type="button" className="active">Outras gravações</button></div>
        <div className="iv-watch-related">
          {related.map(r => <Link to={`/gravacoes-zoom/${r.id}`} key={r.id} className="iv-related-card">
            <div className="iv-related-thumb">
              <img src={r.thumb} alt="" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'6px'}}/>
              <div className="iv-related-play"><Play size={14} fill="currentColor"/></div>
              <span className="iv-related-duration">{r.duration}</span>
            </div>
            <div className="iv-related-info">
              <strong>{r.title}</strong>
              <span>{r.type} · {r.category}</span>
              <span>{r.date}</span>
            </div>
          </Link>)}
        </div>
      </aside>
    </div>
  </WatchShell>
}

function LoginPage() {
  const { user, signIn, configured } = useAuth()
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  if (user) return <Navigate to="/" replace />
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(''); setLoading(true); const message = await signIn(identifier, password); setLoading(false); if (message) setError(message); else navigate('/') }
  return <main className="login-screen"><div className="login-art"><img src={img('/images/login-academia-briefing.png')} alt="Empreendedor a escrever estratégia no quadro"/><div className="login-art-shade"/><Link className="brand login-brand" to="/"><img className="brand-logo" src={img('/images/logo.webp')} alt=""/><span className="brand-name">ACADEMIA <b>DO EMPREENDEDOR</b></span></Link><div className="login-art-copy"><p className="eyebrow">PENSAR. CONSTRUIR. CRESCER.</p><h1>ACADEMIA DO<br/>EMPREENDEDOR</h1><p>Um espaço para aprender, partilhar e avançar em conjunto.</p></div><span className="login-art-foot">UM ESPAÇO PRIVADO DE CONHECIMENTO</span></div><section className="login-form-side"><div className="login-mobile-brand"><Link className="brand" to="/"><img className="brand-logo" src={img('/images/logo.webp')} alt=""/><span className="brand-name">ACADEMIA <b>DO EMPREENDEDOR</b></span></Link></div><div className="login-form-wrap"><span className="login-icon"><ShieldCheck size={19}/></span><p className="eyebrow">BEM-VINDO DE VOLTA</p><h2>Entre na Academia.</h2><p className="login-intro">Aceda à sua área privada com a sua conta.</p><form onSubmit={submit}><label htmlFor="identifier">E-mail</label><div className="input-wrap"><Mail size={17}/><input id="identifier" type="email" autoComplete="email" placeholder="nome@empresa.com" value={identifier} onChange={e => setIdentifier(e.target.value)} required/></div><label htmlFor="password">Senha</label><div className="input-wrap"><LockKeyhole size={17}/><input id="password" type="password" autoComplete="current-password" placeholder="A sua senha" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}/></div>{error && <p className="form-error" role="alert">{error}</p>}<button className="button login-submit" type="submit" disabled={loading}>{loading ? <><span className="button-spinner"/>A entrar…</> : <>Entrar <ArrowRight size={16}/></>}</button></form>{!configured && <p className="config-hint"><span className="hint-dot"/> Para ativar o login, configure <code>.env</code> com as variáveis do Supabase.</p>}<div className="login-foot"><span>ACESSO À ÁREA PRIVADA</span><span>ACESSO POR CONTA</span></div></div><p className="login-copyright">© {new Date().getFullYear()} Academia do Empreendedor</p></section></main>
}

function NotFound() { return <Shell><PageContent><div className="not-found"><span className="eyebrow">404 · PÁGINA NÃO ENCONTRADA</span><h1>Este caminho ainda<br/>não existe.</h1><ButtonLink to="/">Voltar ao início</ButtonLink></div></PageContent></Shell> }

export default function App() {
  return <><ScrollToTop/><Routes>
    <Route path="/login" element={<LoginPage/>}/>
    <Route path="/" element={<Protected><DashboardHome/></Protected>}/>
    <Route path="/minisseries" element={<Protected><MinisSeriesPage/></Protected>}/>
    <Route path="/podcasts" element={<Protected><PodcastsPage/></Protected>}/>
    <Route path="/assistir/:slug" element={<Protected><WatchPage/></Protected>}/>
    <Route path="/entrevistas" element={<Protected><InterviewsPage/></Protected>}/>
    <Route path="/entrevistas/:slug" element={<Protected><InterviewWatchPage/></Protected>}/>
    <Route path="/blog" element={<Protected><BlogPage/></Protected>}/>
    <Route path="/blog/:slug" element={<Protected><BlogArticlePage/></Protected>}/>
    <Route path="/gravacoes-zoom" element={<Protected><ZoomPage/></Protected>}/>
    <Route path="/gravacoes-zoom/:id" element={<Protected><ZoomWatchPage/></Protected>}/>
    <Route path="/avisos" element={<Protected><NoticesPage/></Protected>}/>
    <Route path="/admin/login" element={<AdminAuthProvider><AdminLoginPage/></AdminAuthProvider>}/>
    <Route path="/admin" element={<AdminAuthProvider><AdminProtected><AdminCoursesPage/></AdminProtected></AdminAuthProvider>}/>
    <Route path="/perfil" element={<Protected><Shell><ProfilePage/></Shell></Protected>}/>
    <Route path="*" element={<NotFound/>}/>
  </Routes></>
}

