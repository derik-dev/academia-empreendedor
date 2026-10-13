-- Tabela de gravações do Zoom
create table if not exists public.zoom_recordings (
  id           uuid        primary key default gen_random_uuid(),
  title        text        not null,
  description  text        not null default '',
  type         text        not null check (type in ('Aula', 'Workshop', 'Mentoria')),
  category     text        not null default '',
  duration     text        not null default '',
  thumb_url    text        not null default '',
  video_url    text,
  status       text        not null default 'published' check (status in ('draft', 'published')),
  recorded_at  timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

alter table public.zoom_recordings enable row level security;
grant select on public.zoom_recordings to authenticated;

create policy "Authenticated users can read published zoom recordings"
  on public.zoom_recordings for select to authenticated
  using (status = 'published');

insert into public.zoom_recordings (title, description, type, category, duration, thumb_url, recorded_at) values
  ('Estratégia de Vendas para 2024', 'Como estruturar um processo de vendas previsível para escalar o seu negócio.', 'Aula', 'Vendas', '1h 32min', 'https://picsum.photos/seed/zoom1/320/180', '2024-03-12 10:00:00+00'),
  ('Planejamento Estratégico na Prática', 'Ferramentas e metodologia para definir e executar suas metas de crescimento.', 'Workshop', 'Planejamento', '1h 18min', 'https://picsum.photos/seed/zoom2/320/180', '2024-03-08 10:00:00+00'),
  ('Como Montar uma Operação Enxuta', 'Processos, pessoas e ferramentas para crescer com mais eficiência.', 'Mentoria', 'Gestão', '2h 05min', 'https://picsum.photos/seed/zoom3/320/180', '2024-03-01 10:00:00+00'),
  ('Produtividade para Empreendedores', 'Rotinas, hábitos e ferramentas que realmente funcionam no dia a dia.', 'Aula', 'Produtividade', '1h 11min', 'https://picsum.photos/seed/zoom4/320/180', '2024-02-23 10:00:00+00'),
  ('Marketing de Conteúdo que Gera Resultado', 'Como atrair, engajar e converter com conteúdo estratégico.', 'Aula', 'Marketing', '1h 48min', 'https://picsum.photos/seed/zoom5/320/180', '2024-02-16 10:00:00+00'),
  ('Gestão de Equipe em Home Office', 'Estratégias para liderar times à distância com produtividade e engajamento.', 'Mentoria', 'Gestão', '1h 55min', 'https://picsum.photos/seed/zoom6/320/180', '2024-02-10 10:00:00+00'),
  ('Finanças para Empreendedores', 'Controle financeiro, fluxo de caixa e investimentos para o seu negócio.', 'Aula', 'Finanças', '1h 24min', 'https://picsum.photos/seed/zoom7/320/180', '2024-02-05 10:00:00+00');
