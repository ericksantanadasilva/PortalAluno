import { Router } from 'express';
import { prisma } from '@repo/database';
import { requireAuth, requireStaff } from '../middlewares/auth.middleware';
import { closeExam } from '../controllers/examClosing.controller';
import { importOmr } from '../controllers/importOmr.controller';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/exams - List all exams
router.get('/', requireAuth, requireStaff, async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;
        const exams = await prisma.exam.findMany({
            where: { tenantId },
            orderBy: { date: 'desc' }
        });
        res.json(exams);
    } catch (error) {
        console.error("Erro ao listar simulados:", error);
        res.status(500).json({ error: 'Erro interno ao listar simulados.' });
    }
});

// POST /api/exams/close - Fechar o simulado e calcular TRI/UERJ
router.post('/close', requireAuth, requireStaff, closeExam);

// POST /api/exams/import-omr - Importar Cartões OMR via CSV/XLSX
router.post('/import-omr', requireAuth, requireStaff, upload.single('file'), importOmr);

// POST /api/exams - Create a new exam
router.post('/', requireAuth, requireStaff, async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;
        const { title, date, totalQuestions, type, isPublished, isEnemFull, windowStart, windowEnd, windowStart2, windowEnd2 } = req.body;

        if (!title || !date) {
            return res.status(400).json({ error: 'Título e data são obrigatórios.' });
        }

        const newExam = await prisma.exam.create({
            data: {
                tenantId,
                title,
                date: new Date(date),
                totalQuestions: totalQuestions || 60,
                type: type || 'enem',
                isPublished: isPublished || false,
                isEnemFull: isEnemFull || false,
                windowStart: windowStart ? new Date(windowStart) : new Date(),
                windowEnd: windowEnd ? new Date(windowEnd) : new Date(),
                windowStart2: windowStart2 ? new Date(windowStart2) : null,
                windowEnd2: windowEnd2 ? new Date(windowEnd2) : null
            }
        });

        res.status(201).json(newExam);
    } catch (error) {
        console.error("Erro ao criar simulado:", error);
        res.status(500).json({ error: 'Erro interno ao criar simulado.' });
    }
});

// DELETE /api/exams/:id - Delete an exam
router.delete('/:id', requireAuth, requireStaff, async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;
        const examId = req.params.id;

        const exam = await prisma.exam.findFirst({
            where: { id: examId, tenantId }
        });

        if (!exam) {
            return res.status(404).json({ error: 'Simulado não encontrado.' });
        }

        await prisma.exam.delete({
            where: { id: examId }
        });

        res.status(200).json({ message: 'Simulado removido com sucesso.' });
    } catch (error) {
        console.error("Erro ao remover simulado:", error);
        res.status(500).json({ error: 'Erro interno ao remover simulado.' });
    }
});

// PUT /api/exams/:id - Update an exam
router.put('/:id', requireAuth, requireStaff, async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;
        const examId = req.params.id;
        const { title, date, totalQuestions, type, isPublished, isEnemFull, windowStart, windowEnd, windowStart2, windowEnd2 } = req.body;

        const exam = await prisma.exam.findFirst({
            where: { id: examId, tenantId }
        });

        if (!exam) {
            return res.status(404).json({ error: 'Simulado não encontrado.' });
        }

        const updatedExam = await prisma.exam.update({
            where: { id: examId },
            data: {
                title: title !== undefined ? title : exam.title,
                date: date !== undefined ? new Date(date) : exam.date,
                totalQuestions: totalQuestions !== undefined ? totalQuestions : exam.totalQuestions,
                type: type !== undefined ? type : exam.type,
                isPublished: isPublished !== undefined ? isPublished : exam.isPublished,
                isEnemFull: isEnemFull !== undefined ? isEnemFull : exam.isEnemFull,
                windowStart: windowStart !== undefined ? new Date(windowStart) : exam.windowStart,
                windowEnd: windowEnd !== undefined ? new Date(windowEnd) : exam.windowEnd,
                windowStart2: windowStart2 !== undefined ? (windowStart2 ? new Date(windowStart2) : null) : (exam as any).windowStart2,
                windowEnd2: windowEnd2 !== undefined ? (windowEnd2 ? new Date(windowEnd2) : null) : (exam as any).windowEnd2,
            }
        });

        res.status(200).json(updatedExam);
    } catch (error) {
        console.error("Erro ao atualizar simulado:", error);
        res.status(500).json({ error: 'Erro interno ao atualizar simulado.' });
    }
});

// GET /api/exams/:id/questions - Get answer keys for an exam
router.get('/:id/questions', requireAuth, requireStaff, async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;
        const examId = req.params.id;

        const exam = await prisma.exam.findFirst({
            where: { id: examId, tenantId }
        });

        if (!exam) {
            return res.status(404).json({ error: 'Simulado não encontrado.' });
        }

        const questions = await prisma.examQuestion.findMany({
            where: { examId },
            orderBy: { questionNumber: 'asc' }
        });

        res.json(questions);
    } catch (error) {
        console.error("Erro ao listar gabarito:", error);
        res.status(500).json({ error: 'Erro interno ao listar gabarito.' });
    }
});

