import Link from "next/link";
import { Fragment } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Hero, { type HeroItem } from "@/components/Hero";
import Shelf from "@/components/Shelf";
import Reveal from "@/components/Reveal";
import { IconArrow, IconCheck, IconLock, IconPlay, IconDoc, IconMusic, IconUsers } from "@/components/Icons";
import { getUser } from "@/lib/auth";
import { getCourseBySlug, getFavoriteIds, getSettings, getShelves } from "@/lib/data";
import { lockedIdsFor, splitTags, toCard } from "@/lib/catalog";
import { rows } from "@/lib/db";
import { KINDS, PATHS, type Kind } from "@/data/seed";
import { HERO_ART } from "@/data/hero";
import { waLink } from "@/lib/util";

export const dynamic = "force-dynamic";

const FAQ = [
  ["Como funciona o acesso?", "Assim que a compra é aprovada, você recebe os dados de acesso por e-mail e já pode assistir. É só entrar com seu e-mail e senha, de qualquer dispositivo."],
  ["Por quanto tempo tenho acesso?", "A assinatura vale por 12 meses, com possibilidade de renovação anual. Durante esse período você assiste quantas vezes quiser."],
  ["Posso assistir pelo celular e pela TV?", "Pode. A plataforma funciona no celular, tablet, computador e TV. No celular dá para instalar como aplicativo, direto da tela do navegador."],
  ["Como são as aulas?", "Vídeos gravados em Full HD, com apostilas em PDF e trilhas de áudio para meditação e práticas guiadas. Novos conteúdos entram no acervo com frequência."],
  ["E se eu tiver dúvidas ou problemas?", "O suporte é feito pelo WhatsApp. É só clicar no botão no rodapé da página."],
  ["Posso desistir?", "A compra é feita online, então vale o direito de arrependimento de 7 dias previsto em lei."],
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

        <div id="acervo">
          {shelves.map((s, idx) => (
            <Fragment key={s.id}>
              {s.title === PATHS.taro.label && (
                <section className="section" id="caminhos" aria-labelledby="caminhos-title">
                  <div className="section-head">
                    <h2 className="display" id="caminhos-title">Qual caminho te chama?</h2>
                  </div>
                  <div className="paths">
                    {pathAnchors.map((p) => (
                      <a key={p.k} className="path-chip" href={`#fileira-${p.shelf!.id}`}>{p.label}</a>
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
