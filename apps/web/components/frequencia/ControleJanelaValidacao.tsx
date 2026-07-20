"use client";

import React, { useMemo, useState } from "react";
import {
  diasSemanaOrdem,
  getLabelDiaSemana,
  getStatusJanelaValidacao,
} from "@repo/database-mocks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  BookOpen,
  CalendarDays,
  ChevronDown,
  Save,
  Repeat,
  Pencil,
  Trash2,
  Plus,
  X,
  RefreshCw,
  Eye,
  EyeOff,
  Ban
} from "lucide-react";
import { useFrequencia, ScheduledClass } from "@/contexts/FrequenciaContext";
import { formatDate } from "@/lib/utils";

interface ControleJanelaValidacaoProps {
  janelas: any[];
  scheduledClasses?: ScheduledClass[];
  turmaSelecionada: string;
  setTurmaSelecionada: (turma: string) => void;
  onSalvarJanela: (janela: any) => Promise<boolean>;
  onRemoverJanela: (id: string) => void;
}

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  aguardando: {
    label: "Aguardando abertura",
    className: "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-400",
  },
  aberta: {
    label: "Validação aberta",
    className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-400",
  },
  fechada: {
    label: "Fora do horário",
    className: "bg-rose-500/10 text-rose-700 border-rose-500/25 dark:text-rose-400",
  },
};

const HORARIO_PADRAO = { abertura: "08:00", fechamento: "12:00" };

