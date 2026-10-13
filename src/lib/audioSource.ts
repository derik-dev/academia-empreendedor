export type AudioSource =
  | { kind: 'host'; url: string }
  | { kind: 'supabase'; path: string }

export const MAX_AUDIO_BYTES = 150 * 1024 * 1024

export function buildMediaUrl(path: string, mediaBaseUrl = import.meta.env.VITE_MEDIA_BASE_URL): string {
  const relativePath = path.trim()
  if (!mediaBaseUrl) throw new Error('VITE_MEDIA_BASE_URL não está configurada.')
  if (!relativePath || relativePath.startsWith('/') || relativePath.includes('\\') || relativePath.split('/').some(part => part === '..' || part === '.')) {
    throw new Error('O caminho do áudio não é válido.')
  }

  const baseUrl = mediaBaseUrl.endsWith('/') ? mediaBaseUrl : `${mediaBaseUrl}/`
  const encodedPath = relativePath.split('/').map(encodeURIComponent).join('/')
  return new URL(encodedPath, baseUrl).toString()
}

export function resolveAudioSource(audioPath: string | null | undefined, mediaBaseUrl?: string): AudioSource | null {
  const path = audioPath?.trim()
  if (!path) return null
  if (!path.startsWith('host:')) return { kind: 'supabase', path }
  const baseUrl = mediaBaseUrl ?? import.meta.env.VITE_MEDIA_BASE_URL
  return { kind: 'host', url: baseUrl ? buildMediaUrl(path.slice('host:'.length), baseUrl) : '' }
}
