'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Layers, ChevronDown, Check, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SubthemeItem = { id: string; name: string };
export type ThemeItem = { id: string; name: string; subthemes: SubthemeItem[] };
export type SubjectTreeItem = { id: string; name: string; themes: ThemeItem[] };

interface ThemeSelectProps {
    subjectId?: string;
    themeTree: SubjectTreeItem[];
    value?: string;
    themeId?: string;
    subthemeId?: string;
    placeholder?: string;
    className?: string;
    onChange: (data: { theme: string; themeId?: string; subthemeId?: string }) => void;
}

export function ThemeSelect({
    subjectId,
    themeTree,
    value = '',
    themeId,
    subthemeId,
    placeholder = "Selecione ou digite um tema/subtema...",
    className,
    onChange
}: ThemeSelectProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    // Fecha o menu ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        if (open) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [open]);

    // Filtra os temas/subtemas com base na disciplina selecionada e na busca
    const availableOptions = useMemo(() => {
        const result: Array<{
            type: 'theme' | 'subtheme';
            themeId: string;
            subthemeId?: string;
            themeName: string;
            subthemeName?: string;
            label: string;
            subjectName: string;
        }> = [];

        const subjects = subjectId
            ? themeTree.filter(s => s.id === subjectId)
            : themeTree;

        subjects.forEach(subj => {
            subj.themes.forEach(theme => {
                result.push({
                    type: 'theme',
                    themeId: theme.id,
                    themeName: theme.name,
                    label: theme.name,
                    subjectName: subj.name
                });

                theme.subthemes.forEach(sub => {
                    result.push({
                        type: 'subtheme',
                        themeId: theme.id,
                        subthemeId: sub.id,
                        themeName: theme.name,
                        subthemeName: sub.name,
                        label: `${theme.name} → ${sub.name}`,
                        subjectName: subj.name
                    });
                });
            });
        });

        return result;
    }, [subjectId, themeTree]);

    const filteredOptions = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return availableOptions;
        return availableOptions.filter(opt =>
            opt.label.toLowerCase().includes(q) ||
            opt.subjectName.toLowerCase().includes(q)
        );
    }, [availableOptions, query]);

    const handleSelectOption = (opt: typeof availableOptions[0]) => {
        if (opt.type === 'subtheme') {
            onChange({
                theme: `${opt.themeName} - ${opt.subthemeName}`,
                themeId: opt.themeId,
                subthemeId: opt.subthemeId
            });
        } else {
            onChange({
                theme: opt.themeName,
                themeId: opt.themeId,
                subthemeId: undefined
            });
        }
        setOpen(false);
        setQuery('');
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        onChange({
            theme: val,
            themeId: undefined,
            subthemeId: undefined
        });
    };

    return (
        <div ref={containerRef} className="relative w-full">
            <div className="relative flex items-center">
                <Input
                    value={value}
                    onChange={handleTextChange}
                    onFocus={() => setOpen(true)}
                    placeholder={placeholder}
                    className={cn("h-8 pr-7 text-xs bg-white dark:bg-slate-950 border-slate-200 focus-visible:ring-emerald-500", className)}
                />
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setOpen(!open);
                    }}
                    className="absolute right-2 text-slate-400 hover:text-emerald-600 focus:outline-none p-1"
                >
                    <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", open && "rotate-180")} />
                </button>
            </div>

            {open && (
                <div className="absolute left-0 top-full mt-1 w-[320px] sm:w-[380px] md:w-[440px] z-50 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl animate-in fade-in-0 zoom-in-95">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between px-2 py-1 bg-slate-50 dark:bg-slate-950 rounded border text-xs text-slate-500">
                            <span className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
                                <Sparkles className="w-3.5 h-3.5" /> Catálogo de Temas & Subtemas
                            </span>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <Input
                            placeholder="Buscar tema ou subtema..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="h-8 text-xs mb-2 focus-visible:ring-emerald-500"
                            autoFocus
                        />

                        <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                            {filteredOptions.length === 0 ? (
                                <div className="p-3 text-center text-slate-400">
                                    Nenhum tema/subtema encontrado no catálogo.
                                </div>
                            ) : (
                                filteredOptions.map((opt, idx) => {
                                    const isSelected = opt.type === 'subtheme'
                                        ? subthemeId === opt.subthemeId
                                        : (themeId === opt.themeId && !subthemeId);

                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => handleSelectOption(opt)}
                                            className={cn(
                                                "p-2 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded transition-colors flex items-center justify-between",
                                                opt.type === 'subtheme' ? "pl-5" : "font-semibold bg-slate-50/50 dark:bg-slate-950/30",
                                                isSelected && "bg-emerald-100/60 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 font-bold"
                                            )}
                                        >
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1.5">
                                                    {opt.type === 'theme' ? (
                                                        <Layers className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                    ) : (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                                                    )}
                                                    <span className="truncate">
                                                        {opt.type === 'subtheme' ? opt.subthemeName : opt.themeName}
                                                    </span>
                                                </div>
                                                {opt.type === 'subtheme' && (
                                                    <span className="text-[10px] text-slate-400 pl-3">
                                                        Tema: {opt.themeName}
                                                    </span>
                                                )}
                                            </div>

                                            {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
