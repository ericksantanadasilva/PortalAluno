import { Router } from 'express';
import { prisma } from '@repo/database';
import { requireAuth } from '../middlewares/auth.middleware';
import { z } from 'zod';

const router = Router();

// GET /api/tenant/public-config - Rota pública para carregar a logo/fundo no login
router.get('/public-config', async (req, res) => {
    try {
        // Como o sistema ainda é single-tenant (sem host routing completo), pegamos o primeiro pela data de criação
        const tenant = await prisma.tenant.findFirst({
            orderBy: { createdAt: 'asc' },
            select: {
                primaryColor: true,
                secondaryColor: true,
                logoUrl: true,
                loginUrl: true,
                name: true,
                allowedReportTemplates: true
            }
        });
        
        if (!tenant) return res.status(404).json({ error: 'Nenhum tenant encontrado' });
        
        return res.json(tenant);
    } catch (error) {
        console.error('Error fetching public tenant config:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Proteger as demais rotas
router.use(requireAuth);

// GET /api/tenant/config - Pega as configs da unidade do usuário logado
router.get('/config', async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: {
                primaryColor: true,
                secondaryColor: true,
                logoUrl: true,
                loginUrl: true,
                name: true,
                allowedReportTemplates: true
            }
        });

        if (!tenant) {
            return res.status(404).json({ error: 'Tenant not found' });
        }

        return res.json(tenant);
    } catch (error) {
        console.error('Error fetching tenant config:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

const updateConfigSchema = z.object({
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    logoUrl: z.string().optional().nullable(),
    loginUrl: z.string().optional().nullable(),
});

// PUT /api/tenant/config - Atualiza as configs da unidade
router.put('/config', async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;

        // Opcional: validar se o usuário é admin
        if (req.user!.role !== 'admin') {
            return res.status(403).json({ error: 'Apenas administradores podem alterar as configurações.' });
        }

        const data = updateConfigSchema.parse(req.body);

        const tenant = await prisma.tenant.update({
            where: { id: tenantId },
            data
        });

        return res.json({ message: 'Configurações atualizadas com sucesso', tenant });
    } catch (error) {
        console.error('Error updating tenant config:', error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/tenant/subjects - Lista as disciplinas da unidade
router.get('/subjects', async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;
        const subjects = await prisma.subject.findMany({
            where: { tenantId },
            orderBy: { name: 'asc' }
        });
        return res.json(subjects);
    } catch (error) {
        console.error('Error fetching tenant subjects:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
