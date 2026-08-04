import { Router, Request, Response } from 'express';
import * as archiver from 'archiver';
import path from 'path';
import { prisma } from '@repo/database';
import { requireAuth, requireAdmin } from '../../middlewares/auth.middleware';
import { uploadToDrive, getDriveFileStream, extractDriveFileId, getDiscursiveFolderId } from '../../services/drive.service';
import { discursiveUpload, formatSubmissionFilename, resolvePdfPath } from '../../services/discursive.service';

const router = Router();

/**
 * GET /api/discursive/admin/exams
 * Lista todos os simulados discursivos criados para a secretaria.
 */
router.get('/admin/exams', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
        const tenantId = req.user!.tenantId;

        const exams = await prisma.essayExam.findMany({
            where: { tenantId },
            include: {
                subjects: true,
                _count: {
                    select: { submissions: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return res.json(exams);
    } catch (error) {
        console.error('Erro ao listar simulados discursivos para admin:', error);
        return res.status(500).json({ error: 'Erro ao listar simulados discursivos.' });
    }
});

/**
 * POST /api/discursive/admin/exams
 * Cria um novo simulado discursivo com matérias associadas selecionadas da lista do tenant.
 */
router.post('/admin/exams', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
        const tenantId = req.user!.tenantId;
        const { title, subjects, windowStart, windowEnd } = req.body;

        if (!title || !Array.isArray(subjects) || subjects.length === 0) {
            return res.status(400).json({ error: 'Título e ao menos uma matéria são obrigatórios.' });
        }

        const dbSubjects = await prisma.subject.findMany({
            where: { tenantId }
        });

        const subjectNames: string[] = subjects.map((sub: string) => {
            const found = dbSubjects.find(s => s.id === sub || s.name.toUpperCase() === sub.toUpperCase());
            return found ? found.name : sub;
        });

        const existingExam = await prisma.essayExam.findFirst({
            where: {
                tenantId,
                title: { equals: title.trim(), mode: 'insensitive' }
            }
        });

        if (existingExam) {
            await prisma.essayExamSubject.deleteMany({
                where: { essayExamId: existingExam.id }
            });

            const updatedExam = await prisma.essayExam.update({
                where: { id: existingExam.id },
                data: {
                    windowStart: windowStart !== undefined ? (windowStart ? new Date(windowStart) : null) : undefined,
                    windowEnd: windowEnd !== undefined ? (windowEnd ? new Date(windowEnd) : null) : undefined,
                    subjects: {
                        create: subjectNames.map((subName: string) => ({
                            subjectName: subName.trim().toUpperCase()
                        }))
                    }
                },
                include: {
                    subjects: true
                }
            });

            return res.json(updatedExam);
        }

        const newExam = await prisma.essayExam.create({
            data: {
                tenantId,
                title: title.trim(),
                windowStart: windowStart ? new Date(windowStart) : null,
                windowEnd: windowEnd ? new Date(windowEnd) : null,
                subjects: {
                    create: subjectNames.map((subName: string) => ({
                        subjectName: subName.trim().toUpperCase()
                    }))
                }
            },
            include: {
                subjects: true
            }
        });

        return res.status(201).json(newExam);
    } catch (error) {
        console.error('Erro ao criar simulado discursivo:', error);
        return res.status(500).json({ error: 'Erro ao criar simulado discursivo.' });
    }
});

/**
 * PUT /api/discursive/admin/exams/:id
 * Atualiza um simulado discursivo e suas matérias associadas.
 */
router.put('/admin/exams/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
        const tenantId = req.user!.tenantId;
        const examId = req.params.id as string;
        const { title, subjects, windowStart, windowEnd } = req.body;

        const exam = await prisma.essayExam.findFirst({
            where: { id: examId, tenantId }
        });

        if (!exam) {
            return res.status(404).json({ error: 'Simulado discursivo não encontrado.' });
        }

        const dbSubjects = await prisma.subject.findMany({
            where: { tenantId }
        });

        const subjectNames: string[] = Array.isArray(subjects)
            ? subjects.map((sub: string) => {
                const found = dbSubjects.find(s => s.id === sub || s.name.toUpperCase() === sub.toUpperCase());
                return found ? found.name : sub;
            })
            : [];

        await prisma.essayExamSubject.deleteMany({
            where: { essayExamId: examId }
        });

        const updatedExam = await prisma.essayExam.update({
            where: { id: examId },
            data: {
                title: title || exam.title,
                windowStart: windowStart !== undefined ? (windowStart ? new Date(windowStart) : null) : (exam as any).windowStart,
                windowEnd: windowEnd !== undefined ? (windowEnd ? new Date(windowEnd) : null) : (exam as any).windowEnd,
                subjects: {
                    create: subjectNames.map((subName: string) => ({
                        subjectName: subName.trim().toUpperCase()
                    }))
                }
            },
            include: {
                subjects: true
            }
        });

        return res.json(updatedExam);
    } catch (error) {
        console.error('Erro ao atualizar simulado discursivo:', error);
        return res.status(500).json({ error: 'Erro ao atualizar simulado discursivo.' });
    }
});

