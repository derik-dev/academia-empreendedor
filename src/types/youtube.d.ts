export type YouTubePlayerStateCode = -1 | 0 | 1 | 2 | 3 | 5

export interface YouTubePlayerInstance {
  destroy(): void
  getCurrentTime(): number
  getDuration(): number
  getPlayerState(): YouTubePlayerStateCode
  seekTo(seconds: number, allowSeekAhead: boolean): void
}

export interface YouTubePlayerEvent {
  data: YouTubePlayerStateCode
  target: YouTubePlayerInstance
}

export interface YouTubePlayerErrorEvent {
  data: number
  target: YouTubePlayerInstance
}

export interface YouTubePlayerOptions {
  videoId: string
  playerVars: {
    controls: 1
    enablejsapi: 1
    fs: 1
    origin: string
    rel: 0
    playsinline: 1
  }
  events: {
    onReady: (event: YouTubePlayerEvent) => void
    onStateChange: (event: YouTubePlayerEvent) => void
    onError: (event: YouTubePlayerErrorEvent) => void
  }
}

export interface YouTubeIframeApi {
  PlayerState: {
    ENDED: 0
    PLAYING: 1
    PAUSED: 2
    BUFFERING: 3
    CUED: 5
    UNSTARTED: -1
  }
  Player: new (target: HTMLElement, options: YouTubePlayerOptions) => YouTubePlayerInstance
}

declare global {
  interface Window {
    YT?: YouTubeIframeApi
    onYouTubeIframeAPIReady?: () => void
  }
}
