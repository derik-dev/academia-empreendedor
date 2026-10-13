import { describe, expect, it } from 'vitest'
import { formatAudioDuration } from './audioDuration'

describe('formatAudioDuration', () => {
  it('formata minutos inteiros', () => {
    expect(formatAudioDuration(45 * 60)).toBe('45 min')
  })

  it('formata horas e minutos com dois dígitos', () => {
    expect(formatAudioDuration(65 * 60)).toBe('1 h 05 min')
  })

  it('arredonda para o minuto mais próximo e ignora durações inválidas', () => {
    expect(formatAudioDuration(89)).toBe('1 min')
    expect(formatAudioDuration(Number.NaN)).toBe('')
    expect(formatAudioDuration(Number.POSITIVE_INFINITY)).toBe('')
  })
})
