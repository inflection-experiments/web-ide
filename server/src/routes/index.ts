import { Router } from 'express';
import authRoutes from './auth.routes.js';
import projectRoutes from './project.routes.js';
import fileRoutes from './file.routes.js';
import systemRoutes from './system.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/files', fileRoutes);
router.use('/', systemRoutes); // Root level system routes (health, test, etc.)

export default router;
