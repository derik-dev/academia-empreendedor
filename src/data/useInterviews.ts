import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Interview } from '../types/interview'

export function useInterviews() {
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(!!supabase)

  useEffect(() => {
    let active = true
    if (!supabase) return () => { active = false }
    supabase
      .from('interviews')
      .select('slug,title,subtitle,guest,guest_role,author,duration,video_id,cover_url,published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .then(({ data }) => {
        if (!active) return
        setInterviews((data ?? []).map(row => ({
          slug: row.slug,
          title: row.title,
          subtitle: row.subtitle,
          guest: row.guest,
          guestRole: row.guest_role,
          author: row.author ?? '',
          duration: row.duration,
          videoId: row.video_id ?? undefined,
          thumb: row.cover_url ?? undefined,
          timeAgo: timeAgo(row.published_at),
        })))
        setLoading(false)
      })
    return () => { active = false }
  }, [])

  return { interviews, loading }
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days < 1) return 'hoje'
  if (days < 7) return `há ${days} dia${days > 1 ? 's' : ''}`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `há ${weeks} semana${weeks > 1 ? 's' : ''}`
  const months = Math.floor(days / 30)
  return `há ${months} ${months > 1 ? 'meses' : 'mês'}`
}
