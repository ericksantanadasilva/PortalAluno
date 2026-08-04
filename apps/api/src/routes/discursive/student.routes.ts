import { Router, Request, Response } from 'express';
import { prisma } from '@repo/database';
import { requireAuth } from '../../middlewares/auth.middleware';
import { uploadToDrive, getDriveFileStream, extractDriveFileId } from '../../services/drive.service';
import { discursiveUpload, formatSubmissionFilename, resolvePdfPath } from '../../services/discursive.service';

const router = Router();

/**
 * GET /api/discursive/student/exams
 * Retorna os simulados discursivos disponíveis para o aluno, incluindo matérias e submissões realizadas.
 */
router.get('/student/exams', requireAuth, async (req: Request, res: Response) => {
    try {
        const tenantId = req.user!.tenantId;
        const studentId = req.user!.userId;

        let exams = await prisma.essayExam.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
            include: {
                subjects: {
                    include: {
                        submissions: {
                            where: { studentId }
                        }
                    }
                }
            }
        });

        // Se não houver simulado discursivo cadastrado ainda, cria um padrão para o tenant
        if (exams.length === 0) {
            try {
                const createdExam = await prisma.essayExam.create({
                    data: {
                        tenantId,
                        title: "Simulado Discursivo UERJ / Específicas 2026",
                        subjects: {
                            create: [
                                { subjectName: "BIOLOGIA" },
                                { subjectName: "QUIMICA" },
                                { subjectName: "REDACAO" }
                            ]
                        }
                    },
                    include: {
                        subjects: {
                            include: {
                                submissions: {
                                    where: { studentId }
                                }
                            }
                        }
                    }
                });
                exams = [createdExam];
            } catch (err) {
                console.error("Erro ao criar simulado discursivo padrao:", err);
            }
        }

        const objExams = await prisma.exam.findMany({
            where: { tenantId },
            select: { title: true, windowStart: true, windowEnd: true }
        });

        // Formata os dados para facilitar o consumo no front-end
        const formattedExams = exams.map(exam => {
            const matchedObj = objExams.find(e => {
                const t1 = e.title.trim().toLowerCase();
                const t2 = exam.title.trim().toLowerCase();
                return t1 === t2 || t1.includes(t2) || t2.includes(t1);
            });
            const windowStart = (exam as any).windowStart || matchedObj?.windowStart || null;
            const windowEnd = (exam as any).windowEnd || matchedObj?.windowEnd || null;

            return {
                id: exam.id,
                title: exam.title,
                createdAt: exam.createdAt,
                windowStart,
                windowEnd,
                subjects: exam.subjects.map(subject => {
                    const submission = subject.submissions[0] || null;
                    return {
                        id: subject.id,
                        subjectName: subject.subjectName,
                        submission: submission
                            ? {
                                id: submission.id,
                                status: submission.status,
                                studentPdfUrl: submission.studentPdfUrl,
                                submittedAt: submission.submittedAt
                            }
                            : null
                    };
                })
            };
        });

        return res.json(formattedExams);
    } catch (error) {
        console.error('Erro ao listar simulados discursivos do aluno:', error);
        return res.status(500).json({ error: 'Erro interno ao carregar simulados discursivos.' });
    }
});

/**
 * GET /api/discursive/student/download-single/:submissionId
 * Permite ao aluno baixar ou visualizar o PDF da sua própria resolução enviada.
 */
router.get('/student/download-single/:submissionId', requireAuth, async (req: Request, res: Response) => {
    try {
        const studentId = req.user!.userId;
        const submissionId = req.params.submissionId as string;

        const sub = await prisma.essaySubmission.findFirst({
            where: {
                id: submissionId,
                studentId
            },
            include: {
                student: true,
                essayExam: true,
                subject: true
            }
        });

        if (!sub) {
            return res.status(404).json({ error: 'Submissão não encontrada.' });
        }

        const formattedFilename = formatSubmissionFilename(
            sub.student.name,
            sub.essayExam.title,
            sub.subject.subjectName
        );

        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

        const driveFileId = extractDriveFileId(sub.studentPdfUrl);
        if (driveFileId) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(formattedFilename)}"`);
            const driveStream = await getDriveFileStream(driveFileId);
            return driveStream.pipe(res);
        }

        const pdfPath = resolvePdfPath(sub.studentPdfUrl);
        if (!pdfPath) {
            return res.status(404).json({ error: 'Arquivo PDF não encontrado no servidor ou Google Drive.' });
        }

        return res.download(pdfPath, formattedFilename);
    } catch (error) {
        console.error('Erro no download do aluno:', error);
        return res.status(500).json({ error: 'Erro interno ao realizar o download.' });
    }
});

/**
 * POST /api/discursive/submit
 * Recebe `essayExamId`, `essayExamSubjectId` e o arquivo PDF do aluno.
 */
