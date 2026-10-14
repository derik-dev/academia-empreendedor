-- Episódios de podcast: adiciona audio_path a lessons e torna video_url opcional.
-- Episódio deve ter pelo menos um dos dois campos preenchidos.

alter table public.lessons
  add column if not exists audio_path text;

alter table public.lessons
  alter column video_url drop not null;

alter table public.lessons
  add constraint lessons_has_media
    check (
      nullif(btrim(coalesce(video_url, '')), '')  is not null
   or nullif(btrim(coalesce(audio_path, '')), '') is not null
    );

-- ROLLBACK (não executar em produção — apenas para reverter se necessário):
-- alter table public.lessons drop constraint if exists lessons_has_media;
-- alter table public.lessons alter column video_url set not null;
-- alter table public.lessons drop column if exists audio_path;
