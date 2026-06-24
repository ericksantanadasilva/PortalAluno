import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
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
  const [alunoPopoverOpen, setAlunoPopoverOpen] = useState(false);
  const [tipo, setTipo] = useState<TipoAbonoSaaS | "">("");
  const [motivo, setMotivo] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [escopo, setEscopo] = useState<EscopoAbono | "">("");
  
  const [disciplinasSelecionadas, setDisciplinasSelecionadas] = useState<string[]>([]);
  const [disciplinaPopoverOpen, setDisciplinaPopoverOpen] = useState(false);

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alunoId || !tipo || !motivo || !dataInicio || !dataFim || !escopo) return;
    if (escopo === "Disciplina Específica" && disciplinasSelecionadas.length === 0) return;

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
      disciplina: escopo === "Disciplina Específica" ? disciplinasSelecionadas.join(", ") : undefined,
    });

    setAlunoId("");
    setTipo("");
    setMotivo("");
    setDataInicio("");
    setDataFim("");
    setEscopo("");
    setDisciplinasSelecionadas([]);
    onOpenChange(false);
  };

  const toggleDisciplina = (disciplina: string) => {
    setDisciplinasSelecionadas((prev) => 
      prev.includes(disciplina) 
        ? prev.filter((d) => d !== disciplina)
        : [...prev, disciplina]
    );
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
          <div className="space-y-2 flex flex-col">
            <Label htmlFor="aluno">Aluno</Label>
            <Popover open={alunoPopoverOpen} onOpenChange={setAlunoPopoverOpen}>
              <PopoverTrigger
                className={cn(buttonVariants({ variant: "outline" }), "justify-between w-full font-normal h-10")}
                role="combobox"
                aria-expanded={alunoPopoverOpen}
              >
                {alunoId
                  ? alunos.find((aluno) => aluno.id === alunoId)?.nome
                  : "Selecione ou busque o aluno..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </PopoverTrigger>
              <PopoverContent className="w-[450px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar aluno..." />
                  <CommandList>
                    <CommandEmpty>Nenhum aluno encontrado.</CommandEmpty>
                    <CommandGroup>
                      {alunos.map((aluno) => (
                        <CommandItem
                          key={aluno.id}
                          value={aluno.nome}
                          onSelect={() => {
                            setAlunoId(aluno.id);
                            setAlunoPopoverOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              alunoId === aluno.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {aluno.nome} ({aluno.matricula})
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo((v as TipoAbonoSaaS) || "")} required>
                <SelectTrigger id="tipo" className="h-10 w-full">
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
                <SelectTrigger id="escopo" className="h-10 w-full">
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
            <div className="space-y-2 flex flex-col">
              <Label htmlFor="disciplina">Disciplinas ({disciplinasSelecionadas.length} selecionadas)</Label>
              <Popover open={disciplinaPopoverOpen} onOpenChange={setDisciplinaPopoverOpen}>
                <PopoverTrigger
                  className={cn(buttonVariants({ variant: "outline" }), "justify-between w-full font-normal h-auto min-h-10 whitespace-normal text-left")}
                  role="combobox"
                  aria-expanded={disciplinaPopoverOpen}
                >
                  {disciplinasSelecionadas.length > 0 
                    ? disciplinasSelecionadas.join(", ")
                    : "Selecione uma ou mais disciplinas..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </PopoverTrigger>
                <PopoverContent className="w-[450px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar disciplina..." />
                    <CommandList>
                      <CommandEmpty>Nenhuma disciplina encontrada.</CommandEmpty>
                      <CommandGroup>
                        {disciplinasDisponiveis.map((d) => (
                          <CommandItem
                            key={d}
                            value={d}
                            onSelect={() => toggleDisciplina(d)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                disciplinasSelecionadas.includes(d) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {d}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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
                className="h-10"
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
                className="h-10"
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
            <Button 
              type="submit" 
              className="bg-[#0B5C43] hover:bg-[#084834] text-white"
              disabled={escopo === "Disciplina Específica" && disciplinasSelecionadas.length === 0}
            >
              Salvar Abono
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
