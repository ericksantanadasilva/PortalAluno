import { Router } from 'express';
import { prisma } from '@repo/database';
import { requireAuth, requireStaff } from '../middlewares/auth.middleware';
import { z } from 'zod';

const router = Router();

// ============================================================================
// 1. CHAMADA DIÁRIA (Alunos de uma turma em uma data)
// ============================================================================
router.get('/classes/:classId/students', requireAuth, async (req, res) => {
    try {
        const { classId } = req.params;
        const { lessonId } = req.query; // lessonId (ScheduledClass ID)
        const tenantId = req.user!.tenantId;

        if (!lessonId || typeof lessonId !== 'string') {
            return res.status(400).json({ error: 'lessonId é obrigatório' });
        }

        const scheduledClass = await prisma.scheduledClass.findUnique({
            where: { id: lessonId }
        });

        if (!scheduledClass) {
            return res.status(404).json({ error: 'Aula não encontrada' });
        }

        const targetDate = scheduledClass.date;
        const subjectId = scheduledClass.subjectId;

        // Busca alunos da turma
        const usersInClass = await prisma.user.findMany({
            where: { tenantId, classId, role: 'aluno' },
            select: { id: true, name: true, registrationNumber: true }
        });

        // Busca registros de presença existentes para a aula
        const attendanceRecords = await prisma.attendanceRecord.findMany({
            where: {
                tenantId,
                scheduledClassId: lessonId
            }
        });

        // Busca abonos vigentes na data para esses alunos
        const abonosAtivos = await prisma.attendanceExcuse.findMany({
            where: {
                tenantId,
                studentId: { in: usersInClass.map(u => u.id) },
                status: 'vigente',
                startDate: { lte: targetDate },
                endDate: { gte: targetDate }
            },
            include: { excuseSubjects: true }
        });

        // Monta a resposta (mapeando para o formato esperado pelo frontend)
        const alunos = usersInClass.map(aluno => {
            const record = attendanceRecords.find(r => r.studentId === aluno.id);
            
            // Verifica abono
            const isAbonado = abonosAtivos.some(abono => {
                if (abono.studentId !== aluno.id) return false;
                if (abono.excuseSubjects.length === 0) return true; // Todas as disciplinas
                if (subjectId && abono.excuseSubjects.some(es => es.subjectId === subjectId)) return true;
                return false;
            });

            return {
                id: aluno.id,
                nome: aluno.name,
                matricula: aluno.registrationNumber,
                modalidade: record ? (record.modality === 'online' ? 'Online' : 'Presencial') : 'Presencial', // Fallback
                status_atual: isAbonado ? 'Abonado' : (record ? (record.status === 'presente' ? 'Presente' : 'Falta') : 'Falta')
            };
        });

        res.json(alunos);
    } catch (error) {
        console.error("Erro ao listar alunos para chamada:", error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// Registrar presença/falta/abono
router.post('/record', requireAuth, async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;
        const schema = z.object({
            lessonId: z.string().uuid(),
            studentId: z.string().uuid(),
            status: z.enum(['presente', 'falta', 'abono']),
            modality: z.enum(['presencial', 'online'])
        });

        const data = schema.parse(req.body);

        // Segurança: Alunos só podem registrar a própria presença
        if (req.user!.role === 'aluno' && req.user!.userId !== data.studentId) {
            return res.status(403).json({ error: 'Você só pode registrar sua própria presença.' });
        }

        const scheduledClass = await prisma.scheduledClass.findUnique({
            where: { id: data.lessonId }
        });

        if (!scheduledClass) {
            return res.status(404).json({ error: 'Aula não encontrada' });
        }

        let finalStatus = data.status;

        // Se for registrar falta (ou já veio abono), verificamos se há abono vigente para garantir
        if (finalStatus === 'falta' || finalStatus === 'abono') {
            const hasExcuse = await prisma.attendanceExcuse.findFirst({
                where: {
                    tenantId,
                    studentId: data.studentId,
                    status: 'vigente',
                    startDate: { lte: scheduledClass.date },
                    endDate: { gte: scheduledClass.date },
                    OR: [
                        { excuseSubjects: { none: {} } },
                        { excuseSubjects: { some: { subjectId: scheduledClass.subjectId } } }
                    ]
                }
            });
            if (hasExcuse) {
                finalStatus = 'abono';
            }
        }

        const existing = await prisma.attendanceRecord.findFirst({
            where: { tenantId, scheduledClassId: data.lessonId, studentId: data.studentId }
        });

        if (existing) {
            const updated = await prisma.attendanceRecord.update({
                where: { id: existing.id },
                data: { status: finalStatus, modality: data.modality }
            });
            return res.json(updated);
        } else {
            const created = await prisma.attendanceRecord.create({
                data: {
                    tenantId,
                    scheduledClassId: data.lessonId,
                    studentId: data.studentId,
                    status: finalStatus,
                    modality: data.modality
                }
            });
            return res.json(created);
        }
    } catch (error) {
        console.error("Erro ao salvar presença:", error);
        res.status(500).json({ error: 'Erro interno ao salvar presença' });
    }
});

// ============================================================================
// 2. ABONOS
// ============================================================================
router.get('/excuses', requireAuth, requireStaff, async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;
        const excuses = await prisma.attendanceExcuse.findMany({
            where: { tenantId },
            include: {
                student: { select: { id: true, name: true } },
                excuseSubjects: { include: { subject: { select: { id: true, name: true } } } }
            },
            orderBy: { createdAt: 'desc' }
        });

        const formatted = excuses.map(exc => ({
            id: exc.id,
            alunoId: exc.studentId,
            alunoNome: exc.student.name,
            tipo: exc.type === 'merito' ? 'Mérito' : (exc.type === 'eventualidade' ? 'Eventualidade' : 'Atestado Médico'),
            motivo: exc.reason,
            dataInicio: exc.startDate.toISOString().split('T')[0],
            dataFim: exc.endDate.toISOString().split('T')[0],
            escopo: exc.excuseSubjects.length > 0 ? 'Disciplina Específica' : 'Todas as Disciplinas',
            disciplina: exc.excuseSubjects.length > 0 ? exc.excuseSubjects.map(es => es.subject.name).join(', ') : undefined
        }));

        res.json(formatted);
    } catch (error) {
        console.error("Erro ao listar abonos:", error);
        res.status(500).json({ error: 'Erro interno ao listar abonos' });
    }
});

