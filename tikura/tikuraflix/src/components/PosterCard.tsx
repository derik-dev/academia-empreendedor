"use client";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { IconPlay, IconPlus, IconCheck, IconInfo, IconLock } from "./Icons";
import { toggleFavorite } from "@/app/actions";

export type CardCourse = {
  id: number;
  slug: string;
  title: string;
  cover: string;
  kind: string;
  kindLabel: string;
  tags: string;
  trailer: string;
  status: string;
};

export default function PosterCard({
  c,
  rank,
  locked,
  loggedIn,
  fav: favInit,
  priority,
}: {
  c: CardCourse;
  rank?: number;
  locked: boolean;
  loggedIn: boolean;
  fav: boolean;
  priority?: boolean;
}) {
  const [trailer, setTrailer] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [fav, setFav] = useState(favInit);
  const [, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const href = `/imersao/${c.slug}`;

  const enter = () => {
    if (!c.trailer || !window.matchMedia("(hover:hover) and (pointer:fine)").matches) return;
    timer.current = setTimeout(() => {
      setMounted(true);
      setTrailer(true);
    }, 650);
  };
  const leave = () => {
    if (timer.current) clearTimeout(timer.current);
    setTrailer(false);
    setTimeout(() => setMounted(false), 650);
  };

  const card = (
    <div className={`card${trailer ? " trailer" : ""}`} onMouseEnter={enter} onMouseLeave={leave} onFocus={enter} onBlur={leave}>
      <div className="card-frame">
      {rank ? <span className="rank" aria-hidden>{rank}</span> : null}
      <Link href={href} aria-label={c.title} className="card-media" style={{ display: "block" }} draggable={false}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={c.cover.replace(/\.webp$/, "-thumb.webp")}
          alt={c.title}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          width={420}
          height={525}
          draggable={false}
        />
        {mounted && c.trailer && (
          <iframe
            title={`Trailer ${c.title}`}
            tabIndex={-1}
            allow="autoplay; encrypted-media"
            referrerPolicy="strict-origin-when-cross-origin"
            src={`https://www.youtube-nocookie.com/embed/${c.trailer}?autoplay=1&mute=1&controls=0&loop=1&playlist=${c.trailer}&rel=0&modestbranding=1&playsinline=1&disablekb=1`}
          />
        )}
      </Link>
      {c.status === "em-breve" && <span className="badge-soon">Em breve</span>}
      {locked && c.status !== "em-breve" && <span className="badge-lock" title="Conteúdo para assinantes"><IconLock /></span>}
      <div className="card-info">
        <div className="kind">{c.kindLabel}</div>
        <div className="tg">{c.tags}</div>
        <div className="card-actions">
          <Link href={href} className="round play" aria-label={`Abrir ${c.title}`}><IconPlay size={16} /></Link>
          {loggedIn ? (
            <button
              className="round"
              aria-label={fav ? "Remover da minha lista" : "Adicionar à minha lista"}
              onClick={() => {
                setFav(!fav);
                start(async () => {
                  const r = await toggleFavorite(c.id);
                  if (r.ok && typeof r.fav === "boolean") setFav(r.fav);
                });
              }}
            >
              {fav ? <IconCheck size={17} /> : <IconPlus size={17} />}
            </button>
          ) : (
            <Link href="/entrar" className="round" aria-label="Entrar para salvar na minha lista"><IconPlus size={17} /></Link>
          )}
          <Link href={href} className="round" aria-label={`Detalhes de ${c.title}`} style={{ marginLeft: "auto" }}><IconInfo size={17} /></Link>
        </div>
      </div>
      </div>
      {/* Legenda sempre visível (desktop e celular): tipo + temas do curso */}
      <Link href={href} className="card-caption" tabIndex={-1} aria-hidden="true">
        <span className="cc-kind">{c.kindLabel}</span>
        <span className="cc-tags">{c.tags.split("•").map((t) => t.trim()).filter(Boolean).join(" · ")}</span>
      </Link>
    </div>
  );
  return card;
}
