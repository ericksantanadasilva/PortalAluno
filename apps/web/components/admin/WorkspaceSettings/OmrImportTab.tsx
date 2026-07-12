'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, FileSignature, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const API_URL = "/api";

type ExamData = {
  id: string;
  title: string;
  type: string;
  totalQuestions: number;
  isEnemFull: boolean;
};

export function OmrImportTab() {
  const [exams, setExams] = useState<ExamData[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [dayNumber, setDayNumber] = useState<string>('1');
  const [file, setFile] = useState<File | null>(null);
  
  const [colRegistration, setColRegistration] = useState('Matricula');
  const [colLanguage, setColLanguage] = useState('Lingua');
  const [colQuestionsStart, setColQuestionsStart] = useState('1');
  
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string; details?: string; ignored?: string[] } | null>(null);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/exams`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setExams(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingExams(false);
    }
  };

  const selectedExam = exams.find(e => e.id === selectedExamId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedExamId || !file || !colRegistration || !colQuestionsStart) {
      setUploadResult({ success: false, message: 'Preencha todos os campos obrigatórios.' });
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('examId', selectedExamId);
      
      const mappings = {
        dayNumber: Number(dayNumber),
        colRegistration,
        colLanguage,
        colQuestionsStart
      };
      
      formData.append('mappings', JSON.stringify(mappings));

      const res = await fetch(`${API_URL}/exams/import-omr`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        setUploadResult({ 
          success: true, 
          message: data.message,
          details: `Alunos processados: ${data.studentsProcessed}. Respostas salvas: ${data.responsesSaved}.`,
          ignored: data.ignoredRegistrations
        });
        setFile(null);
      } else {
        setUploadResult({ success: false, message: data.error || 'Erro ao realizar upload.' });
      }
    } catch (e) {
      console.error(e);
      setUploadResult({ success: false, message: 'Erro interno de conexão.' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6">
        <CardTitle className="text-xl flex items-center gap-2">
          <Upload className="w-5 h-5 text-primary" />
          Importação de Respostas (OMR/Remark)
        </CardTitle>
        <CardDescription>
          Faça o upload do arquivo CSV/XLSX gerado pelo seu leitor óptico para computar os gabaritos dos alunos.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-8">
        
        {/* Seção 1: Seleção do Simulado */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">1. Selecione o Simulado</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Simulado</Label>
              {loadingExams ? (
                <div className="h-10 flex items-center text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin mr-2"/> Carregando...</div>
              ) : (
                <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                  <SelectTrigger className="bg-white w-full md:w-[350px]">
                    <span className="truncate">
                      {selectedExam ? `${selectedExam.title} (${selectedExam.type})` : <SelectValue placeholder="Selecione um simulado" />}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {exams.map(exam => (
                      <SelectItem key={exam.id} value={exam.id}>
                        {exam.title} ({exam.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {selectedExam?.isEnemFull && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <Label>Qual dia deseja importar?</Label>
                <Select value={dayNumber} onValueChange={setDayNumber}>
                  <SelectTrigger className="bg-white w-full md:w-[300px]">
                    <span className="truncate">
                      {dayNumber === '1' ? 'Dia 1 (Linguagens e Humanas)' : (dayNumber === '2' ? 'Dia 2 (Natureza e Matemática)' : <SelectValue placeholder="Selecione o dia" />)}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Dia 1 (Linguagens e Humanas)</SelectItem>
                    <SelectItem value="2">Dia 2 (Natureza e Matemática)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Seção 2: Mapeamento de Colunas */}
        <div className="space-y-4 border-t border-slate-100 pt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">2. Mapeamento das Colunas do Arquivo</h3>
          <p className="text-sm text-muted-foreground">
            Informe exatamente como estão escritos os cabeçalhos (primeira linha) do seu arquivo para que o sistema saiba onde ler os dados.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Nome da Coluna: Matrícula</Label>
              <Input 
                placeholder="Ex: Matricula" 
                value={colRegistration} 
                onChange={e => setColRegistration(e.target.value)} 
                className="bg-white"
              />
              <p className="text-xs text-muted-foreground">A coluna que identifica o aluno.</p>
            </div>

            <div className="space-y-2">
              <Label>Nome da Coluna: Idioma (Opcional)</Label>
              <Input 
                placeholder="Ex: Lingua" 
                value={colLanguage} 
                onChange={e => setColLanguage(e.target.value)}
                className="bg-white" 
                disabled={selectedExam?.isEnemFull && dayNumber === '2'}
              />
              <p className="text-xs text-muted-foreground">Deixe em branco se não houver.</p>
            </div>

            <div className="space-y-2">
              <Label className="text-primary font-bold">Coluna Inicial das Respostas</Label>
              <Input 
                placeholder="Ex: 1 ou Q1" 
                value={colQuestionsStart} 
                onChange={e => setColQuestionsStart(e.target.value)}
                className="bg-primary/5 border-primary/20 focus-visible:ring-primary/30"
              />
              <p className="text-xs text-muted-foreground">O título da coluna onde começa a primeira questão deste arquivo. O sistema lerá as respostas sequencialmente a partir dela.</p>
            </div>
          </div>
        </div>

        {/* Seção 3: Upload do Arquivo */}
        <div className="space-y-4 border-t border-slate-100 pt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">3. Arquivo de Dados</h3>
          
          <div className="space-y-2">
            <Label>Arquivo CSV ou XLSX</Label>
            <Input 
              type="file" 
              accept=".csv, .xlsx, .xls" 
              onChange={handleFileChange}
              className="bg-white cursor-pointer file:cursor-pointer file:bg-slate-100 file:text-slate-700 file:border-0 file:mr-4 file:px-4 file:py-1 file:rounded-full file:text-sm file:font-semibold hover:file:bg-slate-200 transition-all"
            />
          </div>
        </div>

        {uploadResult && (
          <Alert className={`mt-4 ${uploadResult.success ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
            <div className="flex gap-3">
              {uploadResult.success && <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />}
              <div>
                <AlertTitle className="font-bold">{uploadResult.success ? 'Importação Concluída!' : 'Falha na Importação'}</AlertTitle>
                <AlertDescription className="mt-1">
                  <p>{uploadResult.message}</p>
                  {uploadResult.details && <p className="mt-1 text-sm font-medium opacity-80">{uploadResult.details}</p>}
                  {uploadResult.ignored && uploadResult.ignored.length > 0 && (
                    <div className="mt-2 bg-white/50 rounded-md p-2 border border-emerald-200/50">
                      <p className="text-sm font-bold text-amber-700">Matrículas Ignoradas ({uploadResult.ignored.length}):</p>
                      <p className="text-xs mt-1 font-mono text-amber-800 break-words max-w-full">
                        {uploadResult.ignored.join(', ')}
                      </p>
                    </div>
                  )}
                </AlertDescription>
              </div>
            </div>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="bg-slate-50/50 border-t border-slate-100 p-6 flex justify-end">
        <Button 
          disabled={!selectedExamId || !file || !colRegistration || !colQuestionsStart || uploading} 
          onClick={handleUpload}
          className="gap-2 shadow-sm rounded-full px-8"
          size="lg"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSignature className="w-4 h-4" />}
          {uploading ? 'Importando Dados...' : 'Iniciar Importação OMR'}
        </Button>
      </CardFooter>
    </Card>
  );
}