router.post('/excuses', requireAuth, requireStaff, async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;
        const schema = z.object({
            studentId: z.string().uuid(),
            type: z.enum(['merito', 'eventualidade', 'medico']),
            reason: z.string(),
            startDate: z.string(),
            endDate: z.string(),
            subjectIds: z.array(z.string().uuid()).optional()
        });

        const data = schema.parse(req.body);
        let finalSubjectIds = data.subjectIds || [];

        // Se "todas as matérias" for selecionado (array vazio)
        if (finalSubjectIds.length === 0) {
            const student = await prisma.user.findUnique({
                where: { id: data.studentId },
                include: { class: { include: { modality: { include: { modalitySubjects: true } } } } }
            });
            if (student?.class?.modality?.modalitySubjects) {
                finalSubjectIds = student.class.modality.modalitySubjects.map(ms => ms.subjectId);
            }
        }

        const newExcuse = await prisma.attendanceExcuse.create({
            data: {
                tenantId,
                studentId: data.studentId,
                type: data.type,
                reason: data.reason,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                status: 'vigente', // Simplificação
                ...(finalSubjectIds.length > 0 ? {
                    excuseSubjects: {
                        create: finalSubjectIds.map(id => ({ subjectId: id }))
                    }
                } : {})
            }
        });

        // Retroatividade: Atualizar faltas existentes no período para 'abono'
        const affectedClasses = await prisma.scheduledClass.findMany({
            where: {
                tenantId,
                date: {
                    gte: new Date(data.startDate),
                    lte: new Date(data.endDate)
                },
                ...(finalSubjectIds.length > 0 ? { subjectId: { in: finalSubjectIds } } : {})
            },
            select: { id: true }
        });

        if (affectedClasses.length > 0) {
            await prisma.attendanceRecord.updateMany({
                where: {
                    tenantId,
                    studentId: data.studentId,
                    scheduledClassId: { in: affectedClasses.map(c => c.id) },
                    status: 'falta'
                },
                data: { status: 'abono' }
            });
        }

        res.json(newExcuse);
    } catch (error) {
        console.error("Erro ao criar abono:", error);
        res.status(500).json({ error: 'Erro interno ao criar abono' });
    }
});

