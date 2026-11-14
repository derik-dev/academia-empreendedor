"use client";
import Link from "next/link";
import { useState } from "react";
import { IconArrow, IconLock, IconPlay } from "./Icons";

export type FeatureBannerItem = {
  slug: string;
  title: string;
  kindLabel: string;
  pathLabel?: string;
  eyebrow: string;
  headline: string;
  text: string;
  cta: string;
  note: string;
  tone: string;
  desktop: string;
  mobile: string;
  focus: string;
  trailer: string;
  locked: boolean;
};

/** Banner de ponta a ponta entre as fileiras: arte nítida à direita, chamada à esquerda. */
export default function FeatureBanner({ b, index }: { b: FeatureBannerItem; index: number }) {
  const [play, setPlay] = useState(false);
  const href = `/imersao/${b.slug}`;
  const lines = (s: string) => s.split("\n").map((l, i) => <span key={i}>{l}</span>);

  return (
    <section
      className={`feature-banner${index % 2 ? " fb-flip" : ""}`}
      style={{ "--fb-tone": b.tone } as React.CSSProperties}
      aria-label={`Destaque: ${b.title}`}
    >
      <div className="fb-media">
        {play && b.trailer ? (
          <iframe
            title={`Trailer ${b.title}`}
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            src={`https://www.youtube-nocookie.com/embed/${b.trailer}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
          />
        ) : (
          <picture>
            <source media="(max-width: 860px)" srcSet={b.mobile} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.desktop} alt={b.title} loading="lazy" decoding="async" style={{ objectPosition: b.focus }} />
          </picture>
        )}
      </div>

      <div className="fb-inner">
        <div className="fb-copy">
          <span className="fb-eyebrow">{b.eyebrow}</span>
          <h2 className="fb-title">{lines(b.headline)}</h2>
          <p className="fb-meta">
            <span>{b.kindLabel}</span>
            {b.pathLabel ? <span>{b.pathLabel}</span> : null}
            <span>Com Vanessa Tikura</span>
          </p>
          <p className="fb-text">{lines(b.text)}</p>
          <div className="fb-cta">
            <Link href={href} className="btn btn-gold">
              {b.locked ? (<>{b.cta} <IconArrow size={20} /></>) : (<><IconPlay size={18} /> {b.cta}</>)}
            </Link>
            {b.trailer && !play ? (
              <button type="button" className="btn btn-ghost" onClick={() => setPlay(true)}>
                <IconPlay size={16} /> Ver o trailer
              </button>
            ) : null}
          </div>
          <p className="fb-note">{b.locked ? <IconLock size={16} /> : null}{b.note}</p>
        </div>
      </div>
    </section>
  );
}
