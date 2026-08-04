import { Router } from 'express';
import studentRoutes from './discursive/student.routes';
import adminRoutes from './discursive/admin.routes';
import correctorRoutes from './discursive/corrector.routes';
import sharedRoutes from './discursive/shared.routes';

export { formatSubmissionFilename, resolvePdfPath, formatContentDispositionHeader } from '../services/discursive.service';

const router = Router();

router.use(studentRoutes);
router.use(adminRoutes);
router.use(correctorRoutes);
router.use(sharedRoutes);

export default router;
