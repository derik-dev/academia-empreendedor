-- Adiciona coluna de conteúdo aos artigos
alter table public.articles add column if not exists content text not null default '';

-- Conteúdo dos artigos
update public.articles set content = $content$
<p>A mentalidade não é algo que você tem ou não tem. É algo que você constrói, dia após dia, com escolhas pequenas e consistentes. Muitas pessoas acreditam que o sucesso de alguém começa com talento, sorte ou recursos. Mas o que separa quem realiza do que apenas deseja é, quase sempre, a forma como encaram os desafios.</p>

<h2>O que é, afinal, uma mentalidade vencedora?</h2>
<p>Não se trata de otimismo forçado nem de frases motivacionais coladas no espelho. Uma mentalidade vencedora é a capacidade de encarar a realidade como ela é — com seus obstáculos e imprevistos — e ainda assim escolher avançar. É sobre responsabilidade: parar de culpar o ambiente e começar a agir sobre o que está ao seu alcance.</p>
<p>Carol Dweck, psicóloga de Stanford, popularizou o conceito de "growth mindset" — a mentalidade de crescimento. Pessoas com esse perfil acreditam que habilidades podem ser desenvolvidas. Ao contrário de quem tem uma "fixed mindset" e acredita que talentos são inatos e imutáveis.</p>

<h2>As três decisões diárias que moldam quem você é</h2>
<p>Primeiro: decida como vai interpretar os eventos. Um revés pode ser um fracasso definitivo ou uma lição valiosa. A interpretação é sua. Segundo: decida em quem vai focar a sua energia. Em pessoas que drenam ou naquelas que constroem? Terceiro: decida que tipo de pessoa você quer ser agora — não quando as condições forem perfeitas.</p>
<ul>
  <li>Leia pelo menos 15 minutos por dia sobre crescimento pessoal</li>
  <li>Substitua "eu não consigo" por "ainda não aprendi como"</li>
  <li>Anote uma lição aprendida ao final de cada dia</li>
  <li>Cerque-se de pessoas que puxam você para cima</li>
</ul>

<h2>Comece pequeno, mas comece hoje</h2>
<p>Não espere estar motivado para agir. A motivação segue a ação, não o contrário. Comece com um passo minúsculo. Leia uma página. Acorde dez minutos mais cedo. Escreva uma ideia. O importante é criar evidências para si mesmo de que você é capaz de mudar. E com cada pequena vitória, a mentalidade se fortalece.</p>
$content$ where slug = 'mentalidade-que-muda-sua-vida';

update public.articles set content = $content$
<p>Produtividade não é sobre fazer mais coisas — é sobre fazer as coisas certas, no momento certo, com a energia certa. Em um mundo de notificações constantes e listas de tarefas intermináveis, aprender a ser produtivo de verdade se tornou uma habilidade essencial.</p>

<h2>O mito da multitarefa</h2>
<p>Pesquisas mostram que o cérebro humano não consegue realizar duas tarefas cognitivas ao mesmo tempo. O que chamamos de multitarefa é, na verdade, troca rápida de foco — e cada troca tem um custo cognitivo. Pessoas que acreditam ser boas em multitarefa são, ironicamente, as que mais sofrem com distração.</p>
<p>A solução é o foco singular: escolha uma tarefa, elimine distrações, e dedique um bloco de tempo exclusivo a ela. Técnicas como o Pomodoro (25 minutos de foco + 5 de descanso) ajudam a treinar essa capacidade.</p>

<h2>Os métodos que realmente funcionam</h2>
<ul>
  <li><strong>MIT (Most Important Task):</strong> identifique as 3 tarefas mais importantes do dia antes de abrir o e-mail</li>
  <li><strong>Time blocking:</strong> reserve blocos na agenda para trabalho profundo, sem interrupções</li>
  <li><strong>Regra dos 2 minutos:</strong> se uma tarefa leva menos de 2 minutos, faça agora</li>
  <li><strong>Revisão semanal:</strong> todo domingo, planeje a semana e ajuste prioridades</li>
</ul>

<h2>Energia é mais importante do que tempo</h2>
<p>Você pode ter 24 horas no dia, mas se estiver com baixa energia, vai produzir muito menos do que poderia em 4 horas descansado. Sono, alimentação, exercício e pausas não são luxos — são a base da produtividade sustentável. Cuide do motor antes de acelerar.</p>
$content$ where slug = 'metodos-produtividade';

update public.articles set content = $content$
<p>Nenhuma faculdade, curso ou livro me preparou para os erros que cometi nos primeiros anos de empreendedorismo. Mas foram exatamente esses erros — dolorosos, caros e às vezes humilhantes — que me ensinaram o que realmente importa para construir um negócio de verdade.</p>

