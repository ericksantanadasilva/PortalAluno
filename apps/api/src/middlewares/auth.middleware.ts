import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_aqui_para_desenvolvimento';

//Estende a tipagem do express para aceitar nosso payload
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                role: string;
                tenantId?: string;
                email?: string;
            };
        }
    }
}

// Exige autenticação de Super Admin (God Mode)
export function requireGod(req: Request, res: Response, next: NextFunction) {
    let token: string | undefined;

    // 1. Tenta extrair o token do Header Authorization: Bearer <token>
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    // 2. Tenta extrair o token do cookie (god_token)
    if (!token && req.headers.cookie) {
        const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
            const [key, value] = cookie.trim().split('=');
            if (key && value) acc[key] = value;
            return acc;
        }, {} as Record<string, string>);
        token = cookies['god_token'];
    }

    if (!token) {
        return res.status(401).json({ error: 'Acesso negado. Token God Mode não fornecido.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string; email?: string; tenantId?: string };
        
        if (decoded.role !== 'super_admin') {
            return res.status(403).json({ error: 'Acesso negado. Apenas o perfil Super Admin pode acessar esta rota.' });
        }

        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Sessão expirada ou token God Mode inválido.' });
    }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    } else if (req.query.token) {
        token = String(req.query.token);
    } else if (req.headers.cookie) {
        const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
            const [key, value] = cookie.trim().split('=');
            if (key && value) acc[key] = value;
            return acc;
        }, {} as Record<string, string>);
        token = cookies['token'] || cookies['god_token'];
    }

    if (!token) {
        return res.status(401).json({ error: 'Token não fornecido ou inválido.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string; tenantId: string };
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Sessão expirada ou token inválido.' });
    }
}

// Bloqueia se não for admin (usado para configurações avançadas e convites de equipe)
export function requireStrictAdmin(req: Request, res: Response, next: NextFunction) {
    if (!req.user || !['admin', 'super_admin'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }
    next();
}

// Bloqueia se não for admin ou secretaria da escola (usado para gerenciar alunos)
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
    if (!req.user || !['admin', 'super_admin', 'secretaria'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Acesso negado. Permissão insuficiente' });
    }
    next();
}

// Bloqueia se não for parte da equipe da escola (admin, secretaria, professor) (usado para listar dados gerais)
export function requireStaff(req: Request, res: Response, next: NextFunction) {
    if (!req.user || !['admin', 'super_admin', 'secretaria', 'professor'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Acesso negado. Restrito à equipe.' });
    }
    next();
}