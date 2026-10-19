import { useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { AuthContext } from './AuthContext'

export type AuthValue = { user: User | null; loading: boolean; configured: boolean; signIn: (identifier: string, password: string) => Promise<string | null>; signOut: () => Promise<void> }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); setLoading(false) })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!supabase || !session) return
    const validate = async () => {
      try {
        const { error } = await supabase!.auth.getUser()
        if (error) {
          // 403 = servidor recusou mas token pode ser válido (ex: rate limit); 401 = sessão inválida de facto
          const status = (error as { status?: number }).status
          if (status !== 403) await supabase!.auth.signOut({ scope: 'local' })
        }
      } catch { /* rede indisponível — não deslogar */ }
    }
    const id = window.setInterval(validate, 300_000)
    const onVisible = () => { if (document.visibilityState === 'visible') void validate() }
    const onFocus = () => void validate()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
    }
  }, [session])
  const signIn = async (identifier: string, password: string) => {
    if (!supabase) return 'O Supabase ainda não está configurado. Preencha as variáveis do arquivo .env.'
    const email = identifier.trim().toLowerCase()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error) return null
    if (error.code === 'invalid_credentials' || error.code === 'user_not_found') return 'Utilizador, e-mail ou palavra-passe incorretos.'
    if (error.code === 'email_not_confirmed') return 'Confirme o seu endereço de e-mail antes de entrar.'
    return 'Não foi possível entrar. Verifique os seus dados e tente novamente.'
  }
  const signOut = async () => { if (supabase) await supabase.auth.signOut() }
  return <AuthContext.Provider value={{ user: session?.user ?? null, loading, configured: isSupabaseConfigured, signIn, signOut }}>{children}</AuthContext.Provider>
}
