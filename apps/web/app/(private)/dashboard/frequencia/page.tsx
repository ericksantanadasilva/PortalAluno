"use client";

import React, { useState, useEffect } from "react";
import { tenantConfigMock } from "@repo/database-mocks";
import { useFrequencia } from "@/contexts/FrequenciaContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ChamadaDiaria } from "@/components/frequencia/ChamadaDiaria";
import { ControleJanelaValidacao } from "@/components/frequencia/ControleJanelaValidacao";
import { HistoricoAbonosView } from "@/components/frequencia/HistoricoAbonosView";
import { ClipboardList, ShieldAlert, Timer, CheckCircle2 } from "lucide-react";

export default function FrequenciaPage() {
  const {
    alunos,
    abonos,
    janelas,
    scheduledClasses,
    classes,
    subjects,
    loadAlunos,
    updateStatus,
    addAbono,
    updateAbono,
    deleteAbono,
    upsertJanela,
    removerJanela
  } = useFrequencia();

  const [turmaSelecionada, setTurmaSelecionada] = useState<string>("");
  const [aulaSelecionada, setAulaSelecionada] = useState<string>("");
  const [dataSelecionada, setDataSelecionada] = useState(
    new Date().toLocaleDateString("en-CA")
  );

  const aulasDoDia = scheduledClasses.filter(c => 
    c.classId === turmaSelecionada && 
    c.date.startsWith(dataSelecionada) && 
    !c.isCanceled
  );

  useEffect(() => {
    if (classes.length > 0 && !turmaSelecionada) {
      setTurmaSelecionada(classes[0].id);
    }
  }, [classes, turmaSelecionada]);

  useEffect(() => {
    if (aulasDoDia.length > 0 && !aulasDoDia.some(a => a.id === aulaSelecionada)) {
      setAulaSelecionada(aulasDoDia[0].id);
    } else if (aulasDoDia.length === 0 && aulaSelecionada !== "") {
      setAulaSelecionada("");
    }
  }, [aulasDoDia, aulaSelecionada]);

  useEffect(() => {
    if (turmaSelecionada && aulaSelecionada) {
      loadAlunos(turmaSelecionada, aulaSelecionada);
    }
  }, [turmaSelecionada, aulaSelecionada, loadAlunos]);

  const handleUpdateStatus = (alunoId: string, status: any) => {
    updateStatus(alunoId, aulaSelecionada, status);
  };

  const primaryHSL = tenantConfigMock.cor_primaria;

  const totalPresentes = alunos.filter((a) => a.status_atual === "Presente").length;
  const totalFaltas = alunos.filter((a) => a.status_atual === "Falta").length;
  const totalAbonados = alunos.filter((a) => a.status_atual === "Abonado").length;

  return (
    <div
      className="w-full min-h-full flex flex-col"
      style={{ "--primary": primaryHSL } as React.CSSProperties}
    >
      <Tabs defaultValue="chamada" className="flex flex-col flex-1 gap-0">
        <div className="border-b border-border bg-card w-full">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 md:px-8 py-2">
            <TabsList
              variant="line"
              className="h-10 w-full sm:w-auto justify-start gap-1 bg-transparent p-0 overflow-x-auto"
            >
              <TabsTrigger
                value="chamada"
                className="flex-none h-10 px-4 gap-2 rounded-none text-sm data-active:text-primary"
              >
                <ClipboardList className="w-4 h-4 shrink-0" />
                Chamada Diária
              </TabsTrigger>
              <TabsTrigger
                value="abonos"
                className="flex-none h-10 px-4 gap-2 rounded-none text-sm data-active:text-primary"
              >
                <ShieldAlert className="w-4 h-4 shrink-0" />
                Abonos
              </TabsTrigger>
              <TabsTrigger
                value="janela"
                className="flex-none h-10 px-4 gap-2 rounded-none text-sm data-active:text-primary"
              >
                <Timer className="w-4 h-4 shrink-0" />
                Janela Online
              </TabsTrigger>
            </TabsList>

            {/* <div className="flex items-center gap-2 shrink-0 pb-1 sm:pb-0">
              <Badge
                variant="outline"
                className="text-xs bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-400 gap-1"
              >
                <CheckCircle2 className="w-3 h-3" />
                {totalPresentes}
              </Badge>
              <Badge
                variant="outline"
                className="text-xs bg-rose-500/10 text-rose-700 border-rose-500/25 dark:text-rose-400"
              >
                {totalFaltas} faltas
              </Badge>
              <Badge
                variant="outline"
                className="text-xs bg-blue-500/10 text-blue-700 border-blue-500/25 dark:text-blue-400"
              >
                {totalAbonados} abonos
              </Badge>
            </div> */}
          </div>
        </div>

        <div className="flex-1 py-4 md:py-6 w-full">
          <TabsContent value="chamada" className="mt-0 outline-none">
            <ChamadaDiaria
              alunos={alunos}
              classes={classes}
              aulas={aulasDoDia}
              onUpdateStatus={handleUpdateStatus}
              turmaSelecionada={turmaSelecionada}
              setTurmaSelecionada={setTurmaSelecionada}
              aulaSelecionada={aulaSelecionada}
              setAulaSelecionada={setAulaSelecionada}
              dataSelecionada={dataSelecionada}
              setDataSelecionada={setDataSelecionada}
            />
          </TabsContent>

          <TabsContent value="abonos" className="mt-0 outline-none px-4 md:px-8">
            <HistoricoAbonosView
              abonos={abonos}
              alunos={alunos}
              subjects={subjects}
              dataReferencia={dataSelecionada}
              onAddAbono={addAbono}
              onEditAbono={(abono) => updateAbono(abono.id, abono)}
              onDeleteAbono={deleteAbono}
            />
          </TabsContent>

          <TabsContent value="janela" className="mt-0 outline-none">
            <ControleJanelaValidacao
              janelas={janelas}
              scheduledClasses={scheduledClasses}
              turmaSelecionada={turmaSelecionada}
              setTurmaSelecionada={setTurmaSelecionada}
              onSalvarJanela={upsertJanela}
              onRemoverJanela={removerJanela}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
