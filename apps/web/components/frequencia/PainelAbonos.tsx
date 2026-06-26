"use client";

import React, { useMemo, useState } from "react";
import {
  disciplinasDisponiveis,
  isAbonoAtivo,
  type AlunoChamada,
  type EscopoAbono,
  type HistoricoAbono,
  type TipoAbonoSaaS,
} from "@repo/database-mocks";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
  X,
  ChevronDown,
  Filter,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface PainelAbonosProps {
  abonos: HistoricoAbono[];
  alunos: AlunoChamada[];
  dataReferencia: string;
  onAddAbono: (abono: Omit<HistoricoAbono, "id">) => void;
}

type FiltroStatusAbono = "todos" | "vigentes" | "encerrados";

function formatPeriodo(inicio: string, fim: string) {
  if (inicio === fim) return formatDate(inicio);
  return `${formatDate(inicio)} — ${formatDate(fim)}`;
}

function TipoBadge({ tipo }: { tipo: TipoAbonoSaaS }) {
  const isMerito = tipo === "Mérito";
  return (
    <Badge
      variant="outline"
      className={
        isMerito
          ? "bg-indigo-500/10 text-indigo-700 border-indigo-500/25 dark:text-indigo-400 border-none font-semibold text-[10px] whitespace-nowrap"
          : "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-400 border-none font-semibold text-[10px] whitespace-nowrap"
      }
    >
      <span className="flex items-center gap-1">
        {isMerito ? <Award className="w-3 h-3" /> : <Stethoscope className="w-3 h-3" />}
        {tipo}
      </span>
    </Badge>
  );
}

