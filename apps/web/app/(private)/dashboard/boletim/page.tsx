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
      className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 bg-[#F8FAFC] p-4 sm:p-8 rounded-3xl"
      style={{ "--primary": primaryHSL } as React.CSSProperties}
    >
      {/* ── Cabeçalho Fixo (Título, Matrícula, Nome e Turma) ── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-slate-100 pb-8">
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
        <div className="flex flex-col sm:flex-row gap-8 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.015)] border-0 rounded-2xl p-6 shrink-0 w-full lg:w-auto">
          <div className="space-y-1.5 border-b sm:border-b-0 sm:border-r border-slate-100 pb-4 sm:pb-0 sm:pr-8">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
              Aluno
            </span>
            <p className="text-xl font-semibold text-slate-800 tracking-tight">{data.aluno.nome}</p>
          </div>
          <div className="space-y-1.5 border-b sm:border-b-0 sm:border-r border-slate-100 pb-4 sm:pb-0 sm:pr-8">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
              Matrícula
            </span>
            <p className="text-lg font-medium text-slate-700 tabular-nums">
              {data.aluno.matricula}
            </p>
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
              Turma
            </span>
            <p className="text-lg font-medium text-slate-700">{data.aluno.turma}</p>
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
            className="appearance-none bg-white border-0 shadow-[0_4px_15px_rgb(0,0,0,0.015)] rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-slate-700 cursor-pointer transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.03)] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
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
          className="gap-1.5 py-1 px-3 text-xs font-semibold rounded-full"
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
