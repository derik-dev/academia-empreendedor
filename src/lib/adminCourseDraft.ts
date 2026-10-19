// Tipos e estado inicial do formulário de curso/podcast do painel administrativo.
// Módulo sem dependências de React — pode ser importado em testes de node.

export type LessonDraft = {
  id: string
  title: string
  videoUrl: string
  audioPath: string
  durationSeconds: number
  position: number
  coverUrl: string
}

type DraftCategory = 'course' | 'miniseries' | 'podcast' | 'interview' | 'zoom_recording' | 'blog'
type DraftLevel = 'Iniciante' | 'Intermédio' | 'Avançado' | null

export type CourseDraft = {
  title: string
  description: string
  instructor: string
  category: DraftCategory
  videoUrl: string
  body: string
  status: 'draft' | 'published' | 'scheduled'
  scheduledFor: string
  position: string
  coverUrl: string
  file: File | null
  audioFile: File | null
  audioPath: string
  notesEnabled: boolean
  lessonCount: string
  durationText: string
  level: DraftLevel
  lessons: LessonDraft[]
  removedLessonIds: string[]
  removedLessonAudioPaths: string[]
  articleCategory: string
  blogAuthor: string
  interviewAuthor: string
  zoomType: string
  zoomCategory: string
}

export const blankDraft: CourseDraft = {
  title: '',
  description: '',
  instructor: '',
  category: 'miniseries',
  videoUrl: '',
  body: '',
  status: 'published',
  scheduledFor: '',
  position: '',
  coverUrl: '',
  file: null,
  audioFile: null,
  audioPath: '',
  notesEnabled: true,
  lessonCount: '',
  durationText: '',
  level: null,
  lessons: [],
  removedLessonIds: [],
  removedLessonAudioPaths: [],
  articleCategory: 'Mentalidade',
  blogAuthor: '',
  interviewAuthor: '',
  zoomType: 'Aula',
  zoomCategory: '',
}
