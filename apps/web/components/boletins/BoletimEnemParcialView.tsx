"use client";

import React, { useState } from "react";
import { type BoletimData, tenantConfigMock } from "@repo/database-mocks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tooltip, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Check, X, Trophy, Target } from "lucide-react";
import { DestaqueEnem } from "./DestaqueEnem";
import { hexToHSL } from "@/lib/utils";
import {
  DesempenhoPorDisciplinaSection,
  PlanoRevisaoSection,
  getDifficultyColor,
} from "./BoletimSharedSections";

interface BoletimEnemParcialViewProps {
  data: BoletimData;
}

export default function BoletimEnemParcialView({ data }: BoletimEnemParcialViewProps) {
  const [questaoSelecionada, setQuestaoSelecionada] = useState<
    NonNullable<BoletimData["raioXQuestoes"]>[number] | null
  >(null);

  const primaryHSL = hexToHSL(data.tenantColor || tenantConfigMock.cor_primaria);
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
            <Trophy className="w-5 h-5 text-primary" />
            Seu Resultado
          </h2>
          <DestaqueEnem data={data} />
        </section>

        {/* ── Grid: Disciplinas + Raio-X ── */}
        <div className={`grid gap-8 ${temRaioX ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1"}`}>
          <DesempenhoPorDisciplinaSection
            data={data}
            primaryHSL={primaryHSL}
            className={temRaioX ? "lg:col-span-1" : "col-span-1"}
          />

          {temRaioX && (
            <Card className="lg:col-span-2 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-card border-border flex flex-col">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Raio-X do Simulado
                </CardTitle>
                <CardDescription>
                  Análise de diagnóstico das {data.raioXQuestoes!.length} questões. Clique em uma questão para ver os detalhes.
                </CardDescription>
                <div className="flex flex-wrap gap-4 mt-2 text-xs">
                  <div className="flex items-center gap-1.5 font-medium">
                    <div className="w-3 h-3 rounded-full bg-emerald-50 border border-emerald-100 dark:bg-emerald-900/30" />
                    Fácil (≥75%)
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <div className="w-3 h-3 rounded-full bg-slate-100 border border-slate-200 dark:bg-slate-800" />
                    Média (45-74%)
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <div className="w-3 h-3 rounded-full bg-rose-50 border border-rose-100 dark:bg-rose-900/30" />
                    Difícil (&lt;45%)
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-8 px-8 pb-8">
                <div
                  className={`grid gap-2 ${data.raioXQuestoes!.length > 60
                    ? "grid-cols-4 sm:grid-cols-8 md:grid-cols-12 lg:grid-cols-15"
                    : "grid-cols-5 sm:grid-cols-8 md:grid-cols-10"
                    }`}
                >
                  {data.raioXQuestoes!.map((q) => (
                    <Tooltip key={q.numero}>
                      <TooltipTrigger>
                        <div
                          onClick={() => setQuestaoSelecionada(q)}
                          className={`relative flex items-center justify-center w-full h-auto aspect-square rounded-lg font-semibold cursor-pointer transition-all hover:scale-105 hover:shadow-md ${getDifficultyColor(
                            q.taxa_acerto_turma
                          )} ${questaoSelecionada?.numero === q.numero
                            ? "ring-2 ring-primary ring-offset-2 scale-110"
                            : ""
                            }`}
                        >
                          {q.numero}
                          <div className="absolute -top-1.5 -right-1.5 bg-background rounded-full p-[2px] shadow-sm flex items-center justify-center z-10">
                            {q.resultado_aluno ? (
                              <Check
                                className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-500"
                                strokeWidth={4}
                              />
                            ) : (
                              <X
                                className="w-2.5 h-2.5 text-rose-600 dark:text-rose-500"
                                strokeWidth={4}
                              />
                            )}
                          </div>
                        </div>
                      </TooltipTrigger>
                    </Tooltip>
                  ))}
                </div>

                {questaoSelecionada && (
                  <div className="p-5 rounded-xl border border-border bg-muted/40 animate-in fade-in slide-in-from-top-3 duration-300 relative shadow-sm">
                    <button
                      onClick={() => setQuestaoSelecionada(null)}
                      className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-1"
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
                    <p className="text-base text-foreground mb-4 font-bold">
                      {questaoSelecionada.tema}
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border/50 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-bold uppercase tracking-wider text-[10px]">Resultado:</span>
                        {questaoSelecionada.resultado_aluno ? (
                          <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1 rounded-full">
                            <Check className="w-3.5 h-3.5" strokeWidth={4} /> Acertou
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-bold bg-rose-500/10 px-3 py-1 rounded-full">
                            <X className="w-3.5 h-3.5" strokeWidth={4} /> Errou
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-bold uppercase tracking-wider text-[10px]">Acertos da Turma:</span>
                        <span className="font-bold bg-rose-600 text-white dark:bg-rose-700 px-3 py-1 rounded-full">
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
        <PlanoRevisaoSection data={data} primaryHSL={primaryHSL} />
      </div>
    </TooltipProvider>
  );
}
