// ──────────────────────────────────────────────────────────
//  @repo/database-mocks — Tipagens & Dados Centralizados
// ──────────────────────────────────────────────────────────

// ── Tenant ────────────────────────────────────────────────
export type TenantConfig = {
  slug: string;
  nome: string;
  logo_url: string;
  cor_primaria: string;   // HSL para Tailwind (ex: "22 80% 30%")
  cor_secundaria: string; // HSL para Tailwind
  background_login: string;
};

// ── Aluno ─────────────────────────────────────────────────
export type AlunoProfile = {
  matricula: string;
  nome: string;
  turma: string;
};

// ── Boletim Simulados ─────────────────────────────────────
export type StatusQuestao = "Acertou" | "Errou";

export type QuestaoSimulado = {
  numero: number;
  tema: string;
  resposta_aluno: string;
  resposta_correta: string;
  status: StatusQuestao;
  taxa_acerto_turma: number;
};

// ── Abonos ────────────────────────────────────────────────
export type TipoAbono = "Atestado Médico" | "Abono Pedagógico";

export type Abono = {
  id: string;
  tipo: TipoAbono;
  descricao: string;
  data_inicio: string;
  data_fim: string;
};

// ── Boletim Multi-Formato ─────────────────────────────────
export type TipoSimulado = "UERJ" | "ENEM" | "ENEM_PARCIAL" | "DISCURSIVO";

export interface DisciplinaDesempenho {
  nome: string;
  acertos: number;
  total: number;
}

export interface TemaRevisao {
  disciplina: string;
  tema: string;
  questao: number;
}

export interface RaioXQuestao {
  numero: number;
  disciplina: string;
  tema: string | undefined;
  taxa_acerto_turma: number;
  resultado_aluno: boolean;
}

export interface BoletimData {
  aluno: {
    nome: string;
    matricula: string;
    turma: string;
  };
  simulado: {
    tipo: TipoSimulado;
    titulo: string;
    data: string;
    totalQuestoes: number;
  };
  resultadoTime: {
    mediaTurma: number;
    maiorNota: number;
    menorNota: number;
    conceitoMedioTurma?: string;
  };
  destaqueGeral: {
    acertos: number;
    total: number;
    percentual: number;
    /** UERJ: Conceito A/B/C/D */
    conceitoUerj?: string;
    /** Discursiva: nota decimal (ex: "16.5") */
    notaTotalDecimal?: string;
    /** ENEM: notas TRI por área */
    tri?: {
      linguagens: number;
      humanas: number;
      naturezas: number;
      matematica: number;
      redacao: number;
    };
  };
  desempenhoPorDisciplina: DisciplinaDesempenho[];
  temasParaRevisar: TemaRevisao[];
  /** Se undefined/null = gráfico oculto (ENEM_PARCIAL, DISCURSIVO) */
  raioXQuestoes?: RaioXQuestao[];
}

// ── Helpers para gerar raio-x ─────────────────────────────
const errosAgatha = new Set([1, 3, 5, 7, 11, 16, 17, 20, 21, 25, 26, 27, 30, 38, 42, 43, 44, 48, 49, 53, 56, 58]);

const disciplinasUERJ = [
  { nome: "Texto Base", start: 1, end: 8 },
  { nome: "Linguagens", start: 9, end: 22 },
  { nome: "Língua Estrangeira", start: 23, end: 27 },
  { nome: "Matemática", start: 28, end: 34 },
  { nome: "Biologia", start: 35, end: 38 },
  { nome: "Química", start: 39, end: 42 },
  { nome: "Física", start: 43, end: 46 },
  { nome: "Geografia", start: 47, end: 53 },
  { nome: "História", start: 54, end: 60 },
];

