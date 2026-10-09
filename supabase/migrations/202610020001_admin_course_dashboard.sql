-- Perfis sincronizados com Auth para que o painel conte novos alunos.
alter table public.profiles add column if not exists name text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists full_name text;

insert into public.profiles (id, name, email, full_name, created_at)
select id,
       coalesce(nullif(raw_user_meta_data ->> 'full_name', ''), nullif(raw_user_meta_data ->> 'name', ''), email, 'Aluno da Academia'),
       coalesce(email, 'unknown+' || id::text || '@invalid.local'),
       coalesce(nullif(raw_user_meta_data ->> 'full_name', ''), nullif(raw_user_meta_data ->> 'name', '')),
       created_at
from auth.users
on conflict (id) do update
set created_at = excluded.created_at,
    name = coalesce(nullif(public.profiles.name, ''), excluded.name),
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name);

create or replace function public.handle_academy_user_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, email, full_name, created_at)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), nullif(new.raw_user_meta_data ->> 'name', ''), new.email, 'Aluno da Academia'),
    coalesce(new.email, 'unknown+' || new.id::text || '@invalid.local'),
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), nullif(new.raw_user_meta_data ->> 'name', '')),
    new.created_at
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_academy_user_created on auth.users;
create trigger on_academy_user_created
  after insert on auth.users
  for each row execute procedure public.handle_academy_user_created();

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
grant select on public.admin_users to authenticated;
drop policy if exists "Users can check their own admin access" on public.admin_users;
create policy "Users can check their own admin access" on public.admin_users
  for select to authenticated using ((select auth.uid()) = user_id);

-- Concede o papel de admin à conta solicitada sem guardar a senha no projeto.
insert into public.admin_users (user_id)
select id from auth.users where lower(email) = 'ericeenio@gmail.com'
on conflict (user_id) do nothing;

create or replace function public.grant_academy_admin_on_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if lower(new.email) = 'ericeenio@gmail.com' then
    insert into public.admin_users (user_id) values (new.id)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_academy_admin_signup on auth.users;
create trigger on_academy_admin_signup
  after insert on auth.users
  for each row execute procedure public.grant_academy_admin_on_signup();

create or replace function public.is_academy_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users where user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_academy_admin() from public, anon;
grant execute on function public.is_academy_admin() to authenticated;

drop policy if exists "Admins can read all student profiles" on public.profiles;
create policy "Admins can read all student profiles" on public.profiles
  for select to authenticated using (public.is_academy_admin());

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  cover_url text not null,
  instructor text not null default '',
  category text not null check (category in ('miniseries', 'podcast')),
  video_url text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.courses enable row level security;
grant select, insert, update, delete on public.courses to authenticated;
drop policy if exists "Authenticated users can read published courses" on public.courses;
create policy "Authenticated users can read published courses" on public.courses
  for select to authenticated using (status = 'published');
drop policy if exists "Admins can manage courses" on public.courses;
create policy "Admins can manage courses" on public.courses
  for all to authenticated using (public.is_academy_admin())
  with check (public.is_academy_admin());
create index if not exists courses_status_published_idx on public.courses (published_at desc) where status = 'published';

create table if not exists public.course_access_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_slug text not null,
  accessed_at timestamptz not null default now()
);
alter table public.course_access_events enable row level security;
grant select, insert on public.course_access_events to authenticated;
drop policy if exists "Users can record their own course visits" on public.course_access_events;
create policy "Users can record their own course visits" on public.course_access_events
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Admins can read course visit analytics" on public.course_access_events;
create policy "Admins can read course visit analytics" on public.course_access_events
  for select to authenticated using (public.is_academy_admin());
create index if not exists course_access_events_date_idx on public.course_access_events (accessed_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('course-covers', 'course-covers', true, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Anyone can view published course cover assets" on storage.objects;
create policy "Anyone can view published course cover assets" on storage.objects
  for select to public using (bucket_id = 'course-covers');
drop policy if exists "Admins can upload course cover assets" on storage.objects;
create policy "Admins can upload course cover assets" on storage.objects
  for insert to authenticated with check (bucket_id = 'course-covers' and public.is_academy_admin());
drop policy if exists "Admins can update course cover assets" on storage.objects;
create policy "Admins can update course cover assets" on storage.objects
  for update to authenticated using (bucket_id = 'course-covers' and public.is_academy_admin())
  with check (bucket_id = 'course-covers' and public.is_academy_admin());
drop policy if exists "Admins can delete course cover assets" on storage.objects;
create policy "Admins can delete course cover assets" on storage.objects
  for delete to authenticated using (bucket_id = 'course-covers' and public.is_academy_admin());
