'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FileSignature, Loader2, Calendar, LayoutList, FileText, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { DiscursiveExamCard, DiscursiveExam } from '@/components/simulados/DiscursiveExamCard';

const API_URL = "/api";

type ExamSession = {
  dayNumber: number;
  submitted: boolean;
};

type Exam = {
  id: string;
  title: string;
  date: string;
  type: string;
  totalQuestions: number;
  isEnemFull: boolean;
  windowStart: string;
  windowEnd: string;
  windowStart2?: string;
  windowEnd2?: string;
  examSessions: ExamSession[];
};

export default function SimuladosStudentPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [discursiveExams, setDiscursiveExams] = useState<DiscursiveExam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [resObjective, resDiscursive] = await Promise.all([
        fetch(`${API_URL}/exams/available`, { headers }),
        fetch(`${API_URL}/discursive/student/exams`, { headers })
      ]);

      if (resObjective.ok) {
        setExams(await resObjective.json());
      }
      if (resDiscursive.ok) {
        setDiscursiveExams(await resDiscursive.json());
      }
    } catch (e) {
      console.error('Erro ao carregar simulados:', e);
    } finally {
      setLoading(false);
    }
  };

  const objectiveExams = exams.filter(e => e.type?.toLowerCase() !== 'discursivo');

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Meus Simulados</h1>
        <p className="text-muted-foreground mt-2">
          Aqui você encontra os simulados objetivos e discursivos disponíveis. Envie suas resoluções ou preencha o cartão-resposta digital.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-emerald-600" />
          <p>Carregando simulados disponíveis...</p>
        </div>
      ) : (
        <Tabs defaultValue="discursive" className="w-full space-y-6">
          <TabsList className="w-full sm:w-auto inline-flex h-11 items-center justify-start rounded-lg bg-slate-100 p-1 border border-slate-200">
            <TabsTrigger value="discursive" className="data-[active]:bg-white data-[active]:text-emerald-700 data-[state=active]:bg-white data-[state=active]:text-emerald-700 font-semibold px-6 py-2">
              <FileText className="w-4 h-4 mr-2" />
              Simulados Discursivos ({discursiveExams.length})
            </TabsTrigger>
            <TabsTrigger value="objective" className="data-[active]:bg-white data-[active]:text-emerald-700 data-[state=active]:bg-white data-[state=active]:text-emerald-700 font-semibold px-6 py-2">
              <FileSignature className="w-4 h-4 mr-2" />
              Simulados Objetivos ({objectiveExams.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB: DISCURSIVOS */}
          <TabsContent value="discursive" className="space-y-6">
            {discursiveExams.length === 0 ? (
              <div className="text-center p-12 bg-white border border-dashed rounded-xl shadow-sm">
                <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold text-slate-700">Nenhum simulado discursivo pendente</h3>
                <p className="text-muted-foreground mt-1">Os simulados discursivos para envio de PDF aparecerão aqui.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {discursiveExams.map((discExam) => (
                  <DiscursiveExamCard
                    key={discExam.id}
                    exam={discExam}
                    onSubmissionSuccess={fetchAllData}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB: OBJETIVOS */}
          <TabsContent value="objective" className="space-y-6">
            {objectiveExams.length === 0 ? (
              <div className="text-center p-12 bg-white border border-dashed rounded-xl shadow-sm">
                <FileSignature className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold text-slate-700">Nenhum simulado objetivo no momento</h3>
                <p className="text-muted-foreground mt-1">Os simulados objetivas com cartão-resposta aparecerão aqui assim que forem liberados.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {objectiveExams.map((exam) => {
                  const now = new Date();
                  const examDate = new Date(exam.date);
                  const wStart = new Date(exam.windowStart);
                  const wEnd = new Date(exam.windowEnd);
                  
                  const wStart2 = exam.windowStart2 ? new Date(exam.windowStart2) : null;
                  const wEnd2 = exam.windowEnd2 ? new Date(exam.windowEnd2) : null;

                  const isStarted1 = wStart <= now;
                  const isExpired1 = wEnd < now;
                  
                  const isStarted2 = wStart2 ? wStart2 <= now : isStarted1;
                  const isExpired2 = wEnd2 ? wEnd2 < now : isExpired1;

                  const isSubmittedDay1 = exam.examSessions?.some(s => s.dayNumber === 1 && s.submitted);
                  const isSubmittedDay2 = exam.examSessions?.some(s => s.dayNumber === 2 && s.submitted);

                  const renderButton = (dayNumber: number, title: string, isSubmitted: boolean) => {
                    let text = title;
                    let disabled = false;
                    let variant: "default" | "secondary" | "destructive" | "outline" = "default";
                    const href = `/dashboard/simulados/${exam.id}?day=${exam.isEnemFull ? dayNumber : 1}`;
                    
                    const isStarted = dayNumber === 2 ? isStarted2 : isStarted1;
                    const isExpired = dayNumber === 2 ? isExpired2 : isExpired1;
                    
                    if (isSubmitted) {
                        text = "Já Respondido";
                        disabled = true;
                        variant = "secondary";
                    } else if (isExpired) {
                        text = "Não Realizado";
                        disabled = true;
                        variant = "destructive";
                    } else if (!isStarted) {
                        text = "Aguardando Prazo";
                        disabled = true;
                        variant = "outline";
                    }

                    if (disabled) {
                        return (
                            <Button disabled className="w-full justify-start font-semibold" variant={variant}>
                                <FileSignature className="w-4 h-4 mr-2 flex-shrink-0" />
                                <span className="truncate">{text}</span>
                            </Button>
                        );
                    }
                    
                    return (
                        <Link href={href} className="w-full">
                            <Button className="w-full justify-start font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow transition-all" variant={variant}>
                                <FileSignature className="w-4 h-4 mr-2 flex-shrink-0" />
                                <span className="truncate">{text}</span>
                            </Button>
                        </Link>
                    );
                  };

                  const isCardActive = isStarted1 && (!isExpired1 || (exam.isEnemFull && !isExpired2));
                  const isCardCompletelyExpired = isExpired1 && (!exam.isEnemFull || isExpired2);

                  return (
                    <Card key={exam.id} className="hover:shadow-lg transition-all group border-slate-200 flex flex-col h-full bg-white relative overflow-hidden">
                      <div className={`absolute top-0 left-0 w-full h-1 ${isCardActive ? 'bg-emerald-500' : isCardCompletelyExpired ? 'bg-destructive' : 'bg-slate-300'}`} />
                      <CardHeader className="pb-3 flex-grow">
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant={isCardActive ? 'default' : 'secondary'} className="uppercase font-semibold tracking-wider text-[10px]">
                            {exam.type.replace('_', ' ')}
                          </Badge>
                          <div className="flex items-center text-xs text-muted-foreground bg-slate-50 border px-2 py-1 rounded-md font-medium">
                            <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                            {examDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                          </div>
                        </div>
                        <CardTitle className="text-lg leading-tight group-hover:text-emerald-600 transition-colors mt-2">
                          {exam.title}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-3">
                          <LayoutList className="w-4 h-4 text-slate-400" />
                          {exam.totalQuestions} Questões
                        </CardDescription>
                        <div className="text-xs text-slate-500 mt-2 bg-slate-50 p-2 rounded-md border flex flex-col gap-1">
                          <div>
                            <span className="font-semibold block mb-1">{exam.isEnemFull ? "Prazo Dia 1:" : "Prazo de Envio:"}</span>
                            {wStart.toLocaleDateString('pt-BR')} {wStart.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} até {wEnd.toLocaleDateString('pt-BR')} {wEnd.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {exam.isEnemFull && wStart2 && wEnd2 && (
                            <div className="mt-1 border-t pt-1 border-slate-200">
                              <span className="font-semibold block mb-1">Prazo Dia 2:</span>
                              {wStart2.toLocaleDateString('pt-BR')} {wStart2.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} até {wEnd2.toLocaleDateString('pt-BR')} {wEnd2.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardFooter className="pt-0 pb-5 px-6 flex flex-col gap-3">
                        {exam.isEnemFull ? (
                          <>
                            {renderButton(1, "Dia 1: Humanas e Linguagens (1-90)", isSubmittedDay1)}
                            {renderButton(2, "Dia 2: Natureza e Mat (91-180)", isSubmittedDay2)}
                          </>
                        ) : (
                          renderButton(1, "Responder Cartão", isSubmittedDay1)
                        )}
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
