"use client";

import React, { useState } from "react";
import {
  mockBoletins,
  tenantConfigMock,
  type TipoSimulado,
  type BoletimData,
} from "@repo/database-mocks";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  BarChart3,
  GraduationCap,
  PenLine,
  ChevronDown,
} from "lucide-react";

import { formatDate } from "@/lib/utils";

import BoletimUerjView from "@/components/boletins/BoletimUerjView";
import BoletimEnemView from "@/components/boletins/BoletimEnemView";
import BoletimEnemParcialView from "@/components/boletins/BoletimEnemParcialView";
import BoletimDiscursivoView from "@/components/boletins/BoletimDiscursivoView";

// Dicionário mapeando cada simulado ao seu componente de visualização completo
const COMPONENTES_VIEWS: Record<TipoSimulado, React.ComponentType<{ data: BoletimData }>> = {
  UERJ: BoletimUerjView,
  ENEM: BoletimEnemView,
  ENEM_PARCIAL: BoletimEnemParcialView,
  DISCURSIVO: BoletimDiscursivoView,
};

// Mapeamento de labels amigáveis
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

export default function BoletimDetalhado() {
  const [tipoAtivo, setTipoAtivo] = useState<TipoSimulado>("UERJ");

  const data = mockBoletins[tipoAtivo];
  const primaryHSL = tenantConfigMock.cor_primaria;

  const ActiveView = COMPONENTES_VIEWS[tipoAtivo];

  return (
    <div
      className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500"
      style={{ "--primary": primaryHSL } as React.CSSProperties}
    >
      {/* ── Cabeçalho Fixo (Título, Matrícula, Nome e Turma) ── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b pb-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Boletim Pedagógico Avançado
          </h1>
          <p className="text-muted-foreground text-lg">{data.simulado.titulo}</p>
          <p className="text-sm text-muted-foreground">
            Aplicado em {formatDate(data.simulado.data)}
          </p>
        </div>

        {/* Informações do Aluno */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 bg-card border border-border rounded-2xl p-5 shadow-sm text-sm shrink-0 w-full lg:w-auto">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Aluno
            </span>
            <p className="font-bold text-foreground">{data.aluno.nome}</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Matrícula
            </span>
            <p className="font-medium text-foreground tabular-nums">
              {data.aluno.matricula}
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Turma
            </span>
            <p className="font-medium text-foreground">{data.aluno.turma}</p>
          </div>
        </div>
      </div>

      {/* ── Seletor de Versões ── */}
      <div className="flex flex-wrap items-center gap-3">
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
            onChange={(e) => {
              setTipoAtivo(e.target.value as TipoSimulado);
            }}
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

      {/* ── Visualização Completa Ativa ── */}
      <ActiveView data={data} />
    </div>
  );
}
