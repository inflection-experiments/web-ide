/**
 * Port Routes
 */

import { Router } from 'express';
import * as portController from '../controllers/port.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// All port routes require authentication
router.use(authenticate);

// GET /api/user/ports - Get user's port mappings
router.get('/ports', portController.getUserPorts);

// GET /api/user/port-status/:port - Check port status
router.get('/port-status/:port', portController.checkPortStatus);

export default router;
