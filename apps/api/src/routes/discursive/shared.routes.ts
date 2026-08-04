import { Router, Request, Response } from 'express';
import { prisma } from '@repo/database';
import { requireAuth } from '../../middlewares/auth.middleware';
import { getDriveFileStream, extractDriveFileId } from '../../services/drive.service';
import { formatSubmissionFilename, syncOnlineSubmissionsToNewFlow } from '../../services/discursive.service';

const router = Router();

/**
 * GET /api/discursive/exams
 * Lista os simulados do tenant atual com contagem de questões e submissões
 */
router.get('/exams', requireAuth, async (req: Request, res: Response) => {
    try {
        const tenantId = req.user!.tenantId || '';

        await syncOnlineSubmissionsToNewFlow(tenantId);

        try {
            const essayExams = await prisma.essayExam.findMany({ where: { tenantId } });
            for (const eExam of essayExams) {
                const existing = await prisma.exam.findFirst({
                    where: {
                        tenantId,
                        title: { equals: eExam.title.trim(), mode: 'insensitive' }
                    }
                });
                if (!existing) {
                    await prisma.exam.create({
                        data: {
                            tenantId,
                            title: eExam.title.trim(),
                            date: new Date(),
                            type: 'discursivo',
                            totalQuestions: 5
                        }
                    });
                }
            }
        } catch (syncErr) {
            console.error('Erro na sincronização de EssayExam para Exam:', syncErr);
        }

        const exams = await prisma.exam.findMany({
            where: {
                tenantId,
                type: {
                    equals: 'discursivo',
                    mode: 'insensitive'
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const formatted = await Promise.all(
            exams.map(async (exam) => {
                let pending = 0;
                let underCorrection = 0;
                let corrected = 0;
                let totalQuestionsCount = 0;
                let totalSubmissionsCount = 0;

                try {
                    totalQuestionsCount = await prisma.examQuestion.count({ where: { examId: exam.id } });
                    const subs = await prisma.examSubmission.findMany({
                        where: { examId: exam.id },
                        select: { status: true }
                    });
                    totalSubmissionsCount = subs.length;
                    pending = subs.filter(s => s.status === 'PENDING_CORRECTION').length;
                    underCorrection = subs.filter(s => s.status === 'UNDER_CORRECTION').length;
                    corrected = subs.filter(s => s.status === 'CORRECTED').length;
                } catch (e) {
                    // Fallback se não conseguir carregar
                }

                let subjectsList: string[] = [];
                try {
                    const essayExam = await prisma.essayExam.findFirst({
                        where: {
                            tenantId,
                            title: { equals: exam.title.trim(), mode: 'insensitive' }
                        },
                        include: { subjects: true }
                    });
                    if (essayExam && essayExam.subjects?.length > 0) {
                        subjectsList = essayExam.subjects.map(s => s.subjectName);
                    }
                } catch (errSubj) {
                    // Fallback
                }
                if (subjectsList.length === 0) {
                    subjectsList = ['Geral'];
                }

                return {
                    id: exam.id,
                    title: exam.title,
                    date: exam.date,
                    subjects: subjectsList,
                    totalQuestionsCount: totalQuestionsCount || exam.totalQuestions || 0,
                    totalSubmissionsCount,
                    stats: {
                        pending,
                        underCorrection,
                        corrected
                    }
                };
            })
        );

        return res.json(formatted);
    } catch (error) {
        console.error('Erro ao listar simulados para discursiva:', error);
        return res.status(500).json({ error: 'Erro interno ao carregar simulados discursivos.' });
    }
});

/**
 * GET /api/discursive/submissions
 * Lista submissões de exames com filtros e relacionamentos
 */
router.get('/submissions', requireAuth, async (req: Request, res: Response) => {
    try {
        const tenantId = req.user!.tenantId || '';
        await syncOnlineSubmissionsToNewFlow(tenantId);
        const { examId, status, type } = req.query;

        const whereClause: any = { tenantId };
        if (examId && examId !== 'all') whereClause.examId = String(examId);
        if (status && status !== 'all') whereClause.status = String(status);
        if (type && type !== 'all') whereClause.type = String(type);

        const submissions = await prisma.examSubmission.findMany({
            where: whereClause,
            orderBy: { submittedAt: 'desc' },
            include: {
                student: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        registrationNumber: true,
                        department: true
                    }
                },
                exam: {
                    include: {
                        examQuestions: {
                            orderBy: { questionNumber: 'asc' }
                        }
                    }
                },
                batchItem: {
                    include: {
                        batch: {
                            include: {
                                corrector: {
                                    select: {
                                        id: true,
                                        name: true
                                    }
                                }
                            }
                        }
                    }
                },
                grades: {
                    include: {
                        question: true
                    }
                }
            }
        });

        return res.json(submissions);
    } catch (error) {
        console.error('Erro ao listar submissões:', error);
        return res.status(500).json({ error: 'Erro interno ao carregar submissões.' });
    }
});

/**
 * GET /api/discursive/correctors
 * Lista os corretores (usuários com perfil professor, admin ou super_admin)
 */
router.get('/correctors', requireAuth, async (req: Request, res: Response) => {
    try {
        const tenantId = req.user!.tenantId || '';
        const correctors = await prisma.user.findMany({
            where: {
                tenantId,
                role: {
                    in: ['professor', 'admin', 'super_admin']
                }
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                department: true
            },
            orderBy: { name: 'asc' }
        });

        return res.json(correctors);
    } catch (error) {
        console.error('Erro ao listar corretores:', error);
        return res.status(500).json({ error: 'Erro interno ao carregar corretores.' });
    }
});

/**
 * GET /api/discursive/results
 * Lista o boletim e resultados finais dos simulados discursivos
 */
router.get('/results', requireAuth, async (req: Request, res: Response) => {
    try {
        const tenantId = req.user!.tenantId || '';
        const { examId, status } = req.query;

        const whereClause: any = { tenantId };
        if (examId && examId !== 'all') whereClause.examId = String(examId);
        if (status && status !== 'all') {
            whereClause.status = String(status);
        } else {
            whereClause.status = 'CORRECTED';
        }

        const results = await prisma.examSubmission.findMany({
            where: whereClause,
            orderBy: [
                { totalScore: 'desc' },
                { submittedAt: 'asc' }
            ],
            include: {
                student: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        registrationNumber: true,
                        department: true
                    }
                },
                exam: {
                    select: {
                        id: true,
                        title: true,
                        date: true
                    }
                },
                grades: {
                    include: {
                        question: {
                            select: {
                                id: true,
                                questionNumber: true,
                                theme: true
                            }
                        }
                    },
                    orderBy: {
                        question: {
                            questionNumber: 'asc'
                        }
                    }
                }
            }
        });

        return res.json(results);
    } catch (error) {
        console.error('Erro em /results:', error);
        return res.status(500).json({ error: 'Erro interno ao consultar resultados.' });
    }
});

