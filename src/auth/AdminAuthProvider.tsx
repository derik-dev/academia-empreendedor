import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { adminSupabase, isSupabaseConfigured } from '../lib/supabase'
import { AdminAuthContext } from './AdminAuthContext'

type AdminStatus = 'allowed' | 'denied'
const AUTH_CHECK_TIMEOUT_MS = 8_000

function withTimeout<T>(promise: PromiseLike<T>, fallback: T): Promise<T> {
  let timeoutId = 0
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>(resolve => { timeoutId = window.setTimeout(() => resolve(fallback), AUTH_CHECK_TIMEOUT_MS) }),
  ]).finally(() => window.clearTimeout(timeoutId))
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured)
  const [adminStatus, setAdminStatus] = useState<AdminStatus>('denied')
  const [checkedUserId, setCheckedUserId] = useState<string | null>(null)
  const sessionUserId = session?.user.id

  useEffect(() => {
    if (!adminSupabase) return

    const client = adminSupabase
    let active = true
    const syncSession = async (initial = false) => {
      try {
        const result = await withTimeout(client.auth.getSession(), null)
        if (!active) return
        if (result) setSession(result.data.session)
      } catch {
        // Uma falha temporária ao consultar a sessão não deve manter a tela bloqueada.
        if (initial && active) setSession(null)
      } finally {
        if (initial && active) setAuthLoading(false)
      }
    }
    void syncSession(true)
    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthLoading(false)
    })
    const syncWhenVisible = () => {
      if (document.visibilityState === 'visible') void syncSession()
    }
    document.addEventListener('visibilitychange', syncWhenVisible)
    window.addEventListener('focus', syncWhenVisible)
    return () => {
      active = false
      document.removeEventListener('visibilitychange', syncWhenVisible)
      window.removeEventListener('focus', syncWhenVisible)
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!adminSupabase || !sessionUserId) return

    let active = true
    const roleCheck = adminSupabase.from('admin_users').select('user_id').eq('user_id', sessionUserId).maybeSingle()
    void withTimeout(roleCheck, null).then(result => {
      if (active) {
        setAdminStatus(result && !result.error && result.data ? 'allowed' : 'denied')
        setCheckedUserId(sessionUserId)
      }
    }).catch(() => {
      if (active) {
        setAdminStatus('denied')
        setCheckedUserId(sessionUserId)
      }
    })
    return () => { active = false }
  }, [sessionUserId])

  const signIn = async (identifier: string, password: string) => {
    if (!adminSupabase) return 'O Supabase ainda não está configurado. Preencha as variáveis do arquivo .env.'
    const normalizedIdentifier = identifier.trim().toLowerCase()
    const email = normalizedIdentifier === 'ericeenio' ? 'ericeenio@gmail.com' : normalizedIdentifier
    const { data, error } = await adminSupabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) {
      if (error?.code === 'email_not_confirmed') return 'Confirme seu endereço de e-mail antes de entrar.'
      if (error?.code === 'invalid_credentials' || error?.code === 'user_not_found') return 'Usuário, e-mail ou senha incorretos.'
      return 'Não foi possível entrar. Verifique seus dados e tente novamente.'
    }

    const { data: adminRecord, error: roleError } = await adminSupabase.from('admin_users').select('user_id').eq('user_id', data.user.id).maybeSingle()
    if (roleError || !adminRecord) {
      await adminSupabase.auth.signOut()
      return 'Esta conta não está autorizada a acessar o painel administrativo.'
    }
    setAdminStatus('allowed')
    setCheckedUserId(data.user.id)
    return null
  }

  const signOut = async () => {
    if (adminSupabase) await adminSupabase.auth.signOut()
  }

  const user = session?.user ?? null
  const loading = authLoading || (user !== null && checkedUserId !== user.id)
  const isAdmin = user !== null && checkedUserId === user.id && adminStatus === 'allowed'
  return <AdminAuthContext.Provider value={{ user, loading, configured: isSupabaseConfigured, isAdmin, signIn, signOut }}>{children}</AdminAuthContext.Provider>
}
