# Academia do Empreendedor

Plataforma privada de conteúdos construída com React, Vite e TypeScript. O Supabase Auth gere as contas e sessões. Neste momento, qualquer conta autenticada pode entrar; o login não consulta compras nem a Hotmart.

## Começar

1. Instale as dependências com `npm install`.
2. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (ou a publishable key do projeto).
3. No Supabase, confirme que o Email/Password está ativo e que as contas necessárias existem em Authentication → Users.
4. Aplique, nesta ordem, `supabase/migrations/202609300001_initial_content_schema.sql` e `supabase/migrations/202610010001_course_notes.sql` no SQL Editor. A segunda cria o banco de notas privadas por utilizador e curso.
5. Aplique também `supabase/migrations/202610020001_admin_course_dashboard.sql` no SQL Editor.
6. Execute `npm run dev`.

Use apenas a chave pública anon/publishable no frontend. Nunca coloque `service_role` em variáveis `VITE_*`.
## Painel administrativo

A rota `/admin` exige uma conta com acesso concedido na tabela `public.admin_users`. O login aceita `ericeenio` (associado a `ericeenio@gmail.com`) ou o e-mail. Ao criar esse usuário no Supabase Auth, a migration concede o papel administrativo automaticamente. Se a conta já existir quando a migration for aplicada, ela também será promovida. Cadastre ou redefina a senha diretamente no Supabase Auth; ela não fica guardada no frontend.

```sql
insert into public.admin_users (user_id)
select id from auth.users where lower(email) = 'ericeenio@gmail.com'
on conflict (user_id) do nothing;
```

O nome de utilizador `ericeenio` precisa estar associado a um e-mail do Supabase Auth. A senha deve ser cadastrada no próprio Supabase, nunca no código do frontend.

## Scripts

- `npm run dev` — servidor local.
- `npm run lint` — ESLint.
- `npx tsc --noEmit` — verificação TypeScript.
- `npm run build` — build de produção.

## Conteúdo pendente

O banner principal e a tela de login usam imagens locais criadas para representar as cenas do briefing. A logo do Empreendedor Sem Dor está em `public/images/logo.webp` e é aplicada no banner. As capas dos cursos também são assets locais. Fotos oficiais dos fundadores, links dos conteúdos, link do WhatsApp, regras finais de acesso e configuração das entrevistas ainda aguardam confirmação. Os dados de conteúdo ficam em `src/data/content.ts`.

## Hotmart — integração futura

Quando a regra comercial estiver confirmada, a integração entra numa Edge Function ou endpoint backend autenticado que valida a assinatura do webhook oficial da Hotmart, correlaciona o comprador com a conta Supabase e regista a concessão/revogação de acesso. O segredo e credenciais ficam apenas no backend. O frontend continua a usar Supabase Auth; uma futura verificação de entitlement pode ser feita pelo backend/RLS após definição da duração e natureza do acesso. Não há webhook, URL ou segredo fictício implementado. Valor informado no briefing: 177 €.
