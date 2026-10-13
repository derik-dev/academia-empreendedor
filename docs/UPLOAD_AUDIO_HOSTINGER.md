# Áudio dos podcasts na Hostinger

Este guia prepara o endpoint de envio de MP3 e a pasta pública de áudio para `netpubli.com.br`. Os ficheiros do site continuam em `/academia/`; os áudios e a API ficam em pastas próprias, fora dessa pasta, para que uma publicação do site não os substitua.

## Antes de começar

No hPanel, confirme se já existem `public_html/api-academia` ou `public_html/media-academia`. **Não misture ficheiros nem substitua uma pasta existente sem confirmar primeiro.** Se algum destes nomes já estiver a ser utilizado, pare e peça ajuda para escolher outro caminho.

Faça uma cópia de segurança dos ficheiros atuais do site e destas pastas, se já existirem. No Gestor de Ficheiros da Hostinger, abra `public_html` e copie:

1. O conteúdo de `server/hostinger/api-academia/` para `public_html/api-academia/`.
2. O ficheiro `server/hostinger/media-academia/.htaccess` para `public_html/media-academia/.htaccess`.

As duas pastas novas ficam ao lado de `academia`, e não dentro de `public_html/academia/`. A pasta `media-academia` começará sem áudios; o endpoint cria as subpastas necessárias quando recebe o primeiro envio.

## Criar a configuração privada

1. No Gestor de Ficheiros, faça uma cópia de `public_html/api-academia/config.example.php` e chame-lhe `config.php`.
2. Edite **a cópia no servidor**, não o exemplo do repositório.
3. Preencha `SUPABASE_URL` com o URL do projeto Supabase e `SUPABASE_ANON_KEY` com a chave pública anon/publishable do projeto. Não use a service role key.
4. Em `ALLOWED_ORIGINS`, mantenha apenas a origem do site que abre o painel, normalmente `https://netpubli.com.br`. Se o painel também for usado em `https://www.netpubli.com.br`, inclua essa origem.
5. `MEDIA_DIR` é opcional: se a pasta `media-academia` estiver ao lado de `api-academia` dentro de `public_html`, pode deixar a chave comentada ou omiti-la — o endpoint resolve o caminho automaticamente usando `realpath(__DIR__ . '/../media-academia')`. Preencha apenas se a pasta estiver noutro local; nesse caso, indique o caminho absoluto mostrado pelo hPanel.
6. Mantenha `MAX_BYTES` em `157286400` (150 MiB) e `MEDIA_BASE_URL` em `https://netpubli.com.br/media-academia/`.

O `.htaccess` da API bloqueia o acesso web a `config.php` e `common.php`. O ficheiro real de configuração também está ignorado pelo Git; nunca o copie para o repositório nem envie a chave por mensagem.

## Aumentar os limites de PHP

No hPanel, abra as definições PHP do domínio `netpubli.com.br` (normalmente **Avançado → Configuração PHP** ou o editor de `php.ini`). Use estes valores, se o plano os permitir:

- `upload_max_filesize`: `160M`
- `post_max_size`: `165M`
- `max_execution_time`: `300`
- Versão do PHP: `8.1` ou superior

`post_max_size` deve ser maior do que `upload_max_filesize`, porque o pedido também inclui dados do formulário. Guarde as alterações no hPanel. A Hostinger pode aplicar limites máximos próprios; se não aceitar estes valores, use o maior valor permitido e ajuste o limite de envio no painel/build para ficar abaixo dele.

## Confirmar o endpoint

Depois de publicar o front-end preparado para esta API, experimente num terminal com um MP3 pequeno e uma sessão de administrador válida. Substitua o URL do endpoint, o token e o caminho do ficheiro:

```sh
curl -i -X POST \
  -H "Authorization: Bearer TOKEN_DE_ACESSO_DO_ADMIN" \
  -F "file=@/caminho/para/teste.mp3;type=audio/mpeg" \
  https://netpubli.com.br/api-academia/upload-audio.php
```

Uma resposta `201` contém JSON com `path`, `url`, `bytes` e `mime`. O `path` deve começar por `podcasts/AAAA/MM/` e não deve conter domínio. Sem token, o endpoint deve responder `401`; com uma conta que não é administradora, deve responder `403`. O token é privado: não o guarde num ficheiro partilhado nem o envie a terceiros.

## Cópias de segurança e reversão

Inclua `public_html/media-academia/` nas cópias de segurança regulares. Os MP3 são públicos por URL direta; o nome aleatório e longo dificulta adivinhação, mas não transforma o ficheiro em privado.

Para reverter uma publicação, restaure a versão anterior do site e retire a configuração das variáveis de áudio do build. Pode desativar `public_html/api-academia/` restaurando a cópia de segurança ou renomeando essa pasta. **Não apague `public_html/media-academia/` ao reverter:** os MP3 nela guardados podem continuar a ser referidos pelo banco. Preserve a pasta até confirmar que já não precisa desses ficheiros.
