import { useEffect, useState } from 'react'
import { BookOpen } from 'lucide-react'
import type { ContentArea } from './content'
import { supabase } from '../lib/supabase'
import { getProfessorPhoto } from '../lib/adminAuthors'

type PublishedCourseRow = {
  id: string
  slug: string
  title: string
  description: string
  cover_url: string
  instructor: string
  category: 'miniseries' | 'podcast'
  video_url: string | null
  body: string | null
  notes_enabled: boolean
  lesson_count: number | null
  duration_text: string | null
  audio_path: string | null
}
type PublishedLessonRow = { id: string; course_id: string; title: string; position: number; duration_seconds: number; audio_path: string | null }

export function usePublishedCourses() {
  const [courses, setCourses] = useState<ContentArea[]>([])
  const [loading, setLoading] = useState(!!supabase)

  useEffect(() => {
    let active = true
    if (!supabase) return () => { active = false }
    const client = supabase
    client.from('courses').select('id,slug,title,description,cover_url,instructor,category,video_url,body,notes_enabled,lesson_count,duration_text,position,audio_path').eq('status', 'published').order('position', { ascending: true, nullsFirst: false }).order('published_at', { ascending: false })
      .then(async ({ data }) => {
        if (!active) return
        if (data) {
          const courseRows = data as PublishedCourseRow[]
          const lessonsByCourse = new Map<string, PublishedLessonRow[]>()
          if (courseRows.length) {
            const { data: lessonRows } = await client.from('lessons').select('id,course_id,title,position,duration_seconds,audio_path').in('course_id', courseRows.map(course => course.id)).order('position')
            for (const lesson of (lessonRows ?? []) as PublishedLessonRow[]) {
              const courseLessons = lessonsByCourse.get(lesson.course_id) ?? []
              courseLessons.push(lesson)
              lessonsByCourse.set(lesson.course_id, courseLessons)
            }
          }
          if (!active) return
          const published = courseRows.map(course => ({
            slug: course.slug,
            category: course.category === 'podcast' ? 'Podcasts' : 'Minisséries',
            title: course.title,
            professorImage: getProfessorPhoto(course.instructor),
            author: course.instructor ? `Com ${course.instructor}` : 'Academia do Empreendedor',
            description: course.description,
            image: course.cover_url,
            accent: 'blue',
            Icon: BookOpen,
            status: 'published' as const,
            videoUrl: course.video_url ?? undefined,
            audioPath: course.audio_path ?? undefined,
            categoryTag: course.body?.trim() || undefined,
            notesEnabled: course.notes_enabled,
            videoCount: course.lesson_count ?? 0,
            durationText: course.duration_text ?? undefined,
            lessons: lessonsByCourse.get(course.id)?.map(lesson => ({ id: lesson.id, title: lesson.title, position: lesson.position, durationSeconds: lesson.duration_seconds, audioPath: lesson.audio_path ?? undefined })) ?? [],
          }))
          setCourses(published)
        }
        setLoading(false)
      })
    return () => { active = false }
  }, [])

  return { courses, loading }
}
