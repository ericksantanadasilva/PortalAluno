'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, UploadCloud, Plus, FileSpreadsheet, Search } from 'lucide-react';
import { AlunoForm } from '../types/workspace-settings.types';

const MOCK_ALUNOS = [
  { id: '1', nome: 'Ana Beatriz Souza', matricula: '1024', modalidade: 'presencial', turma: 'Turma ENEM', email: 'ana.beatriz@exemplo.com' },
  { id: '2', nome: 'Carlos Eduardo Santos', matricula: '3045', modalidade: 'online', turma: 'Turma UERJ', email: 'carlos.edu@exemplo.com' },
  { id: '3', nome: 'João Pedro Silva', matricula: '8832', modalidade: 'presencial', turma: 'Medicina Integral', email: 'joao.silva@exemplo.com' },
  { id: '4', nome: 'Mariana Lima', matricula: '1205', modalidade: 'presencial', turma: 'Turma ENEM', email: 'mariana.lima@exemplo.com' },
  { id: '5', nome: 'Roberto Alves', matricula: '4450', modalidade: 'online', turma: 'Medicina Integral', email: 'roberto.alves@exemplo.com' },
];

export function StudentsTab() {
  const [dragActive, setDragActive] = useState(false);
  const [csvPreview, setCsvPreview] = useState<{ nome: string; email: string; turma: string }[]>([]);

  // Form State para Cadastro Individual
  const [alunoForm, setAlunoForm] = useState<Partial<AlunoForm>>({
    modalidade: 'presencial',
    matricula: '',
  });

  const [range, setRange] = useState({ min: 1000, max: 9999 });

  // Gera uma matrícula aleatória ao carregar a página (com delay ou dependência do range)
  useEffect(() => {
    gerarMatriculaAleatoria();
  }, [range.min, range.max]);

  const gerarMatriculaAleatoria = () => {
    const min = Math.ceil(range.min);
    const max = Math.floor(range.max);
    // Simula uma matrícula aleatória no range definido
    const randomMatricula = Math.floor(Math.random() * (max - min + 1)) + min;
    setAlunoForm(prev => ({ ...prev, matricula: randomMatricula.toString() }));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      // Simulação da leitura de um CSV - Num cenário real usaríamos FileReader + papaparse
      setCsvPreview([
        { nome: 'João Pedro Silva', email: 'joao.silva@exemplo.com', turma: 'Medicina Integral' },
        { nome: 'Ana Beatriz Souza', email: 'ana.beatriz@exemplo.com', turma: 'Turma ENEM' },
        { nome: 'Carlos Eduardo Santos', email: 'carlos.edu@exemplo.com', turma: 'Turma UERJ' },
      ]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtro Principal de Ano Letivo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-primary/5 p-4 rounded-lg border border-primary/10 gap-4">
        <div>
          <h3 className="font-semibold text-primary">Contexto de Matrícula</h3>
          <p className="text-sm text-muted-foreground">Todos os dados inseridos abaixo farão parte do ano letivo selecionado.</p>
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
        <Card>
          <CardHeader>
            <CardTitle>Cadastro Individual</CardTitle>
            <CardDescription>Insira os dados do aluno manualmente no sistema.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo</Label>
              <Input id="nome" placeholder="Ex: Maria das Graças" />
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
                <Input id="email" type="email" placeholder="maria@email.com" />
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
                  <Button variant="outline" onClick={gerarMatriculaAleatoria}>
                    Gerar
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Turma</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a Turma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medicina">Turma Medicina</SelectItem>
                    <SelectItem value="enem">Turma ENEM</SelectItem>
                    <SelectItem value="uerj">Turma UERJ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Modalidade</Label>
                <Select defaultValue="presencial">
                  <SelectTrigger>
                    <SelectValue placeholder="Modalidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="online">Online / EaD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Cadastrar Aluno
            </Button>
          </CardFooter>
        </Card>

        {/* Importação em Massa */}
        <Card>
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
              className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-3 transition-colors ${
                dragActive ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <UploadCloud className={`w-10 h-10 ${dragActive ? 'text-primary' : 'text-muted-foreground'}`} />
              <div className="text-center">
                <p className="text-sm font-medium">Arraste e solte o arquivo CSV aqui</p>
                <p className="text-xs text-muted-foreground mt-1">Ou clique para procurar em seus arquivos</p>
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
            <Button 
              className="gap-2" 
              disabled={csvPreview.length === 0}
            >
              Processar Importação
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Lista de Alunos Matriculados */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Alunos Matriculados</CardTitle>
            <CardDescription>Lista completa de estudantes matriculados neste ano letivo.</CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Buscar por nome ou matrícula..." 
              className="pl-8 bg-background"
            />
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
                {MOCK_ALUNOS.map((aluno) => (
                  <TableRow key={aluno.id}>
                    <TableCell className="font-mono text-muted-foreground">{aluno.matricula}</TableCell>
                    <TableCell className="font-medium">{aluno.nome}</TableCell>
                    <TableCell>{aluno.email}</TableCell>
                    <TableCell>{aluno.turma}</TableCell>
                    <TableCell>
                      <Badge variant={aluno.modalidade === 'presencial' ? 'default' : 'secondary'} className="capitalize">
                        {aluno.modalidade}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
