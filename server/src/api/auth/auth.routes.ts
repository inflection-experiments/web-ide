import { Router } from 'express';
import { container } from 'tsyringe';
import { AuthController } from './auth.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();
const authController = container.resolve(AuthController);

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authMiddleware, authController.getCurrentUser);

export default router;
