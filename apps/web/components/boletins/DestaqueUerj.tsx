import React from "react";
import { type BoletimData } from "@repo/database-mocks";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, TrendingUp, Sparkles } from "lucide-react";
import { StatBlock } from "@/components/boletins/StatBlock";

interface DestaqueUerjProps {
  data: BoletimData;
}

export function DestaqueUerj({ data }: DestaqueUerjProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Conceito Principal */}
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
