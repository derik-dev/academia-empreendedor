# Reconciliação do Supabase

## Estado observado

Esta revisão comparou os nomes/versões das migrations no histórico remoto com `supabase/migrations/` local e consultou metadados do schema. Não leu nem alterou registros de conteúdo. Os nomes locais não representam, por si só, a prova do SQL que foi executado em produção.

O histórico remoto inclui versões sem arquivo local correspondente: `20261007135636` (notes_enabled), `20261007141750` (course meta), `20261007150300` (valor de categoria), `20261007210204` (video_url em artigos) e `20261008113145` (thumb_url de entrevistas). As migrations locais `202610070001_zoom_recordings_table`, `202610080001_lessons_table`, `202610080002_lessons_cover_url` e `20261010000001_scheduled_publishing` têm versões diferentes das entradas remotas equivalentes ou aparentes (`20261007124208`, `20261007151040`, `20261007155338`, `20261009135219`). Compare os efeitos SQL exatos antes de tratá-las como equivalentes.

Também há migrations locais sem entrada remota com versão/nome correspondente: `202610070003_courses_initial_data.sql` e `202610070002_interviews_extra_data.sql` contêm inserts de exemplo; `202610090001_interviews_author.sql` e `202610090002_interviews_cover_url.sql` alteram entrevistas. Elas podem ter sido executadas por outra via ou substituídas por migrations remotas com nomes diferentes. Não reaplique inserts nem presuma que colunas de capa são equivalentes: local usa `cover_url`, enquanto o histórico remoto tem uma migration chamada `add_thumb_url_to_interviews`.

Os metadados remotos mostram `publish_scheduled_content()` como `SECURITY DEFINER`, sem `search_path` fixo, executável por `anon` e `authenticated`. A função usa nomes de tabelas não qualificados. As quatro constraints de `status` aceitam somente `draft` e `published`, apesar de a função filtrar `scheduled`. A coluna `scheduled_for` existe, mas não foi encontrado `pg_cron` nem job ativo. Portanto o agendamento não está operacional e o painel não deve oferecer agendamento até existir um desenho de banco coerente.

## Reconciliação segura

1. Faça backup verificável e exporte o schema remoto atual (`pg_dump --schema-only`) e o histórico de migrations; guarde-os fora do repositório.
2. Compare cada arquivo local com a definição remota de tabelas, constraints, políticas e funções. Para entradas do histórico sem SQL local, obtenha o SQL original da fonte que as aplicou. Marque itens como equivalentes somente após comparar efeitos, não pelo nome.
3. Não edite migrations antigas, não aplique a pasta inteira, não altere `supabase_migrations.schema_migrations` manualmente e não rode seeds em produção. Preserve os registros e confirme separadamente os itens de teste listados no briefing de publicação.
4. Registre o schema real reconciliado numa migration corretiva nova, revisada e idempotente. Aplique primeiro num projeto de staging com cópia/backup, confira RLS e o fluxo administrativo, e só então agende uma mudança de produção com rollback definido.

## Função de publicação agendada

Não existe fluxo funcional de agendamento comprovado no código e no banco. Não crie cron nem habilite `scheduled` por suposição. Antes de reativar a função, decida a identidade do scheduler e como ela satisfará RLS. A correção deve qualificar todos os objetos como `public.*`, fixar `SET search_path = ''`, usar `pg_catalog.now()`, e retirar execução de `PUBLIC`, `anon` e `authenticated`:

```sql
REVOKE ALL ON FUNCTION public.publish_scheduled_content()
  FROM PUBLIC, anon, authenticated;
```

Revise a função em uma migration nova. Se continuar `SECURITY DEFINER` para permitir execução pelo scheduler, use um proprietário técnico dedicado, sem login e com privilégios mínimos, mantenha `search_path` vazio e valide explicitamente o acesso às linhas sob RLS. Caso contrário, use `SECURITY INVOKER` e conceda ao papel do scheduler somente as permissões necessárias. Conceda execução apenas ao papel escolhido para o agendamento. Não execute o SQL acima isoladamente em produção antes de confirmar como a função é chamada e de definir o plano de substituição, pois isso pode interromper o job (que atualmente não foi encontrado).
