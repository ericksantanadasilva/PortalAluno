import { Router, Request, Response } from 'express';
import * as archiver from 'archiver';
import { prisma } from '@repo/database';
import { requireAuth } from '../../middlewares/auth.middleware';
import { uploadToDrive, getDriveFileStream, extractDriveFileId, getDiscursiveFolderId } from '../../services/drive.service';
import { discursiveUpload, formatSubmissionFilename, resolvePdfPath } from '../../services/discursive.service';

const router = Router();

/**
 * GET /api/discursive/corrector/my-submissions
 * Lista as submissões atribuídas ao corretor logado em lotes ativos
 */
router.get('/corrector/my-submissions', requireAuth, async (req: Request, res: Response) => {
    try {
        const tenantId = req.user!.tenantId || '';
        const userId = req.user!.userId;
        const isAdmin = ['admin', 'super_admin'].includes(req.user!.role);

        const batchItems = await prisma.correctionBatchItem.findMany({
            where: {
                batch: {
                    tenantId,
                    ...(isAdmin && req.query.all === 'true' ? {} : { correctorId: userId }),
                    status: 'IN_PROGRESS'
                },
                submission: {
                    status: {
                        not: 'CORRECTED'
                    }
                }
            },
            include: {
                batch: {
                    select: {
                        id: true,
                        status: true,
                        createdAt: true,
                        corrector: { select: { id: true, name: true } }
                    }
                },
                submission: {
                    include: {
                        student: {
                            select: {
                                id: true,
                                name: true,
                                registrationNumber: true,
                                email: true
                            }
                        },
                        exam: {
                            include: {
                                examQuestions: {
                                    orderBy: { questionNumber: 'asc' }
                                }
                            }
                        },
                        grades: true
                    }
                }
            }
        });

        const submissions = batchItems.map(item => ({
            batchId: item.batchId,
            batch: item.batch,
            ...item.submission
        }));

        return res.json(submissions);
    } catch (error) {
        console.error('Erro ao listar submissões do corretor:', error);
        return res.status(500).json({ error: 'Erro interno ao carregar submissões para correção.' });
    }
});

/**
 * POST /api/discursive/corrector/download-batch
 * Download em lote para o professor corretor das provas atribuídas a ele
 */
