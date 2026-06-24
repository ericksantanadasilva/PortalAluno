import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlunoChamada, disciplinasDisponiveis } from "@repo/database-mocks";
import type { TipoAbonoSaaS, EscopoAbono, HistoricoAbono } from "@repo/database-mocks";

interface NovoAbonoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alunos: AlunoChamada[];
  onSalvar: (abono: Omit<HistoricoAbono, "id">) => void;
}

export function NovoAbonoDialog({ open, onOpenChange, alunos, onSalvar }: NovoAbonoDialogProps) {
  const [alunoId, setAlunoId] = useState("");
  const [tipo, setTipo] = useState<TipoAbonoSaaS | "">("");
  const [motivo, setMotivo] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [escopo, setEscopo] = useState<EscopoAbono | "">("");
  const [disciplina, setDisciplina] = useState("");

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alunoId || !tipo || !motivo || !dataInicio || !dataFim || !escopo) return;
    if (escopo === "Disciplina Específica" && !disciplina) return;

    const aluno = alunos.find((a) => a.id === alunoId);
    if (!aluno) return;

    onSalvar({
      alunoId,
      alunoNome: aluno.nome,
      tipo: tipo as TipoAbonoSaaS,
      motivo,
      dataInicio,
      dataFim,
      escopo: escopo as EscopoAbono,
      disciplina: escopo === "Disciplina Específica" ? disciplina : undefined,
    });
    
    setAlunoId("");
    setTipo("");
    setMotivo("");
    setDataInicio("");
    setDataFim("");
    setEscopo("");
    setDisciplina("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Abono</DialogTitle>
          <DialogDescription>
            Preencha os detalhes para registrar um novo abono ou eventualidade.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSalvar} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="aluno">Aluno</Label>
            <Select value={alunoId} onValueChange={(v) => setAlunoId(v || "")} required>
              <SelectTrigger id="aluno">
                <SelectValue placeholder="Selecione o aluno" />
              </SelectTrigger>
              <SelectContent>
                {alunos.map((aluno) => (
                  <SelectItem key={aluno.id} value={aluno.id}>
                    {aluno.nome} ({aluno.matricula})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo((v as TipoAbonoSaaS) || "")} required>
                <SelectTrigger id="tipo">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Eventualidade">Eventualidade</SelectItem>
                  <SelectItem value="Mérito">Mérito</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="escopo">Escopo</Label>
              <Select value={escopo} onValueChange={(v) => setEscopo((v as EscopoAbono) || "")} required>
                <SelectTrigger id="escopo">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todas as Disciplinas">Todas as Disciplinas</SelectItem>
                  <SelectItem value="Disciplina Específica">Disciplina Específica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {escopo === "Disciplina Específica" && (
            <div className="space-y-2">
              <Label htmlFor="disciplina">Disciplina</Label>
              <Select value={disciplina} onValueChange={(v) => setDisciplina(v || "")} required>
                <SelectTrigger id="disciplina">
                  <SelectValue placeholder="Selecione a disciplina" />
                </SelectTrigger>
                <SelectContent>
                  {disciplinasDisponiveis.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dataInicio">Data Início</Label>
              <Input
                id="dataInicio"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataFim">Data Fim</Label>
              <Input
                id="dataFim"
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo</Label>
            <Textarea
              id="motivo"
              placeholder="Descreva o motivo do abono..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              required
              rows={3}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-[#0B5C43] hover:bg-[#084834] text-white">
              Salvar Abono
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
