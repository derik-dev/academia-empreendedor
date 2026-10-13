import { img } from '../lib/publicUrl'

const FALLBACK = '/images/cards-provisorios/eric.png'

export function articleImage(_slug: string, imageUrl: string | null): string {
  if (imageUrl) return img(imageUrl)
  return img(FALLBACK)
}
