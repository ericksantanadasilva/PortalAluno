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
        className="md:col-span-1 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl border-none overflow-hidden relative bg-white"
      >
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            background: "linear-gradient(135deg, hsl(var(--primary)), transparent)",
          }}
        />
        <CardContent className="flex flex-col items-center justify-center py-10 relative">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3">
            Conceito Obtido
          </p>
          <div
            className="w-32 h-32 rounded-[2rem] flex items-center justify-center text-7xl font-black shadow-sm mb-4 bg-emerald-50 text-emerald-700 border border-emerald-100"
          >
            {data.destaqueGeral.conceitoUerj}
          </div>
          <p className="text-sm text-slate-500 mt-2">
            Conceito médio da turma:{" "}
            <span className="font-bold text-slate-700">
              {data.resultadoTime.conceitoMedioTurma}
            </span>
          </p>
        </CardContent>
      </Card>

      {/* Acertos e turma */}
      <Card className="md:col-span-2 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white border-none flex flex-col justify-center">
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-6 py-8">
          <StatBlock
            icon={<Trophy className="w-5 h-5" />}
            label="Meus Acertos"
            value={`${data.destaqueGeral.acertos}/${data.destaqueGeral.total}`}
            sub={`${data.destaqueGeral.percentual}% de aproveitamento`}
            accent
            className="text-5xl"
          />
          <StatBlock
            icon={<TrendingUp className="w-5 h-5" />}
            label="Média da Turma"
            value={`${data.resultadoTime.mediaTurma}`}
            sub="acertos em média"
            className="text-5xl"
          />
          <StatBlock
            icon={<Sparkles className="w-5 h-5" />}
            label="Top Score"
            value={`${data.resultadoTime.maiorNota}`}
            sub="maior acertos da turma"
            highlight
            className="text-5xl"
          />
        </CardContent>
      </Card>
    </div>
  );
}
