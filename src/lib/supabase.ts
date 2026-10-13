import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

function getSupabaseBaseUrl(value: string | undefined) {
  if (!value) return null
  try {
    const parsed = new URL(value.trim())
    // O SDK recebe a raiz do projeto, não um endpoint de serviço como /rest/v1.
    parsed.pathname = parsed.pathname
      .replace(/\/(?:auth|rest|storage|realtime|functions)\/v1\/?$/i, '')
      .replace(/\/+$/, '')
    parsed.search = ''
    parsed.hash = ''
    return `${parsed.origin}${parsed.pathname}`
  } catch {
    return null
  }
}

const supabaseBaseUrl = getSupabaseBaseUrl(url)
export const supabaseUrl: string = supabaseBaseUrl ?? ''
export const isSupabaseConfigured = Boolean(supabaseBaseUrl && anonKey && !supabaseBaseUrl.includes('your-project'))
export const supabase = isSupabaseConfigured ? createClient(supabaseBaseUrl!, anonKey!.trim()) : null
// Sessão separada para o painel: autenticar ou sair do admin não altera a sessão dos alunos.
export const adminSupabase = isSupabaseConfigured ? createClient(supabaseBaseUrl!, anonKey!.trim(), {
  auth: { storageKey: 'academia-admin-auth' },
}) : null
