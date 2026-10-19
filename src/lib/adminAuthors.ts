const professorPhotos: Record<string, string> = {
  'enio mota': '/images/professores/enio.png',
  'eric pereira': '/images/professores/eric-pereira.png',
  'eric': '/images/professores/eric-pereira.png',
}

const authorCardCovers: Record<string, string> = {
  'eric pereira': '/images/cards-provisorios/eric.png',
  'eric': '/images/cards-provisorios/eric.png',
  'enio mota': '/images/cards-provisorios/enio.png',
}

function normalize(name: string) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim()
}

export function getProfessorPhoto(name: string): string | undefined {
  const n = normalize(name)
  return professorPhotos[n] ?? Object.entries(professorPhotos).find(([k]) => n.includes(k))?.[1]
}

export function getAuthorCardCover(name: string): string | undefined {
  const n = normalize(name)
  return authorCardCovers[n] ?? Object.entries(authorCardCovers).find(([k]) => n.includes(k))?.[1]
}
