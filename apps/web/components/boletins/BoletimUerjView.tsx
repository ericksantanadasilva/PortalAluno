"use client";

import React, { useState, useMemo } from "react";
import {
  type BoletimData,
  tenantConfigMock,
} from "@repo/database-mocks";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  X,
  BookOpen,
  Trophy,
  Target,
  BarChart3,
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";

import { DestaqueUerj } from "./DestaqueUerj";

// Helper de cor de dificuldade específico deste simulado
function getDifficultyColor(taxa: number) {
  if (taxa >= 75)
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25";
  if (taxa >= 45)
    return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25";
  return "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/25";
}

interface BoletimUerjViewProps {
  data: BoletimData;
}

export default function BoletimUerjView({ data }: BoletimUerjViewProps) {
  const [questaoSelecionada, setQuestaoSelecionada] = useState<
    NonNullable<BoletimData["raioXQuestoes"]>[number] | null
  >(null);

  const primaryHSL = tenantConfigMock.cor_primaria;

  // Agrupa temas para revisão por disciplina
  const revisaoPorDisciplina = useMemo(() => {
    return data.temasParaRevisar.reduce(
      (acc, item) => {
        if (!acc[item.disciplina]) acc[item.disciplina] = [];
        acc[item.disciplina]!.push(item);
        return acc;
      },
      {} as Record<string, typeof data.temasParaRevisar>
    );
  }, [data]);

  // Dados para radar chart (desempenho por disciplina)
  const radarData = useMemo(() => {
    return data.desempenhoPorDisciplina.map((d) => ({
      subject: d.nome.length > 12 ? d.nome.slice(0, 12) + "…" : d.nome,
      fullName: d.nome,
      value: Math.round((d.acertos / d.total) * 100),
      acertos: d.acertos,
      total: d.total,
    }));
  }, [data]);

  const temRaioX = !!data.raioXQuestoes && data.raioXQuestoes.length > 0;

  return (
    <TooltipProvider>
      <div
        className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500"
        style={{ "--primary": primaryHSL } as React.CSSProperties}
      >
        {/* ── Seção: Seu Resultado ── */}
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5" style={{ color: "hsl(var(--primary))" }} />
            Seu Resultado
          </h2>
          <DestaqueUerj data={data} />
        </section>

        {/* ── Grid: Disciplinas + Raio-X ── */}
        <div className={`grid gap-8 ${temRaioX ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1"}`}>
          {/* Desempenho por Disciplina */}
          <Card
            className={`shadow-sm flex flex-col ${temRaioX ? "lg:col-span-1" : "col-span-1"}`}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" style={{ color: "hsl(var(--primary))" }} />
                Desempenho por Disciplina
              </CardTitle>
              <CardDescription>
                Seus acertos detalhados por área
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 flex-1">
              {data.desempenhoPorDisciplina.map((disc, i) => {
                const percent = Math.round((disc.acertos / disc.total) * 100);
                return (
                  <div key={i} className="space-y-2 group">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium group-hover:text-primary transition-colors">
                        {disc.nome}
                      </span>
                      <span className="text-muted-foreground tabular-nums">
                        {disc.acertos}/{disc.total}{" "}
                        <span className="text-xs">({percent}%)</span>
                      </span>
                    </div>
                    <Progress value={percent} className="h-2" />
                  </div>
                );
              })}

              {/* Mini Radar Chart */}
              {data.desempenhoPorDisciplina.length >= 3 && (
                <div className="pt-4 border-t border-border/50">
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                    Visão Radar
                  </p>
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
                      <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.5} />
                      <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground, 220 8% 46%))" }}
                      />
                      <PolarRadiusAxis
                        angle={30}
                        domain={[0, 100]}
                        tick={{ fontSize: 9 }}
                        tickCount={4}
                      />
                      <Radar
                        name="Aproveitamento"
                        dataKey="value"
                        stroke={`hsl(${primaryHSL})`}
                        fill={`hsl(${primaryHSL})`}
                        fillOpacity={0.2}
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Raio-X do Simulado */}
          {temRaioX && (
            <Card className="lg:col-span-2 shadow-sm border-border flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" style={{ color: "hsl(var(--primary))" }} />
                  Raio-X do Simulado
                </CardTitle>
                <CardDescription>
                  Mapeamento das {data.raioXQuestoes!.length} questões. Cores = dificuldade real
                  (taxa de acerto da turma). Clique em uma questão para ver os detalhes.
                </CardDescription>
                <div className="flex flex-wrap gap-4 mt-2 text-xs">
                  <div className="flex items-center gap-1.5 font-medium">
                    <div className="w-3 h-3 rounded-full bg-emerald-500/40 border border-emerald-500/50" />
                    Fácil (≥75%)
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <div className="w-3 h-3 rounded-full bg-amber-500/40 border border-amber-500/50" />
                    Média (45-74%)
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <div className="w-3 h-3 rounded-full bg-rose-500/40 border border-rose-500/50" />
                    Difícil (&lt;45%)
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-6">
                <div
                  className={`grid gap-2 ${
                    data.raioXQuestoes!.length > 60
                      ? "grid-cols-4 sm:grid-cols-8 md:grid-cols-12 lg:grid-cols-15"
                      : "grid-cols-5 sm:grid-cols-8 md:grid-cols-10"
                  }`}
                >
                  {data.raioXQuestoes!.map((q) => (
                    <Tooltip key={q.numero}>
                      <TooltipTrigger>
                        <div
                          onClick={() => setQuestaoSelecionada(q)}
                          className={`relative flex items-center justify-center w-full h-auto aspect-square rounded-md border text-xs font-bold cursor-pointer transition-all hover:scale-110 hover:shadow-md ${getDifficultyColor(
                            q.taxa_acerto_turma
                          )} ${
                            questaoSelecionada?.numero === q.numero
                              ? "ring-2 ring-primary ring-offset-1"
                              : ""
                          }`}
                        >
                          {q.numero}
                          <div className="absolute -top-1.5 -right-1.5 bg-background rounded-full p-[2px] shadow-sm ring-1 ring-border">
                            {q.resultado_aluno ? (
                              <Check
                                className="w-3 h-3 text-emerald-600 dark:text-emerald-500"
                                strokeWidth={3}
                              />
                            ) : (
                              <X
                                className="w-3 h-3 text-rose-600 dark:text-rose-500"
                                strokeWidth={3}
                              />
                            )}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="p-4 max-w-[280px] shadow-xl border-border rounded-xl z-50">
                        <div className="space-y-1.5">
                          <p className="font-bold border-b border-border/50 pb-1.5 text-sm">
                            Questão {q.numero}{" "}
                            <span className="text-muted-foreground font-normal mx-1">•</span>{" "}
                            {q.disciplina}
                          </p>
                          <p className="text-sm font-medium mt-1 leading-snug">{q.tema}</p>
                          <div className="flex justify-between items-center pt-2 mt-2 border-t border-border/50 text-xs">
                            <span className="text-muted-foreground font-medium">
                              Acerto da turma:
                            </span>
                            <Badge variant="secondary" className="font-bold text-xs">
                              {q.taxa_acerto_turma}%
                            </Badge>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>

                {/* Alternativa amigável para mobile (ou clique em desktop) */}
                {questaoSelecionada && (
                  <div className="p-4 rounded-xl border bg-muted/40 animate-in fade-in slide-in-from-top-3 duration-300 relative">
                    <button
                      onClick={() => setQuestaoSelecionada(null)}
                      className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors p-1"
                      aria-label="Fechar detalhes"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                      Questão {questaoSelecionada.numero} —{" "}
                      <span className="text-muted-foreground font-normal">
                        {questaoSelecionada.disciplina}
                      </span>
                    </h4>
                    <p className="text-sm text-foreground mb-3 font-medium">
                      {questaoSelecionada.tema}
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-border/50 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Resultado:</span>
                        {questaoSelecionada.resultado_aluno ? (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                            <Check className="w-3.5 h-3.5" strokeWidth={3} /> Acertou
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold bg-rose-500/10 px-2.5 py-0.5 rounded-full">
                            <X className="w-3.5 h-3.5" strokeWidth={3} /> Errou
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Acertos da Turma:</span>
                        <span className="font-bold bg-secondary px-2.5 py-0.5 rounded-full text-foreground">
                          {questaoSelecionada.taxa_acerto_turma}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Foco de Revisão ── */}
        {data.temasParaRevisar.length > 0 && (
          <Card className="border-rose-100 shadow-sm overflow-hidden dark:border-rose-900/30">
            <div className="bg-rose-50/50 dark:bg-rose-900/10 border-b border-rose-100 dark:border-rose-900/30 p-6 flex items-start gap-4">
              <div className="p-3 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-full shrink-0">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-rose-700 dark:text-rose-400 text-xl">
                  Foco de Revisão
                </CardTitle>
                <CardDescription className="text-rose-600/80 dark:text-rose-300/70 mt-1 text-sm md:text-base">
                  Tópicos das questões que você errou. Priorize o estudo destes temas para
                  alavancar sua nota nos próximos simulados.
                </CardDescription>
              </div>
            </div>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(revisaoPorDisciplina).map(([disciplina, temas]) => (
                  <div
                    key={disciplina}
                    className="space-y-3 bg-secondary/20 p-4 rounded-xl border border-border/50"
                  >
                    <h4 className="font-semibold flex items-center justify-between border-b border-border/50 pb-2 text-sm">
                      {disciplina}
                      <Badge
                        variant="outline"
                        className="bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950 dark:border-rose-900 dark:text-rose-400 text-xs font-bold"
                      >
                        {temas.length} {temas.length === 1 ? "erro" : "erros"}
                      </Badge>
                    </h4>
                    <ul className="space-y-2.5 mt-2">
                      {temas.map((t) => (
                        <li
                          key={t.questao}
                          className="text-sm text-muted-foreground flex items-start gap-2.5"
                        >
                          <X className="w-4 h-4 text-rose-500/80 mt-0.5 shrink-0" />
                          <span className="leading-snug">
                            Q{t.questao}: {t.tema}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}
