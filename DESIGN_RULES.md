# Regras de design — Academia do Empreendedor

## Direção visual

- Manter fundos escuros em toda a plataforma: `#05080D` como base, `#080D14` em superfícies e `#0B111B` nos cards.
- Em superfícies escuras, usar texto branco puro (`#FFFFFF`) ou azul forte (`#24A8FF`), sempre opaco e com alto contraste. Não usar cinzas apagados ou texto com baixa opacidade.
- Reservar azul, verde, violeta e âmbar para acentos, estados e ações. Não usar cores de acento como fundo dominante.
- Manter bordas discretas, contraste nítido, espaçamento consistente e foco de teclado visível.

## Escala tipográfica de conteúdo

Os tokens globais ficam no `:root` de `src/styles.css` e devem ser usados para manter o mesmo padrão em todas as páginas:

| Papel | Token | Tamanho |
| --- | --- | ---: |
| Títulos de conteúdo, como títulos de cards e empty states | `--type-content-title` | 26 px |
| Texto corrido e descrições | `--type-content-body` | 17 px |
| Autoria, valores de perfil e chamadas de ação | `--type-content-detail` | 19 px |
| Labels auxiliares e metadados compactos | `--type-ui-small` | 14 px |
| Navegação principal | `--type-nav` | 15 px (12 px até 1180 px) |

Títulos de página e o headline do hero continuam maiores para preservar a hierarquia editorial. O destaque secundário do hero usa `--type-content-title`, e sua descrição usa `--type-content-body`. Eyebrows, navegação, badges e controles compactos também podem usar tamanhos menores quando o espaço e a função pedirem.

## Aplicação

- Usar os tokens nos componentes compartilhados e nas páginas: cards, descrições de seção, estados vazios, blog, avisos, perfil, login e ações principais.
- Em telas pequenas, permitir que títulos e descrições quebrem linha. Não reduzir o contraste para fazer o texto caber.
- Não aplicar a escala de conteúdo ao texto decorativo dentro da representação visual do smartphone; essa interface ilustrativa deve continuar compacta.
- Ao criar novos componentes de conteúdo, escolher um dos papéis da escala antes de adicionar um tamanho isolado.
