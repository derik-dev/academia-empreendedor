"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { IconArrow, IconCheck, IconPlay } from "./Icons";

export type HeroItem = {
  id: number;
  slug: string;
  title: string;
  tagline: string;
  text: string;
  desktop: string;
  mobile: string;
  focus: string;
  kindLabel: string;
  tags: string[];
};

export default function Hero({ items, loggedIn }: { items: HeroItem[]; loggedIn: boolean }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || items.length < 2) return;
    const t = setTimeout(() => setI((v) => (v + 1) % items.length), 8000);
    return () => clearTimeout(t);
  }, [i, paused, items.length]);

  return (
    <section
      className="hero hero-art"
      aria-roledescription="carrossel"
      aria-label="Destaques"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {items.map((it, idx) => {
        const on = idx === i;
        const tab = on ? 0 : -1;
        return (
          <div key={it.id} className={`hero-slide${on ? " on" : ""}`} aria-hidden={!on}>
            <picture className="hero-photo">
              <source media="(max-width: 600px)" srcSet={it.mobile} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={it.desktop}
                alt=""
                style={{ objectPosition: it.focus }}
                fetchPriority={idx === 0 ? "high" : "auto"}
                loading={idx === 0 ? "eager" : "lazy"}
              />
            </picture>
            <div className="hero-inner">
              <div className="hero-copy">
                <span className="eyebrow">{it.kindLabel} · Tikuraflix</span>
                <h1 className="hero-title">{it.title}</h1>
                <p className={`hero-tagline${it.slug === "formacao-completa-em-taro" ? " hero-tagline-single" : ""}`}>{it.tagline}</p>
                <p className="hero-text">{it.text}</p>

                <div className="hero-panel">
                  <span>{it.kindLabel}</span>
                  <i aria-hidden />
                  <span>Com Vanessa Tikura</span>
                  <i aria-hidden />
                  <span className="hero-panel-soft"><IconPlay size={14} /> Assista no seu tempo</span>
                </div>

                <div className="hero-cta">
                  <Link href={`/imersao/${it.slug}`} className="btn btn-gold" tabIndex={tab}>
                    {loggedIn ? (<><IconPlay /> Assistir agora</>) : (<>Conhecer a formação <IconArrow /></>)}
                  </Link>
                  <a href="#acervo" className="btn btn-ghost" tabIndex={tab}>Ver todo o acervo</a>
                </div>

                {it.tags.length > 0 && (
                  <ul className="hero-checks">
                    {it.tags.map((t) => (
                      <li key={t}><IconCheck size={14} /> {t}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {items.length > 1 && (
        <>
        <button className="hero-arrow hero-arrow-prev" aria-label="Destaque anterior" onClick={() => setI((v) => (v - 1 + items.length) % items.length)}>
          <svg viewBox="0 0 24 48" fill="none" aria-hidden="true"><path d="M21 3 3 24l18 21" /></svg>
        </button>
        <button className="hero-arrow hero-arrow-next" aria-label="Próximo destaque" onClick={() => setI((v) => (v + 1) % items.length)}>
          <svg viewBox="0 0 24 48" fill="none" aria-hidden="true"><path d="m3 3 18 21L3 45" /></svg>
        </button>
        <div className={`hero-dots${paused ? " paused" : ""}`} role="tablist" aria-label="Escolher destaque">
          {items.map((it, idx) => (
            <button
              key={it.id}
              role="tab"
              aria-selected={idx === i}
              aria-label={it.title}
              className={idx === i ? "on" : ""}
              onClick={() => setI(idx)}
            />
          ))}
        </div>
        </>
      )}
    </section>
  );
}
