-- ===========================================================================
-- AGUARDA AUTORIZAÇÃO ANTES DE APLICAR
-- Revisado em 2026-10-12
-- Verificado contra o banco remoto jamcuvtemuttfjhtzzjr
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- PATCH 1: zoom_recordings — política de acesso admin (CRÍTICO)
-- Problema: admin não consegue ver drafts nem criar/editar/apagar gravações.
-- Impacto atual: seção "Gravações do Zoom" do painel falha com erro RLS 42501
--   ao tentar salvar. Drafts são invisíveis.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can manage zoom recordings" ON public.zoom_recordings;
CREATE POLICY "Admins can manage zoom recordings"
  ON public.zoom_recordings
  FOR ALL
  TO authenticated
  USING (public.is_academy_admin())
  WITH CHECK (public.is_academy_admin());

-- ---------------------------------------------------------------------------
-- PATCH 2: publish_scheduled_content() — hardening de segurança
-- Problemas:
--   a) Sem SET search_path = '' (nomes de tabela não qualificados)
--   b) anon e authenticated podem executar a função diretamente via API
-- O cron job (postgres) não é afetado pelo REVOKE abaixo.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.publish_scheduled_content()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.courses
    SET status = 'published', published_at = scheduled_for, scheduled_for = NULL
    WHERE status = 'scheduled' AND scheduled_for <= pg_catalog.now();

  UPDATE public.articles
    SET status = 'published', published_at = scheduled_for, scheduled_for = NULL
    WHERE status = 'scheduled' AND scheduled_for <= pg_catalog.now();

  UPDATE public.interviews
    SET status = 'published', published_at = scheduled_for, scheduled_for = NULL
    WHERE status = 'scheduled' AND scheduled_for <= pg_catalog.now();

  UPDATE public.zoom_recordings
    SET status = 'published', recorded_at = scheduled_for, scheduled_for = NULL
    WHERE status = 'scheduled' AND scheduled_for <= pg_catalog.now();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.publish_scheduled_content()
  FROM anon, authenticated;
