'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import {
  CheckSquare,
  Loader2,
  Save,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  FileText,
  ArrowLeft,
  ChevronRight,
  User,
  Calculator,
  RefreshCw,
  Download,
  ExternalLink
} from 'lucide-react';

interface QuestionItem {
  id: string;
  questionNumber: number;
  theme: string;
  maxScore?: number;
}

interface SubmissionItem {
  id: string;
  status: 'PENDING_CORRECTION' | 'UNDER_CORRECTION' | 'CORRECTED';
  originalPdfUrl: string;
  correctedPdfUrl?: string;
  totalScore?: number;
  student: {
    id: string;
    name: string;
    registrationNumber: string;
  };
  exam: {
    id: string;
    title: string;
    examQuestions: QuestionItem[];
  };
  grades: Array<{
    questionId: string;
    score: number;
  }>;
}

export default function CorrectorAreaPage() {
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeSubmission, setActiveSubmission] = useState<SubmissionItem | null>(null);

  // Split View Form State
  const [scores, setScores] = useState<Record<string, string>>({});
  const [correctedFile, setCorrectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [downloadingBatch, setDownloadingBatch] = useState(false);

  useEffect(() => {
    fetchMySubmissions();
  }, []);

  const fetchMySubmissions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/discursive/corrector/my-submissions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data);
      }
    } catch (e) {
      console.error('Erro ao buscar minhas submissões:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadMyBatch = async () => {
    if (submissions.length === 0) return;
    setDownloadingBatch(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/discursive/corrector/download-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ submissionIds: submissions.map(s => s.id) })
      });

      if (!res.ok) {
        alert('Erro ao gerar arquivo ZIP das suas provas.');
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const examTitle = submissions[0]?.exam?.title || 'Simulado';
      const cleanTitle = examTitle.trim().replace(/[^a-zA-Z0-9 -]/g, '');
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cleanTitle}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error('Erro ao baixar lote:', e);
      alert('Erro de conexão ao baixar provas em lote.');
    } finally {
      setDownloadingBatch(false);
    }
  };

  const handleSelectSubmission = (sub: SubmissionItem) => {
    setActiveSubmission(sub);
    setErrorMessage(null);
    setSuccessMessage(null);
    setCorrectedFile(null);

    // Preenche o map de scores com notas salvas
    const initialMap: Record<string, string> = {};
    sub.exam.examQuestions.forEach((q) => {
      const found = sub.grades?.find((g) => g.questionId === q.id);
      if (found && found.score !== undefined && found.score !== null) {
        initialMap[q.id] = String(found.score);
      } else {
        initialMap[q.id] = '';
      }
    });
    setScores(initialMap);
  };

  const handleScoreChange = (questionId: string, val: string) => {
    setScores(prev => ({
      ...prev,
      [questionId]: val
    }));
  };

  const calculateTotal = () => {
    let sum = 0;
    Object.values(scores).forEach((val) => {
      const num = parseFloat(val);
      if (!isNaN(num)) sum += num;
    });
    return sum;
  };

  const handleSubmitGrade = async (finalize: boolean) => {
    if (!activeSubmission) return;

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    // Converte scores para array JSON
    const gradesPayload = Object.entries(scores)
      .filter(([_, val]) => val.trim() !== '')
      .map(([questionId, val]) => ({
        questionId,
        score: parseFloat(val)
      }));

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('submissionId', activeSubmission.id);
      formData.append('finalize', String(finalize));
      formData.append('grades', JSON.stringify(gradesPayload));
      if (correctedFile) {
        formData.append('correctedPdf', correctedFile);
      }

      const res = await fetch('/api/discursive/corrector/submit-grade', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(data.message || 'Salvo com sucesso!');
        if (finalize) {
          setTimeout(() => {
            setActiveSubmission(null);
            fetchMySubmissions();
          }, 1500);
        } else {
          fetchMySubmissions();
        }
      } else {
        setErrorMessage(data.error || 'Erro ao salvar notas.');
      }
    } catch (err) {
      console.error('Erro ao submeter nota:', err);
      setErrorMessage('Erro de conexão ao salvar a correção.');
    } finally {
      setSaving(false);
    }
  };

  if (activeSubmission) {
    const totalScore = calculateTotal();
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
    const pdfUrl = `/api/discursive/pdf-stream/${activeSubmission.id}/original?token=${token}`;

    return (
      <div className="space-y-6">
        {/* Barra Superior da Split View */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border shadow-sm">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setActiveSubmission(null)} className="gap-2">
              <ArrowLeft className="size-4" />
              <span>Voltar</span>
            </Button>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <User className="size-4 text-primary" />
                <span>{activeSubmission.student.name}</span>
                <Badge variant="secondary" className="font-mono text-xs">
                  MAT {activeSubmission.student.registrationNumber}
                </Badge>
              </h2>
              <p className="text-xs text-muted-foreground">{activeSubmission.exam.title}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-right">
              <span className="text-xs text-muted-foreground font-medium block">Somatório Atual</span>
              <span className="text-xl font-black text-primary">{totalScore.toFixed(1)} pts</span>
            </div>
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => handleSubmitGrade(false)}
              className="gap-2 font-semibold"
            >
              <Save className="size-4" />
              <span>Salvar Rascunho</span>
            </Button>
            <Button
              className="gap-2 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
              disabled={saving}
              onClick={() => handleSubmitGrade(true)}
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              <span>Finalizar Correção</span>
            </Button>
          </div>
        </div>

        {/* Mensagens de Erro ou Sucesso */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 flex items-center gap-3">
            <AlertTriangle className="size-5 shrink-0" />
            <span className="text-sm font-semibold">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 flex items-center gap-3">
            <CheckCircle2 className="size-5 shrink-0" />
            <span className="text-sm font-semibold">{successMessage}</span>
          </div>
        )}

        {/* SPLIT VIEW (Visualizador PDF lado a lado com Lançamento de Notas) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[750px]">
          {/* Lado Esquerdo: Visualizador de PDF do Google Drive */}
          <Card className="lg:col-span-7 border-border shadow-md flex flex-col overflow-hidden">
            <CardHeader className="py-3 px-4 bg-muted/40 border-b flex flex-row items-center justify-between">
              <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                Prova Digitalizada (Google Drive)
              </span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-mono">PDF Viewer</Badge>
                <a
                  href={`${pdfUrl}&download=true`}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={`${activeSubmission.student.name} - ${activeSubmission.exam.title} (${activeSubmission.subject?.subjectName || 'Geral'}).pdf`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                  title="Baixar arquivo original PDF"
                >
                  <Download className="size-3.5" />
                  <span>Baixar Prova</span>
                </a>
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors shadow-sm"
                  title="Abrir em Nova Aba"
                >
                  <ExternalLink className="size-3.5" />
                  <span>Abrir</span>
                </a>
              </div>
            </CardHeader>
            <div className="flex-1 w-full bg-muted/20 relative min-h-[600px]">
              <iframe
                src={pdfUrl}
                className="absolute inset-0 w-full h-full border-0"
                title="Visualizador do Aluno"
              />
            </div>
          </Card>

          {/* Lado Direito: Grade de Questões Discursivas */}
          <Card className="lg:col-span-5 border-border shadow-md flex flex-col">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                <Calculator className="size-5 text-primary" />
                <span>Notas por Questão</span>
              </CardTitle>
              <CardDescription>
                Digite a nota de cada questão do simulado discursivo.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto space-y-4">
              {activeSubmission.exam.examQuestions.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground border border-dashed rounded-xl">
                  Nenhuma questão discursiva cadastrada neste simulado.
                </div>
              ) : (
                activeSubmission.exam.examQuestions.map((q) => (
                  <div key={q.id} className="p-4 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-sm">
                          Questão #{q.questionNumber}
                        </span>
                        {q.maxScore && (
                          <span className="text-xs text-muted-foreground">
                            (Máx: {q.maxScore} pts)
                          </span>
                        )}
                      </div>
                      {q.theme && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {q.theme}
                        </p>
                      )}
                    </div>

                    <div className="w-28 shrink-0">
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="Nota..."
                        value={scores[q.id] || ''}
                        onChange={(e) => handleScoreChange(q.id, e.target.value)}
                        className="text-right font-bold text-base h-10 border-primary/30 focus:border-primary"
                      />
                    </div>
                  </div>
                ))
              )}

              {/* Upload opcional de PDF Corrigido no Google Drive */}
              <div className="mt-6 pt-6 border-t border-border space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  Anexar PDF Corrigido / Rabiscado (Opcional - Drive)
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setCorrectedFile(e.target.files ? e.target.files[0] : null)}
                    className="text-xs"
                  />
                  {correctedFile && (
                    <Badge variant="secondary" className="shrink-0 bg-primary/10 text-primary">
                      1 arquivo
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t p-4 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Finalização restrita até todas as questões estarem preenchidas.
              </span>
              <div className="font-bold text-lg text-primary">
                Total: {totalScore.toFixed(1)} pts
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-xl">Área do Professor Corretor</CardTitle>
            <CardDescription>
              Abaixo estão as provas discursivas atribuídas a você para correção.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleDownloadMyBatch}
              disabled={loading || downloadingBatch || submissions.length === 0}
              className="gap-2 font-semibold shadow-sm"
              title="Baixar todas as suas provas para correção em arquivo ZIP"
            >
              {downloadingBatch ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              <span>Baixar Provas do Lote (.ZIP)</span>
            </Button>
            <Button variant="outline" size="sm" onClick={fetchMySubmissions} disabled={loading} className="gap-2">
              <RefreshCw className="size-4" />
              <span>Atualizar</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center text-center">
              <Loader2 className="size-8 animate-spin text-primary mb-2" />
              <span className="text-sm text-muted-foreground">Carregando suas submissões...</span>
            </div>
          ) : submissions.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-muted-foreground border border-dashed rounded-xl p-8">
              <CheckSquare className="size-12 opacity-30 mb-2" />
              <p className="font-medium">Você não possui provas em lote pendentes de correção</p>
              <p className="text-xs max-w-sm mt-1">
                Assim que a coordenação distribuir um lote de correção, as provas aparecerão aqui automaticamente.
              </p>
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60">
                    <TableHead>Aluno / Matrícula</TableHead>
                    <TableHead>Simulado</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Questões</TableHead>
                    <TableHead>Nota Total</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((sub) => {
                    const totalQ = sub.exam.examQuestions?.length || 0;
                    const gradedQ = sub.grades?.length || 0;
                    return (
                      <TableRow key={sub.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="font-semibold text-foreground">{sub.student.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">MAT: {sub.student.registrationNumber}</div>
                        </TableCell>
                        <TableCell className="font-medium text-sm">{sub.exam.title}</TableCell>
                        <TableCell>
                          {sub.status === 'CORRECTED' ? (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                              Corrigida
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30">
                              Em Andamento
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm font-semibold">
                          {gradedQ} / {totalQ}
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
                            size="sm"
                            onClick={() => handleSelectSubmission(sub)}
                            className="gap-1.5 font-semibold shadow-sm"
                          >
                            <span>Corrigir Prova</span>
                            <ChevronRight className="size-4" />
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
    </div>
  );
}
