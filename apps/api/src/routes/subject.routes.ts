import { Router } from 'express';
import { prisma } from '@repo/database';
import { requireAuth } from '../middlewares/auth.middleware';
import { z } from 'zod';

const router = Router();

// Todas as rotas precisam de autenticação
router.use(requireAuth);

const createSubjectSchema = z.object({
    name: z.string().min(1, 'O nome da disciplina é obrigatório.'),
});

// GET /api/subjects - Lista as disciplinas do tenant atual
router.get('/', async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;
        const subjects = await prisma.subject.findMany({
            where: { tenantId },
            orderBy: { name: 'asc' }
        });
        return res.json(subjects);
    } catch (error) {
        console.error('Error fetching subjects:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/subjects - Cria uma nova disciplina
router.post('/', async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;

        // Opcional: Apenas admin ou secretaria pode criar disciplinas
        if (req.user!.role === 'aluno' || req.user!.role === 'professor') {
            return res.status(403).json({ error: 'Você não tem permissão para criar disciplinas.' });
        }

        const data = createSubjectSchema.parse(req.body);

        // Verifica se já existe uma disciplina com esse nome no mesmo tenant
        const existingSubject = await prisma.subject.findFirst({
            where: {
                tenantId,
                name: data.name
            }
        });

        if (existingSubject) {
            return res.status(400).json({ error: 'Já existe uma disciplina com este nome.' });
        }

        const subject = await prisma.subject.create({
            data: {
                name: data.name,
                tenantId
            }
        });

        return res.status(201).json(subject);
    } catch (error) {
        console.error('Error creating subject:', error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
});

const updateSubjectSchema = z.object({
    name: z.string().min(1, 'O nome da disciplina é obrigatório.'),
});

// PUT /api/subjects/:id - Atualiza uma disciplina
router.put('/:id', async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;
        const { id } = req.params;

        if (req.user!.role === 'aluno' || req.user!.role === 'professor') {
            return res.status(403).json({ error: 'Você não tem permissão para editar disciplinas.' });
        }

        const data = updateSubjectSchema.parse(req.body);

        // Verifica se a disciplina existe e pertence ao tenant
        const existingSubject = await prisma.subject.findFirst({
            where: { id, tenantId }
        });

        if (!existingSubject) {
            return res.status(404).json({ error: 'Disciplina não encontrada.' });
        }

        // Verifica se não há conflito de nome
        const nameConflict = await prisma.subject.findFirst({
            where: {
                tenantId,
                name: data.name,
                id: { not: id }
            }
        });

        if (nameConflict) {
            return res.status(400).json({ error: 'Já existe outra disciplina com este nome.' });
        }

        const subject = await prisma.subject.update({
            where: { id },
            data: { name: data.name }
        });

        return res.json(subject);
    } catch (error) {
        console.error('Error updating subject:', error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/subjects/:id - Remove uma disciplina
router.delete('/:id', async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;
        const { id } = req.params;

        if (req.user!.role === 'aluno' || req.user!.role === 'professor') {
            return res.status(403).json({ error: 'Você não tem permissão para excluir disciplinas.' });
        }

        const existingSubject = await prisma.subject.findFirst({
            where: { id, tenantId }
        });

        if (!existingSubject) {
            return res.status(404).json({ error: 'Disciplina não encontrada.' });
        }

        // Deleta (as constraints on delete devem ser tratadas pelo prisma schema, ex: set null ou restrict)
        await prisma.subject.delete({
            where: { id }
        });

        return res.json({ message: 'Disciplina excluída com sucesso.' });
    } catch (error) {
        console.error('Error deleting subject:', error);
        // Pode falhar se houver restrição de chave estrangeira (Restrict)
        return res.status(400).json({ error: 'Não foi possível excluir a disciplina. Ela pode estar vinculada a questões ou modalidades.' });
    }
});

export default router;
