"use client";

import React, { useMemo, useState } from "react";
import {
  disciplinasDisponiveis,
  isAbonoAtivo,
  type AlunoChamada,
  type HistoricoAbono,
  type TipoAbonoSaaS,
} from "@repo/database-mocks";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Calendar,
  BookOpen,
  User,
  ShieldAlert,
  Award,
  Stethoscope,
  ChevronDown,
  Filter,
  Edit2,
  Trash2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { NovoAbonoDialog } from "./NovoAbonoDialog";

interface HistoricoAbonosViewProps {
  abonos: HistoricoAbono[];
  alunos: AlunoChamada[];
  subjects: { id: string; name: string }[];
  dataReferencia: string;
  onAddAbono?: (abono: Omit<HistoricoAbono, "id">) => void;
  onEditAbono?: (abono: HistoricoAbono) => void;
  onDeleteAbono?: (id: string) => void;
}

type FiltroStatusAbono = "todos" | "vigentes" | "encerrados" | "agendados";

function getAbonoStatus(abono: HistoricoAbono, dataRef: string): "vigente" | "encerrado" | "agendado" {
  if (dataRef >= abono.dataInicio && dataRef <= abono.dataFim) return "vigente";
  if (dataRef < abono.dataInicio) return "agendado";
  return "encerrado";
}


function TipoBadge({ tipo }: { tipo: TipoAbonoSaaS }) {
  const isMerito = tipo === "Mérito";
  return (
    <Badge
      variant="outline"
      className={
        isMerito
          ? "rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 font-semibold tracking-wide uppercase text-[10px] whitespace-nowrap"
          : "rounded-full bg-purple-50 text-purple-700 border border-purple-100 font-semibold tracking-wide uppercase text-[10px] whitespace-nowrap"
      }
    >
      <span className="flex items-center gap-1">
        {isMerito ? <Award className="w-3 h-3" /> : <Stethoscope className="w-3 h-3" />}
        {tipo}
      </span>
    </Badge>
  );
}

