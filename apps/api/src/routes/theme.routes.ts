import { Router } from 'express';
import { prisma } from '@repo/database';
import { requireAuth } from '../middlewares/auth.middleware';
import { z } from 'zod';

const router = Router();

router.use(requireAuth);

const createThemeSchema = z.object({
    subjectId: z.string().uuid('ID da disciplina inválido'),
    name: z.string().min(1, 'O nome do tema é obrigatório.')
});

const updateThemeSchema = z.object({
    name: z.string().min(1, 'O nome do tema é obrigatório.')
});

const createSubthemeSchema = z.object({
    themeId: z.string().uuid('ID do tema inválido'),
    name: z.string().min(1, 'O nome do subtema é obrigatório.')
});

const updateSubthemeSchema = z.object({
    name: z.string().min(1, 'O nome do subtema é obrigatório.')
});

const bulkImportSchema = z.array(
    z.object({
        disciplina: z.any().transform(val => String(val ?? '').trim()),
        tema: z.any().transform(val => String(val ?? '').trim()),
        subtema: z.any().optional().nullable().transform(val => val ? String(val).trim() : undefined)
    })
);

// GET /api/themes/tree - Retorna a árvore completa de Disciplinas -> Temas -> Subtemas do tenant
router.get('/tree', async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;
        const tree = await prisma.subject.findMany({
            where: { tenantId },
            orderBy: { name: 'asc' },
            include: {
                themes: {
                    orderBy: { name: 'asc' },
                    include: {
                        subthemes: {
                            orderBy: { name: 'asc' }
                        }
                    }
                }
            }
        });
        return res.json(tree);
    } catch (error) {
        console.error('Error fetching theme tree:', error);
        return res.status(500).json({ error: 'Erro ao carregar árvore de temas.' });
    }
});

// GET /api/themes - Lista os temas do tenant (opcionalmente filtrados por subjectId)
router.get('/', async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;
        const { subjectId } = req.query;

        const whereCondition: any = { tenantId };
        if (subjectId && typeof subjectId === 'string') {
            whereCondition.subjectId = subjectId;
        }

        const themes = await prisma.theme.findMany({
            where: whereCondition,
            include: {
                subject: { select: { id: true, name: true } },
                subthemes: { orderBy: { name: 'asc' } }
            },
            orderBy: { name: 'asc' }
        });

        return res.json(themes);
    } catch (error) {
        console.error('Error fetching themes:', error);
        return res.status(500).json({ error: 'Erro ao listar temas.' });
    }
});

// POST /api/themes - Cria um novo tema
router.post('/', async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;
        if (req.user!.role === 'aluno' || req.user!.role === 'professor') {
            return res.status(403).json({ error: 'Sem permissão para cadastrar temas.' });
        }

        const data = createThemeSchema.parse(req.body);

        const theme = await prisma.theme.create({
            data: {
                tenantId,
                subjectId: data.subjectId,
                name: data.name
            },
            include: {
                subthemes: true
            }
        });

        return res.status(201).json(theme);
    } catch (error: any) {
        console.error('Error creating theme:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Já existe um tema com este nome nesta disciplina.' });
        }
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        return res.status(500).json({ error: 'Erro interno ao criar tema.' });
    }
});

// PUT /api/themes/:id - Edita um tema existente
router.put('/:id', async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;
        const { id } = req.params;

        if (req.user!.role === 'aluno' || req.user!.role === 'professor') {
            return res.status(403).json({ error: 'Sem permissão para editar temas.' });
        }

        const data = updateThemeSchema.parse(req.body);

        const existing = await prisma.theme.findFirst({
            where: { id, tenantId }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Tema não encontrado.' });
        }

        const theme = await prisma.theme.update({
            where: { id },
            data: { name: data.name }
        });

        return res.json(theme);
    } catch (error: any) {
        console.error('Error updating theme:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Já existe outro tema com este nome nesta disciplina.' });
        }
        return res.status(500).json({ error: 'Erro interno ao editar tema.' });
    }
});

