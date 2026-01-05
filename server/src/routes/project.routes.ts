/**
 * Project Routes
 */

import { Router } from 'express';
import * as projectController from '../controllers/project.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// All project routes require authentication
router.use(authenticate);

// GET /api/projects - Get user's projects
router.get('/', projectController.getUserProjects);

// POST /api/projects - Create new project
router.post('/', projectController.createProject);

export default router;
