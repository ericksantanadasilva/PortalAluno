import { Router } from "express";
import { prisma } from "@repo/database";
import { requireAuth, requireAdmin } from "../middlewares/auth.middleware";

const router = Router();

//1. POST /api/modalities -> Cria um combo/modalidade e já vincula as matérias dele
router.post('/', requireAuth, requireAdmin, async (req, res) => {
    const { name, subjectIds } = req.body;
    const tenantId = req.user!.tenantId;

    if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'O nome da modalidade é obrigatório.' })
    }
    try {
        const modalityExists = await prisma.modality.findFirst({
            where: { tenantId, name: name.trim() }
        });

        if (modalityExists) {
            return res.status(400).json({ error: "Já existe uma modalidade com este nome." });
        }

        //executa a criaçao e o vinculo das materia em uma única transação segura
        const newModality = await prisma.$transaction(async (tx) => {
            const modality = await tx.modality.create({
                data: {
                    tenantId,
                    name: name.trim()
                }
            });

            // Se enviou materias, faz a inserção em lote na tabela pivô modality_subjects
            if (subjectIds && Array.isArray(subjectIds) && subjectIds.length > 0) {
                const pivotData = subjectIds.map((subId: string) => ({
                    modalityId: modality.id,
                    subjectId: subId
                }));

                await tx.modalitySubject.createMany({
                    data: pivotData
                });
            }

            return modality;
        });

        return res.status(201).json(newModality);
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao criar modalidade.', details: (error as Error).message });
    }
});

// 2. GET /api/modalities -> Lista todas as modalidades da instituição com suas matérias
router.get('/', requireAuth, async (req, res) => {
    const tenantId = req.user!.tenantId;

    try {
        const modalities = await prisma.modality.findMany({
            where: { tenantId },
            include: {
                modalitySubjects: {
                    include: {
                        subject: true // Traz os detalhes da matéria (id, name)
                    }
                }
            },
            orderBy: { name: 'asc' }
        });

        // Formata o retorno para o front-end receber uma lista limpa de matérias por combo
        const formatted = modalities.map(m => ({
            id: m.id,
            name: m.name,
            createdAt: m.createdAt,
            subjects: m.modalitySubjects.map(ms => ms.subject)
        }));

        return res.json(formatted);
    } catch {
        return res.status(500).json({ error: 'Erro ao buscar modalidades.' });
    }
});

// 3. GET /api/modalities/types -> Retorna se o formato da aula na chamada é presencial ou online (Enum antigo)
router.get('/types', requireAuth, (req, res) => {
    return res.json([
        { id: 'presencial', name: 'Presencial' },
        { id: 'online', name: 'Online / EAD' }
    ]);
});

export default router;