export function HistoricoAbonosView({
  abonos,
  alunos,
  subjects,
  dataReferencia,
  onAddAbono,
  onEditAbono,
  onDeleteAbono,
}: HistoricoAbonosViewProps) {
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatusAbono>("todos");
  const [filtroAlunoId, setFiltroAlunoId] = useState<string>("");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | TipoAbonoSaaS>("todos");
  const [isNovoAbonoOpen, setIsNovoAbonoOpen] = useState(false);
  const [abonoEmEdicao, setAbonoEmEdicao] = useState<HistoricoAbono | null>(null);

  const handleOpenEdit = (abono: HistoricoAbono) => {
    setAbonoEmEdicao(abono);
    setIsNovoAbonoOpen(true);
  };

  const handleOpenNew = () => {
    setAbonoEmEdicao(null);
    setIsNovoAbonoOpen(true);
  };

  const handleCloseModal = (open: boolean) => {
    setIsNovoAbonoOpen(open);
    if (!open) {
      setTimeout(() => setAbonoEmEdicao(null), 300); // clear after animation
    }
  };

  const matriculaPorAlunoId = useMemo(
    () => Object.fromEntries(alunos.map((a) => [a.id, a.matricula])),
    [alunos]
  );

  const abonosOrdenados = useMemo(
    () =>
      [...abonos].sort((a, b) => b.dataInicio.localeCompare(a.dataInicio)),
    [abonos]
  );

  const alunosOrdenados = useMemo(
    () => [...alunos].sort((a, b) => a.nome.localeCompare(b.nome)),
    [alunos]
  );

  const contagemPorAluno = useMemo(() => {
    const map = new Map<string, number>();
    abonos.forEach((a) => map.set(a.alunoId, (map.get(a.alunoId) ?? 0) + 1));
    return map;
  }, [abonos]);

  const abonosFiltrados = useMemo(() => {
    return abonosOrdenados.filter((abono) => {
      if (filtroAlunoId && abono.alunoId !== filtroAlunoId) return false;

      const status = getAbonoStatus(abono, dataReferencia);
      if (filtroStatus === "vigentes" && status !== "vigente") return false;
      if (filtroStatus === "encerrados" && status !== "encerrado") return false;
      if (filtroStatus === "agendados" && status !== "agendado") return false;
      return true;
    });
  }, [abonosOrdenados, dataReferencia, filtroAlunoId, filtroStatus]);

  const totais = useMemo(() => {
    const vigentes = abonos.filter((a) => getAbonoStatus(a, dataReferencia) === "vigente").length;
    const encerrados = abonos.filter((a) => getAbonoStatus(a, dataReferencia) === "encerrado").length;
    const agendados = abonos.filter((a) => getAbonoStatus(a, dataReferencia) === "agendado").length;
    return {
      total: abonos.length,
      vigentes,
      encerrados,
      agendados,
      eventualidade: abonos.filter((a) => a.tipo === "Eventualidade").length,
      merito: abonos.filter((a) => a.tipo === "Mérito").length,
    };
  }, [abonos, dataReferencia]);

  return (
    <div className="w-full space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-foreground">Histórico de Abonos</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            {formatDate(dataReferencia)}
          </p>
          <div className="flex flex-wrap gap-2 pt-3">
            <Badge variant="secondary" className="px-3 py-1 text-xs font-semibold tracking-wide uppercase rounded-full bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60">
              <span className="font-bold mr-1 text-slate-900">{totais.total}</span> REGISTROS
            </Badge>
            <Badge variant="secondary" className="px-3 py-1 text-xs font-semibold tracking-wide uppercase rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100">
              <span className="font-bold mr-1">{totais.vigentes}</span> VIGENTES
            </Badge>
            <Badge variant="secondary" className="px-3 py-1 text-xs font-semibold tracking-wide uppercase rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100">
              <span className="font-bold mr-1">{totais.agendados}</span> AGENDADOS
            </Badge>
            <Badge variant="secondary" className="px-3 py-1 text-xs font-semibold tracking-wide uppercase rounded-full bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-100">
              <span className="font-bold mr-1 text-rose-900">{totais.encerrados}</span> ENCERRADOS
            </Badge>
            <Badge variant="secondary" className="px-3 py-1 text-xs font-semibold tracking-wide uppercase rounded-full bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-100">
              <span className="font-bold mr-1">{totais.eventualidade}</span> EVENTUALIDADE
            </Badge>
            <Badge variant="secondary" className="px-3 py-1 text-xs font-semibold tracking-wide uppercase rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100">
              <span className="font-bold mr-1">{totais.merito}</span> MÉRITO
            </Badge>
          </div>
        </div>
        <Button
          className="hidden md:flex font-semibold px-4 py-2 items-center gap-1.5 shadow-sm shrink-0 bg-[#0B5C43] hover:bg-[#084834] text-white"
          onClick={handleOpenNew}
        >
          <Plus className="w-4 h-4" />
          Cadastrar Novo Abono
        </Button>
      </div>

      {isNovoAbonoOpen && (
        <NovoAbonoDialog
          open={isNovoAbonoOpen}
          onOpenChange={handleCloseModal}
          alunos={alunos}
          subjects={subjects}
          abonoEmEdicao={abonoEmEdicao}
          onSalvar={(novoAbono) => {
            if (abonoEmEdicao) {
              if (onEditAbono) onEditAbono({ ...novoAbono, id: abonoEmEdicao.id });
            } else {
              if (onAddAbono) onAddAbono(novoAbono);
            }
            handleCloseModal(false);
          }}
        />
      )}

      {/* Filtros em painel clean */}
      <div className="bg-white dark:bg-card border border-border shadow-sm rounded-xl p-4 flex flex-col md:flex-row gap-6 md:items-end">
        <div className="space-y-2 flex-1 max-w-sm">
          <label
            htmlFor="filtro-aluno"
            className="text-xs font-bold tracking-wider text-muted-foreground uppercase"
          >
            FILTRAR POR ALUNO
          </label>
          <div className="relative">
            <select
              id="filtro-aluno"
              value={filtroAlunoId}
              onChange={(e) => setFiltroAlunoId(e.target.value)}
              className="appearance-none w-full bg-muted/30 border border-border rounded-lg px-4 py-2.5 pr-10 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Todos os alunos ({abonos.length})</option>
              {alunosOrdenados.map((aluno) => {
                const qtd = contagemPorAluno.get(aluno.id) ?? 0;
                return (
                  <option key={aluno.id} value={aluno.id} disabled={qtd === 0}>
                    {aluno.nome}
                  </option>
                );
              })}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase block">
            STATUS
          </span>
          <div className="flex flex-wrap gap-1 bg-muted/40 p-1 rounded-lg w-full">
            {(
              [
                { id: "todos", label: "Todos" },
                { id: "vigentes", label: "Vigentes" },
                { id: "agendados", label: "Agendados" },
                { id: "encerrados", label: "Encerrados" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFiltroStatus(item.id)}
                className={`text-sm font-medium px-5 py-2 rounded-md transition-all ${filtroStatus === item.id
                  ? "bg-white dark:bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabela desktop com novo visual */}
      <div className="hidden md:block bg-white dark:bg-card border border-border shadow-sm rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/10">
          <h3 className="font-bold text-lg text-primary">{abonosFiltrados.length} abonos exibidos</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 w-[280px]">Aluno</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 w-[120px]">Tipo</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500">Motivo</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 w-[160px]">Período</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 w-[160px]">Abrangência</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 w-[100px]">Status</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 w-[100px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {abonosFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    Nenhum abono encontrado para os filtros atuais.
                  </TableCell>
                </TableRow>
              ) : (
                abonosFiltrados.map((abono) => {
                  const status = getAbonoStatus(abono, dataReferencia);
                  return (
                    <TableRow key={abono.id} className="hover:bg-slate-50/80 transition-colors border-none">
                      <TableCell className="font-medium text-foreground py-4 align-top">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 bg-slate-50 shrink-0">
                            <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(abono.alunoNome)}&background=random`} alt={abono.alunoNome} />
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-foreground">
                              {abono.alunoNome}
                            </p>
                            <p className="font-normal text-xs text-slate-400">
                              {matriculaPorAlunoId[abono.alunoId] || abono.alunoId}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 align-top">
                        <div className="mt-1">
                          <TipoBadge tipo={abono.tipo} />
                        </div>
                      </TableCell>
                      <TableCell className="py-4 align-top max-w-[200px] truncate" title={abono.motivo}>
                        <div className="mt-1">
                          <span className="text-sm font-semibold">{abono.motivo}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 align-top text-sm text-muted-foreground">
                        <div className="mt-1 flex items-start gap-1.5">
                          <Calendar className="w-3.5 h-3.5 mt-0.5 opacity-50 shrink-0" />
                          <span className="leading-snug">
                            {formatDate(abono.dataInicio)} —<br />
                            {formatDate(abono.dataFim)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 align-top">
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {abono.escopo === "Disciplina Específica" && abono.disciplina ? (
                            (() => {
                              const disciplinas = abono.disciplina.split(",").map((d) => d.trim()).filter(Boolean);
                              return (
                                <div className="flex flex-wrap items-center gap-1.5" title={abono.disciplina}>
                                  <Badge variant="outline" className="rounded-full bg-slate-50 text-slate-600 border border-slate-200/60 font-semibold normal-case text-xs">
                                    {disciplinas[0]}
                                  </Badge>
                                  {disciplinas.length > 1 && (
                                    <Badge variant="secondary" className="rounded-full bg-slate-100 text-slate-500 border-none font-semibold normal-case text-[10px] cursor-help">
                                      +{disciplinas.length - 1} matérias
                                    </Badge>
                                  )}
                                </div>
                              );
                            })()
                          ) : (
                            <Badge variant="secondary" className="rounded-full bg-slate-100 text-slate-500 border-none font-semibold normal-case text-[10px]">
                              Todas
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 align-top">
                        <div className="mt-1">
                          <Badge
                            variant="outline"
                            className={
                              status === "vigente"
                                ? "rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-semibold tracking-wide uppercase text-[10px]"
                                : status === "agendado"
                                  ? "rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-semibold tracking-wide uppercase text-[10px]"
                                  : "rounded-full bg-rose-50 text-rose-700 border border-rose-100 font-semibold tracking-wide uppercase text-[10px]"
                            }
                          >
                            {status === "vigente" ? "Vigente" : status === "agendado" ? "Agendado" : "Encerrado"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 align-top text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(abono)} className="h-8 w-8 text-slate-500 hover:text-primary">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => {
                            if (window.confirm("Deseja realmente remover este abono?")) {
                              onDeleteAbono && onDeleteAbono(abono.id);
                            }
                          }} className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Cards mobile com novo visual empilhado limpo */}
      <div className="md:hidden space-y-4 pb-20">
        {abonosFiltrados.length === 0 ? (
          <Card className="border-dashed border-border p-8 text-center bg-transparent">
            <CardContent>
              <ShieldAlert className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum abono encontrado.</p>
            </CardContent>
          </Card>
        ) : (
          abonosFiltrados.map((abono) => {
            const status = getAbonoStatus(abono, dataReferencia);
            return (
              <div
                key={abono.id}
                className="bg-white dark:bg-card border border-border shadow-sm rounded-xl p-5 space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-border bg-muted shrink-0">
                      <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(abono.alunoNome)}&background=random`} alt={abono.alunoNome} />
                    </div>
                    <div>
                      <p className="font-bold text-base text-foreground">
                        {abono.alunoNome}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {matriculaPorAlunoId[abono.alunoId] || abono.alunoId}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      status === "vigente"
                        ? "rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-semibold tracking-wide uppercase text-[10px]"
                        : status === "agendado"
                          ? "rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-semibold tracking-wide uppercase text-[10px]"
                          : "rounded-full bg-rose-50 text-rose-700 border border-rose-100 font-semibold tracking-wide uppercase text-[10px]"
                    }
                  >
                    {status === "vigente" ? "Vigente" : status === "agendado" ? "Agendado" : "Encerrado"}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <TipoBadge tipo={abono.tipo} />
                  <p className="text-[10px] font-bold text-muted-foreground tracking-widest mt-3 mb-1">MOTIVO</p>
                  <p className="font-medium text-sm text-foreground italic">{abono.motivo}</p>
                </div>

                <div className="flex items-center justify-between border-t border-border pt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                    {status === "vigente" ? `Até ${formatDate(abono.dataFim)}` : status === "agendado" ? `Inicia em ${formatDate(abono.dataInicio)}` : `Encerrado em ${formatDate(abono.dataFim)}`}
                  </div>
                  {abono.escopo !== "Todas as Disciplinas" && abono.disciplina && (
                    <div className="flex flex-wrap gap-1.5 justify-end mt-2 w-full">
                      {(() => {
                        const disciplinas = abono.disciplina.split(",").map((d) => d.trim()).filter(Boolean);
                        return (
                          <>
                            {disciplinas.map((d, idx) => (
                              <Badge key={idx} variant="outline" className="rounded-full bg-slate-50 text-slate-600 border border-slate-200/60 font-semibold normal-case text-xs">
                                {d}
                              </Badge>
                            ))}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 pt-2 border-t border-border mt-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(abono)} className="text-slate-500 hover:text-primary gap-1">
                    <Edit2 className="w-3.5 h-3.5" /> Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => {
                    if (window.confirm("Deseja realmente remover este abono?")) {
                      onDeleteAbono && onDeleteAbono(abono.id);
                    }
                  }} className="text-destructive hover:bg-destructive/10 hover:text-destructive gap-1">
                    <Trash2 className="w-3.5 h-3.5" /> Remover
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FAB (Mobile) */}
      <button onClick={handleOpenNew} className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-[#0B5C43] hover:bg-[#084834] text-white rounded-full shadow-lg flex items-center justify-center transition-transform active:scale-95 z-50">
        <Plus className="w-7 h-7" />
      </button>

    </div>
  );
}
