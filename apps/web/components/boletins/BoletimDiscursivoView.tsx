"use client";

import React from "react";
import { type BoletimData, tenantConfigMock } from "@repo/database-mocks";
import { Trophy } from "lucide-react";
import { DestaqueDiscursivo } from "./DestaqueDiscursivo";
import { hexToHSL } from "@/lib/utils";
import {
  DesempenhoPorDisciplinaSection,
  PlanoRevisaoSection,
} from "./BoletimSharedSections";

interface BoletimDiscursivoViewProps {
  data: BoletimData;
}

export default function BoletimDiscursivoView({ data }: BoletimDiscursivoViewProps) {
  const primaryHSL = hexToHSL(data.tenantColor || tenantConfigMock.cor_primaria);
  const temRaioX = !!data.raioXQuestoes && data.raioXQuestoes.length > 0;

  return (
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
        <DestaqueDiscursivo data={data} />
      </section>

      {/* ── Grid: Disciplinas + Raio-X (condicional) ── */}
      <div className={`grid gap-8 ${temRaioX ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1"}`}>
        <DesempenhoPorDisciplinaSection
          data={data}
          primaryHSL={primaryHSL}
          className={temRaioX ? "lg:col-span-1" : "col-span-1"}
        />
      </div>

      {/* ── Foco de Revisão ── */}
      <PlanoRevisaoSection data={data} primaryHSL={primaryHSL} />
    </div>
  );
}
