import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { prisma } from '@repo/database';

export const uploadDir = path.join(process.cwd(), 'uploads', 'discursive');

export const discursiveUpload = multer({
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

/**
 * Normaliza e formata o nome do arquivo seguindo rigorosamente o padrão:
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
 * Gera o cabeçalho Content-Disposition seguindo padrão RFC 5987 e compatível com navegadores
 * para garantir visualização inline e nome de arquivo sem truncar por espaços.
 */
export function formatContentDispositionHeader(filename: string, inline = true): string {
    const type = inline ? 'inline' : 'attachment';
    const asciiFilename = filename
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s.-]/g, '')
        .replace(/\s+/g, '_');
    const encodedFilename = encodeURIComponent(filename);
    return `${type}; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`;
}

/**
 * Resolve o caminho do PDF no disco de forma resiliente em qualquer ambiente
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

/**
 * Executa sincronização de submissões online pretéritas para o novo modelo de correção.
 */
export async function syncOnlineSubmissionsToNewFlow(tenantId: string): Promise<void> {
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
 * Sincroniza automaticamente simulados discursivos criados em EssayExam para a tabela Exam.
 */
export async function syncEssayExamsToExams(tenantId: string): Promise<void> {
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
}
