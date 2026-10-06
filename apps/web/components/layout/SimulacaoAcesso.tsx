"use client"

import React, { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";

interface AlunoSimulacao {
    id: string;
    name: string;
    registrationNumber: string;
    class?: { name: string } | null;
}

interface SimulacaoAcessoProps {
    alunos: AlunoSimulacao[];
    selectedAlunoId?: string | null;
    onSelectAluno: (id: string) => void;
    description: string;
    className?: string;
}

export function SimulacaoAcesso({
    alunos,
    selectedAlunoId,
    onSelectAluno,
    description,
    className,
}: SimulacaoAcessoProps) {
    const [open, setOpen] = useState(false);
    const selecionado = alunos.find((a) => a.id === selectedAlunoId);

    return (
        <div className={cn(
            "flex flex-col gap-3 rounded-lg bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between",
            className
        )}
        >
            <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">Simulação de acesso</p>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger
                    className={cn(
                        buttonVariants({ variant: "outline" }),
                        "h-9 w-full justify-between bg-background font-normal sm:w-[360px]"
                    )}
                    role="combobox"
                    aria-expanded={open}
                >
                    <span className="truncate">
                        {selecionado
                            ? `${selecionado.name} (${selecionado.registrationNumber})`
                            : "Selecionar um aluno..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </PopoverTrigger>
                <PopoverContent className="w-[360px] max-w-[90vw] p-0" align="end">
                    <Command>
                        <CommandInput placeholder="Buscar por nome ou matrícula..." />
                        <CommandList>
                            <CommandEmpty>Nenhum aluno encontrado.</CommandEmpty>
                            <CommandGroup>
                                {alunos.map((a) => (
                                    <CommandItem
                                        key={a.id}
                                        value={`${a.name} ${a.registrationNumber}`}
                                        onSelect={() => {
                                            onSelectAluno(a.id);
                                            setOpen(false);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                selectedAlunoId === a.id ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {a.name} ({a.registrationNumber}) - {a.class?.name || "Sem Turma"}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    )
}