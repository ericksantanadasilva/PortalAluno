"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useFrequencia, ScheduledClass } from "@/contexts/FrequenciaContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BlockTitle } from "../ui/typography";
import {
  Laptop,
  CheckCircle,
  XCircle,
  Clock,
  BookOpen,
  Timer,
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

type StatusJanela = "aguardando" | "aberta" | "encerrada";

const REFRESH_PRESENCA_MS = 10000;

const getDateLocal = (isoStr: string) => {
  const parts = (isoStr || "").split("T")[0]?.split("-").map(Number) || [2026, 1, 1];
  return new Date(parts[0] || 2026, (parts[1] || 1) - 1, parts[2] || 1);
};

const buildTime = (isoDate: string, hhmm: string) => {
  const d = getDateLocal(isoDate);
  const [h, m] = (hhmm || "").split(":").map(Number);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
};

export function ValidacaoOnline({
  aluno,
  disciplinaAtivaId = "id-da-disciplina",
  disciplinaAtivaNome = "Matemática",
}: ValidacaoOnlineProps) {
  const { scheduledClasses, updateStatus } = useFrequencia();
  const [agora, setAgora] = useState<Date | null>(null);
  const [presencas, setPresencas] = useState<Record<string, boolean>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [feedbacks, setFeedbacks] = useState<
    Record<string, { type: "success" | "error"; text: string }>
  >({});

  // Relógio: reavalia a cada segundo quais janelas estão abertas
  useEffect(() => {
    setAgora(new Date());
    const interval = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Todas as aulas de hoje com validação online liberada para a turma
  const aulasHoje = useMemo(() => {
    if (!agora) return [] as ScheduledClass[];
    const hoje = agora.toDateString();
    return scheduledClasses
      .filter(
        (c) =>
          c.classId === aluno.turma &&
          c.showCard === true &&
          !c.isCanceled &&
          getDateLocal(c.date).toDateString() === hoje
      )
      .sort(
        (a, b) =>
          buildTime(a.date, a.startTime).getTime() -
          buildTime(b.date, b.startTime).getTime()
      );
  }, [scheduledClasses, aluno.turma, agora?.toDateString()]); // eslint-disable-line react-hooks/exhaustive-deps

  const aulasIds = aulasHoje.map((a) => a.id).join(",");

  // Busca a presença do aluno em cada aula do dia
  const carregarPresencas = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token || aulasHoje.length === 0) return;
    const resultados = await Promise.all(
      aulasHoje.map(async (aula) => {
        try {
          const res = await fetch(
            `/api/attendance/classes/${aula.classId}/students?lessonId=${aula.id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (!res.ok) return null;
          const lista = await res.json();
          const registro = lista.find((a: any) => a.id === aluno.id);
          return [aula.id, registro?.status_atual === "Presente"] as const;
        } catch {
          return null;
        }
      })
    );
    setPresencas((prev) => {
      const next = { ...prev };
      resultados.forEach((r) => {
        if (r) next[r[0]] = r[1];
      });
      return next;
    });
  }, [aulasIds, aluno.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    carregarPresencas();
    const interval = setInterval(carregarPresencas, REFRESH_PRESENCA_MS);
    return () => clearInterval(interval);
  }, [carregarPresencas]);

  const getStatus = (aula: ScheduledClass): StatusJanela => {
    if (!agora) return "encerrada";
    const abertura = buildTime(aula.date, aula.startTime).getTime();
    const fechamento = buildTime(aula.date, aula.endTime).getTime();
    const t = agora.getTime();
    if (t < abertura) return "aguardando";
    if (t <= fechamento) return "aberta";
    return "encerrada";
  };

  const setFeedback = (id: string, fb: { type: "success" | "error"; text: string } | null) =>
    setFeedbacks((prev) => {
      const next = { ...prev };
      if (fb) next[id] = fb;
      else delete next[id];
      return next;
    });

  const handleConfirmar = async (aula: ScheduledClass) => {
    setFeedback(aula.id, null);
    setLoadingId(aula.id);

    const status = getStatus(aula);
    if (status === "aguardando") {
      setLoadingId(null);
      setFeedback(aula.id, {
        type: "error",
        text: `Validação abre às ${aula.startTime}. Aguarde o horário de início.`,
      });
      return;
    }
    if (status === "encerrada") {
      setLoadingId(null);
      setFeedback(aula.id, {
        type: "error",
        text: `Validação encerrada às ${aula.endTime}. Entre em contato com a secretaria.`,
      });
      return;
    }

    await updateStatus(aluno.id, aula.id, "Presente", "online");
    setLoadingId(null);
    setPresencas((prev) => ({ ...prev, [aula.id]: true }));
    setFeedback(aula.id, {
      type: "success",
      text: "Presença confirmada! Seu check-in foi registrado na chamada da secretaria.",
    });
    carregarPresencas();
  };

  const iniciais = aluno.nome
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const badgeClass = (s: StatusJanela) =>
    s === "aberta"
      ? "bg-primary/10 text-primary border-primary/20"
      : s === "aguardando"
        ? "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-400"
        : "bg-rose-500/10 text-rose-700 border-rose-500/25 dark:text-rose-400";

  const badgeLabel = (s: StatusJanela) =>
    s === "aberta"
      ? "Validação aberta"
      : s === "aguardando"
        ? "Aguardando abertura"
        : "Validação encerrada";

  const mensagem = (aula: ScheduledClass, s: StatusJanela) =>
    s === "aguardando"
      ? `A validação abre hoje às ${aula.startTime}.`
      : s === "aberta"
        ? "Você pode confirmar sua presença agora."
        : `A validação encerrou às ${aula.endTime}.`;

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
      <Card className="col-span-full border border-border shadow-sm overflow-hidden bg-card rounded-xl">
        <div className="bg-gradient-to-br from-primary/60 to-primary/20 border-b border-primary/40 p-6 text-foreground">
          <div className="flex items-center gap-1.5 mb-4 text-foreground/80">
            <Laptop className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              Portal do Aluno — Presença Online
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-background text-primary flex items-center justify-center font-bold text-lg border border-primary/20">
              {iniciais}
            </div>
            <div>
              <BlockTitle className="capitalize">{aluno.nome}</BlockTitle>
              <p className="text-xs text-foreground/80 capitalize">
                {aluno.matricula} · {aluno.turmaNome || aluno.turma}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {aulasHoje.length === 0 && (
        <p className="col-span-full text-sm text-muted-foreground border border-dashed border-border rounded-lg p-4">
          Nenhuma aula com validação online agendada para hoje.
        </p>
      )}

      {aulasHoje.map((aula) => {
        const status = getStatus(aula);
        const isPresente = presencas[aula.id] === true;
        const feedback = feedbacks[aula.id];

        return (
          <Card
            key={aula.id}
            id={`validacao-aula-${aula.id}`}
            className="border border-border shadow-sm overflow-hidden bg-card rounded-xl h-full"
          >
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <BookOpen className="w-4 h-4 text-primary shrink-0" />
                <span className="font-semibold text-foreground capitalize">
                  {aula.subject?.name || disciplinaAtivaNome}
                </span>
                <Badge variant="outline" className="text-[10px] gap-1 font-medium capitalize">
                  {getDateLocal(aula.date).toLocaleDateString("pt-BR", { weekday: "long" })}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30 gap-3">
                <div className="space-y-0.5 min-w-0">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                    Horário
                  </span>
                  <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Timer className="w-4 h-4 text-primary shrink-0" />
                    {aula.startTime} — {aula.endTime}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`shrink-0 text-xs font-semibold ${badgeClass(status)}`}
                >
                  {badgeLabel(status)}
                </Badge>
              </div>

              {isPresente ? (
                <div className="text-center py-6 space-y-3 border border-primary/20 bg-primary/5 rounded-lg">
                  <CheckCircle className="w-10 h-10 text-primary mx-auto" />
                  <div>
                    <h4 className="font-bold text-primary">Presença Confirmada!</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Sua presença já consta na chamada da secretaria.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">{mensagem(aula, status)}</p>

                  {feedback && (
                    <div
                      className={`p-3 rounded-lg flex items-start gap-2 text-xs font-medium border ${
                        feedback.type === "success"
                          ? "bg-primary/10 text-primary border-primary/20"
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
                    id={`confirmar-presenca-${aula.id}`}
                    onClick={() => handleConfirmar(aula)}
                    disabled={loadingId === aula.id || status !== "aberta"}
                    className="w-full h-11 font-semibold rounded-lg disabled:opacity-50"
                  >
                    {loadingId === aula.id ? "Registrando..." : "Confirmar Presença"}
                  </Button>

                  {status === "aguardando" && (
                    <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Abre às {aula.startTime}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
