export function normalizeSearch(text: string): string {
  const aliases: Record<string, string> = {
    'oque': 'o que', 'oq': 'o que',
    'pq': 'porque', 'porq': 'porque', 'por que': 'porque', 'por quê': 'porque',
    'tb': 'tambem', 'tbm': 'tambem',
    'pro': 'para o', 'pra': 'para',
    'vc': 'voce', 'vcs': 'voces',
    'q ': 'que ', 'n ': 'nao ',
    'td': 'tudo', 'tds': 'todos',
    'mt': 'muito', 'mto': 'muito',
  }
  let s = text
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  for (const [abbr, full] of Object.entries(aliases)) {
    s = s.replace(new RegExp(`\\b${abbr}\\b`, 'g'), full)
  }
  return s
}