// DELETE /api/themes/:id - Exclui um tema
router.delete('/:id', async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;
        const { id } = req.params;

        if (req.user!.role === 'aluno' || req.user!.role === 'professor') {
            return res.status(403).json({ error: 'Sem permissão para excluir temas.' });
        }

        const existing = await prisma.theme.findFirst({
            where: { id, tenantId }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Tema não encontrado.' });
        }

        // Desvincula o tema e subtema de todas as questões (ficam como "Sem Tema")
        await prisma.examQuestion.updateMany({
            where: { themeId: id },
            data: { themeId: null, subthemeId: null, theme: null }
        });

        await prisma.theme.delete({ where: { id } });
        return res.json({ message: 'Tema excluído com sucesso. As questões anteriormente vinculadas a este tema agora estão como "Sem Tema".' });
    } catch (error) {
        console.error('Error deleting theme:', error);
        return res.status(500).json({ error: 'Erro ao excluir tema.' });
    }
});

// POST /api/themes/subthemes - Cria um novo subtema
router.post('/subthemes', async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;
        if (req.user!.role === 'aluno' || req.user!.role === 'professor') {
            return res.status(403).json({ error: 'Sem permissão para cadastrar subtemas.' });
        }

        const data = createSubthemeSchema.parse(req.body);

        // Garante que o tema pertence ao tenant
        const theme = await prisma.theme.findFirst({
            where: { id: data.themeId, tenantId }
        });

        if (!theme) {
            return res.status(404).json({ error: 'Tema pai não encontrado.' });
        }

        const subtheme = await prisma.subtheme.create({
            data: {
                tenantId,
                themeId: data.themeId,
                name: data.name
            }
        });

        return res.status(201).json(subtheme);
    } catch (error: any) {
        console.error('Error creating subtheme:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Já existe um subtema com este nome neste tema.' });
        }
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        return res.status(500).json({ error: 'Erro interno ao criar subtema.' });
    }
});

// PUT /api/themes/subthemes/:id - Edita um subtema
router.put('/subthemes/:id', async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;
        const { id } = req.params;

        if (req.user!.role === 'aluno' || req.user!.role === 'professor') {
            return res.status(403).json({ error: 'Sem permissão para editar subtemas.' });
        }

        const data = updateSubthemeSchema.parse(req.body);

        const existing = await prisma.subtheme.findFirst({
            where: { id, tenantId }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Subtema não encontrado.' });
        }

        const subtheme = await prisma.subtheme.update({
            where: { id },
            data: { name: data.name }
        });

        return res.json(subtheme);
    } catch (error: any) {
        console.error('Error updating subtheme:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Já existe outro subtema com este nome neste tema.' });
        }
        return res.status(500).json({ error: 'Erro interno ao editar subtema.' });
    }
});

// DELETE /api/themes/subthemes/:id - Exclui um subtema
router.delete('/subthemes/:id', async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;
        const { id } = req.params;

        if (req.user!.role === 'aluno' || req.user!.role === 'professor') {
            return res.status(403).json({ error: 'Sem permissão para excluir subtemas.' });
        }

        const existing = await prisma.subtheme.findFirst({
            where: { id, tenantId }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Subtema não encontrado.' });
        }

        // Desvincula o subtema das questões que o utilizavam
        await prisma.examQuestion.updateMany({
            where: { subthemeId: id },
            data: { subthemeId: null }
        });

        await prisma.subtheme.delete({ where: { id } });
        return res.json({ message: 'Subtema excluído com sucesso.' });
    } catch (error) {
        console.error('Error deleting subtheme:', error);
        return res.status(500).json({ error: 'Erro ao excluir subtema.' });
    }
});

