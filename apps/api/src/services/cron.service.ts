import cron from 'node-cron';
import { prisma } from '@repo/database';
import { startOfWeek, endOfWeek, addDays } from 'date-fns';

export function startCronJobs() {
    // Roda todo domingo às 00:05
    cron.schedule('5 0 * * 0', async () => {
        console.log('[CRON] Iniciando geração de aulas da semana...');
        try {
            const tenants = await prisma.tenant.findMany({ select: { id: true } });

            for (const tenant of tenants) {
                const targetDate = new Date();
                const start = startOfWeek(targetDate, { weekStartsOn: 0 }); // Domingo
                const end = endOfWeek(targetDate, { weekStartsOn: 0 }); // Sábado

                const windows = await prisma.presenceWindow.findMany({
                    where: { tenantId: tenant.id }
                });

                const existingClasses = await prisma.scheduledClass.findMany({
                    where: {
                        tenantId: tenant.id,
                        date: { gte: start, lte: end }
                    }
                });

                const newClasses = [];

                for (const window of windows) {
                    const dateOfWindow = addDays(start, window.dayOfWeek);

                    const exists = existingClasses.some(c => 
                        c.presenceWindowId === window.id && 
                        c.date.toISOString().split('T')[0] === dateOfWindow.toISOString().split('T')[0]
                    );

                    if (!exists) {
                        newClasses.push({
                            tenantId: tenant.id,
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
                    console.log(`[CRON] ${newClasses.length} aulas geradas para o tenant ${tenant.id}.`);
                }
            }
            console.log('[CRON] Geração finalizada com sucesso.');
        } catch (error) {
            console.error('[CRON] Erro ao gerar aulas semanais:', error);
        }
    });
}
