import { Request, Response } from 'express';
import { prisma } from '@repo/database';

const getMacroArea = (subjectName: string): string => {
    const name = subjectName.toLowerCase();
    if (['matematica', 'matemática'].includes(name)) return 'MATEMATICA';
    if (['portugues', 'português', 'ingles', 'inglês', 'espanhol', 'redacao', 'redação', 'texto base', 'literatura', 'artes', 'educação física', 'linguagens'].some(s => name.includes(s))) return 'LINGUAGENS';
    if (['biologia', 'quimica', 'química', 'fisica', 'física', 'ciências', 'naturezas'].some(s => name.includes(s))) return 'NATUREZAS';
    if (['historia', 'história', 'geografia', 'filosofia', 'sociologia', 'humanas'].some(s => name.includes(s))) return 'HUMANAS';
    return subjectName.toUpperCase();
};

export const closeExam = async (req: Request, res: Response) => {
    try {
        const { examId } = req.body;
        const tenantId = req.user!.tenantId;

        if (!examId) {
            return res.status(400).json({ error: 'examId é obrigatório.' });
        }

        // 1. Validação de Contexto e Busca do Gabarito
        const exam = await prisma.exam.findUnique({
            where: { id: examId, tenantId },
            include: {
                examQuestions: {
                    include: { subject: true }
                }
            }
        });

        if (!exam) {
            return res.status(404).json({ error: 'Simulado não encontrado.' });
        }

        // Mapeia macro-áreas da prova (Ex: se for prova cheia, terá 4 áreas)
        // Se for UERJ, ignoramos macro área e tratamos como UERJ_EQ global
        const isUerj = exam.type === 'UERJ_EQ' || exam.type === 'uerj' || exam.examQuestions.some(q => q.subject.name.toUpperCase() === 'UERJ_EQ');
        
        // 2. Correção das Respostas (Gabarito)
        const responses = await prisma.studentResponse.findMany({
            where: { examId, tenantId },
            select: { id: true, studentId: true, questionNumber: true, chosenAlternative: true, language: true, isCorrect: true }
        });

        if (responses.length === 0) {
            return res.status(400).json({ error: 'Nenhuma resposta encontrada para este simulado.' });
        }

        const responseUpdates: any[] = [];
        
        // Separa as respostas por aluno e por macro-área
        // studentScoresByArea[MACRO][studentId] = acertos
        const studentScoresByArea: Record<string, Record<string, number>> = {};
        const macroQuestionsCount: Record<string, number> = {};

        // Inicializa contadores de área e corrige as respostas
        for (const r of responses) {
            const q = exam.examQuestions.find(q => q.questionNumber === r.questionNumber && q.language === r.language);
            
            let isCorrect = false;
            let macroArea = 'DESCONHECIDO';

            if (q) {
                if (q.isAnnulled) {
                    isCorrect = true;
                } else if (q.correctAlternative && r.chosenAlternative) {
                    isCorrect = q.correctAlternative.toLowerCase() === r.chosenAlternative.toLowerCase();
                }
                
                macroArea = isUerj ? 'UERJ_EQ' : getMacroArea(q.subject.name);
                
                // Contabiliza total de questões dessa área (apenas uma vez)
                if (!macroQuestionsCount[macroArea]) {
                    const uniqueQuestionsInArea = new Set(
                        exam.examQuestions
                            .filter(eq => (isUerj ? 'UERJ_EQ' : getMacroArea(eq.subject.name)) === macroArea)
                            .map(eq => eq.questionNumber)
                    );
                    macroQuestionsCount[macroArea] = uniqueQuestionsInArea.size;
                }
            }

            if (r.isCorrect !== isCorrect) {
                responseUpdates.push(prisma.studentResponse.update({
                    where: { id: r.id },
                    data: { isCorrect }
                }));
            }

            // Inicializa aluno na área
            if (!studentScoresByArea[macroArea]) {
                studentScoresByArea[macroArea] = {};
            }
            if (studentScoresByArea[macroArea][r.studentId] === undefined) {
                studentScoresByArea[macroArea][r.studentId] = 0;
            }

            if (isCorrect) {
                studentScoresByArea[macroArea][r.studentId]++;
            }
        }

        const gradesToInsert: any[] = [];

        // Para cada Macro-Área encontrada na prova, rodamos o motor
        for (const [macroArea, studentScores] of Object.entries(studentScoresByArea)) {
            const studentIds = Object.keys(studentScores);
            const totalStudents = studentIds.length;
            const totalQuestionsInArea = macroQuestionsCount[macroArea] || 0;

            if (macroArea === 'UERJ_EQ') {
                for (const studentId of studentIds) {
                    const acertos = studentScores[studentId];
                    let scoreTri = 0;

                    if (acertos > 42) scoreTri = 20; // A
                    else if (acertos > 36) scoreTri = 15; // B
                    else if (acertos > 30) scoreTri = 10; // C
                    else if (acertos > 24) scoreTri = 5; // D
                    else scoreTri = 0; // E/F

                    gradesToInsert.push({
                        tenantId, examId, studentId, subject: macroArea,
                        acertos, scoreTri, tierUsed: 'regular'
                    });
                }
                continue;
            }

            // 3. Motor de Decisão Dinâmica do Tier (ENEM/TRI) por Macro Área
            let totalHits = 0;
            for (const acertos of Object.values(studentScores)) {
                totalHits += acertos;
            }
            const averageHits = totalHits / totalStudents;
            const percentAverage = totalQuestionsInArea > 0 ? averageHits / totalQuestionsInArea : 0;

            let dynamicTier = 'principal';
            if (percentAverage < 0.50) dynamicTier = 'dificil';
            else if (percentAverage > 0.80) dynamicTier = 'facil';

            // 4. Busca Matemática e Interpolação de Notas da Planilha
            const examYear = exam.date.getFullYear().toString();
            const triPoints = await prisma.triReference.findMany({
                where: { tenantId, year: examYear, subject: macroArea, tier: dynamicTier },
                orderBy: { acertos: 'asc' }
            });

            if (triPoints.length === 0) {
                return res.status(400).json({ error: `Nenhuma tabela TRI encontrada para a área ${macroArea} (${examYear}) - Tier: ${dynamicTier}. Verifique se você fez o mapeamento no painel TRI.` });
            }

            // Agrupa alunos pelo número de acertos
            const studentsByAcertos: Record<number, string[]> = {};
            for (const studentId of studentIds) {
                const acertos = studentScores[studentId];
                if (!studentsByAcertos[acertos]) studentsByAcertos[acertos] = [];
                studentsByAcertos[acertos].push(studentId);
            }

            // Calcula nota usando interpolação linear
            for (const [acertosStr, students] of Object.entries(studentsByAcertos)) {
                const acertos = parseInt(acertosStr);
                const triData = triPoints.find(p => p.acertos === acertos);
                
                if (!triData) {
                    for (const studentId of students) {
                        gradesToInsert.push({
                            tenantId, examId, studentId, subject: macroArea,
                            acertos, scoreTri: 0, tierUsed: dynamicTier
                        });
                    }
                    continue;
                }

                const totalAlunosComMesmoAcerto = students.length;
                
                for (let pos = 0; pos < totalAlunosComMesmoAcerto; pos++) {
                    const studentId = students[pos];
                    let scoreTri = 0;

                    if (totalAlunosComMesmoAcerto === 1) {
                        scoreTri = (triData.maxima + triData.linInf) / 2;
                    } else {
                        const interpolation = ((triData.maxima - triData.linInf) / (totalAlunosComMesmoAcerto - 1)) * pos;
                        scoreTri = triData.maxima - interpolation;
                    }

                    scoreTri = Math.round(scoreTri * 10) / 10;

                    gradesToInsert.push({
                        tenantId, examId, studentId, subject: macroArea,
                        acertos, scoreTri, tierUsed: dynamicTier
                    });
                }
            }
        }

        // 6. Persistência em Lote
        await prisma.$transaction([
            ...responseUpdates,
            prisma.examGrade.deleteMany({
                where: { examId, tenantId }
            }),
            prisma.examGrade.createMany({
                data: gradesToInsert
            })
        ]);

        return res.json({ success: true, count: gradesToInsert.length });

    } catch (error) {
        console.error('Erro no fechamento do simulado:', error);
        return res.status(500).json({ error: 'Erro interno ao processar o fechamento do simulado.' });
    }
};
