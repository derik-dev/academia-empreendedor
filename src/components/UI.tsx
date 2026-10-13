import { ArrowRight, Play, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ContentArea } from '../data/content'
import { cardCover } from '../lib/cardCover'

export function SectionHeading({ eyebrow, title, description, link, right }: { eyebrow: string; title: string; description?: string; link?: { label: string; to: string }; right?: React.ReactNode }) {
  return <div className="section-heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2>{description && <p className="section-description">{description}</p>}</div>{(link || right) && <div className="section-heading-actions">{right}{link && <Link className="text-link" to={link.to}>{link.label}<ArrowRight size={16} /></Link>}</div>}</div>
}

export function ButtonLink({ to, children, secondary = false }: { to: string; children: React.ReactNode; secondary?: boolean }) {
  return <Link className={`button ${secondary ? 'button-secondary' : ''}`} to={to}>{children}{!secondary && <ArrowRight size={16} />}</Link>
}

export type ContentCardProgress = {
  currentTimeSeconds: number
  durationSeconds: number
  progressPercent: number
  completed: boolean
}

function formatWatchedTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const seconds = safeSeconds % 60
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function ContentCard({ item, interactive = true, progress }: { item: ContentArea; interactive?: boolean; progress?: ContentCardProgress }) {
  const Icon = item.Icon
  const percent = progress ? Math.min(100, Math.max(0, Math.round(progress.completed ? 100 : progress.progressPercent))) : 0
  const cardContent = <>
    <div className="card-image"><img src={cardCover(item.image)} alt="" /><div className="card-image-shade" /><span className="card-category">{item.category}</span><span className="card-icon"><Icon size={19} /></span></div>
    <div className={`card-copy${progress ? ' card-copy--progress' : ''}`}>
      <h3>{item.title}</h3>
      <p className="card-author">{item.author}</p>
      {progress
        ? <div className="card-progress">
            <div className="card-progress-labels"><strong>{percent}% concluído</strong><span>{formatWatchedTime(progress.currentTimeSeconds)} de {formatWatchedTime(progress.durationSeconds)} assistidos</span></div>
            <div className="card-progress-track" role="progressbar" aria-label={`Progresso de ${item.title}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><span style={{width: `${percent}%`}}/></div>
          </div>
        : <p className="card-description">{item.description}</p>
      }
      <span className="card-cta">{progress && !progress.completed ? 'Continuar assistindo' : 'Explorar'} <ArrowRight size={15} /></span>
    </div>
  </>
  return <article className={`content-card accent-${item.accent}`}>
    {interactive ? <Link to={`/assistir/${item.slug}`} className="card-link" aria-label={`Assistir ${item.title}`}>{cardContent}</Link> : <div className="card-link">{cardContent}</div>}
  </article>
}

export function ContentRail({ items }: { items: ContentArea[] }) {
  return <div className="content-rail" role="region" aria-label="Áreas de conteúdo da Academia">
    <div className="content-track-group">{items.map(item => <ContentCard key={item.slug} item={item} />)}</div>
  </div>
}

export function EmptyState({ icon = 'sparkles', image, eyebrow, title, titleAccent, description }: { icon?: string; image?: string; eyebrow?: string; title: string; titleAccent?: string; description: string }) {
  return <div className={`empty-state${image ? ' has-image' : ''}`}>{image && <img className="empty-state-bg" src={image} alt="" aria-hidden="true" />}<div className="empty-art"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-core">{icon === 'play' ? <Play size={24} /> : <Sparkles size={23} />}</div><div className="art-card art-card-one"/><div className="art-card art-card-two"/></div>{eyebrow && <p className="empty-eyebrow"><span/> {eyebrow}</p>}<h3>{title}{titleAccent && <> <span className="empty-title-accent">{titleAccent}</span></>}</h3><p>{description}</p></div>
}

export function PageHero({ eyebrow, title, description, image, action, className }: { eyebrow: string; title: string; description: string; image?: string; action?: { label: string; to: string }; className?: string }) {
  return <section className={`page-hero${image ? ' has-image' : ''}${className ? ` ${className}` : ''}`}>{image && <img className="page-hero-image" src={image} alt="" aria-hidden="true"/>}<p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="page-hero-description">{description}</p>{action && <Link className="button page-hero-action" to={action.to}><Play size={14} fill="currentColor"/>{action.label}<ArrowRight size={16}/></Link>}</section>
}

export function PageContent({ children }: { children: React.ReactNode }) { return <main className="page-content">{children}</main> }
