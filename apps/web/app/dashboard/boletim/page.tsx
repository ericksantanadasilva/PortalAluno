"use client";

import React, { useState, useMemo } from "react";
import {
  mockBoletins,
  tenantConfigMock,
  type TipoSimulado,
  type BoletimData,
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
  TrendingUp,
  Trophy,
  Target,
  BarChart3,
  GraduationCap,
  PenLine,
  ChevronDown,
  Sparkles,
  Flame,
  Award,
  Brain,
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";

// ── Mapeamento de labels amigáveis ──
const LABEL_SIMULADO: Record<TipoSimulado, string> = {
  UERJ: "UERJ – Exame de Qualificação",
  ENEM: "ENEM – Simulado Completo",
  ENEM_PARCIAL: "ENEM – Parcial (Dia 1)",
  DISCURSIVO: "Prova Discursiva",
};

const ICON_SIMULADO: Record<TipoSimulado, React.ReactNode> = {
  UERJ: <GraduationCap className="w-4 h-4" />,
  ENEM: <Target className="w-4 h-4" />,
  ENEM_PARCIAL: <BarChart3 className="w-4 h-4" />,
  DISCURSIVO: <PenLine className="w-4 h-4" />,
};

// ── Helpers ──
function getDifficultyColor(taxa: number) {
  if (taxa >= 75)
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25";
  if (taxa >= 45)
    return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25";
  return "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/25";
}

function formatDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// ── Componentes internos ──

/** Destaque UERJ: Conceito gigante */
function DestaqueUERJ({ data }: { data: BoletimData }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Conceito Principal */}
      <Card className="md:col-span-1 shadow-lg border-2 overflow-hidden relative"
        style={{ borderColor: "hsl(var(--primary))" }}>
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary)), transparent)" }} />
        <CardContent className="flex flex-col items-center justify-center py-10 relative">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Conceito Obtido
          </p>
          <div
            className="w-28 h-28 rounded-2xl flex items-center justify-center text-6xl font-black text-white shadow-xl mb-3"
            style={{ backgroundColor: "hsl(var(--primary))" }}
          >
            {data.destaqueGeral.conceitoUerj}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Conceito médio da turma:{" "}
            <span className="font-semibold text-foreground">
              {data.resultadoTime.conceitoMedioTurma}
            </span>
          </p>
        </CardContent>
      </Card>

      {/* Acertos e turma */}
      <Card className="md:col-span-2 shadow-sm">
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-6 py-8">
          <StatBlock
            icon={<Trophy className="w-5 h-5" />}
            label="Meus Acertos"
            value={`${data.destaqueGeral.acertos}/${data.destaqueGeral.total}`}
            sub={`${data.destaqueGeral.percentual}% de aproveitamento`}
            accent
          />
          <StatBlock
            icon={<TrendingUp className="w-5 h-5" />}
            label="Média da Turma"
            value={`${data.resultadoTime.mediaTurma}`}
            sub="acertos em média"
          />
          <StatBlock
            icon={<Sparkles className="w-5 h-5" />}
            label="Top Score"
            value={`${data.resultadoTime.maiorNota}`}
            sub="maior acertos da turma"
            highlight
          />
        </CardContent>
      </Card>
    </div>
  );
}

