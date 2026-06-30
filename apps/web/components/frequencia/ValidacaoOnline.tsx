"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  getLabelDiaSemana,
  getStatusJanelaValidacao,
  isDiaJanelaAtiva,
} from "@repo/database-mocks";
import { useFrequencia } from "@/contexts/FrequenciaContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Laptop,
  CheckCircle,
  XCircle,
  Clock,
  BookOpen,
  Timer,
  Repeat,
} from "lucide-react";

interface ValidacaoOnlineProps {
  aluno: {
    id: string;
    nome: string;
    matricula: string;
    turma: string;
    turmaNome?: string;
  };
  disciplinaAtivaId?: string;
  disciplinaAtivaNome?: string;
}

const ALUNO_ONLINE_ID = "al-1";

export function ValidacaoOnline({
  aluno,
  disciplinaAtivaId = "id-da-disciplina",
  disciplinaAtivaNome = "Matemática",
}: ValidacaoOnlineProps) {
  const { alunos, janelas, confirmarPresencaOnline, loadAlunos } = useFrequencia();
  const [agora, setAgora] = useState<Date | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setAgora(new Date());
    const interval = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const alunoChamada = alunos.find((a) => a.id === aluno.id);
  const isPresente = alunoChamada?.status_atual === "Presente";

  const janela = useMemo(() => {
    if (!agora) return undefined;
    const janelasDaTurma = janelas.filter((j) => j.classId === aluno.turma); // Aqui aluno.turma deve ser o ID da turma
    if (janelasDaTurma.length === 0) return undefined;

    const hoje = agora.getDay();
    const agoraMinutos = agora.getHours() * 60 + agora.getMinutes();

    const getMinutosAteJanela = (j: any) => {
      const [abH, abM] = j.horaAbertura.split(":").map(Number);
      const [feH, feM] = j.horaFechamento.split(":").map(Number);
      const horaAb = abH! * 60 + abM!;
      const horaFe = feH! * 60 + feM!;

      let diasDiferenca = j.diaSemana - hoje;
      if (diasDiferenca < 0) diasDiferenca += 7;

      if (diasDiferenca === 0 && agoraMinutos > horaFe) {
        diasDiferenca += 7;
      }

      if (diasDiferenca === 0 && agoraMinutos >= horaAb && agoraMinutos <= horaFe) {
        return -1;
      }

      return diasDiferenca * 24 * 60 + horaAb - agoraMinutos;
    };

    const janelasOrdenadas = [...janelasDaTurma].sort((a, b) => {
      return getMinutosAteJanela(a) - getMinutosAteJanela(b);
    });

    return janelasOrdenadas[0];
  }, [janelas, aluno.turma, agora]);

  const statusJanela = janela && agora ? getStatusJanelaValidacao(janela as any, agora) : "fechada";
  const hojeEhDiaDaJanela = janela && agora ? isDiaJanelaAtiva(janela as any, agora) : false;

  const mensagemStatus = useMemo(() => {
    if (!janela) return "A secretaria ainda não configurou a janela para esta matéria.";
    if (!hojeEhDiaDaJanela) {
      return `Validação disponível ${getLabelDiaSemana(janela.diaSemana as any)}, das ${janela.horaAbertura} às ${janela.horaFechamento}.`;
    }
    if (statusJanela === "aguardando") {
      return `A validação abre hoje às ${janela.horaAbertura}.`;
    }
    if (statusJanela === "aberta") {
      return "Você pode confirmar sua presença agora.";
    }
    return `A validação de hoje encerrou às ${janela.horaFechamento}.`;
  }, [janela, hojeEhDiaDaJanela, statusJanela]);

  // Carrega a presença atual do aluno quando descobre qual a janela do dia
  useEffect(() => {
    if (janela && aluno.turma) {
      const dataHoje = new Date().toLocaleDateString("en-CA");
      loadAlunos(aluno.turma, dataHoje, janela.subjectId);
    }
  }, [janela, aluno.turma, loadAlunos]);

  const iniciais = aluno.nome
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleConfirmar = () => {
    setFeedback(null);
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);

      if (!janela) {
        setFeedback({
          type: "error",
          text: "Nenhuma janela de validação configurada para esta matéria.",
        });
        return;
      }

      if (!isDiaJanelaAtiva(janela as any, new Date())) {
        setFeedback({
          type: "error",
          text: `Hoje não é dia de validação. Disponível ${getLabelDiaSemana(janela.diaSemana as any)}.`,
        });
        return;
      }

      const status = getStatusJanelaValidacao(janela as any, new Date());

      if (status === "aguardando") {
        setFeedback({
          type: "error",
          text: `Validação abre às ${janela.horaAbertura}. Aguarde o horário de início.`,
        });
        return;
      }

      if (status === "fechada") {
        setFeedback({
          type: "error",
          text: `Validação encerrada às ${janela.horaFechamento}. Entre em contato com a secretaria.`,
        });
        return;
      }

      const dataHoje = new Date().toLocaleDateString("en-CA");
      confirmarPresencaOnline(aluno.id, aluno.turma, dataHoje, janela.subjectId);
      setFeedback({
        type: "success",
        text: "Presença confirmada! Seu check-in foi registrado na chamada da secretaria.",
      });
    }, 600);
  };

  const statusBadgeClass =
    statusJanela === "aberta"
      ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-400"
      : statusJanela === "aguardando"
        ? "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-400"
        : "bg-rose-500/10 text-rose-700 border-rose-500/25 dark:text-rose-400";

  const statusBadgeLabel =
    statusJanela === "aberta"
      ? "Validação aberta"
      : statusJanela === "aguardando"
        ? "Aguardando abertura"
        : hojeEhDiaDaJanela
          ? "Validação encerrada"
          : "Fora do dia";

  return (
    <div className="w-full max-w-xl mx-auto space-y-5">
      <Card className="border border-border shadow-sm overflow-hidden bg-card rounded-xl">
        <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-primary p-6 text-white">
          <div className="flex items-center gap-1.5 mb-4 opacity-90">
            <Laptop className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              Portal do Aluno — Presença Online
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg border border-white/20">
              {iniciais}
            </div>
            <div>
              <h3 className="text-lg font-bold">{aluno.nome}</h3>
              <p className="text-xs text-white/70">
                {aluno.matricula} · {aluno.turmaNome || aluno.turma}
              </p>
            </div>
          </div>
        </div>

        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <BookOpen className="w-4 h-4 text-primary shrink-0" />
            <span className="font-semibold text-foreground">
              {janela ? janela.disciplina : disciplinaAtivaNome}
            </span>
            {janela && (
              <Badge variant="outline" className="text-[10px] gap-1 font-medium">
                <Repeat className="w-3 h-3" />
                {getLabelDiaSemana(janela.diaSemana as any)}
              </Badge>
            )}
          </div>

          {janela ? (
            <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30 gap-3">
              <div className="space-y-0.5 min-w-0">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                  Horário
                </span>
                <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Timer className="w-4 h-4 text-primary shrink-0" />
                  {janela.horaAbertura} — {janela.horaFechamento}
                </p>
              </div>
              <Badge variant="outline" className={`shrink-0 text-xs font-semibold ${statusBadgeClass}`}>
                {statusBadgeLabel}
              </Badge>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground border border-dashed border-border rounded-lg p-4">
              A secretaria ainda não configurou a janela de validação para esta matéria.
            </p>
          )}

          {isPresente ? (
            <div className="text-center py-6 space-y-3 border border-emerald-500/20 bg-emerald-500/5 rounded-lg">
              <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto" />
              <div>
                <h4 className="font-bold text-emerald-700 dark:text-emerald-400">
                  Presença Confirmada!
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Sua presença já consta na chamada da secretaria.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{mensagemStatus}</p>

              {feedback && (
                <div
                  className={`p-3 rounded-lg flex items-start gap-2 text-xs font-medium border ${feedback.type === "success"
                    ? "bg-emerald-500/10 text-emerald-800 border-emerald-500/25 dark:text-emerald-400"
                    : "bg-rose-500/10 text-rose-800 border-rose-500/25 dark:text-rose-400"
                    }`}
                >
                  {feedback.type === "success" ? (
                     <CheckCircle className="w-4 h-4 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{feedback.text}</span>
                </div>
              )}

              <Button
                onClick={handleConfirmar}
                disabled={isLoading || !janela || statusJanela !== "aberta"}
                className="w-full h-11 font-semibold rounded-lg disabled:opacity-50"
              >
                {isLoading ? "Registrando..." : "Confirmar Presença"}
              </Button>

              {statusJanela === "aguardando" && janela && hojeEhDiaDaJanela && (
                <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Abre às {janela.horaAbertura}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