export function PainelAbonos({
  abonos,
  alunos,
  dataReferencia,
  onAddAbono,
}: PainelAbonosProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filtroAlunoId, setFiltroAlunoId] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatusAbono>("todos");
  const [formAlunoId, setFormAlunoId] = useState("");
  const [tipoAbono, setTipoAbono] = useState<TipoAbonoSaaS>("Eventualidade");
  const [motivo, setMotivo] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [escopo, setEscopo] = useState<EscopoAbono>("Todas as Disciplinas");
  const [disciplina, setDisciplina] = useState<string>(disciplinasDisponiveis[1]);

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

      const vigente = isAbonoAtivo(abono, dataReferencia);
      if (filtroStatus === "vigentes") return vigente;
      if (filtroStatus === "encerrados") return !vigente;
      return true;
    });
  }, [abonosOrdenados, dataReferencia, filtroAlunoId, filtroStatus]);

  const totais = useMemo(() => {
    const vigentes = abonos.filter((a) => isAbonoAtivo(a, dataReferencia)).length;
    return {
      total: abonos.length,
      vigentes,
      encerrados: abonos.length - vigentes,
      eventualidade: abonos.filter((a) => a.tipo === "Eventualidade").length,
      merito: abonos.filter((a) => a.tipo === "Mérito").length,
    };
  }, [abonos, dataReferencia]);

  const resetForm = () => {
    setFormAlunoId("");
    setTipoAbono("Eventualidade");
    setMotivo("");
    setDataInicio("");
    setDataFim("");
    setEscopo("Todas as Disciplinas");
    setDisciplina(disciplinasDisponiveis[1]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAlunoId || !motivo || !dataInicio || !dataFim) return;

    const aluno = alunos.find((a) => a.id === formAlunoId);
    if (!aluno) return;

    onAddAbono({
      alunoId: formAlunoId,
      alunoNome: aluno.nome,
      tipo: tipoAbono,
      motivo,
      dataInicio,
      dataFim,
      escopo,
      disciplina: escopo === "Disciplina Específica" ? disciplina : undefined,
    });

    resetForm();
    setIsModalOpen(false);
  };

  return (
    <div className="w-full space-y-5">
      {/* Cabeçalho + resumo */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-foreground">Histórico de Abonos</h3>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Consulta completa dos registros de{" "}
            <strong className="text-foreground">HistoricoAbono</strong> — eventualidades
            (atestados) e abonos por mérito pedagógico.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="outline" className="text-xs font-semibold">
              {totais.total} registros
            </Badge>
            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-400">
              {totais.vigentes} vigentes
            </Badge>
            <Badge variant="outline" className="text-xs">
              {totais.encerrados} encerrados
            </Badge>
            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-400">
              {totais.eventualidade} eventualidade
            </Badge>
            <Badge variant="outline" className="text-xs bg-indigo-500/10 text-indigo-700 border-indigo-500/25 dark:text-indigo-400">
              {totais.merito} mérito
            </Badge>
          </div>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="hidden lg:flex font-semibold px-6 py-2 items-center gap-2 shadow-sm shrink-0 rounded-full"
        >
          <Plus className="w-4 h-4" />
          Cadastrar Novo Abono
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 flex-1 min-w-0">
          <div className="space-y-1.5 flex-1 min-w-0 sm:max-w-sm">
            <label
              htmlFor="filtro-aluno"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
            >
              <Filter className="w-3.5 h-3.5" />
              Filtrar por aluno
            </label>
            <div className="relative">
              <select
                id="filtro-aluno"
                value={filtroAlunoId}
                onChange={(e) => setFiltroAlunoId(e.target.value)}
                className="appearance-none w-full bg-card border border-border rounded-lg px-3 py-2 pr-9 text-sm font-medium text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Todos os alunos ({abonos.length})</option>
                {alunosOrdenados.map((aluno) => {
                  const qtd = contagemPorAluno.get(aluno.id) ?? 0;
                  return (
                    <option key={aluno.id} value={aluno.id} disabled={qtd === 0}>
                      {aluno.nome} ({qtd} abono{qtd !== 1 ? "s" : ""})
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
              Status
            </span>
            <div className="flex flex-wrap gap-1.5 bg-muted/60 p-1 rounded-lg">
              {(
                [
                  { id: "todos", label: "Todos" },
                  { id: "vigentes", label: "Vigentes" },
                  { id: "encerrados", label: "Encerrados" },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFiltroStatus(item.id)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${
                    filtroStatus === item.id
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabela desktop */}
      <Card className="hidden lg:block border-none shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden rounded-2xl bg-white">
        <CardHeader className="bg-primary/5 border-b border-primary/10 py-4 px-6">
          <CardTitle className="text-sm font-bold text-primary">
            {abonosFiltrados.length} abono{abonosFiltrados.length !== 1 ? "s" : ""} exibido{abonosFiltrados.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/95 z-10">
              <TableRow>
                <TableHead className="min-w-[180px]">Aluno</TableHead>
                <TableHead className="w-[110px]">Tipo</TableHead>
                <TableHead className="min-w-[220px]">Motivo</TableHead>
                <TableHead className="min-w-[180px]">Período</TableHead>
                <TableHead className="w-[160px]">Abrangência</TableHead>
                <TableHead className="w-[90px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {abonosFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    Nenhum abono encontrado para este filtro.
                  </TableCell>
                </TableRow>
              ) : (
                abonosFiltrados.map((abono) => {
                  const vigente = isAbonoAtivo(abono, dataReferencia);
                  return (
                    <TableRow key={abono.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-medium text-sm text-foreground leading-snug">
                            {abono.alunoNome}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {matriculaPorAlunoId[abono.alunoId]
                              ? `${matriculaPorAlunoId[abono.alunoId]}`
                              : ""}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <TipoBadge tipo={abono.tipo} />
                      </TableCell>
                      <TableCell className="text-sm text-foreground">{abono.motivo}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatPeriodo(abono.dataInicio, abono.dataFim)}
                      </TableCell>
                      <TableCell>
                        {abono.escopo === "Todas as Disciplinas" ? (
                          <span className="text-xs font-medium">Todas</span>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="text-[10px] bg-primary/10 text-primary border-none font-semibold"
                          >
                            {abono.disciplina}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            vigente
                              ? "text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-400"
                              : "text-[10px] text-muted-foreground"
                          }
                        >
                          {vigente ? "Vigente" : "Encerrado"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Cards mobile/tablet */}
      <div className="lg:hidden space-y-3 max-h-[600px] overflow-y-auto pr-1">
        {abonosFiltrados.length === 0 ? (
          <Card className="border-dashed border-border p-8 text-center">
            <CardContent>
              <ShieldAlert className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum abono encontrado.</p>
            </CardContent>
          </Card>
        ) : (
          abonosFiltrados.map((abono) => {
            const vigente = isAbonoAtivo(abono, dataReferencia);
            const isMerito = abono.tipo === "Mérito";
            return (
              <Card
                key={abono.id}
                className={`border-none shadow-[0_4px_15px_rgb(0,0,0,0.02)] rounded-2xl overflow-hidden bg-white`}
              >
                <div className={`h-1 ${isMerito ? "bg-indigo-500" : "bg-amber-500"}`} />
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <TipoBadge tipo={abono.tipo} />
                        <Badge
                          variant="outline"
                          className={
                            vigente
                              ? "text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/25"
                              : "text-[10px] text-muted-foreground"
                          }
                        >
                          {vigente ? "Vigente" : "Encerrado"}
                        </Badge>
                      </div>
                      <p className="font-bold text-sm text-foreground">{abono.motivo}</p>
                      <p className="text-[10px] font-mono text-muted-foreground">{abono.id}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 text-xs border-t border-slate-100 pt-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full border-2 border-white ring-1 ring-slate-200 bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{abono.alunoNome}</p>
                        <p className="text-muted-foreground font-mono text-[10px]">
                          {abono.alunoId}
                          {matriculaPorAlunoId[abono.alunoId]
                            ? ` · ${matriculaPorAlunoId[abono.alunoId]}`
                            : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                      {formatPeriodo(abono.dataInicio, abono.dataFim)}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                      {abono.escopo === "Todas as Disciplinas" ? (
                        "Todas as Disciplinas"
                      ) : (
                        <span>
                          Disciplina:{" "}
                          <strong className="text-foreground">{abono.disciplina}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* FAB Mobile */}
      <div className="lg:hidden fixed bottom-6 right-6 z-40">
        <Button
          onClick={() => setIsModalOpen(true)}
          className="rounded-full h-14 w-14 shadow-xl flex items-center justify-center p-0 bg-primary hover:bg-primary/90 transition-transform active:scale-95"
        >
          <Plus className="w-6 h-6 text-primary-foreground" />
        </Button>
      </div>

      {/* Modal de cadastro */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="fixed inset-0" onClick={() => setIsModalOpen(false)} aria-hidden />
          <Card className="relative w-full max-w-lg mx-4 bg-card border border-border shadow-2xl overflow-hidden rounded-2xl z-10 max-h-[90vh] overflow-y-auto">
            <div className="absolute top-4 right-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground h-8 w-8 rounded-full"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <CardHeader className="bg-muted/30 border-b border-border p-5">
              <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Cadastrar Novo Abono
              </CardTitle>
              <CardDescription>
                O abono atualizará automaticamente o status do aluno na chamada.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Aluno
                </label>
                <div className="relative">
                  <select
                    value={formAlunoId}
                    onChange={(e) => setFormAlunoId(e.target.value)}
                    required
                    className="appearance-none w-full bg-card border border-border rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  >
                    <option value="">Selecione um aluno...</option>
                    {alunos.map((aluno) => (
                      <option key={aluno.id} value={aluno.id}>
                        {aluno.nome} ({aluno.modalidade})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Tipo de Abono
                  </label>
                  <div className="flex gap-1 bg-muted p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setTipoAbono("Eventualidade")}
                      className={`flex-1 text-xs font-semibold py-2 px-3 rounded-lg transition-all ${
                        tipoAbono === "Eventualidade"
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Eventualidade
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipoAbono("Mérito")}
                      className={`flex-1 text-xs font-semibold py-2 px-3 rounded-lg transition-all ${
                        tipoAbono === "Mérito"
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Mérito
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Motivo / Descrição
                  </label>
                  <input
                    type="text"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    required
                    placeholder={
                      tipoAbono === "Eventualidade"
                        ? "Ex: Atestado Médico"
                        : "Ex: Mérito Simulado ENEM 1"
                    }
                    className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Data Início
                  </label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    required
                    className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Data Fim
                  </label>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    required
                    className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  />
                </div>
              </div>

              <div className="space-y-2 border-t border-border pt-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  Abrangência do Abono
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
                    <input
                      type="radio"
                      name="escopo"
                      checked={escopo === "Todas as Disciplinas"}
                      onChange={() => setEscopo("Todas as Disciplinas")}
                      className="accent-primary h-4 w-4"
                    />
                    Todas as Disciplinas
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
                    <input
                      type="radio"
                      name="escopo"
                      checked={escopo === "Disciplina Específica"}
                      onChange={() => setEscopo("Disciplina Específica")}
                      className="accent-primary h-4 w-4"
                    />
                    Disciplina Específica
                  </label>
                </div>

                {escopo === "Disciplina Específica" && (
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Disciplina
                    </label>
                    <div className="relative">
                      <select
                        value={disciplina}
                        onChange={(e) => setDisciplina(e.target.value)}
                        className="appearance-none w-full bg-card border border-border rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      >
                        {disciplinasDisponiveis.map((mat) => (
                          <option key={mat} value={mat}>
                            {mat}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl font-semibold"
                >
                  Cancelar
                </Button>
                <Button type="submit" className="font-semibold rounded-xl shadow-sm">
                  Confirmar Cadastro
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
