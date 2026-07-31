import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as archiver from 'archiver';
import path from 'path';
import fs from 'fs';
import { prisma } from '@repo/database';
import { requireAuth, requireAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'uploads', 'discursive');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration for saving PDF files
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `essay-${uniqueSuffix}.pdf`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB limit
    fileFilter: (_req, file, cb) => {
        if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos no formato PDF são permitidos.'));
        }
    }
});

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

        // Formata os dados para facilitar o consumo no front-end
        const formattedExams = exams.map(exam => ({
            id: exam.id,
            title: exam.title,
            createdAt: exam.createdAt,
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
        }));

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
        const submissionId = req.params.submissionId;

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

        const pdfPath = path.isAbsolute(sub.studentPdfUrl)
            ? sub.studentPdfUrl
            : path.resolve(process.cwd(), sub.studentPdfUrl);

        if (!fs.existsSync(pdfPath)) {
            return res.status(404).json({ error: 'Arquivo PDF não encontrado no servidor.' });
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
            // Remove uploaded file if missing parameters
            if (req.file.path && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({ error: 'essayExamId e essayExamSubjectId são obrigatórios.' });
        }

        // Verifica se o simulado e a matéria existem
        const examSubject = await prisma.essayExamSubject.findFirst({
            where: {
                id: essayExamSubjectId,
                essayExamId,
                essayExam: { tenantId }
            }
        });

        if (!examSubject) {
            if (req.file.path && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(404).json({ error: 'Simulado ou matéria não encontrada.' });
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
            if (req.file.path && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({ error: 'Você já enviou sua resolução para esta matéria. O reenvio não é permitido.' });
        }

        const relativeFilePath = req.file.path;

        // Upsert na EssaySubmission
        const submission = await prisma.essaySubmission.upsert({
            where: {
                essayExamId_essayExamSubjectId_studentId: {
                    essayExamId,
                    essayExamSubjectId,
                    studentId
                }
            },
            update: {
                studentPdfUrl: relativeFilePath,
                submittedAt: new Date(),
                status: 'PENDING'
            },
            create: {
                tenantId,
                essayExamId,
                essayExamSubjectId,
                studentId,
                studentPdfUrl: relativeFilePath,
                status: 'PENDING'
            },
            include: {
                subject: true,
                essayExam: true
            }
        });

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
        const { title, subjects } = req.body; // subjects: array de IDs ou Nomes de matérias

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
        const examId = req.params.id;
        const { title, subjects } = req.body;

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
        const examId = req.params.id;

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
        const examId = req.params.examId;

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

        // Retorna a lista de submissões
        return res.json({
            exam: {
                id: exam.id,
                title: exam.title,
                subjects: exam.subjects
            },
            submissions: submissions.map(sub => ({
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
            }))
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

        const submissions = await prisma.essaySubmission.findMany({
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

        if (submissions.length === 0) {
            return res.status(404).json({ error: 'Nenhuma submissão encontrada com os IDs fornecidos.' });
        }

        const ArchiverClass = (archiver as any).ZipArchive || (archiver as any).default?.ZipArchive || (archiver as any);
        const archive = typeof ArchiverClass === 'function' && ArchiverClass.prototype?.pipe
            ? new ArchiverClass({ zlib: { level: 9 } })
            : (archiver as any)('zip', { zlib: { level: 9 } });

        const zipFilename = `Submissoes_Discursivas_${Date.now()}.zip`;
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

        archive.on('error', (err) => {
            console.error('Erro na criação do arquivo .ZIP:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Erro ao gerar arquivo .zip.' });
            }
        });

        archive.pipe(res);

        for (const sub of submissions) {
            const formattedName = formatSubmissionFilename(
                sub.student.name,
                sub.essayExam.title,
                sub.subject.subjectName
            );

            const pdfPath = path.isAbsolute(sub.studentPdfUrl)
                ? sub.studentPdfUrl
                : path.resolve(process.cwd(), sub.studentPdfUrl);

            if (fs.existsSync(pdfPath)) {
                archive.file(pdfPath, { name: formattedName });
            } else {
                console.warn(`Arquivo não encontrado no disco para submissão ${sub.id}: ${pdfPath}`);
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
        const submissionId = req.params.submissionId;

        const sub = await prisma.essaySubmission.findFirst({
            where: {
                id: submissionId,
                tenantId
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

        const pdfPath = path.isAbsolute(sub.studentPdfUrl)
            ? sub.studentPdfUrl
            : path.resolve(process.cwd(), sub.studentPdfUrl);

        if (!fs.existsSync(pdfPath)) {
            return res.status(404).json({ error: 'Arquivo PDF não encontrado no servidor.' });
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

export default router;
