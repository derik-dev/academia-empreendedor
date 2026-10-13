import { createClient } from 'npm:@supabase/supabase-js@2'

const allowedOrigins = new Set([
  'https://empreendedorsemdor.com',
  'https://www.empreendedorsemdor.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
])
const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
}

function respond(status: number, payload: Record<string, unknown>, origin?: string | null) {
  const headers = new Headers({ ...corsHeaders, 'Content-Type': 'application/json' })
  if (origin && allowedOrigins.has(origin)) headers.set('Access-Control-Allow-Origin', origin)
  return new Response(JSON.stringify(payload), { status, headers })
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  if (origin && !allowedOrigins.has(origin)) return respond(403, { error: 'Origem não autorizada.' })
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { ...corsHeaders, ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}) } })
  if (req.method !== 'POST') return respond(405, { error: 'Método não permitido.' }, origin)

  const authorization = req.headers.get('authorization')
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!token || !supabaseUrl || !anonKey) return respond(401, { error: 'Entre no painel administrativo para usar esta função.' }, origin)
  if (!serviceRoleKey) return respond(503, { error: 'Serviço de gestão de alunos não configurado no servidor.' }, origin)

  // Valida que o chamador é admin
  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: authData, error: authError } = await authClient.auth.getUser(token)
  if (authError || !authData.user) return respond(401, { error: 'Sessão inválida ou expirada.' }, origin)
  const { data: isAdmin } = await authClient.rpc('is_academy_admin')
  if (isAdmin !== true) return respond(403, { error: 'Acesso restrito à equipe administrativa.' }, origin)

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let body: unknown
  try { body = JSON.parse(await req.text()) } catch { return respond(400, { error: 'JSON inválido.' }, origin) }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return respond(400, { error: 'Formato inválido.' }, origin)
  const input = body as Record<string, unknown>

  if (input.action === 'invite') {
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : ''
    const name = typeof input.name === 'string' ? input.name.trim() : ''
    if (!email || !email.includes('@')) return respond(400, { error: 'E-mail inválido.' }, origin)

    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: name ? { full_name: name } : undefined,
    })
    if (error) {
      const msg = error.message?.toLowerCase() ?? ''
      if (msg.includes('already registered') || msg.includes('already been registered')) {
        return respond(409, { error: 'Já existe uma conta com este e-mail.' }, origin)
      }
      return respond(500, { error: 'Não foi possível convidar o aluno. Tente novamente.' }, origin)
    }
    if (name && data.user) {
      await adminClient.from('profiles').upsert(
        { id: data.user.id, name, email, full_name: name, created_at: data.user.created_at },
        { onConflict: 'id' }
      )
    }
    return respond(200, { ok: true, userId: data.user?.id }, origin)
  }

  if (input.action === 'create') {
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : ''
    const password = typeof input.password === 'string' ? input.password : ''
    const name = typeof input.name === 'string' ? input.name.trim() : ''
    if (!email || !email.includes('@')) return respond(400, { error: 'E-mail inválido.' }, origin)
    if (password.length < 6) return respond(400, { error: 'A senha deve ter pelo menos 6 caracteres.' }, origin)

    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: name ? { full_name: name } : undefined,
    })
    if (error) {
      const msg = error.message?.toLowerCase() ?? ''
      if (msg.includes('already registered') || msg.includes('already exists')) {
        return respond(409, { error: 'Já existe uma conta com este e-mail.' }, origin)
      }
      return respond(500, { error: 'Não foi possível criar o aluno. Tente novamente.' }, origin)
    }
    if (data.user) {
      await adminClient.from('profiles').upsert(
        { id: data.user.id, name: name || email, email, full_name: name || null, created_at: data.user.created_at },
        { onConflict: 'id' }
      )
    }
    return respond(200, { ok: true, userId: data.user?.id }, origin)
  }

  if (input.action === 'delete') {
    const userId = typeof input.userId === 'string' ? input.userId.trim() : ''
    if (!userId) return respond(400, { error: 'ID de usuário inválido.' }, origin)
    if (userId === authData.user.id) return respond(400, { error: 'Não é possível remover a própria conta pelo painel.' }, origin)
    const { error } = await adminClient.auth.admin.deleteUser(userId)
    if (error) return respond(500, { error: 'Não foi possível remover o aluno. Tente novamente.' }, origin)
    return respond(200, { ok: true }, origin)
  }

  return respond(400, { error: 'Ação inválida.' }, origin)
})
