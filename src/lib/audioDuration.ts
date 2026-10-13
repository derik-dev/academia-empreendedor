export function formatAudioDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return ''

  const totalMinutes = Math.max(1, Math.round(seconds / 60))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours > 0 ? `${hours} h ${String(minutes).padStart(2, '0')} min` : `${totalMinutes} min`
}

export function readAudioDuration(file: File): Promise<number> {
  return new Promise(resolve => {
    const objectUrl = URL.createObjectURL(file)
    const audio = new Audio()
    const cleanup = () => {
      audio.onloadedmetadata = null
      audio.onerror = null
      URL.revokeObjectURL(objectUrl)
    }
    audio.preload = 'metadata'
    audio.onloadedmetadata = () => {
      const duration = audio.duration
      cleanup()
      resolve(Number.isFinite(duration) && duration > 0 ? duration : 0)
    }
    audio.onerror = () => {
      cleanup()
      resolve(0)
    }
    audio.src = objectUrl
  })
}
