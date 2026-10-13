const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com', 'youtu.be', 'www.youtu.be'])

export function getYouTubeVideoId(videoUrl?: string) {
  if (!videoUrl) return null
  try {
    const url = new URL(videoUrl)
    if (!YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) return null
    const shortLinkId = url.hostname.includes('youtu.be') ? url.pathname.split('/').filter(Boolean)[0] : null
    const pathVideoId = url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1]
    const videoId = shortLinkId ?? url.searchParams.get('v') ?? pathVideoId
    return videoId && /^[\w-]{11}$/.test(videoId) ? videoId : null
  } catch {
    return null
  }
}
