'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  FileText,
  Loader2,
  Eye,
  Filter,
  RefreshCw,
  CheckCircle2,
  Clock,
  PlayCircle,
  RotateCcw,
  Edit3,
  UploadCloud,
  FileCheck,
  AlertCircle
} from 'lucide-react';

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
  subjectName?: string;
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

  // Modal de Visualização de PDF (Requisito 3)
  const [viewPdfModal, setViewPdfModal] = useState<{
    isOpen: boolean;
    submissionId: string;
    studentName: string;
    examTitle: string;
    hasCorrected: boolean;
    viewType: 'corrected' | 'original';
  } | null>(null);

  // Modal de Edição & Substituição por Admin (Requisito 2)
  const [adminEditModal, setAdminEditModal] = useState<{
    isOpen: boolean;
    submission: SubmissionItem | null;
  }>({ isOpen: false, submission: null });

  const [adminNewScore, setAdminNewScore] = useState<string>('');
  const [adminReplacementFile, setAdminReplacementFile] = useState<File | null>(null);
  const [adminSaving, setAdminSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const userRole = typeof window !== 'undefined' ? localStorage.getItem('user_role') || '' : '';
  const isAdmin = ['admin', 'super_admin'].includes(userRole);

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

  // Requisito 2: Admin devolve correção ao corretor
  const handleReopenSubmission = async (submissionId: string) => {
    if (!confirm('Deseja devolver esta correção ao corretor para reavaliação?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/discursive/admin/reopen-submission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ submissionId })
      });

      const data = await res.json();
      if (res.ok) {
        setActionMessage({ type: 'success', text: 'Correção devolvida ao corretor com sucesso!' });
        fetchSubmissions();
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Erro ao devolver correção.' });
      }
    } catch (e) {
      console.error('Erro ao devolver correção:', e);
      setActionMessage({ type: 'error', text: 'Erro de conexão ao devolver correção.' });
    }
  };

  // Requisito 2: Admin salva alteração de nota e/ou substituição do arquivo no Drive
  const handleAdminSaveEdit = async () => {
    if (!adminEditModal.submission) return;
    setAdminSaving(true);
    setActionMessage(null);

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('submissionId', adminEditModal.submission.id);
      formData.append('finalize', 'true');

      if (adminReplacementFile) {
        formData.append('correctedPdf', adminReplacementFile);
      }

      const res = await fetch('/api/discursive/corrector/submit-grade', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        setActionMessage({ type: 'success', text: 'Alterações e substituição salvas com sucesso!' });
        setAdminEditModal({ isOpen: false, submission: null });
        fetchSubmissions();
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Erro ao salvar alterações.' });
      }
    } catch (e) {
      console.error('Erro no salvamento do admin:', e);
      setActionMessage({ type: 'error', text: 'Erro de conexão ao salvar.' });
    } finally {
      setAdminSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_CORRECTION':
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-medium rounded">
            <Clock className="size-3 mr-1" /> Aguardando Lote
          </Badge>
        );
      case 'UNDER_CORRECTION':
        return (
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 font-medium rounded">
            <PlayCircle className="size-3 mr-1" /> Em Correção
          </Badge>
        );
      case 'CORRECTED':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-medium rounded">
            <CheckCircle2 className="size-3 mr-1" /> Corrigida
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Alertas globais de ação */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            {actionMessage.type === 'success' ? <CheckCircle2 className="size-5 shrink-0" /> : <AlertCircle className="size-5 shrink-0" />}
            <span>{actionMessage.text}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setActionMessage(null)}>
            Fechar
          </Button>
        </div>
      )}

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
                    {filterExamId === 'all'
                      ? 'Todos os Simulados'
                      : exams.find((ex) => ex.id === filterExamId)?.title || 'Todos os Simulados'}
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
                    {filterStatus === 'all'
                      ? 'Todos os Status'
                      : filterStatus === 'PENDING_CORRECTION'
                        ? 'Aguardando Lote'
                        : filterStatus === 'UNDER_CORRECTION'
                          ? 'Em Correção'
                          : 'Corrigida'}
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
                    {filterType === 'all'
                      ? 'Presencial & Online'
                      : filterType === 'PRESENTIAL'
                        ? 'Presencial'
                        : 'Online'}
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
                  <TableHead className="text-right w-[320px]">Ações</TableHead>
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
                  submissions.map((sub) => {
                    const hasCorrected = Boolean(sub.correctedPdfUrl);
                    return (
                      <TableRow key={sub.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="font-semibold text-foreground">{sub.student.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">MAT: {sub.student.registrationNumber}</div>
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          <div>{sub.exam.title}</div>
                          {sub.subjectName && sub.subjectName !== 'Geral' && (
                            <Badge variant="secondary" className="mt-1 text-xs font-semibold bg-primary/15 text-primary rounded">
                              {sub.subjectName}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {sub.type === 'PRESENTIAL' ? (
                            <Badge variant="outline" className="border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/10 rounded">
                              Presencial
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-teal-500/30 text-teal-600 dark:text-teal-400 bg-teal-500/10 rounded">
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
                          <div className="flex items-center justify-end gap-2">
                            {/* 1. Devolver (se for admin e se a submissão estiver corrigida) */}
                            {isAdmin && sub.status === 'CORRECTED' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReopenSubmission(sub.id)}
                                className="h-8 rounded-md border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-semibold gap-1.5 shadow-2xs"
                                title="Devolver correção ao corretor para reavaliação"
                              >
                                <RotateCcw className="size-3.5" />
                                <span>Devolver</span>
                              </Button>
                            )}

                            {/* 2. Ver Prova (posição fixa) */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setViewPdfModal({
                                  isOpen: true,
                                  submissionId: sub.id,
                                  studentName: sub.student.name,
                                  examTitle: sub.exam.title,
                                  hasCorrected,
                                  viewType: hasCorrected ? 'corrected' : 'original'
                                });
                              }}
                              className="h-8 rounded-md border-border bg-card hover:bg-muted text-xs font-semibold gap-1.5 shadow-2xs"
                              title={hasCorrected ? 'Visualizar Prova Corrigida' : 'Visualizar Prova Original'}
                            >
                              <Eye className="size-3.5 text-primary" />
                              <span>Ver Prova</span>
                            </Button>

                            {/* 3. Trocar Arquivo (se for admin) */}
                            {isAdmin && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setAdminEditModal({ isOpen: true, submission: sub });
                                  setAdminNewScore(sub.totalScore !== undefined ? String(sub.totalScore) : '');
                                  setAdminReplacementFile(null);
                                }}
                                className="h-8 rounded-md border-border bg-card hover:bg-muted text-xs font-semibold gap-1.5 shadow-2xs"
                                title="Substituir arquivo corrigido no Drive ou editar notas"
                              >
                                <Edit3 className="size-3.5 text-muted-foreground" />
                                <span>Trocar Arquivo</span>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Visualização de PDF (Requisito 3 - Exibe corrigida se enviada ou original se pendente, com botões para alternar) */}
      <Dialog open={!!viewPdfModal?.isOpen} onOpenChange={(open) => !open && setViewPdfModal(null)}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-6">
          {viewPdfModal && (
            <>
              <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
                <div>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    <span>Prova de {viewPdfModal.studentName}</span>
                    <Badge variant={viewPdfModal.viewType === 'corrected' ? 'default' : 'secondary'} className="rounded px-2 py-0.5 text-xs">
                      {viewPdfModal.viewType === 'corrected' ? 'Prova Corrigida' : 'Prova Original'}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    {viewPdfModal.examTitle}
                  </DialogDescription>
                </div>

                {/* Alternador de versão do PDF (se existir corrigida) */}
                {viewPdfModal.hasCorrected && (
                  <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
                    <Button
                      size="sm"
                      variant={viewPdfModal.viewType === 'corrected' ? 'default' : 'ghost'}
                      onClick={() => setViewPdfModal((prev) => prev ? { ...prev, viewType: 'corrected' } : null)}
                      className="text-xs h-7 px-3 gap-1.5"
                    >
                      <FileCheck className="size-3.5" />
                      <span>Corrigida</span>
                    </Button>
                    <Button
                      size="sm"
                      variant={viewPdfModal.viewType === 'original' ? 'default' : 'ghost'}
                      onClick={() => setViewPdfModal((prev) => prev ? { ...prev, viewType: 'original' } : null)}
                      className="text-xs h-7 px-3 gap-1.5"
                    >
                      <FileText className="size-3.5" />
                      <span>Original</span>
                    </Button>
                  </div>
                )}
              </DialogHeader>

              <div className="flex-1 w-full border rounded-xl overflow-hidden bg-muted/20 relative mt-4">
                {(() => {
                  const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
                  const streamUrl = `/api/discursive/pdf-stream/${viewPdfModal.submissionId}/${viewPdfModal.viewType}?token=${token}`;
                  return (
                    <iframe
                      src={streamUrl}
                      className="w-full h-full border-0"
                      title="PDF da Prova Discursiva"
                    />
                  );
                })()}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Substituição de Arquivo & Correção pelo Administrador (Requisito 2) */}
      <Dialog open={adminEditModal.isOpen} onOpenChange={(open) => !open && setAdminEditModal({ isOpen: false, submission: null })}>
        <DialogContent className="max-w-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <UploadCloud className="size-5 text-primary" />
              <span>Gerenciar & Substituir Correção</span>
            </DialogTitle>
            <DialogDescription>
              Substitua o arquivo PDF no Google Drive (sobrescreve o existente em tempo real) ou devolva ao corretor.
            </DialogDescription>
          </DialogHeader>

          {adminEditModal.submission && (
            <div className="space-y-4 py-3">
              <div className="p-3.5 rounded-xl bg-muted/50 border border-border text-sm space-y-1">
                <div><strong>Aluno:</strong> {adminEditModal.submission.student.name}</div>
                <div><strong>Simulado:</strong> {adminEditModal.submission.exam.title}</div>
                <div><strong>Status Atual:</strong> {adminEditModal.submission.status}</div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  Substituir PDF Corrigido no Google Drive
                </Label>
                <Input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setAdminReplacementFile(e.target.files ? e.target.files[0] : null)}
                  className="text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Ao selecionar um novo PDF, o sistema atualizará o arquivo diretamente no Google Drive sem criar cópias duplicadas.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAdminEditModal({ isOpen: false, submission: null })}>
              Cancelar
            </Button>
            <Button onClick={handleAdminSaveEdit} disabled={adminSaving} className="gap-2 font-semibold">
              {adminSaving ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
              <span>Salvar & Substituir no Drive</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
