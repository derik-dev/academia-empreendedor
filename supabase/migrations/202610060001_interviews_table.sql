-- Tabela de entrevistas da Academia
create table if not exists public.interviews (
  id            uuid        primary key default gen_random_uuid(),
  slug          text        not null unique,
  title         text        not null,
  subtitle      text        not null default '',
  guest         text        not null,
  guest_role    text        not null default '',
  duration      text        not null default '',
  video_id      text,
  status        text        not null default 'draft' check (status in ('draft', 'published')),
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.interviews enable row level security;
grant select on public.interviews to authenticated;

create policy "Authenticated users can read published interviews" on public.interviews
  for select to authenticated using (status = 'published');

create policy "Admins can manage interviews" on public.interviews
  for all to authenticated using (public.is_academy_admin())
  with check (public.is_academy_admin());

create index if not exists interviews_published_idx on public.interviews (published_at desc) where status = 'published';

-- Entrevistas de exemplo
insert into public.interviews (slug, title, subtitle, guest, guest_role, duration, video_id, status, published_at)
values
  (
    'do-zero-ao-negocio',
    'Do zero ao negócio',
    'Como ele saiu do absoluto zero e construiu um negócio de sucesso.',
    'Éric Pereira',
    'Fundador e CEO',
    '48:27',
    'ZiqKAyqskOA',
    'published',
    now() - interval '2 weeks'
  ),
  (
    'mentalidade-de-crescimento',
    'Mentalidade de crescimento',
    'Como desenvolver uma mentalidade que te leva mais longe.',
    'Camila Ferreira',
    'Empreendedora e Investidora',
    '52:11',
    null,
    'published',
    now() - interval '3 weeks'
  )
on conflict (slug) do nothing;
