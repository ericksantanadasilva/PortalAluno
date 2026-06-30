'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileSignature, Loader2, Calendar, LayoutList } from 'lucide-react';
import Link from 'next/link';

const API_URL = "http://localhost:3001/api";

type Exam = {
  id: string;
  title: string;
  date: string;
  type: string;
  totalQuestions: number;
};

export default function SimuladosStudentPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/exams/available`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setExams(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Meus Simulados</h1>
        <p className="text-muted-foreground mt-2">
          Aqui você encontra os simulados disponíveis. Preencha seu cartão-resposta digitalmente para receber a correção.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
          <p>Carregando simulados disponíveis...</p>
        </div>
      ) : exams.length === 0 ? (
        <div className="text-center p-12 bg-white border border-dashed rounded-xl shadow-sm">
          <FileSignature className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">Nenhum simulado no momento</h3>
          <p className="text-muted-foreground mt-1">Os simulados aparecerão aqui assim que forem liberados pela secretaria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map((exam) => (
            <Card key={exam.id} className="hover:shadow-md transition-shadow group border-slate-200">
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="secondary" className="uppercase font-semibold tracking-wider text-[10px]">
                    {exam.type.replace('_', ' ')}
                  </Badge>
                  <div className="flex items-center text-xs text-muted-foreground bg-slate-100 px-2 py-1 rounded-md font-medium">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date(exam.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                  </div>
                </div>
                <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
                  {exam.title}
                </CardTitle>
                <CardDescription className="flex items-center gap-1 mt-2">
                  <LayoutList className="w-4 h-4" />
                  {exam.totalQuestions} Questões
                </CardDescription>
              </CardHeader>
              <CardFooter className="pt-4 border-t border-slate-50">
                <Link href={`/dashboard/simulados/${exam.id}`} className="w-full">
                  <Button className="w-full gap-2 font-semibold">
                    <FileSignature className="w-4 h-4" />
                    Preencher Cartão-Resposta
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
