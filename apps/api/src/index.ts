import "dotenv/config";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { prisma } from "@repo/database";
import godRoutes from "./routes/god.routes";
import authRoutes from "./routes/auth.routes";
import classRoutes from "./routes/class.routes";
import modalityRoutes from "./routes/modality.routes";
import employeeRoutes from "./routes/employee.routes";
import studentRoutes from "./routes/student.routes";
import tenantRoutes from "./routes/tenant.routes";
import uploadRoutes from "./routes/upload.routes";
import examRoutes from "./routes/exam.routes";
import subjectRoutes from "./routes/subject.routes";
import attendanceRoutes from "./routes/attendance.routes";
import boletimRoutes from "./routes/boletim.routes";
import triRoutes from "./routes/tri.routes";
import scheduledClassRoutes from "./routes/scheduledClass.routes";
import discursiveRoutes from "./routes/discursive.routes";
import themeRoutes from "./routes/theme.routes";
import { startCronJobs } from "./services/cron.service";

dotenv.config();
// Fallbacks para carregar o .env do database ou da raiz do monorepo caso faltem variáveis no .env da API
dotenv.config({ path: path.resolve(__dirname, "../../../packages/database/.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

app.use('/api/auth', authRoutes);
app.use('/api/god', godRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/modalities', modalityRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/discursive', discursiveRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/themes', themeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/scheduled-classes', scheduledClassRoutes);
app.use('/api/boletins', boletimRoutes);
app.use('/api/tri', triRoutes);

startCronJobs();

app.listen(port, () => {
    console.log(`Api do portal rodando na porta ${port}`)
});