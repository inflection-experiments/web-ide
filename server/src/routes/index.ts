import { Router } from 'express';
import authRoutes from '../api/auth/auth.routes.js';
import projectRoutes from '../api/project/project.routes.js';
import fileRoutes from '../api/file/file.routes.js';
import systemRoutes from '../api/system/system.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/files', fileRoutes);
router.use('/', systemRoutes); // Root level system routes (health, test, etc.)

export default router;