/**
 * DELETE /api/discursive/admin/exams/:id
 * Remove um simulado discursivo.
 */
router.delete('/admin/exams/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
        const tenantId = req.user!.tenantId;
        const examId = req.params.id as string;

        const exam = await prisma.essayExam.findFirst({
            where: { id: examId, tenantId }
        });

        if (!exam) {
            return res.status(404).json({ error: 'Simulado discursivo não encontrado.' });
        }

        await prisma.essayExam.delete({
            where: { id: examId }
        });

        return res.json({ message: 'Simulado discursivo removido com sucesso.' });
    } catch (error) {
        console.error('Erro ao excluir simulado discursivo:', error);
        return res.status(500).json({ error: 'Erro ao excluir simulado discursivo.' });
    }
});

/**
 * GET /api/discursive/admin/:examId/submissions
 * Retorna a lista de submissões do simulado agrupadas/identificadas por aluno e por matéria.
 */
router.get('/admin/:examId/submissions', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
        const tenantId = req.user!.tenantId;
        const examId = req.params.examId as string;

        const exam = await prisma.essayExam.findFirst({
            where: { id: examId, tenantId },
            include: { subjects: true }
        });

        if (!exam) {
            return res.status(404).json({ error: 'Simulado discursivo não encontrado.' });
        }

        const submissions = await prisma.essaySubmission.findMany({
            where: {
                essayExamId: examId,
                tenantId
            },
            include: {
                student: {
                    select: {
                        id: true,
                        name: true,
                        registrationNumber: true,
                        email: true
                    }
                },
                subject: {
                    select: {
                        id: true,
                        subjectName: true
                    }
                },
                essayExam: {
                    select: {
                        id: true,
                        title: true
                    }
                }
            },
            orderBy: [
                { student: { name: 'asc' } },
                { subject: { subjectName: 'asc' } }
            ]
        });

        const presentialSubmissions = await prisma.examSubmission.findMany({
            where: {
                tenantId,
                OR: [
                    { examId },
                    { exam: { title: { equals: exam.title.trim(), mode: 'insensitive' } } }
                ]
            },
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
                    select: {
                        id: true,
                        title: true
                    }
                }
            }
        });

        const mappedOld = submissions.map(sub => ({
            id: sub.id,
            studentId: sub.studentId,
            studentName: sub.student.name,
            registrationNumber: sub.student.registrationNumber,
            subjectId: sub.essayExamSubjectId,
            subjectName: sub.subject.subjectName,
            status: sub.status,
            submittedAt: sub.submittedAt,
            studentPdfUrl: sub.studentPdfUrl,
            formattedFilename: formatSubmissionFilename(sub.student.name, sub.essayExam.title, sub.subject.subjectName)
        }));

        const mappedNew = presentialSubmissions.map(sub => ({
            id: sub.id,
            studentId: sub.studentId,
            studentName: sub.student.name,
            registrationNumber: sub.student.registrationNumber,
            subjectId: sub.subjectId || '',
            subjectName: sub.subjectName || 'Geral',
            status: sub.status,
            submittedAt: sub.submittedAt,
            studentPdfUrl: sub.originalPdfUrl,
            formattedFilename: formatSubmissionFilename(sub.student.name, sub.exam.title, sub.subjectName || 'Geral')
        }));

        const combined = [...mappedNew, ...mappedOld];
        const seenKeys = new Set<string>();
        const allMapped: typeof combined = [];

        for (const sub of combined) {
            const key = `${sub.studentId}_${(sub.subjectName || 'Geral').trim().toUpperCase()}`;
            if (!seenKeys.has(key)) {
                seenKeys.add(key);
                allMapped.push(sub);
            }
        }

        return res.json({
            exam: {
                id: exam.id,
                title: exam.title,
                subjects: exam.subjects
            },
            submissions: allMapped
        });
    } catch (error) {
        console.error('Erro ao buscar submissões do simulado:', error);
        return res.status(500).json({ error: 'Erro interno ao buscar submissões.' });
    }
});

