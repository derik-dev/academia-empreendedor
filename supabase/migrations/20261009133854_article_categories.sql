create table if not exists public.article_categories (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null check (char_length(btrim(name)) between 1 and 40),
  slug        text        not null unique check (slug <> ''),
  color       text        not null default '#ec4899' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at  timestamptz not null default now()
);

alter table public.article_categories enable row level security;
revoke all on table public.article_categories from anon, authenticated;
grant select, insert, update, delete on table public.article_categories to authenticated;

create policy "Admins can manage article categories" on public.article_categories
  for all to authenticated
  using (public.is_academy_admin())
  with check (public.is_academy_admin());

insert into public.article_categories (name, slug, color)
values
  ('Mentalidade', 'mentalidade', '#ec4899'),
  ('Negócios', 'negocios', '#3b82f6'),
  ('Produtividade', 'produtividade', '#10b981'),
  ('Carreira', 'carreira', '#f59e0b'),
  ('Dinheiro', 'dinheiro', '#22c55e'),
  ('Hábitos', 'habitos', '#8b5cf6')
on conflict (slug) do nothing;
