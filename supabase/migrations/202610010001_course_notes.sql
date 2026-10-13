create table if not exists public.course_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_slug text not null,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_notes_user_course_unique unique (user_id, course_slug)
);

alter table public.course_notes enable row level security;

grant select, insert, update, delete on public.course_notes to authenticated;

create policy "Users can read own course notes" on public.course_notes
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create own course notes" on public.course_notes
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update own course notes" on public.course_notes
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete own course notes" on public.course_notes
  for delete to authenticated using ((select auth.uid()) = user_id);
