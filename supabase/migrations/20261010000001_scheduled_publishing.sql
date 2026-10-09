-- Adiciona coluna scheduled_for em todas as tabelas publicáveis
ALTER TABLE courses ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;
ALTER TABLE zoom_recordings ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;

-- Função que publica conteúdo agendado cujo horário chegou
CREATE OR REPLACE FUNCTION publish_scheduled_content()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE courses
    SET status = 'published', published_at = scheduled_for, scheduled_for = NULL
    WHERE status = 'scheduled' AND scheduled_for <= NOW();

  UPDATE articles
    SET status = 'published', published_at = scheduled_for, scheduled_for = NULL
    WHERE status = 'scheduled' AND scheduled_for <= NOW();

  UPDATE interviews
    SET status = 'published', published_at = scheduled_for, scheduled_for = NULL
    WHERE status = 'scheduled' AND scheduled_for <= NOW();

  UPDATE zoom_recordings
    SET status = 'published', recorded_at = scheduled_for, scheduled_for = NULL
    WHERE status = 'scheduled' AND scheduled_for <= NOW();
END;
$$;

-- Cron job: roda a cada minuto para publicar conteúdo agendado
SELECT cron.schedule(
  'publish-scheduled-content',
  '* * * * *',
  'SELECT publish_scheduled_content()'
);
