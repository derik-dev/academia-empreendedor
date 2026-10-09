import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Article } from '../types/article'
import { articleImage } from './blogImages'

export function useArticle(slug: string | undefined) {
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) { setLoading(false); return }
    let active = true
    if (!supabase) { setLoading(false); return () => { active = false } }
    supabase
      .from('articles')
      .select('slug,title,excerpt,category,read_time,image_url,published_at,content,video_url')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return
        if (data) {
          setArticle({
            slug: data.slug,
            title: data.title,
            excerpt: data.excerpt ?? '',
            category: data.category,
            readTime: data.read_time,
            date: formatDate(data.published_at),
            image: articleImage(data.slug, data.image_url),
            content: data.content ?? '',
            videoUrl: data.video_url ?? undefined,
          })
        }
        setLoading(false)
      })
    return () => { active = false }
  }, [slug])

  return { article, loading }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