// PUT /api/exams/:id/questions - Upsert answer keys for an exam
router.put('/:id/questions', requireAuth, requireStaff, async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;
        const examId = req.params.id;
        const { answers } = req.body; // Array of { questionNumber, correctAlternative, isAnnulled, subjectId, difficultyTier }

        if (!Array.isArray(answers)) {
            return res.status(400).json({ error: 'Formato inválido. Esperado array de respostas.' });
        }

        const exam = await prisma.exam.findFirst({
            where: { id: examId, tenantId }
        });

        if (!exam) {
            return res.status(404).json({ error: 'Simulado não encontrado.' });
        }
        
        // As subjectId is required by schema, if the frontend doesn't send it, we need a fallback.
        // Let's get the first subject of the tenant as a fallback for now.
        let defaultSubjectId = answers[0]?.subjectId;
        if (!defaultSubjectId) {
            const firstSubject = await prisma.subject.findFirst({ where: { tenantId } });
            if (!firstSubject) {
                return res.status(400).json({ error: 'Nenhuma disciplina cadastrada na unidade para vincular às questões.' });
            }
            defaultSubjectId = firstSubject.id;
        }

        const upsertPromises = answers.map((ans: any) => {
            const lang = ans.language || 'none';
            return prisma.examQuestion.upsert({
                where: {
                    examId_questionNumber_language: {
                        examId: examId,
                        questionNumber: ans.questionNumber,
                        language: lang
                    }
                },
                update: {
                    correctAlternative: ans.correctAlternative || 'A',
                    isAnnulled: ans.isAnnulled || false,
                    difficultyTier: ans.difficultyTier || 'medio',
                    subjectId: ans.subjectId || defaultSubjectId,
                    theme: ans.theme || null
                },
                create: {
                    examId: examId,
                    questionNumber: ans.questionNumber,
                    correctAlternative: ans.correctAlternative || 'A',
                    isAnnulled: ans.isAnnulled || false,
                    difficultyTier: ans.difficultyTier || 'medio',
                    subjectId: ans.subjectId || defaultSubjectId,
                    theme: ans.theme || null,
                    language: lang
                }
            });
        });

        await prisma.$transaction(upsertPromises);

        res.status(200).json({ message: 'Gabarito salvo com sucesso.' });
    } catch (error) {
        console.error("Erro ao salvar gabarito:", error);
        res.status(500).json({ error: 'Erro interno ao salvar gabarito.' });
    }
});

// GET /api/exams/available - List published exams for students
router.get('/available', requireAuth, async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;
        const studentId = req.user!.userId;
        const currentDate = new Date();
        const exams = await prisma.exam.findMany({
            where: { 
                tenantId,
                windowStart: { lte: new Date(currentDate.getTime() + 2 * 24 * 60 * 60 * 1000) },
                OR: [
                    { windowEnd2: { gte: new Date(currentDate.getTime() - 3 * 24 * 60 * 60 * 1000) } },
                    { windowEnd2: null, windowEnd: { gte: new Date(currentDate.getTime() - 3 * 24 * 60 * 60 * 1000) } }
                ]
            },
            orderBy: { date: 'desc' },
            select: {
                id: true,
                title: true,
                date: true,
                type: true,
                totalQuestions: true,
                isEnemFull: true,
                windowStart: true,
                windowEnd: true,
                windowStart2: true,
                windowEnd2: true,
                examSessions: {
                    where: { studentId }
                }
            }
        });
        res.json(exams);
    } catch (error) {
        console.error("Erro ao listar simulados disponíveis:", error);
        res.status(500).json({ error: 'Erro interno ao listar simulados.' });
    }
});

// GET /api/exams/:id/responses - Get student's responses for a specific exam
router.get('/:id/responses', requireAuth, async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;
        const studentId = req.user!.userId;
        const examId = req.params.id;

        const exam = await prisma.exam.findFirst({
            where: { id: examId, tenantId },
            select: { id: true, title: true, totalQuestions: true, type: true, windowStart: true, windowEnd: true, windowStart2: true, windowEnd2: true }
        });

        if (!exam) {
            return res.status(404).json({ error: 'Simulado não encontrado ou indisponível.' });
        }

        const now = new Date();
        const finalEnd = exam.windowEnd2 || exam.windowEnd;
        if (finalEnd && now > finalEnd) {
            return res.status(403).json({ error: 'O prazo para acessar este simulado foi encerrado.' });
        }
        if (exam.windowStart && now < exam.windowStart) {
            return res.status(403).json({ error: 'O prazo para acessar este simulado ainda não começou.' });
        }

        // Fetch exam questions to know which ones require language selection
        const questions = await prisma.examQuestion.findMany({
            where: { examId },
            select: { questionNumber: true, language: true, isAnnulled: true }
        });

        const responses = await prisma.studentResponse.findMany({
            where: { examId, studentId }
        });

        res.json({ exam, questions, responses });
    } catch (error) {
        console.error("Erro ao buscar respostas do aluno:", error);
        res.status(500).json({ error: 'Erro interno ao buscar respostas.' });
    }
});

