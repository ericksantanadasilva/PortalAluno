import { Router } from "express";
import { prisma } from "@repo/database";
import crypto from "crypto";
import bcrypt from 'bcrypt';

const router = Router();

// POST /api/god/tenants -> Cria Escola + Usuário Admin
router.post('/tenants', async (req, res) => {
    const { name, slug, primaryColor, adminName, adminEmail, registrationNumber, allowedReportTemplates } = req.body;

    try {
        //validar se o slug já existe
        const slugExists = await prisma.tenant.findUnique({ where: { slug } });
        if (slugExists) {
            return res.status(400).json({ error: 'Uma empresa com esse slug/URL já existe.' })
        }

        //2. Gerar uma senha temporária aleatória de 8 caracteres
        const temporaryPassword = crypto.randomBytes(4).toString('hex');
        const passwordHash = await bcrypt.hash(temporaryPassword, 10);

        //3 Transação no banco: garante que só cria a empresa se o usuário tambem for criado
        const result = await prisma.$transaction(async (tx) => {
            const tenant = await tx.tenant.create({
                data: { name, slug, primaryColor, allowedReportTemplates }
            });

            const adminUser = await tx.user.create({
                data: {
                    tenantId: tenant.id,
                    name: adminName,
                    email: adminEmail,
                    passwordHash,
                    role: 'admin', //maior cargo dentro do tenant
                    registrationNumber: registrationNumber || `ADM-${Date.now().toString().slice(-6)}`,
                    mustChangePassword: true //obriga trocar a senha no primeiro acesso
                }
            });

            return { tenant, adminUser };
        });

        //4. TODO: aqui futuramente entrará o serviço de disparo de e-mail (Nodemailer/Resend)
        console.log(`[EMAIL COMPULSORIO] Para: ${adminEmail} | Senha Temporaria: ${temporaryPassword}`);

        // Retorna os dados para o front exibir no Modal de Sucesso
        return res.status(201).json({
            message: 'Instância ativada com sucesso!',
            tenant: result.tenant,
            adminEmail: result.adminUser.email,
            temporaryPassword // Enviamos de volta para o superuser ver na tela caso o email falhe
        });
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao processar onboarding.', details: (error as Error).message });
    }

});

// GET /api/god/tenants -> Lista todas as empresa cadastradas para personificação
router.get('/tenants', async (req, res) => {
    try {
        const tenants = await prisma.tenant.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return res.json(tenants);
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao buscar empresas.' });
    }
});


// PATCH /api/god/tenants/:id -> Atualiza configurações da Tenant (ex: allowedReportTemplates)
router.patch('/tenants/:id', async (req, res) => {
    const { id } = req.params;
    const { allowedReportTemplates } = req.body;

    try {
        const tenant = await prisma.tenant.update({
            where: { id },
            data: { allowedReportTemplates }
        });
        return res.json({ message: 'Instância atualizada com sucesso!', tenant });
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao atualizar a instância.', details: (error as Error).message });
    }
});

export default router;