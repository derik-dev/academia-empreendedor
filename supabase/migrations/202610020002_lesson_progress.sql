create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_slug text not null,
  lesson_id text not null,
  current_time_seconds integer not null default 0 check (current_time_seconds >= 0),
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  progress_percent numeric(5, 2) not null default 0 check (progress_percent >= 0 and progress_percent <= 100),
  completed boolean not null default false,
  last_watched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_progress_user_course_lesson_unique unique (user_id, course_slug, lesson_id)
);

create index if not exists lesson_progress_user_last_watched_idx
  on public.lesson_progress (user_id, last_watched_at desc);

alter table public.lesson_progress enable row level security;

grant select, insert, update on public.lesson_progress to authenticated;

drop policy if exists "Users can read their own lesson progress" on public.lesson_progress;
create policy "Users can read their own lesson progress"
  on public.lesson_progress for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own lesson progress" on public.lesson_progress;
create policy "Users can insert their own lesson progress"
  on public.lesson_progress for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own lesson progress" on public.lesson_progress;
create policy "Users can update their own lesson progress"
  on public.lesson_progress for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