// PUT /api/exams/:id/responses - Upsert student's responses
router.put('/:id/responses', requireAuth, async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;
        const studentId = req.user!.userId;
        const examId = req.params.id;
        const { answers, dayNumber } = req.body; // Array of { questionNumber, chosenAlternative, language }

        if (!Array.isArray(answers)) {
            return res.status(400).json({ error: 'Formato inválido. Esperado array de respostas.' });
        }

        const exam = await prisma.exam.findFirst({
            where: { id: examId, tenantId }
        });

        if (!exam) {
            return res.status(404).json({ error: 'Simulado não encontrado ou indisponível.' });
        }

        const now = new Date();
        const targetStart = dayNumber === 2 && exam.windowStart2 ? exam.windowStart2 : exam.windowStart;
        const targetEnd = dayNumber === 2 && exam.windowEnd2 ? exam.windowEnd2 : exam.windowEnd;

        if (targetEnd && now > targetEnd) {
            return res.status(403).json({ error: 'O prazo para envio das respostas deste dia foi encerrado.' });
        }
        if (targetStart && now < targetStart) {
            return res.status(403).json({ error: 'O prazo para envio das respostas deste dia ainda não começou.' });
        }

        // To save responses, we upsert based on [studentId_examId_questionNumber]
        const upsertPromises = answers.map((ans: any) => {
            const lang = ans.language || 'none';
            return prisma.studentResponse.upsert({
                where: {
                    studentId_examId_questionNumber: {
                        studentId: studentId,
                        examId: examId,
                        questionNumber: ans.questionNumber
                    }
                },
                update: {
                    chosenAlternative: ans.chosenAlternative,
                    language: lang,
                    tenantId: tenantId
                },
                create: {
                    tenantId: tenantId,
                    studentId: studentId,
                    examId: examId,
                    questionNumber: ans.questionNumber,
                    chosenAlternative: ans.chosenAlternative,
                    language: lang,
                    isCorrect: false, // will be evaluated later on correction process
                    importedViaRemark: false
                }
            });
        });

        await prisma.$transaction(upsertPromises);

        if (dayNumber) {
            await prisma.examSession.upsert({
                where: {
                    examId_studentId_dayNumber: {
                        examId: examId,
                        studentId: studentId,
                        dayNumber: dayNumber
                    }
                },
                update: { submitted: true },
                create: {
                    tenantId,
                    examId,
                    studentId,
                    dayNumber: dayNumber,
                    submitted: true
                }
            });
        }

        res.status(200).json({ message: 'Respostas salvas com sucesso.' });
    } catch (error) {
        console.error("Erro ao salvar respostas do aluno:", error);
        res.status(500).json({ error: 'Erro interno ao salvar respostas.' });
    }
});

// PATCH /api/exams/admin/answers - Rota para edição administrativa
router.patch('/admin/answers', requireAuth, requireStaff, async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;
        const { examId, studentId, questionNumber, chosenAlternative } = req.body;

        if (!examId || !studentId || !questionNumber) {
            return res.status(400).json({ error: 'Faltam campos obrigatórios.' });
        }

        const updatedResponse = await prisma.studentResponse.update({
            where: {
                studentId_examId_questionNumber: {
                    studentId,
                    examId,
                    questionNumber
                }
            },
            data: {
                chosenAlternative,
                tenantId // Garante consistência do tenant
            }
        });

        res.status(200).json(updatedResponse);
    } catch (error) {
        console.error("Erro ao editar resposta do aluno como admin:", error);
        res.status(500).json({ error: 'Erro interno ao editar resposta.' });
    }
});

// POST /api/exams/admin/reset-session - Permite que a secretaria libere o aluno para repreencher
router.post('/admin/reset-session', requireAuth, requireStaff, async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;
        const { examId, studentRegistration } = req.body;

        if (!examId || !studentRegistration) {
            return res.status(400).json({ error: 'Faltam campos obrigatórios (examId, studentRegistration).' });
        }

        const student = await prisma.user.findFirst({
            where: { registrationNumber: studentRegistration, tenantId }
        });

        if (!student) {
            return res.status(404).json({ error: 'Nenhum aluno encontrado com esta matrícula nesta unidade.' });
        }

        // Deleta as sessoes desse aluno para o simulado
        const deleted = await prisma.examSession.deleteMany({
            where: { examId, studentId: student.id }
        });

        res.status(200).json({ message: 'Submissão resetada com sucesso. O aluno já pode preencher o cartão novamente.', deletedCount: deleted.count });
    } catch (error) {
        console.error("Erro ao resetar sessão do aluno:", error);
        res.status(500).json({ error: 'Erro interno ao resetar sessão.' });
    }
});

export default router;