router.post('/submit', requireAuth, discursiveUpload.single('file') as any, async (req: Request, res: Response) => {
    try {
        const tenantId = req.user!.tenantId;
        const studentId = req.user!.userId;
        const { essayExamId, essayExamSubjectId } = req.body;

        if (!req.file) {
            return res.status(400).json({ error: 'O arquivo PDF da resolução é obrigatório.' });
        }

        if (!essayExamId || !essayExamSubjectId) {
            return res.status(400).json({ error: 'essayExamId e essayExamSubjectId são obrigatórios.' });
        }

        const examSubject = await prisma.essayExamSubject.findFirst({
            where: {
                id: essayExamSubjectId,
                essayExamId,
                essayExam: { tenantId }
            },
            include: {
                essayExam: true
            }
        });

        if (!examSubject) {
            return res.status(404).json({ error: 'Simulado ou matéria não encontrada.' });
        }

        let windowStart = (examSubject.essayExam as any).windowStart;
        let windowEnd = (examSubject.essayExam as any).windowEnd;
        if (!windowStart || !windowEnd) {
            const allExams = await prisma.exam.findMany({
                where: { tenantId },
                select: { title: true, windowStart: true, windowEnd: true }
            });
            const matchedObj = allExams.find(e => {
                const t1 = e.title.trim().toLowerCase();
                const t2 = examSubject.essayExam.title.trim().toLowerCase();
                return t1 === t2 || t1.includes(t2) || t2.includes(t1);
            });
            if (matchedObj) {
                if (!windowStart) windowStart = matchedObj.windowStart;
                if (!windowEnd) windowEnd = matchedObj.windowEnd;
            }
        }

        const now = new Date();
        if (windowEnd && now > windowEnd) {
            return res.status(403).json({ error: 'O prazo para envio da resolução para este simulado foi encerrado.' });
        }
        if (windowStart && now < windowStart) {
            return res.status(403).json({ error: 'O prazo para envio da resolução para este simulado ainda não começou.' });
        }

        const existingSubmission = await prisma.essaySubmission.findUnique({
            where: {
                essayExamId_essayExamSubjectId_studentId: {
                    essayExamId,
                    essayExamSubjectId,
                    studentId
                }
            }
        });

        if (existingSubmission) {
            return res.status(400).json({ error: 'Você já enviou sua resolução para esta matéria. O reenvio não é permitido.' });
        }

        const student = await prisma.user.findUnique({
            where: { id: studentId }
        });

        const formattedFilename = formatSubmissionFilename(
            student?.name || 'ALUNO',
            examSubject.essayExam.title,
            examSubject.subjectName
        );

        const driveResult = await uploadToDrive({
            buffer: req.file.buffer,
            filename: formattedFilename,
            mimetype: req.file.mimetype || 'application/pdf'
        });

        const submission = await prisma.essaySubmission.upsert({
            where: {
                essayExamId_essayExamSubjectId_studentId: {
                    essayExamId,
                    essayExamSubjectId,
                    studentId
                }
            },
            update: {
                studentPdfUrl: driveResult.driveUrl,
                submittedAt: new Date(),
                status: 'PENDING'
            },
            create: {
                tenantId,
                essayExamId,
                essayExamSubjectId,
                studentId,
                studentPdfUrl: driveResult.driveUrl,
                status: 'PENDING'
            },
            include: {
                subject: true,
                essayExam: true
            }
        });

        try {
            const exam = await prisma.exam.findFirst({
                where: {
                    OR: [
                        { id: submission.essayExamId },
                        {
                            tenantId,
                            title: { equals: submission.essayExam.title.trim(), mode: 'insensitive' }
                        }
                    ]
                }
            });

            if (exam) {
                const existing = await prisma.examSubmission.findFirst({
                    where: {
                        examId: exam.id,
                        studentId,
                        originalPdfUrl: driveResult.driveUrl
                    }
                });

                if (!existing) {
                    await prisma.examSubmission.create({
                        data: {
                            tenantId,
                            examId: exam.id,
                            studentId,
                            subjectId: submission.essayExamSubjectId || null,
                            subjectName: submission.subject?.subjectName || 'Geral',
                            type: 'ONLINE',
                            status: 'PENDING_CORRECTION',
                            originalPdfUrl: driveResult.driveUrl,
                            submittedAt: new Date()
                        }
                    });
                }
            }
        } catch (syncErr) {
            console.error('Erro na sincronização em tempo real para ExamSubmission:', syncErr);
        }

        return res.status(200).json({
            message: 'Resolução enviada com sucesso.',
            submission
        });
    } catch (error) {
        console.error('Erro ao enviar resolução discursiva:', error);
        return res.status(500).json({ error: 'Erro interno ao processar o envio do PDF.' });
    }
});

export default router;
