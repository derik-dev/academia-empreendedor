import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, ArrowUpRight, Bell, BookOpen, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronUp, Clock, Eye, FileText, GraduationCap, Grid2X2, Hash, ImageIcon, ImagePlus, Info, LayoutDashboard, Lightbulb, Link2, ListVideo, LoaderCircle, LogOut, Mail, Mic2, Music, Newspaper, Pencil, Plus, Save, Search, Sparkles, SpellCheck, Trash2, Type, Upload, User, Users, Video, X } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAdminAuth } from '../auth/useAdminAuth'
import { adminSupabase } from '../lib/supabase'
import { MAX_AUDIO_BYTES, resolveAudioSource } from '../lib/audioSource'
import { formatAudioDuration } from '../lib/audioDuration'
import { img } from '../lib/publicUrl'
import { cardCover } from '../lib/cardCover'
import { getProfessorPhoto } from '../lib/adminAuthors'
import { areas } from '../data/content'
import { AdminPodcastCatalog, Waveform } from './AdminPodcastCatalog'
import { AdminHeroArtwork } from './AdminHeroArtwork'
import { AdminSelect, type AdminSelectOption } from './AdminSelect'
import { getYouTubeVideoId } from '../lib/youtube'
import { correctText, generateArticle, sortLessonsByAI, type GenerateParams } from '../lib/groq'
import { readAudioDuration } from '../lib/audioDuration'
import { blankDraft, type CourseDraft, type LessonDraft } from '../lib/adminCourseDraft'

async function readFnError(error: unknown, data: unknown, fallback: string): Promise<string> {
  if (data && typeof data === 'object' && 'error' in (data as object)) return String((data as Record<string, unknown>).error)
  if (error) {
    try {
      const b = await (error as { context?: { json?: () => Promise<{ error?: unknown }> } })?.context?.json?.()
      if (b?.error) return String(b.error)
    } catch { /* ignore JSON parse errors */ }
  }
  return fallback
}

type AdminSection = 'overview' | 'courses' | 'podcasts' | 'interviews' | 'blog' | 'zoom' | 'notices' | 'students'

const adminSections: { id: AdminSection; label: string; Icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Visão geral', Icon: LayoutDashboard },
  { id: 'courses', label: 'Minisséries', Icon: BookOpen },
  { id: 'podcasts', label: 'Podcasts', Icon: Mic2 },
  { id: 'interviews', label: 'Entrevistas', Icon: Video },
  { id: 'blog', label: 'Blog e artigos', Icon: Newspaper },
  { id: 'zoom', label: 'Gravações do Zoom', Icon: Video },
  { id: 'notices', label: 'Canal de avisos', Icon: Bell },
  { id: 'students', label: 'Alunos', Icon: GraduationCap },
]
const sectionInfo: Record<AdminSection, { title: string; description: string; publicPath?: string }> = {
  overview: { title: 'Visão geral', description: 'Acompanhe os números e as novidades da Academia.' },
  courses: { title: 'Minisséries', description: 'Crie, edite e publique minisséries na biblioteca.' },
  podcasts: { title: 'Podcasts', publicPath: '/podcasts', description: 'Organize e publique os podcasts disponíveis na Academia.' },
  interviews: { title: 'Entrevistas', description: 'Acompanhe a área de entrevistas da plataforma.', publicPath: '/entrevistas' },
  blog: { title: 'Blog e artigos', description: 'Acompanhe os artigos e conteúdos editoriais.', publicPath: '/blog' },
  zoom: { title: 'Gravações do Zoom', description: 'Acompanhe as gravações de aulas e encontros.', publicPath: '/gravacoes-zoom' },
  notices: { title: 'Canal de avisos', description: 'Acompanhe a página de novidades e avisos da comunidade.', publicPath: '/avisos' },
  students: { title: 'Alunos', description: 'Gira os alunos registados na Academia.' },
}

function AdminFeedback({ type, message, onClose, modal = false }: { type: 'success' | 'error'; message: string; onClose: () => void; modal?: boolean }) {
  const isSuccess = type === 'success'
  const isPublished = isSuccess && /publicad/i.test(message)
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])
  useEffect(() => {
    const timeout = window.setTimeout(() => onCloseRef.current(), 4000)
    return () => window.clearTimeout(timeout)
  }, [type, message])
  return <div className={`admin-alert admin-alert-${type}${modal ? ' admin-modal-alert' : ''}`} role={isSuccess ? 'status' : 'alert'}>
    <span className="admin-alert-icon">{isSuccess ? <CheckCircle2 size={24}/> : <Info size={23}/>}</span>
    <span className="admin-alert-copy"><strong>{isSuccess ? isPublished ? 'Publicado com sucesso!' : 'Tudo certo!' : 'Não foi possível concluir'}</strong><span>{message}</span></span>
    <span className="admin-alert-badge">{isSuccess ? isPublished ? 'PUBLICADO' : 'CONCLUÍDO' : 'ERRO'}</span>
    <button type="button" onClick={onClose} aria-label="Fechar"><X size={17}/></button>
  </div>
}

function AdminShell({ children, section, onSectionChange }: { children: React.ReactNode; section: AdminSection; onSectionChange?: (section: AdminSection) => void }) {
  const { user, signOut } = useAdminAuth()
  const navigate = useNavigate()
  const handleSignOut = async () => { await signOut(); navigate('/admin/login') }
  return <div className="admin-app-shell">
    <aside className="admin-sidebar">
      <Link to="/admin" className="admin-brand"><img src={img('/images/logo.svg')} alt=""/><span>ACADEMIA <b>ADMIN</b></span></Link>
      <p className="admin-sidebar-label">GESTÃO</p>
      {adminSections.map(({ id, label, Icon }) => <Link key={id} to={id === 'overview' ? '/admin' : `/admin?section=${id}`} onClick={() => onSectionChange?.(id)} className={`admin-side-link${section === id ? ' active' : ''}`} aria-current={section === id ? 'page' : undefined}><Icon size={17}/> {label}</Link>)}
      <div className="admin-promo-card">
        <strong>Academia Admin</strong>
        <p>Gira os cursos, os alunos e os conteúdos da plataforma.</p>
        <Link to="/" className="admin-promo-btn">Abrir Academia</Link>
      </div>
      <div className="admin-sidebar-bottom">
        <span className="admin-account-label">SESSÃO ADMINISTRATIVA</span>
        <span className="admin-account-email">{user?.email}</span>
        <button className="admin-side-link admin-logout" type="button" onClick={() => void handleSignOut()}><LogOut size={16}/> Terminar sessão</button>
      </div>
    </aside>
    <div className="admin-workspace"><header className="admin-topbar"><span>Painel administrativo{section !== 'overview' && <> <span className="admin-topbar-divider">/</span> {sectionInfo[section].title}</>}</span><Link to="/" className="admin-view-site"><Eye size={15}/> Abrir site <ArrowUpRight size={14}/></Link></header>{children}</div>
  </div>
}

export type Course = {
  id: string
  slug: string
  title: string
  description: string
  cover_url: string
  instructor: string
  category: 'course' | 'miniseries' | 'podcast' | 'interview' | 'zoom_recording' | 'blog'
  video_url: string | null
  body: string | null
  lesson_count: number | null
  duration_text: string | null
  level: 'Iniciante' | 'Intermédio' | 'Avançado' | null
  status: 'draft' | 'published' | 'scheduled'
  notes_enabled: boolean
  published_at: string | null
  scheduled_for: string | null
  position: number | null
  audio_path: string | null
  zoom_type?: string
  zoom_category?: string
  interview_author?: string
  created_at: string
}
type DeleteCourseConfirmation = { id: string; title: string; audioPath: string | null }
type CourseAccess = { id: string; user_id: string; course_slug: string; accessed_at: string }
type LessonRow = { id: string; course_id: string; title: string; video_url: string | null; audio_path: string | null; duration_seconds: number; position: number; cover_url: string | null }
type StudentRow = { id: string; name: string; email: string; created_at: string }
type PlaylistVideoItem = { videoId: string; title: string; videoUrl: string; durationSeconds: number }
type ActiveLessonForm = { id: string; title: string; videoUrl: string; audioPath: string; originalAudioPath: string; audioFileName: string; durationText: string; coverFile: File | null; coverPreview: string; isNew: boolean }

type AudioUploadResponse = { path: string; url: string; bytes: number; mime: string }

function uploadAudioWithProgress(
  uploadUrl: string,
  file: File,
  token: string,
  onProgress: (pct: number) => void,
  signal: AbortSignal,
): Promise<AudioUploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const formData = new FormData()
    formData.append('file', file)
    if (signal.aborted) { reject(new DOMException('O envio foi cancelado.', 'AbortError')); return }
    xhr.open('POST', uploadUrl)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.timeout = 15 * 60 * 1000
    xhr.upload.onprogress = event => { if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100)) }
    xhr.onload = () => {
      if (xhr.status === 401) { reject(new Error('A sessão expirou. Inicie sessão novamente.')); return }
      if (xhr.status === 403) { reject(new Error('Esta conta não tem permissão de administrador.')); return }
      if (xhr.status === 413) { reject(new Error('O ficheiro é demasiado grande. Envie um MP3 com menos de 150 MB.')); return }
      if (xhr.status === 415) { reject(new Error('Envie apenas ficheiros MP3. Converta o WAV para MP3 antes de enviar.')); return }

      let body: unknown
      try { body = JSON.parse(xhr.responseText) as unknown }
      catch { reject(new Error('Ocorreu um erro inesperado. Tente novamente.')); return }
      if (xhr.status < 200 || xhr.status >= 300) {
        const message = body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
          ? body.error
          : `Não foi possível enviar o áudio (erro ${xhr.status}).`
        reject(new Error(message))
        return
      }
      const responseBody = body as Record<string, unknown> | null
      if (!responseBody || typeof responseBody.path !== 'string' || !/^podcasts\/\d{4}\/\d{2}\/[a-f0-9]{32}-[a-z0-9-]+\.mp3$/.test(responseBody.path)) {
        reject(new Error('Não foi possível processar o envio. Tente novamente.'))
        return
      }
      resolve({
        path: responseBody.path,
        url: typeof responseBody.url === 'string' ? responseBody.url : '',
        bytes: typeof responseBody.bytes === 'number' ? responseBody.bytes : 0,
        mime: typeof responseBody.mime === 'string' ? responseBody.mime : 'audio/mpeg',
      })
    }
    xhr.onerror = () => reject(new Error('Falha de rede ao enviar o áudio. Verifique a ligação e tente novamente.'))
    xhr.ontimeout = () => reject(new Error('O envio demorou demasiado tempo. Verifique a ligação e tente novamente.'))
    xhr.onabort = () => reject(new DOMException('O envio foi cancelado.', 'AbortError'))
    signal.addEventListener('abort', () => xhr.abort(), { once: true })
    xhr.send(formData)
  })
}
function getDeleteAudioUrl(uploadUrl: string): string {
  const url = new URL(uploadUrl)
  if (!url.pathname.endsWith('/upload-audio.php')) throw new Error('VITE_AUDIO_UPLOAD_URL deve terminar em /upload-audio.php.')
  url.pathname = url.pathname.replace(/upload-audio\.php$/, 'delete-audio.php')
  return url.toString()
}

function safeResolveAudioSource(audioPath: string | null | undefined): ReturnType<typeof resolveAudioSource> {
  try { return resolveAudioSource(audioPath) }
  catch { return null }
}

const defaultArticleCategories: AdminSelectOption[] = [
  { value: 'Mentalidade', label: 'Mentalidade', color: '#ec4899' },
  { value: 'Negócios', label: 'Negócios', color: '#3b82f6' },
  { value: 'Produtividade', label: 'Produtividade', color: '#10b981' },
  { value: 'Carreira', label: 'Carreira', color: '#f59e0b' },
  { value: 'Dinheiro', label: 'Dinheiro', color: '#22c55e' },
  { value: 'Hábitos', label: 'Hábitos', color: '#8b5cf6' },
]

const sectionCategory: Partial<Record<AdminSection, Course['category']>> = {
  courses: 'miniseries', podcasts: 'podcast', interviews: 'interview', zoom: 'zoom_recording', blog: 'blog',
}
const PROFESSOR_OPTIONS = [
  { value: 'Eric Pereira', label: 'Eric Pereira', avatar: img('/images/professores/eric-prerira.png') },
  { value: 'Enio Mota',   label: 'Enio Mota',    avatar: img('/images/professores/enio.png') },
]

const sectionCats: Partial<Record<AdminSection, Course['category'][]>> = {
  courses: ['course', 'miniseries'],
  podcasts: ['podcast'], interviews: ['interview'], zoom: ['zoom_recording'], blog: ['blog'],
}
const sectionMeta: Partial<Record<AdminSection, { item: string; plural: string; eyebrow: string; titleLabel: string; authorLabel: string; videoLabel: string }>> = {
  courses:    { item: 'minissérie', plural: 'minisséries', eyebrow: 'MINISSÉRIES', titleLabel: 'Título da minissérie', authorLabel: 'Autor', videoLabel: 'Ligação da aula' },
  podcasts:   { item: 'podcast',    plural: 'podcasts',    eyebrow: 'PODCASTS',     titleLabel: 'Título do podcast',    authorLabel: 'Autores',        videoLabel: 'Ligação do áudio' },
  interviews: { item: 'entrevista', plural: 'entrevistas', eyebrow: 'ENTREVISTAS',  titleLabel: 'Título da entrevista', authorLabel: 'Convidado',      videoLabel: 'Ligação do vídeo' },
  zoom:       { item: 'gravação',   plural: 'gravações',   eyebrow: 'GRAVAÇÕES',    titleLabel: 'Título da gravação',   authorLabel: 'Apresentador',   videoLabel: 'Ligação do vídeo' },
  blog:       { item: 'artigo',     plural: 'artigos',     eyebrow: 'BLOG',         titleLabel: 'Título do artigo',     authorLabel: 'Autor',          videoLabel: 'Ligação do vídeo' },
}
const areaImage: Record<string, string> = Object.fromEntries(areas.map(a => [a.slug, a.image]))

const monthName = (date: Date) => new Intl.DateTimeFormat('pt-PT', { month: 'short' }).format(date).replace('.', '')
const dateLabel = (value: string) => new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium' }).format(new Date(value))
const slugify = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const formatDurationSeconds = (secs: number): string => {
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60
  return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`
}
const parseDurationInput = (text: string): number => {
  const parts = text.trim().split(':').map(Number)
  if (!parts.length || parts.some(v => isNaN(v))) return 0
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parts[0] || 0
}
const totalDurationText = (lessons: LessonDraft[]): string => {
  const total = lessons.reduce((sum, l) => sum + l.durationSeconds, 0)
  if (!total) return ''
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60)
  if (h > 0 && m > 0) return `${h}h ${m}min`
  if (h > 0) return `${h}h`
  return `${m}min`
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return <div className="admin-stat-spark"/>
  const max = Math.max(1, ...data), min = Math.min(...data), range = max - min || 1
  const W = 200, H = 40
  const xs = data.map((_, i) => (i / (data.length - 1)) * W)
  const ys = data.map(v => H - 4 - ((v - min) / range) * (H - 10))
  const line = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ')
  const area = `${line} L${W},${H} L0,${H} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="admin-stat-spark-svg">
      <defs>
        <linearGradient id="spk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1d7ec7" stopOpacity="0.35"/>
          <stop offset="100%" stopColor="#1d7ec7" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spk)"/>
      <path d={line} fill="none" stroke="#4da3e0" strokeWidth="1.5"/>
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="2.5" fill="#93cfff"/>
    </svg>
  )
}

