-- Extende a tabela courses para suportar entrevistas, gravações do Zoom e artigos de blog.

-- Remove a constraint antiga e adiciona os novos valores de categoria
alter table public.courses drop constraint if exists courses_category_check;
alter table public.courses add constraint courses_category_check
  check (category in ('miniseries', 'podcast', 'interview', 'zoom_recording', 'blog'));

-- Campo para conteúdo em texto dos artigos do blog (opcional nos outros tipos)
alter table public.courses add column if not exists body text;

-- Índices para os novos tipos
create index if not exists courses_category_published_idx on public.courses (category, published_at desc) where status = 'published';
