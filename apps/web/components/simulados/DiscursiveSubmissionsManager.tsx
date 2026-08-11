'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Download,
  FileArchive,
  Plus,
  Loader2,
  FileText,
  Search,
  BookOpen,
  Trash2,
  CheckSquare,
  AlertCircle
} from 'lucide-react';

export type DiscursiveExamAdmin = {
  id: string;
  title: string;
  createdAt: string;
  subjects: { id: string; subjectName: string }[];
  _count?: { submissions: number };
};

export type SubmissionRow = {
  id: string;
  studentId: string;
  studentName: string;
  registrationNumber: string;
  subjectId: string;
  subjectName: string;
  status: string;
  submittedAt: string;
  studentPdfUrl: string;
  formattedFilename: string;
};

export function DiscursiveSubmissionsManager() {
  const [exams, setExams] = useState<DiscursiveExamAdmin[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<string[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [searchTerm, setSearchWith] = useState('');

  // Create Exam Dialog State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubjectsText, setNewSubjectsText] = useState('BIOLOGIA, QUIMICA, REDACAO');
  const [creatingExam, setCreatingExam] = useState(false);

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    if (selectedExamId) {
      fetchSubmissions(selectedExamId);

      // Revalida em segundo plano sem piscar a tela para atualizar novos arquivos enviados pelos alunos
      const interval = setInterval(() => {
        fetchSubmissions(selectedExamId, true);
        fetchExams(true);
      }, 8000);

      const handleFocus = () => {
        fetchSubmissions(selectedExamId, true);
        fetchExams(true);
      };

      window.addEventListener('focus', handleFocus);

      return () => {
        clearInterval(interval);
        window.removeEventListener('focus', handleFocus);
      };
    } else {
      setSubmissions([]);
      setSelectedSubmissionIds([]);
    }
  }, [selectedExamId]);

  const fetchExams = async (silent = false) => {
    if (!silent) setLoadingExams(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/discursive/admin/exams', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setExams(data);
        if (data.length > 0 && !selectedExamId) {
          setSelectedExamId(data[0].id);
        }
      }
    } catch (e) {
      console.error('Erro ao carregar simulados discursivos:', e);
    } finally {
      if (!silent) setLoadingExams(false);
    }
  };

  const fetchSubmissions = async (examId: string, silent = false) => {
    if (!silent) {
      setLoadingSubmissions(true);
      setSelectedSubmissionIds([]);
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/discursive/admin/${examId}/submissions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const newSubmissions: SubmissionRow[] = data.submissions || [];
        setSubmissions(newSubmissions);

        if (silent) {
          setSelectedSubmissionIds(prev => prev.filter(id => newSubmissions.some(s => s.id === id)));
        }
      }
    } catch (e) {
      console.error('Erro ao carregar submissões:', e);
    } finally {
      if (!silent) setLoadingSubmissions(false);
    }
  };

  const handleCreateExam = async () => {
    if (!newTitle.trim() || !newSubjectsText.trim()) return;

    const subjectsArray = newSubjectsText
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (subjectsArray.length === 0) return;

    setCreatingExam(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/discursive/admin/exams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newTitle.trim(),
          subjects: subjectsArray
        })
      });

      if (res.ok) {
        const created = await res.json();
        setIsCreateOpen(false);
        setNewTitle('');
        await fetchExams();
        setSelectedExamId(created.id);
      }
    } catch (e) {
      console.error('Erro ao criar simulado:', e);
    } finally {
      setCreatingExam(false);
    }
  };

  const { showAlert, showConfirm, ConfirmModal } = useConfirmModal();

  const handleDeleteExam = (examId: string) => {
    showConfirm(
      'Excluir Simulado Discursivo',
      'Tem certeza que deseja excluir este simulado discursivo e todas as suas submissões?',
      async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`/api/discursive/admin/exams/${examId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            fetchExams();
          }
        } catch (e) {
          console.error('Erro ao excluir simulado:', e);
        }
      },
      'danger'
    );
  };

  const filteredSubmissions = submissions.filter(sub => {
    const term = searchTerm.toLowerCase();
    return (
      sub.studentName.toLowerCase().includes(term) ||
      sub.registrationNumber.toLowerCase().includes(term) ||
      sub.subjectName.toLowerCase().includes(term)
    );
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSubmissionIds(filteredSubmissions.map(s => s.id));
    } else {
      setSelectedSubmissionIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedSubmissionIds(prev => [...prev, id]);
    } else {
      setSelectedSubmissionIds(prev => prev.filter(item => item !== id));
    }
  };

  const handleDownloadSingle = async (submissionId: string, filename: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/discursive/admin/download-single/${submissionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        showAlert('Erro no Download', 'Erro ao realizar o download do PDF.', 'danger');
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error('Erro no download unitário:', e);
    }
  };

  const handleDownloadBatch = async () => {
    if (selectedSubmissionIds.length === 0) return;

    setDownloadingZip(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/discursive/admin/download-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ submissionIds: selectedSubmissionIds })
      });

      if (!res.ok) {
        showAlert('Erro no Download', 'Erro ao gerar arquivo ZIP das submissões.', 'danger');
        return;
      }

      const currentExam = exams.find(e => e.id === selectedExamId);
      const examTitleName = currentExam ? currentExam.title.trim().replace(/[^a-zA-Z0-9 -]/g, '') : 'Simulado';
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${examTitleName}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error('Erro no download em lote:', e);
    } finally {
      setDownloadingZip(false);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const isAllSelected =
    filteredSubmissions.length > 0 &&
    filteredSubmissions.every(sub => selectedSubmissionIds.includes(sub.id));

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="border-b border-slate-100 pb-6">
          <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Central de Downloads - Simulados Discursivos
          </CardTitle>
          <CardDescription className="text-slate-500 mt-1">
            Selecione um simulado discursivo para gerenciar as submissões enviadas pelos alunos e efetuar download unitário ou em lote (.ZIP).
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-2xl">
              <div className="w-full sm:w-72">
                <Select
                  value={selectedExamId}
                  onValueChange={(val) => { if (val) setSelectedExamId(val); }}
                  disabled={loadingExams || exams.length === 0}
                >
                  <SelectTrigger className="bg-white border-slate-300 h-10">
                    <SelectValue placeholder={loadingExams ? 'Carregando simulados...' : 'Selecione um simulado...'}>
                      {selectedExamId ? (exams.find(e => e.id === selectedExamId)?.title || 'Carregando...') : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {exams.map(exam => (
                      <SelectItem key={exam.id} value={exam.id}>
                        {exam.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedExamId && (
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <Input
                    placeholder="Buscar aluno, matrícula ou matéria..."
                    value={searchTerm}
                    onChange={(e) => setSearchWith(e.target.value)}
                    className="pl-9 bg-white border-slate-300 h-10"
                  />
                </div>
              )}
            </div>

            {/* Batch Action Bar */}
            <div className="flex items-center gap-3">
              {selectedExamId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteExam(selectedExamId)}
                  className="text-rose-600 border-rose-200 hover:bg-rose-50 h-10"
                  title="Excluir Simulado"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Excluir Simulado
                </Button>
              )}

              <Button
                disabled={selectedSubmissionIds.length === 0 || downloadingZip}
                onClick={handleDownloadBatch}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-10 px-4 shadow-sm"
              >
                {downloadingZip ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando .ZIP...
                  </>
                ) : (
                  <>
                    <FileArchive className="w-4 h-4 mr-2" />
                    Baixar Selecionados (.ZIP)
                    {selectedSubmissionIds.length > 0 && (
                      <Badge variant="secondary" className="ml-2 bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20 font-bold px-2 py-0.5 text-xs">
                        {selectedSubmissionIds.length}
                      </Badge>
                    )}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Submissions Table */}
          {loadingSubmissions ? (
            <div className="py-16 text-center text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
              <p>Carregando submissões dos alunos...</p>
            </div>
          ) : !selectedExamId ? (
            <div className="py-16 text-center text-slate-400 border border-dashed rounded-lg bg-slate-50/50">
              <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="font-medium">Nenhum simulado discursivo selecionado.</p>
              <p className="text-xs text-slate-500 mt-1">Crie ou selecione um simulado no menu acima para visualizar as resoluções.</p>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="py-16 text-center text-slate-500 border border-dashed rounded-lg bg-slate-50/50">
              <FileText className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">Nenhuma submissão encontrada</p>
              <p className="text-xs text-slate-500 mt-1">Os envios dos alunos para este simulado aparecerão nesta tabela.</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-12 text-center">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="font-bold text-slate-800">Aluno</TableHead>
                    <TableHead className="font-bold text-slate-800">Matrícula</TableHead>
                    <TableHead className="font-bold text-slate-800">Matéria da Prova</TableHead>
                    <TableHead className="font-bold text-slate-800">Data de Envio</TableHead>
                    <TableHead className="font-bold text-slate-800">Status</TableHead>
                    <TableHead className="text-right font-bold text-slate-800">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions.map((row) => {
                    const isSelected = selectedSubmissionIds.includes(row.id);
                    return (
                      <TableRow key={row.id} className={isSelected ? 'bg-primary/5' : 'hover:bg-slate-50/70'}>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectOne(row.id, checked)}
                          />
                        </TableCell>
                        <TableCell className="font-semibold text-slate-900">
                          {row.studentName}
                        </TableCell>
                        <TableCell className="text-slate-600 font-mono text-xs">
                          {row.registrationNumber}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-slate-100 text-slate-800 border-slate-200 font-semibold">
                            {row.subjectName}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-600 text-xs">
                          {formatDate(row.submittedAt)}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-primary/20 font-medium">
                            Enviado
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadSingle(row.id, row.formattedFilename)}
                            className="border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 gap-1.5 font-medium text-xs h-8"
                          >
                            <Download className="w-3.5 h-3.5 text-primary" />
                            Baixar PDF
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <ConfirmModal />
    </div>
  );
}
