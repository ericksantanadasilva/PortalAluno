import { Router, Request, Response } from "express";
import { prisma } from "@repo/database";
import { requireAuth, requireAdmin } from "../middlewares/auth.middleware";

const router = Router();

// 1. POST /api/classes -> Cria uma nova turma vinculada a uma Modalidade/Combo
router.post('/', requireAuth, requireAdmin, async (req, res) => {
    const { name, modalityId } = req.body;
    const tenantId = req.user!.tenantId;

    if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'O nome da turma é obrigatório.' });
    }

    if (!modalityId) {
        return res.status(400).json({ error: 'É necessário vincular a turma a uma modalidade/combo.' });
    }

    try {
        // Valida se a modalidade informada existe e pertence a este Tenant
        const modalityExists = await prisma.modality.findFirst({
            where: { id: modalityId, tenantId }
        });

        if (!modalityExists) {
            return res.status(404).json({ error: 'A modalidade/combo selecionada não foi encontrada.' });
        }

        // Verifica se já existe uma turma com o mesmo nome DENTRO dessa mesma modalidade
        const classExists = await prisma.class.findFirst({
            where: { tenantId, modalityId, name: name.trim() }
        });

        if (classExists) {
            return res.status(400).json({ error: 'Já existe uma turma com este nome dentro desta modalidade.' });
        }

        const newClass = await prisma.class.create({
            data: {
                tenantId,
                modalityId,
                name: name.trim()
            },
            include: {
                modality: true // Já traz os dados do combo junto no retorno
            }
        });

        return res.status(201).json(newClass);
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao criar turma.', details: (error as Error).message });
    }
});

// 2. GET /api/classes -> Lista as turmas trazendo os dados da modalidade/combo pai
router.get('/', requireAuth, async (req, res) => {
    const tenantId = req.user!.tenantId;

    try {
        const classes = await prisma.class.findMany({
            where: { tenantId },
            include: {
                modality: true // JOIN implícito para saber o nome do combo no front
            },
            orderBy: { name: 'asc' }
        });
        return res.json(classes);
    } catch {
        return res.status(500).json({ error: 'Erro ao buscar turmas.' });
    }
});

// 3. DELETE /api/classes/:id -> deleta uma turma
router.delete('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;

    try {
        // valida se a turma existe e pertence ao tenant
        const classExists = await prisma.class.findFirst({
            where: { id, tenantId }
        });

        if (!classExists) {
            return res.status(404).json({ error: 'Turma não encontrada ou nao pertence a esta instituição.' })
        }

        //3. Executa a deleção
        await prisma.class.delete({
            where: { id }
        });

        return res.status(204).send();
    } catch (error) {
        console.error('Erro ao deletar turma:', error);
        return res.status(500).json({ error: 'Erro interno ao processar exclusão da turma' })
    }
});

export default router;