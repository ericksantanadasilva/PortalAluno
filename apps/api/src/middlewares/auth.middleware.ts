import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'seu_secret_super_seguro_aqui';

//Estende a tipagem do express para aceitar nosso payload
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                role: string;
                tenantId: string;
            };
        }
    }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token não fornecido ou inválido.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string; tenantId: string };
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Sessão expirada ou token inválido.' });
    }
}

// Bloqueia se não for admin ou secretaria da escola
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'secretaria')) {
        return res.status(403).json({ error: 'Acesso negado. Permissão insuficiente' });
    }
    next();
}