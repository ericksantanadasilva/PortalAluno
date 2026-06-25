export interface TenantStyleConfig {
  logoUrl?: string;
  backgroundUrl?: string;
  primaryColor: string;
  secondaryColor: string;
}

export interface AlunoForm {
  nome: string;
  email: string;
  matricula: string;
  turma: string;
  modalidade: 'presencial' | 'online';
  anoLetivo: number;
}

export interface QuestaoSimulado {
  numero: number;
  conteudo: string;
  disciplina: string;
}

export interface SimuladoForm {
  titulo: string;
  dataAplicacao: string;
  tipo: 'uerj' | 'enem' | 'enem_parcial' | 'discursivo';
  quantidadeQuestoes: number;
  questoes: QuestaoSimulado[];
  isPublished: boolean;
}

export interface SimuladoListagem {
  id: string;
  titulo: string;
  dataAplicacao: string;
  tipo: 'uerj' | 'enem' | 'enem_parcial' | 'discursivo';
  isPublished: boolean;
}

export interface RespostaGabarito {
  numeroQuestao: number;
  alternativaCorreta: 'A' | 'B' | 'C' | 'D' | 'E';
  anulada?: boolean;
}

export interface GabaritoForm {
  simuladoId: string;
  respostas: RespostaGabarito[];
}