export function ControleJanelaValidacao({
  janelas,
  scheduledClasses = [],
  turmaSelecionada,
  setTurmaSelecionada,
  onSalvarJanela,
  onRemoverJanela,
}: ControleJanelaValidacaoProps) {
  const { classes, subjects, generateScheduledClasses, updateScheduledClass } = useFrequencia();
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [disciplina, setDisciplina] = useState<string>("");
  const [diaSemana, setDiaSemana] = useState<number>(0);
  const [horaAbertura, setHoraAbertura] = useState(HORARIO_PADRAO.abertura);
  const [horaFechamento, setHoraFechamento] = useState(HORARIO_PADRAO.fechamento);
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const [showCard, setShowCard] = useState(false);

  React.useEffect(() => {
    if (subjects.length > 0 && !disciplina) {
      setDisciplina(subjects[0].id);
    }
  }, [subjects, disciplina]);

  const modoEdicao = editandoId !== null;

  const janelasDaTurma = useMemo(
    () =>
      janelas
        .filter((j) => j.classId === turmaSelecionada)
        .sort((a, b) => {
          const ordemA = diasSemanaOrdem.indexOf(a.diaSemana as any);
          const ordemB = diasSemanaOrdem.indexOf(b.diaSemana as any);
          if (ordemA !== ordemB) return ordemA - ordemB;
          return a.horaAbertura.localeCompare(b.horaAbertura);
        }),
    [janelas, turmaSelecionada]
  );

  const aulasDaTurma = useMemo(() => {
    return scheduledClasses
      .filter(c => c.classId === turmaSelecionada)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [scheduledClasses, turmaSelecionada]);

  const limparFormulario = () => {
    setEditandoId(null);
    if (subjects.length > 0) setDisciplina(subjects[0].id);
    setDiaSemana(0);
    setHoraAbertura(HORARIO_PADRAO.abertura);
    setHoraFechamento(HORARIO_PADRAO.fechamento);
    setShowCard(false);
    setErroForm(null);
  };

  const iniciarEdicao = (janela: any) => {
    setEditandoId(janela.id);
    setDisciplina(janela.subjectId);
    setDiaSemana(janela.diaSemana);
    setHoraAbertura(janela.horaAbertura);
    setHoraFechamento(janela.horaFechamento);
    setShowCard(janela.showCard ?? false);
    setErroForm(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroForm(null);

    if (horaAbertura >= horaFechamento) {
      setErroForm("O horário de fechamento deve ser posterior ao de abertura.");
      return;
    }

    const sucesso = await onSalvarJanela({
      id: editandoId ?? undefined,
      subjectId: disciplina,
      diaSemana,
      horaAbertura,
      horaFechamento,
      classId: turmaSelecionada,
      showCard
    });

    if (!sucesso) {
      setErroForm(
        `Erro ao salvar ou já existe uma janela no mesmo horário.`
      );
      return;
    }

    limparFormulario();
  };

  const handleExcluir = (janela: any) => {
    if (!window.confirm(`Remover a janela de ${janela.disciplina} (${getLabelDiaSemana(janela.diaSemana as any)})?`)) {
      return;
    }
    onRemoverJanela(janela.id);
    if (editandoId === janela.id) limparFormulario();
  };

  const handleGenerate = async () => {
    setGerando(true);
    await generateScheduledClasses();
    setGerando(false);
  };

  return (
    <div className="w-full space-y-8">

      {/* SEÇÃO 1: Grade Padrão (Templates) */}
      <div className="rounded-none border-y border-border bg-card p-4 md:px-8 md:py-6">
        <div className="mb-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2 flex-wrap">
              Grade Padrão (Templates)
              <Badge variant="outline" className="text-[10px] font-semibold gap-1 rounded-full">
                <Repeat className="w-3 h-3" />
                Repete toda semana
              </Badge>
              {modoEdicao && (
                <Badge className="text-[10px] font-semibold gap-1 bg-primary/15 text-primary border-none">
                  <Pencil className="w-3 h-3" />
                  Editando
                </Badge>
              )}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {modoEdicao
                ? "Altere os campos abaixo e clique em Salvar alterações, ou cancele para criar uma nova janela."
                : "Configure o dia da semana e o horário padrão. Ao gerar as aulas automáticas, o sistema usará esta grade."}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-end gap-3">
            <div className="relative">
              <select
                value={turmaSelecionada}
                onChange={(e) => setTurmaSelecionada(e.target.value)}
                className="appearance-none w-full sm:w-[220px] bg-background border border-border rounded-lg px-3 py-2 pr-9 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {classes.map((turma) => (
                  <option key={turma.id} value={turma.id}>
                    {turma.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
            {modoEdicao && (
              <Button type="button" variant="outline" size="sm" onClick={limparFormulario} className="shrink-0 gap-1.5 h-9">
                <Plus className="w-3.5 h-3.5" />
                Nova janela
              </Button>
            )}
            <Button type="button" onClick={handleGenerate} disabled={gerando} className="shrink-0 gap-1.5 h-9 bg-primary text-primary-foreground hover:bg-primary/90">
              <RefreshCw className={`w-3.5 h-3.5 ${gerando ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{gerando ? "Gerando..." : "Gerar Aulas"}</span>
            </Button>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 items-end"
        >
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              Matéria
            </label>
            <div className="relative">
              <select
                value={disciplina}
                onChange={(e) => {
                  setDisciplina(e.target.value);
                  setErroForm(null);
                }}
                className="appearance-none w-full bg-background border border-border rounded-lg px-3 py-2 pr-9 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {subjects.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" />
              Dia da Semana
            </label>
            <div className="relative">
              <select
                value={diaSemana}
                onChange={(e) => {
                  setDiaSemana(Number(e.target.value));
                  setErroForm(null);
                }}
                className="appearance-none w-full bg-background border border-border rounded-lg px-3 py-2 pr-9 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {diasSemanaOrdem.map((dia) => (
                  <option key={dia} value={dia}>
                    {getLabelDiaSemana(dia as any)}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Abertura
            </label>
            <input
              type="time"
              value={horaAbertura}
              onChange={(e) => {
                setHoraAbertura(e.target.value);
                setErroForm(null);
              }}
              required
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Fechamento
            </label>
            <input
              type="time"
              value={horaFechamento}
              onChange={(e) => {
                setHoraFechamento(e.target.value);
                setErroForm(null);
              }}
              required
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex flex-col sm:flex-row xl:flex-col gap-2 w-full xl:w-auto">
            <Button type="submit" className="font-semibold gap-2 w-full">
              <Save className="w-4 h-4" />
              {modoEdicao ? "Salvar alterações" : "Adicionar à grade"}
            </Button>
            {modoEdicao && (
              <Button
                type="button"
                variant="outline"
                onClick={limparFormulario}
                className="gap-1.5 w-full"
              >
                <X className="w-4 h-4" />
                Cancelar
              </Button>
            )}
          </div>
        </form>

        {erroForm && (
          <p className="mt-3 text-sm text-rose-600 dark:text-rose-400 font-medium">{erroForm}</p>
        )}
      </div>

      <div className="px-4 md:px-8">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <CalendarDays className="w-4 h-4" />
          Grade padrão — Turma Selecionada
        </h4>

        {janelasDaTurma.length === 0 ? (
          <p className="text-sm text-muted-foreground border border-dashed border-border rounded-lg p-6 text-center">
            Nenhuma janela configurada para esta turma.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 rounded-sm">
            {janelasDaTurma.map((janela) => {
              const status = getStatusJanelaValidacao(janela as any);
              const cfg = STATUS_LABEL[status];
              const selecionada = editandoId === janela.id;

              const aulaDaSemana = aulasDaTurma.find(a => a.presenceWindowId === janela.id);
              const showCardAtual = aulaDaSemana ? aulaDaSemana.showCard : false;

              return (
                <div
                  key={janela.id}
                  className={`border bg-card rounded-lg p-4 space-y-3 transition-all ${selecionada
                    ? "border-primary ring-2 ring-primary/20 shadow-sm"
                    : "border-border hover:border-primary/30"
                    }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-foreground">{janela.disciplina}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Toda {getLabelDiaSemana(janela.diaSemana as any)}
                      </p>
                    </div>
                    <Badge variant="outline" className={`text-xs shrink-0 rounded-full ${cfg?.className || ''}`}>
                      {cfg?.label || status}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {janela.horaAbertura} — {janela.horaFechamento}
                  </p>

                  <div className="flex items-center gap-2 pt-2 border-t border-border mt-3">
                    <Button
                      type="button"
                      variant={showCardAtual ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        if (aulaDaSemana) {
                          updateScheduledClass(aulaDaSemana.id, { showCard: !aulaDaSemana.showCard });
                        } else {
                          alert("Gere as aulas da semana primeiro para poder exibir/ocultar o card.");
                        }
                      }}
                      className={`flex-1 gap-1.5 text-xs font-semibold rounded-md ${showCardAtual ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}`}
                      title={showCardAtual ? "Ocultar Card no Portal do Aluno" : "Mostrar Card no Portal do Aluno"}
                    >
                      {showCardAtual ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </Button>
                    <Button
                      type="button"
                      variant={selecionada ? "default" : "outline"}
                      size="sm"
                      onClick={() => iniciarEdicao(janela)}
                      className="gap-1.5 text-xs font-semibold rounded-md flex-1"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleExcluir(janela)}
                      className="gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 rounded-md flex-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