<h2>O erro mais caro: achar que o produto fala por si mesmo</h2>
<p>Meu primeiro negócio tinha um produto excelente. Eu tinha certeza disso. Mas ficou meses sem vender porque eu achava que qualidade bastava. A verdade é que sem distribuição, marketing e uma proposta de valor clara, o melhor produto do mundo fica invisível. Aprendi que vender é tão importante quanto criar.</p>

<h2>Sócio errado quase me custou tudo</h2>
<p>Entrar em sociedade por afinidade pessoal, e não por complementaridade de habilidades e alinhamento de valores, é um dos erros mais comuns. Quando as coisas começam a pressionar, fica claro se o sócio tem o mesmo comprometimento, a mesma visão e a mesma disposição de sacrifício que você. Escolha com muito cuidado.</p>
<ul>
  <li>Defina papéis e responsabilidades de cada sócio por escrito</li>
  <li>Alinhe expectativas sobre retiradas, crescimento e saída desde o início</li>
  <li>Busque sócios que tenham habilidades que você não tem</li>
</ul>

<h2>O que aprendi acertando</h2>
<p>O maior acerto foi aprender a ouvir o cliente antes de construir. Validar hipóteses com o mínimo de investimento possível. Lançar rápido, aprender rápido e ajustar. O segundo acerto foi investir em pessoas. O negócio que cresce de verdade é aquele que consegue funcionar sem depender 100% do fundador.</p>
<p>Errar faz parte. Mas errar com consciência — aprendendo, ajustando e seguindo — é o que separa quem desiste de quem chega lá.</p>
$content$ where slug = 'licoes-de-negocios';

update public.articles set content = $content$
<p>A estagnação não aparece de repente. Ela se instala aos poucos — em decisões adiadas, em escolhas feitas por medo, em rotinas que não levam a lugar nenhum. Se você sente que está no lugar há tempo demais, este artigo é para você.</p>

<h2>Por que tomamos decisões ruins</h2>
<p>Nossa mente tem dois sistemas de processamento: um rápido, emocional e automático; e um lento, racional e deliberado. A maioria das nossas decisões é tomada pelo sistema rápido — baseado em heurísticas, vieses e emoções do momento. O resultado? Escolhas que parecem certas na hora, mas que não resistem a uma análise mais fria.</p>
<p>Alguns dos vieses mais prejudiciais: o viés de confirmação (buscar informações que confirmam o que já acreditamos), a aversão à perda (medo de perder paralisa mais do que a esperança de ganhar motiva) e o custo afundado (continuar em algo ruim porque "já investiu demais").</p>

<h2>Um framework simples para decidir melhor</h2>
<ul>
  <li><strong>Defina o problema real:</strong> muitas vezes a decisão difícil é sintoma de um problema maior não resolvido</li>
  <li><strong>Liste as opções reais:</strong> a maioria das situações tem mais de duas saídas possíveis</li>
  <li><strong>Projete 10 anos:</strong> como você vai se sentir sobre essa decisão daqui a 10 anos?</li>
  <li><strong>Consulte alguém que já passou por isso:</strong> experiência alheia é o atalho mais subestimado</li>
</ul>

<h2>Sair da estagnação exige uma decisão incômoda</h2>
<p>Não existe saída da estagnação sem desconforto. A zona de conforto é confortável por definição — e sair dela vai gerar resistência interna e externa. Mas o custo de ficar parado é sempre maior do que o custo de agir. Tome a decisão. Ajuste no caminho.</p>
$content$ where slug = 'decisoes-melhores';

update public.articles set content = $content$
<p>Dinheiro não é tabu — é ferramenta. E como toda ferramenta, o resultado depende de como você a usa. A maioria das pessoas não tem problemas financeiros por falta de renda, mas por falta de hábitos e estrutura para gerir o que já entra.</p>

<h2>O hábito mais importante: pagar a si mesmo primeiro</h2>
<p>Antes de pagar qualquer conta, reserve uma porcentagem fixa para investimento — mesmo que seja 5% no início. Automatize essa transferência para que ela aconteça no dia em que o salário cai. Quem guarda o que sobra, não guarda nada. Quem guarda antes de gastar, constrói patrimônio.</p>

<h2>Entenda para onde o dinheiro vai</h2>
<p>Durante 30 dias, anote todos os seus gastos — sem julgamento. Você vai se surpreender com para onde o dinheiro realmente vai. Aplicativos de controle financeiro ajudam, mas uma planilha simples já resolve. O objetivo não é se punir, mas ter clareza para fazer escolhas conscientes.</p>
<ul>
  <li>Separe seus gastos em categorias: moradia, alimentação, transporte, lazer, investimentos</li>
  <li>Identifique quais gastos geram valor real e quais são impulso</li>
  <li>Defina um teto para gastos variáveis com base na sua renda líquida</li>
  <li>Revise mensalmente e ajuste sem rigidez excessiva</li>
