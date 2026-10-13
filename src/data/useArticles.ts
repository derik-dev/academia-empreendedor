import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Article } from '../types/article'
import { articleImage } from './blogImages'

export function useArticles() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(!!supabase)

  useEffect(() => {
    let active = true
    if (!supabase) return () => { active = false }
    supabase
      .from('articles')
      .select('slug,title,excerpt,category,read_time,image_url,published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .then(({ data }) => {
        if (!active) return
        setArticles((data ?? []).map(row => ({
          slug: row.slug,
          title: row.title,
          excerpt: row.excerpt ?? '',
          category: row.category,
          readTime: row.read_time,
          date: formatDate(row.published_at),
          image: articleImage(row.slug, row.image_url),
        })))
        setLoading(false)
      })
    return () => { active = false }
  }, [])

  return { articles, loading }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
