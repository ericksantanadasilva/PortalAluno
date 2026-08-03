import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as archiver from 'archiver';
import path from 'path';
import fs from 'fs';
import { prisma } from '@repo/database';
import { requireAuth, requireAdmin } from '../middlewares/auth.middleware';
import { uploadToDrive, getDriveFileStream, extractDriveFileId, getDiscursiveFolderId } from '../services/drive.service';

const router = Router();

// Storage em memória para fazer upload diretamente no Google Drive
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB limit
    fileFilter: (_req, file, cb) => {
        if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos no formato PDF são permitidos.'));
        }
    }
});

const uploadDir = path.join(process.cwd(), 'uploads', 'discursive');


/**
 * HELPER: Normaliza e formata o nome do arquivo seguindo rigorosamente o padrão:
 * [NOME DO ALUNO] - [NOME DO SIMULADO] ([NOME DA MATERIA]).pdf
 */
export function formatSubmissionFilename(studentName: string, examTitle: string, subjectName: string): string {
    const clean = (str: string) =>
        str
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove acentos
            .replace(/[/\\?%*:|"<>]/g, '')   // Remove caracteres inválidos para OS
            .trim();

    const cleanStudent = clean(studentName).toUpperCase();
    const cleanExam = clean(examTitle).toUpperCase();
    const cleanSubject = clean(subjectName).toUpperCase();

    return `${cleanStudent} - ${cleanExam} (${cleanSubject}).pdf`;
}

/**
 * HELPER: Resolve o caminho do PDF no disco de forma resiliente em qualquer ambiente
 * (PC local, Codespaces, Docker, etc.), mesmo que o caminho salvo no DB seja de outro OS/máquina.
 */
export function resolvePdfPath(storedPath: string): string | null {
    if (!storedPath) return null;

    // 1. Se o caminho exato existe no disco
    if (fs.existsSync(storedPath)) {
        return storedPath;
    }

    // 2. Tenta resolver relativo ao process.cwd()
    const relativeToCwd = path.resolve(process.cwd(), storedPath);
    if (fs.existsSync(relativeToCwd)) {
        return relativeToCwd;
    }

    // 3. Tenta buscar pelo nome do arquivo (basename) nos diretórios de upload prováveis
    const filename = path.basename(storedPath);

    const candidates = [
        path.join(uploadDir, filename),
        path.resolve(process.cwd(), 'apps', 'api', 'uploads', 'discursive', filename),
        path.resolve(process.cwd(), 'uploads', 'discursive', filename),
        path.resolve(__dirname, '..', '..', 'uploads', 'discursive', filename)
    ];

    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }

    return null;
}

/* ==========================================================================
   ROTAS DE ALUNO
   ========================================================================== */

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
 * A) POST /api/discursive/submit
 * Recebe `essayExamId`, `essayExamSubjectId` e o arquivo PDF do aluno.
 */
router.post('/submit', requireAuth, upload.single('file') as any, async (req: Request, res: Response) => {
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

        // Verifica se o simulado e a matéria existem
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

        // Upload do arquivo para a pasta do Google Drive
        const driveResult = await uploadToDrive({
            buffer: req.file.buffer,
            filename: formattedFilename,
            mimetype: req.file.mimetype || 'application/pdf'
        });

        // Upsert na EssaySubmission com o link do Google Drive
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

        // Sincronização automática em tempo real para a tabela ExamSubmission (novo fluxo de correção - 1 por arquivo/matéria)
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

/* ==========================================================================
   ROTAS DE ADMIN / SECRETARIA
   ========================================================================== */

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
        const { title, subjects, windowStart, windowEnd } = req.body; // subjects: array de IDs ou Nomes de matérias

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

        // Verifica se já existe um EssayExam com o mesmo título para este tenant
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
 * B) GET /api/discursive/admin/:examId/submissions
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

        // Retorna a lista completa sem duplicatas (presenciais e online unificados)
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
 * C) POST /api/discursive/admin/download-batch
 * Recebe um array de `submissionIds`: `string[]`.
 * Gera um arquivo `.zip` dinâmico via `archiver` contendo os PDFs renomeados com o padrão:
 * `[NOME DO ALUNO] - [NOME DO SIMULADO] ([NOME DA MATERIA]).pdf`
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
 * D) GET /api/discursive/admin/download-single/:submissionId
 * Faz o download de um único PDF forçando o nome da resposta no mesmo padrão formatado:
 * `[NOME DO ALUNO] - [NOME DO SIMULADO] ([NOME DA MATERIA]).pdf`
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

/* ==========================================================================
   ROTAS DE GESTÃO E CORREÇÃO DE SIMULADOS DISCURSIVOS (NOVO FLUXO UNIFICADO)
   ========================================================================== */

/**
 * Sincroniza submissões online do aluno criadas em EssaySubmission para o novo fluxo unificado (ExamSubmission)
 */
