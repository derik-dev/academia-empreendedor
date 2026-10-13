-- Tabela de artigos do Blog
create table if not exists public.articles (
  id            uuid        primary key default gen_random_uuid(),
  slug          text        not null unique,
  title         text        not null,
  excerpt       text        not null default '',
  category      text        not null,
  read_time     text        not null default '',
  image_url     text,
  status        text        not null default 'draft' check (status in ('draft', 'published')),
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.articles enable row level security;
grant select on public.articles to authenticated;

create policy "Authenticated users can read published articles" on public.articles
  for select to authenticated using (status = 'published');

create policy "Admins can manage articles" on public.articles
  for all to authenticated using (public.is_academy_admin())
  with check (public.is_academy_admin());

create index if not exists articles_published_idx on public.articles (published_at desc) where status = 'published';

-- Artigos de exemplo
insert into public.articles (slug, title, excerpt, category, read_time, image_url, status, published_at)
values
  (
    'mentalidade-que-muda-sua-vida',
    'Como construir uma mentalidade que realmente muda sua vida',
    'Não se trata apenas de motivação, mas de um conjunto de decisões diárias que constroem o seu futuro.',
    'Mentalidade',
    '8 min de leitura',
    'https://picsum.photos/seed/mentalidade1/800/500',
    'published',
    now() - interval '24 days'
  ),
  (
    'metodos-produtividade',
    'Métodos práticos para ser mais produtivo no dia a dia',
    'Pequenas mudanças de rotina que geram grandes resultados ao longo do tempo.',
    'Produtividade',
    '6 min de leitura',
    'https://picsum.photos/seed/produtiv2/800/500',
    'published',
    now() - interval '21 days'
  ),
  (
    'licoes-de-negocios',
    'O que aprendi sobre negócios depois de errar (e acertar)',
    'Os erros mais caros que cometi e o que eles me ensinaram sobre empreender.',
    'Negócios',
    '10 min de leitura',
    'https://picsum.photos/seed/negocios3/800/500',
    'published',
    now() - interval '15 days'
  ),
  (
    'decisoes-melhores',
    'Como tomar decisões melhores e sair da estagnação',
    'Um framework simples para resolver dilemas e avançar com mais clareza.',
    'Carreira',
    '7 min de leitura',
    'https://picsum.photos/seed/carreira4/800/500',
    'published',
    now() - interval '9 days'
  ),
  (
    'habitos-financeiros',
    'Hábitos financeiros que transformam sua relação com o dinheiro',
    'Como organizar suas finanças e construir mais liberdade no dia a dia.',
    'Dinheiro',
    '5 min de leitura',
    'https://picsum.photos/seed/dinheiro5/800/500',
    'published',
    now() - interval '17 days'
  ),
  (
    'construir-habitos',
    'Como construir hábitos que realmente duram',
    'A ciência por trás dos hábitos e como aplicá-la na prática.',
    'Hábitos',
    '6 min de leitura',
    'https://picsum.photos/seed/habitos6/800/500',
    'published',
    now() - interval '22 days'
  ),
  (
    'crescimento-carreira',
    'Estratégias para acelerar o crescimento na carreira',
    'Como se posicionar para crescer mais rápido e ser reconhecido pelo seu trabalho.',
    'Carreira',
    '9 min de leitura',
    'https://picsum.photos/seed/crescimento7/800/500',
    'published',
    now() - interval '27 days'
  )
on conflict (slug) do nothing;
