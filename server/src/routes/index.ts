/**
 * Main Router
 * Combines all route modules
 */

import { Router, Request, Response } from 'express';
import authRoutes from './auth.routes.js';
import projectRoutes from './project.routes.js';
import portRoutes from './port.routes.js';
import fileRoutes from './file.routes.js';
import { ContainerService } from '../services/ContainerService.js';
import { AppDataSource } from '../database/data-source.js';

const router = Router();
const containerService = new ContainerService();

// API test endpoint
router.get('/api/test', (req: Request, res: Response) => {
    console.log(' [API] Test endpoint accessed');
    res.json({
        message: 'Server is working!',
        timestamp: new Date().toISOString(),
        endpoints: [
            'GET /api/test',
            'POST /api/auth/register',
            'POST /api/auth/login',
            'GET /api/auth/me',
            'GET /api/projects',
            'POST /api/projects',
            'GET /health'
        ]
    });
});

// Health check endpoint
router.get('/health', async (req: Request, res: Response) => {
    try {
        const health = await containerService.getHealthStatus();
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            services: {
                ...health,
                database: {
                    status: AppDataSource.isInitialized ? 'healthy' : 'unhealthy',
                    connected: AppDataSource.isInitialized
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Mount route modules
router.use('/api/auth', authRoutes);
router.use('/api/projects', projectRoutes);
router.use('/api/user', portRoutes);
router.use('/files', fileRoutes);

export default router;
