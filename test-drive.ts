import { google } from 'googleapis';
import path from 'path';
import stream from 'stream';

const CLIENT_ID = '';
const CLIENT_SECRET = '';
const REFRESH_TOKEN = '';

const auth = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
);

auth.setCredentials({
    refresh_token: REFRESH_TOKEN
});

const drive = google.drive({ version: 'v3', auth });

async function test() {
    try {
        const bufferStream = new stream.PassThrough();
        bufferStream.end(Buffer.from('Teste Google Drive com OAuth'));
        const res = await drive.files.create({
            requestBody: {
                name: 'teste-oauth.txt',
                parents: ['1i-ShnRuD2mDp12SmQursnAG2ptijPC9g']
            },
            media: {
                mimeType: 'text/plain',
                body: bufferStream
            },
            fields: 'id',
            supportsAllDrives: true
        });
        console.log('Sucesso!', res.data);
    } catch (e: any) {
        console.error('Erro:', e.message, e.response?.data);
    }
}
test();
