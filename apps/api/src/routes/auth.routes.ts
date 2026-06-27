import { Router } from "express";
import { prisma } from "@repo/database";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'seu_secret_super_seguro_aqui';

//1 endpoint de login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Busca o usuário pelo e-mail globalmente (ou refinado por tenant se passar o subdomínio/slug dps)
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: email },
                    { registrationNumber: email }
                ]
            },
            include: { tenant: true } //Traz junto os dados do White-Label
        });

        if (!user) {
            return res.status(401).json({ error: 'Credenciais invalidas.' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Credenciais invalidas.' });
        }

        //Gera o token JWT carregando ID, Role e Tenant do cara
        const token = jwt.sign(
            { userId: user.id, role: user.role, tenantId: user.tenantId },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Retorna os dados essenciais e a flag crucial de segurança
        return res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                mustChangePassword: user.mustChangePassword
            },
            tenant: {
                id: user.tenant.id,
                name: user.tenant.name,
                slug: user.tenant.slug,
                primaryColor: user.tenant.primaryColor
            }
        });
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao processar login. ' });
    }
});

// 2. endpoint de primeira troca de senha
router.post('/reset-password', async (req, res) => {
    const { email, currentPassword, newPassword } = req.body;

    try {
        const user = await prisma.user.findFirst({ where: { email } });

        if (!user) {
            return res.status(404).json({ error: 'Usuário não enconntrado. ' });
        }

        //Valiuda se a senha atual (temporaria) bate mesmo
        const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(400).json({ error: 'A senha temporária atual está incorreta' });
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        // gera o hash da nova senha definitiva
        await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash: newPasswordHash,
                mustChangePassword: false
            }
        });

        return res.json({ message: 'Senha atualizada com sucesso! Agora você pode acessar o portal.' });
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao atualizar senha.' })
    }
})

export default router;