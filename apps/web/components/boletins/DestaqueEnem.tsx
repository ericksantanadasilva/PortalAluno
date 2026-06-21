import React from "react";
import { type BoletimData } from "@repo/database-mocks";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  Brain,
  Flame,
  Target,
  PenLine,
  Trophy,
  TrendingUp,
  Sparkles,
  Award,
} from "lucide-react";
import { StatBlock } from "@/components/boletins/StatBlock";

interface DestaqueEnemProps {
  data: BoletimData;
}

export function DestaqueEnem({ data }: DestaqueEnemProps) {
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
              <p
                className="text-3xl font-bold tracking-tight"
                style={card.value === maxTri ? { color: "hsl(var(--primary))" } : undefined}
              >
                {card.value.toFixed(1)}
              </p>
              <div className="mt-2">
                <Progress value={(card.value / 1000) * 100} className="h-1.5" />
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