/**
 * POST /api/discursive/admin/download-batch
 * Gera um arquivo .zip dinâmico contendo os PDFs renomeados
 */
router.post('/admin/download-batch', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
        const tenantId = req.user!.tenantId;
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
        console.error('Erro no download em lote de submissões:', error);
        if (!res.headersSent) {
            return res.status(500).json({ error: 'Erro ao processar download em lote.' });
        }
    }
});

/**
 * GET /api/discursive/admin/download-single/:submissionId
 * Faz o download de um único PDF forçando o nome da resposta no mesmo padrão formatado
 */
router.get('/admin/download-single/:submissionId', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
        const tenantId = req.user!.tenantId;
        const submissionId = req.params.submissionId as string;

        let formattedFilename = '';
        let pdfUrl = '';

        const subOld = await prisma.essaySubmission.findFirst({
            where: { id: submissionId, tenantId },
            include: { student: true, essayExam: true, subject: true }
        });

        if (subOld) {
            formattedFilename = formatSubmissionFilename(subOld.student.name, subOld.essayExam.title, subOld.subject.subjectName);
            pdfUrl = subOld.studentPdfUrl;
        } else {
            const subNew = await prisma.examSubmission.findFirst({
                where: { id: submissionId, tenantId },
                include: { student: true, exam: true }
            });
            if (!subNew) {
                return res.status(404).json({ error: 'Submissão não encontrada.' });
            }
            formattedFilename = formatSubmissionFilename(subNew.student.name, subNew.exam.title, subNew.subjectName || 'Geral');
            pdfUrl = subNew.originalPdfUrl;
        }

        const driveFileId = extractDriveFileId(pdfUrl);
        if (driveFileId) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(formattedFilename)}"`);
            const driveStream = await getDriveFileStream(driveFileId);
            return driveStream.pipe(res);
        }

        const pdfPath = resolvePdfPath(pdfUrl);
        if (!pdfPath) {
            return res.status(404).json({ error: 'Arquivo PDF não encontrado no servidor ou Google Drive.' });
        }

        return res.download(pdfPath, formattedFilename, (err) => {
            if (err && !res.headersSent) {
                console.error('Erro ao enviar download do arquivo:', err);
                res.status(500).json({ error: 'Erro ao realizar o download do PDF.' });
            }
        });
    } catch (error) {
        console.error('Erro no download de submissão única:', error);
        return res.status(500).json({ error: 'Erro interno ao realizar o download.' });
    }
});

/**
 * POST /api/discursive/presential-upload
 * Upload em lote de provas presenciais digitalizadas (apenas Secretaria/Admin)
 */
