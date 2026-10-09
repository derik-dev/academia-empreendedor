import { useCallback, useEffect, useRef, useState } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { ArrowRight, BarChart3, Bell, BookOpen, Camera, Check, ChevronRight, Clock, Home, Layers3, LogOut, Mail, Mic2, Newspaper, Pencil, Play, Podcast, Search, Settings, Video, X, ZoomIn, ZoomOut } from 'lucide-react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { areas } from '../data/content'
import { usePublishedCourses } from '../data/usePublishedCourses'
import { useAuth } from '../auth/useAuth'
import { supabase } from '../lib/supabase'
import { img } from '../lib/publicUrl'

const SIDEBAR_NAV = [
  { to: '/', label: 'Início', Icon: Home },
  { to: '/minisseries', label: 'Minisséries', Icon: Layers3 },
  { to: '/podcasts', label: 'Podcasts', Icon: Podcast },
  { to: '/entrevistas', label: 'Entrevistas', Icon: Mic2 },
  { to: '/blog', label: 'Blog', Icon: Newspaper },
  { to: '/gravacoes-zoom', label: 'Gravações do Zoom', Icon: Video },
  { to: '/avisos', label: 'Canal de Avisos', Icon: Bell },
]

export function Sidebar() {
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const close = () => setOpen(false)
  const handleLogout = async () => { await signOut(); navigate('/login') }
  const initial = user?.email?.[0]?.toUpperCase() || 'P'
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Membro'
  const avatarUrl = user?.user_metadata?.avatar_url || ''
  const [sidebarStats, setSidebarStats] = useState({ inProgress: 0, completed: 0 })

  useEffect(() => {
    if (!supabase || !user) return
    supabase.from('lesson_progress').select('course_slug,progress_percent,completed').eq('user_id', user.id)
      .then(({ data }) => {
        if (!data) return
        const bySlug: Record<string, { progress_percent: number; completed: boolean }> = {}
        for (const row of data) { if (!bySlug[row.course_slug] || row.completed) bySlug[row.course_slug] = row }
        const rows = Object.values(bySlug)
        setSidebarStats({ inProgress: rows.filter(r => !r.completed && r.progress_percent > 0).length, completed: rows.filter(r => r.completed).length })
      })
  }, [user])

  return <>
    <button className="sidebar-toggle" onClick={() => setOpen(o => !o)} aria-label={open ? 'Fechar menu' : 'Abrir menu'}>
      <img src={img('/images/logo.png')} alt="" className="sidebar-logo-toggle"/>
    </button>
    {open && <div className="sidebar-backdrop" onClick={close} aria-hidden="true"/>}
    <aside className={`sidebar${open ? ' sidebar-open' : ''}${collapsed ? ' sidebar-collapsed' : ''}`}>
      <div className="sidebar-brand">
        <button className="sidebar-logo-btn" onClick={() => setCollapsed(c => !c)} aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}>
          <img src={img('/images/logo.png')} alt="Academia do Empreendedor" className="sidebar-logo-image"/>
        </button>
      </div>

      <p className="sidebar-section-label">VISÃO GERAL</p>
      <nav className="sidebar-nav" aria-label="Navegação principal">
        {SIDEBAR_NAV.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} onClick={close}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
              <Icon size={20}/><span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <p className="sidebar-section-label sidebar-section-label--settings">PREFERÊNCIAS</p>
      <nav className="sidebar-nav sidebar-nav--settings">
        <Link to="/perfil" className="sidebar-link" onClick={close}><Settings size={20}/><span>Configurações</span></Link>
      </nav>

      <div className="sidebar-mini-stats">
        <div className="sidebar-mini-stat">
          <BookOpen size={20} className="sidebar-mini-stat-icon"/>
          <div><strong>{sidebarStats.inProgress}</strong><span>cursos em andamento</span></div>
        </div>
        <div className="sidebar-mini-stat">
          <BarChart3 size={20} className="sidebar-mini-stat-icon sidebar-mini-stat-icon--chart"/>
          <div><strong>{sidebarStats.completed}</strong><span>aulas concluídas</span></div>
        </div>
      </div>

      <div className="sidebar-bottom">
        <Link className="sidebar-profile" to="/perfil" onClick={close}>
          <span className="avatar sidebar-avatar">
            {avatarUrl ? <img src={avatarUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}/> : initial}
          </span>
          <div className="sidebar-profile-info">
            <span className="sidebar-profile-name">{displayName}</span>
            <span className="sidebar-profile-email">{user?.email}</span>
          </div>
        </Link>
        <button className="sidebar-logout" onClick={handleLogout} aria-label="Encerrar sessão">
          <LogOut size={15}/>
        </button>
      </div>
    </aside>
  </>
}

