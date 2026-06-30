"use client";

import React, { useState, useEffect } from "react";
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
  Check,
  ChevronsUpDown
} from "lucide-react";

import { formatDate } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

const API_URL = "http://localhost:3001/api";

export default function BoletimDetalhado() {
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingBoletins, setLoadingBoletins] = useState(false);
  
  // Para simulacao de admin
  const [todosAlunos, setTodosAlunos] = useState<any[]>([]);
  const [selectedAlunoId, setSelectedAlunoId] = useState<string>("");
  const [alunoPopoverOpen, setAlunoPopoverOpen] = useState(false);

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
        if (userRole === "admin" || userRole === "secretaria") {
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
    if ((role === 'admin' || role === 'secretaria') && selectedAlunoId) {
      fetchBoletins(selectedAlunoId);
    }
  }, [selectedAlunoId, role]);

  if (isLoading) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center p-12 text-slate-500 gap-3">
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
    <div
      className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 bg-[#F8FAFC] p-4 sm:p-8 rounded-3xl"
      style={{ "--primary": primaryHSL } as React.CSSProperties}
    >
      {(role === "admin" || role === "secretaria") && (
        <div className="mb-4 p-5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3">
          <div>
            <Label className="text-amber-800 font-bold mb-1 flex items-center gap-1.5">
              <span>Simulação de Acesso (Administrador)</span>
            </Label>
            <p className="text-xs text-amber-700/80 mb-3">
              Selecione um aluno para visualizar o Boletim Pedagógico dele.
            </p>
          </div>
          
          <Popover open={alunoPopoverOpen} onOpenChange={setAlunoPopoverOpen}>
            <PopoverTrigger
              className={cn(buttonVariants({ variant: "outline" }), "justify-between w-[450px] font-normal h-10 bg-white max-w-full")}
              role="combobox"
              aria-expanded={alunoPopoverOpen}
            >
              {selectedAlunoId
                ? (() => {
                    const match = todosAlunos.find((a) => a.id === selectedAlunoId);
                    return match ? `${match.name} (${match.registrationNumber})` : "Selecione um aluno...";
                  })()
                : "Selecione um aluno..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </PopoverTrigger>
            <PopoverContent className="w-[450px] max-w-[90vw] p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar por nome ou matrícula..." />
                <CommandList>
                  <CommandEmpty>Nenhum aluno encontrado.</CommandEmpty>
                  <CommandGroup>
                    {todosAlunos.map((a) => (
                      <CommandItem
                        key={a.id}
                        value={`${a.name} ${a.registrationNumber}`}
                        onSelect={() => {
                          setSelectedAlunoId(a.id);
                          setAlunoPopoverOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedAlunoId === a.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {a.name} ({a.registrationNumber}) - {a.class?.name || "Sem Turma"}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {loadingBoletins ? (
        <div className="w-full h-64 flex flex-col items-center justify-center p-12 text-slate-500 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Buscando boletins do aluno...</p>
        </div>
      ) : !boletimAtivo ? (
        <div className="max-w-2xl p-12 border border-dashed border-border rounded-xl text-center bg-white shadow-sm mx-auto mt-12">
          <GraduationCap className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">Nenhum boletim disponível</h3>
          <p className="text-slate-500 text-sm mt-2">
            {role === "aluno" 
              ? "Você ainda não participou de nenhum simulado cujos resultados foram liberados." 
              : "Este aluno não participou de nenhum simulado até o momento."}
          </p>
        </div>
      ) : (
        <>
          {/* ── Cabeçalho Fixo (Título, Matrícula, Nome e Turma) ── */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-slate-200 pb-8 pt-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Boletim Pedagógico Avançado
              </h1>
              <p className="text-muted-foreground text-lg">{boletimAtivo.simulado.titulo}</p>
              <p className="text-sm text-muted-foreground">
                Aplicado em {formatDate(boletimAtivo.simulado.data)}
              </p>
            </div>

            {/* Informações do Aluno */}
            <div className="flex flex-col sm:flex-row gap-8 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.015)] border border-slate-100 rounded-2xl p-6 shrink-0 w-full lg:w-auto">
              <div className="space-y-1.5 border-b sm:border-b-0 sm:border-r border-slate-100 pb-4 sm:pb-0 sm:pr-8">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
                  Aluno
                </span>
                <p className="text-xl font-semibold text-slate-800 tracking-tight">{boletimAtivo.aluno.nome}</p>
              </div>
              <div className="space-y-1.5 border-b sm:border-b-0 sm:border-r border-slate-100 pb-4 sm:pb-0 sm:pr-8">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
                  Matrícula
                </span>
                <p className="text-lg font-medium text-slate-700 tabular-nums">
                  {boletimAtivo.aluno.matricula}
                </p>
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
                  Turma
                </span>
                <p className="text-lg font-medium text-slate-700">{boletimAtivo.aluno.turma}</p>
              </div>
            </div>
          </div>

          {/* ── Seletor de Versões ── */}
          <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm w-fit">
            <label
              htmlFor="tipo-simulado-select"
              className="text-sm font-semibold text-slate-600 whitespace-nowrap pl-2"
            >
              Simulado Realizado:
            </label>
            <div className="relative">
              <select
                id="tipo-simulado-select"
                value={examAtivoId}
                onChange={(e) => {
                  setExamAtivoId(e.target.value);
                }}
                className="appearance-none bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 pr-10 text-sm font-bold text-primary cursor-pointer transition-all hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
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
    </div>
  );
}
