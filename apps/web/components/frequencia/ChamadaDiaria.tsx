"use client";

import React from "react";
import {
  turmasDisponiveis,
  type AlunoChamada,
  type StatusChamada,
  type TurmaDisponivel,
} from "@repo/database-mocks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, X, Calendar, Shield, Laptop, UserCheck, ChevronDown } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface ChamadaDiariaProps {
  alunos: AlunoChamada[];
  onUpdateStatus: (id: string, status: StatusChamada) => void;
  turmaSelecionada: TurmaDisponivel;
  setTurmaSelecionada: (turma: TurmaDisponivel) => void;
  dataSelecionada: string;
  setDataSelecionada: (data: string) => void;
}

function StatusActionButtons({
  aluno,
  onUpdateStatus,
  compact = false,
}: {
  aluno: AlunoChamada;
  onUpdateStatus: (id: string, status: StatusChamada) => void;
  compact?: boolean;
}) {
  const btnSize = compact ? "xs" : "sm";

  return (
    <div
      className={`flex items-center gap-1.5 ${compact ? "w-full" : "justify-end"}`}
    >
      <Button
        size={btnSize}
        variant={aluno.status_atual === "Presente" ? "default" : "outline"}
        className={
          aluno.status_atual === "Presente"
            ? "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border-emerald-200 font-semibold"
        }
        onClick={() => onUpdateStatus(aluno.id, "Presente")}
      >
        <Check className="w-3.5 h-3.5" />
        {!compact && "Presente"}
      </Button>

      <Button
        size={btnSize}
        variant={aluno.status_atual === "Falta" ? "default" : "outline"}
        className={
          aluno.status_atual === "Falta"
            ? "bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            : "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 font-semibold"
        }
        onClick={() => onUpdateStatus(aluno.id, "Falta")}
      >
        <X className="w-3.5 h-3.5" />
        {!compact && "Falta"}
      </Button>

      <Button
        size={btnSize}
        variant={aluno.status_atual === "Abonado" ? "default" : "outline"}
        className={
          aluno.status_atual === "Abonado"
            ? "bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            : "text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 border-blue-200 font-semibold"
        }
        onClick={() => onUpdateStatus(aluno.id, "Abonado")}
      >
        <Shield className="w-3.5 h-3.5" />
        {!compact && "Abonar"}
      </Button>
    </div>
  );
}

function OnlineStatusIndicator({ status }: { status: StatusChamada }) {
  if (status === "Presente") {
    return (
      <Badge
        variant="outline"
        className="bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-400 font-medium"
      >
        <UserCheck className="w-3.5 h-3.5 mr-1" />
        Validado via Portal
      </Badge>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
      </span>
      Aguardando Check-in
    </span>
  );
}

export function ChamadaDiaria({
  alunos,
  onUpdateStatus,
  turmaSelecionada,
  setTurmaSelecionada,
  dataSelecionada,
  setDataSelecionada,
}: ChamadaDiariaProps) {
  return (
    <div className="w-full rounded-none border-y border-border bg-card overflow-hidden shadow-sm">
      {/* Barra de filtros integrada ao painel */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 p-4 md:px-8 md:py-5 border-b border-border bg-muted/20">
        <div className="flex-1 min-w-0 space-y-1.5">
          <label
            htmlFor="turma-select"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Turma
          </label>
          <div className="relative">
            <select
              id="turma-select"
              value={turmaSelecionada}
              onChange={(e) => setTurmaSelecionada(e.target.value as TurmaDisponivel)}
              className="appearance-none w-full bg-card border border-border rounded-lg px-3 py-2 pr-9 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {turmasDisponiveis.map((turma) => (
                <option key={turma} value={turma}>
                  {turma}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        <div className="space-y-1.5 sm:w-48 shrink-0">
          <label
            htmlFor="data-chamada"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1"
          >
            <Calendar className="w-3.5 h-3.5 text-primary" />
            Data
          </label>
          <input
            id="data-chamada"
            type="date"
            value={dataSelecionada}
            onChange={(e) => setDataSelecionada(e.target.value)}
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <p className="text-xs text-muted-foreground sm:pb-2 sm:ml-auto shrink-0">
          {alunos.length} alunos · {formatDate(dataSelecionada)}
        </p>
      </div>

      {/* Tabela desktop — largura total */}
      <div className="hidden lg:block w-full overflow-x-auto">
        <Table className="w-full">
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-[130px] pl-5">Matrícula</TableHead>
              <TableHead>Aluno</TableHead>
              <TableHead className="w-[130px]">Modalidade</TableHead>
              <TableHead className="w-[200px]">Portal Online</TableHead>
              <TableHead className="w-[280px] text-right pr-5">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alunos.map((aluno) => {
              const isOnline = aluno.modalidade === "Online";
              return (
                <TableRow key={aluno.id} className="hover:bg-muted/15">
                  <TableCell className="font-mono text-xs text-muted-foreground pl-5 py-4">
                    {aluno.matricula}
                  </TableCell>
                  <TableCell className="font-medium py-4">{aluno.nome}</TableCell>
                  <TableCell className="py-4">
                    <Badge
                      variant="outline"
                      className={
                        isOnline
                          ? "bg-indigo-500/10 text-indigo-700 border-none dark:text-indigo-400"
                          : "bg-amber-500/10 text-amber-700 border-none dark:text-amber-400"
                      }
                    >
                      {isOnline ? (
                        <>
                          <Laptop className="w-3 h-3 mr-1" /> Online
                        </>
                      ) : (
                        "Presencial"
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4">
                    {isOnline ? (
                      <OnlineStatusIndicator status={aluno.status_atual} />
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right pr-5 py-4">
                    <StatusActionButtons aluno={aluno} onUpdateStatus={onUpdateStatus} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Lista mobile/tablet */}
      <div className="lg:hidden divide-y divide-border">
        {alunos.map((aluno) => {
          const isOnline = aluno.modalidade === "Online";
          return (
            <div
              key={aluno.id}
              className="p-4 md:p-5 space-y-3 hover:bg-muted/10"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="font-semibold text-foreground">{aluno.nome}</p>
                  <p className="font-mono text-xs text-muted-foreground">{aluno.matricula}</p>
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <Badge
                      variant="outline"
                      className={
                        isOnline
                          ? "text-xs bg-indigo-500/10 text-indigo-700 border-none dark:text-indigo-400"
                          : "text-xs bg-amber-500/10 text-amber-700 border-none dark:text-amber-400"
                      }
                    >
                      {isOnline ? "Online" : "Presencial"}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        aluno.status_atual === "Presente"
                          ? "text-xs bg-emerald-500/10 text-emerald-700 border-emerald-500/25"
                          : aluno.status_atual === "Falta"
                            ? "text-xs bg-rose-500/10 text-rose-700 border-rose-500/25"
                            : "text-xs bg-blue-500/10 text-blue-700 border-blue-500/25"
                      }
                    >
                      {aluno.status_atual}
                    </Badge>
                  </div>
                </div>
                {isOnline && <OnlineStatusIndicator status={aluno.status_atual} />}
              </div>
              <StatusActionButtons
                aluno={aluno}
                onUpdateStatus={onUpdateStatus}
                compact
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
