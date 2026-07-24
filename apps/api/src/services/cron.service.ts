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

    // Roda todo dia às 23:55 para consolidar presenças
    cron.schedule('55 23 * * *', async () => {
        console.log('[CRON] Iniciando consolidação diária de chamadas...');
        try {
            const today = new Date();
            const startOfToday = new Date(today);
            startOfToday.setHours(0, 0, 0, 0);
            const endOfToday = new Date(today);
            endOfToday.setHours(23, 59, 59, 999);

            const classesToConsolidate = await prisma.scheduledClass.findMany({
                where: {
                    date: {
                        gte: startOfToday,
                        lte: endOfToday
                    },
                    isCanceled: false
                }
            });

            for (const scheduledClass of classesToConsolidate) {
                const students = await prisma.user.findMany({
                    where: { tenantId: scheduledClass.tenantId, classId: scheduledClass.classId, role: 'aluno' },
                    select: { id: true }
                });

                const existingRecords = await prisma.attendanceRecord.findMany({
                    where: { tenantId: scheduledClass.tenantId, scheduledClassId: scheduledClass.id },
                    select: { studentId: true }
                });
                
                const existingStudentIds = new Set(existingRecords.map(r => r.studentId));
                
                const missingStudents = students.filter(s => !existingStudentIds.has(s.id));

                if (missingStudents.length === 0) continue;

                // Buscar abonos vigentes
                const activeExcuses = await prisma.attendanceExcuse.findMany({
                    where: {
                        tenantId: scheduledClass.tenantId,
                        studentId: { in: missingStudents.map(s => s.id) },
                        status: 'vigente',
                        startDate: { lte: scheduledClass.date },
                        endDate: { gte: scheduledClass.date },
                        OR: [
                            { excuseSubjects: { none: {} } },
                            { excuseSubjects: { some: { subjectId: scheduledClass.subjectId } } }
                        ]
                    },
                    select: { studentId: true }
                });

                const excusedStudentIds = new Set(activeExcuses.map(e => e.studentId));

                const newRecords = missingStudents.map(student => ({
                    tenantId: scheduledClass.tenantId,
                    scheduledClassId: scheduledClass.id,
                    studentId: student.id,
                    status: (excusedStudentIds.has(student.id) ? 'abono' : 'falta') as any,
                    modality: 'presencial' as any
                }));

                if (newRecords.length > 0) {
                    await prisma.attendanceRecord.createMany({
                        data: newRecords
                    });
                }
            }
            console.log(`[CRON] Consolidação diária finalizada: ${classesToConsolidate.length} aulas checadas.`);
        } catch (error) {
            console.error('[CRON] Erro ao consolidar chamadas diárias:', error);
        }
    });
}
