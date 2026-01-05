/**
 * File Routes
 */

import { Router } from 'express';
import * as fileController from '../controllers/file.controller.js';

const router = Router();

// GET /files - Get file tree
router.get('/', fileController.getFiles);

// GET /files/content - Get file content
router.get('/content', fileController.getFileContent);

// POST /files/create - Create file or directory
router.post('/create', fileController.createFileOrDirectory);

// POST /files/rename - Rename file or directory
router.post('/rename', fileController.renameFile);

// DELETE /files/delete - Delete file or directory
router.delete('/delete', fileController.deleteFile);

// GET /files/directory - List directory contents
router.get('/directory', fileController.listDirectory);

export default router;
