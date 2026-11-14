# Alterações de 04/11/2026 (Claude)

Backup dos arquivos originais: `C:\Projetos-Antigravity\clientes\tikura\_backups\tikuraflix-2026-11-04\`.

## 1. Catálogo × site oficial (https://www.tikura.com.br/tikuraflix/)
Conferido em 04/11: os 28 cursos do site estão no Tikuraflix, na mesma ordem, com os mesmos títulos e as capas do site.
Nenhuma correção foi necessária. O seed e o banco não foram alterados.
Observação: no site, o curso 19 aparece como "Arte de Benzer com os Pretos Velho" (sem o "s"). No Tikuraflix ficou "Pretos Velhos".

## 2. Banners full entre as fileiras (novo)
- `src/data/banners.ts`: lista editável com 4 banners (Imersão da Magia, Roda de Benzimento, Laroyê e A Sacerdotisa).
  Cada banner traz o curso, a fileira depois da qual aparece, os textos, o CTA e a cor de fundo.
- `src/components/FeatureBanner.tsx`: banner de ponta a ponta. A arte fica nítida de um lado e a chamada do outro, alternando o lado a cada banner.
  O botão "Ver o trailer" toca o trailer do YouTube dentro do próprio banner.
  No celular, a imagem fica em cima, com o texto centralizado embaixo em cor sólida e os botões em largura total.
- O banner só aparece se o curso estiver publicado e a fileira existir.
- Prompts para gerar artes próprias sem texto: `PROMPTS-BANNERS-GEMINI.md`.

## 3. Tipografia e exposição dos cursos
- Cards: legenda sempre visível abaixo da capa, no desktop e no celular, com o tipo (Imersão/Roda/Aulão…, 14 px dourado) e os temas (17 px branco).
  Antes, no celular, não aparecia nenhuma informação além da capa.
- "Qual caminho te chama?": os chips mostram a quantidade de títulos e quebram em duas linhas no desktop (antes o último ficava escondido).
- Títulos das fileiras maiores.
- Mínimos do Publia: textos de apoio ≥14 px. A faixa de números, os textos da assinatura (destaques, tagline, pagamento) e o FAQ no celular passaram de 8–13 px para 14–17 px.
- Texto em fundo escuro em cor clara (antes alguns eram bege/cinza apagado): menu, FAQ, rodapé, legendas.
- Botões principais com no mínimo 56 px de altura.
- "Continuar assistindo" na home, logo após os números, só para quem está logado e já começou alguma aula. Usa a mesma regra da Minha área.
- Página da imersão: a capa 16:9 aparece inteira (antes era cortada em retrato), os temas aparecem como etiquetas separadas (antes saíam colados: "BenzimentoProteçãoCura")
  e o topo não fica mais escondido atrás do menu.

## Arquivos
- Alterados: `src/app/page.tsx`, `src/components/PosterCard.tsx`, `src/app/tikuraflix.css`.
  Todo o CSS novo está num bloco no fim do arquivo, marcado "AJUSTES 2026-11-04"; para desfazer, apague o bloco.
- Novos: `src/components/FeatureBanner.tsx`, `src/data/banners.ts`, `PROMPTS-BANNERS-GEMINI.md`, este arquivo.
- Não alterados: `src/lib/*`, actions, API, seed, banco, `.env`.

Build conferido (`next build`) sem erros. Prints conferidos em 1440 e 375 px.

- Página da imersão: texto do botão de compra encurtado de "Quero o acervo completo" para "Quero o acervo", para caber em uma linha no celular (regra Publia). Original em _backups.
