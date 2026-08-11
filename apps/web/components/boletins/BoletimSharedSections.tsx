"use client";

import React, { useMemo } from "react";
import { type BoletimData } from "@repo/database-mocks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BookOpen, BarChart3 } from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";

/**
 * Retorna a classe de cor de acordo com a taxa de acerto/dificuldade.
 */
export function getDifficultyColor(taxa: number) {
  if (taxa >= 75)
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-none";
  if (taxa >= 45)
    return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-none";
  return "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 border-none";
}

interface DesempenhoPorDisciplinaSectionProps {
  data: BoletimData;
  primaryHSL: string;
  className?: string;
}

/**
 * Seção compartilhada: Desempenho por Disciplina (Lista de progresso + Radar Chart).
 */
export function DesempenhoPorDisciplinaSection({
  data,
  primaryHSL,
  className,
}: DesempenhoPorDisciplinaSectionProps) {
  const radarData = useMemo(() => {
    return data.desempenhoPorDisciplina.map((d) => ({
      subject: d.nome.length > 12 ? d.nome.slice(0, 12) + "…" : d.nome,
      fullName: d.nome,
      value: Math.round((d.acertos / d.total) * 100),
      acertos: d.acertos,
      total: d.total,
    }));
  }, [data]);

  return (
    <Card
      className={`shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-card border-border flex flex-col ${className || ""}`}
    >
      <CardHeader className="p-8 pb-4">
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Desempenho por Disciplina
        </CardTitle>
        <CardDescription>
          Acertos e percentual de aproveitamento relativo por matéria
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 flex-1 px-8 pb-8">
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
  );
}

interface PlanoRevisaoSectionProps {
  data: BoletimData;
  primaryHSL: string;
}

/**
 * Seção compartilhada: Foco de Revisão / Tópicos Críticos.
 */
export function PlanoRevisaoSection({ data, primaryHSL }: PlanoRevisaoSectionProps) {
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

  if (data.temasParaRevisar.length === 0) return null;

  return (
    <Card className="border-border shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-card overflow-hidden">
      <div className="bg-primary/5 border-b border-primary/10 p-8 flex items-start gap-4">
        <div className="p-3 bg-background text-primary rounded-xl shadow-sm shrink-0">
          <BookOpen className="w-6 h-6" />
        </div>
        <div>
          <CardTitle className="text-primary text-xl">
            Plano de Ação Primário: Tópicos Críticos para Revisão
          </CardTitle>
          <CardDescription className="text-primary/70 mt-1 text-sm md:text-base">
            Mapeamento inteligente das lacunas de conhecimento. Priorize estes temas para maximizar a sua evolução de nota.
          </CardDescription>
        </div>
      </div>
      <CardContent className="p-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(revisaoPorDisciplina).map(([disciplina, temas]) => (
            <div
              key={disciplina}
              className="space-y-4 bg-card p-6 rounded-2xl border-l-4 border-border shadow-[0_4px_15px_rgb(0,0,0,0.02)] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
              style={{ borderLeftColor: `hsl(${primaryHSL})` }}
            >
              <h4 className="font-bold flex items-center justify-between pb-2 text-sm text-foreground">
                {disciplina}
                <Badge
                  variant="secondary"
                  className="bg-primary/10 text-primary hover:bg-primary/20 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm"
                >
                  {temas.length} {temas.length === 1 ? "erro" : "erros"}
                </Badge>
              </h4>
              <div className="grid grid-cols-1 gap-3">
                {temas.map((t) => (
                  <div
                    key={t.questao}
                    className="flex flex-col gap-2 p-3.5 rounded-xl bg-muted/50 border border-border hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-foreground bg-background px-1.5 py-0.5 rounded border border-border shadow-sm">
                        Q{t.questao}
                      </span>
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
  );
}
