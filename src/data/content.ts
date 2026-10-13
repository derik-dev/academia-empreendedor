import { BarChart3, Brain, Mic2, Wallet, type LucideIcon } from 'lucide-react'

export type ContentArea = { slug: string; category: string; title: string; author: string; description: string; image: string; professorImage?: string; videoCount?: number; durationText?: string; lessons?: { id?: string; title: string; position: number; durationSeconds: number }[]; accent: string; Icon: LucideIcon; status: 'placeholder' | 'published'; videoUrl?: string; spotifyUrl?: string; notesEnabled?: boolean; audioPath?: string }

// As capas são imagens locais; manter apenas URLs de vídeo confirmados em courseVideoUrls.
export const areas: ContentArea[] = [
  { slug: 'literacia-financeira', category: 'Minisséries', title: 'Literacia Financeira', author: 'Com Énio Mota', description: 'As minisséries estão no YouTube. As playlists serão disponibilizadas assim que estiverem prontas.', image: '/images/literacia.png', professorImage: '/images/professores/enio.png', videoCount: 0, accent: 'blue', Icon: BarChart3, status: 'placeholder' },
  { slug: 'desenvolvimento-pessoal', category: 'Minisséries', title: 'Desenvolvimento Pessoal', author: 'Com Éric Pereira', description: 'As minisséries estão no YouTube. As playlists serão disponibilizadas assim que estiverem prontas.', image: '/images/desenvolvimento.png', professorImage: '/images/professores/eric-prerira.png', videoCount: 0, accent: 'mint', Icon: Brain, status: 'placeholder' },
  { slug: 'mente-blindada', category: 'Podcasts', title: 'Mente Blindada', author: 'Com Éric Pereira', description: 'Conversas para ajudar você a enfrentar os desafios com mais confiança.', image: '/images/cover-mente-blindada-people.png', professorImage: '/images/professores/eric-prerira.png', videoCount: 0, accent: 'violet', Icon: Mic2, status: 'placeholder', spotifyUrl: 'https://www.youtube.com/watch?v=VYZacxadyY8' },
  { slug: 'maquina-de-fazer-dinheiro', category: 'Podcasts', title: 'Máquina de Fazer Dinheiro', author: 'Com Énio Mota', description: 'Perspectivas sobre negócios, crescimento e criação de valor.', image: '/images/cover-maquina-de-fazer-dinheiro-people.png', professorImage: '/images/professores/enio.png', videoCount: 0, accent: 'amber', Icon: Wallet, status: 'placeholder' },
]

// Um único link de vídeo por curso; trocar o exemplo e completar os restantes quando os links forem fornecidos.
export const courseVideoUrls: Record<string, string> = {
  'literacia-financeira': 'https://www.youtube.com/watch?v=lDH7qc__b1c',
}

export const navItems = [
  { label: 'Início', to: '/' }, { label: 'Minisséries', to: '/minisseries' }, { label: 'Podcasts', to: '/podcasts' },
  { label: 'Entrevistas', to: '/entrevistas' }, { label: 'Blog', to: '/blog' }, { label: 'Gravações do Zoom', to: '/gravacoes-zoom' },
]
