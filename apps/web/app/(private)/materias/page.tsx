'use client';

import React, { useState, useEffect } from 'react';
import { PageContainer, PageHeader, ContentCard } from '@/components/layout';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';
import { Loader2, Trash2, Edit2, Plus, X, Save, Layers } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const API_URL = "/api";

type Subject = {
  id: string;
  name: string;
  isAttendanceSubject: boolean;
  tenantId: string;
  createdAt: string;
};

export default function SubjectsPage() {
  const { showAlert, showConfirm, ConfirmModal } = useConfirmModal();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectName, setSubjectName] = useState('');
  const [isAttendanceSubject, setIsAttendanceSubject] = useState(true);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/subjects`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setSubjects(data);
      }
    } catch (error) {
      console.error('Erro ao buscar disciplinas', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (subject?: Subject) => {
    if (subject) {
      setEditingSubject(subject);
      setSubjectName(subject.name);
      setIsAttendanceSubject(subject.isAttendanceSubject);
    } else {
      setEditingSubject(null);
      setSubjectName('');
      setIsAttendanceSubject(true);
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!subjectName.trim()) {
      showAlert('Campo Obrigatório', 'O nome da disciplina é obrigatório.', 'warning');
      return;
    }
    
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      
      let res;
      if (editingSubject) {
        // Atualizar
        res = await fetch(`${API_URL}/subjects/${editingSubject.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ name: subjectName.trim(), isAttendanceSubject })
        });
      } else {
        // Criar
        res = await fetch(`${API_URL}/subjects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ name: subjectName.trim(), isAttendanceSubject })
        });
      }

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao salvar disciplina');
      }

      setIsModalOpen(false);
      fetchSubjects();
    } catch (error: any) {
      console.error(error);
      showAlert('Erro ao Salvar', error.message || 'Erro interno.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (id: string, force = false) => {
    const msg = force
      ? 'Deseja forçar a exclusão? As questões associadas perderão seus temas e ficarão marcadas como "Sem Tema".'
      : 'Deseja realmente excluir esta disciplina? (Seus temas e subtemas vinculados também serão removidos)';

    showConfirm('Excluir Disciplina', msg, () => handleDelete(id, force), 'danger');
  };

  const handleDelete = async (id: string, force = false) => {
    try {
      const token = localStorage.getItem('token');
      const url = force ? `${API_URL}/subjects/${id}?force=true` : `${API_URL}/subjects/${id}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) {
        const errData = await res.json();
        if (errData.canForce) {
          confirmDelete(id, true);
          return;
        }
        throw new Error(errData.error || 'Erro ao excluir disciplina');
      }
      
      setSubjects(subjects.filter(s => s.id !== id));
    } catch (error: any) {
      console.error('Erro ao excluir', error);
      showAlert('Erro ao Excluir', error.message || 'Erro ao excluir disciplina', 'danger');
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Disciplinas"
        description="Gerencie as matérias (disciplinas) oferecidas na sua unidade. Elas serão utilizadas nas avaliações e relatórios."
        actions={
          <>
            <Link href="/materias/temas">
              <Button variant="outline" className="gap-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-400">
                <Layers className="w-4 h-4" /> Temas e Subtemas (Caça Gaps)
              </Button>
            </Link>
            <Button onClick={() => openModal()} className="gap-2">
              <Plus className="w-4 h-4" /> Nova Disciplina
            </Button>
          </>
        }
      />

      <ContentCard
        title="Disciplinas Cadastradas"
        description="Lista completa de todas as disciplinas ativas no sistema."
      >
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome da Disciplina</TableHead>
                <TableHead>Data de Criação</TableHead>
                <TableHead className="w-[120px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : subjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    Nenhuma disciplina cadastrada ainda.
                  </TableCell>
                </TableRow>
              ) : (
                subjects.map((subject) => (
                  <TableRow key={subject.id}>
                    <TableCell className="font-medium">
                      {subject.name}
                      {!subject.isAttendanceSubject && (
                        <span className="ml-2 inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          Não lista na chamada
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{new Date(subject.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openModal(subject)} className="text-slate-500 hover:text-primary">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => confirmDelete(subject.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </ContentCard>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSubject ? 'Editar Disciplina' : 'Nova Disciplina'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subjectName">Nome da Disciplina</Label>
              <Input 
                id="subjectName" 
                placeholder="Ex: Matemática, Biologia..." 
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSave();
                  }
                }}
              />
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <input 
                type="checkbox" 
                id="isAttendanceSubject" 
                checked={isAttendanceSubject}
                onChange={(e) => setIsAttendanceSubject(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="isAttendanceSubject" className="font-normal cursor-pointer text-sm text-muted-foreground">
                Exibir esta disciplina nas telas de chamada e abonos
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !subjectName.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmModal />
    </PageContainer>
  );
}