router.post('/corrector/download-batch', requireAuth, async (req: Request, res: Response) => {
    try {
        const tenantId = req.user!.tenantId || '';
        const { submissionIds } = req.body;

        if (!Array.isArray(submissionIds) || submissionIds.length === 0) {
            return res.status(400).json({ error: 'Envie um array de submissionIds válido.' });
        }

        const oldSubs = await prisma.essaySubmission.findMany({
            where: {
                id: { in: submissionIds },
                tenantId
            },
            include: {
                student: true,
                essayExam: true,
                subject: true
            }
        });

        const newSubs = await prisma.examSubmission.findMany({
            where: {
                id: { in: submissionIds },
                tenantId
            },
            include: {
                student: true,
                exam: true
            }
        });

        const rawItems = [
            ...newSubs.map(s => ({
                id: s.id,
                studentId: s.studentId,
                studentName: s.student.name,
                examTitle: s.exam.title,
                subjectName: s.subjectName || 'Geral',
                pdfUrl: s.originalPdfUrl
            })),
            ...oldSubs.map(s => ({
                id: s.id,
                studentId: s.studentId,
                studentName: s.student.name,
                examTitle: s.essayExam.title,
                subjectName: s.subject.subjectName,
                pdfUrl: s.studentPdfUrl
            }))
        ];

        const seenKeys = new Set<string>();
        const items: typeof rawItems = [];
        for (const it of rawItems) {
            const key = `${it.studentId}_${(it.subjectName || 'Geral').trim().toUpperCase()}`;
            if (!seenKeys.has(key)) {
                seenKeys.add(key);
                items.push(it);
            }
        }

        if (items.length === 0) {
            return res.status(404).json({ error: 'Nenhuma submissão encontrada com os IDs fornecidos.' });
        }

        const ArchiverClass = (archiver as any).ZipArchive || (archiver as any).default?.ZipArchive || (archiver as any);
        const archive = typeof ArchiverClass === 'function' && ArchiverClass.prototype?.pipe
            ? new ArchiverClass({ zlib: { level: 9 } })
            : (archiver as any)('zip', { zlib: { level: 9 } });

        const examTitleRaw = (items[0]?.examTitle || 'Simulado').trim();
        const cleanExamTitle = examTitleRaw.replace(/[^a-zA-Z0-9 -]/g, '');
        const zipFilename = `${cleanExamTitle}.zip`;

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

        archive.on('error', (err) => {
            console.error('Erro na criação do arquivo .ZIP:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Erro ao gerar arquivo .zip.' });
            }
        });

        archive.pipe(res);

        for (const item of items) {
            const formattedName = formatSubmissionFilename(
                item.studentName,
                item.examTitle,
                item.subjectName
            );

            const driveFileId = extractDriveFileId(item.pdfUrl);

            if (driveFileId) {
                try {
                    const driveStream = await getDriveFileStream(driveFileId);
                    archive.append(driveStream, { name: formattedName });
                } catch (streamErr) {
                    console.error(`Erro ao obter stream do Drive para submissão ${item.id}:`, streamErr);
                }
            } else {
                const pdfPath = resolvePdfPath(item.pdfUrl);
                if (pdfPath) {
                    archive.file(pdfPath, { name: formattedName });
                } else {
                    console.warn(`Arquivo não encontrado no disco para submissão ${item.id}: ${item.pdfUrl}`);
                }
            }
        }

        await archive.finalize();
    } catch (error) {
        console.error('Erro no download em lote do corretor:', error);
        if (!res.headersSent) {
            return res.status(500).json({ error: 'Erro ao processar download em lote do corretor.' });
        }
    }
});

/**
 * POST /api/discursive/corrector/submit-grade
 * Salva rascunho de notas ou finaliza correção com validação de questões pendentes
 */
