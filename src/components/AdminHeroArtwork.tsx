import { BookOpen, MessageCircle, Mic2, Play } from 'lucide-react'

type Variant = 'miniseries' | 'podcast' | 'interview'

const artworkConfig = {
  miniseries: { Icon: BookOpen, label: 'MINISSÉRIE', detail: 'Aulas organizadas' },
  podcast: { Icon: Mic2, label: 'PODCAST', detail: 'Episódio em destaque' },
  interview: { Icon: MessageCircle, label: 'ENTREVISTA', detail: 'Conversa em destaque' },
} satisfies Record<Variant, { Icon: typeof BookOpen; label: string; detail: string }>

export function AdminHeroArtwork({ variant }: { variant: Variant }) {
  const { Icon, label, detail } = artworkConfig[variant]

  return <div className={`admin-hero-art admin-hero-art--${variant}`} aria-hidden="true">
    <div className="admin-hero-art-glow"/>
    <div className="admin-hero-art-card admin-hero-art-card--back"/>
    <div className="admin-hero-art-card admin-hero-art-card--front">
      <div className="admin-hero-art-heading">
        <span className="admin-hero-art-icon"><Icon size={19}/></span>
        <span className="admin-hero-art-copy"><i/><i/></span>
        <span className="admin-hero-art-play"><Play size={15} fill="currentColor"/></span>
      </div>
      <span className="admin-hero-art-label">{label}</span>
      <span className="admin-hero-art-detail">{detail}</span>
      <span className="admin-hero-art-progress"><i/></span>
    </div>
  </div>
}
