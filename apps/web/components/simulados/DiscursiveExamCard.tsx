'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileUp, CheckCircle2, Clock, FileText, Loader2, AlertCircle } from 'lucide-react';

export type DiscursiveSubject = {
  id: string;
  subjectName: string;
  submission: {
    id: string;
    status: string;
    studentPdfUrl: string;
    submittedAt: string;
  } | null;
};

export type DiscursiveExam = {
  id: string;
  title: string;
  createdAt: string;
  windowStart?: string | null;
  windowEnd?: string | null;
  subjects: DiscursiveSubject[];
};

interface DiscursiveExamCardProps {
  exam: DiscursiveExam;
  onSubmissionSuccess?: () => void;
}

export function DiscursiveExamCard({ exam, onSubmissionSuccess }: DiscursiveExamCardProps) {
  const [selectedFiles, setSelectedFiles] = useState<{ [subjectId: string]: File | null }>({});
  const [uploadingSubjectId, setUploadingSubjectId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ subjectId: string; type: 'success' | 'error'; message: string } | null>(null);
  const [viewingSubmissionId, setViewingSubmissionId] = useState<string | null>(null);

  const now = new Date();
  const wStart = exam.windowStart ? new Date(exam.windowStart) : null;
  const wEnd = exam.windowEnd ? new Date(exam.windowEnd) : null;

  const isStarted = !wStart || wStart <= now;
  const isExpired = wEnd ? wEnd < now : false;
  const isCardActive = isStarted && !isExpired;

  const handleFileChange = (subjectId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setFeedback({
          subjectId,
          type: 'error',
          message: 'Por favor, selecione um arquivo no formato PDF.'
        });
        return;
      }
      setSelectedFiles(prev => ({ ...prev, [subjectId]: file }));
      setFeedback(null);
    }
  };

  const handleUpload = async (subjectId: string) => {
    const file = selectedFiles[subjectId];
    if (!file) return;

    setUploadingSubjectId(subjectId);
    setFeedback(null);

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('essayExamId', exam.id);
      formData.append('essayExamSubjectId', subjectId);
      formData.append('file', file);

      const res = await fetch('/api/discursive/submit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao enviar a resolução.');
      }

      setFeedback({
        subjectId,
        type: 'success',
        message: 'Resolução enviada com sucesso!'
      });

      // Reset file selection
      setSelectedFiles(prev => ({ ...prev, [subjectId]: null }));

      if (onSubmissionSuccess) {
        onSubmissionSuccess();
      }
    } catch (err: any) {
      setFeedback({
        subjectId,
        type: 'error',
        message: err.message || 'Falha no envio do PDF.'
      });
    } finally {
      setUploadingSubjectId(null);
    }
  };

  const handleViewPdf = async (submissionId: string) => {
    try {
      setViewingSubmissionId(submissionId);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/discursive/student/download-single/${submissionId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        alert('Erro ao carregar o PDF enviado.');
        return;
      }

      const blob = await res.blob();
      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(pdfBlob);

      let filename = `resolucao_${submissionId}.pdf`;
      const disposition = res.headers.get('content-disposition') || res.headers.get('Content-Disposition');
      if (disposition) {
        const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
        if (match && match[1]) {
          filename = decodeURIComponent(match[1]);
        }
      }

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('Erro ao visualizar PDF:', error);
      alert('Erro ao carregar o PDF enviado.');
    } finally {
      setViewingSubmissionId(null);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const dayStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return `Enviado em ${dayStr} às ${timeStr}`;
    } catch {
      return 'Enviado';
    }
  };

  return (
    <Card className="border-slate-200 shadow-sm hover:shadow-md transition-all bg-white relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-full h-1 ${isExpired ? 'bg-destructive' : isCardActive ? 'bg-primary' : 'bg-slate-300'}`} />
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-2">
          <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-primary/20 text-[11px] font-semibold tracking-wide uppercase rounded-full">
            Simulado Discursivo (UERJ/Específicas)
          </Badge>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            {exam.windowEnd && (
              <Badge variant="outline" className={`text-xs font-medium ${isExpired ? 'bg-rose-50 text-rose-700 border-rose-200 rounded-full' : 'bg-primary/10 text-primary border-primary/20 rounded-full'}`}>
                <Clock className="w-3.5 h-3.5 mr-1" />
                Prazo: {new Date(exam.windowEnd).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </Badge>
            )}
            <span className="flex items-center">
              <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
              {new Date(exam.createdAt).toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>
        <CardTitle className="text-xl font-bold text-slate-900 mt-2">
          {exam.title}
        </CardTitle>
        <CardDescription className="text-slate-500 text-sm">
          Anexe a folha de resolução em PDF individualmente para cada matéria abaixo.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
          {exam.subjects.map((subject) => {
            const submission = subject.submission;
            const selectedFile = selectedFiles[subject.id];
            const isUploading = uploadingSubjectId === subject.id;
            const itemFeedback = feedback?.subjectId === subject.id ? feedback : null;

            return (
              <div key={subject.id} className="p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-base">
                      {subject.subjectName}
                    </span>
                    {submission ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 gap-1 text-xs font-medium rounded">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                          {formatDate(submission.submittedAt)}
                        </Badge>
                        <button
                          type="button"
                          onClick={() => handleViewPdf(submission.id)}
                          disabled={viewingSubmissionId === submission.id}
                          className="inline-flex items-center text-xs text-primary hover:text-primary/90 hover:underline font-semibold bg-primary/10 px-2 py-1 rounded border border-primary/20 cursor-pointer disabled:opacity-50"
                        >
                          {viewingSubmissionId === submission.id ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Carregando...
                            </>
                          ) : (
                            <>
                              <FileText className="w-3 h-3 mr-1" />
                              Ver PDF Enviado
                            </>
                          )}
                        </button>
                      </div>
                    ) : isExpired ? (
                      <Badge variant="destructive" className="bg-rose-50 text-rose-700 border-rose-200 text-xs font-medium rounded">
                        Prazo Encerrado
                      </Badge>
                    ) : !isStarted ? (
                      <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-xs font-medium rounded">
                        Aguardando Prazo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs font-medium rounded">
                        Pendente de Envio
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Upload box */}
                {!submission ? (
                  isExpired ? (
                    <div className="flex items-center justify-between p-3 bg-rose-50/70 border border-rose-200 rounded-md text-rose-700 text-xs font-medium">
                      <span className="flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                        O prazo para envio da resolução deste simulado foi encerrado.
                      </span>
                      <Badge variant="destructive" className="text-[11px] bg-rose-600 text-white font-semibold rounded">
                        Não Realizado
                      </Badge>
                    </div>
                  ) : !isStarted ? (
                    <div className="flex items-center justify-between p-3 bg-slate-100 border border-slate-200 rounded-md text-slate-600 text-xs font-medium">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        Aguardando início do prazo para envio da resolução.
                      </span>
                      <Badge variant="outline" className="text-[11px]">Em Breve</Badge>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <label className="flex-1 cursor-pointer">
                          <div className="border border-dashed border-slate-300 rounded-md p-2.5 bg-white hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-xs text-slate-600">
                            <FileUp className="w-4 h-4 text-primary flex-shrink-0" />
                            <span className="truncate">
                              {selectedFile ? selectedFile.name : 'Selecionar arquivo PDF da matéria...'}
                            </span>
                          </div>
                          <input
                            type="file"
                            accept="application/pdf"
                            className="hidden"
                            onChange={(e) => handleFileChange(subject.id, e)}
                          />
                        </label>

                        <Button
                          size="sm"
                          disabled={!selectedFile || isUploading}
                          onClick={() => handleUpload(subject.id)}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[130px] font-semibold shadow-sm"
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Enviando...
                            </>
                          ) : (
                            <>
                              <FileText className="w-4 h-4 mr-1.5" />
                              Enviar PDF
                            </>
                          )}
                        </Button>
                      </div>

                      {itemFeedback && (
                        <div className={`text-xs p-2 rounded-md flex items-center gap-1.5 ${itemFeedback.type === 'success'
                          ? 'bg-primary/15 text-primary'
                          : 'bg-rose-100/70 text-rose-800'
                          }`}>
                          {itemFeedback.type === 'success' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          )}
                          <span>{itemFeedback.message}</span>
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  <div className="text-xs text-slate-600 bg-primary/10 border border-primary/20 rounded-md p-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>Resolução enviada para correção. O reenvio está desativado para preservar o arquivo de prova.</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