/**
 * GET /api/discursive/pdf-stream/:submissionId/:type
 * Proxy de stream para exibir PDF do Google Drive dentro de iframes no Frontend
 */
router.get('/pdf-stream/:submissionId/:type', requireAuth, async (req: Request, res: Response) => {
    try {
        const tenantId = req.user!.tenantId || '';
        const { submissionId, type } = req.params;

        const sub = await prisma.examSubmission.findFirst({
            where: { id: submissionId, tenantId },
            include: { student: true, exam: true }
        });

        if (!sub) {
            return res.status(404).json({ error: 'Submissão não encontrada.' });
        }

        const url = type === 'corrected'
            ? sub.correctedPdfUrl
            : type === 'auto'
                ? (sub.correctedPdfUrl || sub.originalPdfUrl)
                : sub.originalPdfUrl;

        if (!url) {
            return res.status(404).json({ error: 'PDF não encontrado para esta submissão.' });
        }

        const fileId = extractDriveFileId(url);
        if (!fileId) {
            return res.status(400).json({ error: 'ID do arquivo do Google Drive não é válido.' });
        }

        const formattedFilename = formatSubmissionFilename(
            sub.student.name,
            sub.exam.title,
            sub.subjectName || 'Geral'
        );
        const disposition = req.query.download === 'true' ? 'attachment' : 'inline';
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(formattedFilename)}"`);
        const stream = await getDriveFileStream(fileId);
        return stream.pipe(res);
    } catch (error) {
        console.error('Erro em pdf-stream:', error);
        return res.status(500).json({ error: 'Erro interno ao realizar stream do PDF do Google Drive.' });
    }
});

export default router;
