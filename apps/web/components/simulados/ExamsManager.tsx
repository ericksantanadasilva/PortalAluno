'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Loader2, Edit2, X, Save } from 'lucide-react';

const API_URL = "http://localhost:3001/api";

type Exam = {
  id: string;
  title: string;
  date: string;
  type: string;
  totalQuestions: number;
  isPublished: boolean;
};

type FormQuestion = {
  questionNumber: number;
  language: string; // 'none', 'ingles', 'espanhol'
  subjectId: string;
  theme: string;
};

export function ExamsManager({ onUpdate }: { onUpdate?: () => void, updateTrigger?: number }) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<{ id: string, name: string }[]>([]);
  
  const [form, setForm] = useState({
    title: '',
    date: '',
    type: 'enem',
    totalQuestions: 60,
    isPublished: false,
    questions: [] as FormQuestion[]
  });

  useEffect(() => {
    fetchExams();
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/tenant/subjects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSubjects(await res.json());
      }
    } catch (e) {
      console.error('Erro ao buscar disciplinas', e);
    }
  };

  const fetchExams = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

  const handleTotalQuestionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const qtd = parseInt(e.target.value) || 0;
    
    // Gera as questões dinamicamente (1 a N, language='none')
    // Se o usuário diminuir, cortamos. Se aumentar, adicionamos no final.
    let novasQuestoes = [...form.questions];
    
    // Descobre qual o maximo atual no array
    const maxAtual = novasQuestoes.length > 0 ? Math.max(...novasQuestoes.map(q => q.questionNumber)) : 0;
    
    if (qtd > maxAtual) {
      for (let i = maxAtual + 1; i <= qtd; i++) {
        novasQuestoes.push({ questionNumber: i, language: 'none', subjectId: '', theme: '' });
      }
    } else if (qtd < maxAtual) {
      novasQuestoes = novasQuestoes.filter(q => q.questionNumber <= qtd);
    }

    setForm({
      ...form,
      totalQuestions: qtd,
      questions: novasQuestoes,
    });
  };

  const splitQuestion = (numero: number) => {
    const semAQuestao = form.questions.filter(q => q.questionNumber !== numero);
    const questaoAntiga = form.questions.find(q => q.questionNumber === numero && q.language === 'none');
    
    // Auto-preencher as disciplinas de idiomas, se existirem
    const inglesSubject = subjects.find(s => s.name.toLowerCase().includes('inglês') || s.name.toLowerCase().includes('ingles'));
    const espanholSubject = subjects.find(s => s.name.toLowerCase().includes('espanhol'));

    setForm({
      ...form,
      questions: [
        ...semAQuestao,
        { questionNumber: numero, language: 'ingles', subjectId: inglesSubject?.id || '', theme: questaoAntiga?.theme || '' },
        { questionNumber: numero, language: 'espanhol', subjectId: espanholSubject?.id || '', theme: questaoAntiga?.theme || '' }
      ].sort((a, b) => a.questionNumber - b.questionNumber)
    });
  };

  const mergeQuestion = (numero: number) => {
    const semAQuestao = form.questions.filter(q => q.questionNumber !== numero);
    const questaoAntiga = form.questions.find(q => q.questionNumber === numero && q.language === 'ingles');
    
    setForm({
      ...form,
      questions: [
        ...semAQuestao,
        { questionNumber: numero, language: 'none', subjectId: questaoAntiga?.subjectId || '', theme: questaoAntiga?.theme || '' }
      ].sort((a, b) => a.questionNumber - b.questionNumber)
    });
  };

  const updateQ = (numero: number, language: string, campo: keyof FormQuestion, valor: string) => {
    setForm(prev => ({
      ...prev,
      questions: prev.questions.map(q => {
        if (q.questionNumber === numero && q.language === language) {
          return { ...q, [campo]: valor };
        }
        return q;
      })
    }));
  };

  const loadExamForEdit = async (exam: Exam) => {
    setEditingExamId(exam.id);
    
    // Formata a data para yyyy-mm-dd
    const dateStr = new Date(exam.date).toISOString().split('T')[0];
    
    setForm({
      title: exam.title,
      date: dateStr,
      type: exam.type,
      totalQuestions: exam.totalQuestions,
      isPublished: exam.isPublished,
      questions: []
    });

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/exams/${exam.id}/questions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const questions = await res.json();
        // Mapeia do backend para o formato do form
        const formattedQuestions: FormQuestion[] = questions.map((q: any) => ({
          questionNumber: q.questionNumber,
          language: q.language || 'none',
          subjectId: q.subjectId || '',
          theme: q.theme || ''
        }));
        
        // Se o exam tem totalQuestions mas a api nao retornou nada (ou incompleto)
        // a gente preenche o resto
        const maxQ = formattedQuestions.length > 0 ? Math.max(...formattedQuestions.map(q => q.questionNumber)) : 0;
        if (maxQ < exam.totalQuestions) {
           for (let i = maxQ + 1; i <= exam.totalQuestions; i++) {
             formattedQuestions.push({ questionNumber: i, language: 'none', subjectId: '', theme: '' });
           }
        }
        
        setForm(prev => ({ ...prev, questions: formattedQuestions.sort((a, b) => a.questionNumber - b.questionNumber) }));
      }
    } catch (e) {
      console.error('Erro ao buscar questoes do simulado', e);
    }
  };

  const cancelEdit = () => {
    setEditingExamId(null);
    setForm({ title: '', date: '', type: 'enem', totalQuestions: 60, isPublished: false, questions: [] });
  };

  const handleSaveExam = async () => {
    if (!form.title || !form.date) {
      alert('Preencha título e data.');
      return;
    }
    
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      let targetExamId = editingExamId;
      
      if (editingExamId) {
        // UPDATE EXAM
        const resExam = await fetch(`${API_URL}/exams/${editingExamId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            title: form.title,
            date: form.date,
            totalQuestions: form.totalQuestions,
            type: form.type,
            isPublished: form.isPublished
          })
        });
        if (!resExam.ok) throw new Error('Erro ao atualizar simulado');
      } else {
        // CREATE EXAM
        const resExam = await fetch(`${API_URL}/exams`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            title: form.title,
            date: form.date,
            totalQuestions: form.totalQuestions,
            type: form.type,
            isPublished: form.isPublished
          })
        });
        if (!resExam.ok) throw new Error('Erro ao criar simulado');
        const newExam = await resExam.json();
        targetExamId = newExam.id;
      }
      
      // UPSERT QUESTIONS
      if (form.questions.length > 0 && targetExamId) {
        // Formata pro backend (que espera um array com 'subjectId' validos ou fallback, e 'language')
        const payload = form.questions.map(q => ({
          questionNumber: q.questionNumber,
          subjectId: q.subjectId || undefined,
          theme: q.theme || '',
          language: q.language
        }));

        const resMatrix = await fetch(`${API_URL}/exams/${targetExamId}/questions`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ answers: payload })
        });

        if (!resMatrix.ok) {
          console.error("Erro ao salvar matriz de questões");
        }
      }

      alert(editingExamId ? 'Simulado atualizado com sucesso!' : 'Simulado criado com sucesso!');
      if (onUpdate) onUpdate();
      cancelEdit();
      fetchExams();
    } catch (error) {
      console.error(error);
      alert('Erro interno.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este simulado?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/exams/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setExams(exams.filter(e => e.id !== id));
      }
    } catch (error) {
      console.error('Erro ao excluir', error);
    }
  };

  // Agrupa questoes para renderizar
  const groupedQuestions: Record<number, FormQuestion[]> = {};
  form.questions.forEach(q => {
    if (!groupedQuestions[q.questionNumber]) groupedQuestions[q.questionNumber] = [];
    groupedQuestions[q.questionNumber].push(q);
  });
  const groupedKeys = Object.keys(groupedQuestions).map(Number).sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      <Card className={editingExamId ? 'border-primary ring-1 ring-primary/20' : ''}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{editingExamId ? 'Editando Simulado' : 'Criar Novo Simulado'}</CardTitle>
            <CardDescription>
              {editingExamId ? 'Você pode alterar qualquer detalhe do simulado e publicar quando pronto.' : 'Configure os dados base da prova e a sua matriz de referência.'}
            </CardDescription>
          </div>
          {editingExamId && (
            <Button variant="ghost" onClick={cancelEdit} className="text-muted-foreground">
              <X className="w-4 h-4 mr-2" /> Cancelar Edição
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between pb-4 border-b">
            <h3 className="font-semibold text-lg">Detalhes do Simulado</h3>
            <div className="flex items-center gap-3">
              <Label htmlFor="publicado">Liberar Boletim para Alunos</Label>
              <label htmlFor="publicado" className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  id="publicado" 
                  className="sr-only peer" 
                  checked={form.isPublished}
                  onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
            <div className="lg:col-span-2 space-y-2">
              <Label htmlFor="titulo">Título do Simulado</Label>
              <Input 
                id="titulo" 
                placeholder="Ex: Simulado Nacional ENEM - 1º Semestre" 
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="data">Data de Aplicação</Label>
              <Input 
                id="data" 
                type="date" 
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Prova</Label>
              <Select 
                value={form.type}
                onValueChange={(val: string) => setForm({ ...form, type: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enem">ENEM</SelectItem>
                  <SelectItem value="enem_parcial">ENEM Parcial</SelectItem>
                  <SelectItem value="uerj">UERJ</SelectItem>
                  <SelectItem value="discursivo">Discursivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Matriz de Questões</CardTitle>
            <CardDescription>Defina o tema e a disciplina de cada questão. Transforme em 'Idiomas' para duplicar a questão.</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="qtdQuestoes" className="whitespace-nowrap">Nº de Questões:</Label>
            <Input 
              id="qtdQuestoes" 
              type="number" 
              min="0" 
              max="180" 
              className="w-24 text-center font-bold"
              value={form.totalQuestions || ''}
              onChange={handleTotalQuestionsChange}
              placeholder="0"
            />
          </div>
        </CardHeader>
        
        {form.questions.length > 0 && (
          <CardContent>
            <div className="rounded-md border max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-4 py-3 w-16 text-center">Nº</th>
                    <th className="px-4 py-3 w-32 text-center">Idiomas?</th>
                    <th className="px-4 py-3 w-64">Disciplina (ID Opcional)</th>
                    <th className="px-4 py-3">Conteúdo / Tema Pedagógico</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedKeys.map((numStr) => {
                    const qs = groupedQuestions[numStr];
                    const isForeign = qs.length === 2 && qs.some(q => q.language === 'ingles');

                    if (!isForeign) {
                      const q = qs[0];
                      return (
                        <tr key={`${q.questionNumber}-none`} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-2 text-center font-medium">{q.questionNumber}</td>
                          <td className="px-4 py-2 text-center">
                            <input 
                              type="checkbox" 
                              checked={false}
                              onChange={() => splitQuestion(q.questionNumber)}
                              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Select value={q.subjectId || undefined} onValueChange={(v) => updateQ(q.questionNumber, 'none', 'subjectId', v)}>
                              <SelectTrigger className="h-8 w-full border-slate-200">
                                <SelectValue placeholder={subjects.length === 0 ? "Carregando..." : "Selecione a Disciplina"}>
                                  {q.subjectId ? subjects.find(s => s.id === q.subjectId)?.name : null}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {subjects.map(s => (
                                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-2">
                            <Input 
                              placeholder="Ex: Progressão Aritmética" 
                              className="h-8"
                              value={q.theme}
                              onChange={(e) => updateQ(q.questionNumber, 'none', 'theme', e.target.value)}
                            />
                          </td>
                        </tr>
                      );
                    } else {
                      const qEn = qs.find(q => q.language === 'ingles');
                      const qEs = qs.find(q => q.language === 'espanhol');
                      if (!qEn || !qEs) return null; // safety check

                      return (
                        <React.Fragment key={`${qEn.questionNumber}-foreign`}>
                          <tr className="border-b border-dashed bg-slate-50/50">
                            <td rowSpan={2} className="px-4 py-2 text-center font-bold text-primary">{qEn.questionNumber}</td>
                            <td rowSpan={2} className="px-4 py-2 text-center border-r border-dashed">
                              <input 
                                type="checkbox" 
                                checked={true}
                                onChange={() => mergeQuestion(qEn.questionNumber)}
                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                              />
                            </td>
                            <td className="px-4 py-2 flex items-center gap-2">
                              <Badge variant="outline" className="w-20 justify-center">Inglês</Badge>
                              <Select value={qEn.subjectId || undefined} onValueChange={(v) => updateQ(qEn.questionNumber, 'ingles', 'subjectId', v)}>
                                <SelectTrigger className="h-8 w-full border-slate-200">
                                  <SelectValue placeholder={subjects.length === 0 ? "Carregando..." : "Disciplina..."}>
                                    {qEn.subjectId ? subjects.find(s => s.id === qEn.subjectId)?.name : null}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {subjects.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-4 py-2 border-b border-dashed">
                              <Input 
                                placeholder="Tema de Inglês..." 
                                className="h-8"
                                value={qEn.theme}
                                onChange={(e) => updateQ(qEn.questionNumber, 'ingles', 'theme', e.target.value)}
                              />
                            </td>
                          </tr>
                          <tr className="border-b last:border-0 bg-slate-50/50">
                            <td className="px-4 py-2 flex items-center gap-2">
                              <Badge variant="outline" className="w-20 justify-center">Espanhol</Badge>
                              <Select value={qEs.subjectId || undefined} onValueChange={(v) => updateQ(qEs.questionNumber, 'espanhol', 'subjectId', v)}>
                                <SelectTrigger className="h-8 w-full border-slate-200">
                                  <SelectValue placeholder={subjects.length === 0 ? "Carregando..." : "Disciplina..."}>
                                    {qEs.subjectId ? subjects.find(s => s.id === qEs.subjectId)?.name : null}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {subjects.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-4 py-2">
                              <Input 
                                placeholder="Tema de Espanhol..." 
                                className="h-8"
                                value={qEs.theme}
                                onChange={(e) => updateQ(qEs.questionNumber, 'espanhol', 'theme', e.target.value)}
                              />
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    }
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        )}
        
        <CardFooter className="flex justify-end pt-4 border-t">
          <Button onClick={handleSaveExam} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingExamId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />)}
            {editingExamId ? 'Atualizar Simulado e Matriz' : 'Salvar Simulado e Matriz'}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Simulados Cadastrados</CardTitle>
          <CardDescription>Gerencie e edite os simulados do sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Questões</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : exams.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum simulado cadastrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  exams.map((simulado) => (
                    <TableRow key={simulado.id}>
                      <TableCell className="font-medium">{simulado.title}</TableCell>
                      <TableCell>{new Date(simulado.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</TableCell>
                      <TableCell className="uppercase">{simulado.type.replace('_', ' ')}</TableCell>
                      <TableCell>{simulado.totalQuestions}</TableCell>
                      <TableCell>
                        {simulado.isPublished ? (
                          <Badge className="rounded-full bg-emerald-500 hover:bg-emerald-600">Publicado</Badge>
                        ) : (
                          <Badge variant="secondary" className="rounded-full">Oculto</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => loadExamForEdit(simulado)} className="text-slate-500 hover:text-primary">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(simulado.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
