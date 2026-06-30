"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { type AlunoChamada, type HistoricoAbono, type StatusChamada } from "@repo/database-mocks";

type JanelaValidacaoSaaS = {
  id: string;
  classId: string;
  subjectId: string;
  disciplina: string;
  diaSemana: number;
  horaAbertura: string;
  horaFechamento: string;
  turma: string;
};

type FrequenciaContextValue = {
  alunos: AlunoChamada[];
  abonos: HistoricoAbono[];
  janelas: JanelaValidacaoSaaS[];
  classes: any[];
  subjects: any[];
  loadingAlunos: boolean;
  loadAlunos: (classId: string, date: string, subjectId?: string) => Promise<void>;
  loadAbonos: () => Promise<void>;
  loadJanelas: () => Promise<void>;
  updateStatus: (studentId: string, classId: string, date: string, subjectId: string, status: StatusChamada) => Promise<void>;
  addAbono: (abono: any) => Promise<void>;
  updateAbono: (id: string, abono: any) => Promise<void>;
  deleteAbono: (id: string) => Promise<void>;
  upsertJanela: (janela: any) => Promise<boolean>;
  removerJanela: (id: string) => Promise<void>;
  confirmarPresencaOnline: (alunoId: string, classId: string, date: string, subjectId: string) => Promise<void>;
};

const FrequenciaContext = createContext<FrequenciaContextValue | null>(null);

