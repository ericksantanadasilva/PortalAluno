"use client";

import React, { useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  X,
  BookOpen,
  Trophy,
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

import { DestaqueDiscursivo } from "./DestaqueDiscursivo";

// Helper de cor de dificuldade específico deste simulado (caso precise)
function getDifficultyColor(taxa: number) {
  if (taxa >= 75)
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25";
  if (taxa >= 45)
    return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25";
  return "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/25";
}

interface BoletimDiscursivoViewProps {
  data: BoletimData;
}

export default function BoletimDiscursivoView({ data }: BoletimDiscursivoViewProps) {
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
        <DestaqueDiscursivo data={data} />
      </section>

      {/* ── Grid: Disciplinas + Raio-X (condicional) ── */}
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
              Nota relativa por disciplina discursiva
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
                  className="space-y-3 bg-white dark:bg-card p-5 rounded-xl border border-border border-l-4 shadow-sm"
                  style={{ borderLeftColor: `hsl(${primaryHSL})` }}
                >
                  <h4 className="font-bold flex items-center justify-between border-b border-border/50 pb-2.5 text-sm text-foreground">
                    {disciplina}
                    <Badge
                      variant="destructive"
                      className="bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-900/80 dark:text-rose-100 text-[10px] font-bold px-2 py-0.5 rounded-md"
                    >
                      {temas.length} {temas.length === 1 ? "erro" : "erros"}
                    </Badge>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                    {temas.map((t) => (
                      <div
                        key={t.questao}
                        className="flex flex-col gap-1.5 p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-foreground bg-white dark:bg-background px-1.5 py-0.5 rounded border border-border shadow-sm">
                            Q{t.questao}
                          </span>
                          <X className="w-3.5 h-3.5 text-rose-500/80" />
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground leading-snug">
                          {t.tema}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
