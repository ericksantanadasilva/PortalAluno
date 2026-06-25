'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { SimuladoForm, QuestaoSimulado, SimuladoListagem } from '../types/workspace-settings.types';
import { Info, Plus, Trash2, Pencil } from 'lucide-react';

const INITIAL_MOCK_SIMULADOS: SimuladoListagem[] = [
  { id: '1', titulo: 'Simulado Nacional ENEM - 1º Semestre', dataAplicacao: '2026-04-15', tipo: 'enem', isPublished: true },
  { id: '2', titulo: 'Simulado UERJ Especial', dataAplicacao: '2026-05-20', tipo: 'uerj', isPublished: false },
];

export function ExamsTab() {
  const [simulados, setSimulados] = useState<SimuladoListagem[]>(INITIAL_MOCK_SIMULADOS);
  const [form, setForm] = useState<Partial<SimuladoForm> & { id?: string }>({
    tipo: 'enem',
    quantidadeQuestoes: 0,
    questoes: [],
    isPublished: false,
  });

  const carregarSimulado = (simulado: SimuladoListagem) => {
    setForm({
      id: simulado.id,
      titulo: simulado.titulo,
      dataAplicacao: simulado.dataAplicacao,
      tipo: simulado.tipo,
      isPublished: simulado.isPublished,
      quantidadeQuestoes: 0,
      questoes: [],
    });
  };

  const handleTogglePublish = (checked: boolean) => {
    setForm({ ...form, isPublished: checked });
    
    if (form.id) {
      setSimulados(prev => prev.map(s => 
        s.id === form.id ? { ...s, isPublished: checked } : s
      ));
    }
  };

  const handleQuantidadeQuestoesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const qtd = parseInt(e.target.value) || 0;
    
    // Gera as questões dinamicamente
    const novasQuestoes: QuestaoSimulado[] = Array.from({ length: qtd }, (_, i) => ({
      numero: i + 1,
      conteudo: '',
      disciplina: '',
    }));

    setForm({
      ...form,
      quantidadeQuestoes: qtd,
      questoes: novasQuestoes,
    });
  };

  const atualizarQuestao = (index: number, campo: keyof QuestaoSimulado, valor: string) => {
    if (!form.questoes) return;
    
    const novasQuestoes = [...form.questoes];
    novasQuestoes[index] = { ...novasQuestoes[index], [campo]: valor };
    
    setForm({ ...form, questoes: novasQuestoes });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Criar Novo Simulado</CardTitle>
          <CardDescription>Configure os dados base da prova e a sua matriz de referência.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Listagem Inicial */}
          <div className="rounded-md border mb-8">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {simulados.map((simulado) => (
                  <TableRow key={simulado.id}>
                    <TableCell className="font-medium">{simulado.titulo}</TableCell>
                    <TableCell>{new Date(simulado.dataAplicacao).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell className="uppercase">{simulado.tipo.replace('_', ' ')}</TableCell>
                    <TableCell>
                      {simulado.isPublished ? (
                        <Badge className="bg-emerald-500 hover:bg-emerald-600">Publicado</Badge>
                      ) : (
                        <Badge variant="secondary">Oculto</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => carregarSimulado(simulado)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between pb-4 border-b">
            <h3 className="font-semibold text-lg">Detalhes do Simulado</h3>
            <div className="flex items-center gap-3">
              <Label htmlFor="publicado">Liberar Boletim para Alunos</Label>
              <label htmlFor="publicado" className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  id="publicado" 
                  className="sr-only peer" 
                  checked={!!form.isPublished}
                  onChange={(e) => handleTogglePublish(e.target.checked)}
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
                value={form.titulo || ''}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="data">Data de Aplicação</Label>
              <Input 
                id="data" 
                type="date" 
                value={form.dataAplicacao || ''}
                onChange={(e) => setForm({ ...form, dataAplicacao: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Prova</Label>
              <Select 
                value={form.tipo}
                onValueChange={(val: any) => setForm({ ...form, tipo: val })}
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

          <div className="p-4 bg-muted/50 rounded-lg border flex gap-3 items-start text-sm">
            <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Cálculo de Dificuldade Automatizado</p>
              <p className="text-muted-foreground mt-1">
                A dificuldade (Fácil, Média, Difícil) de cada questão não precisa ser inserida manualmente. 
                O sistema calculará automaticamente com base na Teoria de Resposta ao Item (TRI) e no percentual de acertos dos alunos após a correção dos cartões.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Matriz de Questões</CardTitle>
            <CardDescription>Defina o tema e a disciplina para a análise de desempenho.</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="qtdQuestoes" className="whitespace-nowrap">Nº de Questões:</Label>
            <Input 
              id="qtdQuestoes" 
              type="number" 
              min="0" 
              max="180" 
              className="w-24 text-center font-bold"
              value={form.quantidadeQuestoes || ''}
              onChange={handleQuantidadeQuestoesChange}
              placeholder="0"
            />
          </div>
        </CardHeader>
        
        {form.questoes && form.questoes.length > 0 && (
          <CardContent>
            <div className="rounded-md border h-[500px] overflow-y-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 w-16 text-center">Nº</th>
                    <th className="px-4 py-3">Disciplina</th>
                    <th className="px-4 py-3">Conteúdo / Tema Pedagógico</th>
                    <th className="px-4 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {form.questoes.map((q, index) => (
                    <tr key={index} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-2 text-center font-medium">{q.numero}</td>
                      <td className="px-4 py-2">
                        <Select 
                          value={q.disciplina} 
                          onValueChange={(val) => atualizarQuestao(index, 'disciplina', val)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Disciplina..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="matematica">Matemática</SelectItem>
                            <SelectItem value="fisica">Física</SelectItem>
                            <SelectItem value="quimica">Química</SelectItem>
                            <SelectItem value="biologia">Biologia</SelectItem>
                            <SelectItem value="historia">História</SelectItem>
                            <SelectItem value="geografia">Geografia</SelectItem>
                            <SelectItem value="portugues">Português</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-2">
                        <Input 
                          placeholder="Ex: Progressão Aritmética" 
                          className="h-8"
                          value={q.conteudo}
                          onChange={(e) => atualizarQuestao(index, 'conteudo', e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        )}
        
        <CardFooter className="flex justify-end pt-4 border-t">
          <Button disabled={!form.questoes?.length} className="gap-2">
            <Plus className="w-4 h-4" />
            Salvar Estrutura do Simulado
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
