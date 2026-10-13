import { describe, it, expect } from 'vitest'
import { normalizeSearch } from './normalizeSearch'

describe('normalizeSearch', () => {
  it('remove acentos — query sem acento encontra texto com acento', () => {
    expect(normalizeSearch('negocios')).toBe(normalizeSearch('negócios'))
    expect(normalizeSearch('maquina')).toBe(normalizeSearch('máquina'))
    expect(normalizeSearch('empreendedorismo')).toBe(normalizeSearch('empreendedorismo'))
  })

  it('normaliza maiúsculas', () => {
    expect(normalizeSearch('Negócios')).toBe(normalizeSearch('negócios'))
    expect(normalizeSearch('ACADEMIA')).toBe(normalizeSearch('academia'))
  })

  it('busca global sem acento encontra item com acento (simulação SearchHeader)', () => {
    const titulo = 'Máquina de Fazer Dinheiro'
    const queryComAcento = 'máquina'
    const querySemAcento = 'maquina'
    expect(normalizeSearch(titulo).includes(normalizeSearch(queryComAcento))).toBe(true)
    expect(normalizeSearch(titulo).includes(normalizeSearch(querySemAcento))).toBe(true)
  })

  it('expande abreviações comuns', () => {
    expect(normalizeSearch('pq')).toBe('porque')
    expect(normalizeSearch('vc')).toBe('voce')
    expect(normalizeSearch('tb')).toBe('tambem')
  })

  it('colapsa espaços extras e faz trim', () => {
    expect(normalizeSearch('  negócios  ')).toBe('negocios')
    expect(normalizeSearch('negócios  digitais')).toBe('negocios digitais')
  })
})