router.post('/corrector/submit-grade', requireAuth, discursiveUpload.single('correctedPdf'), async (req: Request, res: Response) => {
    try {
        const tenantId = req.user!.tenantId || '';
        const userId = req.user!.userId;
        const isAdmin = ['admin', 'super_admin'].includes(req.user!.role);

        const { submissionId, finalize, overrideTotalScore } = req.body;
        let gradesRaw = req.body.grades;
        let correctedPdfUrl = req.body.correctedPdfUrl;

        if (!submissionId) {
            return res.status(400).json({ error: 'submissionId é obrigatório.' });
        }

        let grades: Array<{ questionId: string; score: number }> = [];
        if (typeof gradesRaw === 'string') {
            try {
                grades = JSON.parse(gradesRaw);
            } catch {
                return res.status(400).json({ error: 'Formato inválido para grades (deve ser um array JSON).' });
            }
        } else if (Array.isArray(gradesRaw)) {
            grades = gradesRaw;
        }

        const submission = await prisma.examSubmission.findFirst({
            where: { id: submissionId, tenantId },
            include: {
                exam: {
                    include: {
                        examQuestions: {
                            orderBy: { questionNumber: 'asc' }
                        }
                    }
                },
                batchItem: {
                    include: {
                        batch: true
                    }
                }
            }
        });

        if (!submission) {
            return res.status(404).json({ error: 'Submissão não encontrada.' });
        }

        if (!isAdmin && submission.batchItem?.batch.correctorId !== userId) {
            return res.status(403).json({ error: 'Acesso negado: submissão não está em seu lote de correção.' });
        }

        if (req.file) {
            const existingFileId = extractDriveFileId(submission.correctedPdfUrl);
            const folderId = await getDiscursiveFolderId(`Simulado - ${submission.exam.title} - Corrigidas`);
            const driveResult = await uploadToDrive({
                buffer: req.file.buffer,
                filename: `CORRIGIDA - ${submissionId} - ${req.file.originalname}`,
                mimetype: req.file.mimetype || 'application/pdf',
                folderId,
                existingFileId
            });
            correctedPdfUrl = driveResult.driveUrl;
        }

        if (grades && grades.length > 0) {
            for (const item of grades) {
                const numScore = parseFloat(String(item.score));
                if (!isNaN(numScore) && item.questionId) {
                    await prisma.essayQuestionGrade.upsert({
                        where: {
                            submissionId_questionId: {
                                submissionId: submission.id,
                                questionId: item.questionId
                            }
                        },
                        update: {
                            score: numScore
                        },
                        create: {
                            submissionId: submission.id,
                            questionId: item.questionId,
                            score: numScore
                        }
                    });
                }
            }
        }

        const isFinalize = finalize === 'true' || finalize === true;

        if (isFinalize) {
            if (!correctedPdfUrl && !submission.correctedPdfUrl) {
                return res.status(400).json({
                    error: 'É obrigatório anexar/enviar o PDF corrigido antes de finalizar a correção.'
                });
            }

            const allQuestions = submission.exam.examQuestions;
            const savedGrades = await prisma.essayQuestionGrade.findMany({
                where: { submissionId: submission.id }
            });

            const savedMap = new Map(savedGrades.map(g => [g.questionId, g.score]));
            const missingNumbers: number[] = [];
            let totalSum = 0;
            const hasOverride = overrideTotalScore !== undefined && overrideTotalScore !== null && overrideTotalScore !== '';

            if (hasOverride) {
                const numOverride = parseFloat(String(overrideTotalScore));
                if (!isNaN(numOverride)) {
                    totalSum = numOverride;
                }
            } else {
                for (const q of allQuestions) {
                    if (!savedMap.has(q.id) || savedMap.get(q.id) === undefined || savedMap.get(q.id) === null) {
                        missingNumbers.push(q.questionNumber);
                    } else {
                        totalSum += Number(savedMap.get(q.id));
                    }
                }

                if (missingNumbers.length > 0) {
                    return res.status(400).json({
                        error: `Faltam lançar notas das questões: ${missingNumbers.join(', ')}`,
                        missingQuestions: missingNumbers
                    });
                }
            }

            await prisma.examSubmission.update({
                where: { id: submission.id },
                data: {
                    totalScore: totalSum,
                    status: 'CORRECTED',
                    correctedAt: new Date(),
                    ...(correctedPdfUrl ? { correctedPdfUrl } : {})
                }
            });

            if (submission.batchItem?.batchId) {
                const batchId = submission.batchItem.batchId;
                const batchItems = await prisma.correctionBatchItem.findMany({
                    where: { batchId },
                    include: { submission: { select: { status: true } } }
                });

                const allCompleted = batchItems.every(i => i.submission.status === 'CORRECTED');
                if (allCompleted) {
                    await prisma.correctionBatch.update({
                        where: { id: batchId },
                        data: { status: 'COMPLETED' }
                    });
                }
            }
        } else {
            await prisma.examSubmission.update({
                where: { id: submission.id },
                data: {
                    status: 'UNDER_CORRECTION',
                    ...(correctedPdfUrl ? { correctedPdfUrl } : {})
                }
            });
        }

        const updated = await prisma.examSubmission.findUnique({
            where: { id: submission.id },
            include: {
                student: { select: { id: true, name: true, registrationNumber: true } },
                grades: { include: { question: true } }
            }
        });

        return res.json({
            message: isFinalize ? 'Correção finalizada com sucesso!' : 'Rascunho de notas salvo com sucesso!',
            submission: updated
        });
    } catch (error) {
        console.error('Erro em corrector/submit-grade:', error);
        return res.status(500).json({ error: 'Erro interno ao salvar nota/correção.' });
    }
});

export default router;
