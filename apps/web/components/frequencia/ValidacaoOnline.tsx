"use client";

import React, { useEffect, useMemo, useState } from "react";
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
  const { alunos, scheduledClasses, confirmarPresencaOnline, loadAlunos, loadScheduledClasses } = useFrequencia();
  const [agora, setAgora] = useState<Date | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setAgora(new Date());
    const interval = setInterval(() => {
      setAgora(new Date());
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const alunoChamada = alunos.find((a) => a.id === aluno.id);
  const isPresente = alunoChamada?.status_atual === "Presente";

  const getDateLocal = (isoStr: string) => {
    const [year, month, day] = isoStr.split('T')[0].split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const aulaAtual = useMemo(() => {
    if (!agora) return undefined;
    const aulasDaTurma = scheduledClasses.filter((c) =>
      c.classId === aluno.turma &&
      c.showCard === true &&
      !c.isCanceled
    );

    if (aulasDaTurma.length === 0) return undefined;

    const agoraTempo = agora.getTime();

    // Filtra aulas que ainda não terminaram e ordena pela mais próxima
    const aulasValidas = aulasDaTurma.filter(c => {
      const dataAula = getDateLocal(c.date);
      const [feH, feM] = c.endTime.split(":").map(Number);
      dataAula.setHours(feH, feM, 0, 0);

      // Considera aulas que fecham hoje ou no futuro
      return dataAula.getTime() >= agoraTempo - (24 * 60 * 60 * 1000); // margem de 1 dia para não sumir no dia
    }).sort((a, b) => {
      const dataA = getDateLocal(a.date);
      const [abHa, abMa] = a.startTime.split(":").map(Number);
      dataA.setHours(abHa, abMa, 0, 0);

      const dataB = getDateLocal(b.date);
      const [abHb, abMb] = b.startTime.split(":").map(Number);
      dataB.setHours(abHb, abMb, 0, 0);

      return Math.abs(dataA.getTime() - agoraTempo) - Math.abs(dataB.getTime() - agoraTempo);
    });

    return aulasValidas[0];
  }, [scheduledClasses, aluno.turma, agora]);

  const statusJanela = useMemo(() => {
    if (!aulaAtual || !agora) return "fechada";

    const dataAulaAbertura = getDateLocal(aulaAtual.date);
    const [abH, abM] = aulaAtual.startTime.split(":").map(Number);
    dataAulaAbertura.setHours(abH, abM, 0, 0);

    const dataAulaFechamento = getDateLocal(aulaAtual.date);
    const [feH, feM] = aulaAtual.endTime.split(":").map(Number);
    dataAulaFechamento.setHours(feH, feM, 0, 0);

    // Se hoje não for o dia da aula, consideramos fora do dia
    if (dataAulaAbertura.toDateString() !== agora.toDateString()) {
      return "fechada";
    }

    if (agora.getTime() < dataAulaAbertura.getTime()) return "aguardando";
    if (agora.getTime() >= dataAulaAbertura.getTime() && agora.getTime() <= dataAulaFechamento.getTime()) return "aberta";
    return "fechada";
  }, [aulaAtual, agora]);

  const hojeEhDiaDaJanela = aulaAtual && agora ? getDateLocal(aulaAtual.date).toDateString() === agora.toDateString() : false;

  const mensagemStatus = useMemo(() => {
    if (!aulaAtual) return "Nenhuma aula com validação online agendada para hoje.";
    if (!hojeEhDiaDaJanela) {
      const dataFormatada = getDateLocal(aulaAtual.date).toLocaleDateString("pt-BR", { weekday: 'long', day: '2-digit', month: '2-digit' });
      return `Próxima validação: ${dataFormatada}, das ${aulaAtual.startTime} às ${aulaAtual.endTime}.`;
    }
    if (statusJanela === "aguardando") {
      return `A validação abre hoje às ${aulaAtual.startTime}.`;
    }
    if (statusJanela === "aberta") {
      return "Você pode confirmar sua presença agora.";
    }
    return `A validação de hoje encerrou às ${aulaAtual.endTime}.`;
  }, [aulaAtual, hojeEhDiaDaJanela, statusJanela]);

  // Carrega a presença atual do aluno quando descobre qual a janela do dia
  useEffect(() => {
    if (aulaAtual && aluno.turma) {
      loadAlunos(aluno.turma, aulaAtual.id);
    }
  }, [aulaAtual, aluno.turma, loadAlunos]);

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

      if (!aulaAtual) {
        setFeedback({
          type: "error",
          text: "Nenhuma aula configurada para receber check-in online.",
        });
        return;
      }

      if (!hojeEhDiaDaJanela) {
        setFeedback({
          type: "error",
          text: `Hoje não é dia de validação para esta aula.`,
        });
        return;
      }

      if (statusJanela === "aguardando") {
        setFeedback({
          type: "error",
          text: `Validação abre às ${aulaAtual.startTime}. Aguarde o horário de início.`,
        });
        return;
      }

      if (statusJanela === "fechada") {
        setFeedback({
          type: "error",
          text: `Validação encerrada às ${aulaAtual.endTime}. Entre em contato com a secretaria.`,
        });
        return;
      }

      confirmarPresencaOnline(aluno.id, aulaAtual.id, "Presente");
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
              <h3 className="text-lg font-bold capitalize">{aluno.nome}</h3>
              <p className="text-xs text-white/70 capitalize">
                {aluno.matricula} · {aluno.turmaNome || aluno.turma}
              </p>
            </div>
          </div>
        </div>

        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <BookOpen className="w-4 h-4 text-primary shrink-0" />
            <span className="font-semibold text-foreground capitalize">
              {aulaAtual ? (aulaAtual.subject?.name || disciplinaAtivaNome) : disciplinaAtivaNome}
            </span>
            {aulaAtual && (
              <Badge variant="outline" className="rounded-full text-[10px] gap-1 font-medium capitalize">
                {getDateLocal(aulaAtual.date).toLocaleDateString('pt-BR', { weekday: 'long' })}
              </Badge>
            )}
          </div>

          {aulaAtual ? (
            <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30 gap-3">
              <div className="space-y-0.5 min-w-0">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                  Horário
                </span>
                <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Timer className="w-4 h-4 text-primary shrink-0" />
                  {aulaAtual.startTime} — {aulaAtual.endTime}
                </p>
              </div>
              <Badge variant="outline" className={`shrink-0 rounded-full text-xs font-semibold ${statusBadgeClass}`}>
                {statusBadgeLabel}
              </Badge>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground border border-dashed border-border rounded-lg p-4">
              A secretaria não liberou nenhuma janela de validação para hoje.
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
                disabled={isLoading || !aulaAtual || statusJanela !== "aberta"}
                className="w-full h-11 font-semibold rounded-lg disabled:opacity-50"
              >
                {isLoading ? "Registrando..." : "Confirmar Presença"}
              </Button>

              {statusJanela === "aguardando" && aulaAtual && hojeEhDiaDaJanela && (
                <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Abre às {aulaAtual.startTime}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
