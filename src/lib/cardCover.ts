import { img } from './publicUrl'

const DEFAULT = '/images/cards-provisorios/eric.png'

export function cardCover(imagePath?: string | null): string {
  if (!imagePath) return img(DEFAULT)
  // só aceita caminhos de imagem reais (começa com / ou protocolo http/https)
  if (imagePath.startsWith('/') || /^https?:\/\//i.test(imagePath)) return img(imagePath)
  return img(DEFAULT)
}
