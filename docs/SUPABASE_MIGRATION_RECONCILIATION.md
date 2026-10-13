# Reconciliação do Supabase

## Estado verificado em 2026-10-12

Esta revisão consultou o banco remoto diretamente via MCP (projeto `jamcuvtemuttfjhtzzjr`).
Os dados abaixo refletem o estado real da produção, não apenas os arquivos locais.

---

## Agendamento de publicações

**Estado: FUNCIONAL ✅**

- `pg_cron` instalado e ativo.
- Job `publish-scheduled-content` (ID 1) ativo, rodando `* * * * *` (todo minuto).
- Todas as 4 tabelas publicáveis aceitam `status = 'scheduled'`:
  - `courses.status_check`: `('draft', 'published', 'scheduled')` ✅
  - `articles.status_check`: `('draft', 'published', 'scheduled')` ✅
  - `interviews.status_check`: `('draft', 'published', 'scheduled')` ✅
  - `zoom_recordings.status_check`: `('draft', 'published', 'scheduled')` ✅
- Nenhum conteúdo preso em `status = 'scheduled'` no momento da revisão.

**Função `publish_scheduled_content()` — problemas de segurança pendentes (ver abaixo).**

---

## Tabelas e colunas

### Correspondência entre frontend e banco

Todas as colunas usadas pelo frontend existem no banco:

| Tabela | Colunas verificadas | Status |
|---|---|---|
| `courses` | `id, slug, title, description, cover_url, instructor, category, video_url, notes_enabled, lesson_count, duration_text, level, status, published_at, scheduled_for, position, audio_path, created_at` | ✅ |
| `articles` | `id, slug, title, excerpt, category, read_time, image_url, status, published_at, scheduled_for, content, video_url, created_at` | ✅ |
| `interviews` | `id, slug, title, subtitle, guest, guest_role, author, cover_url, duration, video_id, status, published_at, scheduled_for, created_at` | ✅ |
| `zoom_recordings` | `id, title, description, type, category, duration, thumb_url, video_url, status, recorded_at, scheduled_for` | ✅ |
| `lessons` | `id, course_id, title, video_url, duration_seconds, position, cover_url` | ✅ |
| `lesson_progress` | `id, user_id, course_slug, lesson_id, current_time_seconds, duration_seconds, progress_percent, completed, last_watched_at` | ✅ |
| `course_notes` | `id, user_id, course_slug, body` | ✅ |
| `profiles` | `id, name, email, full_name, created_at` | ✅ |

### Divergência não-crítica: colunas extras em `profiles`

O banco de produção tem duas colunas em `profiles` que **não existem em nenhum arquivo de migration local**:
- `role` (VARCHAR NOT NULL, default `'member'`)
- `status` (VARCHAR NOT NULL, default `'active'`)

Foram criadas provavelmente na configuração inicial do projeto Supabase. O frontend **não usa** essas colunas — nenhuma query as seleciona ou escreve. Não representam risco nem impacto funcional. Não recriar, não remover.

---

## RLS e Políticas de acesso

### Estado atual — todas as tabelas

RLS habilitado em todas as 11 tabelas públicas: ✅

| Tabela | Alunos | Admin | Status |
|---|---|---|---|
| `courses` | SELECT onde `status = 'published'` | ALL (via `is_academy_admin()`) | ✅ |
| `articles` | SELECT onde `status = 'published'` | ALL (via `is_academy_admin()`) | ✅ |
| `interviews` | SELECT onde `status = 'published'` | ALL (via `is_academy_admin()`) | ✅ |
| `lessons` | SELECT de cursos publicados | ALL (via `is_academy_admin()`) | ✅ |
| `lesson_progress` | SELECT/INSERT/UPDATE próprio | — | ✅ |
| `course_notes` | CRUD próprio | — | ✅ |
| `profiles` | SELECT/UPDATE próprio | SELECT + UPDATE todos | ✅ |
| `admin_users` | SELECT próprio | — | ✅ |
| `article_categories` | — | ALL (via `is_academy_admin()`) | ✅ |
| **`zoom_recordings`** | SELECT onde `status = 'published'` | **NENHUMA política admin** | **❌ CRÍTICO** |

