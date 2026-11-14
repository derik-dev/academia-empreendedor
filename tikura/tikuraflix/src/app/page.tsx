import Link from "next/link";
import { Fragment } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Hero, { type HeroItem } from "@/components/Hero";
import Shelf from "@/components/Shelf";
import Reveal from "@/components/Reveal";
import FeatureBanner, { type FeatureBannerItem } from "@/components/FeatureBanner";
import { IconArrow, IconCheck, IconLock, IconPlay, IconDoc, IconMusic, IconUsers } from "@/components/Icons";
import { getUser } from "@/lib/auth";
import { getCourseBySlug, getFavoriteIds, getSettings, getShelves, type Course } from "@/lib/data";
import { lockedIdsFor, splitTags, toCard } from "@/lib/catalog";
import { rows } from "@/lib/db";
import { KINDS, PATHS, type Kind } from "@/data/seed";
import { HERO_ART } from "@/data/hero";
import { FEATURE_BANNERS } from "@/data/banners";
import { waLink } from "@/lib/util";

export const dynamic = "force-dynamic";

// Perguntas e respostas iguais às do site oficial (https://www.tikura.com.br/tikuraflix/).
const FAQ = [
  ["O que está incluso na assinatura?", "Acesso a todas as imersões e aos novos conteúdos lançados enquanto a sua assinatura estiver ativa."],
  ["Por quanto tempo terei acesso?", "Por 12 meses, com possibilidade de renovação anual."],
  ["Posso assistir pelo celular?", "Sim. Você assiste de qualquer dispositivo conectado à internet."],
  ["Há conteúdos novos com frequência?", "Sim. Novas imersões e formações são adicionadas todos os meses."],
];

