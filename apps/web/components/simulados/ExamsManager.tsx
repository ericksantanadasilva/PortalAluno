'use client';

import React, { useState, useEffect } from 'react';
import { useTenant } from '@/components/TenantProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Loader2, Edit2, X, Save, Calculator, UserX, BookOpen, CheckSquare } from 'lucide-react';
import { ThemeSelect, SubjectTreeItem } from './ThemeSelect';

const API_URL = "/api";

type Exam = {
  id: string;
  title: string;
  date: string;
  type: string;
  totalQuestions: number;
  isPublished: boolean;
  isEnemFull?: boolean;
  windowStart?: string;
  windowEnd?: string;
  windowStart2?: string;
  windowEnd2?: string;
};

type FormQuestion = {
  questionNumber: number;
  language: string; // 'none', 'ingles', 'espanhol'
  subjectId: string;
  theme: string;
  themeId?: string;
  subthemeId?: string;
};

export function ExamsManager({ onUpdate }: { onUpdate?: () => void, updateTrigger?: number }) {
  const tenantConfig = useTenant();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<{ id: string, name: string }[]>([]);
  const [themeTree, setThemeTree] = useState<SubjectTreeItem[]>([]);

  // State for Discursive Exams Multi-Subject Selection
  const [discursiveSubjectIds, setDiscursiveSubjectIds] = useState<string[]>([]);
  const [selectedDiscursiveTabSubjectId, setSelectedDiscursiveTabSubjectId] = useState<string>('');

  const [form, setForm] = useState({
    title: '',
    date: '',
    type: 'enem',
    totalQuestions: 0,
    isPublished: false,
    isEnemFull: false,
    windowStart: '',
    windowEnd: '',
    windowStart2: '',
    windowEnd2: '',
    questions: [] as FormQuestion[]
  });

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm' | 'prompt';
    title: string;
    description: string;
    inputValue?: string;
    inputPlaceholder?: string;
    onConfirm?: (value?: string) => void;
    onCancel?: () => void;
  }>({
    isOpen: false,
    type: 'alert',
    title: '',
    description: '',
  });

  const showAlert = (title: string, description: string) => {
    setModalState({ isOpen: true, type: 'alert', title, description });
  };

  const showConfirm = (title: string, description: string, onConfirm: () => void) => {
    setModalState({ isOpen: true, type: 'confirm', title, description, onConfirm });
  };

  const showPrompt = (title: string, description: string, inputPlaceholder: string, onConfirm: (val?: string) => void) => {
    setModalState({ isOpen: true, type: 'prompt', title, description, inputPlaceholder, inputValue: '', onConfirm });
  };

  const closeModal = () => setModalState(prev => ({ ...prev, isOpen: false }));

  useEffect(() => {
    fetchExams();
    fetchSubjects();
    fetchThemeTree();
  }, []);

  const fetchThemeTree = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/themes/tree`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setThemeTree(await res.json());
      }
    } catch (e) {
      console.error('Erro ao buscar árvore de temas', e);
    }
  };

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

  const handleCloseExam = (examId: string) => {
    showConfirm(
      "Processar Simulado",
      "Tem certeza que deseja processar as notas e fechar o simulado? Isso pode levar alguns segundos dependendo da quantidade de respostas.",
      async () => {
        try {
          setClosingId(examId);
          const token = localStorage.getItem('token');
          const res = await fetch(`${API_URL}/exams/close`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ examId })
          });
          const data = await res.json();
          if (res.ok) {
            showAlert("Sucesso", `Simulado processado com sucesso! ${data.count} notas calculadas e geradas.`);
          } else {
            showAlert("Erro", data.error || 'Erro ao processar e fechar simulado.');
          }
        } catch (e) {
          showAlert("Erro", 'Ocorreu um erro na requisição.');
        } finally {
          setClosingId(null);
        }
      }
    );
  };

  const handleResetStudent = (examId: string) => {
    showPrompt(
      "Liberar Repreenchimento",
      "Digite a MATRÍCULA do aluno para apagar a submissão dele e liberar o cartão novamente:",
      "Ex: 2023001",
      async (studentRegistration) => {
        if (!studentRegistration) return;

        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`${API_URL}/exams/admin/reset-session`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ examId, studentRegistration })
          });
          const data = await res.json();
          if (res.ok) {
            showAlert("Sucesso", data.message);
          } else {
            showAlert("Erro", data.error || 'Erro ao resetar submissão.');
          }
        } catch (e) {
          showAlert("Erro", 'Ocorreu um erro na requisição.');
        }
      }
    );
  };

  const handleTotalQuestionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const qtd = parseInt(e.target.value) || 0;

    let novasQuestoes = [...form.questions];
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

    const inglesSubject = subjects.find(s => s.name.toLowerCase().includes('inglês') || s.name.toLowerCase().includes('ingles'));
    const espanholSubject = subjects.find(s => s.name.toLowerCase().includes('espanhol'));

    setForm({
      ...form,
      questions: [
        ...semAQuestao,
        { questionNumber: numero, language: 'ingles', subjectId: inglesSubject?.id || '', theme: questaoAntiga?.theme || '', themeId: questaoAntiga?.themeId, subthemeId: questaoAntiga?.subthemeId },
        { questionNumber: numero, language: 'espanhol', subjectId: espanholSubject?.id || '', theme: questaoAntiga?.theme || '', themeId: questaoAntiga?.themeId, subthemeId: questaoAntiga?.subthemeId }
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
        { questionNumber: numero, language: 'none', subjectId: questaoAntiga?.subjectId || '', theme: questaoAntiga?.theme || '', themeId: questaoAntiga?.themeId, subthemeId: questaoAntiga?.subthemeId }
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

  const updateQFull = (numero: number, language: string, data: { theme: string; themeId?: string; subthemeId?: string }) => {
    setForm(prev => ({
      ...prev,
      questions: prev.questions.map(q => {
        if (q.questionNumber === numero && q.language === language) {
          return {
            ...q,
            theme: data.theme,
            themeId: data.themeId,
            subthemeId: data.subthemeId
          };
        }
        return q;
      })
    }));
  };

  const toLocalDatetime = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const loadExamForEdit = async (exam: Exam) => {
    setEditingExamId(exam.id);
    const dateStr = new Date(exam.date).toISOString().split('T')[0];

    setForm({
      title: exam.title,
      date: dateStr,
      type: exam.type,
      totalQuestions: exam.totalQuestions,
      isPublished: exam.isPublished,
      isEnemFull: exam.isEnemFull || false,
      windowStart: toLocalDatetime(exam.windowStart || ''),
      windowEnd: toLocalDatetime(exam.windowEnd || ''),
      windowStart2: exam.windowStart2 ? toLocalDatetime(exam.windowStart2) : '',
      windowEnd2: exam.windowEnd2 ? toLocalDatetime(exam.windowEnd2) : '',
      questions: []
    });

    if (exam.type === 'discursivo') {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/discursive/admin/exams`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const discExams = await res.json();
          const foundDisc = discExams.find((e: any) => e.title.toLowerCase() === exam.title.toLowerCase() || e.id === exam.id);
          if (foundDisc && foundDisc.subjects) {
            const mappedIds = foundDisc.subjects.map((sub: any) => {
              const matchedSubject = subjects.find(s => s.name.toUpperCase() === sub.subjectName.toUpperCase());
              return matchedSubject ? matchedSubject.id : sub.id;
            });
            setDiscursiveSubjectIds(mappedIds);
            if (mappedIds.length > 0) setSelectedDiscursiveTabSubjectId(mappedIds[0]);
          }
        }
      } catch (e) {
        console.error('Erro ao buscar dados discursivos:', e);
      }
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/exams/${exam.id}/questions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const questions = await res.json();
        const formattedQuestions: FormQuestion[] = questions.map((q: any) => ({
          questionNumber: q.questionNumber,
          language: q.language || 'none',
          subjectId: q.subjectId || '',
          theme: q.theme || '',
          themeId: q.themeId || undefined,
          subthemeId: q.subthemeId || undefined
        }));

        const maxQ = formattedQuestions.length > 0 ? Math.max(...formattedQuestions.map(q => q.questionNumber)) : 0;
        if (maxQ < exam.totalQuestions) {
          for (let i = maxQ + 1; i <= exam.totalQuestions; i++) {
            formattedQuestions.push({ questionNumber: i, language: 'none', subjectId: '', theme: '' });
          }
        }

        setForm(prev => ({ ...prev, questions: formattedQuestions.sort((a, b) => a.questionNumber - b.questionNumber) }));
      }
    } catch (e) {
      console.error('Erro ao buscar questões do simulado', e);
    }
  };

  const cancelEdit = () => {
    setEditingExamId(null);
    setDiscursiveSubjectIds([]);
    setForm({ title: '', date: '', type: 'enem', totalQuestions: 60, isPublished: false, isEnemFull: false, windowStart: '', windowEnd: '', windowStart2: '', windowEnd2: '', questions: [] });
  };

  const handleSaveExam = async () => {
    if (!form.title || !form.date) {
      showAlert("Atenção", 'Preencha título e data.');
      return;
    }

    if (form.type === 'discursivo' && discursiveSubjectIds.length === 0) {
      showAlert("Atenção", 'Selecione ao menos uma matéria da lista para o simulado discursivo.');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      let targetExamId = editingExamId;

      const selectedSubjectNames = form.type === 'discursivo'
        ? discursiveSubjectIds.map(id => subjects.find(s => s.id === id)?.name || id)
        : [];

      const bodyData = {
        title: form.title,
        date: form.date,
        totalQuestions: form.totalQuestions,
        type: form.type,
        isPublished: form.isPublished,
        isEnemFull: form.isEnemFull,
        discursiveSubjects: selectedSubjectNames,
        windowStart: form.windowStart ? new Date(form.windowStart).toISOString() : undefined,
        windowEnd: form.windowEnd ? new Date(form.windowEnd).toISOString() : undefined,
        windowStart2: form.isEnemFull && form.windowStart2 ? new Date(form.windowStart2).toISOString() : null,
        windowEnd2: form.isEnemFull && form.windowEnd2 ? new Date(form.windowEnd2).toISOString() : null
      };

      if (editingExamId) {
        const resExam = await fetch(`${API_URL}/exams/${editingExamId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(bodyData)
        });
        if (!resExam.ok) throw new Error('Erro ao atualizar simulado');
      } else {
        const resExam = await fetch(`${API_URL}/exams`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(bodyData)
        });
        if (!resExam.ok) throw new Error('Erro ao criar simulado');
        const newExam = await resExam.json();
        targetExamId = newExam.id;
      }

      if (form.type === 'discursivo') {
        const selectedSubjectNames = discursiveSubjectIds.map(id => subjects.find(s => s.id === id)?.name || id);

        await fetch(`${API_URL}/discursive/admin/exams`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            title: form.title,
            subjects: selectedSubjectNames,
            windowStart: form.windowStart ? new Date(form.windowStart).toISOString() : null,
            windowEnd: form.windowEnd ? new Date(form.windowEnd).toISOString() : null
          })
        }).catch((e) => console.error("Erro ao sincronizar EssayExam:", e));
      }

      if (form.questions.length > 0 && targetExamId) {
        const payload = form.questions.map(q => ({
          questionNumber: q.questionNumber,
          subjectId: q.subjectId || undefined,
          theme: q.theme || '',
          themeId: q.themeId,
          subthemeId: q.subthemeId,
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

      showAlert("Sucesso", editingExamId ? 'Simulado atualizado com sucesso!' : 'Simulado criado com sucesso!');
      if (onUpdate) onUpdate();
      cancelEdit();
      fetchExams();
    } catch (error) {
      console.error(error);
      showAlert("Erro", 'Ocorreu um erro interno ao salvar o simulado.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    showConfirm(
      "Excluir Simulado",
      "Deseja realmente excluir este simulado? Esta ação não pode ser desfeita e removerá todas as notas associadas.",
      async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`${API_URL}/exams/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            setExams(exams.filter(e => e.id !== id));
            showAlert("Sucesso", "Simulado removido com sucesso.");
          } else {
            showAlert("Erro", "Falha ao remover simulado.");
          }
        } catch (error) {
          console.error('Erro ao excluir', error);
          showAlert("Erro", "Erro ao comunicar com o servidor.");
        }
      }
    );
  };

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
            <div className="flex gap-6">
              {form.type === 'enem' && (
                <div className="flex items-center gap-3">
                  <Label htmlFor="enemFull">ENEM 2 Dias (180Q)</Label>
                  <label htmlFor="enemFull" className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      id="enemFull"
                      className="sr-only peer"
                      checked={form.isEnemFull}
                      onChange={(e) => setForm({ ...form, isEnemFull: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              )}
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
                onValueChange={(val: string) => {
                  setForm({
                    ...form,
                    type: val,
                    isEnemFull: val === 'enem' ? form.isEnemFull : false
                  });
                }}
              >
                <SelectTrigger className="w-full min-w-[180px]">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {[{ value: "enem", label: "ENEM", key: "ENEM" },
                  { value: "enem_parcial", label: "ENEM Parcial", key: "ENEM_PARCIAL" },
                  { value: "uerj", label: "UERJ", key: "UERJ" },
                  { value: "discursivo", label: "Discursivo", key: "DISCURSIVO" }
                  ].filter(opt => (tenantConfig?.allowedReportTemplates || ["ENEM", "UERJ", "ENEM_PARCIAL", "DISCURSIVO"]).includes(opt.key))
                    .map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="windowStart">Início do Prazo de Resposta</Label>
              <Input
                id="windowStart"
                type="datetime-local"
                value={form.windowStart}
                onChange={(e) => setForm({ ...form, windowStart: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="windowEnd">Fim do Prazo de Resposta (Dia 1)</Label>
              <Input
                id="windowEnd"
                type="datetime-local"
                value={form.windowEnd}
                onChange={(e) => setForm({ ...form, windowEnd: e.target.value })}
              />
            </div>

            {form.isEnemFull && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="windowStart2">Início do Prazo de Resposta (Dia 2)</Label>
                  <Input
                    id="windowStart2"
                    type="datetime-local"
                    value={form.windowStart2}
                    onChange={(e) => setForm({ ...form, windowStart2: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="windowEnd2">Fim do Prazo de Resposta (Dia 2)</Label>
                  <Input
                    id="windowEnd2"
                    type="datetime-local"
                    value={form.windowEnd2}
                    onChange={(e) => setForm({ ...form, windowEnd2: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>
              {form.type === 'discursivo' ? 'Classificação de Questões e Temas por Matéria' : 'Matriz de Questões'}
            </CardTitle>
            <CardDescription>
              {form.type === 'discursivo'
                ? 'Selecione abaixo as matérias do simulado discursivo e defina o tema pedagógico de cada questão por matéria.'
                : 'Defina o tema e a disciplina de cada questão. Transforme em "Idiomas" para duplicar a questão.'}
            </CardDescription>
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

        <CardContent className="space-y-6">
          {form.type === 'discursivo' && (
            <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 space-y-3 mb-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <Label className="text-foreground font-bold text-base">
                    1. Selecione as Matérias Integrantes do Simulado Discursivo
                  </Label>
                </div>
                <Badge variant="secondary" className="bg-primary/10 text-primary font-bold text-xs px-3 py-1">
                  {discursiveSubjectIds.length} matéria(s) selecionada(s)
                </Badge>
              </div>
              <p className="text-xs text-slate-600">
                Marque abaixo as matérias que farão parte desta prova discursiva. Na área do aluno, um botão de upload de PDF será exibido para cada matéria marcada.
              </p>

              {subjects.length === 0 ? (
                <div className="text-xs text-amber-700 bg-amber-50 p-3 rounded-md border border-amber-200">
                  Nenhuma disciplina cadastrada na unidade. Cadastre em "Disciplinas" primeiro.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-1">
                  {subjects.map((sub) => {
                    const isChecked = discursiveSubjectIds.includes(sub.id);
                    return (
                      <label
                        key={sub.id}
                        className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${isChecked
                          ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-primary hover:bg-primary/5'
                          }`}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setDiscursiveSubjectIds(prev => [...prev, sub.id]);
                              if (!selectedDiscursiveTabSubjectId) setSelectedDiscursiveTabSubjectId(sub.id);
                            } else {
                              setDiscursiveSubjectIds(prev => prev.filter(id => id !== sub.id));
                            }
                          }}
                          className={isChecked ? 'border-white text-primary bg-white' : ''}
                        />
                        <span className="truncate">{sub.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {form.questions.length > 0 && (
            <div className="w-full">
              {form.type === 'discursivo' ? (
                discursiveSubjectIds.length > 0 ? (
                  <div className="w-full space-y-4 pt-2">
                    <div>
                      <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                        2. Selecione a Matéria para Preencher os Temas das Questões:
                      </Label>

                      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
                        {discursiveSubjectIds.map(subId => {
                          const subName = subjects.find(s => s.id === subId)?.name || subId;
                          const isActive = (selectedDiscursiveTabSubjectId || discursiveSubjectIds[0]) === subId;
                          return (
                            <button
                              key={subId}
                              type="button"
                              onClick={() => setSelectedDiscursiveTabSubjectId(subId)}
                              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${isActive
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
                                }`}
                            >
                              {subName}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {(() => {
                      const activeSubId = selectedDiscursiveTabSubjectId || discursiveSubjectIds[0];
                      const activeSubName = subjects.find(s => s.id === activeSubId)?.name || activeSubId;
                      return (
                        <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white w-full">
                          <div className="bg-primary/10 px-4 py-2.5 border-b border-primary/20 flex items-center justify-between">
                            <span className="font-bold text-foreground text-xs uppercase tracking-wide">
                              Matriz de Conteúdos: {activeSubName}
                            </span>
                          </div>
                          <div className="max-h-[450px] overflow-y-auto">
                            <table className="w-full text-sm text-left">
                              <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm border-b">
                                <tr>
                                  <th className="px-4 py-3 w-16 text-center font-bold">Nº</th>
                                  <th className="px-4 py-3 font-bold">Conteúdo / Tema Pedagógico ({activeSubName})</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {groupedKeys.map((num) => {
                                  const q = groupedQuestions[num]?.[0];
                                  if (!q) return null;
                                  return (
                                    <tr key={`${activeSubId}-q-${num}`} className="hover:bg-primary/5 transition-colors">
                                      <td className="px-4 py-2 text-center font-bold text-primary bg-slate-50/50">{num}</td>
                                      <td className="px-4 py-2">
                                        <ThemeSelect
                                          subjectId={activeSubId}
                                          themeTree={themeTree}
                                          value={q.theme}
                                          themeId={q.themeId}
                                          subthemeId={q.subthemeId}
                                          placeholder={`Tema para questão ${num}...`}
                                          onChange={(data) => updateQFull(num, 'none', data)}
                                        />
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="text-center py-6 border border-dashed rounded-lg text-slate-500 text-sm bg-slate-50">
                    Selecione ao menos uma matéria na lista acima para exibir a matriz de questões.
                  </div>
                )
              ) : (
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
                                <ThemeSelect
                                  subjectId={q.subjectId}
                                  themeTree={themeTree}
                                  value={q.theme}
                                  themeId={q.themeId}
                                  subthemeId={q.subthemeId}
                                  placeholder="Busque ou digite o tema..."
                                  onChange={(data) => updateQFull(q.questionNumber, 'none', data)}
                                />
                              </td>
                            </tr>
                          );
                        } else {
                          const qEn = qs.find(q => q.language === 'ingles');
                          const qEs = qs.find(q => q.language === 'espanhol');
                          if (!qEn || !qEs) return null;

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
                                  <Select value={qEn.subjectId || undefined} onValueChange={(v) => updateQ(qEn.questionNumber, 'ingles', 'subjectId', v || '')}>
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
                                  <ThemeSelect
                                    subjectId={qEn.subjectId}
                                    themeTree={themeTree}
                                    value={qEn.theme}
                                    themeId={qEn.themeId}
                                    subthemeId={qEn.subthemeId}
                                    placeholder="Tema de Inglês..."
                                    onChange={(data) => updateQFull(qEn.questionNumber, 'ingles', data)}
                                  />
                                </td>
                              </tr>
                              <tr className="border-b last:border-0 bg-slate-50/50">
                                <td className="px-4 py-2 flex items-center gap-2">
                                  <Badge variant="outline" className="w-20 justify-center">Espanhol</Badge>
                                  <Select value={qEs.subjectId || undefined} onValueChange={(v) => updateQ(qEs.questionNumber, 'espanhol', 'subjectId', v || '')}>
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
                                  <ThemeSelect
                                    subjectId={qEs.subjectId}
                                    themeTree={themeTree}
                                    value={qEs.theme}
                                    themeId={qEs.themeId}
                                    subthemeId={qEs.subthemeId}
                                    placeholder="Tema de Espanhol..."
                                    onChange={(data) => updateQFull(qEs.questionNumber, 'espanhol', data)}
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
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-end pt-4 border-t">
          <Button onClick={handleSaveExam} disabled={saving} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
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
                      <TableCell className="uppercase">
                        <Badge variant="outline" className={simulado.type === 'discursivo' ? 'bg-primary/10 text-primary border-primary/20 rounded-full' : 'rounded-full'}>
                          {simulado.type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>{simulado.totalQuestions}</TableCell>
                      <TableCell>
                        {simulado.isPublished ? (
                          <Badge className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground">Publicado</Badge>
                        ) : (
                          <Badge variant="secondary" className="rounded-full">Oculto</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-orange-500 hover:bg-orange-50 hover:text-orange-600"
                            onClick={() => handleResetStudent(simulado.id)}
                            title="Liberar Repreenchimento para Aluno"
                          >
                            <UserX className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-primary hover:bg-primary/10 hover:text-primary"
                            onClick={() => handleCloseExam(simulado.id)}
                            disabled={closingId === simulado.id}
                            title="Processar Notas / Fechar Simulado"
                          >
                            {closingId === simulado.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
                          </Button>
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

      <Dialog open={modalState.isOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{modalState.title}</DialogTitle>
            <DialogDescription className="text-slate-600 mt-2 leading-relaxed">
              {modalState.description}
            </DialogDescription>
          </DialogHeader>
          {modalState.type === 'prompt' && (
            <div className="py-4">
              <Input
                placeholder={modalState.inputPlaceholder}
                value={modalState.inputValue || ''}
                onChange={(e) => setModalState(prev => ({ ...prev, inputValue: e.target.value }))}
                className="text-base"
                autoFocus
              />
            </div>
          )}
          <DialogFooter className="mt-4 gap-2 sm:justify-end">
            {modalState.type !== 'alert' && (
              <Button variant="outline" onClick={closeModal} className="font-semibold">
                Cancelar
              </Button>
            )}
            <Button
              variant={modalState.type === 'confirm' ? "destructive" : "default"}
              onClick={() => {
                closeModal();
                if (modalState.onConfirm) modalState.onConfirm(modalState.inputValue);
              }}
              className="font-semibold"
            >
              {modalState.type === 'alert' ? 'OK' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
