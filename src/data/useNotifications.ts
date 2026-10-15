import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const STORAGE_KEY = 'academia-notif-seen'

export type Notification = {
  id: string
  type: 'course' | 'podcast' | 'article' | 'interview'
  title: string
  description: string
  href: string
  image?: string
  publishedAt: string
  timeAgo: string
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return minutes <= 1 ? 'agora' : `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours} hora${hours > 1 ? 's' : ''}`
  const days = Math.floor(hours / 24)
  if (days < 7) return `há ${days} dia${days > 1 ? 's' : ''}`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `há ${weeks} semana${weeks > 1 ? 's' : ''}`
  const months = Math.floor(days / 30)
  return `há ${months} ${months > 1 ? 'meses' : 'mês'}`
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(!!supabase)
  const [lastSeen, setLastSeen] = useState<string>(() => localStorage.getItem(STORAGE_KEY) ?? '')

  useEffect(() => {
    let active = true
    if (!supabase) { setLoading(false); return () => { active = false } }
    const client = supabase

    Promise.all([
      client.from('courses').select('id,slug,title,cover_url,category,published_at').eq('status', 'published').order('published_at', { ascending: false }).limit(20),
      client.from('articles').select('slug,title,image_url,published_at').eq('status', 'published').order('published_at', { ascending: false }).limit(10),
      client.from('interviews').select('slug,title,cover_url,published_at').eq('status', 'published').order('published_at', { ascending: false }).limit(10),
    ]).then(([{ data: courses }, { data: articles }, { data: interviews }]) => {
      if (!active) return
      const items: Notification[] = []

      for (const c of (courses ?? [])) {
        if (!c.published_at) continue
        const isPodcast = c.category === 'podcast'
        items.push({
          id: `course-${c.id}`,
          type: isPodcast ? 'podcast' : 'course',
          title: c.title,
          description: isPodcast ? 'Novo podcast disponível' : 'Novo curso disponível',
          href: isPodcast ? `/podcasts?podcast=${encodeURIComponent(c.slug)}` : `/assistir/${c.slug}`,
          image: c.cover_url ?? undefined,
          publishedAt: c.published_at,
          timeAgo: timeAgo(c.published_at),
        })
      }

      for (const a of (articles ?? [])) {
        if (!a.published_at) continue
        items.push({
          id: `article-${a.slug}`,
          type: 'article',
          title: a.title,
          description: 'Novo artigo no blog',
          href: `/blog/${a.slug}`,
          image: a.image_url ?? undefined,
          publishedAt: a.published_at,
          timeAgo: timeAgo(a.published_at),
        })
      }

      for (const i of (interviews ?? [])) {
        if (!i.published_at) continue
        items.push({
          id: `interview-${i.slug}`,
          type: 'interview',
          title: i.title,
          description: 'Nova entrevista disponível',
          href: `/entrevistas/${i.slug}`,
          image: i.cover_url ?? undefined,
          publishedAt: i.published_at,
          timeAgo: timeAgo(i.published_at),
        })
      }

      items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      setNotifications(items.slice(0, 20))
      setLoading(false)
    })

    return () => { active = false }
  }, [])

  const unreadCount = lastSeen
    ? notifications.filter(n => new Date(n.publishedAt) > new Date(lastSeen)).length
    : notifications.length

  const markRead = useCallback(() => {
    const now = new Date().toISOString()
    localStorage.setItem(STORAGE_KEY, now)
    setLastSeen(now)
  }, [])

  return { notifications, loading, unreadCount, markRead }
}
