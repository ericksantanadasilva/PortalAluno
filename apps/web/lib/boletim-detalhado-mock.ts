export type QuestaoDetalhada = {
  numero: number;
  disciplina: string;
  tema: string;
  taxa_acerto_turma: number;
  resultado_aluno: boolean;
};

export type DisciplinaResumo = {
  nome: string;
  acertos: number;
  total: number;
};

export type BoletimDetalhadoData = {
  resumo_turma: {
    conceito_medio: string;
    maior_acertos: number;
    media_acertos: number;
    menor_acertos: number;
  };
  resultado_aluno: {
    nome: string;
    exame: string;
    acertos: number;
    total: number;
    percentual: number;
    conceito: string;
  };
  acertos_disciplina: DisciplinaResumo[];
  questoes: QuestaoDetalhada[];
};

const errosAluno = new Set([1, 3, 5, 7, 11, 16, 17, 20, 21, 25, 26, 27, 30, 38, 42, 43, 44, 48, 49, 53, 56, 58]);

const disciplinasDistribuicao = [
  { nome: "Texto Base", total: 8, start: 1, end: 8 },
  { nome: "Linguagens", total: 14, start: 9, end: 22 },
  { nome: "Língua Estrangeira", total: 5, start: 23, end: 27 },
  { nome: "Matemática", total: 7, start: 28, end: 34 },
  { nome: "Biologia", total: 4, start: 35, end: 38 },
  { nome: "Química", total: 4, start: 39, end: 42 },
  { nome: "Física", total: 4, start: 43, end: 46 },
  { nome: "Geografia", total: 7, start: 47, end: 53 },
  { nome: "História", total: 7, start: 54, end: 60 },
];

const temasExemplo = [
  "Interpretação de Texto", "Coesão e Coerência", "Figuras de Linguagem", "Variação Linguística",
  "Análise do Discurso", "Funções da Linguagem", "Sintaxe", "Semântica",
  "Verbos", "Orações Subordinadas", "Classes de Palavras", "Pontuação",
  "Vocabulary Context", "Reading Comprehension", "Grammar Rules", "Idioms",
  "Progressão Aritmética", "Funções do 1º Grau", "Geometria Plana", "Probabilidade e Estatística",
  "Trigonometria", "Geometria Espacial", "Análise Combinatória", "Logaritmos",
  "Citologia", "Genética", "Ecologia", "Evolução",
  "Estequiometria", "Termoquímica", "Nox, Reações de Oxidorredução", "Química Orgânica",
  "Cinemática", "Dinâmica", "Eletromagnetismo", "Termodinâmica",
  "Geopolítica", "Cartografia", "Geografia Agrária", "Climatologia",
  "Urbanização", "Indústria", "Relevo e Hidrografia", "Brasil Colônia",
  "Era Vargas", "Guerra Fria", "Revolução Francesa", "Idade Média",
  "Roma Antiga", "Grécia Antiga", "Segunda Guerra Mundial", "Renascimento"
];

const gerarQuestoes = (): QuestaoDetalhada[] => {
  const questoes: QuestaoDetalhada[] = [];
  for (let i = 1; i <= 60; i++) {
    const disciplina = disciplinasDistribuicao.find(d => i >= d.start && i <= d.end)?.nome || "Geral";
    
    // Distribuir as taxas de acerto simulando facil/media/dificil
    let taxa = 0;
    if (i % 3 === 0) taxa = Math.floor(Math.random() * 20) + 10; // Difícil (10-30%)
    else if (i % 2 === 0) taxa = Math.floor(Math.random() * 30) + 45; // Média (45-75%)
    else taxa = Math.floor(Math.random() * 25) + 75; // Fácil (75-100%)

    // Algumas específicas do exemplo: Q5, Q8, Q11, Q30
    if (i === 5) { taxa = 8; }
    if (i === 8) { taxa = 96; }
    if (i === 11) { taxa = 21; }
    if (i === 30) { taxa = 73; }

    const tema = temasExemplo[i % temasExemplo.length];

    questoes.push({
      numero: i,
      disciplina,
      tema: `Q${i}: ${tema}`,
      taxa_acerto_turma: taxa,
      resultado_aluno: !errosAluno.has(i),
    });
  }
  return questoes;
};

export const boletimDetalhadoMock: BoletimDetalhadoData = {
  resumo_turma: {
    conceito_medio: "A",
    maior_acertos: 56,
    media_acertos: 44,
    menor_acertos: 7,
  },
  resultado_aluno: {
    nome: "Agatha Maria Silva de Oliveira",
    exame: "BOLETIM EQ 04 - Exame de Qualificação",
    acertos: 38,
    total: 60,
    percentual: 63,
    conceito: "B",
  },
  acertos_disciplina: [
    { nome: "Texto Base", acertos: 4, total: 8 },
    { nome: "Linguagens", acertos: 9, total: 14 },
    { nome: "Língua Estrangeira", acertos: 2, total: 5 },
    { nome: "Matemática", acertos: 6, total: 7 },
    { nome: "Biologia", acertos: 2, total: 4 },
    { nome: "Química", acertos: 3, total: 4 },
    { nome: "Física", acertos: 3, total: 4 },
    { nome: "Geografia", acertos: 4, total: 7 },
    { nome: "História", acertos: 5, total: 7 },
  ],
  questoes: gerarQuestoes(),
};
