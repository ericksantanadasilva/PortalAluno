'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Share2, Loader2, Users, CheckCircle2, Clock, RefreshCw, Layers, ArrowRight, ArrowRightLeft, Search, Filter, CheckSquare, Sparkles, AlertCircle } from 'lucide-react';

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

  // Granular Reassignment State
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [reassignSubmissions, setReassignSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [selectedSubIds, setSelectedSubIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState('Todas as Matérias');
  const [filterStatus, setFilterStatus] = useState('all');
  const [targetMode, setTargetMode] = useState<'corrector' | 'queue'>('corrector');
  const [selectedTargetCorrectors, setSelectedTargetCorrectors] = useState<string[]>([]);
  const [submittingReassign, setSubmittingReassign] = useState(false);
  const [modalExamId, setModalExamId] = useState<string>('');

  const openGranularModal = async (examId?: string, filterByCorrectorId?: string) => {
    const targetExamId = examId || selectedExamId || (exams[0]?.id || '');
    if (!targetExamId) {
      alert('Nenhum simulado disponível para inspecionar.');
      return;
    }
    setModalExamId(targetExamId);
    setIsReassignOpen(true);
    setSelectedSubIds([]);
    setSearchQuery('');
    setFilterSubject('Todas as Matérias');
    setFilterStatus('all');
    setSelectedTargetCorrectors([]);
    setTargetMode('corrector');
    await loadSubmissionsForExam(targetExamId, filterByCorrectorId);
  };

  const loadSubmissionsForExam = async (examId: string, correctorId?: string) => {
    setLoadingSubmissions(true);
    try {
      const token = localStorage.getItem('token');
      let url = `/api/discursive/admin/submissions-by-exam?examId=${examId}&status=all`;
      if (correctorId) {
        url += `&correctorId=${correctorId}`;
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReassignSubmissions(data);
      } else {
        setReassignSubmissions([]);
      }
    } catch (err) {
      console.error('Erro ao buscar submissões para reatribuição:', err);
      setReassignSubmissions([]);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const filteredSubmissions = reassignSubmissions.filter(s => {
    const matchSearch =
      s.student?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student?.registrationNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.subjectName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchSubject =
      filterSubject === 'Todas as Matérias' || s.subjectName === filterSubject;
    const matchStatus =
      filterStatus === 'all' || s.status === filterStatus;
    return matchSearch && matchSubject && matchStatus;
  });

  const isAllSelected = filteredSubmissions.length > 0 && filteredSubmissions.filter(s => s.status !== 'CORRECTED').every(s => selectedSubIds.includes(s.id));
  const toggleSelectAll = () => {
    if (isAllSelected) {
      const remaining = selectedSubIds.filter(id => !filteredSubmissions.some(s => s.id === id));
      setSelectedSubIds(remaining);
    } else {
      const allIds = new Set([...selectedSubIds, ...filteredSubmissions.filter(s => s.status !== 'CORRECTED').map(s => s.id)]);
      setSelectedSubIds(Array.from(allIds));
    }
  };

  const toggleCorrectorSelection = (id: string) => {
    setSelectedTargetCorrectors(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const getDistributionPreview = () => {
    const selectedCount = selectedSubIds.length;
    const correctorCount = selectedTargetCorrectors.length;
    if (selectedCount === 0 || correctorCount === 0) return [];
    const base = Math.floor(selectedCount / correctorCount);
    const rem = selectedCount % correctorCount;
    return selectedTargetCorrectors.map((id, idx) => {
      const corr = correctors.find(c => c.id === id);
      const count = base + (idx < rem ? 1 : 0);
      return { name: corr?.name || 'Corretor', count };
    });
  };

  const handleExecuteReassign = async () => {
    if (selectedSubIds.length === 0) {
      alert('Selecione pelo menos uma prova na lista.');
      return;
    }
    if (targetMode === 'corrector' && selectedTargetCorrectors.length === 0) {
      alert('Selecione ao menos 1 corretor de destino ou escolha devolver para a fila.');
      return;
    }

    setSubmittingReassign(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/discursive/admin/reassign-submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          examId: modalExamId,
          submissionIds: selectedSubIds,
          targetCorrectorIds: targetMode === 'corrector' ? selectedTargetCorrectors : [],
          returnToQueue: targetMode === 'queue'
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Reatribuição realizada com sucesso!');
        setIsReassignOpen(false);
        fetchData();
      } else {
        alert(data.error || 'Erro ao reatribuir provas.');
      }
    } catch (err) {
      console.error('Erro na reatribuição granular:', err);
      alert('Erro de conexão ao reatribuir provas.');
    } finally {
      setSubmittingReassign(false);
    }
  };

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
        <Card className="lg:col-span-1 border border-border/80 shadow-xl rounded-3xl bg-card overflow-hidden">
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
                <SelectTrigger className="w-full h-11 truncate rounded-xl border-border/80 shadow-sm">
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
                <SelectTrigger className="w-full h-11 truncate rounded-xl border-border/80 shadow-sm">
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
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between">
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
                <Badge variant="secondary" className="bg-primary/20 text-primary font-bold rounded px-3 py-1 text-xs">
                  Aguardando Distribuição
                </Badge>
              </div>
            )}

            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                3. Corretor Responsável
              </Label>
              <Select value={selectedCorrectorId} onValueChange={setSelectedCorrectorId}>
                <SelectTrigger className="w-full h-11 truncate rounded-xl border-border/80 shadow-sm">
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
                className="font-semibold h-11 rounded-xl border-border/80 shadow-sm"
              />
            </div>

            <Button
              className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/25 rounded-2xl"
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
        <Card className="lg:col-span-2 border border-border/80 shadow-xl rounded-3xl bg-card flex flex-col overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-xl">Lotes de Correção Criados</CardTitle>
              <CardDescription>
                Acompanhe em tempo real o progresso da sua equipe em cada lote distribuído.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => openGranularModal()}
                className="gap-2 shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md font-semibold px-4 h-10"
              >
                <Users className="size-4" />
                <span>Reatribuição Granular</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                disabled={loading}
                className="gap-2 shrink-0 rounded-xl border-border/80 shadow-sm font-semibold px-4 h-10"
              >
                <RefreshCw className="size-4" />
                <span>Atualizar</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center text-center">
                <Loader2 className="size-8 animate-spin text-primary mb-2" />
                <span className="text-sm text-muted-foreground">Carregando lotes...</span>
              </div>
            ) : batches.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center text-muted-foreground border border-dashed rounded-2xl p-8">
                <Layers className="size-12 opacity-30 mb-2" />
                <p className="font-medium">Nenhum lote criado no momento</p>
                <p className="text-xs max-w-sm mt-1">
                  Use o painel lateral para criar o primeiro lote e atribuí-lo a um professor corretor.
                </p>
              </div>
            ) : (
              <div className="border border-border/80 rounded-2xl overflow-hidden shadow-sm">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="bg-muted/60">
                      <TableHead className="w-[28%]">Corretor / Equipe</TableHead>
                      <TableHead className="w-[24%]">Simulado</TableHead>
                      <TableHead className="w-[18%]">Progresso</TableHead>
                      <TableHead className="w-[15%]">Status</TableHead>
                      <TableHead className="w-[15%]">Data Criação</TableHead>
                      <TableHead className="w-10 text-center">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.map((batch) => {
                      const percentage = batch.totalItems > 0
                        ? Math.round((batch.completedItems / batch.totalItems) * 100)
                        : 0;
                      return (
                        <TableRow key={batch.id} className="hover:bg-muted/30">
                          <TableCell className="max-w-[180px]">
                            <div className="font-semibold text-foreground truncate" title={batch.corrector.name}>
                              {batch.corrector.name}
                            </div>
                            <div className="text-xs text-muted-foreground truncate" title={batch.corrector.email}>
                              {batch.corrector.email}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[160px]">
                            <div className="font-medium text-sm truncate" title={batch.exam.title}>
                              {batch.exam.title}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-14 sm:w-20 bg-muted rounded h-2 overflow-hidden border shrink-0">
                                <div
                                  className="bg-primary h-full transition-all duration-300 rounded"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-xs font-semibold whitespace-nowrap">
                                {batch.completedItems}/{batch.totalItems} ({percentage}%)
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {batch.status === 'COMPLETED' ? (
                              <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 rounded px-3 py-1 text-xs font-semibold">
                                <CheckCircle2 className="size-3 mr-1" /> Concluído
                              </Badge>
                            ) : (
                              <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30 rounded px-3 py-1 text-xs font-semibold">
                                <Clock className="size-3 mr-1" /> Em Andamento
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(batch.createdAt).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Inspecionar e Reatribuir Provas deste Lote"
                              onClick={() => openGranularModal(batch.exam.id, batch.corrector.id)}
                              className="h-9 w-9 p-0 text-muted-foreground hover:text-primary hover:bg-primary/15 rounded transition-all"
                            >
                              <ArrowRightLeft className="size-4" />
                            </Button>
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

      {/* Modal de Reatribuição Granular (1 ou Múltiplos Corretores) */}
      <Dialog open={isReassignOpen} onOpenChange={setIsReassignOpen}>
        <DialogContent className="sm:max-w-4xl md:max-w-5xl lg:max-w-6xl !max-w-[1050px] w-[96vw] max-h-[92vh] flex flex-col p-6 sm:p-8 !rounded-3xl border border-border/80 bg-card shadow-2xl overflow-hidden">
          <DialogHeader className="pb-3 border-b border-border/80 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="size-5" />
                <DialogTitle className="text-xl font-bold">
                  Reatribuição Granular de Provas
                </DialogTitle>
              </div>
              {selectedSubIds.length > 0 && (
                <Badge variant="secondary" className="bg-primary/15 text-primary font-bold rounded px-3 py-1">
                  {selectedSubIds.length} prova(s) selecionada(s)
                </Badge>
              )}
            </div>
            <DialogDescription className="text-sm text-muted-foreground">
              Selecione arquivos específicos e escolha 1 ou vários corretores para reatribuição equilibrada.
            </DialogDescription>
          </DialogHeader>

          {/* Área Principal em 2 Blocos: Lista de Provas no Topo e Destino Embaixo */}
          <div className="flex-1 overflow-y-auto space-y-5 py-3 pr-1">
            {/* 1. Filtros e Lista de Submissões */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 w-full">
                <div className="relative sm:col-span-6">
                  <Search className="size-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    placeholder="Buscar aluno, matrícula ou matéria..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10 text-sm rounded-xl border-border/80 shadow-sm"
                  />
                </div>
                <div className="sm:col-span-3">
                  <Select value={filterSubject} onValueChange={setFilterSubject}>
                    <SelectTrigger className="w-full h-10 text-sm rounded-xl border-border/80 shadow-sm">
                      <SelectValue placeholder="Disciplina" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Todas as Matérias">Todas Disciplinas</SelectItem>
                      <SelectItem value="BIOLOGIA">Biologia</SelectItem>
                      <SelectItem value="QUIMICA">Química</SelectItem>
                      <SelectItem value="REDACAO">Redação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-3">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full h-10 text-sm rounded-xl border-border/80 shadow-sm">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="PENDING_CORRECTION">Pendente</SelectItem>
                      <SelectItem value="UNDER_CORRECTION">Em Correção</SelectItem>
                      <SelectItem value="CORRECTED">Corrigida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tabela de Submissões */}
              <div className="border border-border/80 rounded-2xl overflow-x-auto bg-muted/10 max-h-[280px] shadow-inner">
                {loadingSubmissions ? (
                  <div className="h-44 flex flex-col items-center justify-center text-center">
                    <Loader2 className="size-6 animate-spin text-primary mb-2" />
                    <span className="text-xs text-muted-foreground font-medium">Carregando provas disponíveis...</span>
                  </div>
                ) : filteredSubmissions.length === 0 ? (
                  <div className="h-44 flex flex-col items-center justify-center text-center text-muted-foreground p-4">
                    <AlertCircle className="size-8 opacity-40 mb-2" />
                    <p className="text-sm font-medium">Nenhuma prova encontrada com os filtros atuais</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/60 text-xs">
                        <TableHead className="w-10 text-center">
                          <Checkbox
                            checked={isAllSelected}
                            onCheckedChange={toggleSelectAll}
                            title="Selecionar todas as pendentes"
                          />
                        </TableHead>
                        <TableHead>Aluno / Matrícula</TableHead>
                        <TableHead>Disciplina</TableHead>
                        <TableHead>Status / Corretor Atual</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubmissions.map((sub) => {
                        const isCorrected = sub.status === 'CORRECTED';
                        const isChecked = selectedSubIds.includes(sub.id);
                        const currentCorrName = sub.batchItem?.batch?.corrector?.name || 'Fila Pendente';
                        return (
                          <TableRow
                            key={sub.id}
                            className={`hover:bg-muted/40 text-xs transition-colors ${isCorrected ? 'opacity-50' : 'cursor-pointer'}`}
                            onClick={() => {
                              if (isCorrected) return;
                              setSelectedSubIds(prev =>
                                prev.includes(sub.id) ? prev.filter(i => i !== sub.id) : [...prev, sub.id]
                              );
                            }}
                          >
                            <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={isChecked}
                                disabled={isCorrected}
                                onCheckedChange={() => {
                                  if (isCorrected) return;
                                  setSelectedSubIds(prev =>
                                    prev.includes(sub.id) ? prev.filter(i => i !== sub.id) : [...prev, sub.id]
                                  );
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="font-semibold text-foreground">{sub.student?.name || 'ALUNO'}</div>
                              <div className="text-[10px] text-muted-foreground">Matrícula: {sub.student?.registrationNumber || '-'}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[11px] rounded px-2.5 py-0.5">
                                {sub.subjectName || 'Geral'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {sub.status === 'CORRECTED' ? (
                                  <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold rounded px-2.5 py-0.5">
                                    Corrigida
                                  </Badge>
                                ) : sub.status === 'UNDER_CORRECTION' ? (
                                  <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30 text-[11px] font-semibold rounded px-2.5 py-0.5">
                                    {currentCorrName}
                                  </Badge>
                                ) : (
                                  <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[11px] font-semibold rounded px-2.5 py-0.5">
                                    Pendente
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>

            {/* 2. Destino da Reatribuição */}
            <div className="border border-border/80 rounded-3xl p-5 bg-muted/10 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
                <Label className="text-sm font-bold text-foreground">
                  Selecione o Destino (1 ou vários Corretores):
                </Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant={targetMode === 'corrector' ? 'default' : 'outline'}
                    size="sm"
                    className={`h-9 px-4 text-xs font-semibold rounded-xl transition-all ${targetMode === 'corrector'
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'hover:bg-muted border-border/80'
                      }`}
                    onClick={() => setTargetMode('corrector')}
                  >
                    <Users className="size-3.5 mr-1.5" />
                    Atribuir a Corretor(es)
                  </Button>
                  <Button
                    type="button"
                    variant={targetMode === 'queue' ? 'default' : 'outline'}
                    size="sm"
                    className={`h-9 px-4 text-xs font-semibold rounded-xl transition-all ${targetMode === 'queue'
                      ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-md'
                      : 'hover:bg-muted border-border/80'
                      }`}
                    onClick={() => setTargetMode('queue')}
                  >
                    <AlertCircle className="size-3.5 mr-1.5" />
                    Devolver para Fila de Pendentes
                  </Button>
                </div>
              </div>

              {targetMode === 'corrector' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-44 overflow-y-auto pr-1">
                    {correctors.map((corr) => {
                      const isSelected = selectedTargetCorrectors.includes(corr.id);
                      return (
                        <div
                          key={corr.id}
                          onClick={() => toggleCorrectorSelection(corr.id)}
                          className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${isSelected
                            ? 'border-primary bg-primary/10 shadow-md ring-1 ring-primary/40'
                            : 'border-border/80 bg-card hover:bg-muted/40 shadow-sm'
                            }`}
                        >
                          <Checkbox checked={isSelected} onCheckedChange={() => toggleCorrectorSelection(corr.id)} />
                          <div className="overflow-hidden">
                            <div className="text-xs font-bold text-foreground truncate">{corr.name}</div>
                            <div className="text-[10px] text-muted-foreground truncate">{corr.email}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Real-time WOW Preview */}
                  {selectedSubIds.length > 0 && selectedTargetCorrectors.length > 0 && (
                    <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col gap-2.5 shadow-sm">
                      <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                        <Sparkles className="size-4" />
                        <span>
                          {selectedTargetCorrectors.length === 1
                            ? `${selectedSubIds.length} prova(s) serão atribuídas para ${getDistributionPreview()[0]?.name}.`
                            : `${selectedSubIds.length} prova(s) serão distribuídas uniformemente entre ${selectedTargetCorrectors.length} corretores:`}
                        </span>
                      </div>
                      {selectedTargetCorrectors.length > 1 && (
                        <div className="flex flex-wrap gap-2">
                          {getDistributionPreview().map((item, idx) => (
                            <Badge key={idx} variant="outline" className="bg-background/90 text-xs font-bold px-3 py-1 rounded shadow-xs border-indigo-500/30">
                              {item.name}: {item.count} prova(s)
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs font-medium text-amber-700 dark:text-amber-300 flex items-center gap-2.5 shadow-sm">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>
                    As {selectedSubIds.length} prova(s) selecionada(s) retornarão para o status PENDENTE e ficarão livres para uma nova rodada de distribuição.
                  </span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="border-t border-border/80 pt-4 mt-1 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-muted-foreground font-medium">
              {selectedSubIds.length} prova(s) selecionada(s) •{' '}
              {targetMode === 'corrector'
                ? `${selectedTargetCorrectors.length} corretor(es) de destino`
                : 'Devolver à fila'}
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsReassignOpen(false)}
                disabled={submittingReassign}
                className="rounded-xl h-10 px-5 font-semibold border-border/80"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleExecuteReassign}
                disabled={submittingReassign || selectedSubIds.length === 0}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 rounded-xl h-10 px-5 font-semibold shadow-md"
              >
                {submittingReassign ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Reatribuindo...</span>
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="size-4" />
                    <span>Confirmar Reatribuição</span>
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