export function Header() { return null }

export function SearchHeader() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { courses: publishedCourses } = usePublishedCourses()
  const publishedSlugs = new Set(publishedCourses.map(item => item.slug))
  const searchableAreas = [...areas.filter(item => !publishedSlugs.has(item.slug)), ...publishedCourses]
  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR')
  const matches = normalizedQuery ? searchableAreas.filter(item => `${item.title} ${item.category} ${item.author} ${item.description}`.toLocaleLowerCase('pt-BR').includes(normalizedQuery)).slice(0, 5) : []
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (matches[0]) { navigate(`/assistir/${matches[0].slug}`); setQuery(''); setOpen(false) }
  }
  return <form className="site-search" role="search" onSubmit={submit}><Search size={17}/><input aria-label="Pesquisar conteúdos" placeholder="Pesquisar cursos e conteúdos" value={query} onChange={event => { setQuery(event.target.value); setOpen(true) }} onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 140)}/>{query && <button className="search-submit" type="submit" aria-label="Abrir primeiro resultado"><ArrowRight size={16}/></button>}{open && normalizedQuery && <div className="search-results">{matches.length ? matches.map(item => <Link key={item.slug} to={`/assistir/${item.slug}`} onMouseDown={event => event.preventDefault()} onClick={() => { setQuery(''); setOpen(false) }}><span><strong>{item.title}</strong><small>{item.category} · {item.author}</small></span><ArrowRight size={15}/></Link>) : <p>Nenhum conteúdo encontrado.</p>}</div>}</form>
}

export function Footer() {
  return <footer className="site-footer"><Link className="brand" to="/"><img className="brand-logo" src={img('/images/logo.webp')} alt=""/><span className="brand-name">ACADEMIA <b>DO EMPREENDEDOR</b></span></Link><span>Aprender · Compartilhar · Crescer</span><span>© {new Date().getFullYear()} Academia do Empreendedor</span></footer>
}

type ProgressRow = { course_slug: string; progress_percent: number; completed: boolean; current_time_seconds: number; last_watched_at: string }

