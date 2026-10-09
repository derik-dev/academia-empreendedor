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
const requestsPerMinute = 6
const windowMs = 60_000
const requestsByUser = new Map<string, number[]>()

type Message = { role: 'system' | 'user'; content: string }

function respond(status: number, payload: Record<string, unknown>, origin?: string | null) {
  const headers = new Headers({ ...corsHeaders, 'Content-Type': 'application/json' })
  if (origin && allowedOrigins.has(origin)) headers.set('Access-Control-Allow-Origin', origin)
  return new Response(JSON.stringify(payload), { status, headers })
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  if (origin && !allowedOrigins.has(origin)) return respond(403, { error: { message: 'Origem não autorizada.' } })
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { ...corsHeaders, ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}) } })
  if (req.method !== 'POST') return respond(405, { error: { message: 'Método não permitido.' } }, origin)

  const authorization = req.headers.get('authorization')
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const publicKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
  const openAiKey = Deno.env.get('OPENAI_API_KEY')
  if (!token || !supabaseUrl || !publicKey) return respond(401, { error: { message: 'Entre no painel administrativo para usar esta função.' } }, origin)

  const authClient = createClient(supabaseUrl, publicKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: authData, error: authError } = await authClient.auth.getUser(token)
  if (authError || !authData.user) return respond(401, { error: { message: 'Sessão inválida ou expirada.' } }, origin)
  const { data: isAdmin, error: adminError } = await authClient.rpc('is_academy_admin')
  if (adminError || isAdmin !== true) return respond(403, { error: { message: 'Acesso restrito à equipe administrativa.' } }, origin)

  const now = Date.now()
  const recentRequests = (requestsByUser.get(authData.user.id) ?? []).filter(timestamp => now - timestamp < windowMs)
  if (recentRequests.length >= requestsPerMinute) return respond(429, { error: { message: 'Limite de solicitações atingido. Tente novamente em um minuto.' } }, origin)
  recentRequests.push(now)
  requestsByUser.set(authData.user.id, recentRequests)

  const declaredLength = Number(req.headers.get('content-length') ?? 0)
  if (declaredLength > 32_000) return respond(413, { error: { message: 'Solicitação muito grande.' } }, origin)
  const rawBody = await req.text()
  if (new TextEncoder().encode(rawBody).byteLength > 32_000) return respond(413, { error: { message: 'Solicitação muito grande.' } }, origin)

  let body: unknown
  try { body = JSON.parse(rawBody) } catch { return respond(400, { error: { message: 'JSON inválido.' } }, origin) }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return respond(400, { error: { message: 'Formato de solicitação inválido.' } }, origin)
  const input = body as { messages?: unknown; jsonMode?: unknown }
  if (!Array.isArray(input.messages) || input.messages.length < 1 || input.messages.length > 12) {
    return respond(400, { error: { message: 'Envie de 1 a 12 mensagens.' } }, origin)
  }
  if (input.jsonMode !== undefined && typeof input.jsonMode !== 'boolean') return respond(400, { error: { message: 'Opção de formato inválida.' } }, origin)
  const messages: Message[] = []
  let characterCount = 0
  for (const message of input.messages) {
    if (!message || typeof message !== 'object' || Array.isArray(message)) return respond(400, { error: { message: 'Mensagem inválida.' } }, origin)
    const candidate = message as { role?: unknown; content?: unknown }
    if ((candidate.role !== 'system' && candidate.role !== 'user') || typeof candidate.content !== 'string' || !candidate.content.trim()) {
      return respond(400, { error: { message: 'As mensagens devem conter apenas texto e os papéis system ou user.' } }, origin)
    }
    if (candidate.content.length > 18_000) return respond(400, { error: { message: 'Uma mensagem excede o limite de tamanho.' } }, origin)
    characterCount += candidate.content.length
    messages.push({ role: candidate.role, content: candidate.content })
  }
  if (characterCount > 28_000 || !messages.some(message => message.role === 'user')) {
    return respond(400, { error: { message: 'O conteúdo excede os limites permitidos ou não inclui uma mensagem de usuário.' } }, origin)
  }
  if (!openAiKey) return respond(503, { error: { message: 'Serviço de IA não configurado no servidor.' } }, origin)

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 3000,
        ...(input.jsonMode === true ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: AbortSignal.timeout(60_000),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) return respond(502, { error: { message: 'O serviço de IA não conseguiu concluir a solicitação.' } }, origin)
    return respond(200, data ?? { error: { message: 'Resposta inválida do serviço de IA.' } }, origin)
  } catch {
    return respond(502, { error: { message: 'Não foi possível conectar ao serviço de IA.' } }, origin)
  }
})
