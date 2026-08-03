'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Share2, Loader2, Users, CheckCircle2, Clock, RefreshCw, Layers, ArrowRight } from 'lucide-react';

interface ExamItem {
  id: string;
  title: string;
  stats: {
    pending: number;
    underCorrection: number;
    corrected: number;
  };
}

interface CorrectorItem {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface BatchItem {
  id: string;
  status: string;
  createdAt: string;
  exam: { id: string; title: string };
  corrector: { id: string; name: string; email: string };
  totalItems: number;
  completedItems: number;
}

export default function DistributionPage() {
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [correctors, setCorrectors] = useState<CorrectorItem[]>([]);
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [distributing, setDistributing] = useState(false);

  // Form State
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedCorrectorId, setSelectedCorrectorId] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('Todas as Matérias');
  const [availableSubjects, setAvailableSubjects] = useState<{ name: string; count: number }[]>([]);
  const [quantity, setQuantity] = useState<string>('20');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!selectedExamId) return;
    const fetchSubjects = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/discursive/submissions?examId=${selectedExamId}&status=PENDING_CORRECTION`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const subs = await res.json();
          const map: Record<string, number> = {};
          subs.forEach((s: any) => {
            const name = s.subjectName || 'Geral';
            map[name] = (map[name] || 0) + 1;
          });
          const list = Object.entries(map).map(([name, count]) => ({ name, count }));
          setAvailableSubjects(list);
          setSelectedSubject('Todas as Matérias');
        }
      } catch (err) {
        console.error('Erro ao carregar disciplinas do exame:', err);
      }
    };
    fetchSubjects();
  }, [selectedExamId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const [examsRes, correctorsRes, batchesRes] = await Promise.all([
        fetch('/api/discursive/exams', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/discursive/correctors', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/discursive/batches', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (examsRes.ok) {
        const examsData = await examsRes.json();
        setExams(examsData);
        if (examsData.length > 0 && !selectedExamId) {
          setSelectedExamId(examsData[0].id);
        }
      }

      if (correctorsRes.ok) {
        const correctorsData = await correctorsRes.json();
        setCorrectors(correctorsData);
        if (correctorsData.length > 0 && !selectedCorrectorId) {
          setSelectedCorrectorId(correctorsData[0].id);
        }
      }

      if (batchesRes.ok) {
        const batchesData = await batchesRes.json();
        setBatches(batchesData);
      }
    } catch (e) {
      console.error('Erro ao buscar dados para distribuição:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDistribute = async () => {
    if (!selectedExamId || !selectedCorrectorId || !quantity) return;

    setDistributing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/discursive/batches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          examId: selectedExamId,
          correctorId: selectedCorrectorId,
          quantity: parseInt(quantity, 10),
          subjectName: selectedSubject === 'Todas as Matérias' ? undefined : selectedSubject
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Lote criado com sucesso!');
        fetchData();
      } else {
        alert(data.error || 'Erro ao gerar lote.');
      }
    } catch (err) {
      console.error('Erro ao distribuir lote:', err);
      alert('Erro ao conectar com o servidor.');
    } finally {
      setDistributing(false);
    }
  };

  const currentExam = exams.find(e => e.id === selectedExamId);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel de Criação do Lote */}
        <Card className="lg:col-span-1 border-border shadow-md">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Share2 className="size-5 text-primary" />
              <span>Gerar Novo Lote</span>
            </CardTitle>
            <CardDescription>
              Selecione o simulado e atribua provas pendentes para a equipe.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                1. Simulado Discursivo
              </Label>
              <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                <SelectTrigger className="w-full h-10 truncate">
                  <SelectValue placeholder="Selecione o Simulado...">
                    {exams.find((ex) => ex.id === selectedExamId)?.title || "Selecione o Simulado..."}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {exams.map((ex) => (
                    <SelectItem key={ex.id} value={ex.id}>
                      {ex.title} ({ex.stats?.pending || 0} pendentes)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Seletor de Disciplina / Matéria */}
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                2. Disciplina / Matéria
              </Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="w-full h-10 truncate">
                  <SelectValue placeholder="Selecione a Matéria...">
                    {selectedSubject}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todas as Matérias">
                    Todas as Matérias ({currentExam?.stats?.pending || 0})
                  </SelectItem>
                  {availableSubjects.map((sub) => (
                    <SelectItem key={sub.name} value={sub.name}>
                      {sub.name} ({sub.count} pendentes)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Destaque de Provas Pendentes */}
            {currentExam && (
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary block">
                    Disponíveis ({selectedSubject})
                  </span>
                  <span className="text-2xl font-black text-foreground">
                    {selectedSubject === 'Todas as Matérias'
                      ? (currentExam.stats?.pending || 0)
                      : (availableSubjects.find((s) => s.name === selectedSubject)?.count || 0)}
                  </span>
                </div>
                <Badge variant="secondary" className="bg-primary/20 text-primary font-bold">
                  Aguardando Distribuição
                </Badge>
              </div>
            )}

            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                3. Corretor Responsável
              </Label>
              <Select value={selectedCorrectorId} onValueChange={setSelectedCorrectorId}>
                <SelectTrigger className="w-full h-10 truncate">
                  <SelectValue placeholder="Selecione o Professor/Corretor...">
                    {(() => {
                      const c = correctors.find((i) => i.id === selectedCorrectorId);
                      return c ? `${c.name} (${c.role})` : "Selecione o Professor/Corretor...";
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {correctors.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="qty" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                4. Quantidade de Provas no Pacote
              </Label>
              <Input
                id="qty"
                type="number"
                min={1}
                max={200}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Ex: 20"
                className="font-semibold"
              />
            </div>

            <Button
              className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20"
              onClick={handleDistribute}
              disabled={
                distributing ||
                !selectedExamId ||
                !selectedCorrectorId ||
                !quantity ||
                (selectedSubject === 'Todas as Matérias'
                  ? (currentExam?.stats?.pending === 0)
                  : (availableSubjects.find((s) => s.name === selectedSubject)?.count || 0) === 0)
              }
            >
              {distributing ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  <span>Gerando Lote...</span>
                </>
              ) : (
                <>
                  <Share2 className="size-4 mr-2" />
                  <span>Gerar & Distribuir Lote</span>
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Auditoria dos Lotes Criados */}
        <Card className="lg:col-span-2 border-border shadow-md flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-xl">Lotes de Correção Criados</CardTitle>
              <CardDescription>
                Acompanhe em tempo real o progresso da sua equipe em cada lote distribuído.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="gap-2 shrink-0"
            >
              <RefreshCw className="size-4" />
              <span>Atualizar</span>
            </Button>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center text-center">
                <Loader2 className="size-8 animate-spin text-primary mb-2" />
                <span className="text-sm text-muted-foreground">Carregando lotes...</span>
              </div>
            ) : batches.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center text-muted-foreground border border-dashed rounded-xl p-8">
                <Layers className="size-12 opacity-30 mb-2" />
                <p className="font-medium">Nenhum lote criado no momento</p>
                <p className="text-xs max-w-sm mt-1">
                  Use o painel lateral para criar o primeiro lote e atribuí-lo a um professor corretor.
                </p>
              </div>
            ) : (
              <div className="border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/60">
                      <TableHead>Corretor / Equipe</TableHead>
                      <TableHead>Simulado</TableHead>
                      <TableHead>Progresso</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data Criação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.map((batch) => {
                      const percentage = batch.totalItems > 0
                        ? Math.round((batch.completedItems / batch.totalItems) * 100)
                        : 0;
                      return (
                        <TableRow key={batch.id} className="hover:bg-muted/30">
                          <TableCell>
                            <div className="font-semibold text-foreground">{batch.corrector.name}</div>
                            <div className="text-xs text-muted-foreground">{batch.corrector.email}</div>
                          </TableCell>
                          <TableCell className="font-medium text-sm">{batch.exam.title}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-muted rounded-full h-2 overflow-hidden border">
                                <div
                                  className="bg-primary h-full transition-all duration-300"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-xs font-semibold">
                                {batch.completedItems}/{batch.totalItems} ({percentage}%)
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {batch.status === 'COMPLETED' ? (
                              <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                                <CheckCircle2 className="size-3 mr-1" /> Concluído
                              </Badge>
                            ) : (
                              <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30">
                                <Clock className="size-3 mr-1" /> Em Andamento
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(batch.createdAt).toLocaleDateString('pt-BR')}
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
    </div>
  );
}
