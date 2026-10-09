import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { supabase } from '../lib/supabase'
import { getYouTubeVideoId } from '../lib/youtube'
import type { YouTubeIframeApi, YouTubePlayerInstance, YouTubePlayerStateCode } from '../types/youtube'

const YOUTUBE_IFRAME_API_URL = 'https://www.youtube.com/iframe_api'
const PROGRESS_SAVE_INTERVAL_MS = 15_000

type PlayerState = 'loading' | 'unstarted' | 'playing' | 'paused' | 'ended' | 'buffering' | 'cued' | 'error'
type ProgressRow = {
  current_time_seconds: number
  duration_seconds: number
  progress_percent: number
  completed: boolean
}

let iframeApiPromise: Promise<YouTubeIframeApi> | null = null

function loadYouTubeIframeAPI(): Promise<YouTubeIframeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (iframeApiPromise) return iframeApiPromise

  iframeApiPromise = new Promise<YouTubeIframeApi>((resolve, reject) => {
    let settled = false
    const finish = (result: YouTubeIframeApi | Error) => {
      if (settled) return
      settled = true
      window.clearTimeout(timeoutId)
      if (result instanceof Error) reject(result)
      else resolve(result)
    }
    const timeoutId = window.setTimeout(() => finish(new Error('A API do YouTube demorou para responder.')), 20_000)
    const previousReadyHandler = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previousReadyHandler?.()
      if (window.YT?.Player) finish(window.YT)
      else finish(new Error('A API do YouTube não ficou disponível.'))
    }

    let script = document.querySelector<HTMLScriptElement>(`script[src="${YOUTUBE_IFRAME_API_URL}"]`)
    if (!script) {
      script = document.createElement('script')
      script.src = YOUTUBE_IFRAME_API_URL
      script.async = true
      document.head.appendChild(script)
    }
    script.addEventListener('error', () => finish(new Error('Não foi possível carregar a API do YouTube.')), { once: true })
    if (window.YT?.Player) finish(window.YT)
  }).catch(error => {
    iframeApiPromise = null
    throw error
  })

  return iframeApiPromise
}

function readPlayerTime(player: YouTubePlayerInstance) {
  try {
    return {
      currentTime: Math.max(0, Math.floor(player.getCurrentTime() || 0)),
      duration: Math.max(0, Math.floor(player.getDuration() || 0)),
    }
  } catch {
    return { currentTime: 0, duration: 0 }
  }
}

function formatTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const seconds = safeSeconds % 60
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`
}

function stateFromCode(code: YouTubePlayerStateCode, api: YouTubeIframeApi): PlayerState {
  if (code === api.PlayerState.PLAYING) return 'playing'
  if (code === api.PlayerState.PAUSED) return 'paused'
  if (code === api.PlayerState.ENDED) return 'ended'
  if (code === api.PlayerState.BUFFERING) return 'buffering'
  if (code === api.PlayerState.CUED) return 'cued'
  return 'unstarted'
}

export function YouTubeLessonPlayer({ courseSlug, lessonId, videoUrl }: { courseSlug: string; lessonId: string; videoUrl: string }) {
  const { user } = useAuth()
  const videoId = getYouTubeVideoId(videoUrl)
  const userId = user?.id
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YouTubePlayerInstance | null>(null)
  const playerGenerationRef = useRef(0)
  const intervalRef = useRef<number | null>(null)
  const activeRef = useRef(false)
  const savingRef = useRef(false)
  const completedRef = useRef(false)
  const lastSavedAtRef = useRef(0)
  const saveProgressRef = useRef<(finished?: boolean) => Promise<void>>(async () => {})
  const messageTimeoutRef = useRef<number | null>(null)
  const [ready, setReady] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [progressPercent, setProgressPercent] = useState(0)
  const [savedTime, setSavedTime] = useState(0)
  const [hasSavedProgress, setHasSavedProgress] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [message, setMessage] = useState('')
  const [playerError, setPlayerError] = useState(videoId ? '' : 'Este link do YouTube não é válido.')

  const showProgressError = useCallback((text: string) => {
    if (messageTimeoutRef.current !== null) window.clearTimeout(messageTimeoutRef.current)
    setMessage(text)
    messageTimeoutRef.current = window.setTimeout(() => {
      setMessage('')
      messageTimeoutRef.current = null
    }, 5000)
  }, [])

  const saveProgress = useCallback(async (finished = false) => {
    const player = playerRef.current
    if (!player || !supabase || !userId || savingRef.current) return

    const time = readPlayerTime(player)
    const isCompleted = completedRef.current || finished
    const percent = isCompleted ? 100 : time.duration > 0 ? Math.min(99, (time.currentTime / time.duration) * 100) : progressPercent
    const savedCurrentTime = isCompleted && finished && time.duration > 0 ? time.duration : time.currentTime
    if (activeRef.current) {
      setCurrentTime(savedCurrentTime)
      if (time.duration > 0) setDuration(time.duration)
      setProgressPercent(percent)
    }
    if (isCompleted) {
      completedRef.current = true
      if (activeRef.current) setCompleted(true)
    }

    savingRef.current = true
    lastSavedAtRef.current = Date.now()
    try {
      const { error } = await supabase.from('lesson_progress').upsert({
        user_id: userId,
        course_slug: courseSlug,
        lesson_id: lessonId,
        current_time_seconds: isCompleted && finished && time.duration > 0 ? time.duration : time.currentTime,
        duration_seconds: time.duration,
        progress_percent: Number(percent.toFixed(2)),
        completed: isCompleted,
        last_watched_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,course_slug,lesson_id' })
      if (!activeRef.current) return
      if (error) {
        console.error('[lesson_progress] Falha ao salvar o progresso da aula.', error)
        showProgressError('O progresso não pôde ser salvo.')
      } else {
        setSavedTime(savedCurrentTime)
        setHasSavedProgress(true)
      }
    } catch {
      if (activeRef.current) showProgressError('O progresso não pôde ser salvo.')
    } finally {
      savingRef.current = false
    }
  }, [courseSlug, lessonId, progressPercent, showProgressError, userId])

  useEffect(() => { saveProgressRef.current = saveProgress }, [saveProgress])

  useEffect(() => {
    activeRef.current = true
    const generation = ++playerGenerationRef.current
    if (!videoId) {
      return () => { activeRef.current = false }
    }

    void loadYouTubeIframeAPI().then(loadedApi => {
      if (!activeRef.current || playerGenerationRef.current !== generation || !containerRef.current) return
      const player = new loadedApi.Player(containerRef.current, {
        videoId,
        playerVars: {
          controls: 1,
          enablejsapi: 1,
          fs: 1,
          origin: window.location.origin,
          rel: 0,
          playsinline: 1,
        },
        events: {
          onReady: event => {
            if (!activeRef.current || playerGenerationRef.current !== generation) return
            playerRef.current = event.target
            setReady(true)
            lastSavedAtRef.current = Date.now()
            void (async () => {
              if (supabase && userId) {
                try {
                  const { data, error } = await supabase.from('lesson_progress')
                    .select('current_time_seconds,duration_seconds,progress_percent,completed')
                    .eq('user_id', userId)
                    .eq('course_slug', courseSlug)
                    .eq('lesson_id', lessonId)
                    .maybeSingle()
                  if (!activeRef.current) return
                  if (error) {
                    console.error('[lesson_progress] Falha ao carregar o progresso da aula.', error)
                    showProgressError('O progresso anterior não pôde ser carregado.')
                  }
                  if (data) {
                    const saved = data as ProgressRow
                    completedRef.current = saved.completed
                    setCompleted(saved.completed)
                    setCurrentTime(saved.completed ? saved.duration_seconds : saved.current_time_seconds)
                    setSavedTime(saved.current_time_seconds)
                    setHasSavedProgress(true)
                    setDuration(saved.duration_seconds)
                    setProgressPercent(saved.completed ? 100 : saved.progress_percent)
                    if (!saved.completed && saved.current_time_seconds > 0 && (!saved.duration_seconds || saved.current_time_seconds < saved.duration_seconds)) {
                      event.target.seekTo(saved.current_time_seconds, true)
                    }
                  }
                } catch {
                  if (activeRef.current) showProgressError('O progresso anterior não pôde ser carregado.')
                }
              } else {
                showProgressError('O progresso não está disponível nesta sessão.')
              }
              if (!activeRef.current) return
              const initial = readPlayerTime(event.target)
              if (initial.duration > 0) setDuration(initial.duration)
              if (initial.currentTime > 0) setCurrentTime(initial.currentTime)
              intervalRef.current = window.setInterval(() => {
                const activePlayer = playerRef.current
                if (!activePlayer || !activeRef.current) return
                const time = readPlayerTime(activePlayer)
                setCurrentTime(time.currentTime)
                if (time.duration > 0) setDuration(time.duration)
                if (time.duration > 0 && !completedRef.current) {
                  setProgressPercent(Math.min(99, (time.currentTime / time.duration) * 100))
                }
                try {
                  if (activePlayer.getPlayerState() === loadedApi.PlayerState.PLAYING && Date.now() - lastSavedAtRef.current >= PROGRESS_SAVE_INTERVAL_MS) {
                    void saveProgressRef.current()
                  }
                } catch { /* Player may be shutting down during navigation. */ }
              }, 1000)
            })()
          },
          onStateChange: event => {
            if (!activeRef.current || playerGenerationRef.current !== generation) return
            const nextState = stateFromCode(event.data, loadedApi)
            if (nextState === 'paused') void saveProgressRef.current()
            if (nextState === 'ended') void saveProgressRef.current(true)
          },
          onError: () => {
            if (!activeRef.current || playerGenerationRef.current !== generation) return
            setPlayerError('Este vídeo não está disponível para reprodução.')
          },
        },
      })
      playerRef.current = player
    }).catch(error => {
      if (!activeRef.current || playerGenerationRef.current !== generation) return
      setPlayerError(error instanceof Error ? error.message : 'Não foi possível carregar o vídeo.')
    })

    return () => {
      activeRef.current = false
      playerGenerationRef.current += 1
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
      intervalRef.current = null
      if (playerRef.current) {
        void saveProgressRef.current()
        try { playerRef.current.destroy() } catch { /* Ignore teardown errors from the iframe API. */ }
        playerRef.current = null
      }
    }
  }, [courseSlug, lessonId, showProgressError, userId, videoId])

  useEffect(() => () => {
    if (messageTimeoutRef.current !== null) window.clearTimeout(messageTimeoutRef.current)
  }, [])

  const shownPercent = completed ? 100 : Math.round(progressPercent)

  const showResumePoint = hasSavedProgress && !completed && savedTime > 0

  return <div className="youtube-player-shell" data-current-time={currentTime} data-duration={duration} data-progress-percent={shownPercent}>
    <div className="youtube-player-aspect">
      <div className="youtube-player-frame" ref={containerRef} />
      {!ready && !playerError && <div className="youtube-player-loading" role="status"><span className="youtube-player-spinner"/>Carregando vídeo...</div>}
      {playerError && <div className="youtube-player-error" role="alert"><span className="eyebrow">PLAYER DO YOUTUBE</span><p>{playerError}</p></div>}
    </div>
    <div className="lesson-progress-summary" aria-live="polite">
      <strong>{shownPercent}% concluído</strong>
      {showResumePoint && <span>Continuar de {formatTime(savedTime)}</span>}
    </div>
    {message && <p className="youtube-progress-message" role="status">{message}</p>}
  </div>
}
