import { Router } from 'express';
import { prisma } from '@repo/database';
import { requireAuth, requireStaff } from '../middlewares/auth.middleware';
import { z } from 'zod';
import { startOfWeek, endOfWeek, addDays, setHours, setMinutes, parse } from 'date-fns';

const router = Router();

// ============================================================================
// 1. GERAR AULAS DA SEMANA (A partir das janelas)
// ============================================================================
router.post('/generate', requireAuth, requireStaff, async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;
        const schema = z.object({
            date: z.string().optional() // Qualquer data na semana que queremos gerar, default hoje
        });
        const data = schema.parse(req.body);

        const targetDate = data.date ? new Date(data.date) : new Date();
        const start = startOfWeek(targetDate, { weekStartsOn: 0 }); // Domingo
        const end = endOfWeek(targetDate, { weekStartsOn: 0 }); // Sábado

        // Busca as janelas online ativas do tenant
        const windows = await prisma.presenceWindow.findMany({
            where: { tenantId }
        });

        // Busca aulas já geradas para essa semana para não duplicar
        const existingClasses = await prisma.scheduledClass.findMany({
            where: {
                tenantId,
                date: {
                    gte: start,
                    lte: end
                }
            }
        });

        const newClasses = [];

        for (const window of windows) {
            // dia da semana da janela (0 = Domingo, 1 = Segunda, etc.)
            const dateOfWindow = addDays(start, window.dayOfWeek);

            // Verifica se já existe uma aula gerada por essa janela neste dia específico
            const exists = existingClasses.some(c => 
                c.presenceWindowId === window.id && 
                c.date.toISOString().split('T')[0] === dateOfWindow.toISOString().split('T')[0]
            );

            if (!exists) {
                newClasses.push({
                    tenantId,
                    classId: window.classId,
                    subjectId: window.subjectId,
                    presenceWindowId: window.id,
                    date: dateOfWindow,
                    startTime: window.startTime,
                    endTime: window.endTime,
                    showCard: window.showCard,
                    isCanceled: false
                });
            }
        }

        if (newClasses.length > 0) {
            await prisma.scheduledClass.createMany({
                data: newClasses
            });
        }

        res.json({ message: 'Aulas geradas com sucesso', count: newClasses.length });
    } catch (error) {
        console.error("Erro ao gerar aulas da semana:", error);
        res.status(500).json({ error: 'Erro interno ao gerar aulas da semana' });
    }
});

// ============================================================================
// 2. LISTAR AULAS AGENDADAS
// ============================================================================
router.get('/', requireAuth, async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;
        const { startDate, endDate, classId } = req.query;

        const whereClause: any = { tenantId };

        if (classId && typeof classId === 'string') {
            whereClause.classId = classId;
        }

        if (startDate && endDate && typeof startDate === 'string' && typeof endDate === 'string') {
            whereClause.date = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }

        const scheduledClasses = await prisma.scheduledClass.findMany({
            where: whereClause,
            include: {
                subject: { select: { name: true } },
                class: { select: { name: true } }
            },
            orderBy: [
                { date: 'asc' },
                { startTime: 'asc' }
            ]
        });

        res.json(scheduledClasses);
    } catch (error) {
        console.error("Erro ao listar aulas agendadas:", error);
        res.status(500).json({ error: 'Erro interno ao listar aulas agendadas' });
    }
});

// ============================================================================
// 3. ATUALIZAR AULA (Cancelar, Trocar matéria, Mostrar Card)
// ============================================================================
router.put('/:id', requireAuth, requireStaff, async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;
        const { id } = req.params;

        const schema = z.object({
            subjectId: z.string().uuid().optional(),
            showCard: z.boolean().optional(),
            isCanceled: z.boolean().optional(),
            startTime: z.string().optional(),
            endTime: z.string().optional()
        });
        const data = schema.parse(req.body);

        const updated = await prisma.scheduledClass.update({
            where: { id, tenantId },
            data,
            include: {
                subject: { select: { name: true } },
                class: { select: { name: true } }
            }
        });

        res.json(updated);
    } catch (error) {
        console.error("Erro ao atualizar aula agendada:", error);
        res.status(500).json({ error: 'Erro interno ao atualizar aula agendada' });
    }
});

export default router;
