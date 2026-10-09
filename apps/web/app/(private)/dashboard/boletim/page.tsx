"use client";

import React, { useState, useEffect } from "react";
import { PageContainer, EmptyState } from "@/components/layout";
import {
  tenantConfigMock,
  type BoletimData,
} from "@repo/database-mocks";
import { hexToHSL } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  BarChart3,
  GraduationCap,
  PenLine,
  ChevronDown,
  Loader2,
} from "lucide-react";

import { formatDate } from "@/lib/utils";
import { SimulacaoAcesso } from "@/components/layout/SimulacaoAcesso";
import { PageTitle } from "@/components/ui/typography";

import BoletimUerjView from "@/components/boletins/BoletimUerjView";
import BoletimEnemView from "@/components/boletins/BoletimEnemView";
import BoletimEnemParcialView from "@/components/boletins/BoletimEnemParcialView";
import BoletimDiscursivoView from "@/components/boletins/BoletimDiscursivoView";

const COMPONENTES_VIEWS: Record<string, React.ComponentType<{ data: any }>> = {
  UERJ: BoletimUerjView,
  ENEM: BoletimEnemView,
  ENEM_PARCIAL: BoletimEnemParcialView,
  DISCURSIVO: BoletimDiscursivoView,
};

const ICON_SIMULADO: Record<string, React.ReactNode> = {
  UERJ: <GraduationCap className="w-4 h-4" />,
  ENEM: <Target className="w-4 h-4" />,
  ENEM_PARCIAL: <BarChart3 className="w-4 h-4" />,
  DISCURSIVO: <PenLine className="w-4 h-4" />,
};

const API_URL = "/api";

