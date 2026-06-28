import { Router } from 'express';
import { prisma } from '@repo/database';
import { requireAuth, requireStaff, requireStrictAdmin } from '../middlewares/auth.middleware';
import bcrypt from 'bcrypt';

const router = Router();

// GET /api/employees - Lista todos os funcionários (roles: admin, secretaria, professor) do tenant
router.get('/', requireAuth, requireStaff, async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;

        const employees = await prisma.user.findMany({
            where: {
                tenantId,
                role: {
                    in: ['admin', 'secretaria', 'professor']
                }
            },
            select: {
                id: true,
                name: true,
                email: true,
                department: true,
                mustChangePassword: true,
                role: true,
                createdAt: true
            },
            orderBy: {
                name: 'asc'
            }
        });

        res.json(employees);
    } catch (error) {
        console.error("Erro ao listar funcionários:", error);
        res.status(500).json({ error: 'Erro interno ao listar funcionários.' });
    }
});

// POST /api/employees - Convida um novo funcionário
router.post('/', requireAuth, requireStrictAdmin, async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;
        const { name, email, department } = req.body;

        if (!name || !email || !department) {
            return res.status(400).json({ error: 'Nome, email e setor são obrigatórios.' });
        }

        // Verifica se o email já está em uso na escola
        const existingUser = await prisma.user.findFirst({
            where: { tenantId, email }
        });

        if (existingUser) {
            return res.status(400).json({ error: 'Email já cadastrado nesta unidade.' });
        }

        // Determinar a role com base no departamento
        const deptLower = department.toLowerCase().trim();
        let roleToAssign: 'admin' | 'secretaria' | 'professor' = 'admin';

        if (deptLower === 'secretaria') {
            roleToAssign = 'secretaria';
        } else if (deptLower === 'professor') {
            roleToAssign = 'professor';
        }

        // Gera uma senha temporária (8 caracteres alfanuméricos)
        const tempPassword = Math.random().toString(36).slice(-8);
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(tempPassword, salt);

        // Como o registrationNumber é Unique por tenant, precisaremos de um fallback pra funcionários? 
        // Geralmente "matricula" é para aluno, mas o schema exige. 
        // Vamos usar um prefixo "FUNC-" seguido do timestamp para garantir unicidade
        const registrationNumber = `FUNC-${Date.now().toString().slice(-6)}`;

        const newEmployee = await prisma.user.create({
            data: {
                tenantId,
                name,
                email,
                passwordHash,
                role: roleToAssign,
                department,
                registrationNumber,
                mustChangePassword: true
            },
            select: {
                id: true,
                name: true,
                email: true,
                department: true,
                mustChangePassword: true,
                role: true
            }
        });

        // Simula o retorno incluindo a senha temporária para o frontend exibir
        // Num cenário real de envio de e-mail, não retornaríamos a senha pura, o backend faria o disparo.
        res.status(201).json({
            employee: newEmployee,
            tempPassword
        });

    } catch (error) {
        console.error("Erro ao cadastrar funcionário:", error);
        res.status(500).json({ error: 'Erro interno ao cadastrar funcionário.' });
    }
});

// DELETE /api/employees/:id - Remove um funcionário
router.delete('/:id', requireAuth, requireStrictAdmin, async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;
        const employeeId = req.params.id;

        // Verifica se o funcionário existe e pertence à mesma escola
        const employee = await prisma.user.findFirst({
            where: {
                id: employeeId,
                tenantId
            }
        });

        if (!employee) {
            return res.status(404).json({ error: 'Funcionário não encontrado.' });
        }

        // Previne que o admin remova a si próprio acidentalmente (opcional, mas boa prática)
        if (employee.id === req.user!.userId) {
            return res.status(400).json({ error: 'Você não pode remover seu próprio usuário.' });
        }

        await prisma.user.delete({
            where: { id: employeeId }
        });

        res.status(200).json({ message: 'Funcionário removido com sucesso.' });
    } catch (error) {
        console.error("Erro ao remover funcionário:", error);
        res.status(500).json({ error: 'Erro interno ao remover funcionário.' });
    }
});

export default router;
