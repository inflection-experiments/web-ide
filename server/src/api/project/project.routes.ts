import { Router } from 'express';
import { projectController } from './project.controller.js';

const router = Router();

router.get('/', projectController.getUserProjects);
router.post('/', projectController.createProject);
router.get('/:projectId', projectController.getProject);
// router.put('/:projectId', projectController.updateProject); // If implemented
// router.delete('/:projectId', projectController.deleteProject); // If implemented

export default router;