const temasPool = [
  "", "Interpretação de Texto", "Coesão e Coerência", "Figuras de Linguagem", "Variação Linguística",
  "Análise do Discurso", "Funções da Linguagem", "Sintaxe", "Semântica",
  "Verbos", "Orações Subordinadas", "Classes de Palavras", "Pontuação",
  "Vocabulary Context", "Reading Comprehension", "Grammar Rules",
  "Progressão Aritmética", "Funções do 1º Grau", "Geometria Plana", "Probabilidade",
  "Trigonometria", "Geometria Espacial", "Análise Combinatória", "Logaritmos",
  "Citologia", "Genética", "Ecologia", "Evolução",
  "Estequiometria", "Termoquímica", "Oxidorredução", "Química Orgânica",
  "Cinemática", "Dinâmica", "Eletromagnetismo", "Termodinâmica",
  "Geopolítica", "Cartografia", "Geografia Agrária", "Climatologia",
  "Urbanização", "Indústria", "Relevo e Hidrografia", "Brasil Colônia",
  "Era Vargas", "Guerra Fria", "Revolução Francesa", "Idade Média",
  "Roma Antiga", "Grécia Antiga", "Segunda Guerra Mundial", "Renascimento",
  "Denotação e Conotação", "Intertextualidade", "Regência Verbal", "Concordância",
  "Feudalismo", "Iluminismo", "Revolução Industrial", "Tropicalismo",
];

function gerarRaioXUERJ(): RaioXQuestao[] {
  const questoes: RaioXQuestao[] = [];
  for (let i = 1; i <= 60; i++) {
    const disc = disciplinasUERJ.find((d) => i >= d.start && i <= d.end)?.nome || "Geral";
    let taxa: number;
    if (i % 3 === 0) taxa = 10 + (i * 7) % 20;
    else if (i % 2 === 0) taxa = 45 + (i * 3) % 30;
    else taxa = 75 + (i * 11) % 25;
    if (i === 5) taxa = 8;
    if (i === 8) taxa = 96;
    if (i === 11) taxa = 21;
    if (i === 30) taxa = 73;
    questoes.push({
      numero: i,
      disciplina: disc,
      tema: temasPool[i % temasPool.length],
      taxa_acerto_turma: taxa,
      resultado_aluno: !errosAgatha.has(i),
    });
  }
  return questoes;
}

// ── Dados ENEM TRI (90 questões típicas) ──────────────────
const errosEnem = new Set([2, 8, 14, 19, 23, 31, 37, 44, 50, 55, 61, 67, 73, 78, 85]);
const disciplinasENEM = [
  { nome: "Linguagens", start: 1, end: 45 },
  { nome: "Ciências Humanas", start: 46, end: 90 },
  { nome: "Ciências da Natureza", start: 91, end: 135 },
  { nome: "Matemática", start: 136, end: 180 },
];

function gerarRaioXENEM(): RaioXQuestao[] {
  const questoes: RaioXQuestao[] = [];
  for (let i = 1; i <= 180; i++) {
    const disc = disciplinasENEM.find((d) => i >= d.start && i <= d.end)?.nome || "Geral";
    let taxa = 40 + (i * 13) % 55;
    questoes.push({
      numero: i,
      disciplina: disc,
      tema: temasPool[i % temasPool.length],
      taxa_acerto_turma: taxa,
      resultado_aluno: !errosEnem.has(i),
    });
  }
  return questoes;
}

function gerarRaioXParcial(): RaioXQuestao[] {
  const questoes: RaioXQuestao[] = [];
  for (let i = 1; i <= 90; i++) {
    const disc = disciplinasENEM.find((d) => i >= d.start && i <= d.end)?.nome || "Geral";
    let taxa = 40 + (i * 13) % 55;
    questoes.push({
      numero: i,
      disciplina: disc,
      tema: temasPool[i % temasPool.length],
      taxa_acerto_turma: taxa,
      resultado_aluno: !errosEnem.has(i),
    });
  }
  return questoes;
}

