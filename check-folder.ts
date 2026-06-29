import { google } from 'googleapis';
import path from 'path';

const auth = new google.auth.GoogleAuth({
    keyFile: path.join(process.cwd(), 'portalboletim-ea25a4c3be78.json'),
    scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/drive.readonly']
});

const drive = google.drive({ version: 'v3', auth });

async function checkFolder() {
    try {
        const folderId = '1i-ShnRuD2mDp12SmQursnAG2ptijPC9g';
        const res = await drive.files.get({
            fileId: folderId,
            fields: 'id, name, capabilities',
            supportsAllDrives: true
        });
        console.log('Pasta encontrada!', res.data);
    } catch (e: any) {
        console.error('Erro ao acessar a pasta:', e.message);
    }
}
checkFolder();
