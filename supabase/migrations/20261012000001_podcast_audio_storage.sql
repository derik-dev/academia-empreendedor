-- Adiciona coluna de caminho do áudio na tabela de cursos (podcasts)
alter table public.courses add column if not exists audio_path text;

-- Cria bucket privado para áudios de podcasts (30 MB por ficheiro)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'podcast-audio',
  'podcast-audio',
  false,
  31457280,
  array['audio/mpeg', 'audio/mp3', 'audio/x-mpeg-3']
)
on conflict (id) do nothing;

-- Apenas admins podem fazer upload de áudio
create policy "admin_insert_podcast_audio"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'podcast-audio'
  and (select public.is_academy_admin())
);

-- Apenas admins podem substituir/actualizar áudio existente
create policy "admin_update_podcast_audio"
on storage.objects for update
to authenticated
using (
  bucket_id = 'podcast-audio'
  and (select public.is_academy_admin())
)
with check (
  bucket_id = 'podcast-audio'
  and (select public.is_academy_admin())
);

-- Apenas admins podem eliminar ficheiros de áudio
create policy "admin_delete_podcast_audio"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'podcast-audio'
  and (select public.is_academy_admin())
);

-- Alunos autenticados podem ler (necessário para gerar signed URLs)
create policy "authenticated_read_podcast_audio"
on storage.objects for select
to authenticated
using (bucket_id = 'podcast-audio');
