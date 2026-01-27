import { Router } from 'express';
import { systemController } from '../controllers/system.controller.js';

const router = Router();

router.get('/health', systemController.health);
router.get('/test', systemController.test);
router.get('/user/ports', systemController.getUserPorts);
router.get('/user/port-status/:port', systemController.getPortStatus);

export default router;
