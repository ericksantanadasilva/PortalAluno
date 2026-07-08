import { Router } from 'express';
import { prisma } from '@repo/database';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;
        const loggedUserRole = req.user!.role;
        const loggedUserId = req.user!.userId;
        
        let targetStudentId = loggedUserId;
        
        // If staff/admin, allow viewing other student's boletim
        if (loggedUserRole !== 'aluno' && req.query.studentId) {
            targetStudentId = req.query.studentId as string;
        }

        // 1. Fetch the student to get their class and tenant
        const student = await prisma.user.findFirst({
            where: { id: targetStudentId, tenantId },
            include: { class: true, tenant: true }
        });

        if (!student) {
            return res.status(404).json({ error: 'Aluno não encontrado.' });
        }

        // 2. Find all exams this student has responded to
        // An exam is considered taken if they have at least one StudentResponse
        const examsTaken = await prisma.studentResponse.findMany({
            where: { studentId: targetStudentId, tenantId },
            select: { examId: true },
            distinct: ['examId']
        });
        
        const examIds = examsTaken.map(e => e.examId);

        if (examIds.length === 0) {
            return res.json([]);
        }

        // 3. For each exam, fetch details, questions, and responses
        const exams = await prisma.exam.findMany({
            where: { id: { in: examIds }, isPublished: true },
            include: {
                examQuestions: {
                    include: { subject: true }
                },
                studentResponses: {
                    where: { tenantId }
                }, // fetch ALL responses for these exams to calculate class averages
                examGrades: {
                    where: { tenantId }
                }
            }
        });

        // 4. Transform into BoletimData format
        const boletins = exams.map(exam => {
            // A) Filter student's responses
            const myResponses = exam.studentResponses.filter(r => r.studentId === targetStudentId);
            
            // Map questions by (questionNumber_language) for quick lookup
            const questionsMap = new Map();
            exam.examQuestions.forEach(q => {
                questionsMap.set(`${q.questionNumber}_${q.language}`, q);
                // Also map 'none' language as fallback if student response has no language or 'none'
                if (q.language === 'none') {
                    questionsMap.set(`${q.questionNumber}_none`, q);
                }
            });

            // B) Evaluate student score
            let correctCount = 0;
            const subjectPerformance: Record<string, { acertos: number, total: number }> = {};
            const themePerformance: Record<string, { acertos: number, total: number, subject: string, firstErrorQ?: number }> = {};
            
            // Populate total per subject/theme based on the questions the student actually faced (or all 'none' + their selected language)
            // To keep it simple, we just look at what the student answered. But what if they didn't answer some?
            // A better way: figure out the active questions for this student.
            // Active questions = 'none' language + the foreign language they chose.
            // Let's find their chosen foreign language, if any
            let chosenForeignLanguage = 'none';
            myResponses.forEach(r => {
                if (r.language && r.language !== 'none') {
                    chosenForeignLanguage = r.language;
                }
            });

            const activeQuestions = exam.examQuestions.filter(q => q.language === 'none' || q.language === chosenForeignLanguage);
            const activeQuestionsCount = activeQuestions.length > 0 ? activeQuestions.length : exam.totalQuestions;

            // Initialize subjects and themes
            activeQuestions.forEach(q => {
                const subjName = q.subject?.name || 'Geral';
                if (!subjectPerformance[subjName]) {
                    subjectPerformance[subjName] = { acertos: 0, total: 0 };
                }
                subjectPerformance[subjName].total += 1;

                if (q.theme) {
                    if (!themePerformance[q.theme]) {
                        themePerformance[q.theme] = { acertos: 0, total: 0, subject: subjName };
                    }
                    themePerformance[q.theme].total += 1;
                }
            });

            const raioX: any[] = [];
            const wrongQuestions: any[] = [];

            // Calculate student performance
            activeQuestions.forEach(q => {
                const resp = myResponses.find(r => r.questionNumber === q.questionNumber && (r.language === q.language || q.language === 'none'));
                
                const subjName = q.subject?.name || 'Geral';
                let acertou = false;
                
                if (q.isAnnulled) {
                    acertou = true;
                } else if (resp && resp.isCorrect) {
                    // Usa a flag isCorrect já processada pelo motor de fechamento
                    acertou = true;
                }
                
                if (q.theme) {
                    if (!themePerformance[q.theme]) {
                        themePerformance[q.theme] = { acertos: 0, total: 0, subject: subjName };
                    }
                    themePerformance[q.theme].total += 1;
                }

                if (acertou) {
                    correctCount++;
                    if (subjectPerformance[subjName]) {
                        if (!subjectPerformance[subjName]) subjectPerformance[subjName] = { acertos: 0, total: 0 };
                        subjectPerformance[subjName].acertos++;
                    }
                    if (q.theme && themePerformance[q.theme]) themePerformance[q.theme].acertos++;
                } else {
                    wrongQuestions.push({
                        tema: q.theme || 'Sem Tema',
                        disciplina: subjName,
                        questao: q.questionNumber
                    });
                }
                
                if (!subjectPerformance[subjName]) subjectPerformance[subjName] = { acertos: 0, total: 0 };
                subjectPerformance[subjName].total += 1;

                raioX.push({
                    numero: q.questionNumber,
                    disciplina: subjName,
                    tema: q.theme || undefined,
                    taxa_acerto_turma: 0,
                    resultado_aluno: acertou,
                    questionId: q.id
                });
            });

            // C) Class Averages
            const questionHitCounts: Record<string, { acertos: number, total: number }> = {};
            activeQuestions.forEach(q => {
                questionHitCounts[q.id] = { acertos: 0, total: 0 };
            });

            const studentScoresMap: Record<string, number> = {};

            exam.studentResponses.forEach(r => {
                const qKey = `${r.questionNumber}_${r.language}`;
                const q = questionsMap.get(qKey) || questionsMap.get(`${r.questionNumber}_none`);
                
                if (q) {
                    if (!studentScoresMap[r.studentId]) studentScoresMap[r.studentId] = 0;
                    
                    if (questionHitCounts[q.id]) {
                        questionHitCounts[q.id].total++;
                    }

                    if (q.isAnnulled || r.isCorrect) {
                        studentScoresMap[r.studentId]++;
                        if (questionHitCounts[q.id]) {
                            questionHitCounts[q.id].acertos++;
                        }
                    }
                }
            });

            const scores = Object.values(studentScoresMap);
            
            // Default raw acertos calculations
            let mediaTurmaDec = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
            let maiorNota = scores.length > 0 ? Math.max(...scores) : 0;
            let menorNota = scores.length > 0 ? Math.min(...scores) : 0;
            const pctMediaTurma = activeQuestionsCount > 0 ? mediaTurmaDec / activeQuestionsCount : 0;

            // Se for ENEM, substituímos a média da turma pela média TRI
            if ((exam.type === 'enem' || exam.type === 'enem_parcial') && exam.examGrades.length > 0) {
                const finalScoresByStudent: Record<string, { sum: number, count: number }> = {};
                
                exam.examGrades.forEach(g => {
                    if (!finalScoresByStudent[g.studentId]) {
                        finalScoresByStudent[g.studentId] = { sum: 0, count: 0 };
                    }
                    finalScoresByStudent[g.studentId].sum += g.scoreTri;
                    finalScoresByStudent[g.studentId].count++;
                });

                const finalScores = Object.values(finalScoresByStudent).map(s => s.sum / s.count);
                if (finalScores.length > 0) {
                    const media = finalScores.reduce((a, b) => a + b, 0) / finalScores.length;
                    mediaTurmaDec = Math.round(media * 100) / 100;
                    // maiorNota e menorNota permanecem como acertos
                }
            }
            
            let conceitoMedioTurma = 'E';
            if (pctMediaTurma >= 0.75) conceitoMedioTurma = 'A';
            else if (pctMediaTurma >= 0.60) conceitoMedioTurma = 'B';
            else if (pctMediaTurma >= 0.45) conceitoMedioTurma = 'C';
            else if (pctMediaTurma >= 0.30) conceitoMedioTurma = 'D';

            // Fill Raio X hit rates
            const raioXFormatted = raioX.map(rx => {
                const stats = questionHitCounts[rx.questionId];
                const taxa = stats && stats.total > 0 ? (stats.acertos / stats.total) * 100 : 0;
                return {
                    numero: rx.numero,
                    disciplina: rx.disciplina,
                    tema: rx.tema,
                    taxa_acerto_turma: Math.round(taxa),
                    resultado_aluno: rx.resultado_aluno
                };
            }).sort((a, b) => a.numero - b.numero);

            // Format Disciplines
            const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
            const desempenhoPorDisciplina = Object.entries(subjectPerformance).map(([nome, stats], idx) => ({
                nome,
                acertos: stats.acertos,
                total: stats.total,
                cor: colors[idx % colors.length]
            }));

            // Format Temas: return one entry for every wrong question
            const temasParaRevisar = wrongQuestions.map(wq => ({
                tema: wq.tema,
                acertos: 0,
                total: 1,
                disciplina: wq.disciplina,
                questao: wq.questao
            }));

            // Conceito UERJ Logic
            let conceitoUerj = 'E';
            const pct = (correctCount / activeQuestionsCount) * 100;
            if (pct >= 70) conceitoUerj = 'A';
            else if (pct >= 60) conceitoUerj = 'B';
            else if (pct >= 50) conceitoUerj = 'C';
            else if (pct >= 40) conceitoUerj = 'D';

            const triGrades = {
                linguagens: 0,
                humanas: 0,
                naturezas: 0,
                matematica: 0,
                redacao: 0
            };
            
            let sumTri = 0;
            let countTri = 0;
            
            const myGrades = exam.examGrades.filter(g => g.studentId === targetStudentId);
            
            myGrades.forEach(g => {
                const subj = g.subject.toLowerCase();
                if (triGrades[subj as keyof typeof triGrades] !== undefined) {
                    triGrades[subj as keyof typeof triGrades] = g.scoreTri;
                    sumTri += g.scoreTri;
                    countTri++;
                }
            });

            let notaTotalDecimal = "0.0";
            if (exam.type === 'uerj' || exam.type === 'UERJ_EQ') {
                const eqGrade = myGrades.find(g => g.subject === 'UERJ_EQ');
                notaTotalDecimal = eqGrade ? eqGrade.scoreTri.toFixed(1) : "0.0";
            } else {
                if (countTri > 0) {
                    notaTotalDecimal = (sumTri / countTri).toFixed(1);
                }
            }

            return {
                id: exam.id,
                tenantColor: student.tenant.primaryColor,
                aluno: {
                    nome: student.name,
                    matricula: student.registrationNumber,
                    turma: student.class?.name || 'Sem Turma'
                },
                simulado: {
                    tipo: exam.type.toUpperCase(),
                    titulo: exam.title,
                    data: exam.date.toISOString().split('T')[0],
                    totalQuestoes: activeQuestionsCount
                },
                resultadoTime: {
                    mediaTurma: Math.round(mediaTurmaDec * 10) / 10,
                    maiorNota,
                    menorNota,
                    conceitoMedioTurma: conceitoMedioTurma
                },
                destaqueGeral: {
                    acertos: correctCount,
                    total: activeQuestionsCount,
                    percentual: Math.round(pct),
                    conceitoUerj: exam.type === 'uerj' ? conceitoUerj : undefined,
                    notaTotalDecimal,
                    tri: triGrades
                },
                desempenhoPorDisciplina,
                temasParaRevisar,
                raioXQuestoes: raioXFormatted
            };
        });

        res.json(boletins);

    } catch (error) {
        console.error("Erro ao gerar boletins:", error);
        res.status(500).json({ error: 'Erro interno.' });
    }
});

export default router;
