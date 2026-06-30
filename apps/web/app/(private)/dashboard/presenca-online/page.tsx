"use client";

import React, { useEffect, useState } from "react";
import { tenantConfigMock } from "@repo/database-mocks";
import { ValidacaoOnline } from "@/components/frequencia/ValidacaoOnline";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Loader2, Check, ChevronsUpDown } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function PresencaOnlinePage() {
  const primaryHSL = tenantConfigMock.cor_primaria;
  
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [alunoLogado, setAlunoLogado] = useState<any>(null);
  
  // Para simulacao de admin
  const [todosAlunos, setTodosAlunos] = useState<any[]>([]);
  const [selectedAlunoId, setSelectedAlunoId] = useState<string>("");
  const [alunoPopoverOpen, setAlunoPopoverOpen] = useState(false);

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const token = localStorage.getItem("token");
        const userRole = localStorage.getItem("user_role");
        setRole(userRole);

        // Busca o usuario atual
        const meRes = await fetch("http://localhost:3001/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (meRes.ok) {
          const userData = await meRes.json();
          setAlunoLogado(userData);
          if (userRole === "aluno") {
            setSelectedAlunoId(userData.id);
          }
        }

        // Se for admin/secretaria, carrega todos os alunos pra simular
        if (userRole === "admin" || userRole === "secretaria") {
          const studentsRes = await fetch("http://localhost:3001/api/students", {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (studentsRes.ok) {
            const studentsData = await studentsRes.json();
            setTodosAlunos(studentsData);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar presenca online", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    carregarDados();
  }, []);

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-12 text-slate-500 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Carregando informações...</p>
      </div>
    );
  }

  // Define qual aluno vamos passar para a validacao
  let alunoSimulado = null;
  if (role === "aluno") {
    alunoSimulado = alunoLogado;
  } else if (selectedAlunoId) {
    const match = todosAlunos.find(a => a.id === selectedAlunoId);
    if (match) {
      alunoSimulado = {
        id: match.id,
        nome: match.name,
        matricula: match.registrationNumber,
        turma: match.classId,
        turmaNome: match.class?.name
      };
    }
  }

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

      {(role === "admin" || role === "secretaria") && (
        <div className="mb-8 p-5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3 max-w-xl mx-auto">
          <div>
            <Label className="text-amber-800 font-bold mb-1 flex items-center gap-1.5">
              <span>Simulação de Acesso (Administrador)</span>
            </Label>
            <p className="text-xs text-amber-700/80 mb-3">
              Como administrador, você pode selecionar um aluno para visualizar as janelas e simular a tela exatamente como o aluno vê.
            </p>
          </div>
          
          <Popover open={alunoPopoverOpen} onOpenChange={setAlunoPopoverOpen}>
            <PopoverTrigger
              className={cn(buttonVariants({ variant: "outline" }), "justify-between w-full font-normal h-10 bg-white")}
              role="combobox"
              aria-expanded={alunoPopoverOpen}
            >
              {selectedAlunoId
                ? (() => {
                    const match = todosAlunos.find((a) => a.id === selectedAlunoId);
                    return match ? `${match.name} (${match.registrationNumber})` : "Selecione um aluno para simular...";
                  })()
                : "Selecione um aluno para simular..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </PopoverTrigger>
            <PopoverContent className="w-[450px] p-0" align="start">
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

      {alunoSimulado ? (
        <ValidacaoOnline 
          aluno={{
            id: alunoSimulado.id,
            nome: alunoSimulado.nome || alunoSimulado.name,
            matricula: alunoSimulado.matricula || alunoSimulado.registrationNumber,
            turma: alunoSimulado.turma || alunoSimulado.classId,
            turmaNome: alunoSimulado.turmaNome || alunoSimulado.className
          }} 
          disciplinaAtivaNome="Todas as Disciplinas" 
        />
      ) : (
        <div className="max-w-xl mx-auto p-8 border border-dashed border-border rounded-xl text-center">
          <p className="text-slate-500 text-sm">
            {role === "aluno" 
              ? "Não foi possível carregar os seus dados de aluno." 
              : "Selecione um aluno acima para visualizar a tela de presença online."}
          </p>
        </div>
      )}
    </div>
  );
}
