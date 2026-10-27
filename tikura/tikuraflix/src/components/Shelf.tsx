"use client";
import { useRef } from "react";
import PosterCard, { type CardCourse } from "./PosterCard";
import { IconChevL, IconChevR } from "./Icons";

export default function Shelf({
  id,
  title,
  subtitle,
  style,
  items,
  lockedIds,
  favIds,
  loggedIn,
  priority,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  style: string;
  items: CardCourse[];
  lockedIds: number[];
  favIds: number[];
  loggedIn: boolean;
  priority?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };
  return (
    <section className={`shelf${style === "top10" ? " top10" : ""}`} id={id} aria-label={title}>
      <div className="shelf-head">
        <h3>{title}</h3>
        {subtitle ? <p>{subtitle}</p> : null}
        <div className="shelf-divider" aria-hidden="true">
          <span />
          <svg viewBox="0 0 160 32" fill="none">
            <path d="M4 16h30c12 0 14-12 25-12 8 0 12 8 6 12-5 3-10-1-7-5M156 16h-30c-12 0-14-12-25-12-8 0-12 8-6 12 5 3 10-1 7-5M20 16c16 0 18 12 31 12 10 0 15-6 20-12M140 16c-16 0-18 12-31 12-10 0-15-6-20-12" />
            <path d="m80 5 7 11-7 11-7-11Z" />
            <circle cx="80" cy="16" r="2" />
          </svg>
          <span />
        </div>
      </div>
      <button className="arrow l" onClick={() => scroll(-1)} aria-label="Anterior"><IconChevL /></button>
      <div className="scroller" ref={ref}>
        {items.map((c, i) => (
          <PosterCard
            key={c.id}
            c={c}
            rank={style === "top10" ? i + 1 : undefined}
            locked={lockedIds.includes(c.id)}
            fav={favIds.includes(c.id)}
            loggedIn={loggedIn}
            priority={priority && i < 6}
          />
        ))}
      </div>
      <button className="arrow r" onClick={() => scroll(1)} aria-label="Próximo"><IconChevR /></button>
    </section>
  );
}