function formatTime(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${m}:${String(sec).padStart(2,'0')}`
}

export function ProfilePage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const handleLogout = async () => { await signOut(); navigate('/login') }
  const initial = user?.email?.[0]?.toUpperCase() || 'P'
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Membro'

  const [editingName, setEditingName] = useState(false)
  const [editingEmail, setEditingEmail] = useState(false)
  const [nameValue, setNameValue] = useState(user?.user_metadata?.full_name || '')
  const [emailValue, setEmailValue] = useState(user?.email || '')
  const [nameMsg, setNameMsg] = useState('')
  const [emailMsg, setEmailMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string>(user?.user_metadata?.avatar_url || '')
  const [coverUrl, setCoverUrl] = useState<string>(user?.user_metadata?.cover_url || '')
  const [progressRows, setProgressRows] = useState<ProgressRow[]>([])

  useEffect(() => {
    if (!supabase || !user) return
    supabase.from('lesson_progress').select('course_slug,progress_percent,completed,current_time_seconds,last_watched_at').eq('user_id', user.id).order('last_watched_at', { ascending: false }).then(({ data }) => { if (data) setProgressRows(data as ProgressRow[]) })
  }, [user])

  const [pendingCoverBlob, setPendingCoverBlob] = useState<Blob | null>(null)
  const [pendingCoverPreview, setPendingCoverPreview] = useState<string>('')
  const coverInputRef = useRef<HTMLInputElement>(null)
  const [coverCropSrc, setCoverCropSrc] = useState<string | null>(null)
  const [coverCrop, setCoverCrop] = useState({ x: 0, y: 0 })
  const [coverZoom, setCoverZoom] = useState(1)
  const [coverCroppedArea, setCoverCroppedArea] = useState<Area | null>(null)
  const onCoverCropComplete = useCallback((_: Area, areaPixels: Area) => { setCoverCroppedArea(areaPixels) }, [])

  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedArea, setCroppedArea] = useState<Area | null>(null)
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null)
  const [pendingPreview, setPendingPreview] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const onCropComplete = useCallback((_: Area, areaPixels: Area) => { setCroppedArea(areaPixels) }, [])

  const getCroppedBlob = (src: string, area: Area): Promise<Blob> =>
    new Promise(resolve => {
      const img = new Image(); img.src = src
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = area.width; canvas.height = area.height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height)
        canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.9)
      }
    })

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = () => { setCropSrc(reader.result as string); setZoom(1); setCrop({ x: 0, y: 0 }) }
    reader.readAsDataURL(file); e.target.value = ''
  }

  const onCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = () => { setCoverCropSrc(reader.result as string); setCoverZoom(1); setCoverCrop({ x: 0, y: 0 }) }
    reader.readAsDataURL(file); e.target.value = ''
  }

  const confirmCrop = async () => {
    if (!cropSrc || !croppedArea) return
    const blob = await getCroppedBlob(cropSrc, croppedArea)
    setPendingBlob(blob); setPendingPreview(URL.createObjectURL(blob)); setCropSrc(null)
  }

  const confirmCoverCrop = async () => {
    if (!coverCropSrc || !coverCroppedArea) return
    const blob = await getCroppedBlob(coverCropSrc, coverCroppedArea)
    setPendingCoverBlob(blob); setPendingCoverPreview(URL.createObjectURL(blob)); setCoverCropSrc(null)
  }

  const hasChanges = editingName || editingEmail || !!pendingBlob || !!pendingCoverBlob

  const saveAll = async () => {
    if (!supabase || saving) return
    setSaving(true)
    const metaUpdates: Record<string, string> = {}
    if (pendingBlob && user) {
      const path = `${user.id}/avatar.jpg`
      const { error } = await supabase.storage.from('avatars').upload(path, pendingBlob, { upsert: true, contentType: 'image/jpeg' })
      if (!error) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(path)
        const url = `${data.publicUrl}?t=${Date.now()}`
        metaUpdates.avatar_url = url; setAvatarUrl(url); setPendingBlob(null); setPendingPreview('')
      }
    }
    if (pendingCoverBlob && user) {
      const path = `${user.id}/cover.jpg`
      const { error } = await supabase.storage.from('avatars').upload(path, pendingCoverBlob, { upsert: true })
      if (!error) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(path)
        const url = `${data.publicUrl}?t=${Date.now()}`
        metaUpdates.cover_url = url; setCoverUrl(url); setPendingCoverBlob(null); setPendingCoverPreview('')
      }
    }
    if (Object.keys(metaUpdates).length) await supabase.auth.updateUser({ data: metaUpdates })
    if (editingName) await saveName()
    if (editingEmail) await saveEmail()
    setSaving(false)
  }

  const saveName = async () => {
    if (!supabase || saving) return
    setSaving(true); setNameMsg('')
    const { error } = await supabase.auth.updateUser({ data: { full_name: nameValue } })
    setSaving(false)
    if (error) setNameMsg('Erro ao salvar.')
    else { setNameMsg('Nome atualizado!'); setEditingName(false); setTimeout(() => setNameMsg(''), 3000) }
  }

  const saveEmail = async () => {
    if (!supabase || saving) return
    setSaving(true); setEmailMsg('')
    const { error } = await supabase.auth.updateUser({ email: emailValue })
    setSaving(false)
    if (error) setEmailMsg('Erro ao salvar.')
    else { setEmailMsg('Confirme o novo email na caixa de entrada.'); setEditingEmail(false); setTimeout(() => setEmailMsg(''), 6000) }
  }

  const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'
  const recentActivity = progressRows.slice(0, 5)
  const watchedCourses = progressRows.filter((r, i, arr) => arr.findIndex(x => x.course_slug === r.course_slug) === i)

  return <main className="profile-page-v3">
    <input ref={fileInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={onFileChange}/>
    <input ref={coverInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={onCoverChange}/>

    {cropSrc && <div className="crop-modal-overlay">
      <div className="crop-modal">
        <div className="crop-modal-header"><span>Ajustar foto</span><button className="crop-close-btn" onClick={() => setCropSrc(null)}><X size={16}/></button></div>
        <div className="crop-area"><Cropper image={cropSrc} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete}/></div>
        <div className="crop-controls"><ZoomOut size={15}/><input type="range" min={1} max={3} step={0.01} value={zoom} onChange={e => setZoom(Number(e.target.value))} className="crop-zoom-slider"/><ZoomIn size={15}/></div>
        <div className="crop-actions"><button className="button button-secondary" onClick={() => setCropSrc(null)}>Cancelar</button><button className="button" onClick={confirmCrop}>Salvar foto</button></div>
      </div>
    </div>}

    {coverCropSrc && <div className="crop-modal-overlay">
      <div className="crop-modal crop-modal--wide">
        <div className="crop-modal-header"><span>Ajustar banner</span><button className="crop-close-btn" onClick={() => setCoverCropSrc(null)}><X size={16}/></button></div>
        <div className="crop-area crop-area--wide"><Cropper image={coverCropSrc} crop={coverCrop} zoom={coverZoom} aspect={3} showGrid={false} onCropChange={setCoverCrop} onZoomChange={setCoverZoom} onCropComplete={onCoverCropComplete}/></div>
        <div className="crop-controls"><ZoomOut size={15}/><input type="range" min={1} max={3} step={0.01} value={coverZoom} onChange={e => setCoverZoom(Number(e.target.value))} className="crop-zoom-slider"/><ZoomIn size={15}/></div>
        <div className="crop-actions"><button className="button button-secondary" onClick={() => setCoverCropSrc(null)}>Cancelar</button><button className="button" onClick={confirmCoverCrop}>Aplicar banner</button></div>
      </div>
    </div>}

    <div className="pv3-identity-card">
      <div className="pv3-cover" onClick={() => coverInputRef.current?.click()} role="button" aria-label="Alterar banner" tabIndex={0}>
        {(pendingCoverPreview || coverUrl)
          ? <img src={pendingCoverPreview || coverUrl} className="pv3-cover-img" alt="" aria-hidden="true"/>
          : <div className="pv3-cover-empty"><Camera size={18}/><span>Adicionar banner</span></div>
        }
        <div className="pv3-cover-overlay"><Camera size={14}/>Alterar banner</div>
      </div>
      <div className="pv3-identity-body">
        <button className="pv3-avatar-btn" onClick={() => fileInputRef.current?.click()} aria-label="Alterar foto">
          {(pendingPreview || avatarUrl) ? <img src={pendingPreview || avatarUrl} alt="" className="pv3-avatar-img"/> : <span className="pv3-avatar-initial">{initial}</span>}
          <span className="pv3-avatar-overlay"><Camera size={14}/></span>
        </button>
        <div className="pv3-identity-info">
          <h1 className="pv3-name">{displayName}</h1>
          <p className="pv3-role">Membro da Academia do Empreendedor</p>
          <ul className="pv3-meta">
            <li><BookOpen size={13}/><span>Inscrito em {memberSince}</span></li>
            <li><Mail size={13}/><span>{user?.email}</span></li>
          </ul>
        </div>
        <button className="pv3-edit-icon-btn" onClick={() => setEditingName(v => !v)} aria-label="Editar perfil"><Pencil size={15}/></button>
      </div>
    </div>

    <div className="pv3-grid">
      <div className="pv3-col-main">
        <div className="pv3-card">
          <h2 className="pv3-section-title">As minhas formações</h2>
          {watchedCourses.length === 0
            ? <p className="pv3-empty">Ainda não iniciou nenhuma formação. <Link to="/" className="text-link">Explorar biblioteca</Link></p>
            : <ul className="pv3-formations-list">
                {watchedCourses.map(row => {
                  const course = areas.find(a => a.slug === row.course_slug)
                  if (!course) return null
                  const Icon = course.Icon
                  const pct = Math.round(row.progress_percent)
                  return <li key={row.course_slug} className="pv3-formation-item">
                    <div className="pv3-formation-icon"><Icon size={20}/></div>
                    <div className="pv3-formation-info">
                      <span className="pv3-formation-title">{course.title}</span>
                      <span className="pv3-formation-cat">{course.category}</span>
                      <div className="pv3-progress-bar"><div className="pv3-progress-fill" style={{width:`${pct}%`}}/></div>
                    </div>
                    <span className={`pv3-formation-badge ${row.completed ? 'pv3-badge--done' : 'pv3-badge--progress'}`}>{row.completed ? 'Concluído' : `${pct}%`}</span>
                    <Link to={`/assistir/${row.course_slug}`} className="pv3-formation-arrow"><ChevronRight size={16}/></Link>
                  </li>
                })}
              </ul>
          }
        </div>

        {recentActivity.length > 0 && <div className="pv3-card">
          <h2 className="pv3-section-title">Actividade recente</h2>
          <ul className="pv3-activity-list">
            {recentActivity.map((row, i) => {
              const course = areas.find(a => a.slug === row.course_slug)
              const date = new Date(row.last_watched_at)
              const today = new Date(); const diff = Math.floor((today.getTime() - date.getTime()) / 86400000)
              const dateLabel = diff === 0 ? 'Hoje' : diff === 1 ? 'Ontem' : `${diff} dias atrás`
              return <li key={i} className="pv3-activity-item">
                <div className="pv3-activity-icon"><Play size={13}/></div>
                <div className="pv3-activity-info">
                  <span className="pv3-activity-title">{course?.title ?? row.course_slug}</span>
                  <span className="pv3-activity-sub"><Clock size={11}/>{formatTime(row.current_time_seconds)} assistidos</span>
                </div>
                <span className="pv3-activity-date">{dateLabel}</span>
                <ChevronRight size={14} className="pv3-activity-arrow"/>
              </li>
            })}
          </ul>
        </div>}
      </div>

      <div className="pv3-col-side">
        <div className="pv3-card">
          <p className="eyebrow" style={{margin:'0 0 16px'}}>INFORMAÇÕES DA CONTA</p>
          <div className="pv3-field">
            <div className="pv3-field-header"><span className="field-label">Nome</span>{!editingName && <button className="profile-edit-btn" onClick={() => setEditingName(true)}><Pencil size={12}/>Editar</button>}</div>
            {editingName
              ? <div className="profile-field-edit">
                  <input className="profile-input" value={nameValue} onChange={e => setNameValue(e.target.value)} autoFocus onKeyDown={e => { if (e.key === 'Enter') void saveName(); if (e.key === 'Escape') setEditingName(false) }}/>
                  <button className="profile-action-btn profile-action-btn--save" onClick={() => void saveName()} disabled={saving}><Check size={13}/></button>
                  <button className="profile-action-btn profile-action-btn--cancel" onClick={() => { setEditingName(false); setNameValue(user?.user_metadata?.full_name || '') }}><X size={13}/></button>
                </div>
              : <strong>{user?.user_metadata?.full_name || 'Nome não definido'}</strong>
            }
            {nameMsg && <span className="profile-field-msg">{nameMsg}</span>}
          </div>
          <div className="pv3-field">
            <div className="pv3-field-header"><span className="field-label">Email</span>{!editingEmail && <button className="profile-edit-btn" onClick={() => setEditingEmail(true)}><Pencil size={12}/>Editar</button>}</div>
            {editingEmail
              ? <div className="profile-field-edit">
                  <input className="profile-input" type="email" value={emailValue} onChange={e => setEmailValue(e.target.value)} autoFocus onKeyDown={e => { if (e.key === 'Enter') void saveEmail(); if (e.key === 'Escape') setEditingEmail(false) }}/>
                  <button className="profile-action-btn profile-action-btn--save" onClick={() => void saveEmail()} disabled={saving}><Check size={13}/></button>
                  <button className="profile-action-btn profile-action-btn--cancel" onClick={() => { setEditingEmail(false); setEmailValue(user?.email || '') }}><X size={13}/></button>
                </div>
              : <strong>{user?.email}</strong>
            }
            {emailMsg && <span className="profile-field-msg">{emailMsg}</span>}
          </div>
          <div className="pv3-field">
            <span className="field-label">Conta criada</span>
            <strong>{memberSince}</strong>
          </div>
          {hasChanges && <button className="button pv3-save-btn" onClick={saveAll} disabled={saving}><Check size={14}/>{saving ? 'A salvar...' : 'Salvar alterações'}</button>}
        </div>

        <div className="pv3-card pv3-access-card">
          <BookOpen size={20} className="pv3-access-icon"/>
          <h3>Acesso Academia</h3>
          <p>A sua conta dá acesso exclusivo à área privada da Academia do Empreendedor.</p>
          <button className="button button-secondary pv3-logout-btn" onClick={handleLogout}><LogOut size={14}/>Terminar sessão</button>
        </div>
      </div>
    </div>
  </main>
}
