import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as xlsx from 'xlsx';
import { prisma } from '@repo/database';
import { requireAuth, requireAdmin } from '../middlewares/auth.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Função utilitária para converter índice em letra do Excel (0 -> A, 25 -> Z, 26 -> AA)
function getExcelColumnName(colIndex: number) {
    let dividend = colIndex + 1;
    let colName = '';
    let modulo;
    while (dividend > 0) {
        modulo = (dividend - 1) % 26;
        colName = String.fromCharCode(65 + modulo) + colName;
        dividend = Math.floor((dividend - modulo) / 26);
    }
    return colName;
}

// 1. POST /api/tri/upload-preview -> Lê as abas, headers estruturais e preview bruto
router.post('/upload-preview', requireAuth, requireAdmin, upload.single('file'), (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const result: Record<string, { headers: string[], previewRows: any[][] }> = {};

        for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            // Lemos tudo como matriz crua (array de arrays)
            const rows = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1 });
            
            if (rows.length > 0) {
                // Pegamos as 10 primeiras linhas para preview
                const previewRows = rows.slice(0, 10);
                
                // Calculamos qual foi o maior número de colunas nessas 10 linhas para criar os headers genéricos
                let maxCols = 0;
                for (const row of previewRows) {
                    if (row && row.length > maxCols) maxCols = row.length;
                }

                // Cria headers tentando achar o nome da coluna nas primeiras linhas
                const headers = Array.from({ length: maxCols }, (_, i) => {
                    let colName = `Coluna ${getExcelColumnName(i)}`;
                    // Varre as linhas de preview pra achar o primeiro texto dessa coluna
                    for (const row of previewRows) {
                        if (row && row[i] !== undefined && row[i] !== null && String(row[i]).trim() !== '') {
                            colName = `${getExcelColumnName(i)} - ${String(row[i]).trim()}`;
                            break;
                        }
                    }
                    return colName;
                });

                // Padroniza o tamanho das linhas do preview para não quebrar a tabela do front
                const paddedRows = previewRows.map(row => {
                    const padded = [...(row || [])];
                    while (padded.length < maxCols) padded.push(null);
                    return padded;
                });

                result[sheetName] = { headers, previewRows: paddedRows };
            } else {
                result[sheetName] = { headers: [], previewRows: [] };
            }
        }

        return res.json(result);
    } catch (error) {
        console.error('Erro no preview:', error);
        return res.status(500).json({ error: 'Erro ao processar o arquivo Excel' });
    }
});

// 2. POST /api/tri/process-mapped -> Lê os mapeamentos do front por índice numérico
router.post('/process-mapped', requireAuth, requireAdmin, upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }

        const mappingsJson = req.body.mappings;
        if (!mappingsJson) {
            return res.status(400).json({ error: 'Mapeamentos não enviados' });
        }

        const { year, mappings } = JSON.parse(mappingsJson);
        const tenantId = req.user!.tenantId;

        if (!year) {
            return res.status(400).json({ error: 'Ano não especificado' });
        }

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const dataToInsert: any[] = [];

        // O mappings é um array de { subject, tier, sheetName, colAcertos, colLinInf, colMaxima, colMinima, startRow }
        for (const map of mappings) {
            if (!map.sheetName) continue; // Pula se não mapeou a aba
            const sheet = workbook.Sheets[map.sheetName];
            if (!sheet) continue;

            // Retorna em array de arrays
            const rows = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1 });
            const startRowIndex = Math.max(0, parseInt(map.startRow || '1') - 1);
            
            for (let i = startRowIndex; i < rows.length; i++) {
                const row = rows[i];
                if (!row) continue;

                const idxAcertos = parseInt((map.colAcertos || "").split("_")[0]);
                const idxLinInf = parseInt((map.colLinInf || "").split("_")[0]);
                const idxMaxima = parseInt((map.colMaxima || "").split("_")[0]);
                const idxMinima = parseInt((map.colMinima || "").split("_")[0]);

                if (isNaN(idxAcertos)) continue;

                const acertosVal = row[idxAcertos];
                const linInfVal = row[idxLinInf];
                const maximaVal = row[idxMaxima];
                const minimaVal = row[idxMinima];

                // Pula se Acertos for vazio/null ou string inválida (como cabeçalho)
                if (acertosVal !== undefined && acertosVal !== null && acertosVal !== '') {
                    const parsedAcertos = Number(acertosVal);
                    // Checa se é um número válido (assim ignoramos a linha de títulos automaticamente)
                    if (!isNaN(parsedAcertos)) {
                        dataToInsert.push({
                            tenantId,
                            year: String(year),
                            subject: map.subject,
                            tier: map.tier,
                            acertos: parsedAcertos,
                            linInf: Number(Number(linInfVal || 0).toFixed(2)),
                            maxima: Number(Number(maximaVal || 0).toFixed(2)),
                            minima: Number(Number(minimaVal || 0).toFixed(2))
                        });
                    }
                }
            }
        }

        if (dataToInsert.length === 0) {
            return res.status(400).json({ error: 'Nenhum dado válido encontrado para inserir após o mapeamento.' });
        }

        // Obter todas as combinações (subject, tier) que estão sendo salvas agora
        const subjectsAndTiersToClear = [...new Set(dataToInsert.map(d => JSON.stringify({ subject: d.subject, tier: d.tier })))]
            .map(str => JSON.parse(str));

        // Transação
        await prisma.$transaction([
            // Deleta APENAS as matérias e tiers que o usuário mapeou nessa requisição
            prisma.triReference.deleteMany({
                where: { 
                    year: String(year), 
                    tenantId,
                    OR: subjectsAndTiersToClear
                }
            }),
            prisma.triReference.createMany({
                data: dataToInsert,
                skipDuplicates: true
            })
        ]);

        return res.json({ success: true, count: dataToInsert.length });
    } catch (error) {
        console.error('Erro no processamento:', error);
        return res.status(500).json({ error: 'Erro ao persistir os dados mapeados.' });
    }
});

// 3. GET /api/tri/:year -> Busca os dados salvos para aquele ano e tenant
router.get('/:year', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
        const { year } = req.params;
        const tenantId = req.user!.tenantId;

        const data = await prisma.triReference.findMany({
            where: { year, tenantId },
            orderBy: [
                { subject: 'asc' },
                { tier: 'asc' },
                { acertos: 'asc' }
            ]
        });

        return res.json(data);
    } catch (error) {
        console.error('Erro ao buscar dados da TRI:', error);
        return res.status(500).json({ error: 'Erro ao buscar dados da TRI.' });
    }
});

export default router;
