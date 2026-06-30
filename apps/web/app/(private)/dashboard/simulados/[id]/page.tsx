'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, ArrowLeft, CheckCircle2, Languages } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const API_URL = "http://localhost:3001/api";

type ExamData = {
  id: string;
  title: string;
  totalQuestions: number;
  type: string;
};

type QuestionRef = {
  questionNumber: number;
  language: string;
  isAnnulled: boolean;
};

type StudentAnswer = {
  questionNumber: number;
  chosenAlternative: string;
  language: string;
};

export default function SimuladoAnswerPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;

  const [exam, setExam] = useState<ExamData | null>(null);
  const [questionsRef, setQuestionsRef] = useState<QuestionRef[]>([]);
  const [answers, setAnswers] = useState<StudentAnswer[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, [examId]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/exams/${examId}/responses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setExam(data.exam);
        setQuestionsRef(data.questions);
        
        // Load existing answers
        if (data.responses && data.responses.length > 0) {
          const loadedAnswers = data.responses.map((r: any) => ({
            questionNumber: r.questionNumber,
            chosenAlternative: r.chosenAlternative,
            language: r.language
          }));
          setAnswers(loadedAnswers);
          
          // Try to infer selected language if they already answered a foreign language question
          const foreignLangAnswer = loadedAnswers.find((a: any) => a.language === 'ingles' || a.language === 'espanhol');
          if (foreignLangAnswer) {
            setSelectedLanguage(foreignLangAnswer.language);
          }
        }
      } else {
        router.push('/dashboard/simulados');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const hasForeignLanguage = questionsRef.some(q => q.language === 'ingles' || q.language === 'espanhol');

  const handleAlternativaSelect = (numero: number, alternativa: string, isForeignLangQ: boolean) => {
    if (isForeignLangQ && !selectedLanguage) {
      alert("Por favor, selecione primeiro o Idioma Estrangeiro no topo da página.");
      return;
    }

    const language = isForeignLangQ ? selectedLanguage : 'none';

    setAnswers(prev => {
      const exists = prev.find(a => a.questionNumber === numero);
      if (exists) {
        return prev.map(a => a.questionNumber === numero ? { ...a, chosenAlternative: alternativa, language } : a);
      } else {
        return [...prev, { questionNumber: numero, chosenAlternative: alternativa, language }];
      }
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/exams/${examId}/responses`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ answers })
      });
      
      if (res.ok) {
        alert("Respostas salvas com sucesso!");
        router.push('/dashboard/simulados');
      } else {
        alert("Erro ao salvar respostas.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro interno ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-muted-foreground h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
        <p>Carregando simulado...</p>
      </div>
    );
  }

  if (!exam) return null;

  // Determine alternatives array based on exam type
  const alternativasPossiveis = exam.type === 'uerj' ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'C', 'D', 'E'];
  const questionsArray = Array.from({ length: exam.totalQuestions }, (_, i) => i + 1);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 p-4 md:p-8">
      <Link href="/dashboard/simulados" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Voltar para a lista
      </Link>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">{exam.title}</CardTitle>
              <CardDescription className="mt-1 uppercase tracking-wider text-xs font-bold text-primary">
                PROVA TIPO: {exam.type.replace('_', ' ')}
              </CardDescription>
            </div>
            
            <div className="text-sm font-bold bg-slate-100 text-slate-600 px-4 py-2 rounded-full border border-slate-200">
              Respondidas: {answers.filter(a => a.chosenAlternative).length} / {exam.totalQuestions}
            </div>
          </div>
        </CardHeader>

        {hasForeignLanguage && (
          <div className="px-6 py-2">
            <Alert className="bg-blue-50/50 border-blue-200">
              <div className="flex gap-4 items-start">
                <Languages className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <AlertTitle className="text-blue-800 font-bold text-base">Idioma Estrangeiro</AlertTitle>
                  <AlertDescription className="text-blue-700 mt-2 flex flex-col md:flex-row md:items-center gap-4">
                    <p>Esta prova possui questões de língua estrangeira. Selecione o idioma que você escolheu para realizar a prova:</p>
                    <div className="w-48 shrink-0">
                      <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                        <SelectTrigger className="bg-white border-blue-200">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ingles">Inglês</SelectItem>
                          <SelectItem value="espanhol">Espanhol</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          </div>
        )}

        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-5">
            {questionsArray.map((numero) => {
              // Verifica se essa questão tem idioma estrangeiro cadastrado (ingles ou espanhol)
              const isForeignLangQ = questionsRef.some(q => q.questionNumber === numero && (q.language === 'ingles' || q.language === 'espanhol'));
              
              // Verifica se a questão foi anulada (independente do idioma, ou do idioma escolhido)
              let anulada = false;
              if (isForeignLangQ && selectedLanguage) {
                anulada = questionsRef.some(q => q.questionNumber === numero && q.language === selectedLanguage && q.isAnnulled);
              } else {
                anulada = questionsRef.some(q => q.questionNumber === numero && q.isAnnulled);
              }

              // Pega a resposta salva
              const studentAns = answers.find(a => a.questionNumber === numero);
              const selected = studentAns?.chosenAlternative;

              return (
                <div key={numero} className={`flex flex-col gap-2 p-3 rounded-xl transition-all ${anulada ? 'opacity-50 grayscale bg-slate-50' : 'bg-white hover:bg-slate-50 border border-slate-100 hover:shadow-[0_4px_15px_rgb(0,0,0,0.02)]'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-500 text-sm pl-1">
                      {numero}.
                      {isForeignLangQ && <span className="ml-1 text-[10px] uppercase text-blue-500 font-semibold">{selectedLanguage || 'Idioma'}</span>}
                    </span>
                    {selected && !anulada && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  </div>

                  <div className="flex bg-slate-100/50 rounded-lg p-1.5 border border-slate-200/50 shadow-inner items-center justify-center gap-1">
                    {alternativasPossiveis.map((alt) => {
                      const isSelected = selected === alt;
                      return (
                        <button
                          key={alt}
                          disabled={anulada}
                          onClick={() => handleAlternativaSelect(numero, alt, isForeignLangQ)}
                          className={`flex-1 h-10 flex items-center justify-center text-sm font-bold rounded transition-colors disabled:cursor-not-allowed ${
                            isSelected && !anulada
                              ? 'bg-primary text-primary-foreground shadow-sm' 
                              : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm'
                          } ${anulada && isSelected ? 'bg-slate-300 text-slate-600' : ''}`}
                        >
                          {alt}
                        </button>
                      );
                    })}
                  </div>
                  {anulada && <p className="text-[10px] text-center text-destructive font-bold uppercase tracking-wider mt-1">Questão Anulada</p>}
                </div>
              );
            })}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end border-t border-slate-100 p-6 bg-slate-50/50 rounded-b-xl">
          <Button disabled={saving || (hasForeignLanguage && !selectedLanguage)} onClick={handleSave} className="gap-2 rounded-full px-8 shadow-md" size="lg">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Entregar Cartão-Resposta
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
