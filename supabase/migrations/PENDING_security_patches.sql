-- ===========================================================================
-- PATCHES DE SEGURANÇA PENDENTES — aguardam autorização para aplicar
-- Gerado na auditoria de 2026-10-12
-- NÃO aplicar diretamente sem revisar e fazer backup do banco de produção.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- PATCH 1: publish_scheduled_content() — adicionar SET search_path = ''
-- Risco: SECURITY DEFINER sem search_path fixo pode ser explorado via
-- manipulação de search_path se um objeto malicioso for criado em public.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION publish_scheduled_content()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.courses
    SET status = 'published', published_at = scheduled_for, scheduled_for = NULL
    WHERE status = 'scheduled' AND scheduled_for <= NOW();

  UPDATE public.articles
    SET status = 'published', published_at = scheduled_for, scheduled_for = NULL
    WHERE status = 'scheduled' AND scheduled_for <= NOW();

  UPDATE public.interviews
    SET status = 'published', published_at = scheduled_for, scheduled_for = NULL
    WHERE status = 'scheduled' AND scheduled_for <= NOW();

  UPDATE public.zoom_recordings
    SET status = 'published', recorded_at = scheduled_for, scheduled_for = NULL
    WHERE status = 'scheduled' AND scheduled_for <= NOW();
END;
$$;

-- ---------------------------------------------------------------------------
-- PATCH 2: bucket avatars — criar bucket e políticas RLS se não existirem
-- O bucket é usado pelo ProfilePage para avatars/covers de alunos.
-- Verificar no dashboard se o bucket e as políticas já existem antes de
-- aplicar este patch (evita conflito no ON CONFLICT).
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Qualquer pessoa pode ver avatars (bucket público)
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Alunos só podem fazer upload para o próprio diretório (user_id/*)
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

-- Alunos só podem atualizar os próprios arquivos
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

-- Alunos só podem apagar os próprios arquivos
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

-- ---------------------------------------------------------------------------
-- PATCH 3: admin-students — impedir que um admin delete outro admin
-- Este patch é preventivo: adiciona uma verificação server-side na tabela
-- admin_users antes de permitir a exclusão de um usuário.
-- Alternativa: adicionar a verificação na Edge Function admin-students/index.ts
-- ---------------------------------------------------------------------------
-- (Sem SQL para este patch — a correção deve ser feita na Edge Function)
-- Adicionar após validar que userId não é o próprio admin:
--
--   const { data: targetIsAdmin } = await authClient
--     .from('admin_users')
--     .select('user_id')
--     .eq('user_id', userId)
--     .maybeSingle()
--   if (targetIsAdmin) return respond(403, { error: 'Não é possível remover uma conta administrativa.' }, origin)
