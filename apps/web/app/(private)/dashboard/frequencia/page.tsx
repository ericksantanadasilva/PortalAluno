"use client";

import React, { useState, useEffect } from "react";
import { useFrequencia } from "@/contexts/FrequenciaContext";
import { PageContainer, PageHeader, SubNav } from "@/components/layout";
import { ChamadaDiaria } from "@/components/frequencia/ChamadaDiaria";
import { ControleJanelaValidacao } from "@/components/frequencia/ControleJanelaValidacao";
import { HistoricoAbonosView } from "@/components/frequencia/HistoricoAbonosView";
import { ClipboardList, ShieldAlert, Timer } from "lucide-react";

const FREQUENCIA_TABS = [
  { id: "chamada", label: "Chamada Diária", icon: ClipboardList },
  { id: "abonos", label: "Abonos", icon: ShieldAlert },
  { id: "janela", label: "Janela Online", icon: Timer },
];

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

  const [activeTab, setActiveTab] = useState<string>("chamada");
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
      setAulaSelecionada(aulasDoDia[0]?.id || "");
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

  return (
    <PageContainer>
      <PageHeader
        title="Frequência & Abonos"
        description="Controle de chamada diária, registro de abonos de alunos e gerenciamento das janelas de validação."
        icon={<ClipboardList className="w-8 h-8 text-primary" />}
      />

      <SubNav
        tabs={FREQUENCIA_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="flex-1 py-4 md:py-6 w-full">
        {activeTab === "chamada" && (
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
        )}

        {activeTab === "abonos" && (
          <HistoricoAbonosView
            abonos={abonos}
            alunos={alunos}
            subjects={subjects}
            dataReferencia={dataSelecionada}
            onAddAbono={addAbono}
            onEditAbono={(abono) => updateAbono(abono.id, abono)}
            onDeleteAbono={deleteAbono}
          />
        )}

        {activeTab === "janela" && (
          <ControleJanelaValidacao
            janelas={janelas}
            scheduledClasses={scheduledClasses}
            turmaSelecionada={turmaSelecionada}
            setTurmaSelecionada={setTurmaSelecionada}
            onSalvarJanela={upsertJanela}
            onRemoverJanela={removerJanela}
          />
        )}
      </div>
    </PageContainer>
  );
}
