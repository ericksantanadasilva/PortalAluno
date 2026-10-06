"use client";

import React, { useEffect, useState } from "react";
import { PageContainer, PageHeader, EmptyState } from "@/components/layout";
import { ValidacaoOnline } from "@/components/frequencia/ValidacaoOnline";
import { Loader2, Laptop } from "lucide-react";
import { SimulacaoAcesso } from "@/components/layout/SimulacaoAcesso";

export default function PresencaOnlinePage() {
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [alunoLogado, setAlunoLogado] = useState<any>(null);

  // Para simulacao de admin
  const [todosAlunos, setTodosAlunos] = useState<any[]>([]);
  const [selectedAlunoId, setSelectedAlunoId] = useState<string>("");

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const token = localStorage.getItem("token");
        const userRole = localStorage.getItem("user_role");
        setRole(userRole);

        // Busca o usuario atual
        const meRes = await fetch("/api/auth/me", {
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
        if (["admin", "super_admin", "secretaria"].includes(userRole || '')) {
          const studentsRes = await fetch("/api/students", {
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
      <div className="w-full h-full flex flex-col items-center justify-center p-12 text-muted-foreground gap-3">
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
    <PageContainer>
      <PageHeader
        title="Confirmar Presença"
        description="Valide sua presença online no dia e horário semanal definidos pela secretaria."
      />

      {["admin", "super_admin", "secretaria"].includes(role || '') && (
        <SimulacaoAcesso
          alunos={todosAlunos}
          selectedAlunoId={selectedAlunoId}
          onSelectAluno={setSelectedAlunoId}
          description="Selecione um aluno para ver as janelas e simular a tela como ele vê."
        />
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
        <EmptyState
          icon={Laptop}
          title={role === "aluno" ? "Dados não encontrados" : "Aguardando Seleção"}
          description={
            role === "aluno"
              ? "Não foi possível carregar os seus dados de aluno."
              : "Selecione um aluno acima para visualizar a tela de presença online."
          }
        />
      )}
    </PageContainer>
  );
}
