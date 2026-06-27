import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { prisma } from "@repo/database";
import godRoutes from "./routes/god.routes";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

//rota de checagem de saude
app.get('/health', async (req, res) => {
    try {
        const tenantCount = await prisma.tenant.count();

        res.json({
            status: 'ok',
            database: 'connected',
            tenantsInDatabase: tenantCount,
            timestamp: new Date()
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: (error as Error).message });
    }
});

app.use('/api/god', godRoutes);

app.listen(port, () => {
    console.log(`Api do portal rodando na porta ${port}`)
});