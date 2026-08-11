'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { BarChart2, Loader2, Eye, RefreshCw, Download, Trophy, FileText, CheckCircle2 } from 'lucide-react';

interface ExamItem {
  id: string;
  title: string;
}

interface QuestionGrade {
  id: string;
  questionId: string;
  score: number;
  question: {
    id: string;
    questionNumber: number;
    theme?: string;
  };
}

interface ResultItem {
  id: string;
  type: string;
  status: string;
  totalScore?: number;
  submittedAt: string;
  correctedAt?: string;
  originalPdfUrl: string;
  correctedPdfUrl?: string;
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
  grades: QuestionGrade[];
}

export default function ResultsAndBulletinPage() {
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [filterExamId, setFilterExamId] = useState('all');
  const [filterStatus, setFilterStatus] = useState('CORRECTED');

  const [viewPdfModal, setViewPdfModal] = useState<{
    isOpen: boolean;
    url: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    fetchExams();
    fetchResults();
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

  const fetchResults = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filterExamId && filterExamId !== 'all') params.append('examId', filterExamId);
      if (filterStatus && filterStatus !== 'all') params.append('status', filterStatus);

      const res = await fetch(`/api/discursive/results?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch (e) {
      console.error('Erro ao buscar boletim e resultados:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (results.length === 0) return;

    const headers = ['Matricula', 'Aluno', 'Email', 'Simulado', 'Status', 'Nota Total', 'Data Correcao'];
    const rows = results.map(r => [
      r.student.registrationNumber,
      `"${r.student.name}"`,
      r.student.email,
      `"${r.exam.title}"`,
      r.status,
      r.totalScore !== undefined && r.totalScore !== null ? r.totalScore.toString() : '0',
      r.correctedAt ? new Date(r.correctedAt).toLocaleDateString('pt-BR') : ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `boletim_discursivo_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-md">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Trophy className="size-5 text-amber-500" />
              <span>Resultados Consolidados & Boletim Discursivo</span>
            </CardTitle>
            <CardDescription>
              Visualize o desempenho final dos alunos, pontuação por questão e exporte para o boletim geral.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={results.length === 0}
              className="gap-2 rounded-xl"
            >
              <Download className="size-4" />
              <span>Exportar CSV</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchResults}
              disabled={loading}
              className="gap-2 rounded-xl"
            >
              <RefreshCw className="size-4" />
              <span>Atualizar</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Filtros de Resultado */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-muted/40 border border-border">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Simulado
              </label>
              <Select value={filterExamId} onValueChange={(val) => val && setFilterExamId(val)}>
                <SelectTrigger className="w-full h-10 truncate rounded-xl">
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
                Status na Planilha
              </label>
              <Select value={filterStatus} onValueChange={(val) => val && setFilterStatus(val)}>
                <SelectTrigger className="w-full h-10 truncate rounded-xl">
                  <SelectValue placeholder="Status...">
                    {filterStatus === "CORRECTED"
                      ? "Apenas Corrigidos (Boletim Final)"
                      : "Todas as Submissões"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CORRECTED">Apenas Corrigidos (Boletim Final)</SelectItem>
                  <SelectItem value="all">Todas as Submissões</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={fetchResults} className="w-full h-10 font-semibold shadow-sm rounded-xl">
                <span>Filtrar Resultados</span>
              </Button>
            </div>
          </div>

          {/* Tabela de Boletim e Pontuações por Questão */}
          <div className="border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead>Classificação / Aluno</TableHead>
                  <TableHead>Simulado</TableHead>
                  <TableHead>Notas por Questão</TableHead>
                  <TableHead>Nota Total</TableHead>
                  <TableHead>Data Correção</TableHead>
                  <TableHead className="text-right">Provas PDF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <Loader2 className="size-6 animate-spin mx-auto text-primary" />
                      <span className="text-sm text-muted-foreground mt-2 block">Calculando notas do boletim...</span>
                    </TableCell>
                  </TableRow>
                ) : results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      Nenhum resultado finalizado foi encontrado para os filtros selecionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  results.map((item, idx) => (
                    <TableRow key={item.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                            {idx + 1}º
                          </span>
                          <div>
                            <div className="font-semibold text-foreground">{item.student.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">MAT: {item.student.registrationNumber}</div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="font-medium text-sm">
                        {item.exam.title}
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {item.grades && item.grades.length > 0 ? (
                            item.grades.map((g) => (
                              <Badge key={g.id} variant="secondary" className="text-xs font-mono px-2 py-0.5 bg-muted">
                                Q{g.question.questionNumber}: <strong className="ml-1 text-primary">{g.score}</strong>
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Sem questões avulsas</span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-black text-base border border-emerald-500/20">
                          <span>{item.totalScore !== undefined && item.totalScore !== null ? item.totalScore.toFixed(1) : '0.0'}</span>
                          <span className="text-xs font-normal">pts</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {item.correctedAt ? new Date(item.correctedAt).toLocaleDateString('pt-BR') : '—'}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
                              setViewPdfModal({
                                isOpen: true,
                                url: `/api/discursive/pdf-stream/${item.id}/original?token=${token}`,
                                title: `Prova Original - ${item.student.name}`
                              });
                            }}
                            className="text-xs h-8 rounded-lg"
                          >
                            <Eye className="size-3.5 mr-1" />
                            <span>Original</span>
                          </Button>

                          {item.correctedPdfUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
                                setViewPdfModal({
                                  isOpen: true,
                                  url: `/api/discursive/pdf-stream/${item.id}/corrected?token=${token}`,
                                  title: `Prova Corrigida - ${item.student.name}`
                                });
                              }}
                              className="text-xs h-8 rounded-lg border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                            >
                              <CheckCircle2 className="size-3.5 mr-1" />
                              <span>Corrigida</span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de PDF */}
      <Dialog open={!!viewPdfModal?.isOpen} onOpenChange={(open) => !open && setViewPdfModal(null)}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="text-xl">{viewPdfModal?.title}</DialogTitle>
            <DialogDescription>
              Visualizador seguro diretamente da nuvem Google Drive.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 w-full border rounded-xl overflow-hidden bg-muted/20 relative">
            {viewPdfModal && (
              <iframe
                src={viewPdfModal.url}
                className="w-full h-full border-0"
                title="PDF Visualizador"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
