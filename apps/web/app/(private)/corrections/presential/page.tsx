'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { UploadCloud, CheckCircle2, AlertCircle, FileText, Loader2, Cloud, RefreshCw, XCircle } from 'lucide-react';

interface ExamItem {
  id: string;
  title: string;
  date: string;
  totalQuestionsCount: number;
  totalSubmissionsCount: number;
}

interface UploadResultItem {
  filename: string;
  matricula: string;
  success: boolean;
  studentName?: string;
  submissionId?: string;
  error?: string;
}

export default function PresentialUploadPage() {
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<{
    message: string;
    totalProcessed: number;
    successCount: number;
    errorCount: number;
    results: UploadResultItem[];
  } | null>(null);

  const [loadingExams, setLoadingExams] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>('Geral');

  const currentExam = exams.find((e) => e.id === selectedExamId);
  const availableSubjects = currentExam?.subjects && currentExam.subjects.length > 0
    ? currentExam.subjects
    : ['Geral'];

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    if (availableSubjects.length > 0 && !availableSubjects.includes(selectedSubject)) {
      setSelectedSubject(availableSubjects[0]);
    }
  }, [selectedExamId, exams]);

  const fetchExams = async () => {
    setLoadingExams(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/discursive/exams', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setExams(data);
        if (data.length > 0 && !selectedExamId) {
          setSelectedExamId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar simulados:', err);
    } finally {
      setLoadingExams(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const arrayFiles = Array.from(e.target.files);
      setFiles(arrayFiles);
      setResults(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedExamId || files.length === 0) return;

    setUploading(true);
    setResults(null);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('examId', selectedExamId);
      formData.append('subjectName', selectedSubject);
      files.forEach((f) => {
        formData.append('files', f);
      });

      const res = await fetch('/api/discursive/presential-upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        setResults(data);
      } else {
        alert(data.error || 'Erro ao processar lote.');
      }
    } catch (err) {
      console.error('Erro no upload de lote:', err);
      alert('Erro de conexão ao enviar lote de discursivas.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Aviso Exclusivo Google Drive */}
      {/*<div className="flex items-center gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">
        <Cloud className="size-5 shrink-0" />
        <div className="text-sm">
          <span className="font-semibold">Armazenamento Exclusivo no Google Drive:</span> Todos os PDFs presenciais são processados, renomeados automaticamente pela Matrícula e enviados direto para a subpasta <strong>&quot;Simulados Discursivos&quot;</strong> na nuvem.
        </div>
      </div>*/}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel de Seleção e Upload */}
        <Card className="lg:col-span-1 border-border shadow-md">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <UploadCloud className="size-5 text-primary" />
              <span>Entrada Presencial</span>
            </CardTitle>
            <CardDescription>
              Selecione o simulado e adicione os PDFs digitalizados (nomeados pela Matrícula).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                Simulado Alvo
              </label>
              <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                <SelectTrigger className="w-full h-10 truncate">
                  <SelectValue placeholder="Selecione o Simulado...">
                    {exams.find((ex) => ex.id === selectedExamId)?.title || "Selecione o Simulado..."}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {exams.map((ex) => (
                    <SelectItem key={ex.id} value={ex.id}>
                      {ex.title} ({ex.totalQuestionsCount} questões)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                Disciplina / Matéria
              </label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="w-full h-10 truncate">
                  <SelectValue placeholder="Selecione a Disciplina..." />
                </SelectTrigger>
                <SelectContent>
                  {availableSubjects.map((subj) => (
                    <SelectItem key={subj} value={subj}>
                      {subj === 'Geral' ? 'Geral / Prova Completa' : subj}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-2 border-dashed border-primary/30 rounded-xl p-6 text-center hover:border-primary transition-colors bg-primary/5 cursor-pointer relative">
              <input
                type="file"
                multiple
                accept="application/pdf"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <FileText className="size-10 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">
                Clique ou arraste os arquivos .pdf
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Suporte para até 100 provas digitadas simultaneamente.
              </p>
              {files.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border">
                  <Badge variant="secondary" className="px-3 py-1 font-semibold text-primary bg-primary/10">
                    {files.length} arquivo(s) selecionado(s)
                  </Badge>
                </div>
              )}
            </div>

            <Button
              className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20"
              disabled={uploading || files.length === 0 || !selectedExamId}
              onClick={handleUpload}
            >
              {uploading ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  <span>Enviando para o Google Drive...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="size-4 mr-2" />
                  <span>Processar Lote de Provas</span>
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Auditoria do Lote Processado */}
        <Card className="lg:col-span-2 border-border shadow-md flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-xl">Auditoria de Ingestão de Provas</CardTitle>
              <CardDescription>
                Resumo por aluno com verificação de matrículas e duplicidades.
              </CardDescription>
            </div>
            {results && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setResults(null)}
                className="gap-1.5 text-xs"
              >
                <RefreshCw className="size-3.5" />
                <span>Limpar Resultado</span>
              </Button>
            )}
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            {!results ? (
              <div className="h-64 flex flex-col items-center justify-center text-center text-muted-foreground border border-dashed rounded-xl p-8">
                <FileText className="size-12 opacity-30 mb-2" />
                <p className="font-medium">Nenhum lote processado recentemente</p>
                <p className="text-xs max-w-sm mt-1">
                  Assim que os PDFs forem submetidos, exibiremos o relatório automático identificando os alunos por matrícula.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Indicadores de Sucesso */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-muted/60 border border-border">
                    <span className="text-xs text-muted-foreground font-medium block">Total Recebido</span>
                    <span className="text-2xl font-bold text-foreground">{results.totalProcessed}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium block">Processados</span>
                    <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{results.successCount}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                    <span className="text-xs text-rose-600 dark:text-rose-400 font-medium block">Erros / Duplicados</span>
                    <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">{results.errorCount}</span>
                  </div>
                </div>

                {/* Tabela de Resultados do Lote */}
                <div className="border rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Arquivo original</TableHead>
                        <TableHead>Matrícula</TableHead>
                        <TableHead>Aluno Identificado</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Observação / Erro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.results.map((item, idx) => (
                        <TableRow key={idx} className="hover:bg-muted/30">
                          <TableCell className="font-mono text-xs">{item.filename}</TableCell>
                          <TableCell className="font-semibold text-primary">{item.matricula}</TableCell>
                          <TableCell className="font-medium">
                            {item.studentName || '—'}
                          </TableCell>
                          <TableCell>
                            {item.success ? (
                              <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                                <CheckCircle2 className="size-3 mr-1" /> Sucesso
                              </Badge>
                            ) : (
                              <Badge className="bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30">
                                <XCircle className="size-3 mr-1" /> Falha
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {item.error ? (
                              <span className="text-rose-600 dark:text-rose-400 font-medium">{item.error}</span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400">Salvo no Google Drive & BD</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
