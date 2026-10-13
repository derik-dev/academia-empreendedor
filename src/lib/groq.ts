import { adminSupabase } from './supabase'

async function callAI(
  messages: { role: 'system' | 'user'; content: string }[],
  jsonMode = false,
): Promise<string> {
  if (!adminSupabase) throw new Error('O painel administrativo não está configurado.')
  const { data, error } = await adminSupabase.functions.invoke('openai-proxy', {
    body: { messages, jsonMode },
  })
  if (error) {
    let detail = ''
    try { const body = await (error as { context?: { json?: () => Promise<{ error?: { message?: string } }> } })?.context?.json?.(); detail = body?.error?.message ?? '' } catch {}
    throw new Error(detail || error.message || 'Não foi possível acessar o serviço de IA.')
  }
  const result = data as { choices?: { message?: { content?: string } }[]; error?: { message?: string } } | null
  if (result?.error?.message) throw new Error(result.error.message)
  return result?.choices?.[0]?.message?.content ?? ''
}

export async function sortLessonsByAI(lessons: { id: string; title: string }[]): Promise<string[]> {
  const list = lessons.map((l, i) => `${i}: ${l.title}`).join('\n')
  const raw = await callAI(
    [
      {
        role: 'system',
        content: `Você recebe uma lista de títulos de aulas de uma minissérie (cada linha: índice_atual: título). Determine a ordem lógica de exibição — considere numeração ("aula 01", "ep 3"), palavras como "introdução", "abertura", "encerramento", "bônus" e contexto. Retorne um objeto JSON: {"order": [índices na ordem correta]}. Exemplo: {"order": [2, 0, 1, 3]}`,
      },
      { role: 'user', content: list },
    ],
    true,
  )
  // strip markdown code fences if present
  const clean = raw.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim()
  let parsed: unknown
  try { parsed = JSON.parse(clean) } catch { throw new Error(`IA retornou resposta não-JSON: ${clean.slice(0, 120)}`) }
  const order: number[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as Record<string, unknown>)?.order)
      ? (parsed as { order: number[] }).order
      : (() => { throw new Error(`Formato inesperado da IA: ${JSON.stringify(parsed).slice(0, 120)}`) })()
  return order.map((i: number) => lessons[i]?.id).filter(Boolean) as string[]
}

export async function correctText(text: string): Promise<string> {
  return callAI([
    {
      role: 'system',
      content:
        'Você é um revisor de textos em português. Corrija apenas erros ortográficos, gramaticais e de pontuação — sem alterar o estilo, estrutura ou conteúdo. Retorne somente o texto corrigido, sem comentários adicionais.',
    },
    { role: 'user', content: `Corrija o texto a seguir:\n\n${text}` },
  ])
}

export interface GenerateParams {
  tema: string
  conhecimento: string
  tempoLeitura: string
}

export interface GeneratedArticle {
  title: string
  excerpt: string
  content: string
  readTime: string
}

export async function generateArticle(p: GenerateParams): Promise<GeneratedArticle> {
  const mins = Math.max(1, parseInt(p.tempoLeitura) || 5)
  const targetChars = mins * 2000

  const raw = await callAI(
    [
      {
        role: 'system',
        content: `Você é o redator-chefe da Academia do Empreendedor — plataforma premium de educação em empreendedorismo e mentalidade. Seu trabalho é escrever artigos de blog completos, profundos e bem estruturados, no estilo de publicações como Harvard Business Review, Exame, Forbes Brasil e blogs do Cortex.

REGRAS OBRIGATÓRIAS:
- Escreva um artigo COMPLETO, não um resumo nem uma lista de dicas
- O campo "content" deve ter cerca de ${targetChars} caracteres SEM contar espaços (desconsidere também as tags HTML na contagem) — essa métrica equivale a ${mins} minuto${mins > 1 ? 's' : ''} de leitura real (2.000 caracteres sem espaços por minuto)
- Estrutura obrigatória: abertura com gancho (história, dado ou provocação), desenvolvimento com 3 a 5 seções com subtítulos <h2>, cada seção com pelo menos 2 parágrafos densos, e fechamento com conclusão reflexiva
- Use exemplos reais ou hipotéticos concretos para ilustrar os pontos
- Alterne entre parágrafos narrativos, análises e momentos mais diretos
- Use <strong> para destacar conceitos-chave (não exagere)
- Não use bullet points simples — prefira prosa argumentativa
- Tom: direto, inteligente, sem corporativês, que fala com quem já empreende ou quer empreender
- Idioma: português do Brasil

Responda SOMENTE com JSON válido neste formato exato:
{
  "title": "Título forte e específico (máx 80 chars, não genérico)",
  "excerpt": "Frase de abertura que prende — 1 ou 2 frases, máx 200 chars, sem ponto final",
  "content": "Artigo completo em HTML (use <h2>, <p>, <strong>, <em>). Alvo: ~${targetChars} caracteres totais.",
  "readTime": "${mins} min de leitura"
}`,
      },
      {
        role: 'user',
        content: `Escreva um artigo completo sobre: ${p.tema}${p.conhecimento.trim() ? `\n\nContexto e referências a considerar:\n${p.conhecimento}` : ''}`,
      },
    ],
    true,
  )

  const parsed = JSON.parse(raw) as Partial<GeneratedArticle>
  return {
    title: parsed.title ?? '',
    excerpt: parsed.excerpt ?? '',
    content: parsed.content ?? '',
    readTime: parsed.readTime ?? `${mins} min de leitura`,
  }
}