function AreaChart({ bars }: { bars: { label: string; value: number }[] }) {
  const values = bars.map(b => b.value)
  const max = Math.max(1, ...values)
  const W = 560, H = 170, pL = 30, pR = 16, pT = 8, pB = 26
  const w = W - pL - pR, h = H - pT - pB
  const pts = values.map((v, i) => ({
    x: pL + (i / Math.max(1, values.length - 1)) * w,
    y: pT + h - (v / max) * h * 0.9 + h * 0.05,
    v, label: bars[i].label,
  }))
  const smooth = pts.reduce((d, p, i) => {
    if (i === 0) return `M${p.x.toFixed(1)},${p.y.toFixed(1)}`
    const cp = ((pts[i - 1].x + p.x) / 2).toFixed(1)
    return `${d} C${cp},${pts[i - 1].y.toFixed(1)} ${cp},${p.y.toFixed(1)} ${p.x.toFixed(1)},${p.y.toFixed(1)}`
  }, '')
  const last = pts[pts.length - 1]
  const area = `${smooth} L${last.x.toFixed(1)},${(pT + h).toFixed(1)} L${pts[0].x.toFixed(1)},${(pT + h).toFixed(1)} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
      <defs>
        <linearGradient id="af" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1d7ec7" stopOpacity="0.38"/>
          <stop offset="65%" stopColor="#0d5fa0" stopOpacity="0.08"/>
          <stop offset="100%" stopColor="#0d5fa0" stopOpacity="0"/>
        </linearGradient>
        <filter id="lg"><feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      {[0.3, 0.6, 0.9].map((t, i) => {
        const y = pT + h * (1 - t * 0.9) + h * 0.05
        return <line key={i} x1={pL} x2={pL + w} y1={y} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
      })}
      <line x1={last.x} y1={last.y} x2={last.x} y2={pT + h} stroke="rgba(90,174,255,0.22)" strokeWidth="1" strokeDasharray="4,3"/>
      <path d={area} fill="url(#af)"/>
      <path d={smooth} fill="none" stroke="rgba(90,174,255,0.38)" strokeWidth="8" style={{ filter: 'blur(5px)' }}/>
      <path d={smooth} fill="none" stroke="#4da3e0" strokeWidth="2.5" filter="url(#lg)"/>
      {pts.map((p, i) => {
        const cur = i === pts.length - 1
        return <g key={i}>
          {cur && <circle cx={p.x} cy={p.y} r={11} fill="rgba(29,126,199,0.15)"/>}
          <circle cx={p.x} cy={p.y} r={cur ? 4.5 : 2.5} fill={cur ? '#93cfff' : 'rgba(90,174,255,0.5)'}/>
        </g>
      })}
      {last.v > 0 && <g>
        <rect x={last.x - 27} y={last.y - 38} width={54} height={24} rx={7} fill="rgba(13,85,160,0.92)" stroke="rgba(90,174,255,0.3)" strokeWidth="1"/>
        <text x={last.x} y={last.y - 21} textAnchor="middle" fill="#fff" fontSize="11" fontWeight="700">{last.v}</text>
        <text x={last.x} y={last.y - 11} textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="7">{last.label}</text>
      </g>}
      {pts.map((p, i) => (
        <text key={i} x={p.x} y={H - 4} textAnchor="middle" fill="rgba(255,255,255,0.28)" fontSize="9">{p.label}</text>
      ))}
    </svg>
  )
}

export function AdminCoursesPage() {
  const { user, isAdmin } = useAdminAuth()
  const userId = user?.id
  const [searchParams] = useSearchParams()
  const requestedSection = searchParams.get('section')
  const section = adminSections.find(item => item.id === requestedSection)?.id ?? 'overview'
  const [courses, setCourses] = useState<Course[]>([])
  const [courseAccesses, setCourseAccesses] = useState<CourseAccess[]>([])
  const [accessNames, setAccessNames] = useState<Record<string, string>>({})
  const [monthlyVisits, setMonthlyVisits] = useState<number[]>([])
  const [monthlyStudents, setMonthlyStudents] = useState<number[]>([])
  const [stats, setStats] = useState({ students: 0, newStudents: 0, publishedCourses: 0, visitsThisMonth: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [draft, setDraft] = useState<CourseDraft>(() => ({ ...blankDraft, category: sectionCategory[section] ?? 'miniseries', instructor: section === 'courses' ? PROFESSOR_OPTIONS[0].value : '' }))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [view, setView] = useState<'list' | 'form'>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'scheduled'>('all')
  const [authorFilter, setAuthorFilter] = useState('')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [activeLessonForm, setActiveLessonForm] = useState<ActiveLessonForm | null>(null)
  const [lessonFormError, setLessonFormError] = useState('')
  const [lessonSaving, setLessonSaving] = useState(false)
  const [playlistImportOpen, setPlaylistImportOpen] = useState(false)
  const [playlistUrl, setPlaylistUrl] = useState('')
  const [playlistFetching, setPlaylistFetching] = useState(false)
  const [playlistItems, setPlaylistItems] = useState<PlaylistVideoItem[]>([])
  const [playlistSelected, setPlaylistSelected] = useState<Set<string>>(new Set())
  const [playlistError, setPlaylistError] = useState('')
  const [audioDeleteQueue, setAudioDeleteQueue] = useState<string[]>([])
  const [lessonAudioUploading, setLessonAudioUploading] = useState(false)
  const [lessonAudioUploadProgress, setLessonAudioUploadProgress] = useState(0)
  const lessonAudioUploadAbortRef = useRef<AbortController | null>(null)
  const lessonAudioUploadLockRef = useRef(false)
  const [aiCorrectLoading, setAiCorrectLoading] = useState(false)
  const [aiSortLoading, setAiSortLoading] = useState(false)
  const [aiSortDone, setAiSortDone] = useState(false)
  const [aiGenerateOpen, setAiGenerateOpen] = useState(false)
  const [aiGenerateLoading, setAiGenerateLoading] = useState(false)
  const [generateForm, setGenerateForm] = useState<GenerateParams>({ tema: '', conhecimento: '', tempoLeitura: '5' })
  const [aiError, setAiError] = useState('')
  const [articleCategories, setArticleCategories] = useState<AdminSelectOption[]>(defaultArticleCategories)
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState('#ec4899')
  const [categorySaving, setCategorySaving] = useState(false)
  const [categoryError, setCategoryError] = useState('')
  const [students, setStudents] = useState<StudentRow[]>([])
  const [studentSearch, setStudentSearch] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createEmail, setCreateEmail] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteCourseConfirm, setDeleteCourseConfirm] = useState<DeleteCourseConfirmation | null>(null)
  const [deleteCourseLoading, setDeleteCourseLoading] = useState(false)

  const getAdminAccessToken = async (): Promise<string> => {
    if (!adminSupabase) throw new Error('A autenticação administrativa não está disponível.')
    const { data, error: sessionError } = await adminSupabase.auth.getSession()
    const token = data.session?.access_token
    if (sessionError || !token) throw new Error('A sessão expirou. Inicie sessão novamente.')
    return token
  }

  const deleteHostedAudioSilently = async (audioPath: string): Promise<void> => {
    const source = safeResolveAudioSource(audioPath)
    if (source?.kind !== 'host') return
    const uploadUrl = import.meta.env.VITE_AUDIO_UPLOAD_URL
    if (!uploadUrl) return
    try {
      // Segurança: não apagar se outro conteúdo utilizar o mesmo ficheiro de áudio.
      if (adminSupabase) {
        const [{ data: sharingCourses }, { data: sharingLessons }] = await Promise.all([
          adminSupabase.from('courses').select('id').eq('audio_path', audioPath).limit(1),
          adminSupabase.from('lessons').select('id').eq('audio_path', audioPath).limit(1),
        ])
        if ((sharingCourses && sharingCourses.length > 0) || (sharingLessons && sharingLessons.length > 0)) {
          console.warn('[academia] Áudio não apagado: referenciado por outro conteúdo.')
          return
        }
      }
      const token = await getAdminAccessToken()
      const response = await fetch(getDeleteAudioUrl(uploadUrl), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: audioPath.slice('host:'.length) }),
      })
      if (!response.ok) console.warn('[academia] Não foi possível apagar o áudio.')
    } catch {
      console.warn('[academia] Não foi possível apagar o áudio.')
    }
  }

  const startLessonAudioUpload = async (file: File) => {
    if (lessonAudioUploadLockRef.current || saving) return
    lessonAudioUploadLockRef.current = true
    setLessonAudioUploading(true)
    setLessonAudioUploadProgress(1)
    setLessonFormError('')
    const controller = new AbortController()
    lessonAudioUploadAbortRef.current = controller
    try {
      let duration = 0
      try { duration = await readAudioDuration(file) } catch { /* A duração continua editável manualmente. */ }
      const token = await getAdminAccessToken()
      const uploadUrl = import.meta.env.VITE_AUDIO_UPLOAD_URL
      if (!uploadUrl) throw new Error('Envio de áudio não disponível. Contacte o suporte técnico.')
      const result = await uploadAudioWithProgress(uploadUrl, file, token, setLessonAudioUploadProgress, controller.signal)
      setActiveLessonForm(f => {
        if (!f) return f
        return { ...f, audioPath: `host:${result.path}`, audioFileName: file.name, durationText: f.durationText.trim() || !duration ? f.durationText : formatAudioDuration(duration) }
      })
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') setLessonFormError('Envio de áudio cancelado.')
      else setLessonFormError(caught instanceof Error ? caught.message : 'Não foi possível enviar o áudio.')
    } finally {
      lessonAudioUploadLockRef.current = false
      lessonAudioUploadAbortRef.current = null
      setLessonAudioUploading(false)
      setLessonAudioUploadProgress(0)
    }
  }

  const handleLessonAudioFile = (file: File | null) => {
    if (!file) return
    const extensionIsMp3 = file.name.toLowerCase().endsWith('.mp3')
    const mimeIsMp3 = !file.type || file.type === 'audio/mpeg' || file.type === 'audio/mp3' || file.type === 'application/octet-stream'
    if (!extensionIsMp3 || !mimeIsMp3) { setLessonFormError('Envie apenas ficheiros MP3. Converta o WAV para MP3 antes de enviar.'); return }
    if (file.size > MAX_AUDIO_BYTES) { setLessonFormError('O ficheiro não pode ter mais de 150 MB.'); return }
    setLessonFormError('')
    void startLessonAudioUpload(file)
  }

  const cancelLessonAudioUpload = () => lessonAudioUploadAbortRef.current?.abort()

  const convertToEpisode = () => {
    if (!draft.audioPath) return
    const episodeId = crypto.randomUUID()
    const episode: LessonDraft = {
      id: episodeId, title: draft.title.trim() || 'Episódio 1', videoUrl: '',
      audioPath: draft.audioPath, durationSeconds: parseDurationInput(draft.durationText),
      position: 0, coverUrl: draft.coverUrl,
    }
    setDraft(d => ({ ...d, audioPath: '', lessons: [episode] }))
  }



  const loadDashboard = useCallback(async () => {
    const client = adminSupabase
    if (!client || !userId) return
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const [allStudents, newStudents, publishedCourses, courseRows, recentAccessRows] = await Promise.all([
      client.from('profiles').select('id', { count: 'exact', head: true }).neq('id', userId),
      client.from('profiles').select('id', { count: 'exact', head: true }).neq('id', userId).gte('created_at', monthStart.toISOString()).lt('created_at', nextMonth.toISOString()),
      client.from('courses').select('id', { count: 'exact', head: true }).eq('status', 'published'),
      client.from('courses').select('id,slug,title,description,cover_url,instructor,category,video_url,body,notes_enabled,lesson_count,duration_text,level,status,published_at,scheduled_for,position,audio_path,created_at').order('created_at', { ascending: false }),
      client.from('course_access_events').select('id,user_id,course_slug,accessed_at').order('accessed_at', { ascending: false }).limit(8),
    ])
    const monthRanges = Array.from({ length: 6 }, (_, index) => {
      const start = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1)
      return { start, end: new Date(start.getFullYear(), start.getMonth() + 1, 1) }
    })
    const monthlyVisitResults = await Promise.all(monthRanges.map(({ start, end }) => client.from('course_access_events').select('id', { count: 'exact', head: true }).gte('accessed_at', start.toISOString()).lt('accessed_at', end.toISOString())))
    const failed = [allStudents.error, newStudents.error, publishedCourses.error, courseRows.error, recentAccessRows.error, ...monthlyVisitResults.map(r => r.error)].find(Boolean)
    const visitCounts = monthlyVisitResults.map(result => result.count ?? 0)
    setMonthlyVisits(visitCounts)
    // Consulta o histórico mensal de alunos; uma falha de RLS não bloqueia o painel.
    Promise.all(monthRanges.map(({ start, end }) => client.from('profiles').select('id', { count: 'exact', head: true }).neq('id', userId).gte('created_at', start.toISOString()).lt('created_at', end.toISOString())))
      .then(results => { if (results.every(r => !r.error)) setMonthlyStudents(results.map(r => r.count ?? 0)) })
      .catch(() => { /* silencioso — sparklines ficam vazios */ })
    setError(failed ? 'Não foi possível carregar todos os dados. Confirme se a migração do painel foi aplicada.' : '')
    setStats({ students: allStudents.count ?? 0, newStudents: newStudents.count ?? 0, publishedCourses: publishedCourses.count ?? 0, visitsThisMonth: visitCounts[visitCounts.length - 1] ?? 0 })
    const [interviewRows, articleRows, zoomRows, categoryRows] = await Promise.all([
      client.from('interviews').select('id,slug,title,subtitle,guest,guest_role,author,cover_url,duration,video_id,published_at,status,scheduled_for,created_at').order('created_at', { ascending: false }),
      client.from('articles').select('id,slug,title,excerpt,category,read_time,image_url,published_at,status,scheduled_for,created_at').order('created_at', { ascending: false }),
      client.from('zoom_recordings').select('id,title,description,type,category,duration,thumb_url,video_url,recorded_at,status,scheduled_for').order('recorded_at', { ascending: false }),
      client.from('article_categories').select('name,color').order('name'),
    ])
    if (!categoryRows.error && categoryRows.data) {
      const customCategories = categoryRows.data.map(category => ({ value: category.name, label: category.name, color: category.color }))
      setArticleCategories([...defaultArticleCategories, ...customCategories.filter(category => !defaultArticleCategories.some(defaultCategory => defaultCategory.value.toLocaleLowerCase('pt-PT') === category.value.toLocaleLowerCase('pt-PT')))])
    }
    const mappedInterviews: Course[] = (interviewRows.data ?? []).map(r => ({ id: r.id, slug: r.slug, title: r.title, description: r.subtitle ?? '', cover_url: r.cover_url ?? '', instructor: r.guest ?? '', category: 'interview' as const, video_url: r.video_id ? `https://www.youtube.com/watch?v=${r.video_id}` : null, body: null, lesson_count: null, duration_text: r.duration ?? null, level: null, status: r.status as Course['status'], notes_enabled: false, published_at: r.published_at, scheduled_for: r.scheduled_for ?? null, position: null, audio_path: null, interview_author: r.author ?? undefined, created_at: r.created_at ?? r.published_at ?? new Date().toISOString() }))
    const mappedArticles: Course[] = (articleRows.data ?? []).map(r => ({ id: r.id, slug: r.slug, title: r.title, description: r.excerpt ?? '', cover_url: r.image_url ?? '', instructor: '', category: 'blog' as const, video_url: null, body: null, lesson_count: null, duration_text: r.read_time ?? null, level: null, status: r.status as Course['status'], notes_enabled: false, published_at: r.published_at, scheduled_for: r.scheduled_for ?? null, position: null, audio_path: null, created_at: r.created_at ?? r.published_at ?? new Date().toISOString() }))
    const mappedZoom: Course[] = (zoomRows.data ?? []).map(r => ({ id: r.id, slug: r.id, title: r.title, description: r.description ?? '', cover_url: r.thumb_url ?? '', instructor: '', category: 'zoom_recording' as const, video_url: r.video_url ?? null, body: null, lesson_count: null, duration_text: r.duration ?? null, level: null, status: r.status as Course['status'], notes_enabled: false, published_at: r.recorded_at, scheduled_for: r.scheduled_for ?? null, position: null, audio_path: null, zoom_type: r.type, zoom_category: r.category, created_at: r.recorded_at ?? new Date().toISOString() }))
    setCourses([...(courseRows.data ?? []) as Course[], ...mappedInterviews, ...mappedArticles, ...mappedZoom])
    const recentAccesses = (recentAccessRows.data ?? []) as CourseAccess[]
    setCourseAccesses(recentAccesses)
    const recentUserIds = [...new Set(recentAccesses.map(access => access.user_id))]
    if (recentUserIds.length) {
      const { data: recentProfiles } = await client.from('profiles').select('id,full_name,name').in('id', recentUserIds)
      setAccessNames(Object.fromEntries((recentProfiles ?? []).map(profile => [profile.id, profile.full_name || profile.name || 'Aluno da Academia'])))
    } else setAccessNames({})
    const { data: studentRows } = await client.from('profiles').select('id,name,email,full_name,created_at').neq('id', userId).order('created_at', { ascending: false })
    setStudents((studentRows ?? []).map(r => ({ id: r.id, name: r.full_name || r.name || 'Aluno da Academia', email: r.email ?? '', created_at: r.created_at })))
    setLoading(false)
  }, [userId])

  // The callback starts async Supabase requests and updates React only after those requests settle.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (isAdmin) void loadDashboard() }, [isAdmin, loadDashboard])

  const monthlyBars = useMemo(() => {
    const now = new Date()
    const months = Array.from({ length: 6 }, (_, index) => new Date(now.getFullYear(), now.getMonth() - 5 + index, 1))
    const values = months.map((_, index) => monthlyVisits[index] ?? 0)
    const max = Math.max(1, ...values)
    return months.map((month, index) => ({ label: monthName(month), value: values[index], height: Math.max(8, values[index] / max * 100) }))
  }, [monthlyVisits])

  const monthlyCourses = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 6 }, (_, index) => {
      const start = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1)
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
      return courses.filter(c => c.published_at && new Date(c.published_at) >= start && new Date(c.published_at) < end).length
    })
  }, [courses])

  const chooseCover = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Use uma imagem JPG, PNG ou WebP.'); return }
    setDraft(current => ({ ...current, file }))
    setPreviewUrl(URL.createObjectURL(file))
    setError('')
  }

  const resetForm = useCallback(() => {
    lessonAudioUploadAbortRef.current?.abort()
    setAudioDeleteQueue([])
    setDraft({ ...blankDraft, category: sectionCategory[section] ?? 'miniseries', instructor: section === 'courses' ? PROFESSOR_OPTIONS[0].value : '' })
    setEditingId(null)
    setPreviewUrl('')
    setNotice('')
    setActiveLessonForm(null)
    setLessonFormError('')
    setAiSortDone(false)
    setPlaylistImportOpen(false)
    setView('list')
  }, [section])

  useEffect(() => {
    if (view !== 'form') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (categoryModalOpen) { setCategoryModalOpen(false); return }
        if (aiGenerateOpen) { setAiGenerateOpen(false); return }
        resetForm()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey) }
  }, [view, resetForm, aiGenerateOpen, categoryModalOpen])

  const createArticleCategory = async (event: FormEvent) => {
    event.preventDefault()
    const name = newCategoryName.trim()
    if (!adminSupabase || !name || categorySaving) return
    if (articleCategories.some(category => category.value.toLocaleLowerCase('pt-PT') === name.toLocaleLowerCase('pt-PT'))) {
      setCategoryError('Já existe uma categoria com esse nome.')
      return
    }
    const slug = slugify(name)
    if (!slug) {
      setCategoryError('Use pelo menos uma letra ou um número no nome da categoria.')
      return
    }
    setCategorySaving(true)
    setCategoryError('')
    const { data, error: insertError } = await adminSupabase.from('article_categories').insert({ name, slug, color: newCategoryColor }).select('name,color').single()
    setCategorySaving(false)
    if (insertError || !data) {
      setCategoryError(insertError?.code === '23505' ? 'Já existe uma categoria com esse nome.' : 'Não foi possível guardar. Verifique se a migração de categorias do blog foi aplicada.')
      return
    }
    setArticleCategories(current => [...current, { value: data.name, label: data.name, color: data.color }])
    setDraft(current => ({ ...current, articleCategory: data.name }))
    setNewCategoryName('')
    setNewCategoryColor('#ec4899')
    setCategoryModalOpen(false)
  }

  const openLessonEdit = (lesson: LessonDraft) => {
    setActiveLessonForm({ id: lesson.id, title: lesson.title, videoUrl: lesson.videoUrl, audioPath: lesson.audioPath, originalAudioPath: lesson.audioPath, audioFileName: '', durationText: lesson.durationSeconds > 0 ? formatDurationSeconds(lesson.durationSeconds) : '', coverFile: null, coverPreview: lesson.coverUrl, isNew: false })
    setLessonFormError('')
  }
  const addNewLesson = () => {
    setActiveLessonForm({ id: crypto.randomUUID(), title: '', videoUrl: '', audioPath: '', originalAudioPath: '', audioFileName: '', durationText: '', coverFile: null, coverPreview: '', isNew: true })
    setLessonFormError('')
  }
  const cancelLessonForm = () => {
    lessonAudioUploadAbortRef.current?.abort()
    if (activeLessonForm && activeLessonForm.audioPath && activeLessonForm.audioPath !== activeLessonForm.originalAudioPath && safeResolveAudioSource(activeLessonForm.audioPath)?.kind === 'host') {
      void deleteHostedAudioSilently(activeLessonForm.audioPath)
    }
    setActiveLessonForm(null)
    setLessonFormError('')
  }

  const openPlaylistImport = () => { setPlaylistImportOpen(true); setPlaylistUrl(''); setPlaylistItems([]); setPlaylistSelected(new Set()); setPlaylistError('') }
  const closePlaylistImport = () => { setPlaylistImportOpen(false); setPlaylistUrl(''); setPlaylistItems([]); setPlaylistSelected(new Set()); setPlaylistError('') }
  const fetchPlaylist = async () => {
    if (!playlistUrl.trim() || playlistFetching || !adminSupabase) return
    setPlaylistFetching(true); setPlaylistError(''); setPlaylistItems([])
    const { data, error } = await adminSupabase.functions.invoke('youtube-playlist', { body: { playlist_url: playlistUrl.trim() } })
    setPlaylistFetching(false)
    if (error || !data?.videos) { setPlaylistError(await readFnError(error, data, 'Não foi possível carregar a lista de reprodução.')); return }
    const items = data.videos as PlaylistVideoItem[]
    setPlaylistItems(items)
    setPlaylistSelected(new Set(items.map(v => v.videoId)))
    if (data.playlist) {
      const meta = data.playlist as { title: string; description: string }
      setDraft(d => ({
        ...d,
        title: d.title.trim() ? d.title : meta.title,
        description: d.description.trim() ? d.description : meta.description,
      }))
    }
  }
  const togglePlaylistItem = (videoId: string) => setPlaylistSelected(s => { const n = new Set(s); if (n.has(videoId)) n.delete(videoId); else n.add(videoId); return n })
  const importPlaylistLessons = () => {
    const toAdd = playlistItems.filter(v => playlistSelected.has(v.videoId))
    if (!toAdd.length) return
    const extractNum = (title: string) => { const m = title.match(/\d+/g); return m ? parseInt(m[m.length - 1]) : 0 }
    const sorted = [...toAdd].sort((a, b) => extractNum(a.title) - extractNum(b.title))
    const startPos = draft.lessons.length
    setDraft(d => ({ ...d, lessons: [...d.lessons, ...sorted.map((v, i) => ({ id: crypto.randomUUID(), title: v.title, videoUrl: v.videoUrl, audioPath: '', durationSeconds: v.durationSeconds, position: startPos + i, coverUrl: `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg` }))] }))
    closePlaylistImport()
  }
  const setLessonVideoUrl = (url: string) => {
    setActiveLessonForm(f => {
      if (!f || f.coverFile) return f ? { ...f, videoUrl: url } : f
      const videoId = getYouTubeVideoId(url.trim())
      const autoThumb = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : ''
      const prevVideoId = getYouTubeVideoId(f.videoUrl.trim())
      const prevAutoThumb = prevVideoId ? `https://img.youtube.com/vi/${prevVideoId}/hqdefault.jpg` : ''
      const coverPreview = (f.coverPreview === '' || f.coverPreview === prevAutoThumb) ? autoThumb : f.coverPreview
      return { ...f, videoUrl: url, coverPreview }
    })
  }
  const pickLessonCover = (file: File) => {
    const preview = URL.createObjectURL(file)
    setActiveLessonForm(f => f ? { ...f, coverFile: file, coverPreview: preview } : f)
  }
  const removeLessonCover = () => {
    setActiveLessonForm(f => {
      if (!f) return f
      const videoId = getYouTubeVideoId(f.videoUrl.trim())
      const autoThumb = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : ''
      return { ...f, coverFile: null, coverPreview: autoThumb }
    })
  }
  const confirmLessonForm = async () => {
    if (!activeLessonForm || lessonSaving || lessonAudioUploading) return
    const { id, title, videoUrl, audioPath, originalAudioPath, durationText, coverFile, coverPreview, isNew } = activeLessonForm
    const isPodcast = section === 'podcasts'
    if (!title.trim()) { setLessonFormError(`Informe o título ${isPodcast ? 'do episódio' : 'da aula'}.`); return }
    if (!isPodcast) {
      if (!videoUrl.trim()) { setLessonFormError('Informe o link do YouTube.'); return }
      if (!getYouTubeVideoId(videoUrl.trim())) { setLessonFormError('Ligação do YouTube inválido. Cole um link como youtube.com/watch?v=…'); return }
    } else {
      if (!audioPath.trim() && !videoUrl.trim()) { setLessonFormError('Adicione um ficheiro MP3 ou um link de YouTube para o episódio.'); return }
      if (videoUrl.trim() && !getYouTubeVideoId(videoUrl.trim())) { setLessonFormError('Ligação do YouTube inválido. Cole um link como youtube.com/watch?v=…'); return }
    }
    const durationSeconds = parseDurationInput(durationText)
    let finalCoverUrl = coverPreview
    if (coverFile && adminSupabase) {
      setLessonSaving(true)
      try {
        const safeName = coverFile.name.replace(/[^a-zA-Z0-9._-]/g, '-')
        const path = `lessons/${id}/${crypto.randomUUID()}-${safeName}`
        const { error: uploadErr } = await adminSupabase.storage.from('course-covers').upload(path, coverFile, { upsert: false, contentType: coverFile.type })
        if (uploadErr) throw uploadErr
        finalCoverUrl = adminSupabase.storage.from('course-covers').getPublicUrl(path).data.publicUrl
      } catch {
        setLessonFormError('Erro ao fazer upload da capa. Tente novamente.')
        setLessonSaving(false)
        return
      }
      setLessonSaving(false)
    }
    // Queue old lesson audio for cleanup if it was replaced
    if (originalAudioPath && originalAudioPath !== audioPath && safeResolveAudioSource(originalAudioPath)?.kind === 'host') {
      setDraft(d => {
        const existing = d.removedLessonAudioPaths ?? []
        return { ...d, removedLessonAudioPaths: existing.includes(originalAudioPath) ? existing : [...existing, originalAudioPath] }
      })
    }
    if (isNew) {
      setDraft(d => ({ ...d, lessons: [...d.lessons, { id, title: title.trim(), videoUrl: videoUrl.trim(), audioPath: audioPath.trim(), durationSeconds, coverUrl: finalCoverUrl, position: d.lessons.length }] }))
    } else {
      setDraft(d => ({ ...d, lessons: d.lessons.map(l => l.id === id ? { ...l, title: title.trim(), videoUrl: videoUrl.trim(), audioPath: audioPath.trim(), durationSeconds, coverUrl: finalCoverUrl } : l) }))
    }
    setActiveLessonForm(null)
    setLessonFormError('')
  }
  const removeLesson = (lessonId: string) => {
    setDraft(d => {
      const lesson = d.lessons.find(l => l.id === lessonId)
      const hasHostAudio = lesson?.audioPath && safeResolveAudioSource(lesson.audioPath)?.kind === 'host'
      const existingAudioPaths = d.removedLessonAudioPaths ?? []
      return {
        ...d,
        lessons: d.lessons.filter(l => l.id !== lessonId),
        removedLessonIds: [...d.removedLessonIds, lessonId],
        removedLessonAudioPaths: hasHostAudio && lesson?.audioPath && !existingAudioPaths.includes(lesson.audioPath)
          ? [...existingAudioPaths, lesson.audioPath]
          : existingAudioPaths,
      }
    })
    if (activeLessonForm?.id === lessonId) setActiveLessonForm(null)
  }
  const moveLesson = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction
    setDraft(d => {
      const lessons = [...d.lessons]
      ;[lessons[index], lessons[newIndex]] = [lessons[newIndex], lessons[index]]
      return { ...d, lessons }
    })
  }

  const errorMessage = (caught: unknown) => {
    if (caught instanceof Error) return caught.message
    if (typeof caught === 'string') return caught
    if (caught && typeof caught === 'object') {
      const backendError = caught as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown }
      if (backendError.code === '23505') return 'Já existe um conteúdo com esse título ou endereço na biblioteca. Altere o título e tente novamente.'
      const parts = [backendError.message, backendError.details, backendError.hint]
        .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
      if (parts.length) return parts.join(' ')
      if (typeof backendError.code === 'string') return `Erro ${backendError.code} ao guardar o conteúdo.`
    }
    return `Não foi possível guardar ${sectionMeta[section]?.item ?? 'o conteúdo'}.`
  }

  const saveCourse = async (event: FormEvent) => {
    event.preventDefault()
    if (!adminSupabase || !user || saving || false || lessonAudioUploading) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      if ((section === 'courses' || section === 'podcasts') && activeLessonForm && (activeLessonForm.title.trim() || activeLessonForm.videoUrl.trim() || activeLessonForm.audioPath.trim())) {
        setSaving(false)
        setLessonFormError(`Clique em "Adicionar ${section === 'podcasts' ? 'episódio' : 'aula'}" para confirmar antes de guardar.`)
        return
      }
      if (section === 'courses' && draft.status === 'published' && draft.lessons.length === 0) {
        throw new Error('Adicione pelo menos uma aula antes de publicar a minissérie.')
      }
      const finalPublishedAt = (status: Course['status'], existing: Course | undefined) =>
        status === 'published' ? (existing?.published_at ?? new Date().toISOString()) : null
      if (draft.status === 'scheduled' && !draft.scheduledFor) throw new Error('Informe uma data de agendamento antes de guardar.')
      const scheduledFor = draft.status === 'scheduled' ? new Date(draft.scheduledFor).toISOString() : null
      let coverUrl = draft.coverUrl.trim()
      if (draft.file) {
        const safeName = draft.file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
        const path = `${user.id}/${crypto.randomUUID()}-${safeName}`
        const { error: uploadError } = await adminSupabase.storage.from('course-covers').upload(path, draft.file, { upsert: false, contentType: draft.file.type })
        if (uploadError) throw uploadError
        coverUrl = adminSupabase.storage.from('course-covers').getPublicUrl(path).data.publicUrl
      }
      if (section === 'podcasts') {
        const hasEpisodes = draft.lessons.length > 0
        if (!hasEpisodes && !draft.audioFile && !draft.audioPath.trim() && !draft.videoUrl.trim()) {
          throw new Error('Adicione episódios, um ficheiro MP3 ou um link de YouTube para o podcast.')
        }
      }
      const finalAudioPath = draft.audioPath.trim()
      if (!coverUrl && section !== 'interviews') throw new Error(`Adicione uma capa à ${sectionMeta[section]?.item ?? 'publicação'} antes de guardar.`)
      const slug = slugify(draft.title)
      if (!slug) throw new Error(`Informe um título válido para gerar o endereço da ${sectionMeta[section]?.item ?? 'publicação'}.`)
      const existing = courses.find(course => course.id === editingId)
      let savedCourseId: string | null = editingId
      if (section === 'interviews') {
        const videoId = getYouTubeVideoId(draft.videoUrl.trim()) || null
        const vals = { slug, title: draft.title.trim(), subtitle: draft.description.trim(), guest: draft.instructor.trim(), author: draft.interviewAuthor.trim() || null, cover_url: coverUrl || null, video_id: videoId, status: draft.status, published_at: finalPublishedAt(draft.status, existing), scheduled_for: scheduledFor }
        const result = editingId ? await adminSupabase.from('interviews').update(vals).eq('id', editingId) : await adminSupabase.from('interviews').insert(vals)
        if (result.error) throw result.error
      } else if (section === 'blog') {
        const wordCount = draft.body.trim().split(/\s+/).filter(Boolean).length
        const autoReadTime = `${Math.max(1, Math.round(wordCount / 200))} min de leitura`
        const vals = { slug, title: draft.title.trim(), excerpt: draft.description.trim(), category: draft.articleCategory, read_time: draft.durationText.trim() || autoReadTime, image_url: coverUrl || null, author: draft.blogAuthor.trim() || null, content: draft.body.trim() || null, status: draft.status, published_at: finalPublishedAt(draft.status, existing), scheduled_for: scheduledFor }
        const result = editingId ? await adminSupabase.from('articles').update(vals).eq('id', editingId) : await adminSupabase.from('articles').insert(vals)
        if (result.error) throw result.error
      } else if (section === 'zoom') {
        const vals = { title: draft.title.trim(), description: draft.description.trim(), type: draft.zoomType, category: draft.zoomCategory.trim(), video_url: draft.videoUrl.trim() || null, thumb_url: coverUrl || null, duration: draft.durationText.trim() || '', status: draft.status, recorded_at: existing?.published_at ?? new Date().toISOString(), scheduled_for: scheduledFor }
        const result = editingId ? await adminSupabase.from('zoom_recordings').update(vals).eq('id', editingId) : await adminSupabase.from('zoom_recordings').insert(vals)
        if (result.error) throw result.error
      } else {
      const values = {
        slug,
        title: draft.title.trim(),
        description: draft.description.trim(),
        cover_url: coverUrl,
        instructor: draft.instructor.trim(),
        category: section === 'courses' ? 'miniseries' : draft.category,
        video_url: draft.videoUrl.trim() || null,
        body: section === 'podcasts' ? (draft.articleCategory.trim() || null) : (draft.body.trim() || null),
        notes_enabled: draft.notesEnabled,
        lesson_count: (section === 'courses' || (section === 'podcasts' && draft.lessons.length > 0)) ? (draft.lessons.length || null) : (draft.lessonCount ? parseInt(draft.lessonCount) : null),
        duration_text: (section === 'courses' || (section === 'podcasts' && draft.lessons.length > 0)) ? (totalDurationText(draft.lessons) || null) : (draft.durationText.trim() || null),
        level: draft.level,
        status: draft.status,
        created_by: user.id,
        published_at: finalPublishedAt(draft.status, existing),
        scheduled_for: scheduledFor,
        position: draft.position.trim() ? parseInt(draft.position) || null : null,
        ...(section === 'podcasts' ? { audio_path: finalAudioPath || null } : {}),
        updated_at: new Date().toISOString(),
      }
      if (editingId) {
        const result = await adminSupabase.from('courses').update(values).eq('id', editingId)
        if (result.error) throw result.error
      } else {
        const result = await adminSupabase.from('courses').insert(values).select('id').single()
        if (result.error) throw result.error
        savedCourseId = result.data.id
      }
      }
      if ((section === 'courses' || section === 'podcasts') && savedCourseId) {
        if (draft.lessons.length > 0) {
          const lessonRows = draft.lessons.map((l, i) => ({ id: l.id, course_id: savedCourseId as string, title: l.title, video_url: l.videoUrl || null, audio_path: l.audioPath || null, duration_seconds: l.durationSeconds, position: i, cover_url: l.coverUrl || null }))
          const { error: upsertErr } = await adminSupabase.from('lessons').upsert(lessonRows, { onConflict: 'id' })
          if (upsertErr) throw upsertErr
        }
        if (draft.removedLessonIds.length > 0) {
          const { error: delErr } = await adminSupabase.from('lessons').delete().in('id', draft.removedLessonIds)
          if (delErr) throw delErr
        }
      }
      const queuedDeletions = [...audioDeleteQueue]
      const queuedLessonAudioDeletions = [...(draft.removedLessonAudioPaths ?? [])]
      const successMsg = draft.status === 'published'
        ? (section === 'courses' ? 'Minissérie publicada na biblioteca.' : 'Conteúdo publicado na biblioteca.')
        : draft.status === 'scheduled'
        ? 'Publicação agendada com sucesso.'
        : 'Rascunho salvo com sucesso.'
      // Fecha o modal e mostra o aviso em uma única renderização (sem chamar resetForm que limpa setNotice)
      setDraft({ ...blankDraft, category: sectionCategory[section] ?? 'miniseries', instructor: section === 'courses' ? PROFESSOR_OPTIONS[0].value : '' })
      setAudioDeleteQueue([])
      setEditingId(null)
      setPreviewUrl('')
      setActiveLessonForm(null)
      setLessonFormError('')
      setView('list')
      setNotice(successMsg)
      await loadDashboard()
      // Remoção de áudios antigos em segundo plano, sem bloquear nem expor erros ao utilizador.
      for (const audioPath of queuedDeletions) void deleteHostedAudioSilently(audioPath)
      for (const audioPath of queuedLessonAudioDeletions) void deleteHostedAudioSilently(audioPath)
    } catch (caught) {
      console.error('Falha ao guardar conteúdo no painel administrativo:', caught)
      setError(errorMessage(caught))
    } finally { setSaving(false) }
  }

  const editCourse = async (course: Course) => {
    setEditingId(course.id)
    let loadedLessons: LessonDraft[] = []
    let articleBody = ''
    if (adminSupabase && (course.category === 'course' || course.category === 'miniseries' || course.category === 'podcast')) {
      const { data } = await adminSupabase.from('lessons').select('id,title,video_url,audio_path,duration_seconds,position,cover_url').eq('course_id', course.id).order('position')
      loadedLessons = ((data ?? []) as LessonRow[]).map(l => ({ id: l.id, title: l.title, videoUrl: l.video_url ?? '', audioPath: l.audio_path ?? '', durationSeconds: l.duration_seconds, position: l.position, coverUrl: l.cover_url ?? '' }))
    }
    let articleCategory = 'Mentalidade'
    let blogAuthor = ''
    if (adminSupabase && course.category === 'blog') {
      const { data } = await adminSupabase.from('articles').select('content,category,author').eq('id', course.id).maybeSingle()
      articleBody = data?.content ?? ''
      articleCategory = data?.category ?? 'Mentalidade'
      blogAuthor = data?.author ?? ''
    } else if (course.category === 'podcast' && course.body) {
      articleCategory = course.body
    }
    setDraft({ title: course.title, description: course.description, instructor: course.instructor, category: section === 'courses' ? 'miniseries' : course.category, videoUrl: course.video_url ?? '', body: articleBody, status: course.status, scheduledFor: course.scheduled_for ? new Date(course.scheduled_for).toISOString().slice(0, 16) : '', position: course.position?.toString() ?? '', coverUrl: course.cover_url, file: null, audioFile: null, audioPath: course.audio_path ?? '', notesEnabled: course.notes_enabled ?? true, lessonCount: course.lesson_count?.toString() ?? '', durationText: course.duration_text ?? '', level: course.level ?? null, lessons: loadedLessons, removedLessonIds: [], removedLessonAudioPaths: [], articleCategory, blogAuthor, interviewAuthor: course.interview_author ?? '', zoomType: course.zoom_type ?? 'Aula', zoomCategory: course.zoom_category ?? '' })
    setPreviewUrl(cardCover(course.cover_url || areaImage[course.slug]))
    setActiveLessonForm(null)
    setLessonFormError('')
    setAiSortDone(false)
    setView('form')
  }

  const deleteCourse = (course: Course) => {
    setDeleteCourseConfirm({ id: course.id, title: course.title, audioPath: course.audio_path ?? null })
  }

  const confirmDeleteCourse = async () => {
    if (!adminSupabase || !deleteCourseConfirm || deleteCourseLoading) return
    const { id, title, audioPath } = deleteCourseConfirm
    const tableBySection: Partial<Record<AdminSection, string>> = { interviews: 'interviews', blog: 'articles', zoom: 'zoom_recordings' }
    const table = tableBySection[section] ?? 'courses'
    // Collect episode audio paths before cascade delete so we can clean them up afterwards
    let episodeAudioPaths: string[] = []
    if (section === 'podcasts') {
      const { data: lessonRows } = await adminSupabase.from('lessons').select('audio_path').eq('course_id', id)
      episodeAudioPaths = (lessonRows ?? []).map(r => r.audio_path).filter((p): p is string => !!p)
    }
    setDeleteCourseLoading(true)
    const { error: deleteError } = await adminSupabase.from(table).delete().eq('id', id)
    setDeleteCourseLoading(false)
    setDeleteCourseConfirm(null)
    if (deleteError) {
      setError('Não foi possível eliminar o conteúdo.')
    } else {
      setNotice(`${title} foi eliminado.`)
      await loadDashboard()
      // Remoção dos áudios em segundo plano, sem bloquear nem expor erros ao utilizador.
      if (audioPath) void deleteHostedAudioSilently(audioPath)
      for (const ep of episodeAudioPaths) void deleteHostedAudioSilently(ep)
    }
  }



  const handleCorrectText = async () => {
    if (!draft.body.trim()) return
    setAiCorrectLoading(true)
    setError('')
    try {
      const corrected = await correctText(draft.body)
      setDraft(c => ({ ...c, body: corrected.trim() }))
      setNotice('Texto corrigido com sucesso.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao corrigir o texto.')
    } finally {
      setAiCorrectLoading(false)
    }
  }

  const handleGenerateArticle = async () => {
    if (!generateForm.tema.trim()) return
    setAiGenerateLoading(true)
    setAiError('')
    try {
      const result = await generateArticle(generateForm)
      setDraft(c => ({ ...c, title: result.title, description: result.excerpt, body: result.content, durationText: result.readTime }))
      setAiGenerateOpen(false)
      setGenerateForm({ tema: '', conhecimento: '', tempoLeitura: '5' })
      setNotice('Artigo gerado com sucesso. Revise o conteúdo antes de publicar.')
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Erro ao gerar o artigo.')
    } finally {
      setAiGenerateLoading(false)
    }
  }

  const createStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adminSupabase || createLoading) return
    setCreateLoading(true)
    setCreateError('')
    setCreateSuccess('')
    const { data, error } = await adminSupabase.functions.invoke('admin-students', { body: { action: 'create', email: createEmail.trim().toLowerCase(), name: createName.trim(), password: createPassword } })
    setCreateLoading(false)
    if (error || data?.error) { setCreateError(await readFnError(error, data, 'Não foi possível criar o aluno.')); return }
    setCreateSuccess(`Aluno ${createEmail.trim().toLowerCase()} criado com sucesso.`)
    setCreateName('')
    setCreateEmail('')
    setCreatePassword('')
    void loadDashboard()
  }

  const inviteStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adminSupabase || inviteLoading) return
    setInviteLoading(true)
    setInviteError('')
    setInviteSuccess('')
    const { data, error } = await adminSupabase.functions.invoke('admin-students', { body: { action: 'invite', email: inviteEmail.trim().toLowerCase(), name: inviteName.trim() } })
    setInviteLoading(false)
    if (error || data?.error) {
      setInviteError(await readFnError(error, data, 'Não foi possível convidar o aluno.'))
      return
    }
    setInviteSuccess(`Convite enviado para ${inviteEmail.trim().toLowerCase()}.`)
    setInviteName('')
    setInviteEmail('')
    void loadDashboard()
  }

  const deleteStudent = async (studentId: string) => {
    if (!adminSupabase || deleteLoading) return
    setDeleteLoading(true)
    const { data, error } = await adminSupabase.functions.invoke('admin-students', { body: { action: 'delete', userId: studentId } })
    setDeleteLoading(false)
    setDeleteConfirmId(null)
    if (error || data?.error) { setError(await readFnError(error, data, 'Não foi possível remover o aluno.')); return }
    setStudents(prev => prev.filter(s => s.id !== studentId))
    setStats(prev => ({ ...prev, students: Math.max(0, prev.students - 1) }))
  }

  const changeSection = (nextSection: AdminSection) => {
    const cat = sectionCategory[nextSection]
    if (cat) setDraft(current => ({ ...current, category: cat }))
    setEditingId(null)
    setView('list')
    setSearchQuery('')
    setStatusFilter('all')
    setAuthorFilter('')
    setSortOrder('newest')
    setActiveLessonForm(null)
    setLessonFormError('')
    setNotice('')
    setError('')
  }
  if (!isAdmin) return <AdminShell section={section} onSectionChange={changeSection}><main className="page-content admin-denied"><span className="eyebrow">ÁREA RESTRITA</span><h1>Acesso administrativo</h1><p>Esta conta não está habilitada para gerir cursos.</p><Link className="button button-secondary" to="/"><ArrowLeft size={16}/> Voltar à Academia</Link><Link className="button button-secondary" to="/admin/login">Trocar de conta</Link></main></AdminShell>

  const SectionIcon = adminSections.find(item => item.id === section)?.Icon ?? LayoutDashboard
  const visibleCourses = courses.filter(course => (sectionCats[section] ?? []).includes(course.category))
  const uniqueAuthors = [...new Set(visibleCourses.map(c => c.instructor).filter(Boolean))].sort()
  const filteredCourses = visibleCourses
    .filter(c => !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase()) || c.instructor.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(c => statusFilter === 'all' || c.status === statusFilter)
    .filter(c => !authorFilter || c.instructor === authorFilter)
    .sort((a, b) => {
      const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      return sortOrder === 'oldest' ? -diff : diff
    })
  const publishedMiniseries = courses.filter(course => course.status === 'published' && course.category === 'miniseries').length
  const publishedPodcasts = courses.filter(course => course.status === 'published' && course.category === 'podcast').length
  const publishedFormatsTotal = publishedMiniseries + publishedPodcasts
  const miniseriesShare = publishedFormatsTotal ? Math.round(publishedMiniseries / publishedFormatsTotal * 100) : 0
  const isCatalogSection = section in sectionCategory
  const meta = sectionMeta[section] ?? sectionMeta.courses!
  return <AdminShell section={section} onSectionChange={changeSection}><main className={'page-content admin-page' + (section === 'podcasts' && view === 'list' ? ' admin-page--podcasts' : section === 'courses' && view === 'list' ? ' admin-page--courses' : section === 'interviews' && view === 'list' ? ' admin-page--interviews' : '')}>
    {view === 'form' ? <div className="admin-form-page-nav"><button type="button" className="admin-back-btn" onClick={resetForm}><ArrowLeft size={16}/> Voltar para {meta.plural}</button><Link className="admin-view-site" to={sectionInfo[section].publicPath ?? '/'}><Eye size={16}/> Ver página <ArrowUpRight size={15}/></Link></div> : <div className="admin-page-heading"><div><p className="eyebrow"><LayoutDashboard size={13}/> PAINEL DA ACADEMIA</p><h1>{sectionInfo[section].title}</h1><p>{sectionInfo[section].description}</p></div><div className="admin-page-heading-actions">{isCatalogSection && <button className="button admin-create-btn" type="button" onClick={() => { resetForm(); setView('form') }}><Plus size={16}/> Criar {meta.item}</button>}<Link className="admin-view-site" to={sectionInfo[section].publicPath ?? '/'}><Eye size={16}/> Ver página <ArrowUpRight size={15}/></Link></div></div>}
    {section === 'courses' && view === 'list' && <section className="podcast-admin-hero podcast-admin-hero--courses"><AdminHeroArtwork variant="miniseries"/><div className="podcast-admin-hero-inner"><p className="podcast-admin-eyebrow"><Grid2X2 size={14}/> PAINEL DA ACADEMIA</p><h1>{sectionInfo[section].title}</h1><p>{sectionInfo[section].description}</p><div className="podcast-admin-hero-actions"><button className="podcast-admin-create" type="button" onClick={() => { resetForm(); setView('form') }}><Plus size={18}/> Criar minissérie</button><Link className="podcast-admin-site" to="/minisseries"><Eye size={16}/> Ver no site <ArrowUpRight size={15}/></Link></div></div></section>}
    {(error || (notice && view !== 'form')) && createPortal(<AdminFeedback type={error ? 'error' : 'success'} message={error || notice} onClose={() => error ? setError('') : setNotice('')}/>, document.body)}
    {section === 'overview' && <>
    <section className="admin-stats" aria-label="Indicadores da Academia">
      <article className="admin-stat"><div className="admin-stat-head"><span className="admin-stat-label">Alunos registados</span><span className="admin-stat-icon"><Users size={16}/></span></div><strong>{loading ? '—' : stats.students.toLocaleString('pt-PT')}</strong><small>+{stats.newStudents} este mês</small><div className="admin-stat-spark"><Sparkline data={monthlyStudents.length ? monthlyStudents : [0,0,0,0,0,0]}/></div></article>
      <article className="admin-stat"><div className="admin-stat-head"><span className="admin-stat-label">Novos este mês</span><span className="admin-stat-icon"><CalendarDays size={16}/></span></div><strong>{loading ? '—' : stats.newStudents.toLocaleString('pt-PT')}</strong><small>Contas criadas neste mês</small><div className="admin-stat-spark"><Sparkline data={monthlyStudents.length ? monthlyStudents : [0,0,0,0,0,0]}/></div></article>
      <article className="admin-stat"><div className="admin-stat-head"><span className="admin-stat-label">Cursos publicados</span><span className="admin-stat-icon"><BookOpen size={16}/></span></div><strong>{loading ? '—' : stats.publishedCourses.toLocaleString('pt-PT')}</strong><small>Disponíveis na biblioteca</small><div className="admin-stat-spark"><Sparkline data={monthlyCourses.some(v => v > 0) ? monthlyCourses : [0,0,0,0,0,0]}/></div></article>
      <article className="admin-stat"><div className="admin-stat-head"><span className="admin-stat-label">Acessos este mês</span><span className="admin-stat-icon"><Eye size={16}/></span></div><strong>{loading ? '—' : stats.visitsThisMonth.toLocaleString('pt-PT')}</strong><small>Visitas aos cursos</small><div className="admin-stat-spark"><Sparkline data={monthlyVisits.length ? monthlyVisits : [0,0,0,0,0,0]}/></div></article>
    </section>
    <section className="admin-overview-grid admin-overview-grid--dashboard">
      <article className="admin-panel admin-chart-panel"><div className="admin-panel-heading"><div><p className="eyebrow">ENGAJAMENTO</p><h2>Acessos aos conteúdos</h2></div><span>Últimos 6 meses</span></div><div className="admin-chart-featured"><span className="admin-chart-featured-value">{loading ? '—' : monthlyVisits.reduce((a, b) => a + b, 0).toLocaleString('pt-PT')}</span><span className="admin-chart-featured-label">acessos totais</span><span className="admin-chart-featured-badge">+{stats.visitsThisMonth} este mês</span></div><div className="admin-chart-area" role="img" aria-label="Acessos aos conteúdos por mês"><AreaChart bars={monthlyBars}/></div><div className="admin-chart-footer"><span><i/> Acessos registados</span><strong>{stats.visitsThisMonth.toLocaleString('pt-PT')} neste mês</strong></div></article>
      <article className="admin-panel admin-format-panel"><div className="admin-panel-heading"><div><p className="eyebrow">BIBLIOTECA</p><h2>Conteúdos publicados</h2></div><span>Por formato</span></div><div className="admin-format-summary"><div className="admin-donut" role="img" aria-label={`${publishedMiniseries} minisséries e ${publishedPodcasts} podcasts publicados`} style={{ background: publishedFormatsTotal ? `conic-gradient(#1d7ec7 0% ${miniseriesShare}%, #5aaeff ${miniseriesShare}% 100%)` : '#1b2a39' }}><span><strong>{publishedFormatsTotal}</strong><small>publicados</small></span></div><ul className="admin-format-legend"><li><span className="admin-format-dot miniseries"/><span>Minisséries</span><strong>{publishedMiniseries}</strong></li><li><span className="admin-format-dot podcasts"/><span>Podcasts</span><strong>{publishedPodcasts}</strong></li></ul></div><Link className="admin-format-link" to="/admin?section=courses">Gerir biblioteca <ArrowUpRight size={14}/></Link></article>
    </section>
    <section className="admin-panel admin-activity-panel"><div className="admin-panel-heading"><div><p className="eyebrow">ACOMPANHAMENTO</p><h2>Atividade recente</h2></div><span>Últimos acessos aos cursos</span></div>{courseAccesses.length ? <div className="admin-activity-list">{courseAccesses.map(access => { const accessedCourse = courses.find(course => course.slug === access.course_slug); return <article className="admin-activity-row" key={access.id}><span className="admin-activity-icon"><BookOpen size={16}/></span><span className="admin-activity-copy"><strong>{accessNames[access.user_id] || 'Aluno da Academia'}</strong><small>{accessedCourse?.title || access.course_slug}</small></span><span className="admin-activity-kind">{accessedCourse?.category === 'podcast' ? 'Podcast' : 'Curso'}</span><time>{new Intl.DateTimeFormat('pt-PT', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(access.accessed_at))}</time></article> })}</div> : <p className="admin-empty-copy">Os acessos aos cursos aparecerão aqui conforme os alunos explorarem a biblioteca.</p>}</section>
    </>}
    {(section === 'podcasts' || section === 'interviews') && view === 'list' && <AdminPodcastCatalog variant={section === 'interviews' ? 'interview' : 'podcast'} courses={visibleCourses} loading={loading} onCreate={() => { resetForm(); setView('form') }} onEdit={course => { void editCourse(course) }} onDelete={course => { void deleteCourse(course) }}/>}
    {isCatalogSection && section !== 'podcasts' && section !== 'interviews' && view === 'list' && <section className="admin-catalog-view">
      <div className="admin-section-stats">
        <div className="admin-section-stat"><span className="admin-section-stat-icon"><BookOpen size={24}/></span><span>Total de {meta.plural}</span><strong>{visibleCourses.length}</strong><Waveform/></div>
        <div className="admin-section-stat"><span className="admin-section-stat-icon"><CheckCircle2 size={24}/></span><span>Publicados</span><strong className="published">{visibleCourses.filter(c => c.status === 'published').length}</strong><Waveform color="green"/></div>
        <div className="admin-section-stat"><span className="admin-section-stat-icon"><CalendarDays size={24}/></span><span>Agendados</span><strong className="scheduled">{visibleCourses.filter(c => c.status === 'scheduled').length}</strong><Waveform color="blue"/></div>
        <div className="admin-section-stat"><span className="admin-section-stat-icon"><FileText size={24}/></span><span>Rascunhos</span><strong>{visibleCourses.filter(c => c.status === 'draft').length}</strong><Waveform color="silver"/></div>
      </div>
      <div className="admin-filter-bar">
        <label className="admin-search-wrap"><Search size={15}/><input className="admin-search-input" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={`Pesquisar ${meta.plural} ou autores…`}/></label>
        <AdminSelect className="admin-filter-select" ariaLabel="Filtrar por estado" value={statusFilter} onChange={value => setStatusFilter(value as typeof statusFilter)} options={[{ value: 'all', label: 'Todos os estados' }, { value: 'published', label: 'Publicados' }, { value: 'scheduled', label: 'Agendados' }, { value: 'draft', label: 'Rascunhos' }]}/>
        {uniqueAuthors.length > 0 && <AdminSelect className="admin-filter-select" ariaLabel="Filtrar por autor" value={authorFilter} onChange={setAuthorFilter} options={[{ value: '', label: 'Todos os autores' }, ...uniqueAuthors.map(a => ({ value: a, label: a, avatar: getProfessorPhoto(a) ? img(getProfessorPhoto(a)!) : undefined }))]}/>}
        <AdminSelect className="admin-filter-select" ariaLabel="Ordenar catálogo" value={sortOrder} onChange={value => setSortOrder(value as typeof sortOrder)} options={[{ value: 'newest', label: 'Mais recentes' }, { value: 'oldest', label: 'Mais antigos' }]}/>
        {(searchQuery || statusFilter !== 'all' || authorFilter || sortOrder !== 'newest') && <button className="admin-clear-filters" type="button" onClick={() => { setSearchQuery(''); setStatusFilter('all'); setAuthorFilter(''); setSortOrder('newest') }}>Limpar filtros</button>}
      </div>
      <div className="admin-catalog-bar">
        <div><p className="eyebrow">CATÁLOGO</p><h2>{section === 'courses' ? 'Minisséries' : meta.plural.charAt(0).toUpperCase() + meta.plural.slice(1)}</h2></div>
        <span className="admin-catalog-count">{loading ? '…' : `${filteredCourses.length} ${filteredCourses.length === 1 ? meta.item : meta.plural} encontrado${filteredCourses.length === 1 ? '' : 's'}`}</span>
      </div>
      {loading
        ? <div className="admin-list-loading"><LoaderCircle className="admin-spinner" size={19}/>A carregar conteúdos…</div>
        : filteredCourses.length
          ? <div className="admin-course-grid">{filteredCourses.map(course => {
                const publicUrl = section === 'blog' ? `/blog/${course.slug}` : `/assistir/${course.slug}`
                return <article className="admin-course-row" key={course.id} onClick={() => void editCourse(course)} style={{ cursor: 'pointer' }}>
                  <img src={cardCover(course.cover_url || areaImage[course.slug])} alt="" className="admin-course-row-img"/>
                  <div className="admin-course-row-info">
                    <strong className="admin-course-row-title">{course.title}</strong>
                    {section === 'courses' && <span className="admin-course-kind admin-course-kind--miniseries">Minissérie</span>}
                    {section === 'courses' && course.position != null && <span className="admin-course-position">#{course.position}</span>}
                    {course.instructor && <span className="admin-course-row-author"><User size={13}/> {meta.authorLabel}: {course.instructor}</span>}
                  </div>
                  <div className="admin-course-row-meta">
                    <span className={`admin-course-status ${course.status}`}><span className="admin-status-dot"/>{course.status === 'published' ? 'Publicado' : course.status === 'scheduled' ? 'Agendado' : 'Rascunho'}</span>
                    <span className="admin-course-row-date"><CalendarDays size={12}/> {dateLabel(course.created_at)}</span>
                  </div>
                  <div className="admin-course-row-actions">
                    <Link to={publicUrl} className="admin-icon-button" title="Ver página" onClick={e => e.stopPropagation()}><Eye size={15}/></Link>
                    <button type="button" className="admin-icon-button" onClick={e => { e.stopPropagation(); void editCourse(course) }} title="Editar"><Pencil size={15}/></button>
                    <button type="button" className="admin-icon-button admin-icon-button--danger" onClick={e => { e.stopPropagation(); deleteCourse(course) }} title="Eliminar"><Trash2 size={15}/></button>
                  </div>
                </article>
              })}</div>
          : <div className="admin-courses-empty"><BookOpen size={28}/><strong>Nenhum conteúdo ainda</strong><span>{searchQuery || statusFilter !== 'all' ? 'Nenhum resultado. Tente outros filtros.' : `Clique em "Criar ${meta.item}" para adicionar o primeiro.`}</span></div>}
    </section>}
    {isCatalogSection && view === 'form' && <section className="admin-form-view" aria-label={`Formulário de ${meta.item}`}>
          {notice && <AdminFeedback type="success" message={notice} onClose={() => setNotice('')} modal/>}
      <form id="admin-course-form" onSubmit={saveCourse} className="admin-form-layout">
        {/* Coluna principal */}
        <div className="admin-form-main">
          {/* Cabeçalho do formulário */}
          <div className="admin-form-card admin-form-card-header">
            <span className="admin-form-icon"><BookOpen size={20}/></span>
            <div>
              <h2 className="admin-form-title">{editingId ? `Editar ${meta.item}` : `Novo ${meta.item}`}</h2>
              <p className="admin-form-subtitle">Preencha as informações abaixo para criar um novo {meta.item} na biblioteca.</p>
            </div>
          </div>
          {/* Seção 1 — Informações básicas */}
          <div className="admin-form-card">
            <div className="admin-form-section-head">
              <div className="admin-form-section-left"><span className="admin-form-step">1</span><div><strong>Informações básicas</strong><span>Defina os dados principais do/da {meta.item}.</span></div></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="admin-form-section-info"><Info size={13}/> Essas informações serão exibidas na biblioteca.</span>
                {section === 'blog' && <button type="button" className="admin-ai-btn--hero" onClick={() => setAiGenerateOpen(true)}><Sparkles size={14}/> Gerar com IA</button>}
              </div>
            </div>
            <div className="admin-field-row-equal">
              <label className="admin-field"><span>{meta.titleLabel}</span><input value={draft.title} onChange={e => setDraft(c => ({ ...c, title: e.target.value }))} placeholder={`Ex.: Título do ${meta.item}`} required maxLength={100}/></label>
              {(section === 'courses' || section === 'blog' || section === 'podcasts')
                ? <div className="admin-field"><span>{meta.authorLabel}</span><AdminSelect ariaLabel={meta.authorLabel} className="admin-author-select" value={draft.instructor} onChange={v => setDraft(c => ({ ...c, instructor: v }))} options={PROFESSOR_OPTIONS}/></div>
                : <label className="admin-field"><span>{meta.authorLabel}</span><input value={draft.instructor} onChange={e => setDraft(c => ({ ...c, instructor: e.target.value }))} placeholder={meta.authorLabel} maxLength={100}/></label>}
              {section === 'interviews' && (
                <div className="admin-field"><span>Autor</span><AdminSelect ariaLabel="Autor" className="admin-author-select" value={draft.interviewAuthor} onChange={v => setDraft(c => ({ ...c, interviewAuthor: v }))} options={PROFESSOR_OPTIONS}/></div>
              )}
            </div>
            <label className="admin-field"><span>Descrição</span><textarea value={draft.description} onChange={e => setDraft(c => ({ ...c, description: e.target.value }))} placeholder={`Sobre este ${meta.item}…`} required rows={4} maxLength={1200}/></label>
            {section === 'podcasts' && (
              <div className="admin-field">
                <span>Tema</span>
                <AdminSelect ariaLabel="Tema do podcast" className="admin-category-select" value={draft.articleCategory} onChange={v => setDraft(c => ({ ...c, articleCategory: v }))} options={articleCategories}/>
              </div>
            )}
            {section === 'blog' && (
              <div className="admin-field-row-equal">
                <div className="admin-field admin-category-field" style={{ marginTop: 0 }}>
                  <div className="admin-category-field-heading"><span>Categoria</span><button type="button" className="admin-category-create-btn" onClick={() => { setCategoryError(''); setCategoryModalOpen(true) }}><Plus size={14}/> Criar categoria</button></div>
                  <AdminSelect ariaLabel="Categoria" className="admin-category-select" value={draft.articleCategory} onChange={v => setDraft(c => ({ ...c, articleCategory: v }))} options={articleCategories}/>
                </div>
                <label className="admin-field" style={{ marginTop: 0 }}><span>Tempo de leitura</span><input value={draft.durationText} onChange={e => setDraft(c => ({ ...c, durationText: e.target.value }))} placeholder="Ex.: 5 min de leitura" maxLength={40}/></label>
              </div>
            )}
            {section === 'blog' && (
              <div className="admin-field"><span>Autor</span><AdminSelect ariaLabel="Autor do artigo" className="admin-author-select" value={draft.blogAuthor} onChange={v => setDraft(c => ({ ...c, blogAuthor: v }))} options={[{ value: '', label: 'Selecionar autor' }, ...PROFESSOR_OPTIONS]}/></div>
            )}
            {section === 'blog' && (
              <div className="admin-field">
                <div className="admin-ai-field-header">
                  <span>Conteúdo do artigo</span>
                  <div className="admin-ai-actions">
                    <button type="button" className="admin-ai-btn" onClick={() => void handleCorrectText()} disabled={aiCorrectLoading || !draft.body.trim()}>
                      {aiCorrectLoading ? <LoaderCircle size={12} className="admin-spinner"/> : <SpellCheck size={12}/>}
                      Corrigir escrita
                    </button>
                  </div>
                </div>
                <textarea value={draft.body} onChange={e => setDraft(c => ({ ...c, body: e.target.value }))} placeholder="Escreva o artigo completo aqui…" rows={10} maxLength={50000}/>
              </div>
            )}
          </div>
          {/* Banner de conversão: podcast com áudio único, sem episódios */}
          {section === 'podcasts' && draft.audioPath.trim() && draft.lessons.length === 0 && (
            <div className="admin-form-card admin-legacy-audio-banner">
              <div className="admin-form-section-head">
                <div className="admin-form-section-left"><Music size={18}/><div><strong>Áudio único (formato antigo)</strong><span>Este podcast tem um áudio único. Pode convertê-lo em episódio para usar múltiplos episódios.</span></div></div>
                <button type="button" className="admin-lesson-confirm-btn" onClick={convertToEpisode}><Plus size={14}/> Converter em episódio</button>
              </div>
            </div>
          )}
          {/* Seção 2 — Aulas da minissérie / Episódios do podcast */}
          {(section === 'courses' || section === 'podcasts') && <div className="admin-form-card">
            <div className="admin-form-section-head">
              <div className="admin-form-section-left"><span className="admin-form-step">2</span><div><strong>{section === 'podcasts' ? 'Episódios' : 'Aulas'}</strong><span>{section === 'podcasts' ? 'Adicione os episódios do programa com MP3 ou link de YouTube.' : `Adicione as aulas do ${meta.item} com os respectivos links do YouTube.`}</span></div></div>
              <div className="admin-form-section-actions">
                {aiSortDone && <span className="admin-autosort-notice"><Check size={12}/> Ordenado — clique em Publicar para confirmar</span>}
                {draft.lessons.length > 1 && <button type="button" className="admin-autosort-btn" disabled={aiSortLoading} onClick={() => { setAiSortDone(false)
                  setAiSortLoading(true)
                  sortLessonsByAI(draft.lessons.map(l => ({ id: l.id, title: l.title })))
                    .then(orderedIds => {
                      setDraft(c => {
                        const byId = new Map(c.lessons.map(l => [l.id, l]))
                        const sorted = orderedIds.map(id => byId.get(id)).filter(Boolean) as LessonDraft[]
                        const remaining = c.lessons.filter(l => !orderedIds.includes(l.id))
                        return { ...c, lessons: [...sorted, ...remaining] }
                      })
                      setAiSortDone(true)
                    })
                    .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Não foi possível ordenar as aulas com IA.'))
                    .finally(() => setAiSortLoading(false))
                }}>{aiSortLoading ? <><LoaderCircle size={13} className="admin-spinner"/> A ordenar…</> : <><Sparkles size={13}/> Ordenar com IA</>}</button>}
                <span className="admin-form-section-info"><Info size={13}/> Número de aulas e duração são calculados automaticamente.</span>
              </div>
            </div>
            {draft.lessons.length > 0 && <div className="admin-lessons-list">
              {draft.lessons.map((lesson, index) => (
                activeLessonForm && !activeLessonForm.isNew && activeLessonForm.id === lesson.id
                  ? <div key={lesson.id}>
                      <div className="admin-lesson-form">
                        <div className="admin-lesson-form-row">
                          <label className="admin-field"><span>Título {section === 'podcasts' ? 'do episódio' : 'da aula'}</span><input value={activeLessonForm.title} onChange={e => setActiveLessonForm(f => f ? { ...f, title: e.target.value } : f)} placeholder={section === 'podcasts' ? 'Ex.: Episódio 1 — Introdução' : 'Ex.: Introdução ao módulo'} maxLength={200}/></label>
                          {section !== 'podcasts' && <label className="admin-field"><span>Ligação do YouTube</span><div className="admin-input-icon-wrap"><Link2 size={14}/><input type="url" value={activeLessonForm.videoUrl} onChange={e => setLessonVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=…" className="admin-input-has-icon"/></div></label>}
                          <label className="admin-field"><span>Duração (ex.: 12:34)</span><div className="admin-input-icon-wrap"><Clock size={14}/><input value={activeLessonForm.durationText} onChange={e => setActiveLessonForm(f => f ? { ...f, durationText: e.target.value } : f)} placeholder="MM:SS ou H:MM:SS" className="admin-input-has-icon"/></div></label>
                        </div>
                        {section === 'podcasts' && (
                          <div className="admin-lesson-form-row">
                            <div className="admin-field">
                              <span>Ficheiro MP3 <span className="admin-ai-optional">(ou link de YouTube abaixo)</span></span>
                              {activeLessonForm.audioPath && safeResolveAudioSource(activeLessonForm.audioPath)?.kind === 'host' && (
                                <div className="admin-audio-current">
                                  <Music size={14}/><span>{activeLessonForm.audioFileName || 'Áudio carregado'}</span>
                                  <button type="button" className="admin-audio-remove-btn" disabled={lessonAudioUploading} onClick={() => setActiveLessonForm(f => f ? { ...f, audioPath: '', audioFileName: '' } : f)}><X size={12}/> Remover</button>
                                </div>
                              )}
                              <label className={`admin-audio-upload-area${activeLessonForm.audioFileName ? ' admin-audio-upload-area--selected' : ''}`}>
                                <input type="file" accept="audio/mpeg,.mp3" disabled={lessonAudioUploading || saving} onChange={e => { handleLessonAudioFile(e.target.files?.[0] ?? null); e.target.value = '' }}/>
                                {activeLessonForm.audioFileName
                                  ? <div className="admin-audio-file-info"><Music size={18}/><div><strong>{activeLessonForm.audioFileName}</strong></div></div>
                                  : <span className="admin-audio-placeholder"><Upload size={20}/><strong>Escolher MP3</strong><small>Máx. 150 MB · clique ou arraste</small></span>}
                              </label>
                              {lessonAudioUploading && lessonAudioUploadProgress > 0 && (
                                <div className="admin-audio-progress-wrap">
                                  <div className="admin-audio-progress-bar"><div className="admin-audio-progress-fill" style={{ width: `${lessonAudioUploadProgress}%` }}/></div>
                                  <span>{lessonAudioUploadProgress}%</span>
                                  <button type="button" className="admin-audio-cancel-btn" onClick={cancelLessonAudioUpload}>Cancelar</button>
                                </div>
                              )}
                            </div>
                            <label className="admin-field"><span>Link de YouTube <span className="admin-ai-optional">(alternativa ao MP3)</span></span><div className="admin-input-icon-wrap"><Link2 size={14}/><input type="url" value={activeLessonForm.videoUrl} onChange={e => setLessonVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=…" className="admin-input-has-icon"/></div></label>
                          </div>
                        )}
                        <div className="admin-lesson-form-row admin-lesson-form-row--cover">
                          <label className="admin-lesson-cover-upload">
                            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { const f = e.target.files?.[0]; if (f) pickLessonCover(f); e.target.value = '' }}/>
                            {activeLessonForm.coverPreview
                              ? <img src={activeLessonForm.coverPreview} alt="Capa" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}/>
                              : <span className="admin-lesson-cover-placeholder"><ImagePlus size={18}/><small>Capa {section === 'podcasts' ? 'do episódio' : 'da aula'}</small></span>}
                          </label>
                          {activeLessonForm.coverFile && <button type="button" className="admin-lesson-cover-remove" title="Remover capa" onClick={removeLessonCover}><X size={11}/></button>}
                        </div>
                        {lessonFormError && <p className="admin-lesson-form-error">{lessonFormError}</p>}
                        <div className="admin-lesson-form-actions">
                          <button type="button" className="admin-lesson-cancel-btn" onClick={cancelLessonForm}>Cancelar</button>
                          <button type="button" className="admin-lesson-confirm-btn" onClick={() => void confirmLessonForm()} disabled={lessonSaving || lessonAudioUploading}>{lessonSaving ? <LoaderCircle size={13} className="admin-spinner"/> : <Check size={14}/>} Guardar alterações</button>
                        </div>
                      </div>
                    </div>
                  : <div className="admin-lesson-row" key={lesson.id}>
                      <span className="admin-lesson-num">{String(index + 1).padStart(2, '0')}</span>
                      {lesson.coverUrl
                        ? <img className="admin-lesson-thumb" src={lesson.coverUrl} alt="" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}/>
                        : <span className="admin-lesson-thumb admin-lesson-thumb--empty">{lesson.audioPath ? <Music size={16}/> : <ImageIcon size={16}/>}</span>}
                      <div className="admin-lesson-info">
                        <span className="admin-lesson-title">{lesson.title}</span>
                        <span className="admin-lesson-url">{lesson.audioPath ? '🎵 MP3 carregado' : lesson.videoUrl}</span>
                      </div>
                      {lesson.durationSeconds > 0 && <span className="admin-lesson-dur"><Clock size={11}/> {formatDurationSeconds(lesson.durationSeconds)}</span>}
                      <div className="admin-lesson-actions">
                        <button type="button" className="admin-lesson-btn" title="Mover para cima" onClick={() => moveLesson(index, -1)} disabled={index === 0}><ChevronUp size={14}/></button>
                        <button type="button" className="admin-lesson-btn" title="Mover para baixo" onClick={() => moveLesson(index, 1)} disabled={index === draft.lessons.length - 1}><ChevronDown size={14}/></button>
                        <button type="button" className="admin-lesson-btn" title="Editar" onClick={() => openLessonEdit(lesson)}><Pencil size={13}/></button>
                        <button type="button" className="admin-lesson-btn admin-lesson-btn--danger" title="Remover" onClick={() => removeLesson(lesson.id)}><Trash2 size={13}/></button>
                      </div>
                    </div>
              ))}
            </div>}
            {activeLessonForm?.isNew && <div className="admin-lesson-form">
              <div className="admin-lesson-form-row">
                <label className="admin-field"><span>Título {section === 'podcasts' ? 'do episódio' : 'da aula'}</span><input value={activeLessonForm.title} onChange={e => setActiveLessonForm(f => f ? { ...f, title: e.target.value } : f)} placeholder={section === 'podcasts' ? 'Ex.: Episódio 1 — Introdução' : 'Ex.: Introdução ao módulo'} maxLength={200}/></label>
                {section !== 'podcasts' && <label className="admin-field"><span>Ligação do YouTube</span><div className="admin-input-icon-wrap"><Link2 size={14}/><input type="url" value={activeLessonForm.videoUrl} onChange={e => setLessonVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=…" className="admin-input-has-icon"/></div></label>}
                <label className="admin-field"><span>Duração (ex.: 12:34)</span><div className="admin-input-icon-wrap"><Clock size={14}/><input value={activeLessonForm.durationText} onChange={e => setActiveLessonForm(f => f ? { ...f, durationText: e.target.value } : f)} placeholder="MM:SS ou H:MM:SS" className="admin-input-has-icon"/></div></label>
              </div>
              {section === 'podcasts' && (
                <div className="admin-lesson-form-row">
                  <div className="admin-field">
                    <span>Ficheiro MP3 <span className="admin-ai-optional">(ou link de YouTube abaixo)</span></span>
                    {activeLessonForm.audioPath && safeResolveAudioSource(activeLessonForm.audioPath)?.kind === 'host' && (
                      <div className="admin-audio-current">
                        <Music size={14}/><span>{activeLessonForm.audioFileName || 'Áudio carregado'}</span>
                        <button type="button" className="admin-audio-remove-btn" disabled={lessonAudioUploading} onClick={() => setActiveLessonForm(f => f ? { ...f, audioPath: '', audioFileName: '' } : f)}><X size={12}/> Remover</button>
                      </div>
                    )}
                    <label className={`admin-audio-upload-area${activeLessonForm.audioFileName ? ' admin-audio-upload-area--selected' : ''}`}>
                      <input type="file" accept="audio/mpeg,.mp3" disabled={lessonAudioUploading || saving} onChange={e => { handleLessonAudioFile(e.target.files?.[0] ?? null); e.target.value = '' }}/>
                      {activeLessonForm.audioFileName
                        ? <div className="admin-audio-file-info"><Music size={18}/><div><strong>{activeLessonForm.audioFileName}</strong></div></div>
                        : <span className="admin-audio-placeholder"><Upload size={20}/><strong>Escolher MP3</strong><small>Máx. 150 MB · clique ou arraste</small></span>}
                    </label>
                    {lessonAudioUploading && lessonAudioUploadProgress > 0 && (
                      <div className="admin-audio-progress-wrap">
                        <div className="admin-audio-progress-bar"><div className="admin-audio-progress-fill" style={{ width: `${lessonAudioUploadProgress}%` }}/></div>
                        <span>{lessonAudioUploadProgress}%</span>
                        <button type="button" className="admin-audio-cancel-btn" onClick={cancelLessonAudioUpload}>Cancelar</button>
                      </div>
                    )}
                  </div>
                  <label className="admin-field"><span>Link de YouTube <span className="admin-ai-optional">(alternativa ao MP3)</span></span><div className="admin-input-icon-wrap"><Link2 size={14}/><input type="url" value={activeLessonForm.videoUrl} onChange={e => setLessonVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=…" className="admin-input-has-icon"/></div></label>
                </div>
              )}
              <div className="admin-lesson-form-row admin-lesson-form-row--cover">
                <label className="admin-lesson-cover-upload">
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { const f = e.target.files?.[0]; if (f) pickLessonCover(f); e.target.value = '' }}/>
                  {activeLessonForm.coverPreview
                    ? <img src={activeLessonForm.coverPreview} alt="Capa" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}/>
                    : <span className="admin-lesson-cover-placeholder"><ImagePlus size={18}/><small>Capa {section === 'podcasts' ? 'do episódio' : 'da aula'}</small></span>}
                </label>
                {activeLessonForm.coverFile && <button type="button" className="admin-lesson-cover-remove" title="Remover capa" onClick={removeLessonCover}><X size={11}/></button>}
              </div>
              {lessonFormError && <p className="admin-lesson-form-error">{lessonFormError}</p>}
              <div className="admin-lesson-form-actions">
                <button type="button" className="admin-lesson-cancel-btn" onClick={cancelLessonForm}>Cancelar</button>
                <button type="button" className="admin-lesson-confirm-btn" onClick={() => void confirmLessonForm()} disabled={lessonSaving || lessonAudioUploading}>{lessonSaving ? <LoaderCircle size={13} className="admin-spinner"/> : <Check size={14}/>} Adicionar {section === 'podcasts' ? 'episódio' : 'aula'}</button>
              </div>
            </div>}
            {!activeLessonForm && !playlistImportOpen && (
              <div className="admin-lesson-add-row">
                <button type="button" className="admin-add-lesson-btn" onClick={addNewLesson}><Plus size={14}/> Adicionar {section === 'podcasts' ? 'episódio' : 'aula'}</button>
                {section !== 'podcasts' && <button type="button" className="admin-import-playlist-btn" onClick={openPlaylistImport}><ListVideo size={14}/> Importar lista de reprodução</button>}
              </div>
            )}
            {playlistImportOpen && (
              <div className="admin-playlist-import">
                <div className="admin-playlist-import-header">
                  <ListVideo size={15}/>
                  <strong>Importar lista de reprodução do YouTube</strong>
                  <button type="button" className="admin-playlist-import-close" onClick={closePlaylistImport}><X size={14}/></button>
                </div>
                <div className="admin-playlist-url-row">
                  <input
                    type="url"
                    className="admin-playlist-url-input"
                    placeholder="https://www.youtube.com/playlist?list=..."
                    value={playlistUrl}
                    onChange={e => setPlaylistUrl(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && void fetchPlaylist()}
                  />
                  <button type="button" className="admin-playlist-fetch-btn" onClick={() => void fetchPlaylist()} disabled={!playlistUrl.trim() || playlistFetching}>
                    {playlistFetching ? <LoaderCircle size={13} className="admin-spinner"/> : <Search size={13}/>} Pesquisar
                  </button>
                </div>
                {playlistError && <p className="admin-playlist-error">{playlistError}</p>}
                {playlistItems.length > 0 && <>
                  <div className="admin-playlist-results-header">
                    <span>{playlistItems.length} vídeo{playlistItems.length !== 1 ? 's' : ''} encontrado{playlistItems.length !== 1 ? 's' : ''}</span>
                    <button type="button" className="admin-playlist-select-all" onClick={() => setPlaylistSelected(playlistSelected.size === playlistItems.length ? new Set() : new Set(playlistItems.map(v => v.videoId)))}>
                      {playlistSelected.size === playlistItems.length ? 'Desmarcar todos' : 'Selecionar todos'}
                    </button>
                  </div>
                  <div className="admin-playlist-list">
                    {playlistItems.map((v, i) => (
                      <label key={v.videoId} className={`admin-playlist-item${playlistSelected.has(v.videoId) ? ' admin-playlist-item--checked' : ''}`}>
                        <input type="checkbox" checked={playlistSelected.has(v.videoId)} onChange={() => togglePlaylistItem(v.videoId)}/>
                        <img src={`https://img.youtube.com/vi/${v.videoId}/default.jpg`} alt="" className="admin-playlist-thumb"/>
                        <span className="admin-playlist-item-num">{i + 1}</span>
                        <span className="admin-playlist-item-title">{v.title}</span>
                        {v.durationSeconds > 0 && <span className="admin-playlist-item-dur"><Clock size={10}/> {formatDurationSeconds(v.durationSeconds)}</span>}
                      </label>
                    ))}
                  </div>
                  <div className="admin-playlist-import-actions">
                    <button type="button" className="admin-lesson-cancel-btn" onClick={closePlaylistImport}>Cancelar</button>
                    <button type="button" className="admin-lesson-confirm-btn" onClick={importPlaylistLessons} disabled={!playlistSelected.size}>
                      <Check size={14}/> Importar {playlistSelected.size} aula{playlistSelected.size !== 1 ? 's' : ''}
                    </button>
                  </div>
                </>}
              </div>
            )}
          </div>}
          {/* Seção 2 — Conteúdo (entrevistas, zoom; podcasts sempre usam episódios) */}
          {section !== 'blog' && section !== 'courses' && section !== 'podcasts' && <div className="admin-form-card">
            <div className="admin-form-section-head">
              <div className="admin-form-section-left"><span className="admin-form-step">2</span><div><strong>Conteúdo</strong><span>Configure o conteúdo e a estrutura do {meta.item}.</span></div></div>
            </div>
            <label className="admin-field"><span>{meta.videoLabel}</span>
              <div className="admin-input-icon-wrap"><Link2 size={14}/><input type="url" value={draft.videoUrl} onChange={e => setDraft(c => ({ ...c, videoUrl: e.target.value }))} placeholder="https://…" required className="admin-input-has-icon"/></div>
            </label>
            {section === 'zoom' && <div className="admin-form-grid">
              <label className="admin-field"><span>Tipo de gravação</span><AdminSelect className="admin-field-select" ariaLabel="Tipo de gravação" value={draft.zoomType} onChange={value => setDraft(c => ({ ...c, zoomType: value }))} options={[{ value: 'Aula', label: 'Aula' }, { value: 'Workshop', label: 'Workshop' }, { value: 'Mentoria', label: 'Mentoria' }]}/></label>
              <label className="admin-field"><span>Categoria</span><input value={draft.zoomCategory} onChange={e => setDraft(c => ({ ...c, zoomCategory: e.target.value }))} placeholder="Ex.: Vendas" maxLength={80}/></label>
            </div>}
            {section === 'zoom' && <label className="admin-field"><span>Duração</span><input value={draft.durationText} onChange={e => setDraft(c => ({ ...c, durationText: e.target.value }))} placeholder="Ex.: 45 min"/></label>}
          </div>}
          {/* Seção 3 — Configurações */}
          <div className="admin-form-card">
            <div className="admin-form-section-head">
              <div className="admin-form-section-left"><span className="admin-form-step">{section !== 'blog' ? 3 : 2}</span><div><strong>Configurações</strong><span>Defina o nível, capa e outras opções.</span></div></div>
            </div>
            <div className={`admin-form-config-grid${section === 'blog' ? ' admin-form-config-grid--article' : ''}`}>
              <div className="admin-form-config-left">
                {section === 'courses' && <label className="admin-field"><span>Nível</span><AdminSelect className="admin-field-select" ariaLabel="Nível" value={draft.level ?? ''} onChange={value => setDraft(c => ({ ...c, level: (value || null) as Course['level'] }))} options={[{ value: '', label: 'Sem nível definido' }, { value: 'Iniciante', label: 'Iniciante' }, { value: 'Intermédio', label: 'Intermédio' }, { value: 'Avançado', label: 'Avançado' }]}/></label>}
                {section === 'courses' && <label className="admin-field"><span>Posição na biblioteca</span><div className="admin-input-icon-wrap"><Hash size={14}/><input type="number" min="1" value={draft.position} onChange={e => setDraft(c => ({ ...c, position: e.target.value }))} placeholder="Ex.: 1, 2, 3…" className="admin-input-has-icon"/></div></label>}
                {section === 'courses' && <label className="admin-field admin-field--checkbox"><input type="checkbox" checked={draft.notesEnabled} onChange={e => setDraft(c => ({ ...c, notesEnabled: e.target.checked }))}/><div className="admin-checkbox-copy"><span>Ativar a opção de notas</span><small>Permite que os alunos façam anotações durante a {meta.item}.</small></div></label>}
              </div>
              <div className="admin-form-config-right">
                <div className="admin-field"><span>Capa</span>
                  <label className="admin-cover-upload-compact"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseCover}/>
                    {previewUrl ? <img src={previewUrl} alt="" className="admin-cover-upload-compact-img"/> : <span className="admin-cover-placeholder"><ImagePlus size={24}/><strong>Escolher imagem de capa</strong><small>Arraste e solte uma imagem aqui, ou clique para selecionar</small><small>JPG, PNG ou WebP · até 8 MB</small></span>}
                  </label>
                  {previewUrl && <button type="button" className="admin-remove-cover" onClick={() => { setDraft(c => ({ ...c, file: null, coverUrl: '' })); setPreviewUrl('') }}>Remover capa</button>}
                </div>
              </div>
            </div>
          </div>
          {/* Barra inferior — Estado + Salvar */}
          <div className="admin-form-bottom-bar">
            <div className="admin-form-bottom-estado">
              <span>Estado</span>
              <AdminSelect className={`admin-status-select admin-status-select--${draft.status}`} ariaLabel="Estado da publicação" value={draft.status} onChange={value => setDraft(c => ({ ...c, status: value as CourseDraft['status'] }))} options={[{ value: 'draft', label: 'Guardar como rascunho' }, { value: 'scheduled', label: 'Agendar publicação' }, { value: 'published', label: 'Publicar agora' }]}/>
              {draft.status === 'scheduled' && <input type="datetime-local" className="admin-scheduled-input" value={draft.scheduledFor} onChange={e => setDraft(c => ({ ...c, scheduledFor: e.target.value }))} required/>}
            </div>
            <button className="button admin-save-btn-new" type="submit" disabled={saving}>
              {saving ? <><LoaderCircle className="admin-spinner" size={17}/>A guardar…</> : draft.status === 'published' ? <><Save size={16}/> Publicar {meta.item}</> : draft.status === 'scheduled' ? <><CalendarDays size={16}/> Agendar {meta.item}</> : <><Save size={16}/> {editingId ? 'Guardar alterações' : 'Guardar rascunho'}</>}
            </button>
          </div>
        </div>
        {/* Sidebar direita */}
        <div className="admin-form-sidebar">
          {/* Pré-visualização da capa */}
          <div className="admin-form-sidebar-card">
            <div className="admin-sidebar-card-head">
              <span className="admin-sidebar-card-icon"><ImagePlus size={15}/></span>
              <div><strong>Pré-visualização da capa</strong><span>Veja como a capa da {meta.item} será exibida na biblioteca.</span></div>
            </div>
            <div className="admin-cover-preview">
              {previewUrl ? <img src={previewUrl} alt=""/> : <div className="admin-cover-preview-empty"><ImagePlus size={26}/><strong>A sua capa será apresentada aqui</strong><span>Após carregar a imagem</span></div>}
            </div>
          </div>
          {/* Resumo de publicação */}
          <div className="admin-form-sidebar-card">
            <div className="admin-sidebar-card-head">
              <span className="admin-sidebar-card-icon"><BookOpen size={15}/></span>
              <div><strong>Resumo de publicação</strong><span>Verifique as informações antes de publicar.</span></div>
            </div>
            <ul className="admin-pub-summary">
              <li><span><Type size={12}/> Título</span><strong>{draft.title.trim() || 'Não informado'}</strong></li>
              <li><span><User size={12}/> Autor</span><strong>{draft.instructor.trim() || 'Não informado'}</strong></li>
              {section === 'courses' && <>
                <li><span><Hash size={12}/> Nº de aulas</span><strong>{draft.lessons.length || '—'}</strong></li>
                <li><span><Clock size={12}/> Duração total</span><strong>{totalDurationText(draft.lessons) || '—'}</strong></li>
                <li><span><GraduationCap size={12}/> Nível</span><strong>{draft.level || 'Sem nível definido'}</strong></li>
              </>}
              {section === 'podcasts' && draft.lessons.length > 0 && <>
                <li><span><Hash size={12}/> Episódios</span><strong>{draft.lessons.length}</strong></li>
                <li><span><Clock size={12}/> Duração total</span><strong>{totalDurationText(draft.lessons) || '—'}</strong></li>
              </>}
              <li><span><Check size={12}/> Estado</span><strong className={`admin-pub-status ${draft.status}`}><span className="admin-status-dot"/>{draft.status === 'published' ? 'Publicado' : draft.status === 'scheduled' ? 'Agendado' : 'Rascunho'}</strong></li>
            </ul>
          </div>
          {/* Dicas */}
          {(section === 'courses' || section === 'podcasts') && <div className="admin-form-sidebar-card admin-tips-card">
            <div className="admin-tips-head"><Lightbulb size={17}/><strong>Dicas para um bom {meta.item}</strong></div>
            <ul className="admin-tips-list">
              <li><CheckCircle2 size={14}/> Use um título claro e objetivo</li>
              <li><CheckCircle2 size={14}/> Escreva uma descrição que destaque os benefícios</li>
              <li><CheckCircle2 size={14}/> Organize o conteúdo em aulas bem estruturadas</li>
              <li><CheckCircle2 size={14}/> Utilize uma capa de alta qualidade (16:9)</li>
            </ul>
          </div>}
        </div>
      </form>
    </section>}
    {view === 'form' && section === 'blog' && categoryModalOpen && createPortal(
      <div className="admin-category-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="admin-category-modal-title" onPointerDown={event => { if (event.target === event.currentTarget) setCategoryModalOpen(false) }}>
        <form className="admin-category-modal" onSubmit={createArticleCategory}>
          <button type="button" className="admin-edit-modal-close" onClick={() => setCategoryModalOpen(false)} aria-label="Fechar"><X size={18}/></button>
          <span className="admin-category-modal-icon"><Hash size={18}/></span>
          <h2 id="admin-category-modal-title">Criar categoria</h2>
          <p>Defina o nome e a cor que vai identificar esta categoria nos artigos.</p>
          {categoryError && <p className="admin-category-modal-error" role="alert">{categoryError}</p>}
          <label className="admin-field"><span>Nome da categoria</span><input autoFocus value={newCategoryName} onChange={event => { setNewCategoryName(event.target.value); setCategoryError('') }} placeholder="Ex.: Liderança" maxLength={40} required/></label>
          <label className="admin-field admin-category-color-field"><span>Cor do marcador</span><span className="admin-category-color-control"><input type="color" value={newCategoryColor} onChange={event => setNewCategoryColor(event.target.value)} aria-label="Cor do marcador"/><code>{newCategoryColor.toUpperCase()}</code></span></label>
          <div className="admin-category-modal-actions"><button type="button" className="admin-lesson-cancel-btn" onClick={() => setCategoryModalOpen(false)}>Cancelar</button><button type="submit" className="admin-ai-generate-btn" disabled={categorySaving || !newCategoryName.trim()}>{categorySaving ? <><LoaderCircle size={14} className="admin-spinner"/> A guardar…</> : <><Plus size={14}/> Criar categoria</>}</button></div>
        </form>
      </div>,
      document.body
    )}
    {view === 'form' && section === 'blog' && aiGenerateOpen && createPortal(
      <div className="admin-ai-backdrop" role="dialog" aria-modal="true" onPointerDown={e => { if (e.target === e.currentTarget) setAiGenerateOpen(false) }}>
        <div className="admin-ai-modal">
          <button type="button" className="admin-edit-modal-close" onClick={() => setAiGenerateOpen(false)} aria-label="Fechar"><X size={18}/></button>
          <div className="admin-ai-modal-header">
            <span className="admin-ai-modal-icon"><Sparkles size={18}/></span>
            <div>
              <h2 className="admin-ai-modal-title">Gerar artigo com IA</h2>
              <p className="admin-ai-modal-subtitle">Preencha os campos e a IA escreverá um artigo completo para si.</p>
            </div>
          </div>
          {aiError && <p className="admin-ai-error">{aiError}</p>}
          <div className="admin-field">
            <span>Tema do artigo <span className="admin-ai-required">*</span></span>
            <input
              value={generateForm.tema}
              onChange={e => setGenerateForm(f => ({ ...f, tema: e.target.value }))}
              placeholder="Ex.: Como aumentar a produtividade no trabalho"
              maxLength={200}
              autoFocus
            />
          </div>
          <div className="admin-field">
            <span>Base de conhecimento <span className="admin-ai-optional">(opcional)</span></span>
            <textarea
              value={generateForm.conhecimento}
              onChange={e => setGenerateForm(f => ({ ...f, conhecimento: e.target.value }))}
              placeholder="Adicione contexto, referências, tópicos a cobrir ou qualquer informação que a IA deva considerar…"
              rows={5}
              maxLength={2000}
            />
          </div>
          <div className="admin-field">
            <span>Tempo de leitura aproximado</span>
            <select value={generateForm.tempoLeitura} onChange={e => setGenerateForm(f => ({ ...f, tempoLeitura: e.target.value }))}>
              <option value="3">~3 min de leitura</option>
              <option value="5">~5 min de leitura</option>
              <option value="7">~7 min de leitura</option>
              <option value="10">~10 min de leitura</option>
              <option value="15">~15 min de leitura</option>
            </select>
          </div>
          <div className="admin-ai-modal-footer">
            <button type="button" className="admin-lesson-cancel-btn" onClick={() => { setAiGenerateOpen(false); setAiError('') }}>Cancelar</button>
            <button type="button" className="admin-ai-generate-btn" onClick={() => void handleGenerateArticle()} disabled={aiGenerateLoading || !generateForm.tema.trim()}>
              {aiGenerateLoading ? <><LoaderCircle size={14} className="admin-spinner"/> A gerar…</> : <><Sparkles size={14}/> Gerar artigo</>}
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}
    {section === 'students' && <>
      <div className="admin-section-stats">
        <div className="admin-section-stat"><span className="admin-section-stat-icon"><Users size={24}/></span><span>Total de alunos</span><strong>{loading ? '—' : stats.students.toLocaleString('pt-PT')}</strong><Waveform/></div>
        <div className="admin-section-stat"><span className="admin-section-stat-icon"><CalendarDays size={24}/></span><span>Novos este mês</span><strong className="published">{loading ? '—' : stats.newStudents.toLocaleString('pt-PT')}</strong><Waveform color="green"/></div>
      </div>
      <div className="admin-filter-bar" style={{ marginBottom: 0 }}>
        <label className="admin-search-wrap"><Search size={15}/><input className="admin-search-input" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Pesquisar por nome ou e-mail…"/></label>
        <button className="button admin-create-btn" type="button" onClick={() => { setCreateOpen(true); setCreateError(''); setCreateSuccess('') }}><Plus size={16}/> Criar aluno</button>
        <button className="button admin-create-btn" type="button" style={{ background: 'transparent', border: '1px solid #1e3a52', color: '#7ab3d4' }} onClick={() => { setInviteOpen(true); setInviteError(''); setInviteSuccess('') }}><Mail size={15}/> Convidar por e-mail</button>
      </div>
      <div className="admin-panel" style={{ marginTop: 16 }}>
        <div className="admin-panel-heading"><div><p className="eyebrow">REGISTOS</p><h2>Alunos</h2></div><span>{loading ? '…' : `${students.filter(s => !studentSearch || s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.email.toLowerCase().includes(studentSearch.toLowerCase())).length} encontrado(s)`}</span></div>
        {loading
          ? <div className="admin-list-loading"><LoaderCircle className="admin-spinner" size={19}/>A carregar alunos…</div>
          : <div className="admin-students-table">
              <div className="admin-students-head">
                <span>Nome</span>
                <span>E-mail</span>
                <span>Registo</span>
                <span/>
              </div>
              {students.filter(s => !studentSearch || s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.email.toLowerCase().includes(studentSearch.toLowerCase())).length === 0
                ? <div className="admin-courses-empty"><Users size={28}/><strong>Nenhum aluno encontrado</strong><span>{studentSearch ? 'Nenhum resultado para essa pesquisa.' : 'Os alunos registados aparecerão aqui.'}</span></div>
                : students.filter(s => !studentSearch || s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.email.toLowerCase().includes(studentSearch.toLowerCase())).map(s => (
                  <div className="admin-students-row" key={s.id}>
                    <span className="admin-students-name"><span className="admin-students-avatar">{(s.name[0] ?? 'A').toUpperCase()}</span>{s.name}</span>
                    <span className="admin-students-email">{s.email || '—'}</span>
                    <span className="admin-students-date">{new Intl.DateTimeFormat('pt-PT', { dateStyle: 'short' }).format(new Date(s.created_at))}</span>
                    <span className="admin-students-actions">
                      <button type="button" className="admin-icon-button admin-icon-button--danger" title="Remover aluno" onClick={() => setDeleteConfirmId(s.id)}><Trash2 size={15}/></button>
                    </span>
                  </div>
                ))
              }
            </div>
        }
      </div>
      {createOpen && createPortal(
        <div className="admin-category-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="admin-create-title" onPointerDown={e => { if (e.target === e.currentTarget) { setCreateOpen(false); setCreateSuccess('') } }}>
          <form className="admin-category-modal" onSubmit={createStudent}>
            <button type="button" className="admin-edit-modal-close" onClick={() => { setCreateOpen(false); setCreateSuccess('') }} aria-label="Fechar"><X size={18}/></button>
            <span className="admin-category-modal-icon"><GraduationCap size={18}/></span>
            <h2 id="admin-create-title">Criar aluno</h2>
            <p>A conta fica ativa imediatamente. Partilhe as credenciais com o aluno.</p>
            {createError && <p className="admin-category-modal-error" role="alert">{createError}</p>}
            {createSuccess && <p className="admin-category-modal-success" role="status">{createSuccess}</p>}
            <label className="admin-field"><span>Nome completo</span><input autoFocus value={createName} onChange={e => { setCreateName(e.target.value); setCreateError('') }} placeholder="Ex.: João Silva" maxLength={100}/></label>
            <label className="admin-field"><span>E-mail <span className="admin-ai-required">*</span></span><input type="email" value={createEmail} onChange={e => { setCreateEmail(e.target.value); setCreateError('') }} placeholder="joao@email.com" required maxLength={200}/></label>
            <label className="admin-field"><span>Palavra-passe <span className="admin-ai-required">*</span></span><input type="password" value={createPassword} onChange={e => { setCreatePassword(e.target.value); setCreateError('') }} placeholder="Mínimo 6 caracteres" required minLength={6} maxLength={100}/></label>
            <div className="admin-category-modal-actions">
              <button type="button" className="admin-lesson-cancel-btn" onClick={() => { setCreateOpen(false); setCreateSuccess('') }}>Fechar</button>
              <button type="submit" className="admin-ai-generate-btn" disabled={createLoading || !createEmail.trim() || !createPassword}>{createLoading ? <><LoaderCircle size={14} className="admin-spinner"/> A criar…</> : <><Plus size={14}/> Criar aluno</>}</button>
            </div>
          </form>
        </div>,
        document.body
      )}
      {inviteOpen && createPortal(
        <div className="admin-category-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="admin-invite-title" onPointerDown={e => { if (e.target === e.currentTarget) { setInviteOpen(false); setInviteSuccess('') } }}>
          <form className="admin-category-modal" onSubmit={inviteStudent}>
            <button type="button" className="admin-edit-modal-close" onClick={() => { setInviteOpen(false); setInviteSuccess('') }} aria-label="Fechar"><X size={18}/></button>
            <span className="admin-category-modal-icon"><User size={18}/></span>
            <h2 id="admin-invite-title">Convidar aluno</h2>
            <p>O aluno receberá um e-mail para criar a palavra-passe e aceder à Academia.</p>
            {inviteError && <p className="admin-category-modal-error" role="alert">{inviteError}</p>}
            {inviteSuccess && <p className="admin-category-modal-success" role="status">{inviteSuccess}</p>}
            <label className="admin-field"><span>Nome completo</span><input autoFocus value={inviteName} onChange={e => { setInviteName(e.target.value); setInviteError('') }} placeholder="Ex.: João Silva" maxLength={100}/></label>
            <label className="admin-field"><span>E-mail <span className="admin-ai-required">*</span></span><input type="email" value={inviteEmail} onChange={e => { setInviteEmail(e.target.value); setInviteError('') }} placeholder="joao@email.com" required maxLength={200}/></label>
            <div className="admin-category-modal-actions">
              <button type="button" className="admin-lesson-cancel-btn" onClick={() => { setInviteOpen(false); setInviteSuccess('') }}>Fechar</button>
              <button type="submit" className="admin-ai-generate-btn" disabled={inviteLoading || !inviteEmail.trim()}>{inviteLoading ? <><LoaderCircle size={14} className="admin-spinner"/> A enviar…</> : <><Plus size={14}/> Enviar convite</>}</button>
            </div>
          </form>
        </div>,
        document.body
      )}
      {deleteConfirmId && createPortal(
        <div className="admin-category-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="admin-delete-title" onPointerDown={e => { if (e.target === e.currentTarget) setDeleteConfirmId(null) }}>
          <div className="admin-category-modal">
            <button type="button" className="admin-edit-modal-close" onClick={() => setDeleteConfirmId(null)} aria-label="Fechar"><X size={18}/></button>
            <span className="admin-category-modal-icon" style={{ background: 'rgba(239,68,68,.12)', color: '#f87171' }}><Trash2 size={18}/></span>
            <h2 id="admin-delete-title">Remover aluno</h2>
            <p>Esta ação é irreversível. O aluno perderá acesso imediatamente e todos os seus dados serão removidos.</p>
            <div className="admin-category-modal-actions">
              <button type="button" className="admin-lesson-cancel-btn" onClick={() => setDeleteConfirmId(null)}>Cancelar</button>
              <button type="button" className="admin-ai-generate-btn" style={{ background: 'rgba(239,68,68,.15)', color: '#f87171', borderColor: 'rgba(239,68,68,.3)' }} disabled={deleteLoading} onClick={() => void deleteStudent(deleteConfirmId)}>{deleteLoading ? <><LoaderCircle size={14} className="admin-spinner"/> A remover…</> : <><Trash2 size={14}/> Remover aluno</>}</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>}
    {deleteCourseConfirm && createPortal(
      <div className="admin-category-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="admin-delete-course-title" onPointerDown={e => { if (!deleteCourseLoading && e.target === e.currentTarget) setDeleteCourseConfirm(null) }}>
        <div className="admin-category-modal">
          <button type="button" className="admin-edit-modal-close" disabled={deleteCourseLoading} onClick={() => setDeleteCourseConfirm(null)} aria-label="Fechar"><X size={18}/></button>
          <span className="admin-category-modal-icon" style={{ background: 'rgba(239,68,68,.12)', color: '#f87171' }}><Trash2 size={18}/></span>
          <h2 id="admin-delete-course-title">Eliminar {meta.item}</h2>
          <p>Eliminar <strong>"{deleteCourseConfirm.title}"</strong>? Deixará de aparecer para os alunos. Esta ação não pode ser desfeita.</p>
          <div className="admin-category-modal-actions">
            <button type="button" className="admin-lesson-cancel-btn" disabled={deleteCourseLoading} onClick={() => setDeleteCourseConfirm(null)}>Cancelar</button>
            <button type="button" className="admin-ai-generate-btn" style={{ background: 'rgba(239,68,68,.15)', color: '#f87171', borderColor: 'rgba(239,68,68,.3)' }} disabled={deleteCourseLoading} onClick={() => void confirmDeleteCourse()}>{deleteCourseLoading ? <><LoaderCircle size={14} className="admin-spinner"/> A eliminar…</> : <><Trash2 size={14}/> Eliminar</>}</button>
          </div>
        </div>
      </div>,
      document.body
    )}
    {!isCatalogSection && section !== 'overview' && section !== 'students' && <section className="admin-panel admin-content-coming"><span className="admin-content-coming-icon"><SectionIcon size={22}/></span><div><p className="eyebrow">SECÇÃO DA ACADEMIA</p><h2>{sectionInfo[section].title}</h2><p>Esta página já está disponível na plataforma. O registo para esta secção estará disponível em breve.</p><Link className="admin-view-site" to={sectionInfo[section].publicPath ?? '/'}><Eye size={15}/> Abrir página pública <ArrowUpRight size={14}/></Link></div></section>}
  </main></AdminShell>
}