async function syncOnlineSubmissionsToNewFlow(tenantId: string) {
    try {
        const essaySubs = await prisma.essaySubmission.findMany({
            where: { tenantId },
            include: { essayExam: true, subject: true }
        });

        for (const sub of essaySubs) {
            if (!sub.essayExam || !sub.studentPdfUrl) continue;

            const exam = await prisma.exam.findFirst({
                where: {
                    OR: [
                        { id: sub.essayExamId },
                        {
                            tenantId,
                            title: { equals: sub.essayExam.title.trim(), mode: 'insensitive' }
                        }
                    ]
                }
            });

            if (exam) {
                const existing = await prisma.examSubmission.findFirst({
                    where: {
                        examId: exam.id,
                        studentId: sub.studentId,
                        originalPdfUrl: sub.studentPdfUrl
                    }
                });

                if (existing) {
                    if (sub.subject?.subjectName && existing.subjectName !== sub.subject.subjectName) {
                        await prisma.examSubmission.update({
                            where: { id: existing.id },
                            data: {
                                subjectId: sub.essayExamSubjectId || null,
                                subjectName: sub.subject.subjectName
                            }
                        });
                    }
                } else {
                    await prisma.examSubmission.create({
                        data: {
                            tenantId,
                            examId: exam.id,
                            studentId: sub.studentId,
                            subjectId: sub.essayExamSubjectId || null,
                            subjectName: sub.subject?.subjectName || 'Geral',
                            type: 'ONLINE',
                            status: sub.status === 'CORRECTED' ? 'CORRECTED' : 'PENDING_CORRECTION',
                            originalPdfUrl: sub.studentPdfUrl,
                            submittedAt: sub.submittedAt
                        }
                    });
                }
            }
        }
    } catch (e) {
        console.error('Erro ao sincronizar submissões online do aluno para o novo fluxo:', e);
    }
}

/**
 * GET /api/discursive/exams
 * Lista os simulados do tenant atual com contagem de questões e submissões
 */
router.get('/exams', requireAuth, async (req: Request, res: Response) => {
    try {
        const tenantId = req.user!.tenantId || '';

        // Executa sincronização de submissões online pretéritas para o novo modelo de correção
        await syncOnlineSubmissionsToNewFlow(tenantId);

        // Sincroniza automaticamente simulados discursivos criados em EssayExam para a tabela Exam
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
                    // Fallback para caso a tabela de submissões ainda não esteja migrada no BD do tenant
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
                    // Fallback se não conseguir carregar disciplinas
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
 * POST /api/discursive/presential-upload
 * Upload Presencial em Lote (PDFs nomeados pela Matrícula, salvando no Google Drive)
 */
router.post('/presential-upload', requireAuth, upload.array('files', 100), async (req: Request, res: Response) => {
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
                    select: {
                        id: true,
                        title: true,
                        date: true
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
 * POST /api/discursive/batches
 * Cria um novo lote de correção distribuindo quantidade N de provas pendentes para um corretor
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
            // 1. Remove os itens dos lotes atuais
            await tx.correctionBatchItem.deleteMany({
                where: {
                    submissionId: { in: submissionIds }
                }
            });

            if (shouldReturnToQueue) {
                // 2A. Devolve para fila de pendentes
                await tx.examSubmission.updateMany({
                    where: { id: { in: submissionIds } },
                    data: { status: 'PENDING_CORRECTION' }
                });
            } else {
                // 2B. Distribui entre 1 ou vários corretores em round-robin
                const correctors = await tx.user.findMany({
                    where: { id: { in: targetCorrectorIds }, tenantId }
                });
                if (correctors.length === 0) {
                    throw new Error('Nenhum corretor de destino válido foi encontrado.');
                }

                // Distribuição circular (round-robin)
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

            // 3. Limpeza de lotes que ficaram vazios e estão EM ANDAMENTO
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
router.post('/corrector/submit-grade', requireAuth, upload.single('correctedPdf'), async (req: Request, res: Response) => {
    try {
        const tenantId = req.user!.tenantId || '';
        const userId = req.user!.userId;
        const isAdmin = ['admin', 'super_admin'].includes(req.user!.role);

        const { submissionId, finalize } = req.body;
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
            const folderId = await getDiscursiveFolderId(`Simulado - ${submission.exam.title} - Corrigidas`);
            const driveResult = await uploadToDrive({
                buffer: req.file.buffer,
                filename: `CORRIGIDA - ${submissionId} - ${req.file.originalname}`,
                mimetype: req.file.mimetype || 'application/pdf',
                folderId
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
            const allQuestions = submission.exam.examQuestions;
            const savedGrades = await prisma.essayQuestionGrade.findMany({
                where: { submissionId: submission.id }
            });

            const savedMap = new Map(savedGrades.map(g => [g.questionId, g.score]));
            const missingNumbers: number[] = [];
            let totalSum = 0;

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

        const url = type === 'corrected' ? sub.correctedPdfUrl : sub.originalPdfUrl;
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
