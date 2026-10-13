export type YouTubePlayerStateCode = -1 | 0 | 1 | 2 | 3 | 5

export interface YouTubePlayerInstance {
  destroy(): void
  getCurrentTime(): number
  getDuration(): number
  getPlayerState(): YouTubePlayerStateCode
  seekTo(seconds: number, allowSeekAhead: boolean): void
  playVideo(): void
  pauseVideo(): void
  setVolume(volume: number): void
}

export interface YouTubeReadyEvent {
  target: YouTubePlayerInstance
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
  playerVars?: Record<string, number | string | boolean>
  events?: {
    onReady?: (event: YouTubeReadyEvent) => void
    onStateChange?: (event: YouTubePlayerEvent) => void
    onError?: (event: YouTubePlayerErrorEvent) => void
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