/** Destaque ENEM: Cards TRI em grid */
function DestaqueENEM({ data }: { data: BoletimData }) {
  const tri = data.destaqueGeral.tri!;
  const triCards = [
    { label: "Linguagens", value: tri.linguagens, icon: <BookOpen className="w-4 h-4" /> },
    { label: "Humanas", value: tri.humanas, icon: <Brain className="w-4 h-4" /> },
    { label: "Naturezas", value: tri.naturezas, icon: <Flame className="w-4 h-4" /> },
    { label: "Matemática", value: tri.matematica, icon: <Target className="w-4 h-4" /> },
    { label: "Redação", value: tri.redacao, icon: <PenLine className="w-4 h-4" /> },
  ].filter((c) => c.value > 0);

  const maxTri = Math.max(...triCards.map((c) => c.value));

  return (
    <div className="space-y-4">
      {/* Cards TRI */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {triCards.map((card) => (
          <Card
            key={card.label}
            className={`shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${card.value === maxTri ? "ring-2 ring-offset-2" : ""
              }`}
            style={
              card.value === maxTri
                ? ({ "--tw-ring-color": "hsl(var(--primary))" } as React.CSSProperties)
                : undefined
            }
          >
            <CardContent className="py-5 px-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-2">
                {card.icon}
                <span className="text-xs font-medium uppercase tracking-wide">
                  {card.label}
                </span>
              </div>
              <p className="text-3xl font-bold tracking-tight"
                style={card.value === maxTri ? { color: "hsl(var(--primary))" } : undefined}>
                {card.value.toFixed(1)}
              </p>
              <div className="mt-2">
                <Progress
                  value={(card.value / 1000) * 100}
                  className="h-1.5"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Linha de resumo rápido */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBlock
          icon={<Trophy className="w-5 h-5" />}
          label="Acertos Totais"
          value={`${data.destaqueGeral.acertos}/${data.destaqueGeral.total}`}
          sub={`${data.destaqueGeral.percentual}% de aproveitamento`}
          accent
        />
        <StatBlock
          icon={<TrendingUp className="w-5 h-5" />}
          label="Média TRI Turma"
          value={`${data.resultadoTime.mediaTurma}`}
          sub="pontos médios"
        />
        <StatBlock
          icon={<Sparkles className="w-5 h-5" />}
          label="Top Score"
          value={`${data.resultadoTime.maiorNota}`}
          sub="maior nota da turma"
          highlight
        />
        <StatBlock
          icon={<Award className="w-5 h-5" />}
          label="Menor Nota"
          value={`${data.resultadoTime.menorNota}`}
          sub="menor da turma"
        />
      </div>
    </div>
  );
}

/** Destaque DISCURSIVO: Nota decimal destacada */
function DestaqueDiscursivo({ data }: { data: BoletimData }) {
  const nota = parseFloat(data.destaqueGeral.notaTotalDecimal || "0");
  const maxNota = 20;
  const percent = (nota / maxNota) * 100;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="md:col-span-1 shadow-lg border-2 overflow-hidden relative"
        style={{ borderColor: "hsl(var(--primary))" }}>
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary)), transparent)" }} />
        <CardContent className="flex flex-col items-center justify-center py-10 relative">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Nota Discursiva
          </p>
          <div className="relative mb-4">
            <div
              className="w-32 h-32 rounded-full flex items-center justify-center shadow-xl"
              style={{
                background: `conic-gradient(hsl(var(--primary)) ${percent}%, hsl(var(--muted, 220 14% 96%)) 0%)`,
              }}
            >
              <div className="w-[108px] h-[108px] rounded-full bg-card flex items-center justify-center">
                <span className="text-4xl font-black" style={{ color: "hsl(var(--primary))" }}>
                  {data.destaqueGeral.notaTotalDecimal}
                </span>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            de {maxNota}.0 pontos possíveis
          </p>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 shadow-sm">
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-6 py-8">
          <StatBlock
            icon={<TrendingUp className="w-5 h-5" />}
            label="Média da Turma"
            value={`${data.resultadoTime.mediaTurma}`}
            sub="pontos em média"
          />
          <StatBlock
            icon={<Sparkles className="w-5 h-5" />}
            label="Top Score"
            value={`${data.resultadoTime.maiorNota}`}
            sub="maior nota da turma"
            highlight
          />
          <StatBlock
            icon={<Target className="w-5 h-5" />}
            label="Menor Nota"
            value={`${data.resultadoTime.menorNota}`}
            sub="menor da turma"
          />
        </CardContent>
      </Card>
    </div>
  );
}

