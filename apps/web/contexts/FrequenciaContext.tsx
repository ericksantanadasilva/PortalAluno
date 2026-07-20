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
  showCard: boolean;
};

export type ScheduledClass = {
  id: string;
  classId: string;
  subjectId: string;
  date: string;
  startTime: string;
  endTime: string;
  showCard: boolean;
  isCanceled: boolean;
  subject?: { name: string };
  class?: { name: string };
};

type FrequenciaContextValue = {
  alunos: AlunoChamada[];
  abonos: HistoricoAbono[];
  janelas: JanelaValidacaoSaaS[];
  scheduledClasses: ScheduledClass[];
  classes: any[];
  subjects: any[];
  loadingAlunos: boolean;
  loadAlunos: (classId: string, lessonId: string) => Promise<void>;
  loadAbonos: () => Promise<void>;
  loadJanelas: () => Promise<void>;
  loadScheduledClasses: (classId?: string, startDate?: string, endDate?: string) => Promise<void>;
  generateScheduledClasses: (date?: string) => Promise<boolean>;
  updateScheduledClass: (id: string, data: any) => Promise<boolean>;
  updateStatus: (studentId: string, lessonId: string, status: StatusChamada) => Promise<void>;
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
  const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loadingAlunos, setLoadingAlunos] = useState(false);

  const getToken = () => localStorage.getItem('token');

  const loadClassesAndSubjects = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const [resClasses, resSubjects] = await Promise.all([
        fetch('/api/classes', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/subjects', { headers: { Authorization: `Bearer ${token}` } })
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

  const loadAlunos = useCallback(async (classId: string, lessonId: string) => {
    const token = getToken();
    if (!token || !classId || !lessonId) return;
    setLoadingAlunos(true);
    try {
      const query = new URLSearchParams({ lessonId });

      const res = await fetch(`/api/attendance/classes/${classId}/students?${query.toString()}`, {
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
      const res = await fetch(`/api/attendance/excuses`, {
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
      const res = await fetch(`/api/attendance/windows`, {
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

  const loadScheduledClasses = useCallback(async (classId?: string, startDate?: string, endDate?: string) => {
    const token = getToken();
    if (!token) return;
    try {
      const query = new URLSearchParams();
      if (classId) query.append('classId', classId);
      if (startDate) query.append('startDate', startDate);
      if (endDate) query.append('endDate', endDate);

      const res = await fetch(`/api/scheduled-classes?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setScheduledClasses(await res.json());
      }
    } catch (error) {
      console.error("Erro ao carregar aulas agendadas", error);
    }
  }, []);

  const generateScheduledClasses = useCallback(async (date?: string) => {
    const token = getToken();
    if (!token) return false;
    try {
      const res = await fetch(`/api/scheduled-classes/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(date ? { date } : {})
      });
      if (res.ok) {
        await loadScheduledClasses();
        return true;
      }
    } catch (error) {
      console.error("Erro ao gerar aulas agendadas", error);
    }
    return false;
  }, [loadScheduledClasses]);

  const updateScheduledClass = useCallback(async (id: string, data: any) => {
    const token = getToken();
    if (!token) return false;
    try {
      const res = await fetch(`/api/scheduled-classes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        await loadScheduledClasses();
        return true;
      }
    } catch (error) {
      console.error("Erro ao atualizar aula agendada", error);
    }
    return false;
  }, [loadScheduledClasses]);

  const updateStatus = useCallback(async (studentId: string, lessonId: string, status: StatusChamada) => {
    const token = getToken();
    if (!token || !lessonId) return;
    
    // Otimista
    setAlunos(prev => prev.map(a => a.id === studentId ? { ...a, status_atual: status } : a));

    try {
      const res = await fetch(`/api/attendance/record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          lessonId,
          studentId,
          status: status === 'Presente' ? 'presente' : 'falta',
          modality: 'presencial' // Simplificação para chamada manual
        })
      });
      if (!res.ok) throw new Error("Erro na API");
    } catch (error) {
      console.error(error);
      // idealmente recarregar via loadAlunos, mas omitido fallback local para simplicidade
    }
  }, []);

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
      
      const res = await fetch(`/api/attendance/excuses`, {
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
      
      const res = await fetch(`/api/attendance/excuses/${id}`, {
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
      const res = await fetch(`/api/attendance/excuses/${id}`, {
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
        endTime: janela.horaFechamento,
        showCard: janela.showCard
      };

      const res = await fetch(`/api/attendance/windows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        loadJanelas();
        loadScheduledClasses();
        return true;
      } else {
        const errorText = await res.text();
        console.error("Erro ao salvar janela na API:", res.status, errorText);
      }
    } catch (error) {
      console.error("Exceção ao salvar janela:", error);
    }
    return false;
  }, [loadJanelas, loadScheduledClasses]);

  const removerJanela = useCallback(async (id: string) => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`/api/attendance/windows/${id}`, {
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
    loadScheduledClasses();

    // Polling global a cada 10 segundos para manter tudo em tempo real entre diferentes abas
    const interval = setInterval(() => {
      loadScheduledClasses();
    }, 10000);

    return () => clearInterval(interval);
  }, [loadClassesAndSubjects, loadAbonos, loadJanelas, loadScheduledClasses]);

  return (
    <FrequenciaContext.Provider
      value={{
        alunos,
        abonos,
        janelas,
        scheduledClasses,
        classes,
        subjects,
        loadingAlunos,
        loadAlunos,
        loadAbonos,
        loadJanelas,
        loadScheduledClasses,
        generateScheduledClasses,
        updateScheduledClass,
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
