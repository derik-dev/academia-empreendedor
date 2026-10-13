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

  // Detecta exclusão ou suspensão de conta pelo admin em até 30 segundos
  useEffect(() => {
    if (!supabase || !session) return
    const validate = async () => {
      try {
        const { error } = await supabase!.auth.getUser()
        if (error) await supabase!.auth.signOut({ scope: 'local' })
      } catch { /* rede indisponível — não deslogar */ }
    }
    const id = window.setInterval(validate, 30_000)
    return () => window.clearInterval(id)
  }, [session])
  const signIn = async (identifier: string, password: string) => {
    if (!supabase) return 'O Supabase ainda não está configurado. Preencha as variáveis do arquivo .env.'
    const normalizedIdentifier = identifier.trim().toLowerCase()
    const email = normalizedIdentifier === 'ericeenio' ? 'ericeenio@gmail.com' : normalizedIdentifier
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error) return null
    if (error.code === 'invalid_credentials' || error.code === 'user_not_found') return 'Usuário, e-mail ou senha incorretos.'
    if (error.code === 'email_not_confirmed') return 'Confirme seu endereço de e-mail antes de entrar.'
    return 'Não foi possível entrar. Verifique seus dados e tente novamente.'
  }
  const signOut = async () => { if (supabase) await supabase.auth.signOut() }
  return <AuthContext.Provider value={{ user: session?.user ?? null, loading, configured: isSupabaseConfigured, signIn, signOut }}>{children}</AuthContext.Provider>
}
