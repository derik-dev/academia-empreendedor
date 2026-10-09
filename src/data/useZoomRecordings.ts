import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type ZoomRecording = {
  id: string
  title: string
  description: string
  type: 'Aula' | 'Workshop' | 'Mentoria'
  category: string
  duration: string
  thumb: string
  videoUrl?: string
  date: string
}

export function useZoomRecordings() {
  const [recordings, setRecordings] = useState<ZoomRecording[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    if (!supabase) { setLoading(false); return () => { active = false } }
    supabase
      .from('zoom_recordings')
      .select('id,title,description,type,category,duration,thumb_url,video_url,recorded_at')
      .eq('status', 'published')
      .order('recorded_at', { ascending: false })
      .then(({ data }) => {
        if (!active) return
        setRecordings((data ?? []).map(r => ({
          id: r.id,
          title: r.title,
          description: r.description,
          type: r.type as ZoomRecording['type'],
          category: r.category,
          duration: r.duration,
          thumb: r.thumb_url,
          videoUrl: r.video_url ?? undefined,
          date: formatDate(r.recorded_at),
        })))
        setLoading(false)
      })
    return () => { active = false }
  }, [])

  return { recordings, loading }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    .replace(' de ', ' ').replace('.', '')
}
