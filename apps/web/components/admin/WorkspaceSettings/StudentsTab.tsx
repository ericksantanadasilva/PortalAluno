'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Download, UploadCloud, Plus, FileSpreadsheet, Search, X } from 'lucide-react';
import { AlunoForm } from '../types/workspace-settings.types';

// URL base do seu servidor Express no Monorepo
const API_URL = "http://localhost:3001/api";

interface Modality {
  id: string;
  name: string;
}

interface Class {
  id: string;
  name: string;
  modalityId: string;
  modality?: Modality;
}

interface Student {
  id: string;
  name: string;
  registration: string;
  email: string;
  classId: string;
  class?: {
    name: string;
    modality?: {
      name: string;
    }
  }
}

export function StudentsTab() {
  const [dragActive, setDragActive] = useState(false);
  const [csvPreview, setCsvPreview] = useState<{ nome: string; email: string; turma: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados dinâmicos do Banco de Dados
  const [alunosList, setAlunosList] = useState<Student[]>([]);
  const [modalidades, setModalidades] = useState<Modality[]>([]);
  const [turmas, setTurmas] = useState<Class[]>([]);

  // Filtros da Tabela
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroTurma, setFiltroTurma] = useState('todas');
  const [filtroModalidade, setFiltroModalidade] = useState('todas');

  // Estados de Criação
  const [novaModalidade, setNovaModalidade] = useState('');
  const [novaTurma, setNovaTurma] = useState('');
  const [modalidadeSelecionadaParaTurma, setModalidadeSelecionadaParaTurma] = useState<string>('');

  // Form State para Cadastro Individual
  const [alunoForm, setAlunoForm] = useState<Partial<AlunoForm>>({
    nome: '',
    email: '',
    turma: '',
    modalidade: '',
    matricula: '',
  });

  const [range, setRange] = useState({ min: 1000, max: 9999 });

  // Helper para centralizar os headers padrão de autenticação do seu sistema
  const getHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  // 1. CARGA INICIAL DOS ENDPOINTS REALIZADA COM FETCH NATIVO
  const carregarDadosDoPainel = async () => {
    setLoading(true);
    try {
      const headers = getHeaders();

      const [resModalidades, resTurmas, resAlunos] = await Promise.all([
        fetch(`${API_URL}/modalities`, { headers }),
        fetch(`${API_URL}/classes`, { headers }),
        fetch(`${API_URL}/students`, { headers }).catch(() => null) // Fallback caso a rota de alunos ainda não exista
      ]);

      if (resModalidades.ok) setModalidades(await resModalidades.json());
      if (resTurmas.ok) setTurmas(await resTurmas.json());
      if (resAlunos && resAlunos.ok) setAlunosList(await resAlunos.json());

    } catch (err) {
      console.error("Erro ao conectar à API Express:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDadosDoPainel();
  }, []);

  useEffect(() => {
    if (!loading) {
      gerarMatriculaAleatoria(false);
    }
  }, [alunosList, loading]);

  useEffect(() => {
    if (modalidades.length > 0 && modalidades[0] && !alunoForm.modalidade) {
      setAlunoForm(prev => ({ ...prev, modalidade: modalidades[0]!.id }));
    }
  }, [modalidades]);

  const gerarMatriculaAleatoria = (showUserAlert = true) => {
    const min = Math.ceil(range.min);
    const max = Math.floor(range.max);
    if (min > max) return;

    const matriculasEmUso = new Set(alunosList.map(a => Number(a.registration)));
    let ocupadasNoRange = 0;
    matriculasEmUso.forEach(m => {
      if (m >= min && m <= max) ocupadasNoRange++;
    });

    const totalPossivel = max - min + 1;
    if (ocupadasNoRange >= totalPossivel) {
      if (showUserAlert) alert("Atenção: O intervalo configurado não possui mais matrículas disponíveis.");
      return;
    }

    let randomMatricula;
    do {
      randomMatricula = Math.floor(Math.random() * totalPossivel) + min;
    } while (matriculasEmUso.has(randomMatricula));

    setAlunoForm(prev => ({ ...prev, matricula: randomMatricula.toString() }));
  };

  // 2. SALVAR MATRÍCULA VIA FETCH
  const handleCadastrarAluno = async () => {
    if (!alunoForm.nome || !alunoForm.matricula || !alunoForm.email || !alunoForm.turma) {
      alert("Preencha todos os campos obrigatórios para cadastrar o aluno.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/students`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          name: alunoForm.nome,
          email: alunoForm.email,
          registration: alunoForm.matricula,
          classId: alunoForm.turma
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAlunosList(prev => [data, ...prev]);
        alert("Aluno matriculado com sucesso!");

        setAlunoForm({
          nome: '',
          email: '',
          turma: '',
          modalidade: modalidades[0]?.id || '',
          matricula: ''
        });
      } else {
        alert("Falha ao registrar aluno no servidor.");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setCsvPreview([
        { nome: 'João Pedro Silva', email: 'joao.silva@exemplo.com', turma: turmas[0]?.name || 'Turma' },
        { nome: 'Ana Beatriz Souza', email: 'ana.beatriz@exemplo.com', turma: turmas[1]?.name || 'Turma' },
        { nome: 'Carlos Eduardo Santos', email: 'carlos.edu@exemplo.com', turma: turmas[2]?.name || 'Turma' },
      ]);
    }
  };

  // 3. PERSISTIR MODALIDADE VIA FETCH
  const adicionarModalidade = async () => {
    if (!novaModalidade.trim()) return;

    try {
      const res = await fetch(`${API_URL}/modalities`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          name: novaModalidade.trim().toLowerCase(),
          subjectIds: []
        })
      });

      if (res.ok) {
        const data = await res.json();
        setModalidades(prev => [...prev, data]);
        setNovaModalidade('');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const removerModalidade = async (id: string) => {
    if (!confirm("Remover esta modalidade apagará as turmas associadas. Confirma?")) return;
    try {
      const res = await fetch(`${API_URL}/modalities/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      if (res.ok) {
        setModalidades(prev => prev.filter(m => m.id !== id));
        setTurmas(prev => prev.filter(t => t.modalityId !== id));
      }
    } catch (error) {
      console.error(error);
    }
  };

  // 4. PERSISTIR TURMA (CLASS) VIA FETCH
  const adicionarTurma = async () => {
    if (!modalidadeSelecionadaParaTurma || !novaTurma.trim()) {
      alert("Por favor, preencha o nome da turma e selecione uma modalidade.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/classes`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          name: novaTurma.trim(),
          modalityId: modalidadeSelecionadaParaTurma
        })
      });

      if (res.ok) {
        const data = await res.json();
        setTurmas(prev => [...prev, data]);
        setNovaTurma('');
        setModalidadeSelecionadaParaTurma('');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const removerTurma = async (id: string) => {
    if (!confirm("Deseja realmente excluir esta turma?")) return;
    try {
      const res = await fetch(`${API_URL}/classes/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      if (res.ok) {
        setTurmas(prev => prev.filter(t => t.id !== id));
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Buscando configurações escolares no servidor Express...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="lista" className="w-full flex flex-col space-y-6">
        <TabsList className="w-full justify-start h-auto p-1 bg-muted/50 border rounded-lg flex-col sm:flex-row">
          <TabsTrigger value="lista" className="py-2.5 px-4">Lista de Alunos</TabsTrigger>
          <TabsTrigger value="cadastro" className="py-2.5 px-4">Cadastros & Importação</TabsTrigger>
          <TabsTrigger value="config" className="py-2.5 px-4">Turmas e Modalidades</TabsTrigger>
        </TabsList>

        <TabsContent value="lista">
          <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border-none rounded-2xl bg-white">
            <CardHeader className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div>
                <CardTitle>Alunos Matriculados</CardTitle>
                <CardDescription>Lista completa de estudantes matriculados neste ano letivo.</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-2">

                <Select value={filtroTurma} onValueChange={(val) => setFiltroTurma(val || 'todas')}>
                  <SelectTrigger className="w-full sm:w-[160px] bg-background">
                    <SelectValue placeholder="Turma">
                      {filtroTurma === 'todas' ? 'Todas as Turmas' : turmas.find(t => t.id === filtroTurma)?.name || filtroTurma}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as Turmas</SelectItem>
                    {turmas.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={filtroModalidade} onValueChange={(val) => setFiltroModalidade(val || 'todas')}>
                  <SelectTrigger className="w-full sm:w-[160px] bg-background capitalize">
                    <SelectValue placeholder="Modalidade">
                      {filtroModalidade === 'todas' ? 'Todas Modalidades' : modalidades.find(m => m.id === filtroModalidade)?.name || filtroModalidade}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas Modalidades</SelectItem>
                    {modalidades.map(m => <SelectItem key={m.id} value={m.id} className="capitalize">{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>

                <div className="relative w-full sm:w-[220px]">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Buscar nome/matrícula..."
                    className="pl-8 bg-background"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Matrícula</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Turma</TableHead>
                      <TableHead>Modalidade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alunosList
                      .filter((aluno) => {
                        const matchBusca = aluno.name.toLowerCase().includes(searchQuery.toLowerCase()) || aluno.registration.includes(searchQuery);
                        const matchTurma = filtroTurma === 'todas' || aluno.classId === filtroTurma;
                        const matchModalidade = filtroModalidade === 'todas' || aluno.class?.modality?.name === modalidades.find(m => m.id === filtroModalidade)?.name;

                        return matchBusca && matchTurma && matchModalidade;
                      })
                      .map((aluno) => (
                        <TableRow key={aluno.id}>
                          <TableCell className="font-mono text-muted-foreground">{aluno.registration}</TableCell>
                          <TableCell className="font-medium">{aluno.name}</TableCell>
                          <TableCell>{aluno.email}</TableCell>
                          <TableCell>{aluno.class?.name || 'Não alocado'}</TableCell>
                          <TableCell>
                            <Badge variant={aluno.class?.modality?.name === 'presencial' ? 'default' : 'secondary'} className="rounded-full capitalize">
                              {aluno.class?.modality?.name || 'Sem modalidade'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    {alunosList.filter((aluno) => {
                      const matchBusca = aluno.name.toLowerCase().includes(searchQuery.toLowerCase()) || aluno.registration.includes(searchQuery);
                      const matchTurma = filtroTurma === 'todas' || aluno.classId === filtroTurma;
                      const matchModalidade = filtroModalidade === 'todas' || aluno.class?.modality?.name === modalidades.find(m => m.id === filtroModalidade)?.name;
                      return matchBusca && matchTurma && matchModalidade;
                    }).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                            Nenhum aluno encontrado para os filtros selecionados.
                          </TableCell>
                        </TableRow>
                      )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cadastro" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-primary/5 p-4 rounded-lg border border-primary/10 gap-4">
            <div>
              <h3 className="font-semibold text-primary">Contexto de Matrícula</h3>
              <p className="text-sm text-muted-foreground">Os alunos cadastrados ou importados farão parte do ano letivo selecionado.</p>
            </div>
            <div className="w-full sm:w-64">
              <Select defaultValue="2026">
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Ano Letivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025">Ano Letivo: 2025</SelectItem>
                  <SelectItem value="2026">Ano Letivo: 2026</SelectItem>
                  <SelectItem value="2027">Ano Letivo: 2027</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cadastro Individual */}
            <Card className="shadow-[0_8px_30px_rgb(0,0,0,0.02)] border-none rounded-2xl bg-white">
              <CardHeader>
                <CardTitle>Cadastro Individual</CardTitle>
                <CardDescription>Insira os dados do aluno manualmente no sistema.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Completo</Label>
                  <Input
                    id="nome"
                    placeholder="Ex: Maria das Graças"
                    value={alunoForm.nome}
                    onChange={(e) => setAlunoForm({ ...alunoForm, nome: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-1 md:col-span-2 p-3 bg-muted/40 rounded-lg border">
                    <Label className="text-sm font-semibold">Configuração do Gerador de Matrícula</Label>
                    <div className="flex flex-wrap items-end gap-4 mt-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Faixa Inicial</Label>
                        <Input
                          type="number"
                          value={range.min}
                          onChange={(e) => setRange({ ...range, min: Number(e.target.value) })}
                          className="w-24 h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Faixa Final</Label>
                        <Input
                          type="number"
                          value={range.max}
                          onChange={(e) => setRange({ ...range, max: Number(e.target.value) })}
                          className="w-24 h-8"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="maria@email.com"
                      value={alunoForm.email}
                      onChange={(e) => setAlunoForm({ ...alunoForm, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="matricula">Matrícula (Gerada)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="matricula"
                        value={alunoForm.matricula || ''}
                        readOnly
                        className="bg-muted font-mono"
                      />
                      <Button variant="outline" onClick={() => gerarMatriculaAleatoria(true)}>
                        Gerar
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Modalidade</Label>
                    <Select
                      value={alunoForm.modalidade || ''}
                      onValueChange={(val) => setAlunoForm({ ...alunoForm, modalidade: val || '', turma: '' })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione a Modalidade">
                          {alunoForm.modalidade ? modalidades.find(m => m.id === alunoForm.modalidade)?.name : "Selecione a Modalidade"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {modalidades.length > 0 ? modalidades.map(m => (
                          <SelectItem key={m.id} value={String(m.id)} className="capitalize">{m.name}</SelectItem>
                        )) : (
                          <SelectItem value="none" disabled>Nenhuma modalidade criada</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Turma</Label>
                    <Select
                      value={alunoForm.turma || ''}
                      onValueChange={(val) => setAlunoForm({ ...alunoForm, turma: val || '' })}
                      disabled={!alunoForm.modalidade}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione a Turma">
                          {alunoForm.turma ? turmas.find(t => t.id === alunoForm.turma)?.name : "Selecione a Turma"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {turmas.filter(t => t.modalityId === alunoForm.modalidade).length > 0 ? turmas.filter(t => t.modalityId === alunoForm.modalidade).map(t => (
                          <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                        )) : (
                          <SelectItem value="none" disabled>Nenhuma turma para esta modalidade</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button className="gap-2" onClick={handleCadastrarAluno}>
                  <Plus className="w-4 h-4" />
                  Cadastrar Aluno
                </Button>
              </CardFooter>
            </Card>

            {/* Importação em Massa */}
            <Card className="shadow-[0_8px_30px_rgb(0,0,0,0.02)] border-none rounded-2xl bg-white">
              <CardHeader>
                <CardTitle>Importação em Massa (CSV)</CardTitle>
                <CardDescription>Cadastre múltiplos alunos de uma vez através de uma planilha.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Button variant="outline" className="w-full gap-2">
                  <Download className="w-4 h-4" />
                  Baixar Modelo de Planilha (.csv)
                </Button>

                <div
                  className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-4 transition-all duration-300 cursor-pointer ${dragActive ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                    }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <div className={`p-4 rounded-full transition-colors ${dragActive ? 'bg-primary/10 text-primary' : 'bg-white text-slate-400 shadow-sm'}`}>
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-700">Arraste e solte a planilha CSV</p>
                    <p className="text-xs text-slate-500 mt-1">Ou clique para procurar em seus arquivos</p>
                  </div>
                </div>

                {csvPreview.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                      <FileSpreadsheet className="w-4 h-4" />
                      Arquivo lido com sucesso. Pré-visualização:
                    </div>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>E-mail</TableHead>
                            <TableHead>Turma</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {csvPreview.slice(0, 3).map((row, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{row.nome}</TableCell>
                              <TableCell>{row.email}</TableCell>
                              <TableCell>{row.turma}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">+ 45 alunos identificados no arquivo.</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button className="gap-2" disabled={csvPreview.length === 0}>
                  Processar Importação
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="config" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card className="shadow-[0_8px_30px_rgb(0,0,0,0.02)] border-none rounded-2xl bg-white">
            <CardHeader>
              <CardTitle>Turmas e Modalidades</CardTitle>
              <CardDescription>Crie as categorias que serão disponibilizadas no momento do cadastro do aluno.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">

              {/* Gestão de Modalidades */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium border-b pb-2">1. Modalidades de Ensino (Combos Pedagógicos)</h3>
                <div className="flex flex-wrap gap-2">
                  {modalidades.map(m => (
                    <Badge key={m.id} variant="outline" className="rounded-full px-3 py-1 flex items-center gap-2 text-sm capitalize bg-muted/40 font-normal">
                      {m.name}
                      <button
                        onClick={() => removerModalidade(m.id)}
                        className="text-muted-foreground hover:text-destructive rounded-full focus:outline-none transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                  {modalidades.length === 0 && <span className="text-sm text-muted-foreground italic">Nenhuma modalidade cadastrada.</span>}
                </div>

                <div className="flex items-center gap-2 max-w-sm pt-2">
                  <Input
                    placeholder="Ex: Semipresencial"
                    value={novaModalidade}
                    onChange={(e) => setNovaModalidade(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && adicionarModalidade()}
                  />
                  <Button onClick={adicionarModalidade} variant="outline" className="bg-background">Adicionar</Button>
                </div>
              </div>

              {/* Gestão de Turmas */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium border-b pb-2">2. Turmas Ativas e Alocações</h3>
                <div className="flex flex-wrap gap-2">
                  {turmas.map(t => (
                    <Badge key={t.id} variant="outline" className="rounded-full px-3 py-1 flex items-center gap-2 text-sm bg-muted/40 font-normal">
                      <span>{t.name}</span>
                      <span className="text-[10px] uppercase font-bold text-primary px-1 rounded-full">
                        {t.modality?.name || 'Sem combo'}
                      </span>
                      <button
                        onClick={() => removerTurma(t.id)}
                        className="text-muted-foreground hover:text-destructive rounded-full focus:outline-none transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                  {turmas.length === 0 && <span className="text-sm text-muted-foreground italic">Nenhuma turma cadastrada.</span>}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-xl pt-2">
                  <Input
                    placeholder="Ex: Extensivo Medicina"
                    value={novaTurma}
                    onChange={(e) => setNovaTurma(e.target.value)}
                    className="flex-1"
                  />

                  <Select
                    value={modalidadeSelecionadaParaTurma}
                    onValueChange={(val) => setModalidadeSelecionadaParaTurma(val || '')}
                  >
                    <SelectTrigger className="w-[180px] bg-background">
                      <SelectValue placeholder="Vincular a...">
                        {modalidadeSelecionadaParaTurma ? modalidades.find(m => m.id === modalidadeSelecionadaParaTurma)?.name : "Vincular a..."}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {modalidades.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)} className="capitalize">
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button onClick={adicionarTurma} variant="default" className="text-white">Criar Turma</Button>
                </div>
              </div>

            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}