### Problema crítico: `zoom_recordings` sem política admin

O admin usa `authenticated` role (não `service_role`). Sem política admin em `zoom_recordings`:
- Admin só vê gravações publicadas (drafts invisíveis)
- Admin não pode criar, editar ou apagar gravações — operação falha silenciosamente no SDK com erro RLS 42501

Ver **Patch 1** abaixo para correção.

---

## `publish_scheduled_content()` — problemas de segurança

Estado atual confirmado no banco:

```
security_definer: true
config: null  ← SEM SET search_path = ''
anon: pode executar ← QUALQUER pessoa não autenticada pode chamar via API
authenticated: pode executar ← qualquer aluno pode chamar via SDK
```

O impacto prático é limitado (a função só publica conteúdo já agendado), mas viola o princípio do menor privilégio e a convenção de segurança do projeto.

Ver **Patch 2** abaixo para correção.

---

## Scripts SQL de correção pendentes

### PATCH 1 — Política admin para `zoom_recordings` (CRÍTICO)

```sql
-- Permite que admins vejam e gerenciem todas as gravações (incluindo drafts e agendadas)
DROP POLICY IF EXISTS "Admins can manage zoom recordings" ON public.zoom_recordings;
CREATE POLICY "Admins can manage zoom recordings"
  ON public.zoom_recordings
  FOR ALL
  TO authenticated
  USING (public.is_academy_admin())
  WITH CHECK (public.is_academy_admin());
```

**Efeito:** Admin passa a ver todos os status (draft, scheduled, published) e pode criar, editar e apagar gravações. Alunos continuam vendo apenas publicadas.  
**Risco:** Mínimo — apenas adiciona acesso para quem já é admin verificado.  
**Verificação pós-aplicação:** Abrir painel admin → Gravações do Zoom → confirmar que a seção carrega sem erro e permite salvar.

---

### PATCH 2 — Hardening de `publish_scheduled_content()` (SEGURANÇA)

```sql
-- Recria a função com search_path fixo e nomes de tabelas qualificados
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

-- Retira execução de roles desnecessários
-- (pg_cron roda como postgres/service_role — não precisa de anon/authenticated)
REVOKE EXECUTE ON FUNCTION public.publish_scheduled_content()
  FROM anon, authenticated;
```

**Efeito:** 
1. Adiciona `SET search_path = ''` — impede redirecionamento via search_path
2. Qualifica todas as tabelas com `public.` e usa `pg_catalog.now()`
3. Remove execução de `anon` (não autenticados) e `authenticated` (alunos)
4. O cron job continua funcionando (roda como `postgres`)

**Risco:** Baixo. O job pg_cron `SELECT publish_scheduled_content()` não é afetado pois roda com privileges de superuser. Antes de aplicar, confirmar com `SELECT cron.job WHERE jobname = 'publish-scheduled-content'` que o job usa o papel correto.

---

## Regras para mudanças futuras

1. **Não aplicar a pasta `migrations/` inteira** — o banco remoto tem mudanças que não estão nos arquivos locais e vice-versa. Sempre aplique migrations novas uma a uma.
2. **Não recriar tabelas ou recriar políticas já existentes** sem verificar o estado atual via MCP.
3. **Não executar seeds de exemplo** — os dados de exemplo das migrations já estão no banco.
4. **Toda nova migration** deve usar `IF NOT EXISTS` / `IF EXISTS` e `ON CONFLICT DO NOTHING` para ser idempotente.
5. **Verificar RLS após criar tabela nova**: toda tabela precisa de políticas explícitas para `authenticated` (aluno) e admin, além de `ENABLE ROW LEVEL SECURITY`.
