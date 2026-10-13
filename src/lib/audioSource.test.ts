import { describe, expect, it } from 'vitest'
import { buildMediaUrl, resolveAudioSource } from './audioSource'

describe('resolveAudioSource', () => {
  it('resolve caminhos host como URLs públicas relativas à base de mídia', () => {
    expect(resolveAudioSource('host:podcasts/2026/10/abc-episodio.mp3', 'https://netpubli.com.br/media-academia/'))
      .toEqual({ kind: 'host', url: 'https://netpubli.com.br/media-academia/podcasts/2026/10/abc-episodio.mp3' })
  })

  it('mantém caminhos antigos como objetos do Supabase', () => {
    expect(resolveAudioSource('admin/audio-antigo.mp3', 'https://netpubli.com.br/media-academia/'))
      .toEqual({ kind: 'supabase', path: 'admin/audio-antigo.mp3' })
  })

  it('devolve null quando não existe caminho', () => {
    expect(resolveAudioSource(null, 'https://netpubli.com.br/media-academia/')).toBeNull()
  })
})

describe('buildMediaUrl', () => {
  it('normaliza a barra final e codifica segmentos do caminho', () => {
    expect(buildMediaUrl('podcasts/2026/10/episodio 1.mp3', 'https://netpubli.com.br/media-academia'))
      .toBe('https://netpubli.com.br/media-academia/podcasts/2026/10/episodio%201.mp3')
  })

  it('rejeita caminhos que possam sair da pasta pública', () => {
    expect(() => buildMediaUrl('../privado.mp3', 'https://netpubli.com.br/media-academia/')).toThrow('O caminho do áudio não é válido.')
  })
})