</ul>

<h2>Investir não é para ricos — é para quem quer ser rico</h2>
<p>Você não precisa de muito dinheiro para começar a investir. Precisa de constância. Mesmo pequenos valores, investidos regularmente ao longo de anos, geram resultados expressivos graças aos juros compostos. O tempo no mercado é mais importante do que o timing do mercado. Comece agora com o que tem.</p>
$content$ where slug = 'habitos-financeiros';

update public.articles set content = $content$
<p>Você já tentou criar um hábito — academia, leitura, meditação — e desistiu depois de algumas semanas? Não é falta de força de vontade. A ciência explica por que os hábitos são difíceis de criar e o que realmente funciona para torná-los permanentes.</p>

<h2>Como os hábitos funcionam no cérebro</h2>
<p>Todo hábito segue um loop de três partes: gatilho, rotina e recompensa. O gatilho é o que aciona o comportamento. A rotina é o próprio comportamento. A recompensa é o que faz o cérebro querer repetir. Para criar um novo hábito, você precisa identificar um gatilho claro e conectá-lo a uma recompensa genuína.</p>
<p>James Clear, autor de "Hábitos Atômicos", propõe que o segredo está em tornar o hábito óbvio, atraente, fácil e satisfatório. Cada um desses elementos remove uma barreira diferente para a adoção do comportamento.</p>

<h2>Estratégias que realmente funcionam</h2>
<ul>
  <li><strong>Empilhamento de hábitos:</strong> conecte o novo hábito a um que já existe ("depois de tomar café, vou meditar 5 minutos")</li>
  <li><strong>Reduza a fricção:</strong> deixe o livro na cabeceira, o tênis ao lado da cama, a garrafa d'água na mesa</li>
  <li><strong>Comece ridiculamente pequeno:</strong> quer correr? Comece com 2 minutos. O objetivo inicial é aparecer, não performar</li>
  <li><strong>Não quebre a corrente:</strong> marque cada dia de execução num calendário e tente não quebrar a sequência</li>
</ul>

<h2>Falhar é parte do processo</h2>
<p>Todo mundo falha. A diferença entre quem mantém o hábito e quem desiste está na resposta à falha. Nunca perca dois dias seguidos. Um dia perdido é um acidente. Dois dias seguidos é o começo de um novo hábito — o de não fazer. Seja gentil consigo mesmo e volte no dia seguinte.</p>
$content$ where slug = 'construir-habitos';

update public.articles set content = $content$
<p>Crescer na carreira não é questão de sorte nem apenas de competência técnica. É uma combinação de visibilidade, posicionamento e relacionamentos construídos com intencionalidade. Quem espera ser descoberto espera muito tempo — ou espera em vão.</p>

<h2>Seja conhecido por algo específico</h2>
<p>No início da carreira, generalismo tem valor. Com o tempo, especialização é o que diferencia. Identifique a interseção entre o que você faz muito bem, o que o mercado valoriza e o que te dá energia. Construa reputação nessa área. Seja a pessoa que as pessoas lembram quando surge aquela oportunidade específica.</p>

<h2>Entregue mais do que esperam</h2>
<p>A fórmula mais simples para crescer é consistentemente entregar acima do esperado. Não de forma servil, mas com excelência genuína. Quem entrega bem ganha confiança. Quem ganha confiança ganha autonomia. Quem tem autonomia cresce. É um ciclo virtuoso que começa com a qualidade do que você faz hoje.</p>
<ul>
  <li>Antecipe problemas antes que se tornem crises</li>
  <li>Comunique seu progresso — não espere ser perguntado</li>
  <li>Busque feedback ativo, não apenas quando é obrigatório</li>
  <li>Invista em aprendizado contínuo, mesmo sem incentivo da empresa</li>
</ul>

<h2>Relacionamentos constroem carreiras</h2>
<p>As melhores oportunidades raramente aparecem em portais de emprego. Aparecem por indicação, por conversa, por confiança construída ao longo do tempo. Cultive relações genuínas — não networking transacional, mas conexões reais com pessoas que você respeita. Ajude sem esperar retorno imediato. O retorno vem, de formas que você não consegue prever.</p>
<p>Sua carreira é um projeto de longo prazo. Pense em anos, não em meses. E comece a construir hoje o que vai colher amanhã.</p>
$content$ where slug = 'crescimento-carreira';