router.put('/excuses/:id', requireAuth, requireStaff, async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;
        const { id } = req.params;

        const schema = z.object({
            type: z.enum(['merito', 'eventualidade', 'medico']),
            reason: z.string(),
            startDate: z.string(),
            endDate: z.string(),
            subjectIds: z.array(z.string().uuid()).optional()
        });

        const data = schema.parse(req.body);

        const existingExcuse = await prisma.attendanceExcuse.findUnique({
            where: { id, tenantId }
        });

        if (!existingExcuse) {
            return res.status(404).json({ error: 'Abono não encontrado' });
        }

        let finalSubjectIds = data.subjectIds || [];

        // Se "todas as matérias" for selecionado (array vazio)
        if (finalSubjectIds.length === 0) {
            const student = await prisma.user.findUnique({
                where: { id: existingExcuse.studentId },
                include: { class: { include: { modality: { include: { modalitySubjects: true } } } } }
            });
            if (student?.class?.modality?.modalitySubjects) {
                finalSubjectIds = student.class.modality.modalitySubjects.map(ms => ms.subjectId);
            }
        }

        // Primeiro apaga os subjects antigos se existirem
        await prisma.excuseSubject.deleteMany({
            where: { excuseId: id }
        });

        // Atualiza o abono e insere os novos subjects
        const updatedExcuse = await prisma.attendanceExcuse.update({
            where: { id, tenantId },
            data: {
                type: data.type,
                reason: data.reason,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                ...(finalSubjectIds.length > 0 ? {
                    excuseSubjects: {
                        create: finalSubjectIds.map(subId => ({ subjectId: subId }))
                    }
                } : {})
            }
        });

        // Retroatividade: Atualizar faltas existentes no período para 'abono'
        const affectedClasses = await prisma.scheduledClass.findMany({
            where: {
                tenantId,
                date: {
                    gte: new Date(data.startDate),
                    lte: new Date(data.endDate)
                },
                ...(finalSubjectIds.length > 0 ? { subjectId: { in: finalSubjectIds } } : {})
            },
            select: { id: true }
        });

        if (affectedClasses.length > 0) {
            await prisma.attendanceRecord.updateMany({
                where: {
                    tenantId,
                    studentId: existingExcuse.studentId,
                    scheduledClassId: { in: affectedClasses.map(c => c.id) },
                    status: 'falta'
                },
                data: { status: 'abono' }
            });
        }

        res.json(updatedExcuse);
    } catch (error) {
        console.error("Erro ao atualizar abono:", error);
        res.status(500).json({ error: 'Erro interno ao atualizar abono' });
    }
});

router.delete('/excuses/:id', requireAuth, requireStaff, async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;
        const { id } = req.params;

        await prisma.attendanceExcuse.delete({
            where: { id, tenantId }
        });

        res.status(204).send();
    } catch (error) {
        console.error("Erro ao remover abono:", error);
        res.status(500).json({ error: 'Erro interno ao remover abono' });
    }
});

// ============================================================================
// 3. JANELAS DE PRESENÇA ONLINE
// ============================================================================
router.get('/windows', requireAuth, async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;
        const windows = await prisma.presenceWindow.findMany({
            where: { tenantId },
            include: {
                class: { select: { id: true, name: true } },
                subject: { select: { id: true, name: true } }
            }
        });

        const formatted = windows.map(w => ({
            id: w.id,
            classId: w.classId,
            subjectId: w.subjectId,
            disciplina: w.subject.name, 
            diaSemana: w.dayOfWeek,
            horaAbertura: w.startTime,
            horaFechamento: w.endTime,
            showCard: w.showCard,
            turma: w.class.name 
        }));

        res.json(formatted);
    } catch (error) {
        console.error("Erro ao listar janelas:", error);
        res.status(500).json({ error: 'Erro interno ao listar janelas' });
    }
});

router.post('/windows', requireAuth, requireStaff, async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;
        const schema = z.object({
            id: z.string().uuid().optional(),
            classId: z.string().uuid(),
            subjectId: z.string().uuid(),
            dayOfWeek: z.number().min(0).max(6),
            startTime: z.string(),
            endTime: z.string(),
            showCard: z.boolean().optional()
        });

        const data = schema.parse(req.body);

        if (data.id) {
            const updated = await prisma.presenceWindow.update({
                where: { id: data.id, tenantId },
                data: {
                    classId: data.classId,
                    subjectId: data.subjectId,
                    dayOfWeek: data.dayOfWeek,
                    startTime: data.startTime,
                    endTime: data.endTime,
                    showCard: data.showCard ?? false
                }
            });

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            await prisma.scheduledClass.updateMany({
                where: {
                    presenceWindowId: updated.id,
                    date: { gte: today }
                },
                data: {
                    subjectId: updated.subjectId,
                    startTime: updated.startTime,
                    endTime: updated.endTime
                }
            });

            return res.json(updated);
        } else {
            const created = await prisma.presenceWindow.create({
                data: {
                    tenantId,
                    classId: data.classId,
                    subjectId: data.subjectId,
                    dayOfWeek: data.dayOfWeek,
                    startTime: data.startTime,
                    endTime: data.endTime,
                    showCard: data.showCard ?? false
                }
            });
            return res.json(created);
        }
    } catch (error) {
        console.error("Erro ao salvar janela:", error);
        res.status(500).json({ error: 'Erro interno ao salvar janela' });
    }
});

router.delete('/windows/:id', requireAuth, requireStaff, async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;
        const { id } = req.params;

        await prisma.presenceWindow.delete({
            where: { id, tenantId }
        });

        res.status(204).send();
    } catch (error) {
        console.error("Erro ao remover janela:", error);
        res.status(500).json({ error: 'Erro interno ao remover janela' });
    }
});

export default router;
