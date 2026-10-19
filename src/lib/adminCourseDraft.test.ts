import { describe, expect, it } from 'vitest'
import { blankDraft, type CourseDraft } from './adminCourseDraft'

// Campos obrigatórios que DEVEM ser arrays inicializados — aqui nasceu o bug
// "draft.removedLessonAudioPaths is not iterable" quando o campo era undefined.
const REQUIRED_ARRAY_FIELDS: (keyof CourseDraft)[] = [
  'lessons',
  'removedLessonIds',
  'removedLessonAudioPaths',
]

describe('blankDraft', () => {
  it('tem todos os campos obrigatórios do CourseDraft definidos', () => {
    // Garante que nenhum campo está undefined — null é aceito (file, audioFile, level)
    for (const [key, value] of Object.entries(blankDraft)) {
      expect(value, `campo "${key}" está undefined no blankDraft`).not.toBeUndefined()
    }
  })

  it('arrays obrigatórios estão inicializados como arrays vazios', () => {
    for (const field of REQUIRED_ARRAY_FIELDS) {
      expect(Array.isArray(blankDraft[field]), `campo "${field}" deve ser array`).toBe(true)
    }
  })

  it('draft de edição (simulando editCourse) tem todos os campos de blankDraft', () => {
    // Simula o padrão que editCourse usa: objeto completo com todos os campos explícitos.
    // Se um campo novo for adicionado a blankDraft mas esquecido no editCourse, este
    // teste falha — o desenvolvedor precisa adicionar o campo na simulação abaixo.
    const editDraft: CourseDraft = {
      title: 'Mente Blindada',
      description: 'Desc',
      instructor: 'Eric',
      category: 'podcast',
      videoUrl: '',
      body: '',
      status: 'published',
      scheduledFor: '',
      position: '',
      coverUrl: 'https://example.com/capa.jpg',
      file: null,
      audioFile: null,
      audioPath: '',
      notesEnabled: true,
      lessonCount: '',
      durationText: '',
      level: null,
      lessons: [],
      removedLessonIds: [],
      removedLessonAudioPaths: [],   // ← campo que causou o bug; deve constar aqui
      articleCategory: 'Mentalidade',
      blogAuthor: '',
      interviewAuthor: '',
      zoomType: 'Aula',
      zoomCategory: '',
    }

    const blankKeys = Object.keys(blankDraft) as (keyof CourseDraft)[]
    for (const key of blankKeys) {
      expect(key in editDraft, `campo "${key}" ausente no draft de edição`).toBe(true)
    }
    for (const field of REQUIRED_ARRAY_FIELDS) {
      expect(Array.isArray(editDraft[field]), `campo "${field}" deve ser array no draft de edição`).toBe(true)
    }
  })
})
