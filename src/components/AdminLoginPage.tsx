import { useState, type FormEvent } from 'react'
import { ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../auth/useAdminAuth'
import { img } from '../lib/publicUrl'

export function AdminLoginPage() {
  const { user, loading: authLoading, isAdmin, signIn, signOut, configured } = useAdminAuth()
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (authLoading) return <div className="admin-login-loading">Verificando sessao administrativa...</div>
  if (user && isAdmin) return <main className="admin-login-screen"><section className="admin-login-card"><Link to="/admin" className="admin-brand"><img src={img('/images/logo.webp')} alt=""/><span>ACADEMIA <b>ADMIN</b></span></Link><span className="admin-login-icon"><ShieldCheck size={22}/></span><p className="eyebrow">SESSÃO ADMINISTRATIVA</p><h1>Conta de administrador conectada</h1><p className="admin-login-intro">Sessão administrativa ativa para {user.email}.</p><Link className="button admin-login-submit" to="/admin">Abrir painel <ArrowRight size={16}/></Link><button className="admin-login-switch" type="button" onClick={() => void signOut()}>Sair da conta administrativa</button><Link to="/" className="admin-login-back">Voltar à Academia</Link></section></main>

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const message = await signIn(identifier, password)
    setSubmitting(false)
    if (message) setError(message)
    else navigate('/admin', { replace: true })
  }

  return <main className="admin-login-screen">
    <section className="admin-login-card">
      <Link to="/admin/login" className="admin-brand"><img src={img('/images/logo.webp')} alt=""/><span>ACADEMIA <b>ADMIN</b></span></Link>
      <span className="admin-login-icon"><ShieldCheck size={22}/></span>
      <p className="eyebrow">ACESSO RESTRITO</p>
      <h1>Painel administrativo</h1>
      <p className="admin-login-intro">Entre com a conta autorizada para gerir os cursos da Academia.</p>
      <form onSubmit={submit}>
        <label htmlFor="admin-identifier">Usuário ou e-mail</label>
        <input id="admin-identifier" type="text" autoComplete="username" placeholder="ericeenio ou nome@empresa.com" value={identifier} onChange={event => setIdentifier(event.target.value)} required/>
        <label htmlFor="admin-password">Senha</label>
        <div className="admin-login-password"><LockKeyhole size={16}/><input id="admin-password" type="password" autoComplete="current-password" placeholder="Sua senha" value={password} onChange={event => setPassword(event.target.value)} minLength={6} required/></div>
        {error && <p className="admin-login-error" role="alert">{error}</p>}
        {!configured && <p className="admin-login-error" role="status">O Supabase ainda não está configurado neste ambiente.</p>}
        <button className="button admin-login-submit" type="submit" disabled={submitting || !configured}>{submitting ? 'Entrando...' : <>Entrar no painel <ArrowRight size={16}/></>}</button>
      </form>
      <Link to="/" className="admin-login-back">Voltar ao site da Academia</Link>
    </section>
  </main>
}
