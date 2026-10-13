import { createClient } from 'npm:@supabase/supabase-js@2'

const allowedOrigins = new Set([
  'https://empreendedorsemdor.com',
  'https://www.empreendedorsemdor.com',
  'https://netpubli.com.br',
  'https://www.netpubli.com.br',
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

function extractPlaylistId(url: string): string | null {
  try {
    return new URL(url.trim()).searchParams.get('list')
  } catch {
    return null
  }
}

function parseDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!m) return 0
  return (parseInt(m[1] || '0') * 3600) + (parseInt(m[2] || '0') * 60) + parseInt(m[3] || '0')
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
  const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY')

  if (!token || !supabaseUrl || !anonKey) return respond(401, { error: 'Entre no painel administrativo para usar esta função.' }, origin)
  if (!youtubeApiKey) return respond(503, { error: 'API do YouTube não configurada no servidor.' }, origin)

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: authData, error: authError } = await authClient.auth.getUser(token)
  if (authError || !authData.user) return respond(401, { error: 'Sessão inválida ou expirada.' }, origin)
  const { data: isAdmin } = await authClient.rpc('is_academy_admin')
  if (isAdmin !== true) return respond(403, { error: 'Acesso restrito à equipe administrativa.' }, origin)

  let body: unknown
  try { body = JSON.parse(await req.text()) } catch { return respond(400, { error: 'JSON inválido.' }, origin) }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return respond(400, { error: 'Formato inválido.' }, origin)
  const input = body as Record<string, unknown>

  const playlistUrl = typeof input.playlist_url === 'string' ? input.playlist_url.trim() : ''
  const playlistId = extractPlaylistId(playlistUrl)
  if (!playlistId) return respond(400, { error: 'URL de playlist inválida. Use um link como youtube.com/playlist?list=...' }, origin)

  // Busca metadados da playlist (título e descrição)
  const metaRes = await fetch(`https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${youtubeApiKey}`)
  const metaData = await metaRes.json()
  if (metaData.error) return respond(400, { error: `YouTube API: ${metaData.error.message}` }, origin)
  const playlistMeta = metaData.items?.[0]?.snippet ?? null
  const playlist = playlistMeta ? { title: playlistMeta.title as string, description: (playlistMeta.description as string) || '' } : null

  // Busca todos os vídeos da playlist (até 200)
  const videoIds: string[] = []
  const titles: string[] = []
  let pageToken = ''

  for (let page = 0; page < 4; page++) {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&key=${youtubeApiKey}${pageToken ? '&pageToken=' + pageToken : ''}`
    const res = await fetch(url)
    const data = await res.json()
    if (data.error) return respond(400, { error: `YouTube API: ${data.error.message}` }, origin)
    for (const item of (data.items ?? [])) {
      const vid = item.snippet?.resourceId?.videoId
      const title = item.snippet?.title
      if (vid && title && title !== 'Deleted video' && title !== 'Private video') {
        videoIds.push(vid)
        titles.push(title)
      }
    }
    if (!data.nextPageToken) break
    pageToken = data.nextPageToken
  }

  if (!videoIds.length) return respond(404, { error: 'Nenhum vídeo encontrado na playlist.' }, origin)

  // Busca durações em lotes de 50
  const durations: Record<string, number> = {}
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50).join(',')
    const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${batch}&key=${youtubeApiKey}`
    const res = await fetch(url)
    const data = await res.json()
    for (const item of (data.items ?? [])) {
      durations[item.id] = parseDuration(item.contentDetails?.duration ?? '')
    }
  }

  const videos = videoIds.map((id, i) => ({
    videoId: id,
    title: titles[i],
    videoUrl: `https://www.youtube.com/watch?v=${id}`,
    durationSeconds: durations[id] ?? 0,
  }))

  return respond(200, { videos, playlist }, origin)
})