export function FrequenciaProvider({ children }: { children: React.ReactNode }) {
  const [alunos, setAlunos] = useState<AlunoChamada[]>([]);
  const [abonos, setAbonos] = useState<HistoricoAbono[]>([]);
  const [janelas, setJanelas] = useState<JanelaValidacaoSaaS[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loadingAlunos, setLoadingAlunos] = useState(false);

  const getToken = () => localStorage.getItem('token');

  const loadClassesAndSubjects = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const [resClasses, resSubjects] = await Promise.all([
        fetch('http://localhost:3001/api/classes', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('http://localhost:3001/api/subjects', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (resClasses.ok) setClasses(await resClasses.json());
      if (resSubjects.ok) {
        const data = await resSubjects.json();
        setSubjects(data.filter((s: any) => s.isAttendanceSubject !== false));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadAlunos = useCallback(async (classId: string, date: string, subjectId?: string) => {
    const token = getToken();
    if (!token || !classId || !date) return;
    setLoadingAlunos(true);
    try {
      const query = new URLSearchParams({ date });
      if (subjectId) query.append('subjectId', subjectId);

      const res = await fetch(`http://localhost:3001/api/attendance/classes/${classId}/students?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAlunos(data);
      }
    } catch (error) {
      console.error("Erro ao carregar alunos", error);
    } finally {
      setLoadingAlunos(false);
    }
  }, []);

  const loadAbonos = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:3001/api/attendance/excuses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAbonos(data);
      }
    } catch (error) {
      console.error("Erro ao carregar abonos", error);
    }
  }, []);

  const loadJanelas = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:3001/api/attendance/windows`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setJanelas(data);
      }
    } catch (error) {
      console.error("Erro ao carregar janelas", error);
    }
  }, []);

  const updateStatus = useCallback(async (studentId: string, classId: string, date: string, subjectId: string, status: StatusChamada) => {
    const token = getToken();
    if (!token || !subjectId) return;
    
    // Otimista
    setAlunos(prev => prev.map(a => a.id === studentId ? { ...a, status_atual: status } : a));

    try {
      await fetch(`http://localhost:3001/api/attendance/record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          classId,
          studentId,
          subjectId,
          date,
          status: status === 'Presente' ? 'presente' : 'falta',
          modality: 'presencial' // Simplificação para chamada manual
        })
      });
    } catch (error) {
      console.error(error);
      loadAlunos(classId, date, subjectId); // Reverte caso dê erro
    }
  }, [loadAlunos]);

  const addAbono = useCallback(async (abono: any) => {
    const token = getToken();
    if (!token) return;
    try {
      let typeEnum = 'eventualidade';
      if (abono.tipo === 'Mérito') typeEnum = 'merito';
      else if (abono.tipo === 'Atestado Médico') typeEnum = 'medico';

      const payload: any = {
        studentId: abono.alunoId,
        type: typeEnum,
        reason: abono.motivo,
        startDate: abono.dataInicio,
        endDate: abono.dataFim,
      };

      if (abono.subjectIds && abono.subjectIds.length > 0) {
        payload.subjectIds = abono.subjectIds;
      }
      
      const res = await fetch(`http://localhost:3001/api/attendance/excuses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        loadAbonos();
      } else {
        const errorText = await res.text();
        console.error("Erro ao salvar abono na API:", res.status, errorText);
      }
    } catch (error) {
      console.error("Exceção ao salvar abono:", error);
    }
  }, [loadAbonos]);

  const updateAbono = useCallback(async (id: string, abono: any) => {
    const token = getToken();
    if (!token) return;
    try {
      let typeEnum = 'eventualidade';
      if (abono.tipo === 'Mérito') typeEnum = 'merito';
      else if (abono.tipo === 'Atestado Médico') typeEnum = 'medico';

      const payload: any = {
        type: typeEnum,
        reason: abono.motivo,
        startDate: abono.dataInicio,
        endDate: abono.dataFim,
      };

      if (abono.subjectIds && abono.subjectIds.length > 0) {
        payload.subjectIds = abono.subjectIds;
      } else if (abono.escopo === "Todas as Disciplinas") {
        payload.subjectIds = []; // limpa matérias
      }
      
      const res = await fetch(`http://localhost:3001/api/attendance/excuses/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        loadAbonos();
      } else {
        const errorText = await res.text();
        console.error("Erro ao atualizar abono:", res.status, errorText);
      }
    } catch (error) {
      console.error("Exceção ao atualizar abono:", error);
    }
  }, [loadAbonos]);

  const deleteAbono = useCallback(async (id: string) => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:3001/api/attendance/excuses/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        loadAbonos();
      } else {
        console.error("Erro ao remover abono", await res.text());
      }
    } catch (error) {
      console.error("Exceção ao remover abono:", error);
    }
  }, [loadAbonos]);

  const upsertJanela = useCallback(async (janela: any): Promise<boolean> => {
    const token = getToken();
    if (!token) return false;
    try {
      const payload = {
        id: janela.id,
        classId: janela.classId,
        subjectId: janela.subjectId,
        dayOfWeek: janela.diaSemana,
        startTime: janela.horaAbertura,
        endTime: janela.horaFechamento
      };

      const res = await fetch(`http://localhost:3001/api/attendance/windows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        loadJanelas();
        return true;
      } else {
        const errorText = await res.text();
        console.error("Erro ao salvar janela na API:", res.status, errorText);
      }
    } catch (error) {
      console.error("Exceção ao salvar janela:", error);
    }
    return false;
  }, [loadJanelas]);

  const removerJanela = useCallback(async (id: string) => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:3001/api/attendance/windows/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        loadJanelas();
      }
    } catch (error) {
      console.error(error);
    }
  }, [loadJanelas]);

  const confirmarPresencaOnline = useCallback(async (studentId: string, classId: string, date: string, subjectId: string) => {
    updateStatus(studentId, classId, date, subjectId, 'Presente');
  }, [updateStatus]);

  useEffect(() => {
    loadClassesAndSubjects();
    loadAbonos();
    loadJanelas();
  }, [loadClassesAndSubjects, loadAbonos, loadJanelas]);

  return (
    <FrequenciaContext.Provider
      value={{
        alunos,
        abonos,
        janelas,
        classes,
        subjects,
        loadingAlunos,
        loadAlunos,
        loadAbonos,
        loadJanelas,
        updateStatus,
        addAbono,
        updateAbono,
        deleteAbono,
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
