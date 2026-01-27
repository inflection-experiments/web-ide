import { Router } from 'express';
import { fileController } from './file.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

// Apply auth middleware to all file routes
router.use(authMiddleware);

// Map routes to controller methods
// GET /files - List root files (as tree)
router.get('/', fileController.getFiles);

// GET /files/content - Get file content
router.get('/content', fileController.getFileContent);

// POST /files/create - Create file/directory
router.post('/create', fileController.createFile);

// POST /files/rename - Rename file/directory
router.post('/rename', fileController.renameFile);

// DELETE /files/delete - Delete file/directory
router.delete('/delete', fileController.deleteFile);

// GET /files/directory - Get sub-directory content (returns { items: [...] })
router.get('/directory', fileController.getDirectory);

export default router;
