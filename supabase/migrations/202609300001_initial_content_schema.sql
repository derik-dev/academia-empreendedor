-- Schema mínimo da Academia. A autorização da aplicação depende da sessão Auth;
-- não há consulta a compras nem dependência da Hotmart neste momento.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category_id uuid references public.categories(id) on delete set null,
  content_type text not null check (content_type in ('miniseries', 'podcast', 'interview', 'zoom_recording', 'article')),
  thumbnail_url text,
  video_url text,
  author text,
  published_at timestamptz,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.content_items enable row level security;

create policy "Users can read own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "Users can create own profile" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "Users can update own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "Authenticated users can read categories" on public.categories
  for select to authenticated using (true);
create policy "Authenticated users can read published content" on public.content_items
  for select to authenticated using (is_published = true);

create index if not exists content_items_published_idx on public.content_items (published_at desc) where is_published = true;
create index if not exists content_items_category_idx on public.content_items (category_id);
