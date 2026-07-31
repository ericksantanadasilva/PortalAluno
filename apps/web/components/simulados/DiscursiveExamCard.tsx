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
    <Card className="border-slate-200 shadow-sm hover:shadow-md transition-all bg-white overflow-hidden">
      <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 to-teal-600" />
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-2">
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 text-[11px] font-semibold tracking-wide uppercase">
            Simulado Discursivo (UERJ/Específicas)
          </Badge>
          <div className="flex items-center text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
            {new Date(exam.createdAt).toLocaleDateString('pt-BR')}
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
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 text-xs font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          {formatDate(submission.submittedAt)}
                        </Badge>
                        <button
                          type="button"
                          onClick={() => handleViewPdf(submission.id)}
                          disabled={viewingSubmissionId === submission.id}
                          className="inline-flex items-center text-xs text-emerald-700 hover:text-emerald-800 hover:underline font-semibold bg-emerald-50 px-2 py-1 rounded border border-emerald-200 cursor-pointer disabled:opacity-50"
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
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs font-medium">
                        Pendente de Envio
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Upload box */}
                {!submission ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <label className="flex-1 cursor-pointer">
                        <div className="border border-dashed border-slate-300 rounded-md p-2.5 bg-white hover:border-emerald-500 hover:bg-emerald-50/30 transition-all flex items-center justify-center gap-2 text-xs text-slate-600">
                          <FileUp className="w-4 h-4 text-emerald-600 flex-shrink-0" />
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
                        className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[130px] font-semibold shadow-sm"
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
                      <div className={`text-xs p-2 rounded-md flex items-center gap-1.5 ${
                        itemFeedback.type === 'success' 
                          ? 'bg-emerald-100/70 text-emerald-800' 
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
                ) : (
                  <div className="text-xs text-slate-600 bg-emerald-50/70 border border-emerald-200 rounded-md p-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
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
