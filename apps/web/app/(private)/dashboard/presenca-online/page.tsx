"use client";

import { alunoProfileMock, tenantConfigMock } from "@repo/database-mocks";
import { ValidacaoOnline } from "@/components/frequencia/ValidacaoOnline";

export default function PresencaOnlinePage() {
  const primaryHSL = tenantConfigMock.cor_primaria;

  return (
    <div
      className="w-full py-6"
      style={{ "--primary": primaryHSL } as React.CSSProperties}
    >
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Confirmar Presença
        </h1>
        <p className="text-sm text-muted-foreground">
          Valide sua presença online no dia e horário semanal definidos pela secretaria.
        </p>
      </div>
      <ValidacaoOnline aluno={alunoProfileMock} disciplinaAtiva="Biologia" />
    </div>
  );
}
