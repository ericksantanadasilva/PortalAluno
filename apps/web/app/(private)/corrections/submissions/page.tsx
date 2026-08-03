'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { FileText, Loader2, Eye, Filter, RefreshCw, CheckCircle2, Clock, PlayCircle } from 'lucide-react';

interface ExamItem {
  id: string;
  title: string;
}

interface SubmissionItem {
  id: string;
  type: 'PRESENTIAL' | 'ONLINE';
  status: 'PENDING_CORRECTION' | 'UNDER_CORRECTION' | 'CORRECTED';
  originalPdfUrl: string;
  correctedPdfUrl?: string;
  totalScore?: number;
  submittedAt: string;
  student: {
    id: string;
    name: string;
    registrationNumber: string;
    email: string;
  };
  exam: {
    id: string;
    title: string;
  };
  batchItem?: {
    batch: {
      id: string;
      corrector: {
        id: string;
        name: string;
      };
    };
  };
}

export default function SubmissionsOverviewPage() {
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [filterExamId, setFilterExamId] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const [viewPdfModal, setViewPdfModal] = useState<{
    isOpen: boolean;
    url: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    fetchExams();
    fetchSubmissions();
  }, []);

  const fetchExams = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/discursive/exams', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setExams(data);
      }
    } catch (e) {
      console.error('Erro ao buscar simulados:', e);
    }
  };

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filterExamId && filterExamId !== 'all') params.append('examId', filterExamId);
      if (filterStatus && filterStatus !== 'all') params.append('status', filterStatus);
      if (filterType && filterType !== 'all') params.append('type', filterType);

      const res = await fetch(`/api/discursive/submissions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data);
      }
    } catch (e) {
      console.error('Erro ao buscar submissões:', e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_CORRECTION':
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-medium">
            <Clock className="size-3 mr-1" /> Aguardando Lote
          </Badge>
        );
      case 'UNDER_CORRECTION':
        return (
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 font-medium">
            <PlayCircle className="size-3 mr-1" /> Em Correção
          </Badge>
        );
      case 'CORRECTED':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-medium">
            <CheckCircle2 className="size-3 mr-1" /> Corrigida
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-md">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-xl">Participações & Entregas de Provas</CardTitle>
            <CardDescription>
              Acompanhe todas as provas recebidas, presencial ou online, e seu respectivo status na fila.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSubmissions}
            disabled={loading}
            className="gap-2 shrink-0"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            <span>Atualizar Lista</span>
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Barra de Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-muted/40 border border-border">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Simulado
              </label>
              <Select value={filterExamId} onValueChange={setFilterExamId}>
                <SelectTrigger className="w-full h-10 truncate">
                  <SelectValue placeholder="Todos os Simulados">
                    {filterExamId === "all"
                      ? "Todos os Simulados"
                      : exams.find((ex) => ex.id === filterExamId)?.title || "Todos os Simulados"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Simulados</SelectItem>
                  {exams.map((ex) => (
                    <SelectItem key={ex.id} value={ex.id}>{ex.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Status de Correção
              </label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full h-10 truncate">
                  <SelectValue placeholder="Todos os Status">
                    {filterStatus === "all"
                      ? "Todos os Status"
                      : filterStatus === "PENDING_CORRECTION"
                        ? "Aguardando Lote"
                        : filterStatus === "UNDER_CORRECTION"
                          ? "Em Correção"
                          : "Corrigida"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="PENDING_CORRECTION">Aguardando Lote</SelectItem>
                  <SelectItem value="UNDER_CORRECTION">Em Correção</SelectItem>
                  <SelectItem value="CORRECTED">Corrigida</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Modalidade
              </label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full h-10 truncate">
                  <SelectValue placeholder="Ambas Modalidades">
                    {filterType === "all"
                      ? "Presencial & Online"
                      : filterType === "PRESENTIAL"
                        ? "Presencial"
                        : "Online"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Presencial & Online</SelectItem>
                  <SelectItem value="PRESENTIAL">Presencial</SelectItem>
                  <SelectItem value="ONLINE">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={fetchSubmissions} className="w-full h-10 font-semibold shadow-sm">
                <Filter className="size-4 mr-2" />
                <span>Aplicar Filtros</span>
              </Button>
            </div>
          </div>

          {/* Tabela de Submissões */}
          <div className="border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead>Aluno / Matrícula</TableHead>
                  <TableHead>Simulado</TableHead>
                  <TableHead>Modalidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Corretor Responsável</TableHead>
                  <TableHead>Nota Total</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <Loader2 className="size-6 animate-spin mx-auto text-primary" />
                      <span className="text-sm text-muted-foreground mt-2 block">Carregando submissões...</span>
                    </TableCell>
                  </TableRow>
                ) : submissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      Nenhuma submissão encontrada com os filtros informados.
                    </TableCell>
                  </TableRow>
                ) : (
                  submissions.map((sub) => (
                    <TableRow key={sub.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="font-semibold text-foreground">{sub.student.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">MAT: {sub.student.registrationNumber}</div>
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        <div>{sub.exam.title}</div>
                        {sub.subjectName && sub.subjectName !== 'Geral' && (
                          <Badge variant="secondary" className="mt-1 text-xs font-semibold bg-primary/15 text-primary">
                            {sub.subjectName}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {sub.type === 'PRESENTIAL' ? (
                          <Badge variant="outline" className="border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/10">
                            Presencial
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-teal-500/30 text-teal-600 dark:text-teal-400 bg-teal-500/10">
                            Online
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(sub.status)}</TableCell>
                      <TableCell className="text-sm font-medium">
                        {sub.batchItem?.batch.corrector.name ? (
                          <span className="text-primary">{sub.batchItem.batch.corrector.name}</span>
                        ) : (
                          <span className="text-muted-foreground italic">— não distribuído —</span>
                        )}
                      </TableCell>
                      <TableCell className="font-bold">
                        {sub.totalScore !== undefined && sub.totalScore !== null ? (
                          <span className="text-emerald-600 dark:text-emerald-400">{sub.totalScore.toFixed(1)} pts</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewPdfModal({
                            isOpen: true,
                            url: `/api/discursive/pdf-stream/${sub.id}/original`,
                            title: `Prova de ${sub.student.name} - ${sub.exam.title}`
                          })}
                          className="hover:bg-primary/10 hover:text-primary"
                        >
                          <Eye className="size-4 mr-1.5" />
                          <span>Ver Prova</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Visualização Rápida de PDF */}
      <Dialog open={!!viewPdfModal?.isOpen} onOpenChange={(open) => !open && setViewPdfModal(null)}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="text-xl">{viewPdfModal?.title}</DialogTitle>
            <DialogDescription>
              Visualização de PDF em tempo real, servido via proxy do Google Drive.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 w-full border rounded-xl overflow-hidden bg-muted/20 relative">
            {viewPdfModal && (
              <iframe
                src={viewPdfModal.url}
                className="w-full h-full border-0"
                title="PDF da Prova Discursiva"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
