create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  video_url text not null,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lessons_course_position_idx
  on public.lessons (course_id, position);

alter table public.lessons enable row level security;

grant select, insert, update, delete on public.lessons to authenticated;

drop policy if exists "Students can read lessons of published courses" on public.lessons;
create policy "Students can read lessons of published courses"
  on public.lessons for select to authenticated
  using (
    exists (
      select 1 from public.courses
      where courses.id = lessons.course_id
        and courses.status = 'published'
    )
  );

drop policy if exists "Admins can manage lessons" on public.lessons;
create policy "Admins can manage lessons"
  on public.lessons for all to authenticated
  using (public.is_academy_admin())
  with check (public.is_academy_admin());
