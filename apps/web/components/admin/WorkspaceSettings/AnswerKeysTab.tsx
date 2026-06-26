'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GabaritoForm, RespostaGabarito } from '../types/workspace-settings.types';
import { Save, CheckCircle2, AlertTriangle } from 'lucide-react';

// Simulando a quantidade de questões do simulado selecionado
const QTD_QUESTOES_MOCK = 90;
const ALTERNATIVAS = ['A', 'B', 'C', 'D', 'E'] as const;

export function AnswerKeysTab() {
  const [form, setForm] = useState<Partial<GabaritoForm>>({
    respostas: Array.from({ length: QTD_QUESTOES_MOCK }, (_, i) => ({
      numeroQuestao: i + 1,
      alternativaCorreta: 'A', // Default provisório para evitar tipagem vazia, o ideal é null e validar depois
    })),
  });

  const [simuladoSelecionado, setSimuladoSelecionado] = useState<string>('');

  const handleAlternativaSelect = (numeroQuestao: number, alternativa: 'A' | 'B' | 'C' | 'D' | 'E') => {
    if (!form.respostas) return;
    
    const novasRespostas = [...form.respostas];
    const index = novasRespostas.findIndex(r => r.numeroQuestao === numeroQuestao);
    
    if (index !== -1) {
      novasRespostas[index].alternativaCorreta = alternativa;
    } else {
      novasRespostas.push({ numeroQuestao, alternativaCorreta: alternativa });
    }
    
    setForm({ ...form, respostas: novasRespostas });
  };

  const getAlternativaSelecionada = (numeroQuestao: number) => {
    return form.respostas?.find(r => r.numeroQuestao === numeroQuestao)?.alternativaCorreta;
  };

  const isQuestaoAnulada = (numeroQuestao: number) => {
    return form.respostas?.find(r => r.numeroQuestao === numeroQuestao)?.anulada || false;
  };

  const toggleAnularQuestao = (numeroQuestao: number) => {
    if (!form.respostas) return;
    
    const novasRespostas = [...form.respostas];
    const index = novasRespostas.findIndex(r => r.numeroQuestao === numeroQuestao);
    
    if (index !== -1) {
      novasRespostas[index].anulada = !novasRespostas[index].anulada;
    } else {
      novasRespostas.push({ numeroQuestao, alternativaCorreta: 'A', anulada: true });
    }
    
    setForm({ ...form, respostas: novasRespostas });
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-[0_8px_30px_rgb(0,0,0,0.02)] border-none rounded-2xl bg-white">
        <CardHeader className="bg-primary/5 border-b border-primary/10 rounded-t-2xl pb-6">
          <CardTitle className="text-primary text-xl">Lançamento de Gabaritos Oficiais</CardTitle>
          <CardDescription className="text-primary/70 text-sm md:text-base mt-2">
            Selecione o simulado e preencha rapidamente o gabarito oficial. A interface é otimizada para lançamentos velozes e precisos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 pt-8">
          <div className="max-w-md">
            <Select value={simuladoSelecionado} onValueChange={setSimuladoSelecionado}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um Simulado Cadastrado..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="simulado_1">Simulado Nacional ENEM - 1º Semestre</SelectItem>
                <SelectItem value="simulado_2">Simulado UERJ Especial</SelectItem>
                <SelectItem value="simulado_3">Simulado de Diagnóstico Inicial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {simuladoSelecionado && (
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-6">
                <div className="font-semibold flex items-center gap-2 text-slate-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  Cartão-Resposta Digital
                </div>
                <div className="text-sm font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                  {form.respostas?.length} Questões
                </div>
              </div>

              {/* Grid compacto de gabarito */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-8 gap-y-5">
                {Array.from({ length: QTD_QUESTOES_MOCK }, (_, i) => i + 1).map((numero) => {
                  const anulada = isQuestaoAnulada(numero);
                  return (
                    <div key={numero} className={`flex items-center gap-3 p-2 rounded-xl transition-all ${anulada ? 'bg-slate-50 opacity-50 grayscale' : 'hover:bg-slate-50 border border-transparent hover:border-slate-100 hover:shadow-[0_4px_15px_rgb(0,0,0,0.02)]'}`}>
                      <span className="font-mono font-bold text-slate-400 w-6 text-right text-sm">
                        {numero}.
                      </span>
                      <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200/50 shadow-inner">
                        {ALTERNATIVAS.map((alt) => {
                          const isSelected = getAlternativaSelecionada(numero) === alt;
                          return (
                            <button
                              key={alt}
                              disabled={anulada}
                              onClick={() => handleAlternativaSelect(numero, alt)}
                              className={`w-7 h-7 flex items-center justify-center text-xs font-medium rounded transition-colors disabled:cursor-not-allowed ${
                                isSelected && !anulada
                                  ? 'bg-primary text-primary-foreground shadow-sm' 
                                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                              } ${anulada && isSelected ? 'bg-muted-foreground/30 text-foreground' : ''}`}
                            >
                              {alt}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        title="Anular Questão"
                        onClick={() => toggleAnularQuestao(numero)}
                        className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${anulada ? 'text-destructive bg-destructive/10' : 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive'}`}
                      >
                        <AlertTriangle className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end border-t border-slate-100 p-6">
          <Button disabled={!simuladoSelecionado} className="gap-2 rounded-full px-8 shadow-md">
            <Save className="w-4 h-4" />
            Salvar Gabarito Oficial
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