export default function BoletimDetalhado() {
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingBoletins, setLoadingBoletins] = useState(false);

  // Para simulacao de admin
  const [todosAlunos, setTodosAlunos] = useState<any[]>([]);
  const [selectedAlunoId, setSelectedAlunoId] = useState<string>("");

  // Dados reais
  const [boletins, setBoletins] = useState<BoletimData[]>([]);
  const [examAtivoId, setExamAtivoId] = useState<string | null>(null);

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const token = localStorage.getItem("token");
        const userRole = localStorage.getItem("user_role");
        setRole(userRole);

        // Busca o usuario atual
        const meRes = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (meRes.ok) {
          const userData = await meRes.json();
          if (userRole === "aluno") {
            setSelectedAlunoId(userData.id);
            fetchBoletins(userData.id);
          }
        }

        // Se for admin/secretaria, carrega todos os alunos pra simular
        if (["admin", "super_admin", "secretaria"].includes(userRole || '')) {
          const studentsRes = await fetch(`${API_URL}/students`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (studentsRes.ok) {
            setTodosAlunos(await studentsRes.json());
          }
        }
      } catch (error) {
        console.error("Erro ao carregar dados", error);
      } finally {
        setIsLoading(false);
      }
    };

    carregarDados();
  }, []);

  const fetchBoletins = async (studentId: string) => {
    setLoadingBoletins(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/boletins?studentId=${studentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBoletins(data);
        if (data.length > 0) {
          setExamAtivoId(data[0].id);
        } else {
          setExamAtivoId("");
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBoletins(false);
    }
  };

  // Quando o admin escolhe um aluno, busca os boletins dele
  useEffect(() => {
    if (['admin', 'super_admin', 'secretaria'].includes(role || '') && selectedAlunoId) {
      fetchBoletins(selectedAlunoId);
    }
  }, [selectedAlunoId, role]);

  if (isLoading) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center p-12 text-muted-foreground gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Carregando informações...</p>
      </div>
    );
  }

  const boletimAtivo = boletins.find(b => b.id === examAtivoId);
  const primaryHSL = hexToHSL(boletimAtivo?.tenantColor || tenantConfigMock.cor_primaria);
  const tipoSimuladoKey = boletimAtivo?.simulado?.tipo || "ENEM";
  const ActiveView = COMPONENTES_VIEWS[tipoSimuladoKey] || BoletimEnemView;

  return (
    <PageContainer className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ "--primary": primaryHSL } as React.CSSProperties}>
      {["admin", "super_admin", "secretaria"].includes(role || '') && (
        <SimulacaoAcesso
          alunos={todosAlunos}
          selectedAlunoId={selectedAlunoId}
          onSelectAluno={setSelectedAlunoId}
          description="Selecione um aluno para visualizar o Boletim Pedagógico dele"
        />
      )}

      {loadingBoletins ? (
        <div className="w-full h-64 flex flex-col items-center justify-center p-12 text-muted-foreground gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Buscando boletins do aluno...</p>
        </div>
      ) : !boletimAtivo ? (
        <EmptyState
          icon={GraduationCap}
          title="Nenhum boletim disponível"
          description={
            role === "aluno"
              ? "Você ainda não participou de nenhum simulado cujos resultados foram liberados."
              : "Este aluno não participou de nenhum simulado até o momento."
          }
          className="mt-8"
        />
      ) : (
        <>
          {/* ── Cabeçalho Fixo (Título, Matrícula, Nome e Turma) ── */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-border pb-8 pt-4">
            <div className="space-y-2">
              <PageTitle>
                Boletim Pedagógico Avançado
              </PageTitle>
              <p className="text-muted-foreground text-lg">{boletimAtivo.simulado.titulo}</p>
              <p className="text-sm text-muted-foreground">
                Aplicado em {formatDate(boletimAtivo.simulado.data)}
              </p>
            </div>

            {/* Informações do Aluno */}
            <div className="flex flex-col sm:flex-row gap-8 bg-card shadow-sm border border-border rounded-xl p-6 shrink-0 w-full lg:w-auto">
              <div className="space-y-1.5 border-b sm:border-b-0 sm:border-r border-border pb-4 sm:pb-0 sm:pr-8">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
                  Aluno
                </span>
                <p className="text-xl font-semibold text-foreground tracking-tight">{boletimAtivo.aluno.nome}</p>
              </div>
              <div className="space-y-1.5 border-b sm:border-b-0 sm:border-r border-border pb-4 sm:pb-0 sm:pr-8">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
                  Matrícula
                </span>
                <p className="text-lg font-medium text-foreground tabular-nums">
                  {boletimAtivo.aluno.matricula}
                </p>
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
                  Turma
                </span>
                <p className="text-lg font-medium text-foreground">{boletimAtivo.aluno.turma}</p>
              </div>
            </div>
          </div>

          {/* ── Seletor de Versões ── */}
          <div className="flex flex-wrap items-center gap-3 bg-card p-3 rounded-xl border border-border shadow-sm w-fit">
            <label
              htmlFor="tipo-simulado-select"
              className="text-sm font-semibold text-muted-foreground whitespace-nowrap pl-2"
            >
              Simulado Realizado:
            </label>
            <div className="relative">
              <select
                id="tipo-simulado-select"
                value={examAtivoId || ''}
                onChange={(e) => {
                  setExamAtivoId(e.target.value);
                }}
                className="appearance-none bg-background border border-border rounded-lg px-4 py-2 pr-10 text-sm font-bold text-primary cursor-pointer transition-all hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
              >
                {boletins.map((bol) => (
                  <option key={bol.id} value={bol.id}>
                    {bol.simulado.titulo}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary pointer-events-none" />
            </div>
            <Badge
              variant="default"
              className="gap-1.5 py-1.5 px-3 text-xs font-bold rounded-lg shadow-sm"
            >
              {ICON_SIMULADO[tipoSimuladoKey] || <Target className="w-4 h-4" />}
              {boletimAtivo.simulado.totalQuestoes} questões
            </Badge>
          </div>

          {/* ── Visualização Completa Ativa ── */}
          <ActiveView data={boletimAtivo} />
        </>
      )}
    </PageContainer>
  );
}
