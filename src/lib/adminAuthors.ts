const professorPhotos: Record<string, string> = {
  'enio mota': '/images/professores/enio.png',
  'eric pereira': '/images/professores/eric-pereira.png',
  'eric': '/images/professores/eric-pereira.png',
}

export function getProfessorPhoto(name: string): string | undefined {
  const normalizedName = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim()
  const exactMatch = professorPhotos[normalizedName]
  if (exactMatch) return exactMatch

  return Object.entries(professorPhotos).find(([author]) => normalizedName.includes(author))?.[1]
}