// ──────────────────────────────────────────────────────────
//  mockBoletins — Dados de teste para 4 tipos de simulado
// ──────────────────────────────────────────────────────────
export const mockBoletins: Record<TipoSimulado, BoletimData> = {
  // ── 1) UERJ — Exame de Qualificação (conceito B, 38/60) ──
  UERJ: {
    aluno: {
      nome: "ÁGATHA MARIA SILVA DE OLIVEIRA",
      matricula: "2026001042",
      turma: "Turma Medicina – Manhã",
    },
    simulado: {
      tipo: "UERJ",
      titulo: "BOLETIM EQ 04 – Exame de Qualificação UERJ",
      data: "2026-06-15",
      totalQuestoes: 60,
    },
    resultadoTime: {
      mediaTurma: 44,
      maiorNota: 56,
      menorNota: 7,
      conceitoMedioTurma: "A",
    },
    destaqueGeral: {
      acertos: 38,
      total: 60,
      percentual: 63,
      conceitoUerj: "B",
    },
    desempenhoPorDisciplina: [
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
    temasParaRevisar: [
      { disciplina: "Texto Base", tema: "Coesão e Coerência", questao: 1 },
      { disciplina: "Texto Base", tema: "Figuras de Linguagem", questao: 3 },
      { disciplina: "Texto Base", tema: "Variação Linguística", questao: 5 },
      { disciplina: "Texto Base", tema: "Semântica", questao: 7 },
      { disciplina: "Linguagens", tema: "Classes de Palavras", questao: 11 },
      { disciplina: "Linguagens", tema: "Sintaxe", questao: 16 },
      { disciplina: "Linguagens", tema: "Pontuação", questao: 17 },
      { disciplina: "Linguagens", tema: "Orações Subordinadas", questao: 20 },
      { disciplina: "Linguagens", tema: "Regência Verbal", questao: 21 },
      { disciplina: "Língua Estrangeira", tema: "Vocabulary Context", questao: 25 },
      { disciplina: "Língua Estrangeira", tema: "Reading Comprehension", questao: 26 },
      { disciplina: "Língua Estrangeira", tema: "Grammar Rules", questao: 27 },
      { disciplina: "Matemática", tema: "Geometria Plana", questao: 30 },
      { disciplina: "Biologia", tema: "Evolução", questao: 38 },
      { disciplina: "Química", tema: "Química Orgânica", questao: 42 },
      { disciplina: "Física", tema: "Cinemática", questao: 43 },
      { disciplina: "Física", tema: "Dinâmica", questao: 44 },
      { disciplina: "Geografia", tema: "Urbanização", questao: 48 },
      { disciplina: "Geografia", tema: "Indústria", questao: 49 },
      { disciplina: "Geografia", tema: "Relevo e Hidrografia", questao: 53 },
      { disciplina: "História", tema: "Revolução Francesa", questao: 56 },
      { disciplina: "História", tema: "Segunda Guerra Mundial", questao: 58 },
    ],
    raioXQuestoes: gerarRaioXUERJ(),
  },

  // ── 2) ENEM — Notas TRI altas de medicina ────────────────
  ENEM: {
    aluno: {
      nome: "ÁGATHA MARIA SILVA DE OLIVEIRA",
      matricula: "2026001042",
      turma: "Turma Medicina – Manhã",
    },
    simulado: {
      tipo: "ENEM",
      titulo: "SIMULADO ENEM 03 – Nacional Completo",
      data: "2026-05-25",
      totalQuestoes: 180,
    },
    resultadoTime: {
      mediaTurma: 620,
      maiorNota: 810,
      menorNota: 380,
    },
    destaqueGeral: {
      acertos: 152,
      total: 180,
      percentual: 84,
      tri: {
        linguagens: 712.4,
        humanas: 698.8,
        naturezas: 745.2,
        matematica: 801.6,
        redacao: 920,
      },
    },
    desempenhoPorDisciplina: [
      { nome: "Linguagens e Códigos", acertos: 38, total: 45 },
      { nome: "Ciências Humanas", acertos: 36, total: 45 },
      { nome: "Ciências da Natureza", acertos: 40, total: 45 },
      { nome: "Matemática", acertos: 38, total: 45 },
    ],
    temasParaRevisar: [
      { disciplina: "Linguagens e Códigos", tema: "Coesão e Coerência", questao: 2 },
      { disciplina: "Linguagens e Códigos", tema: "Semântica", questao: 8 },
      { disciplina: "Linguagens e Códigos", tema: "Vocabulary Context", questao: 14 },
      { disciplina: "Linguagens e Códigos", tema: "Progressão Aritmética", questao: 19 },
      { disciplina: "Linguagens e Códigos", tema: "Grammar Rules", questao: 23 },
      { disciplina: "Linguagens e Códigos", tema: "Logaritmos", questao: 31 },
      { disciplina: "Linguagens e Códigos", tema: "Evolução", questao: 37 },
      { disciplina: "Linguagens e Códigos", tema: "Dinâmica", questao: 44 },
      { disciplina: "Ciências Humanas", tema: "Urbanização", questao: 50 },
      { disciplina: "Ciências Humanas", tema: "Revolução Francesa", questao: 55 },
    ],
    raioXQuestoes: gerarRaioXENEM(),
  },

  // ── 3) ENEM PARCIAL — Só dia 1, sem raio-x ───────────────
  ENEM_PARCIAL: {
    aluno: {
      nome: "ÁGATHA MARIA SILVA DE OLIVEIRA",
      matricula: "2026001042",
      turma: "Turma Medicina – Manhã",
    },
    simulado: {
      tipo: "ENEM_PARCIAL",
      titulo: "SIMULADO ENEM PARCIAL – Dia 1 (Linguagens + Humanas)",
      data: "2026-04-20",
      totalQuestoes: 90,
    },
    resultadoTime: {
      mediaTurma: 58,
      maiorNota: 82,
      menorNota: 22,
    },
    destaqueGeral: {
      acertos: 72,
      total: 90,
      percentual: 80,
      tri: {
        linguagens: 688.5,
        humanas: 672.0,
        naturezas: 0,
        matematica: 0,
        redacao: 860,
      },
    },
    desempenhoPorDisciplina: [
      { nome: "Linguagens e Códigos", acertos: 38, total: 45 },
      { nome: "Ciências Humanas", acertos: 34, total: 45 },
    ],
    temasParaRevisar: [
      { disciplina: "Linguagens e Códigos", tema: "Figuras de Linguagem", questao: 5 },
      { disciplina: "Linguagens e Códigos", tema: "Variação Linguística", questao: 12 },
      { disciplina: "Linguagens e Códigos", tema: "Sintaxe", questao: 28 },
      { disciplina: "Ciências Humanas", tema: "Geopolítica", questao: 51 },
      { disciplina: "Ciências Humanas", tema: "Idade Média", questao: 63 },
      { disciplina: "Ciências Humanas", tema: "Era Vargas", questao: 75 },
    ],
    // Sem raio-x para ENEM parcial
    raioXQuestoes: gerarRaioXParcial(),
  },

  // ── 4) DISCURSIVO — Nota decimal 16.5 ─────────────────────
  DISCURSIVO: {
    aluno: {
      nome: "ÁGATHA MARIA SILVA DE OLIVEIRA",
      matricula: "2026001042",
      turma: "Turma Medicina – Manhã",
    },
    simulado: {
      tipo: "DISCURSIVO",
      titulo: "PROVA DISCURSIVA 02 – Específicas Medicina",
      data: "2026-06-01",
      totalQuestoes: 10,
    },
    resultadoTime: {
      mediaTurma: 12.8,
      maiorNota: 18.5,
      menorNota: 4.0,
    },
    destaqueGeral: {
      acertos: 0,
      total: 10,
      percentual: 0,
      notaTotalDecimal: "16.5",
    },
    desempenhoPorDisciplina: [
      { nome: "Biologia", acertos: 7, total: 10 },
      { nome: "Química", acertos: 6, total: 10 },
      { nome: "Física", acertos: 5, total: 10 },
      { nome: "Matemática", acertos: 8, total: 10 },
    ],
    temasParaRevisar: [
      { disciplina: "Biologia", tema: "Fisiologia Humana – Sistema Cardiovascular", questao: 2 },
      { disciplina: "Química", tema: "Equilíbrio Químico", questao: 4 },
      { disciplina: "Física", tema: "Óptica – Lentes Convergentes", questao: 6 },
      { disciplina: "Física", tema: "Termodinâmica – 2ª Lei", questao: 8 },
    ],
    // Sem raio-x para discursivas
    raioXQuestoes: undefined,
  },
};

// ──────────────────────────────────────────────────────────
//  Mocks Legados (mantidos para retro-compatibilidade)
// ──────────────────────────────────────────────────────────
export const tenantConfigMock: TenantConfig = {
  slug: "progressao",
  nome: "Curso Progressão",
  logo_url: "https://ui-avatars.com/api/?name=CP&background=1e3a8a&color=fff&size=128",
  cor_primaria: "130 60% 45%",
  cor_secundaria: "10 90% 50%",
  background_login: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2070&auto=format&fit=crop",
};

export const alunoProfileMock: AlunoProfile = {
  matricula: "2026001042",
  nome: "Ágatha Maria Silva de Oliveira",
  turma: "Turma Medicina – Manhã",
};

export const boletimSimuladoMock: QuestaoSimulado[] = [
  { numero: 1, tema: "Termoquímica", resposta_aluno: "A", resposta_correta: "A", status: "Acertou", taxa_acerto_turma: 82 },
  { numero: 2, tema: "Estequiometria", resposta_aluno: "B", resposta_correta: "C", status: "Errou", taxa_acerto_turma: 45 },
  { numero: 3, tema: "Eletromagnetismo", resposta_aluno: "D", resposta_correta: "E", status: "Errou", taxa_acerto_turma: 15 },
  { numero: 4, tema: "Redação - Coesão", resposta_aluno: "B", resposta_correta: "B", status: "Acertou", taxa_acerto_turma: 90 },
  { numero: 5, tema: "Geometria Espacial", resposta_aluno: "C", resposta_correta: "C", status: "Acertou", taxa_acerto_turma: 60 },
  { numero: 6, tema: "Análise Combinatória", resposta_aluno: "A", resposta_correta: "D", status: "Errou", taxa_acerto_turma: 25 },
  { numero: 7, tema: "Cinemática", resposta_aluno: "E", resposta_correta: "E", status: "Acertou", taxa_acerto_turma: 75 },
  { numero: 8, tema: "Interpretação de Texto", resposta_aluno: "A", resposta_correta: "A", status: "Acertou", taxa_acerto_turma: 95 },
  { numero: 9, tema: "Logaritmo", resposta_aluno: "C", resposta_correta: "B", status: "Errou", taxa_acerto_turma: 33 },
  { numero: 10, tema: "História do Brasil Império", resposta_aluno: "D", resposta_correta: "D", status: "Acertou", taxa_acerto_turma: 55 },
];

export const historicoAbonosMock: Abono[] = [
  {
    id: "ab-1",
    tipo: "Atestado Médico",
    descricao: "Atestado médico - Dengue",
    data_inicio: "2026-03-10",
    data_fim: "2026-03-14",
  },
  {
    id: "ab-2",
    tipo: "Abono Pedagógico",
    descricao: "Abono concedido na matéria de Química devido ao excelente desempenho no Simulado 2 (100% de acerto).",
    data_inicio: "2026-05-01",
    data_fim: "2026-05-31",
  },
  {
    id: "ab-3",
    tipo: "Atestado Médico",
    descricao: "Consulta odontológica de urgência",
    data_inicio: "2026-06-02",
    data_fim: "2026-06-02",
  },
];

// ── Módulo de Frequência e Abonos SaaS ──────────────────

export type ModalidadeAluno = "Presencial" | "Online";
export type StatusChamada = "Presente" | "Falta" | "Abonado";
export type EscopoAbono = "Todas as Disciplinas" | "Disciplina Específica";

export type AlunoChamada = {
  id: string;
  nome: string;
  matricula: string;
  modalidade: ModalidadeAluno;
  status_atual: StatusChamada;
};

export type TipoAbonoSaaS = "Eventualidade" | "Mérito";

export type HistoricoAbono = {
  id: string;
  alunoId: string;
  alunoNome: string;
  tipo: TipoAbonoSaaS;
  motivo: string;
  dataInicio: string;
  dataFim: string;
  escopo: EscopoAbono;
  disciplina?: string;
};

export const turmasDisponiveis = [
  "Turma Medicina – Manhã",
  "Turma Medicina – Tarde",
  "Turma ITA – Integral",
] as const;

export type TurmaDisponivel = (typeof turmasDisponiveis)[number];

export const disciplinasDisponiveis = [
  "Matemática",
  "Biologia",
  "Química",
  "Física",
  "História",
  "Geografia",
  "Inglês",
  "Espanhol",
  "Redação",
] as const;

export type DisciplinaDisponivel = (typeof disciplinasDisponiveis)[number];

/** Dia da semana (0 = Domingo … 6 = Sábado), compatível com Date.getDay(). */
export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const diasSemanaLabels: Record<DiaSemana, string> = {
  0: "Domingo",
  1: "Segunda-feira",
  2: "Terça-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "Sábado",
};

export const diasSemanaOrdem: DiaSemana[] = [1, 2, 3, 4, 5, 6, 0];

/** Janela semanal recorrente — repete toda semana no mesmo dia e horário. */
export type JanelaValidacao = {
  id: string;
  disciplina: DisciplinaDisponivel;
  diaSemana: DiaSemana;
  horaAbertura: string;
  horaFechamento: string;
  turma: TurmaDisponivel;
};

export type StatusJanelaValidacao = "aguardando" | "aberta" | "fechada";

export function getLabelDiaSemana(dia: DiaSemana): string {
  return diasSemanaLabels[dia];
}

function minutosDesdeMeiaNoite(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h! * 60 + m!;
}

/** Verifica se hoje é o dia da semana configurado para a janela. */
export function isDiaJanelaAtiva(
  janela: JanelaValidacao,
  agora: Date = new Date()
): boolean {
  return agora.getDay() === janela.diaSemana;
}

/** Status da janela no momento — considera dia da semana + horário (recorrente). */
export function getStatusJanelaValidacao(
  janela: JanelaValidacao,
  agora: Date = new Date()
): StatusJanelaValidacao {
  if (!isDiaJanelaAtiva(janela, agora)) return "fechada";

  const minutosAtual = agora.getHours() * 60 + agora.getMinutes();
  const abertura = minutosDesdeMeiaNoite(janela.horaAbertura);
  const fechamento = minutosDesdeMeiaNoite(janela.horaFechamento);

  if (minutosAtual < abertura) return "aguardando";
  if (minutosAtual > fechamento) return "fechada";
  return "aberta";
}

export function isValidacaoAberta(
  janela: JanelaValidacao,
  agora: Date = new Date()
): boolean {
  return getStatusJanelaValidacao(janela, agora) === "aberta";
}

/** Verifica se um abono está vigente em uma data de referência (ISO yyyy-mm-dd). */
export function isAbonoAtivo(abono: HistoricoAbono, dataRef: string): boolean {
  return dataRef >= abono.dataInicio && dataRef <= abono.dataFim;
}

export const listaAlunosChamada: AlunoChamada[] = [
  {
    id: "al-1",
    nome: "Ágatha Maria Silva de Oliveira",
    matricula: "2026001042",
    modalidade: "Online",
    status_atual: "Falta",
  },
  {
    id: "al-2",
    nome: "Carlos Eduardo Santos",
    matricula: "2026001043",
    modalidade: "Presencial",
    status_atual: "Presente",
  },
  {
    id: "al-3",
    nome: "Beatriz Sousa Pinheiro",
    matricula: "2026001044",
    modalidade: "Presencial",
    status_atual: "Presente",
  },
  {
    id: "al-4",
    nome: "Gabriel Henrique Oliveira",
    matricula: "2026001045",
    modalidade: "Online",
    status_atual: "Falta",
  },
  {
    id: "al-5",
    nome: "Mariana Costa Ramos",
    matricula: "2026001046",
    modalidade: "Presencial",
    status_atual: "Abonado",
  },
  {
    id: "al-6",
    nome: "João Pedro Martins",
    matricula: "2026001047",
    modalidade: "Presencial",
    status_atual: "Presente",
  },
  {
    id: "al-7",
    nome: "Lucas Fernandes Lima",
    matricula: "2026001048",
    modalidade: "Online",
    status_atual: "Falta",
  },
  {
    id: "al-8",
    nome: "Julia Melo Ferreira",
    matricula: "2026001049",
    modalidade: "Presencial",
    status_atual: "Presente",
  },
];

export const historicoAbonos: HistoricoAbono[] = [
  {
    id: "ab-saas-1",
    alunoId: "al-5",
    alunoNome: "Mariana Costa Ramos",
    tipo: "Eventualidade",
    motivo: "Atestado Médico – Dengue",
    dataInicio: "2026-06-10",
    dataFim: "2026-06-12",
    escopo: "Todas as Disciplinas",
  },
  {
    id: "ab-saas-2",
    alunoId: "al-1",
    alunoNome: "Ágatha Maria Silva de Oliveira",
    tipo: "Mérito",
    motivo: "Mérito Simulado ENEM 1",
    dataInicio: "2026-06-21",
    dataFim: "2026-06-30",
    escopo: "Disciplina Específica",
    disciplina: "Biologia",
  },
  {
    id: "ab-saas-3",
    alunoId: "al-3",
    alunoNome: "Beatriz Sousa Pinheiro",
    tipo: "Eventualidade",
    motivo: "Atestado Médico – Consulta odontológica",
    dataInicio: "2026-05-20",
    dataFim: "2026-05-20",
    escopo: "Todas as Disciplinas",
  },
  {
    id: "ab-saas-4",
    alunoId: "al-2",
    alunoNome: "Carlos Eduardo Santos",
    tipo: "Mérito",
    motivo: "Mérito Simulado UERJ – Conceito A em Química",
    dataInicio: "2026-06-01",
    dataFim: "2026-06-15",
    escopo: "Disciplina Específica",
    disciplina: "Química",
  },
  {
    id: "ab-saas-5",
    alunoId: "al-4",
    alunoNome: "Gabriel Henrique Oliveira",
    tipo: "Eventualidade",
    motivo: "Atestado Médico – Gripe H3N2",
    dataInicio: "2026-06-18",
    dataFim: "2026-06-20",
    escopo: "Todas as Disciplinas",
  },
  {
    id: "ab-saas-6",
    alunoId: "al-6",
    alunoNome: "João Pedro Martins",
    tipo: "Mérito",
    motivo: "Mérito Olimpíada de Matemática – Medalha Regional",
    dataInicio: "2026-06-21",
    dataFim: "2026-07-05",
    escopo: "Disciplina Específica",
    disciplina: "Matemática",
  },
  {
    id: "ab-saas-7",
    alunoId: "al-7",
    alunoNome: "Lucas Fernandes Lima",
    tipo: "Eventualidade",
    motivo: "Comparecimento em audiência judicial (documentação anexada)",
    dataInicio: "2026-06-21",
    dataFim: "2026-06-21",
    escopo: "Todas as Disciplinas",
  },
  {
    id: "ab-saas-8",
    alunoId: "al-8",
    alunoNome: "Julia Melo Ferreira",
    tipo: "Mérito",
    motivo: "Mérito Simulado ENEM 2 – Nota TRI acima de 750 em Humanas",
    dataInicio: "2026-06-14",
    dataFim: "2026-06-28",
    escopo: "Disciplina Específica",
    disciplina: "História",
  },
  {
    id: "ab-saas-9",
    alunoId: "al-1",
    alunoNome: "Ágatha Maria Silva de Oliveira",
    tipo: "Eventualidade",
    motivo: "Atestado Médico – Enxaqueca crônica",
    dataInicio: "2026-04-08",
    dataFim: "2026-04-10",
    escopo: "Todas as Disciplinas",
  },
  {
    id: "ab-saas-10",
    alunoId: "al-5",
    alunoNome: "Mariana Costa Ramos",
    tipo: "Mérito",
    motivo: "Mérito Prova Discursiva – Nota 18,5 em Física",
    dataInicio: "2026-05-01",
    dataFim: "2026-05-31",
    escopo: "Disciplina Específica",
    disciplina: "Física",
  },
  {
    id: "ab-saas-11",
    alunoId: "al-3",
    alunoNome: "Beatriz Sousa Pinheiro",
    tipo: "Mérito",
    motivo: "Mérito Redação – Nota 920 no simulado",
    dataInicio: "2026-06-21",
    dataFim: "2026-06-25",
    escopo: "Disciplina Específica",
    disciplina: "Redação",
  },
  {
    id: "ab-saas-12",
    alunoId: "al-2",
    alunoNome: "Carlos Eduardo Santos",
    tipo: "Eventualidade",
    motivo: "Atestado Médico – Cirurgia ambulatorial",
    dataInicio: "2026-03-02",
    dataFim: "2026-03-07",
    escopo: "Todas as Disciplinas",
  },
  {
    id: "ab-saas-13",
    alunoId: "al-4",
    alunoNome: "Gabriel Henrique Oliveira",
    tipo: "Mérito",
    motivo: "Mérito Simulado ENEM 1 – 100% de acerto em Inglês",
    dataInicio: "2026-06-21",
    dataFim: "2026-06-30",
    escopo: "Disciplina Específica",
    disciplina: "Inglês",
  },
  {
    id: "ab-saas-14",
    alunoId: "al-6",
    alunoNome: "João Pedro Martins",
    tipo: "Eventualidade",
    motivo: "Atestado Médico – COVID-19",
    dataInicio: "2026-02-14",
    dataFim: "2026-02-21",
    escopo: "Todas as Disciplinas",
  },
  {
    id: "ab-saas-15",
    alunoId: "al-7",
    alunoNome: "Lucas Fernandes Lima",
    tipo: "Mérito",
    motivo: "Mérito Simulado ENEM – Destaque em Ciências da Natureza",
    dataInicio: "2026-06-15",
    dataFim: "2026-06-22",
    escopo: "Disciplina Específica",
    disciplina: "Geografia",
  },
];

export const janelasValidacaoMock: JanelaValidacao[] = [
  {
    id: "jv-1",
    disciplina: "Biologia",
    diaSemana: 0,
    horaAbertura: "08:00",
    horaFechamento: "12:00",
    turma: "Turma Medicina – Manhã",
  },
  {
    id: "jv-2",
    disciplina: "Matemática",
    diaSemana: 2,
    horaAbertura: "14:00",
    horaFechamento: "18:00",
    turma: "Turma Medicina – Manhã",
  },
];

