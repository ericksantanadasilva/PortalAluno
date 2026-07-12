import { Request, Response } from 'express';
import { prisma } from '@repo/database';
import * as xlsx from 'xlsx';

function normalizarIdioma(value: any): 'INGLES' | 'ESPANHOL' | null {
    if (!value || typeof value !== 'string') return null;
    const str = value.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    if (str.includes('INGLES') || str.includes('ING') || str === 'I') {
        return 'INGLES';
    }
    if (str.includes('ESPANHOL') || str.includes('ESP') || str === 'E') {
        return 'ESPANHOL';
    }
    return null;
}

export const importOmr = async (req: Request, res: Response) => {
    try {
        const tenantId = req.user!.tenantId;
        const file = req.file;
        const { examId, mappings: mappingsStr } = req.body;

        if (!file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
        }
        if (!examId) {
            return res.status(400).json({ error: 'O ID do simulado é obrigatório.' });
        }
        if (!mappingsStr) {
            return res.status(400).json({ error: 'Os mapeamentos das colunas são obrigatórios.' });
        }

        const mappings = JSON.parse(mappingsStr);
        const { dayNumber, colRegistration, colLanguage, colQuestionsStart } = mappings;
        const targetDayNumber = Number(dayNumber) || 1;

        if (!colRegistration || !colQuestionsStart) {
            return res.status(400).json({ error: 'Coluna de Matrícula e Coluna Inicial de Respostas são obrigatórias.' });
        }

        // Buscar detalhes do simulado para verificar offset e validações
        const exam = await prisma.exam.findFirst({
            where: { id: examId, tenantId },
            include: {
                examQuestions: true
            }
        });

        if (!exam) {
            return res.status(404).json({ error: 'Simulado não encontrado.' });
        }

        // Ler o arquivo
        const workbook = xlsx.read(file.buffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Formato array de arrays para preservar a ordem exata
        const data: any[][] = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

        if (data.length < 2) {
            return res.status(400).json({ error: 'Arquivo vazio ou sem linhas de dados.' });
        }

        const headers = data[0].map((h: any) => h ? String(h).trim() : '');
        
        const registrationColIndex = headers.indexOf(colRegistration);
        const languageColIndex = colLanguage ? headers.indexOf(colLanguage) : -1;
        const questionsStartColIndex = headers.indexOf(colQuestionsStart);

        if (registrationColIndex === -1) {
            return res.status(400).json({ error: `Coluna de Matrícula não encontrada: ${colRegistration}` });
        }
        if (questionsStartColIndex === -1) {
            return res.status(400).json({ error: `Coluna Inicial de Respostas não encontrada: ${colQuestionsStart}` });
        }

        // Configuração do offset dinâmico
        const questionsPerDay = exam.isEnemFull ? Math.ceil(exam.totalQuestions / 2) : exam.totalQuestions;
        const startQuestionNumber = (targetDayNumber === 2 && exam.isEnemFull) ? questionsPerDay + 1 : 1;

        // Pré-carregar usuários para mapear matricula -> userId
        const users = await prisma.user.findMany({
            where: { tenantId },
            select: { id: true, registrationNumber: true }
        });
        const userMap = new Map<string, string>();
        for (const user of users) {
            userMap.set(user.registrationNumber, user.id);
        }

        const studentIdsProcessed = new Set<string>();
        const ignoredRegistrations = new Set<string>();
        const studentResponsesData: any[] = [];
        const examSessionsData: any[] = [];

        // O loop varre apenas os dados reais (linha 1 em diante)
        for (let r = 1; r < data.length; r++) {
            const row = data[r];
            if (!row || row.length === 0) continue; // Linha vazia

            const rawRegistration = row[registrationColIndex];
            if (!rawRegistration) continue; // Ignora se não tem matrícula
            
            const registration = String(rawRegistration).trim();
            const studentId = userMap.get(registration);
            
            if (!studentId) {
                // Matrículas inválidas ou de professores são silenciosamente ignoradas para evitar quebrar o loop
                ignoredRegistrations.add(registration);
                continue; 
            }

            studentIdsProcessed.add(studentId);

            const rawLang = languageColIndex !== -1 ? row[languageColIndex] : null;
            // Fallback para ingles caso retorne nulo e a validação peça, mas o normalizarIdioma cuida disso
            let idiomaNormalizado = normalizarIdioma(rawLang);
            if (!idiomaNormalizado) idiomaNormalizado = 'INGLES'; // Fallback seguro
            
            // Lendo exatamente "questionsPerDay" colunas, a partir do start
            for (let i = 0; i < questionsPerDay; i++) {
                const currentQuestionNumber = startQuestionNumber + i;
                const colIndex = questionsStartColIndex + i;

                if (colIndex >= row.length) break; // Acabaram as colunas nessa linha
                
                const rawAnswer = row[colIndex];
                if (!rawAnswer) continue; // Resposta em branco

                let chosenAlternative = String(rawAnswer).trim().toUpperCase();
                // Validar se é uma alternativa A-E 
                // Se o remark trouxer algo como '*' (dupla marcação) ou em branco, podemos salvar como nulo
                if (!['A','B','C','D','E'].includes(chosenAlternative)) {
                    chosenAlternative = ''; // Alternativa inválida ou anulada pelo aluno
                }

                if (!chosenAlternative) continue;

                // Validação Dinâmica de Idioma: verifica se esta questão específica foi configurada com idioma
                const questionVariants = exam.examQuestions.filter(eq => eq.questionNumber === currentQuestionNumber);
                const isForeignLanguageQuestion = questionVariants.some(eq => eq.language === 'ingles' || eq.language === 'espanhol');

                let languageToSave = 'none';

                if (isForeignLanguageQuestion) {
                    // A questão exige um idioma. Vamos verificar se o aluno tem o idioma e se a alternativa bate
                    const matchLang = questionVariants.find(eq => eq.language.toUpperCase() === idiomaNormalizado);
                    
                    if (!matchLang) {
                        // O aluno respondeu uma questão de um idioma que não bate com o dele (ou ele não tem idioma)
                        continue; 
                    }
                    languageToSave = idiomaNormalizado.toLowerCase();
                }

                studentResponsesData.push({
                    tenantId,
                    studentId,
                    examId,
                    questionNumber: currentQuestionNumber,
                    chosenAlternative,
                    language: languageToSave,
                    isCorrect: false, // O fechamento do simulado calcula isso
                    importedViaRemark: true,
                });
            }

            examSessionsData.push({
                tenantId,
                examId,
                studentId,
                dayNumber: targetDayNumber,
                submitted: true,
            });
        }

        if (studentIdsProcessed.size === 0) {
            return res.status(400).json({ error: 'Nenhuma linha do arquivo pôde ser vinculada a um aluno cadastrado (verifique a coluna de matrícula).' });
        }

        // Usar transação para limpar e inserir os dados novos deste lote
        const studentIdsArray = Array.from(studentIdsProcessed);

        await prisma.$transaction(async (tx) => {
            // 1. Limpar as respostas antigas apenas dos alunos contidos no arquivo, neste dia/range de questões
            await tx.studentResponse.deleteMany({
                where: {
                    examId,
                    studentId: { in: studentIdsArray },
                    questionNumber: {
                        gte: startQuestionNumber,
                        lt: startQuestionNumber + questionsPerDay
                    }
                }
            });

            // 2. Inserir as novas respostas
            if (studentResponsesData.length > 0) {
                await tx.studentResponse.createMany({
                    data: studentResponsesData
                });
            }

            // 3. Atualizar/Inserir as sessões
            for (const session of examSessionsData) {
                await tx.examSession.upsert({
                    where: {
                        examId_studentId_dayNumber: {
                            examId: session.examId,
                            studentId: session.studentId,
                            dayNumber: session.dayNumber
                        }
                    },
                    update: { submitted: true },
                    create: session
                });
            }
        });

        res.status(200).json({ 
            message: 'Importação OMR concluída com sucesso.',
            studentsProcessed: studentIdsProcessed.size,
            responsesSaved: studentResponsesData.length,
            ignoredRegistrations: Array.from(ignoredRegistrations)
        });
    } catch (error) {
        console.error("Erro na importação OMR:", error);
        res.status(500).json({ error: 'Erro interno ao processar o arquivo OMR.' });
    }
};