router.post('/presential-upload', requireAuth, discursiveUpload.array('files', 100), async (req: Request, res: Response) => {
    try {
        const tenantId = req.user!.tenantId || '';
        const examId = req.body.examId;
        const subjectName = req.body.subjectName || 'Geral';

        if (!examId) {
            return res.status(400).json({ error: 'O examId é obrigatório.' });
        }

        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'Nenhum arquivo PDF enviado.' });
        }

        const exam = await prisma.exam.findFirst({
            where: { id: examId, tenantId }
        });

        if (!exam) {
            return res.status(404).json({ error: 'Simulado não encontrado no tenant atual.' });
        }

        const folderId = await getDiscursiveFolderId(`Simulado - ${exam.title}`);

        const results: Array<{
            filename: string;
            matricula: string;
            success: boolean;
            studentName?: string;
            submissionId?: string;
            error?: string;
        }> = [];

        for (const file of files) {
            const basename = path.parse(file.originalname).name.trim();
            const matriculaMatch = basename.match(/^([0-9a-zA-Z._-]+)/);
            const matricula = (matriculaMatch ? matriculaMatch[1] : basename).trim();

            if (!matricula) {
                results.push({
                    filename: file.originalname,
                    matricula: 'DESCONHECIDO',
                    success: false,
                    error: 'Não foi possível extrair a matrícula do nome do arquivo.'
                });
                continue;
            }

            const student = await prisma.user.findFirst({
                where: {
                    tenantId,
                    registrationNumber: matricula
                }
            });

            if (!student) {
                results.push({
                    filename: file.originalname,
                    matricula,
                    success: false,
                    error: `Matrícula '${matricula}' não encontrada no tenant atual.`
                });
                continue;
            }

            const existing = await prisma.examSubmission.findFirst({
                where: {
                    examId,
                    studentId: student.id,
                    subjectName
                }
            });

            if (existing) {
                results.push({
                    filename: file.originalname,
                    matricula,
                    success: false,
                    studentName: student.name,
                    error: `Aluno(a) ${student.name} (Matrícula ${matricula}) já possui submissão de ${subjectName} para este simulado.`
                });
                continue;
            }

            try {
                const formattedName = `${student.name.toUpperCase()} - MAT ${matricula} - ${subjectName} - ${exam.title}.pdf`;
                const driveResult = await uploadToDrive({
                    buffer: file.buffer,
                    filename: formattedName,
                    mimetype: file.mimetype || 'application/pdf',
                    folderId
                });

                const submission = await prisma.examSubmission.create({
                    data: {
                        tenantId,
                        examId,
                        studentId: student.id,
                        subjectName,
                        type: 'PRESENTIAL',
                        status: 'PENDING_CORRECTION',
                        originalPdfUrl: driveResult.driveUrl
                    }
                });

                results.push({
                    filename: file.originalname,
                    matricula,
                    success: true,
                    studentName: student.name,
                    submissionId: submission.id
                });
            } catch (err) {
                console.error(`Erro no processamento do arquivo ${file.originalname}:`, err);
                results.push({
                    filename: file.originalname,
                    matricula,
                    success: false,
                    error: (err as Error).message || 'Erro ao enviar para o Google Drive ou salvar no banco.'
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const errorCount = results.filter(r => !r.success).length;

        return res.json({
            message: `Processamento de lote finalizado. Sucesso: ${successCount}, Erros: ${errorCount}.`,
            totalProcessed: results.length,
            successCount,
            errorCount,
            results
        });
    } catch (error) {
        console.error('Erro geral no presencial-upload:', error);
        return res.status(500).json({ error: 'Erro interno ao realizar upload presencial em lote.' });
    }
});

/**
 * POST /api/discursive/batches
 * Cria um lote de correção de simulado discursivo
 */
router.post('/batches', requireAuth, async (req: Request, res: Response) => {
    try {
        const tenantId = req.user!.tenantId || '';
        const { examId, correctorId, quantity, subjectName, subjectId } = req.body;

        if (!examId || !correctorId || !quantity) {
            return res.status(400).json({ error: 'examId, correctorId e quantity são obrigatórios.' });
        }

        const qty = parseInt(String(quantity), 10);
        if (isNaN(qty) || qty <= 0) {
            return res.status(400).json({ error: 'Quantidade deve ser um número inteiro positivo.' });
        }

        const exam = await prisma.exam.findFirst({
            where: { id: examId, tenantId }
        });
        if (!exam) {
            return res.status(404).json({ error: 'Simulado não encontrado no tenant atual.' });
        }

        const corrector = await prisma.user.findFirst({
            where: { id: correctorId, tenantId }
        });
        if (!corrector) {
            return res.status(404).json({ error: 'Corretor não encontrado no tenant atual.' });
        }

        const wherePending: any = {
            tenantId,
            examId,
            status: 'PENDING_CORRECTION',
            batchItem: null
        };
        if (subjectId && subjectId !== 'all') wherePending.subjectId = String(subjectId);
        if (subjectName && subjectName !== 'all' && subjectName !== 'Todas as Matérias') wherePending.subjectName = String(subjectName);

        const availableSubmissions = await prisma.examSubmission.findMany({
            where: wherePending,
            take: qty,
            orderBy: { submittedAt: 'asc' }
        });

        if (availableSubmissions.length === 0) {
            return res.status(400).json({ error: 'Não há provas disponíveis com status pendente para distribuição neste simulado.' });
        }

        const createdBatch = await prisma.$transaction(async (tx) => {
            const batch = await tx.correctionBatch.create({
                data: {
                    tenantId,
                    examId,
                    correctorId,
                    status: 'IN_PROGRESS'
                }
            });

            for (const sub of availableSubmissions) {
                await tx.correctionBatchItem.create({
                    data: {
                        batchId: batch.id,
                        submissionId: sub.id
                    }
                });

                await tx.examSubmission.update({
                    where: { id: sub.id },
                    data: { status: 'UNDER_CORRECTION' }
                });
            }

            return batch;
        });

        return res.json({
            message: `Lote gerado com sucesso! ${availableSubmissions.length} prova(s) distribuída(s) para ${corrector.name}.`,
            batch: createdBatch,
            distributedCount: availableSubmissions.length
        });
    } catch (error) {
        console.error('Erro ao criar lote de correção:', error);
        return res.status(500).json({ error: 'Erro interno ao gerar lote de correção.' });
    }
});

/**
 * GET /api/discursive/batches
 * Lista os lotes de correção existentes com suas contagens e progresso
 */
router.get('/batches', requireAuth, async (req: Request, res: Response) => {
    try {
        const tenantId = req.user!.tenantId || '';
        const { examId, correctorId, status } = req.query;

        const whereClause: any = { tenantId };
        if (examId && examId !== 'all') whereClause.examId = String(examId);
        if (correctorId && correctorId !== 'all') whereClause.correctorId = String(correctorId);
        if (status && status !== 'all') whereClause.status = String(status);

        const batches = await prisma.correctionBatch.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            include: {
                exam: {
                    select: { id: true, title: true, date: true }
                },
                corrector: {
                    select: { id: true, name: true, email: true }
                },
                items: {
                    include: {
                        submission: {
                            select: {
                                id: true,
                                status: true,
                                totalScore: true,
                                subjectName: true,
                                submittedAt: true,
                                student: {
                                    select: {
                                        id: true,
                                        name: true,
                                        registrationNumber: true,
                                        email: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        const formatted = batches.map(batch => {
            const totalItems = batch.items.length;
            const completedItems = batch.items.filter(item => item.submission.status === 'CORRECTED').length;
            return {
                ...batch,
                totalItems,
                completedItems
            };
        });

        return res.json(formatted);
    } catch (error) {
        console.error('Erro ao listar lotes de correção:', error);
        return res.status(500).json({ error: 'Erro interno ao carregar lotes de correção.' });
    }
});

/**
 * GET /api/discursive/admin/submissions-by-exam
 * Lista todas as submissões de um simulado com informações do corretor/lote atual (para reatribuição granular)
 */
router.get('/admin/submissions-by-exam', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
        const tenantId = req.user!.tenantId || '';
        const { examId, status, subjectName, correctorId } = req.query;

        if (!examId || examId === 'all') {
            return res.status(400).json({ error: 'examId é obrigatório.' });
        }

        const whereClause: any = {
            tenantId,
            examId: String(examId)
        };
        if (status && status !== 'all') whereClause.status = String(status);
        if (subjectName && subjectName !== 'all' && subjectName !== 'Todas as Matérias') {
            whereClause.subjectName = String(subjectName);
        }
        if (correctorId && correctorId !== 'all') {
            whereClause.batchItem = {
                batch: {
                    correctorId: String(correctorId)
                }
            };
        }

        const submissions = await prisma.examSubmission.findMany({
            where: whereClause,
            orderBy: [{ subjectName: 'asc' }, { submittedAt: 'asc' }],
            include: {
                student: {
                    select: {
                        id: true,
                        name: true,
                        registrationNumber: true,
                        email: true
                    }
                },
                batchItem: {
                    include: {
                        batch: {
                            select: {
                                id: true,
                                status: true,
                                corrector: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        return res.json(submissions);
    } catch (error) {
        console.error('Erro ao listar submissões por exame:', error);
        return res.status(500).json({ error: 'Erro interno ao carregar submissões para reatribuição.' });
    }
});

/**
 * POST /api/discursive/admin/reassign-submissions
 * Reatribuição granular: permite enviar 1 ou mais provas para 1 ou múltiplos corretores (distribuindo uniformemente)
 */
router.post('/admin/reassign-submissions', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
        const tenantId = req.user!.tenantId || '';
        const { examId, submissionIds, targetCorrectorIds, returnToQueue } = req.body;

        if (!examId || !Array.isArray(submissionIds) || submissionIds.length === 0) {
            return res.status(400).json({ error: 'examId e um array de submissionIds são obrigatórios.' });
        }

        const exam = await prisma.exam.findFirst({
            where: { id: examId, tenantId }
        });
        if (!exam) {
            return res.status(404).json({ error: 'Simulado não encontrado.' });
        }

        const shouldReturnToQueue = returnToQueue === true || !Array.isArray(targetCorrectorIds) || targetCorrectorIds.length === 0;

        await prisma.$transaction(async (tx) => {
            await tx.correctionBatchItem.deleteMany({
                where: {
                    submissionId: { in: submissionIds }
                }
            });

            if (shouldReturnToQueue) {
                await tx.examSubmission.updateMany({
                    where: { id: { in: submissionIds } },
                    data: { status: 'PENDING_CORRECTION' }
                });
            } else {
                const correctors = await tx.user.findMany({
                    where: { id: { in: targetCorrectorIds }, tenantId }
                });
                if (correctors.length === 0) {
                    throw new Error('Nenhum corretor de destino válido foi encontrado.');
                }

                const distributionMap = new Map<string, string[]>();
                for (const corr of correctors) {
                    distributionMap.set(corr.id, []);
                }

                submissionIds.forEach((subId, idx) => {
                    const targetCorr = correctors[idx % correctors.length];
                    distributionMap.get(targetCorr.id)!.push(subId);
                });

                for (const [correctorId, subIds] of distributionMap.entries()) {
                    if (subIds.length === 0) continue;

                    let batch = await tx.correctionBatch.findFirst({
                        where: {
                            tenantId,
                            examId,
                            correctorId,
                            status: 'IN_PROGRESS'
                        }
                    });

                    if (!batch) {
                        batch = await tx.correctionBatch.create({
                            data: {
                                tenantId,
                                examId,
                                correctorId,
                                status: 'IN_PROGRESS'
                            }
                        });
                    }

                    for (const subId of subIds) {
                        await tx.correctionBatchItem.create({
                            data: {
                                batchId: batch.id,
                                submissionId: subId
                            }
                        });
                    }

                    await tx.examSubmission.updateMany({
                        where: { id: { in: subIds } },
                        data: { status: 'UNDER_CORRECTION' }
                    });
                }
            }

            const emptyBatches = await tx.correctionBatch.findMany({
                where: {
                    tenantId,
                    status: 'IN_PROGRESS',
                    items: { none: {} }
                },
                select: { id: true }
            });

            if (emptyBatches.length > 0) {
                await tx.correctionBatch.deleteMany({
                    where: { id: { in: emptyBatches.map(b => b.id) } }
                });
            }
        });

        const message = shouldReturnToQueue
            ? `${submissionIds.length} prova(s) devolvida(s) para a fila de pendentes com sucesso.`
            : `${submissionIds.length} prova(s) reatribuída(s) com sucesso entre ${targetCorrectorIds.length} corretor(es).`;

        return res.json({
            message,
            reassignedCount: submissionIds.length,
            correctorsCount: shouldReturnToQueue ? 0 : targetCorrectorIds.length
        });
    } catch (error: any) {
        console.error('Erro na reatribuição granular:', error);
        return res.status(500).json({ error: error?.message || 'Erro interno ao reatribuir provas.' });
    }
});

/**
 * POST /api/discursive/admin/reopen-submission
 * Permite que um administrador reabra/devolva uma correção já finalizada para o corretor reavaliar
 */
router.post('/admin/reopen-submission', requireAuth, async (req: Request, res: Response) => {
    try {
        const tenantId = req.user!.tenantId || '';
        const isAdmin = ['admin', 'super_admin'].includes(req.user!.role);

        if (!isAdmin) {
            return res.status(403).json({ error: 'Apenas administradores podem reabrir ou devolver correções.' });
        }

        const { submissionId } = req.body;
        if (!submissionId) {
            return res.status(400).json({ error: 'submissionId é obrigatório.' });
        }

        const submission = await prisma.examSubmission.findFirst({
            where: { id: submissionId, tenantId },
            include: { batchItem: true }
        });

        if (!submission) {
            return res.status(404).json({ error: 'Submissão não encontrada.' });
        }

        const updated = await prisma.examSubmission.update({
            where: { id: submission.id },
            data: {
                status: 'UNDER_CORRECTION'
            }
        });

        if (submission.batchItem?.batchId) {
            await prisma.correctionBatch.update({
                where: { id: submission.batchItem.batchId },
                data: { status: 'IN_PROGRESS' }
            });
        }

        return res.json({
            message: 'Correção reaberta/devolvida ao corretor com sucesso.',
            submission: updated
        });
    } catch (error) {
        console.error('Erro em admin/reopen-submission:', error);
        return res.status(500).json({ error: 'Erro interno ao devolver correção.' });
    }
});

export default router;