// POST /api/themes/bulk-import - Importa disciplinas, temas e subtemas em massa (planilha ou JSON)
router.post('/bulk-import', async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;
        if (req.user!.role === 'aluno' || req.user!.role === 'professor') {
            return res.status(403).json({ error: 'Sem permissão para importação em lote.' });
        }

        const rows = bulkImportSchema.parse(req.body);

        let createdSubjects = 0;
        let createdThemes = 0;
        let createdSubthemes = 0;

        const subjectMap = new Map<string, string>(); // name.toLowerCase() -> id
        const themeMap = new Map<string, string>();   // subjectId:themeName.toLowerCase() -> id
        const subthemeSet = new Set<string>();        // themeId:subthemeName.toLowerCase() -> true

        // Função para normalização de texto (remove espaços extras e caracteres invisíveis)
        const cleanStr = (val: any) => String(val ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

        // Carrega disciplinas existentes
        const existingSubjects = await prisma.subject.findMany({ where: { tenantId } });
        existingSubjects.forEach(s => subjectMap.set(cleanStr(s.name).toLowerCase(), s.id));

        // Carrega temas existentes
        const existingThemes = await prisma.theme.findMany({ where: { tenantId } });
        existingThemes.forEach(t => themeMap.set(`${t.subjectId}:${cleanStr(t.name).toLowerCase()}`, t.id));

        // Carrega subtemas existentes
        const existingSubthemes = await prisma.subtheme.findMany({ where: { tenantId }, select: { themeId: true, name: true } });
        existingSubthemes.forEach(s => subthemeSet.add(`${s.themeId}:${cleanStr(s.name).toLowerCase()}`));

        const subthemesToCreateMap = new Map<string, { tenantId: string; themeId: string; name: string }>();

        for (const row of rows) {
            const rawSubj = cleanStr(row.disciplina);
            const rawTheme = cleanStr(row.tema);
            const rawSubtheme = row.subtema ? cleanStr(row.subtema) : null;

            if (!rawSubj || !rawTheme) continue;

            const subjKey = rawSubj.toLowerCase();
            let subjectId = subjectMap.get(subjKey);

            if (!subjectId) {
                try {
                    const newSubj = await prisma.subject.create({
                        data: { tenantId, name: rawSubj }
                    });
                    subjectId = newSubj.id;
                    createdSubjects++;
                } catch (err: any) {
                    if (err.code === 'P2002') {
                        const existing = await prisma.subject.findFirst({
                            where: { tenantId, name: { equals: rawSubj, mode: 'insensitive' } }
                        });
                        if (existing) subjectId = existing.id;
                        else continue;
                    } else {
                        throw err;
                    }
                }
                if (subjectId) subjectMap.set(subjKey, subjectId);
            }

            if (!subjectId) continue;

            const themeKey = `${subjectId}:${rawTheme.toLowerCase()}`;
            let themeId = themeMap.get(themeKey);

            if (!themeId) {
                try {
                    const newTheme = await prisma.theme.create({
                        data: { tenantId, subjectId, name: rawTheme }
                    });
                    themeId = newTheme.id;
                    createdThemes++;
                } catch (err: any) {
                    if (err.code === 'P2002') {
                        const existing = await prisma.theme.findFirst({
                            where: { tenantId, subjectId, name: { equals: rawTheme, mode: 'insensitive' } }
                        });
                        if (existing) themeId = existing.id;
                        else continue;
                    } else {
                        throw err;
                    }
                }
                if (themeId) themeMap.set(themeKey, themeId);
            }

            if (!themeId) continue;

            if (rawSubtheme) {
                const subKey = `${themeId}:${rawSubtheme.toLowerCase()}`;
                if (!subthemeSet.has(subKey) && !subthemesToCreateMap.has(subKey)) {
                    subthemesToCreateMap.set(subKey, { tenantId, themeId, name: rawSubtheme });
                    subthemeSet.add(subKey);
                }
            }
        }

        const subthemesToCreate = Array.from(subthemesToCreateMap.values());
        if (subthemesToCreate.length > 0) {
            await prisma.subtheme.createMany({
                data: subthemesToCreate,
                skipDuplicates: true
            });
            createdSubthemes = subthemesToCreate.length;
        }

        return res.json({
            message: 'Importação concluída com sucesso!',
            stats: {
                createdSubjects,
                createdThemes,
                createdSubthemes,
                totalRowsProcessed: rows.length
            }
        });
    } catch (error: any) {
        console.error('Error in bulk import:', error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        return res.status(500).json({ error: error?.message || 'Erro ao processar importação em lote.' });
    }
});

export default router;
