import React from "react";
import { type BoletimData } from "@repo/database-mocks";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Sparkles, Target } from "lucide-react";
import { StatBlock } from "@/components/boletins/StatBlock";

interface DestaqueDiscursivoProps {
  data: BoletimData;
}

export function DestaqueDiscursivo({ data }: DestaqueDiscursivoProps) {
  const nota = parseFloat(data.destaqueGeral.notaTotalDecimal || "0");
  const maxNota = 20;
  const percent = (nota / maxNota) * 100;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card
        className="md:col-span-1 shadow-lg border-2 overflow-hidden relative"
        style={{ borderColor: "hsl(var(--primary))" }}
      >
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            background: "linear-gradient(135deg, hsl(var(--primary)), transparent)",
          }}
        />
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
          <p className="text-xs text-muted-foreground">de {maxNota}.0 pontos possíveis</p>
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
