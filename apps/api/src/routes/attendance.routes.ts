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
        const { date, subjectId } = req.query; // date (YYYY-MM-DD), subjectId (uuid)
        const tenantId = req.user!.tenantId;

        if (!date || typeof date !== 'string') {
            return res.status(400).json({ error: 'Data é obrigatória no formato YYYY-MM-DD' });
        }

        // Busca alunos da turma
        const usersInClass = await prisma.user.findMany({
            where: { tenantId, classId, role: 'aluno' },
            select: { id: true, name: true, registrationNumber: true }
        });

        // Busca registros de presença existentes para a data e disciplina
        const attendanceRecords = await prisma.attendanceRecord.findMany({
            where: {
                tenantId,
                classId,
                ...(subjectId && typeof subjectId === 'string' ? { subjectId } : {}),
                date: new Date(date)
            }
        });

        // Busca abonos vigentes na data para esses alunos
        const abonosAtivos = await prisma.attendanceExcuse.findMany({
            where: {
                tenantId,
                studentId: { in: usersInClass.map(u => u.id) },
                status: 'vigente',
                startDate: { lte: new Date(date) },
                endDate: { gte: new Date(date) }
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

// Registrar presença/falta
router.post('/record', requireAuth, async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;
        const schema = z.object({
            classId: z.string().uuid(),
            studentId: z.string().uuid(),
            subjectId: z.string().uuid(),
            date: z.string(),
            status: z.enum(['presente', 'falta']),
            modality: z.enum(['presencial', 'online'])
        });

        const data = schema.parse(req.body);
        const dateObj = new Date(data.date);

        // Segurança: Alunos só podem registrar a própria presença
        if (req.user!.role === 'aluno' && req.user!.userId !== data.studentId) {
            return res.status(403).json({ error: 'Você só pode registrar sua própria presença.' });
        }

        const existing = await prisma.attendanceRecord.findFirst({
            where: { tenantId, classId: data.classId, subjectId: data.subjectId, studentId: data.studentId, date: dateObj }
        });

        if (existing) {
            const updated = await prisma.attendanceRecord.update({
                where: { id: existing.id },
                data: { status: data.status, modality: data.modality }
            });
            return res.json(updated);
        } else {
            const created = await prisma.attendanceRecord.create({
                data: {
                    tenantId,
                    classId: data.classId,
                    subjectId: data.subjectId,
                    studentId: data.studentId,
                    date: dateObj,
                    status: data.status,
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

        const newExcuse = await prisma.attendanceExcuse.create({
            data: {
                tenantId,
                studentId: data.studentId,
                type: data.type,
                reason: data.reason,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                status: 'vigente', // Simplificação
                ...(data.subjectIds && data.subjectIds.length > 0 ? {
                    excuseSubjects: {
                        create: data.subjectIds.map(id => ({ subjectId: id }))
                    }
                } : {})
            }
        });

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
                ...(data.subjectIds && data.subjectIds.length > 0 ? {
                    excuseSubjects: {
                        create: data.subjectIds.map(subId => ({ subjectId: subId }))
                    }
                } : {})
            }
        });

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
            endTime: z.string()
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
                    endTime: data.endTime
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
                    endTime: data.endTime
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
