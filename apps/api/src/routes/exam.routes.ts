import { Router } from 'express';
import { prisma } from '@repo/database';
import { requireAuth, requireStaff } from '../middlewares/auth.middleware';

const router = Router();

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

// POST /api/exams - Create a new exam
router.post('/', requireAuth, requireStaff, async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;
        const { title, date, totalQuestions, type, isPublished } = req.body;

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
                isPublished: isPublished || false
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
        const { title, date, totalQuestions, type, isPublished } = req.body;

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
        const exams = await prisma.exam.findMany({
            where: { tenantId, isPublished: true },
            orderBy: { date: 'desc' },
            select: {
                id: true,
                title: true,
                date: true,
                type: true,
                totalQuestions: true
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
            where: { id: examId, tenantId, isPublished: true },
            select: { id: true, title: true, totalQuestions: true, type: true }
        });

        if (!exam) {
            return res.status(404).json({ error: 'Simulado não encontrado ou indisponível.' });
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
        const { answers } = req.body; // Array of { questionNumber, chosenAlternative, language }

        if (!Array.isArray(answers)) {
            return res.status(400).json({ error: 'Formato inválido. Esperado array de respostas.' });
        }

        const exam = await prisma.exam.findFirst({
            where: { id: examId, tenantId, isPublished: true }
        });

        if (!exam) {
            return res.status(404).json({ error: 'Simulado não encontrado ou indisponível.' });
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

        res.status(200).json({ message: 'Respostas salvas com sucesso.' });
    } catch (error) {
        console.error("Erro ao salvar respostas do aluno:", error);
        res.status(500).json({ error: 'Erro interno ao salvar respostas.' });
    }
});

export default router;
