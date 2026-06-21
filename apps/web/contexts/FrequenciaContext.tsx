"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import {
  listaAlunosChamada as initialAlunos,
  historicoAbonos as initialAbonos,
  janelasValidacaoMock as initialJanelas,
  type AlunoChamada,
  type HistoricoAbono,
  type JanelaValidacao,
  type StatusChamada,
} from "@repo/database-mocks";

type FrequenciaContextValue = {
  alunos: AlunoChamada[];
  abonos: HistoricoAbono[];
  janelas: JanelaValidacao[];
  updateStatus: (id: string, status: StatusChamada) => void;
  addAbono: (abono: Omit<HistoricoAbono, "id">) => void;
  upsertJanela: (janela: Omit<JanelaValidacao, "id"> & { id?: string }) => boolean;
  removerJanela: (id: string) => void;
  confirmarPresencaOnline: (alunoId: string) => void;
};

const FrequenciaContext = createContext<FrequenciaContextValue | null>(null);

export function FrequenciaProvider({ children }: { children: React.ReactNode }) {
  const [alunos, setAlunos] = useState<AlunoChamada[]>(initialAlunos);
  const [abonos, setAbonos] = useState<HistoricoAbono[]>(initialAbonos);
  const [janelas, setJanelas] = useState<JanelaValidacao[]>(initialJanelas);

  const updateStatus = useCallback((id: string, status: StatusChamada) => {
    setAlunos((prev) =>
      prev.map((aluno) => (aluno.id === id ? { ...aluno, status_atual: status } : aluno))
    );
  }, []);

  const addAbono = useCallback(
    (newAbono: Omit<HistoricoAbono, "id">) => {
      const abono: HistoricoAbono = { ...newAbono, id: `ab-saas-${Date.now()}` };
      setAbonos((prev) => [abono, ...prev]);
      updateStatus(newAbono.alunoId, "Abonado");
    },
    [updateStatus]
  );

  const upsertJanela = useCallback(
    (payload: Omit<JanelaValidacao, "id"> & { id?: string }): boolean => {
      let sucesso = false;

      setJanelas((prev) => {
        const conflito = prev.find(
          (j) =>
            j.id !== payload.id &&
            j.disciplina === payload.disciplina &&
            j.diaSemana === payload.diaSemana &&
            j.turma === payload.turma
        );

        if (conflito) return prev;

        if (payload.id) {
          const existe = prev.some((j) => j.id === payload.id);
          if (!existe) return prev;

          sucesso = true;
          return prev.map((j) =>
            j.id === payload.id ? { ...payload, id: payload.id } : j
          );
        }

        sucesso = true;
        return [{ ...payload, id: `jv-${Date.now()}` }, ...prev];
      });

      return sucesso;
    },
    []
  );

  const removerJanela = useCallback((id: string) => {
    setJanelas((prev) => prev.filter((j) => j.id !== id));
  }, []);

  const confirmarPresencaOnline = useCallback((alunoId: string) => {
    setAlunos((prev) =>
      prev.map((aluno) =>
        aluno.id === alunoId ? { ...aluno, status_atual: "Presente" } : aluno
      )
    );
  }, []);

  return (
    <FrequenciaContext.Provider
      value={{
        alunos,
        abonos,
        janelas,
        updateStatus,
        addAbono,
        upsertJanela,
        removerJanela,
        confirmarPresencaOnline,
      }}
    >
      {children}
    </FrequenciaContext.Provider>
  );
}

export function useFrequencia() {
  const ctx = useContext(FrequenciaContext);
  if (!ctx) {
    throw new Error("useFrequencia deve ser usado dentro de FrequenciaProvider");
  }
  return ctx;
}
