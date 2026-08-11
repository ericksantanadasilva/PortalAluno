'use client';

import React, { useState, useEffect } from 'react';
import { PageContainer, PageHeader } from '@/components/layout';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
    Loader2, Trash2, Edit2, Plus, FileSpreadsheet, ChevronDown, ChevronRight, Search, BookOpen, Layers, CheckCircle2, Upload
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import * as XLSX from 'xlsx';

const API_URL = "/api";

type Subtheme = {
    id: string;
    themeId: string;
    name: string;
};

type Theme = {
    id: string;
    subjectId: string;
    name: string;
    subthemes: Subtheme[];
};

type SubjectTree = {
    id: string;
    name: string;
    themes: Theme[];
};

export default function TemasPage() {
    const [tree, setTree] = useState<SubjectTree[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
    const [expandedThemes, setExpandedThemes] = useState<Record<string, boolean>>({});

    // Modal Add/Edit Theme
    const [themeModalOpen, setThemeModalOpen] = useState(false);
    const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [themeName, setThemeName] = useState('');

    // Modal Add/Edit Subtheme
    const [subthemeModalOpen, setSubthemeModalOpen] = useState(false);
    const [editingSubtheme, setEditingSubtheme] = useState<Subtheme | null>(null);
    const [selectedThemeId, setSelectedThemeId] = useState('');
    const [subthemeName, setSubthemeName] = useState('');

    // Modal Import Excel
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [importing, setImporting] = useState(false);
    const [excelRows, setExcelRows] = useState<Array<{ disciplina: string; tema: string; subtema?: string }>>([]);
    const [importResult, setImportResult] = useState<any>(null);

    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchTree();
    }, []);

    const fetchTree = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/themes/tree`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTree(data);
            }
        } catch (error) {
            console.error('Erro ao buscar árvore de temas', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleSubject = (id: string) => {
        setExpandedSubjects(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleTheme = (id: string) => {
        setExpandedThemes(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const { showAlert, showConfirm, ConfirmModal } = useConfirmModal();

    // --- MANAGE THEME ---
    const openThemeModal = (subjectId?: string, theme?: Theme) => {
        if (theme) {
            setEditingTheme(theme);
            setSelectedSubjectId(theme.subjectId);
            setThemeName(theme.name);
        } else {
            setEditingTheme(null);
            setSelectedSubjectId(subjectId || (tree[0]?.id || ''));
            setThemeName('');
        }
        setThemeModalOpen(true);
    };

    const handleSaveTheme = async () => {
        if (!themeName.trim() || !selectedSubjectId) {
            showAlert('Campos Obrigatórios', 'Preencha a disciplina e o nome do tema.', 'warning');
            return;
        }

        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            let res;
            if (editingTheme) {
                res = await fetch(`${API_URL}/themes/${editingTheme.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ name: themeName.trim() })
                });
            } else {
                res = await fetch(`${API_URL}/themes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ subjectId: selectedSubjectId, name: themeName.trim() })
                });
            }

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Erro ao salvar tema');
            }

            setThemeModalOpen(false);
            fetchTree();
        } catch (error: any) {
            showAlert('Erro ao Salvar', error.message || 'Erro ao salvar tema', 'danger');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteTheme = (id: string) => {
        showConfirm(
            'Excluir Tema',
            'Excluir este tema removerá também todos os subtemas vinculados a ele. Continuar?',
            async () => {
                try {
                    const token = localStorage.getItem('token');
                    const res = await fetch(`${API_URL}/themes/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!res.ok) {
                        const errData = await res.json();
                        throw new Error(errData.error || 'Erro ao excluir tema');
                    }
                    fetchTree();
                } catch (error: any) {
                    showAlert('Erro ao Excluir', error.message || 'Erro ao excluir tema', 'danger');
                }
            },
            'danger'
        );
    };

    // --- MANAGE SUBTHEME ---
    const openSubthemeModal = (themeId: string, subtheme?: Subtheme) => {
        setSelectedThemeId(themeId);
        if (subtheme) {
            setEditingSubtheme(subtheme);
            setSubthemeName(subtheme.name);
        } else {
            setEditingSubtheme(null);
            setSubthemeName('');
        }
        setSubthemeModalOpen(true);
    };

    const handleSaveSubtheme = async () => {
        if (!subthemeName.trim() || !selectedThemeId) {
            showAlert('Campo Obrigatório', 'Preencha o nome do subtema.', 'warning');
            return;
        }

        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            let res;
            if (editingSubtheme) {
                res = await fetch(`${API_URL}/themes/subthemes/${editingSubtheme.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ name: subthemeName.trim() })
                });
            } else {
                res = await fetch(`${API_URL}/themes/subthemes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ themeId: selectedThemeId, name: subthemeName.trim() })
                });
            }

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Erro ao salvar subtema');
            }

            setSubthemeModalOpen(false);
            fetchTree();
        } catch (error: any) {
            showAlert('Erro ao Salvar', error.message || 'Erro ao salvar subtema', 'danger');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteSubtheme = (id: string) => {
        showConfirm(
            'Excluir Subtema',
            'Deseja realmente excluir este subtema?',
            async () => {
                try {
                    const token = localStorage.getItem('token');
                    const res = await fetch(`${API_URL}/themes/subthemes/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!res.ok) {
                        const errData = await res.json();
                        throw new Error(errData.error || 'Erro ao excluir subtema');
                    }
                    fetchTree();
                } catch (error: any) {
                    showAlert('Erro ao Excluir', error.message || 'Erro ao excluir subtema', 'danger');
                }
            },
            'danger'
        );
    };

    // --- IMPORT EXCEL ---
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                if (!wsname) return;
                const ws = wb.Sheets[wsname];
                if (!ws) return;
                const data = XLSX.utils.sheet_to_json<any>(ws, { header: 1 });

                if (data.length < 2) {
                    showAlert('Planilha Inválida', 'A planilha precisa conter pelo menos um cabeçalho e dados.', 'warning');
                    return;
                }

                // Identifica colunas pelo cabeçalho (Disciplina, Tema, Subtema)
                const header = data[0].map((h: any) => String(h || '').trim().toLowerCase());
                const subjIdx = header.findIndex((h: string) => h.includes('disciplina') || h.includes('materia'));
                const themeIdx = header.findIndex((h: string) => h.includes('tema') && !h.includes('subtema'));
                const subthemeIdx = header.findIndex((h: string) => h.includes('subtema'));

                const parsedRows: Array<{ disciplina: string; tema: string; subtema?: string }> = [];

                for (let i = 1; i < data.length; i++) {
                    const row = data[i];
                    if (!row || row.length === 0) continue;

                    const disciplina = String(row[subjIdx !== -1 ? subjIdx : 0] || '').trim();
                    const tema = String(row[themeIdx !== -1 ? themeIdx : 1] || '').trim();
                    const subtema = subthemeIdx !== -1 ? String(row[subthemeIdx] || '').trim() : '';

                    if (disciplina && tema) {
                        parsedRows.push({
                            disciplina,
                            tema,
                            subtema: subtema || undefined
                        });
                    }
                }

                setExcelRows(parsedRows);
                setImportResult(null);
            } catch (err) {
                console.error('Erro ao ler Excel', err);
                showAlert('Arquivo Inválido', 'Formato de arquivo inválido. Por favor envie um arquivo .xlsx ou .csv.', 'danger');
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleConfirmImport = async () => {
        if (excelRows.length === 0) return;

        setImporting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/themes/bulk-import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(excelRows)
            });

            const rawText = await res.text();
            let data: any = {};
            try {
                data = JSON.parse(rawText);
            } catch (err) {
                console.error("Non-JSON API response:", rawText);
                throw new Error(`Erro no servidor (${res.status}). Verifique a conexão com a API.`);
            }

            if (!res.ok) {
                throw new Error(data.error || 'Erro ao importar dados');
            }

            setImportResult(data.stats);
            fetchTree();
        } catch (error: any) {
            showAlert('Erro na Importação', error.message || 'Erro ao executar importação', 'danger');
        } finally {
            setImporting(false);
        }
    };

    // Filtro de busca na árvore
    const filteredTree = tree.map(subject => {
        const matchesSubject = subject.name.toLowerCase().includes(search.toLowerCase());
        const filteredThemes = subject.themes.map(theme => {
            const matchesTheme = theme.name.toLowerCase().includes(search.toLowerCase());
            const filteredSubthemes = theme.subthemes.filter(sub =>
                sub.name.toLowerCase().includes(search.toLowerCase())
            );

            if (matchesTheme || filteredSubthemes.length > 0 || matchesSubject) {
                return {
                    ...theme,
                    subthemes: search ? filteredSubthemes : theme.subthemes
                };
            }
            return null;
        }).filter(Boolean) as Theme[];

        if (matchesSubject || filteredThemes.length > 0) {
            return {
                ...subject,
                themes: search ? filteredThemes : subject.themes
            };
        }
        return null;
    }).filter(Boolean) as SubjectTree[];

    return (
        <PageContainer>
            <PageHeader
                title="Temas e Subtemas (Caça Gaps)"
                description="Cadastre e organize os conteúdos cobrados nos simulados por Disciplina, Tema e Subtema."
                icon={<Layers />}
                actions={
                    <>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setExcelRows([]);
                                setImportResult(null);
                                setImportModalOpen(true);
                            }}
                            className="gap-2 border-primary text-primary hover:bg-primary/5 dark:border-primary dark:text-primary"
                        >
                            <FileSpreadsheet className="w-4 h-4" /> Importar Planilha (.xlsx)
                        </Button>

                        <Button onClick={() => openThemeModal()} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                            <Plus className="w-4 h-4" /> Novo Tema
                        </Button>
                    </>
                }
            />

            {/* Barra de Pesquisa */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                    <Search className="w-5 h-5 text-slate-400" />
                    <Input
                        placeholder="Buscar por disciplina, tema ou subtema (ex: Acidez, Cinética, Orgânica)..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="border-none shadow-none focus-visible:ring-0 text-base"
                    />
                    {search && (
                        <Button variant="ghost" size="sm" onClick={() => setSearch('')}>
                            Limpar
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* Árvore Hierárquica */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p>Carregando catálogo de temas...</p>
                </div>
            ) : filteredTree.length === 0 ? (
                <Card className="p-12 text-center text-slate-500">
                    <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">Nenhum tema encontrado</h3>
                    <p className="mt-1 text-sm text-slate-500">
                        {search ? 'Tente buscar por outro termo.' : 'Você pode importar sua planilha Excel ou criar os temas manualmente.'}
                    </p>
                    {!search && (
                        <Button
                            onClick={() => setImportModalOpen(true)}
                            className="mt-6 gap-2 bg-primary text-primary-foreground"
                        >
                            <FileSpreadsheet className="w-4 h-4" /> Importar Planilha Caça Gaps
                        </Button>
                    )}
                </Card>
            ) : (
                <div className="space-y-4">
                    {filteredTree.map(subject => {
                        const isExpanded = search ? (expandedSubjects[subject.id] ?? true) : (expandedSubjects[subject.id] ?? false);
                        const totalSubthemes = subject.themes.reduce((acc, t) => acc + t.subthemes.length, 0);

                        return (
                            <Card key={subject.id} className="border-slate-200 dark:border-slate-800 overflow-hidden">
                                <CardHeader
                                    onClick={() => toggleSubject(subject.id)}
                                    className="cursor-pointer bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors p-4 flex flex-row items-center justify-between"
                                >
                                    <div className="flex items-center gap-3">
                                        {isExpanded ? (
                                            <ChevronDown className="w-5 h-5 text-primary" />
                                        ) : (
                                            <ChevronRight className="w-5 h-5 text-slate-400" />
                                        )}
                                        <div>
                                            <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                                {subject.name}
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary dark:bg-primary/10 dark:text-primary font-medium">
                                                    {subject.themes.length} temas | {totalSubthemes} subtemas
                                                </span>
                                            </CardTitle>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openThemeModal(subject.id);
                                        }}
                                        className="gap-1 border-slate-300 rounded-md"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Adicionar Tema
                                    </Button>
                                </CardHeader>

                                {isExpanded && (
                                    <CardContent className="p-4 pt-2 space-y-3">
                                        {subject.themes.length === 0 ? (
                                            <p className="text-sm text-slate-400 italic py-2 pl-4">
                                                Nenhum tema cadastrado nesta disciplina.
                                            </p>
                                        ) : (
                                            subject.themes.map(theme => {
                                                const isThemeExpanded = search ? (expandedThemes[theme.id] ?? true) : (expandedThemes[theme.id] ?? false);

                                                return (
                                                    <div
                                                        key={theme.id}
                                                        className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-2 bg-white dark:bg-slate-950"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div
                                                                onClick={() => toggleTheme(theme.id)}
                                                                className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 dark:text-slate-200 hover:text-primary"
                                                            >
                                                                {isThemeExpanded ? (
                                                                    <ChevronDown className="w-4 h-4 text-slate-500" />
                                                                ) : (
                                                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                                                )}
                                                                <span>{theme.name}</span>
                                                                <span className="text-xs text-slate-400 font-normal">
                                                                    ({theme.subthemes.length} subtemas)
                                                                </span>
                                                            </div>

                                                            <div className="flex items-center gap-1">
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => openSubthemeModal(theme.id)}
                                                                    className="h-8 text-xs text-primary hover:text-primary/80 hover:bg-primary/5 gap-1"
                                                                >
                                                                    <Plus className="w-3 h-3" /> Subtema
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => openThemeModal(subject.id, theme)}
                                                                    className="h-8 w-8 p-0 text-slate-500 hover:text-slate-800"
                                                                >
                                                                    <Edit2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => handleDeleteTheme(theme.id)}
                                                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </div>
                                                        </div>

                                                        {isThemeExpanded && (
                                                            <div className="pl-6 pt-1 space-y-1 border-l-2 border-slate-100 dark:border-slate-800 ml-2">
                                                                {theme.subthemes.length === 0 ? (
                                                                    <p className="text-xs text-slate-400 italic">
                                                                        Sem subtemas vinculados.
                                                                    </p>
                                                                ) : (
                                                                    theme.subthemes.map(sub => (
                                                                        <div
                                                                            key={sub.id}
                                                                            className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 p-1.5 rounded transition-colors"
                                                                        >
                                                                            <span className="flex items-center gap-2">
                                                                                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                                                                                {sub.name}
                                                                            </span>
                                                                            <div className="flex items-center gap-1 opacity-80 hover:opacity-100">
                                                                                <button
                                                                                    onClick={() => openSubthemeModal(theme.id, sub)}
                                                                                    className="p-1 hover:text-slate-800 dark:hover:text-slate-200"
                                                                                >
                                                                                    <Edit2 className="w-3 h-3" />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleDeleteSubtheme(sub.id)}
                                                                                    className="p-1 text-red-400 hover:text-red-600"
                                                                                >
                                                                                    <Trash2 className="w-3 h-3" />
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ))
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </CardContent>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Modal Add/Edit Theme */}
            <Dialog open={themeModalOpen} onOpenChange={setThemeModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingTheme ? 'Editar Tema' : 'Novo Tema'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Disciplina</Label>
                            <select
                                value={selectedSubjectId}
                                onChange={(e) => setSelectedSubjectId(e.target.value)}
                                disabled={!!editingTheme}
                                className="w-full border rounded-md p-2 bg-background"
                            >
                                {tree.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>Nome do Tema</Label>
                            <Input
                                placeholder="Ex: Acidez e Basicidade de Compostos"
                                value={themeName}
                                onChange={(e) => setThemeName(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setThemeModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveTheme} disabled={saving} className="bg-primary text-primary-foreground">
                            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Salvar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal Add/Edit Subtheme */}
            <Dialog open={subthemeModalOpen} onOpenChange={setSubthemeModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingSubtheme ? 'Editar Subtema' : 'Novo Subtema'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Nome do Subtema</Label>
                            <Input
                                placeholder="Ex: Acidez e Basicidade de Compostos Orgânicos"
                                value={subthemeName}
                                onChange={(e) => setSubthemeName(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSubthemeModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveSubtheme} disabled={saving} className="bg-primary text-primary-foreground">
                            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Salvar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal Import Excel */}
            <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-primary">
                            <FileSpreadsheet className="w-5 h-5" /> Importar Planilha de Temas & Subtemas
                        </DialogTitle>
                        <DialogDescription>
                            Envie o arquivo Excel (.xlsx ou .csv) contendo as colunas: <strong>Disciplina, Tema, Subtema</strong> (como na planilha Caça Gaps).
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {!importResult ? (
                            <>
                                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 text-center hover:border-primary transition-colors">
                                    <Upload className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Clique para selecionar o arquivo Excel (.xlsx, .csv)
                                    </p>
                                    <input
                                        type="file"
                                        accept=".xlsx, .xls, .csv"
                                        onChange={handleFileUpload}
                                        className="mt-3 mx-auto text-xs text-slate-500 block"
                                    />
                                </div>

                                {excelRows.length > 0 && (
                                    <div className="space-y-2">
                                        <h4 className="font-semibold text-sm text-slate-800">
                                            Pré-visualização ({excelRows.length} linhas encontradas):
                                        </h4>
                                        <div className="max-h-48 overflow-y-auto border rounded divide-y text-xs">
                                            {excelRows.slice(0, 10).map((row, idx) => (
                                                <div key={idx} className="p-2 grid grid-cols-3 gap-2">
                                                    <span className="font-medium text-primary">{row.disciplina}</span>
                                                    <span>{row.tema}</span>
                                                    <span className="text-slate-500">{row.subtema || '-'}</span>
                                                </div>
                                            ))}
                                            {excelRows.length > 10 && (
                                                <div className="p-2 text-center text-slate-400 italic">
                                                    ... e mais {excelRows.length - 10} linhas.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="bg-primary/5 dark:bg-primary/10 p-6 rounded-lg text-center space-y-3">
                                <CheckCircle2 className="w-12 h-12 mx-auto text-primary" />
                                <h3 className="text-lg font-bold text-primary dark:text-primary">
                                    Importação Concluída com Sucesso!
                                </h3>
                                <div className="grid grid-cols-3 gap-2 text-sm max-w-sm mx-auto bg-white dark:bg-slate-900 p-3 rounded-md shadow-sm border">
                                    <div>
                                        <span className="block font-bold text-slate-800">{importResult.createdSubjects}</span>
                                        <span className="text-xs text-slate-500">Disciplinas</span>
                                    </div>
                                    <div>
                                        <span className="block font-bold text-slate-800">{importResult.createdThemes}</span>
                                        <span className="text-xs text-slate-500">Temas</span>
                                    </div>
                                    <div>
                                        <span className="block font-bold text-slate-800">{importResult.createdSubthemes}</span>
                                        <span className="text-xs text-slate-500">Subtemas</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setImportModalOpen(false)}>
                            {importResult ? 'Fechar' : 'Cancelar'}
                        </Button>
                        {!importResult && (
                            <Button
                                onClick={handleConfirmImport}
                                disabled={importing || excelRows.length === 0}
                                className="bg-primary text-primary-foreground gap-2"
                            >
                                {importing && <Loader2 className="w-4 h-4 animate-spin" />}
                                Confirmar Importação ({excelRows.length} linhas)
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <ConfirmModal />
        </PageContainer>
    );
}