/** Bloco de estatística reutilizável */
function StatBlock({
  icon,
  label,
  value,
  sub,
  accent,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p
        className={`text-2xl font-bold tracking-tight ${accent ? "" : highlight ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
          }`}
        style={accent ? { color: "hsl(var(--primary))" } : undefined}
      >
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  Página Principal
// ══════════════════════════════════════════════════════════
export default function BoletimDetalhado() {
  const [tipoAtivo, setTipoAtivo] = useState<TipoSimulado>("UERJ");
  const data = mockBoletins[tipoAtivo];
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
        {/* ── Cabeçalho ── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b pb-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Boletim Pedagógico Avançado
            </h1>
            <p className="text-muted-foreground text-lg">{data.simulado.titulo}</p>
            <p className="text-sm text-muted-foreground">
              Aplicado em {formatDate(data.simulado.data)}
            </p>
          </div>

          {/* Avatar do aluno */}
          {/* <div className="flex items-center gap-3 bg-primary/5 px-4 py-3 rounded-xl border border-primary/10">
            <div
              className="h-11 w-11 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md"
              style={{ backgroundColor: "hsl(var(--secondary))" }}
            >
              {data.aluno.nome
                .split(" ")
                .filter((n) => n.length > 2)
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </div>
            <div>
              <p className="font-semibold leading-tight text-sm">{data.aluno.nome}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{data.aluno.turma}</p>
            </div>
          </div> */}
        </div>

        {/* ── Seletor de Versões ── */}
        <div className="flex items-center gap-3">
          <label
            htmlFor="tipo-simulado-select"
            className="text-sm font-medium text-muted-foreground whitespace-nowrap"
          >
            Versão do Simulado:
          </label>
          <div className="relative">
            <select
              id="tipo-simulado-select"
              value={tipoAtivo}
              onChange={(e) => setTipoAtivo(e.target.value as TipoSimulado)}
              className="appearance-none bg-card border border-border rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-foreground shadow-sm cursor-pointer transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              {(Object.keys(mockBoletins) as TipoSimulado[]).map((tipo) => (
                <option key={tipo} value={tipo}>
                  {LABEL_SIMULADO[tipo]}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
          <Badge
            variant="default"
            className="gap-1.5 py-1 px-3 text-xs font-semibold"
          >
            {ICON_SIMULADO[tipoAtivo]}
            {data.simulado.totalQuestoes} questões
          </Badge>
        </div>

        {/* ── Seção: Seu Resultado (condicional) ── */}
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5" style={{ color: "hsl(var(--primary))" }} />
            Seu Resultado
          </h2>
          {tipoAtivo === "UERJ" && <DestaqueUERJ data={data} />}
          {(tipoAtivo === "ENEM" || tipoAtivo === "ENEM_PARCIAL") && (
            <DestaqueENEM data={data} />
          )}
          {tipoAtivo === "DISCURSIVO" && <DestaqueDiscursivo data={data} />}
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
                {tipoAtivo === "DISCURSIVO"
                  ? "Nota relativa por disciplina discursiva"
                  : "Seus acertos detalhados por área"}
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

          {/* Raio-X do Simulado (condicional) */}
          {temRaioX && (
            <Card className="lg:col-span-2 shadow-sm border-border flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" style={{ color: "hsl(var(--primary))" }} />
                  Raio-X do Simulado
                </CardTitle>
                <CardDescription>
                  Mapeamento das {data.raioXQuestoes!.length} questões. Cores = dificuldade real
                  (taxa de acerto da turma).
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
              <CardContent className="flex-1">
                <div
                  className={`grid gap-2.5 ${data.raioXQuestoes!.length > 60
                    ? "grid-cols-6 sm:grid-cols-10 md:grid-cols-15"
                    : "grid-cols-5 sm:grid-cols-10"
                    }`}
                >
                  {data.raioXQuestoes!.map((q) => (
                    <Tooltip key={q.numero}>
                      <TooltipTrigger>
                        <div
                          className={`relative flex items-center justify-center aspect-square rounded-md border text-sm font-semibold cursor-pointer transition-all hover:scale-110 hover:shadow-md ${getDifficultyColor(
                            q.taxa_acerto_turma
                          )}`}
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
