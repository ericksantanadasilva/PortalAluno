import { Router } from 'express';
import multer from 'multer';
import { google } from 'googleapis';
import { requireAuth } from '../middlewares/auth.middleware';
import stream from 'stream';
import path from 'path';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Função para inicializar o auth dinamicamente (evita problemas de variáveis de ambiente não carregadas no momento do import)
const getDriveClient = () => {
    const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
    const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
    const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || '';

    const auth = new google.auth.OAuth2(
        CLIENT_ID,
        CLIENT_SECRET,
        'https://developers.google.com/oauthplayground' // URL de redirecionamento usada no playground
    );

    auth.setCredentials({
        refresh_token: REFRESH_TOKEN
    });

    return google.drive({ version: 'v3', auth });
};

// Rota para servir a imagem do Drive passando pelo nosso servidor (Bypassa o bloqueio do Google)
router.get('/image/:id', async (req, res) => {
    try {
        const fileId = req.params.id;
        const drive = getDriveClient();
        
        const response = await drive.files.get(
            { fileId: fileId, alt: 'media', supportsAllDrives: true },
            { responseType: 'stream' }
        );
        
        // Passa os cabeçalhos corretos, se possível
        if (response.headers['content-type']) {
            res.setHeader('Content-Type', response.headers['content-type']);
        }
        // Cache na borda por muito tempo já que a imagem não muda
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        
        response.data
            .on('error', (err) => {
                console.error('Erro ao ler stream do drive:', err);
                if (!res.headersSent) res.status(500).send('Erro');
            })
            .pipe(res);
    } catch (error) {
        console.error('Erro ao fazer proxy da imagem do Drive:', error);
        res.status(500).send('Imagem não encontrada');
    }
});

router.use(requireAuth);

router.post('/', upload.single('file'), async (req, res) => {
    try {
        if (!['admin', 'super_admin'].includes(req.user!.role)) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }

        const bufferStream = new stream.PassThrough();
        bufferStream.end(req.file.buffer);

        const drive = getDriveClient();

        const fileMetadata = {
            name: `${Date.now()}_${req.file.originalname}`,
            parents: ['1i-ShnRuD2mDp12SmQursnAG2ptijPC9g'], // Pasta do Google Drive fornecida pelo admin
        };

        const media = {
            mimeType: req.file.mimetype,
            body: bufferStream,
        };

        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, webViewLink, webContentLink',
            supportsAllDrives: true,
        });

        const fileId = response.data.id;

        if (fileId) {
            // Tornar o arquivo público (opcional agora, já que o backend vai fazer o proxy)
            await drive.permissions.create({
                fileId: fileId,
                requestBody: { role: 'reader', type: 'anyone' },
                supportsAllDrives: true,
            });

            // Gerar link do nosso próprio proxy para não ser bloqueado pelo Google
            const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
            const url = `${baseUrl}/api/upload/image/${fileId}`;
            return res.json({
                success: true,
                fileId: fileId,
                url: url,
            });
        }

        throw new Error('Falha ao obter o ID do arquivo no Google Drive');

    } catch (error) {
        console.error('Erro no upload para Google Drive:', error);
        return res.status(500).json({ error: 'Erro no upload do arquivo' });
    }
});

export default router;