export default async function Home() {
  const [user, settings, shelves, heroCourses] = await Promise.all([
    getUser(),
    getSettings(),
    getShelves(),
    Promise.all(HERO_ART.map((a) => getCourseBySlug(a.slug))),
  ]);
  const allCourses = [...new Map(shelves.flatMap((s) => s.courses).map((c) => [c.id, c])).values()];
  const [lockedIds, favSet, counts] = await Promise.all([
    lockedIdsFor(user, allCourses),
    user ? getFavoriteIds(user.id) : Promise.resolve(new Set<number>()),
    rows<{ imersoes: number; pdfs: number; audios: number }>(
      `SELECT (SELECT COUNT(*) FROM courses WHERE access='assinatura' AND status!='rascunho') AS imersoes,
              (SELECT COUNT(*) FROM materials WHERE kind='pdf') AS pdfs,
              (SELECT COUNT(*) FROM materials WHERE kind='audio') AS audios`,
    ),
  ]);
  const favIds = [...favSet];
  const n = counts[0];

  // Continuar assistindo (só para quem está logado e já começou alguma aula) — mesma regra da Minha área.
  type Cont = Course & { lesson_id: number; lesson_title: string; done_count: number; total: number };
  const cont = user
    ? await rows<Cont>(
        `SELECT c.*, p.lesson_id, l.title AS lesson_title,
           (SELECT COUNT(*) FROM progress p2 JOIN lessons l2 ON l2.id=p2.lesson_id WHERE p2.user_id=? AND l2.course_id=c.id AND p2.done=1) AS done_count,
           (SELECT COUNT(*) FROM lessons l3 WHERE l3.course_id=c.id) AS total
         FROM progress p JOIN lessons l ON l.id=p.lesson_id JOIN courses c ON c.id=l.course_id
         WHERE p.user_id=? AND c.status!='rascunho' AND p.updated_at = (
           SELECT MAX(p4.updated_at) FROM progress p4 JOIN lessons l4 ON l4.id=p4.lesson_id WHERE p4.user_id=? AND l4.course_id=c.id)
         ORDER BY p.updated_at DESC LIMIT 12`,
        [user.id, user.id, user.id],
      )
    : [];

  // Banners full entre as fileiras (src/data/banners.ts): só cursos publicados que estão no acervo.
  const bannersByShelf = new Map<string, FeatureBannerItem[]>();
  for (const b of FEATURE_BANNERS) {
    const c = allCourses.find((x) => x.slug === b.slug);
    if (!c || c.status === "rascunho") continue;
    const item: FeatureBannerItem = {
      slug: c.slug,
      title: c.title,
      kindLabel: KINDS[c.kind as Kind] ?? c.kind,
      pathLabel: PATHS[c.path as keyof typeof PATHS]?.label,
      eyebrow: b.eyebrow,
      headline: b.headline,
      text: b.text,
      cta: b.cta,
      note: b.note,
      tone: b.tone,
      desktop: b.desktop ?? c.cover,
      mobile: b.mobile ?? b.desktop ?? c.cover,
      focus: b.focus ?? "center",
      trailer: c.trailer,
      locked: lockedIds.includes(c.id),
    };
    bannersByShelf.set(b.afterShelf, [...(bannersByShelf.get(b.afterShelf) ?? []), item]);
  }
  let bannerIndex = 0;

  // Hero: só cursos que existem no acervo e estão publicados.
  const heroItems: HeroItem[] = HERO_ART.flatMap((a, idx) => {
    const c = heroCourses[idx];
    if (!c || c.status === "rascunho") return [];
    return [{
      id: c.id,
      slug: c.slug,
      title: c.title,
      tagline: a.tagline,
      text: a.text,
      desktop: a.desktop,
      mobile: a.mobile,
      focus: a.focus ?? "center",
      kindLabel: KINDS[c.kind as Kind] ?? c.kind,
      tags: splitTags(c.tags).slice(0, 3),
    }];
  });

  const pathAnchors = Object.entries(PATHS)
    .map(([k, v]) => ({ k, label: v.label, shelf: shelves.find((s) => s.title === v.label) }))
    .filter((p) => p.shelf);

  return (
    <>
      <Header />
      <main>
        {heroItems.length > 0 && <Hero items={heroItems} loggedIn={!!user} />}

        <div className="strip" aria-label="Em números">
          <div><strong className="gold-text">{n.imersoes}</strong><span>imersões, rodas e aulões</span></div>
          <div><strong className="gold-text">30+</strong><span>apostilas em PDF</span></div>
          <div><strong className="gold-text">{settings.students_count}</strong><span>alunos já passaram por aqui</span></div>
          <div><strong className="gold-text">{settings.plan_months} meses</strong><span>de acesso, em qualquer tela</span></div>
        </div>

        {cont.length > 0 && (
          <section className="shelf continue-shelf" aria-label="Continuar assistindo">
            <div className="shelf-head"><h3>Continuar assistindo</h3></div>
            <div className="scroller">
              {cont.map((c) => {
                const pct = c.total ? Math.round((c.done_count / c.total) * 100) : 0;
                return (
                  <Link key={c.id} href={`/assistir/${c.slug}?aula=${c.lesson_id}`} className="progress-card continue-card">
                    <div className="card" style={{ width: "100%" }}>
                      <div className="card-media">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={c.cover.replace(/\.webp$/, "-thumb.webp")} alt={c.title} loading="lazy" />
                      </div>
                    </div>
                    <div className="bar" aria-label={`${pct}% concluído`}><i style={{ width: `${pct}%` }} /></div>
                    <span className="continue-meta"><strong>{c.title}</strong>{c.lesson_title} · {pct}%</span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <div id="acervo">
          {shelves.map((s, idx) => s.style === "top10" ? null : (
            <Fragment key={s.id}>
              {s.title === PATHS.taro.label && (
                <section className="section" id="caminhos" aria-labelledby="caminhos-title">
                  <div className="section-head">
                    <h2 className="display" id="caminhos-title">Qual caminho te chama?</h2>
                  </div>
                  <div className="paths">
                    {pathAnchors.map((p) => (
                      <a key={p.k} className="path-chip" href={`#fileira-${p.shelf!.id}`}>{p.label}<small>{p.shelf!.courses.length}</small></a>
                    ))}
                  </div>
                </section>
              )}
            <Shelf
              key={s.id}
              id={`fileira-${s.id}`}
              title={s.title}
              subtitle={s.subtitle}
              style={s.style}
              items={s.courses.map(toCard)}
              lockedIds={lockedIds}
              favIds={favIds}
              loggedIn={!!user}
              priority={idx < 2}
            />
            {(bannersByShelf.get(s.title) ?? []).map((b) => (
              <FeatureBanner key={`fb-${b.slug}`} b={b} index={bannerIndex++} />
            ))}
            </Fragment>
          ))}
        </div>

        <Reveal className="brand-band">
          <div className="brand-copy">
            <span className="eyebrow">Quem conduz</span>
            <h2 className="display">Vanessa <span className="gold-text">Tikura</span></h2>
            <p>Benzedeira, doula, terapeuta holística e oraculista. Há mais de {settings.years_count} anos ela transforma saberes ancestrais em caminhos práticos para quem quer cuidar de si e dos outros.</p>
            <p>No Tikuraflix, cada imersão é uma porta de entrada: você aprende no seu tempo, revê quando quiser e segue no seu caminho com apoio.</p>
            <div className="brand-facts">
              <div><strong className="gold-text">+{settings.students_count}</strong><span>Alunos</span></div>
              <div><strong className="gold-text">{settings.years_count}+</strong><span>Anos de caminhada</span></div>
              <div><strong className="gold-text">{n.imersoes}</strong><span>Títulos no acervo</span></div>
            </div>
          </div>
        </Reveal>

        {shelves.map((s, idx) => s.style === "top10" ? (
          <Shelf
            key={s.id}
            id={`fileira-${s.id}`}
            title={s.title}
            subtitle={s.subtitle}
            style={s.style}
            items={s.courses.map(toCard)}
            lockedIds={lockedIds}
            favIds={favIds}
            loggedIn={!!user}
            priority={idx < 2}
          />
        ) : null)}

        <section className="section subscription-section" id="assinatura">
          <Reveal className="plan">
            <div className="plan-art">
              <div className="plan-highlights">
                <div><IconPlay size={30} /><span><strong>{n.imersoes}+</strong>Imersões<br />e séries</span></div>
                <div><IconDoc size={34} /><span><strong>30+</strong>Apostilas<br />em PDF</span></div>
                <div><IconMusic size={32} /><span><strong>Trilhas</strong>Exclusivas</span></div>
                <div><IconUsers size={34} /><span><strong>Encontros</strong>Com Vanessa Tikura</span></div>
              </div>
            </div>
            <div className="plan-card">
              <div className="plan-heading">
              <span className="eyebrow">Assinatura anual</span>
              <h2 className="display">Todo o acervo <span className="gold-text">por 12 meses</span></h2>
              <p className="plan-tagline">Centenas de horas de conteúdo<br />para a sua jornada espiritual</p>
              </div>
              <div className="plan-ornament" aria-hidden="true">✶</div>
              <ul className="checklist">
                {[
                  `Acesso completo às ${n.imersoes} imersões e séries já lançadas`,
                  "Novos conteúdos com frequência",
                  "Vivências guiadas e encontros especiais com Vanessa Tikura",
                  "Acesso ilimitado à plataforma por 12 meses",
                  "Mais de 30 apostilas ilustradas em PDF",
                  "Vídeo-aulas completas de cada imersão",
                  "Trilhas musicais exclusivas para práticas guiadas",
                  "Suporte pelo WhatsApp",
                ].map((t) => (
                  <li key={t}><IconCheck size={18} /><span>{t}</span></li>
                ))}
              </ul>
              <div className="price price-installments">
                <span className="big gold-text">{settings.price_installments.replace(/\s+de\s+/, " ")}</span>
                <small>ou R$ {settings.price_cash} à vista</small>
              </div>
              <div className="plan-footer-art" aria-hidden="true" />
              {user ? (
                <Link href="/minha-area" className="btn btn-gold">Ir para minha área <IconArrow /></Link>
              ) : (
                <a href={settings.checkout_url} className="btn btn-gold" rel="noopener"><IconLock size={25} /> Quero entrar agora <IconArrow /></a>
              )}
              <div className="plan-payment"><IconCheck size={28} /><p>Pagamento seguro pela Hotmart.<br />Acesso liberado logo após a aprovação.</p><span className="plan-hotmart"><span aria-hidden="true">♨</span> hotmart</span></div>
            </div>
          </Reveal>
        </section>

        <section className="section" id="duvidas">
          <div className="section-head" style={{ textAlign: "center" }}>
            <span className="eyebrow">Dúvidas frequentes</span>
            <h2 className="display">Antes de entrar</h2>
          </div>
          <div className="faq">
            {FAQ.map(([q, a]) => (
              <details key={q}><summary>{q}</summary><p>{a}</p></details>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 34 }}>
            <a className="btn btn-ghost" href={waLink(settings.whatsapp, "Olá! Quero saber mais sobre o Tikuraflix")} rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.5 11.7a8.5 8.5 0 0 1-12.6 7.5L3 20.5l1.3-4.7a8.5 8.5 0 1 1 16.2-4.1Z" /><path d="M8.2 7.6c.3-.3.7-.2.9.2l1 2c.2.3.1.5-.2.8l-.6.6a7.1 7.1 0 0 0 3.4 3.3l.6-.8c.2-.3.5-.4.8-.2l2 1c.4.2.4.5.2.9-.5.9-1.2 1.3-2.2 1.1-3.5-.7-6.6-3.7-7.2-7.1-.1-.7.2-1.3.8-1.8Z" /></svg>Falar no WhatsApp</a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
