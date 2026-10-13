# Academia do Empreendedor

Aplicação de conteúdos feita com React, TypeScript e Vite, com autenticação, banco de dados e armazenamento no Supabase.

## Desenvolvimento local

1. Instale as dependências: `npm install`.
2. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os valores públicos do projeto Supabase. A chave anon/publishable é destinada ao cliente e não concede privilégios administrativos por si só.
3. Inicie a aplicação com `npm run dev`.

Nunca use chaves secretas, `service_role` ou `OPENAI_API_KEY` em variáveis `VITE_*`. O segredo da OpenAI pertence apenas ao ambiente da Edge Function. Para desenvolvimento local, configure `OPENAI_API_KEY` em `supabase/functions/.env`; no projeto remoto, use os secrets das Edge Functions. O proxy exige sessão administrativa.

## Endereços e publicação

A aplicação está configurada para ser publicada sob `/plataforma/`. O `base` do Vite, o `basename` do React Router e o fallback do Apache seguem esse prefixo. Publique os arquivos de `dist/` no diretório web correspondente a `/plataforma/`. A página de vendas em `/academia` é independente e não deve ser sobrescrita por esse bundle.

## Banco de dados e migrations

As migrations versionadas estão em `supabase/migrations/`. O histórico remoto diverge dos nomes e versões locais e contém alterações sem correspondência local clara. **Não aplique a pasta inteira em produção nem marque migrations como executadas antes de reconciliar o schema.** Consulte [`docs/SUPABASE_MIGRATION_RECONCILIATION.md`](docs/SUPABASE_MIGRATION_RECONCILIATION.md), que registra as divergências observadas e um procedimento seguro. Nenhuma migration remota deve ser aplicada sem backup e comparação do schema.

As migrations existentes incluem schema e dados de exemplo. Confirme quais dados são legítimos antes de uma publicação real. Há registros de teste já publicados no banco; não foram alterados durante esta revisão.

## Scripts

- `npm run dev` — servidor local Vite.
- `npm run lint` — análise ESLint.
- `npm run build` — verificação TypeScript e bundle de produção.
- `npm run preview` — pré-visualização local do bundle.

## Administração e segurança

O painel administrativo usa uma sessão Supabase separada e exige que o usuário esteja cadastrado em `public.admin_users`. O helper `public.is_academy_admin()` é usado para autorizar operações administrativas. O proxy de IA também valida a sessão e esse papel no servidor, limita tamanho e frequência de solicitações, e fixa modelo e limite de saída.

Configuração local do gateway: `supabase/config.toml` exige JWT válido em `openai-proxy`. Essa configuração e o código alterado neste repositório ainda precisam ser publicados na Edge Function para afetar o projeto remoto. O código usa `SUPABASE_URL`, `SUPABASE_ANON_KEY` (ou `SUPABASE_PUBLISHABLE_KEY`) e `OPENAI_API_KEY` no ambiente da função; não usa a chave de serviço.

O limite de frequência do proxy é aplicado por instância da função; ele ajuda a limitar abuso, mas não substitui rate limiting compartilhado para limites globais de custo.

## Pendências antes da publicação

Confirme com a equipe se os registros publicados `Teste`, `Teste podcast` e `Teste Entrevista` devem ser removidos. O banco também tem somente uma aula na tabela `lessons`, vinculada ao curso de teste. Esta revisão não alterou nem apagou conteúdo. O fluxo de agendamento segue desabilitado até a reconciliação do banco documentada acima.

## Verificação

Execute `npm run lint` e `npm run build` antes de enviar alterações. Não há runner de testes automatizados configurado. Confira manualmente as rotas administrativas e a implantação sob `/plataforma/`.
