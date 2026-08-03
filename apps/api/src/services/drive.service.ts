import { google } from 'googleapis';
import stream from 'stream';

const DEFAULT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '1i-ShnRuD2mDp12SmQursnAG2ptijPC9g';

// Cache em memória para IDs de pastas criadas ou encontradas
const folderCache = new Map<string, string>();

export const getDriveClient = () => {
    const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
    const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
    const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || '';

    const auth = new google.auth.OAuth2(
        CLIENT_ID,
        CLIENT_SECRET,
        'https://developers.google.com/oauthplayground'
    );

    auth.setCredentials({
        refresh_token: REFRESH_TOKEN
    });

    return google.drive({ version: 'v3', auth });
};

/**
 * Busca ou cria uma subpasta no Google Drive dentro da pasta pai informada ou DEFAULT_FOLDER_ID
 */
export async function getOrCreateSubfolder(folderName: string, parentId?: string): Promise<string> {
    const parent = parentId || DEFAULT_FOLDER_ID;
    const cacheKey = `${parent}_${folderName}`;
    if (folderCache.has(cacheKey)) {
        return folderCache.get(cacheKey)!;
    }

    const drive = getDriveClient();
    try {
        const query = `mimeType='application/vnd.google-apps.folder' and '${parent}' in parents and name='${folderName.replace(/'/g, "\\'")}' and trashed=false`;
        const listRes = await drive.files.list({
            q: query,
            fields: 'files(id, name)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true
        });

        if (listRes.data.files && listRes.data.files.length > 0 && listRes.data.files[0].id) {
            const folderId = listRes.data.files[0].id;
            folderCache.set(cacheKey, folderId);
            return folderId;
        }

        const createRes = await drive.files.create({
            requestBody: {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [parent]
            },
            fields: 'id',
            supportsAllDrives: true
        });

        const folderId = createRes.data.id;
        if (!folderId) {
            return parent;
        }
        folderCache.set(cacheKey, folderId);
        return folderId;
    } catch (error) {
        console.warn(`Aviso: Erro ao buscar/criar pasta "${folderName}" no Drive. Usando pasta padrão.`, error);
        return parent;
    }
}

/**
 * Retorna o ID da subpasta "Simulados Discursivos", criando-a caso não exista
 */
export async function getDiscursiveFolderId(subfolderName?: string): Promise<string> {
    const mainDiscursiveFolderId = await getOrCreateSubfolder('Simulados Discursivos');
    if (subfolderName) {
        return await getOrCreateSubfolder(subfolderName, mainDiscursiveFolderId);
    }
    return mainDiscursiveFolderId;
}

export interface UploadToDriveOptions {
    buffer: Buffer;
    filename: string;
    mimetype: string;
    folderId?: string;
    existingFileId?: string | null;
}

export async function uploadToDrive({ buffer, filename, mimetype, folderId, existingFileId }: UploadToDriveOptions) {
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);

    const drive = getDriveClient();

    // Se já houver um ID de arquivo existente no Drive, substitui o conteúdo do arquivo existente em vez de criar um novo
    if (existingFileId) {
        try {
            const media = {
                mimeType: mimetype,
                body: bufferStream
            };

            const response = await drive.files.update({
                fileId: existingFileId,
                media: media,
                fields: 'id, webViewLink, webContentLink',
                supportsAllDrives: true
            });

            return {
                fileId: existingFileId,
                driveUrl: `drive:${existingFileId}`,
                webViewLink: response.data.webViewLink,
                webContentLink: response.data.webContentLink
            };
        } catch (updateError) {
            console.warn(`Aviso: falha ao atualizar arquivo existente (${existingFileId}) no Drive, criando um novo arquivo:`, updateError);
            // Em caso de falha ao encontrar o arquivo antigo, prossegue para criar um novo
        }
    }

    const targetFolder = folderId || (await getDiscursiveFolderId());

    const fileMetadata = {
        name: filename,
        parents: [targetFolder]
    };

    const media = {
        mimeType: mimetype,
        body: bufferStream
    };

    const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink, webContentLink',
        supportsAllDrives: true
    });

    const fileId = response.data.id;

    if (!fileId) {
        throw new Error('Falha ao obter o ID do arquivo gerado no Google Drive.');
    }

    // Tornar o arquivo visível/público para leitura
    try {
        await drive.permissions.create({
            fileId,
            requestBody: { role: 'reader', type: 'anyone' },
            supportsAllDrives: true
        });
    } catch (permError) {
        console.warn('Aviso ao definir permissão pública no Google Drive:', permError);
    }

    return {
        fileId,
        driveUrl: `drive:${fileId}`,
        webViewLink: response.data.webViewLink,
        webContentLink: response.data.webContentLink
    };
}

export async function getDriveFileStream(fileId: string): Promise<stream.Readable> {
    const drive = getDriveClient();
    const response = await drive.files.get(
        { fileId, alt: 'media', supportsAllDrives: true },
        { responseType: 'stream' }
    );
    return response.data as stream.Readable;
}

export function extractDriveFileId(storedUrl: string | null | undefined): string | null {
    if (!storedUrl) return null;

    if (storedUrl.startsWith('drive:')) {
        return storedUrl.replace('drive:', '').trim();
    }

    if (storedUrl.includes('drive.google.com')) {
        const match = storedUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || storedUrl.match(/id=([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
            return match[1];
        }
    }

    // Se for uma string de ID válida sem extensão de arquivo e sem barras
    if (!storedUrl.includes('/') && !storedUrl.includes('\\') && !storedUrl.endsWith('.pdf') && storedUrl.length > 15) {
        return storedUrl.trim();
    }

    return null;
}
