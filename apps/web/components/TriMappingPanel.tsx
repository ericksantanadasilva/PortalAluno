"use client";

import { useState, useEffect } from "react";
import { UploadCloud, FileSpreadsheet, Loader2, Save, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type PreviewData = {
    [sheetName: string]: {
        headers: string[];
        previewRows: (string | number)[][];
    };
};

type Mapping = {
    subject: string;
    tier: string;
    sheetName: string;
    colAcertos: string;
    colLinInf: string;
    colMaxima: string;
    colMinima: string;
    startRow: string;
};

const SUBJECTS = ["MATEMATICA", "NATUREZAS", "HUMANAS", "LINGUAGENS"];
const TIERS = ["principal", "facil", "dificil"];

export function TriMappingPanel() {
    const [file, setFile] = useState<File | null>(null);
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Tab states for visual focus
    const [activeSubjectTab, setActiveSubjectTab] = useState(SUBJECTS[0]);
    const [activePreviewTab, setActivePreviewTab] = useState("");

    // Saved data states
    const [viewerYear, setViewerYear] = useState(new Date().getFullYear().toString());
    const [savedData, setSavedData] = useState<{ subject: string, tier: string, acertos: number, linInf: number, maxima: number, minima: number }[]>([]);
    const [isLoadingSaved, setIsLoadingSaved] = useState(false);

    const [viewerSubjectTab, setViewerSubjectTab] = useState(SUBJECTS[0]);
    const [viewerTierTab, setViewerTierTab] = useState(TIERS[0]);

    // Initialize mapping state
    const initialMappings: Mapping[] = [];
    SUBJECTS.forEach((subject) => {
        TIERS.forEach((tier) => {
            initialMappings.push({
                subject,
                tier,
                sheetName: "",
                colAcertos: "",
                colLinInf: "",
                colMaxima: "",
                colMinima: "",
                startRow: "3",
            });
        });
    });
    const [mappings, setMappings] = useState<Mapping[]>(initialMappings);

    const fetchSavedData = async (targetYear: string) => {
        if (!targetYear) return;
        setIsLoadingSaved(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`/api/tri/${targetYear}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSavedData(data);
            }
        } catch (err) {
            console.error("Erro ao buscar dados salvos", err);
        } finally {
            setIsLoadingSaved(false);
        }
    };

    useEffect(() => {
        fetchSavedData(viewerYear);
    }, [viewerYear]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setPreviewData(null);
        }
    };

    const handleUploadPreview = async () => {
        if (!file) return;
        setIsUploading(true);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/tri/upload-preview", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            if (!res.ok) throw new Error("Erro ao carregar preview");

            const data = await res.json();
            setPreviewData(data);
        } catch (error) {
            console.error(error);
            alert("Erro ao processar o arquivo. Verifique se é uma planilha válida.");
        } finally {
            setIsUploading(false);
        }
    };

    const updateMapping = (subject: string, tier: string, field: keyof Mapping, value: string) => {
        setMappings((prev) =>
            prev.map((m) =>
                m.subject === subject && m.tier === tier ? { ...m, [field]: value } : m
            )
        );
    };

    const handleProcessMapped = async () => {
        if (!file || !year) return;
        setIsProcessing(true);

        // Filter out mappings that don't have a sheetName selected to avoid sending blank rows
        const activeMappings = mappings.filter((m) => m.sheetName !== "");

        const formData = new FormData();
        formData.append("file", file);
        formData.append(
            "mappings",
            JSON.stringify({
                year,
                mappings: activeMappings,
            })
        );

        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/tri/process-mapped", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Erro ao salvar no banco");
            }

            const data = await res.json();
            alert(`Sucesso! ${data.count} linhas processadas e inseridas no banco para o ano ${year}.`);
            // Reset state
            setFile(null);
            setPreviewData(null);
            setMappings(initialMappings);
            setViewerYear(year);
            fetchSavedData(year);
        } catch (error: unknown) {
            console.error(error);
            const msg = error instanceof Error ? error.message : "Erro ao salvar os dados.";
            alert(msg);
        } finally {
            setIsProcessing(false);
        }
    };

    const sheetNames = previewData ? Object.keys(previewData) : [];

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Mapeador Dinâmico de TRI</CardTitle>
                    <CardDescription>
                        Faça o upload da planilha Excel fornecida e mapeie as colunas para o banco de dados.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="year">Ano Letivo (Referência)</Label>
                            <Input
                                id="year"
                                type="number"
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                                placeholder="Ex: 2025"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="file">Planilha Excel (.xlsx)</Label>
                            <Input
                                id="file"
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={handleFileChange}
                            />
                        </div>
                    </div>
                    <Button
                        onClick={handleUploadPreview}
                        disabled={!file || isUploading}
                        className="w-full md:w-auto"
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando Planilha...
                            </>
                        ) : (
                            <>
                                <UploadCloud className="mr-2 h-4 w-4" /> Carregar Planilha para Mapeamento
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {previewData && (
                <Card>
                    <CardHeader>
                        <CardTitle>Mapeamento de Colunas</CardTitle>
                        <CardDescription>
                            Para cada disciplina, selecione a aba e as colunas correspondentes aos dados de TRI.
                            Você não precisa mapear todos os tiers se a planilha não possuir.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs value={activeSubjectTab} onValueChange={setActiveSubjectTab} className="w-full flex-col">
                            <TabsList className="w-full justify-start overflow-x-auto flex-nowrap bg-slate-100 p-1 rounded-md">
                                {SUBJECTS.map((sub) => (
                                    <TabsTrigger
                                        key={sub}
                                        value={sub}
                                        className={`flex-1 py-2 px-4 text-center rounded-md transition-all ${activeSubjectTab === sub ? 'bg-white text-primary shadow border-b-2 border-primary font-bold' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'}`}
                                    >
                                        {sub}
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                            {SUBJECTS.map((sub) => (
                                <TabsContent key={sub} value={sub} className="space-y-6 mt-4">
                                    <div className="grid grid-cols-1 gap-6">
                                        {TIERS.map((tier) => {
                                            const mapData = mappings.find(
                                                (m) => m.subject === sub && m.tier === tier
                                            )!;

                                            // As colunas disponíveis dependem da aba selecionada para este tier específico
                                            const availableHeaders = mapData.sheetName
                                                ? previewData?.[mapData.sheetName]?.headers || []
                                                : [];

                                            return (
                                                <div key={`${sub}-${tier}`} className="p-4 border rounded-lg bg-slate-50/50 space-y-4">
                                                    <h3 className="font-medium text-slate-700 capitalize">
                                                        Tier: {tier}
                                                    </h3>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                                                        <div className="space-y-2 min-w-0">
                                                            <Label>Linha de Início</Label>
                                                            <Input
                                                                type="number"
                                                                min="1"
                                                                placeholder="Ex: 3"
                                                                value={mapData.startRow}
                                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateMapping(sub, tier, "startRow", e.target.value)}
                                                                disabled={!mapData.sheetName}
                                                            />
                                                        </div>
                                                        <div className="space-y-2 min-w-0">
                                                            <Label>Aba da Planilha</Label>
                                                            <Select
                                                                value={mapData.sheetName}
                                                                onValueChange={(val: string | null) => updateMapping(sub, tier, "sheetName", val || "")}
                                                            >
                                                                <SelectTrigger className="w-full truncate [&>span]:truncate">
                                                                    <SelectValue placeholder="Selecione..." />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value=" ">Não preencher</SelectItem>
                                                                    {sheetNames.map((sn) => (
                                                                        <SelectItem key={sn} value={sn}>{sn}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="space-y-2 min-w-0">
                                                            <Label>Col. Acertos</Label>
                                                            <Select
                                                                value={mapData.colAcertos}
                                                                onValueChange={(val: string | null) => updateMapping(sub, tier, "colAcertos", val || "")}
                                                                disabled={!mapData.sheetName}
                                                            >
                                                                <SelectTrigger className="w-full truncate [&>span]:truncate"><SelectValue placeholder="-" /></SelectTrigger>
                                                                <SelectContent>
                                                                    {availableHeaders.map((h, i) => (
                                                                        <SelectItem key={i} value={`${i}___${h || `Col ${i}`}`}>{h || `Col ${i}`}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="space-y-2 min-w-0">
                                                            <Label>Col. Linha Inf.</Label>
                                                            <Select
                                                                value={mapData.colLinInf}
                                                                onValueChange={(val: string | null) => updateMapping(sub, tier, "colLinInf", val || "")}
                                                                disabled={!mapData.sheetName}
                                                            >
                                                                <SelectTrigger className="w-full truncate [&>span]:truncate"><SelectValue placeholder="-" /></SelectTrigger>
                                                                <SelectContent>
                                                                    {availableHeaders.map((h, i) => (
                                                                        <SelectItem key={i} value={`${i}_${h || `Col ${i}`}`}>{h || `Col ${i}`}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="space-y-2 min-w-0">
                                                            <Label>Col. Máxima</Label>
                                                            <Select
                                                                value={mapData.colMaxima}
                                                                onValueChange={(val: string | null) => updateMapping(sub, tier, "colMaxima", val || "")}
                                                                disabled={!mapData.sheetName}
                                                            >
                                                                <SelectTrigger className="w-full truncate [&>span]:truncate"><SelectValue placeholder="-" /></SelectTrigger>
                                                                <SelectContent>
                                                                    {availableHeaders.map((h, i) => (
                                                                        <SelectItem key={i} value={`${i}_${h || `Col ${i}`}`}>{h || `Col ${i}`}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="space-y-2 min-w-0">
                                                            <Label>Col. Mínima</Label>
                                                            <Select
                                                                value={mapData.colMinima}
                                                                onValueChange={(val: string | null) => updateMapping(sub, tier, "colMinima", val || "")}
                                                                disabled={!mapData.sheetName}
                                                            >
                                                                <SelectTrigger className="w-full truncate [&>span]:truncate"><SelectValue placeholder="-" /></SelectTrigger>
                                                                <SelectContent>
                                                                    {availableHeaders.map((h, i) => (
                                                                        <SelectItem key={i} value={`${i}_${h || `Col ${i}`}`}>{h || `Col ${i}`}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </TabsContent>
                            ))}
                        </Tabs>

                        {/* Preview Section */}
                        <div className="mt-8 space-y-4">
                            <h3 className="font-medium text-lg flex items-center gap-2">
                                <FileSpreadsheet className="h-5 w-5 text-primary" />
                                Preview dos Dados (Primeiras 5 Linhas)
                            </h3>
                            <Tabs value={activePreviewTab || sheetNames[0]} onValueChange={setActivePreviewTab} className="w-full flex-col">
                                <TabsList className="w-full justify-start overflow-x-auto flex-nowrap bg-slate-100 p-1 rounded-md">
                                    {sheetNames.map((sn) => (
                                        <TabsTrigger
                                            key={`preview-${sn}`}
                                            value={sn}
                                            className={`py-2 px-4 rounded-md transition-all ${(activePreviewTab || sheetNames[0]) === sn ? 'bg-white text-primary shadow border-b-2 border-primary font-bold' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'}`}
                                        >
                                            {sn}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                                {sheetNames.map((sn) => (
                                    <TabsContent key={`preview-content-${sn}`} value={sn}>
                                        <div className="border rounded-md overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        {previewData?.[sn]?.headers.map((h, i) => (
                                                            <TableHead key={i}>{h || `Col ${i}`}</TableHead>
                                                        ))}
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {previewData?.[sn]?.previewRows.map((row, rowIdx) => (
                                                        <TableRow key={rowIdx}>
                                                            {previewData?.[sn]?.headers.map((_, colIdx) => (
                                                                <TableCell key={colIdx}>
                                                                    {row[colIdx] !== undefined ? String(row[colIdx]) : "-"}
                                                                </TableCell>
                                                            ))}
                                                        </TableRow>
                                                    ))}
                                                    {previewData?.[sn]?.previewRows.length === 0 && (
                                                        <TableRow>
                                                            <TableCell colSpan={previewData?.[sn]?.headers.length || 1} className="text-center text-muted-foreground">
                                                                Nenhum dado encontrado
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </TabsContent>
                                ))}
                            </Tabs>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end border-t pt-6">
                        <Button onClick={handleProcessMapped} disabled={isProcessing} className="w-full md:w-auto">
                            {isProcessing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" /> Importar e Substituir TRI {year}
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {/* Saved Data Viewer */}
            <Card>
                <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="w-5 h-5 text-primary" />
                            Dados Salvos no Banco
                        </CardTitle>
                        <CardDescription>
                            {savedData.length} registros encontrados para o ano letivo selecionado.
                        </CardDescription>
                    </div>
                    <div className="w-full md:w-48">
                        <Label htmlFor="viewerYear" className="text-xs text-slate-500 mb-1 block">Ano Letivo (Consulta)</Label>
                        <Input
                            id="viewerYear"
                            type="number"
                            value={viewerYear}
                            onChange={(e) => setViewerYear(e.target.value)}
                            placeholder="Ex: 2025"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoadingSaved ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : savedData.length > 0 ? (
                        <div className="space-y-4">
                            <Tabs value={viewerSubjectTab} onValueChange={setViewerSubjectTab} className="w-full flex-col">
                                <TabsList className="w-full justify-start overflow-x-auto flex-nowrap bg-slate-100 p-1 rounded-md">
                                    {SUBJECTS.map((sub) => (
                                        <TabsTrigger
                                            key={`viewer-sub-${sub}`}
                                            value={sub}
                                            className={`flex-1 py-2 px-4 text-center rounded-md transition-all ${viewerSubjectTab === sub ? 'bg-white text-primary shadow border-b-2 border-primary font-bold' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'}`}
                                        >
                                            {sub}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </Tabs>

                            <Tabs value={viewerTierTab} onValueChange={setViewerTierTab} className="w-full flex-col">
                                <TabsList className="w-full justify-start overflow-x-auto flex-nowrap bg-slate-50 p-1 rounded-md border">
                                    {TIERS.map((tier) => (
                                        <TabsTrigger
                                            key={`viewer-tier-${tier}`}
                                            value={tier}
                                            className={`flex-1 py-1.5 px-4 text-center rounded-md transition-all capitalize ${viewerTierTab === tier ? 'bg-primary text-primary-foreground shadow font-medium' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'}`}
                                        >
                                            {tier}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </Tabs>

                            <div className="border rounded-md max-h-[400px] overflow-y-auto relative bg-white">
                                <table className="w-full text-sm text-left">
                                    <thead className="sticky top-0 bg-slate-100 shadow-sm z-10 text-slate-700">
                                        <tr>
                                            <th className="h-10 px-4 font-medium border-b w-24">Acertos</th>
                                            <th className="h-10 px-4 font-medium border-b">Linha Inferior</th>
                                            <th className="h-10 px-4 font-medium border-b">Máxima</th>
                                            <th className="h-10 px-4 font-medium border-b">Mínima</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {savedData
                                            .filter(d => d.subject === viewerSubjectTab && d.tier === viewerTierTab)
                                            .map((d, i) => (
                                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                    <td className="p-3 px-4 font-medium">{d.acertos}</td>
                                                    <td className="p-3 px-4">{d.linInf}</td>
                                                    <td className="p-3 px-4">{d.maxima}</td>
                                                    <td className="p-3 px-4">{d.minima}</td>
                                                </tr>
                                            ))}
                                        {savedData.filter(d => d.subject === viewerSubjectTab && d.tier === viewerTierTab).length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="text-center text-muted-foreground p-8">
                                                    Nenhum dado encontrado para {viewerSubjectTab} ({viewerTierTab}).
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center p-8 text-slate-500 bg-slate-50 rounded-lg border border-dashed">
                            Nenhum dado de TRI salvo para o ano de {viewerYear}.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
