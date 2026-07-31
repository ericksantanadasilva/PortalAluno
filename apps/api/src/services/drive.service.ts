import { google } from 'googleapis';
import stream from 'stream';

const DEFAULT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '1i-ShnRuD2mDp12SmQursnAG2ptijPC9g';

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

export interface UploadToDriveOptions {
    buffer: Buffer;
    filename: string;
    mimetype: string;
    folderId?: string;
}

export async function uploadToDrive({ buffer, filename, mimetype, folderId }: UploadToDriveOptions) {
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);

    const drive = getDriveClient();
    const targetFolder = folderId || DEFAULT_FOLDER_ID;

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
