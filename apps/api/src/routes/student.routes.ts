import { Router } from 'express';
import { prisma } from '@repo/database';
import { requireAuth, requireAdmin, requireStaff } from '../middlewares/auth.middleware';
import bcrypt from 'bcrypt';

const router = Router();

// GET /api/students - Lista todos os alunos do tenant
router.get('/', requireAuth, requireStaff, async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;

        const students = await prisma.user.findMany({
            where: {
                tenantId,
                role: 'aluno'
            },
            select: {
                id: true,
                name: true,
                email: true,
                registrationNumber: true,
                mustChangePassword: true,
                createdAt: true,
                classId: true,
                class: {
                    select: {
                        name: true,
                        modality: {
                            select: {
                                name: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                name: 'asc'
            }
        });

        res.json(students);
    } catch (error) {
        console.error("Erro ao listar alunos:", error);
        res.status(500).json({ error: 'Erro interno ao listar alunos.' });
    }
});

// POST /api/students - Matricula um novo aluno
router.post('/', requireAuth, requireAdmin, async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;
        const { name, email, registration, classId } = req.body;

        if (!name || !email || !registration) {
            return res.status(400).json({ error: 'Nome, email e matrícula são obrigatórios.' });
        }

        // Verifica se email ou matricula já existem
        const existingUser = await prisma.user.findFirst({
            where: {
                tenantId,
                OR: [
                    { email },
                    { registrationNumber: registration }
                ]
            }
        });

        if (existingUser) {
            return res.status(400).json({ error: 'Email ou Matrícula já cadastrados nesta unidade.' });
        }

        // Gera senha temporária
        const tempPassword = Math.random().toString(36).slice(-8);
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(tempPassword, salt);

        const newStudent = await prisma.user.create({
            data: {
                tenantId,
                name,
                email,
                passwordHash,
                role: 'aluno',
                registrationNumber: registration,
                mustChangePassword: true,
                classId: classId || null
            },
            select: {
                id: true,
                name: true,
                email: true,
                registrationNumber: true,
                mustChangePassword: true,
                classId: true,
                class: {
                    select: {
                        name: true,
                        modality: {
                            select: {
                                name: true
                            }
                        }
                    }
                }
            }
        });

        res.status(201).json({
            student: newStudent,
            tempPassword
        });

    } catch (error) {
        console.error("Erro ao cadastrar aluno:", error);
        res.status(500).json({ error: 'Erro interno ao cadastrar aluno.' });
    }
});

// DELETE /api/students/:id - Remove um aluno
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const tenantId = req.user!.tenantId;
        const studentId = req.params.id;

        const student = await prisma.user.findFirst({
            where: {
                id: studentId,
                tenantId,
                role: 'aluno'
            }
        });

        if (!student) {
            return res.status(404).json({ error: 'Aluno não encontrado.' });
        }

        await prisma.user.delete({
            where: { id: studentId }
        });

        res.status(200).json({ message: 'Aluno removido com sucesso.' });
    } catch (error) {
        console.error("Erro ao remover aluno:", error);
        res.status(500).json({ error: 'Erro interno ao remover aluno.' });
    }
});

export default router;
