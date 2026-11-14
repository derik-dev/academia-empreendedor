/**
 * Banners full (de ponta a ponta) intercalados entre as fileiras da home.
 *
 * Para editar: troque os textos aqui. Para incluir um banner novo, adicione um item
 * com o slug de um curso que já existe no acervo e o título da fileira depois da qual ele aparece.
 * Se o curso não existir (ou estiver em rascunho) ou a fileira não aparecer, o banner é ignorado.
 *
 * A imagem padrão é a capa do curso (/capas/site/<slug>.webp). Para usar uma arte própria,
 * preencha `desktop` (16:9, mín. 1600 px de largura) e `mobile` (16:9 ou 4:5).
 */
export type FeatureBanner = {
  slug: string;
  /** Título da fileira depois da qual o banner aparece (igual ao do painel /admin/fileiras). */
  afterShelf: string;
  /** Linha pequena acima do título. */
  eyebrow: string;
  /** Afirmação principal (2 linhas no desktop). Use \n para quebrar a linha. */
  headline: string;
  /** Texto de apoio. Cada frase em uma linha nova (\n). */
  text: string;
  /** Texto do botão principal (curto, cabe em uma linha). */
  cta: string;
  /** Frase curta abaixo dos botões. */
  note: string;
  /** Cor de fundo da seção (tom tirado da arte do curso). */
  tone: string;
  /** Imagens opcionais (por padrão usa a capa do curso). */
  desktop?: string;
  mobile?: string;
  /** Foco da imagem no desktop (CSS object-position). */
  focus?: string;
};

export const FEATURE_BANNERS: FeatureBanner[] = [
  {
    slug: "imersao-da-magia",
    afterShelf: "Novas no acervo",
    eyebrow: "Destaque do acervo",
    headline: "Hécate te espera\nna encruzilhada.",
    text: "Uma imersão no caminho do Tarô, guiada pela deusa das encruzilhadas.\nPara quem sente o chamado e quer confiar na própria visão espiritual.",
    cta: "Entrar na imersão",
    note: "Incluída na assinatura do Tikuraflix",
    tone: "#140d1c",
  },
  {
    slug: "roda-de-benzimento",
    afterShelf: "Benzimento e Cura",
    eyebrow: "Uma das mais assistidas",
    headline: "A reza que atravessa\ngerações.",
    text: "Uma roda para despertar a benzedeira, ou o benzedor, que existe em você.\nProteção, cura espiritual e o saber das antigas benzedeiras.",
    cta: "Entrar na roda",
    note: "Assista no seu tempo, quando quiser",
    tone: "#121a12",
  },
  {
    slug: "laroye-a-gira-dos-caminhos-abertos",
    afterShelf: "Ervas e Banhos",
    eyebrow: "Orixás e Encantaria",
    headline: "Caminho fechado\npede uma gira.",
    text: "Uma imersão sobre Laroyê e a força que abre passagem.\nPara quem sente a vida travada e quer seguir com proteção.",
    cta: "Abrir meus caminhos",
    note: "Uma das imersões do acervo do Tikuraflix",
    tone: "#1c0a0b",
  },
  {
    slug: "a-sacerdotisa",
    afterShelf: "Magia e Bruxaria",
    eyebrow: "Feminino Sagrado",
    headline: "A resposta que você busca\njá mora em você.",
    text: "Uma imersão para despertar a intuição e o poder interior.\nO arquétipo da Sacerdotisa como guia da sua consciência.",
    cta: "Despertar minha intuição",
    note: "Acesso por 12 meses, em qualquer tela",
    tone: "#0e0f22",
  },
];
