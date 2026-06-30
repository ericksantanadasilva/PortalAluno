'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle2, Save, Loader2 } from 'lucide-react';

const API_URL = "http://localhost:3001/api";

type Exam = {
  id: string;
  title: string;
  date: string;
  type: string;
  totalQuestions: number;
};

type ExamQuestion = {
  questionNumber: number;
  language: string;
  correctAlternative: string;
  difficultyTier: string;
  isAnnulled: boolean;
  subjectId?: string;
  theme?: string;
};

const ALTERNATIVAS = ['A', 'B', 'C', 'D', 'E'];

export function AnswerKeysManager({ updateTrigger }: { onUpdate?: () => void, updateTrigger?: number }) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchExams();
  }, [updateTrigger]);

  useEffect(() => {
    if (selectedExamId) {
      fetchQuestions(selectedExamId);
    } else {
      setQuestions([]);
    }
  }, [selectedExamId]);

  const fetchExams = async () => {
    try {
      setLoadingExams(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/exams`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setExams(data);
      }
    } catch (error) {
      console.error('Erro ao buscar simulados', error);
    } finally {
      setLoadingExams(false);
    }
  };

  const fetchQuestions = async (examId: string) => {
    try {
      setLoadingQuestions(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/exams/${examId}/questions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        
        // Se a matriz já foi preenchida, usamos ela:
        if (data && data.length > 0) {
          setQuestions(data.map((q: any) => ({
            questionNumber: q.questionNumber,
            language: q.language || 'none',
            correctAlternative: q.correctAlternative || '',
            difficultyTier: q.difficultyTier || 'medio',
            isAnnulled: q.isAnnulled || false,
            subjectId: q.subjectId,
            theme: q.theme
          })));
        } else {
          // Fallback caso a matriz não exista (o que não deve acontecer no novo fluxo)
          const exam = exams.find(e => e.id === examId);
          const total = exam ? exam.totalQuestions : 60;
          const fullQuestions: ExamQuestion[] = Array.from({ length: total }, (_, i) => ({
            questionNumber: i + 1,
            language: 'none',
            correctAlternative: '',
            difficultyTier: 'medio',
            isAnnulled: false,
          }));
          setQuestions(fullQuestions);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar gabarito', error);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleAlternativaSelect = (numero: number, language: string, alternativa: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.questionNumber === numero && q.language === language) {
        return { ...q, correctAlternative: alternativa };
      }
      return q;
    }));
  };

  const toggleAnularQuestao = (numero: number, language: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.questionNumber === numero && q.language === language) {
        return { ...q, isAnnulled: !q.isAnnulled };
      }
      return q;
    }));
  };

  const handleSaveAnswerKey = async () => {
    if (!selectedExamId) return;
    
    const unanswered = questions.filter(q => !q.correctAlternative && !q.isAnnulled);
    if (unanswered.length > 0) {
      if (!confirm(`Existem ${unanswered.length} questões sem resposta ou não anuladas. Deseja salvar mesmo assim?`)) {
        return;
      }
    }
    
    // Send all questions that we have in state, as we are also saving subjectId, theme, language
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/exams/${selectedExamId}/questions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ answers: questions })
      });
      
      if (res.ok) {
        alert('Gabarito salvo com sucesso!');
      } else {
        alert('Erro ao salvar gabarito.');
      }
    } catch (error) {
      console.error(error);
      alert('Erro interno.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gabarito Oficial</CardTitle>
          <CardDescription>
            Insira o gabarito oficial do simulado selecionado. Você também pode anular questões específicas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 pt-8">
          <div className="max-w-md">
            <Select value={selectedExamId} onValueChange={setSelectedExamId} disabled={loadingExams}>
              <SelectTrigger>
                <SelectValue placeholder={loadingExams ? "Carregando..." : "Selecione um Simulado Cadastrado..."}>
                  {selectedExamId ? exams.find(e => e.id === selectedExamId)?.title : null}
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
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-6">
                <div className="font-semibold flex items-center gap-2 text-slate-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  Cartão-Resposta Digital
                </div>
                <div className="text-sm font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                  {questions.length} Questões
                </div>
              </div>

              {loadingQuestions ? (
                <div className="flex justify-center p-12">
                   <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : questions.length === 0 ? (
                <div className="text-center p-12 text-muted-foreground border border-dashed rounded-lg">
                  Nenhuma matriz de questões cadastrada para este simulado. Crie a matriz na aba "Gestão de Simulados" primeiro.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-5">
                  {questions.map((q) => {
                    const numero = q.questionNumber;
                    const language = q.language;
                    const anulada = q.isAnnulled;
                    const selected = q.correctAlternative;
                    
                    let label = `${numero}.`;
                    if (language === 'ingles') label = `${numero} (Inglês)`;
                    if (language === 'espanhol') label = `${numero} (Espanhol)`;

                    return (
                      <div key={`${numero}-${language}`} className={`flex flex-col gap-2 p-3 rounded-xl transition-all ${anulada ? 'opacity-50 grayscale bg-slate-50' : 'bg-white hover:bg-slate-50 border border-slate-100 hover:shadow-[0_4px_15px_rgb(0,0,0,0.02)]'}`}>
                        <span className="font-mono font-bold text-slate-500 text-sm pl-1">
                          {label}
                        </span>
                        <div className="flex bg-slate-100/50 rounded-lg p-1.5 border border-slate-200/50 shadow-inner items-center gap-1 justify-between">
                          <div className="flex gap-1">
                            {['A', 'B', 'C', 'D', 'E'].map((alt) => {
                              // Se for UERJ, só vai até a letra D
                              const currentExam = exams.find(e => e.id === selectedExamId);
                              if (currentExam?.type === 'uerj' && alt === 'E') return null;

                              const isSelected = selected === alt;
                              return (
                                <button
                                  key={alt}
                                  disabled={anulada}
                                  onClick={() => handleAlternativaSelect(numero, language, alt)}
                                  className={`w-8 h-8 flex items-center justify-center text-xs font-semibold rounded transition-colors disabled:cursor-not-allowed ${
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
                          <div className="w-px h-6 bg-slate-200/60 mx-1"></div>
                          <button
                            title="Anular Questão"
                            onClick={() => toggleAnularQuestao(numero, language)}
                            className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${anulada ? 'text-destructive bg-destructive/10' : 'text-slate-400 hover:bg-destructive/10 hover:text-destructive'}`}
                          >
                            <AlertTriangle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end border-t border-slate-100 p-6">
          <Button disabled={!selectedExamId || saving || questions.length === 0} onClick={handleSaveAnswerKey} className="gap-2 rounded-full px-8 shadow-md">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Gabarito Oficial
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
