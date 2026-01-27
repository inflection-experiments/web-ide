import express, { Express } from 'express';
import { Server as SocketServer } from 'socket.io';
import * as http from 'http';
import cors from 'cors';
import * as chokidar from 'chokidar';
import Docker from 'dockerode';
import { config } from './config/env.config.js';
import { AppDataSource } from './database/data-source.js';
import router from './routes/index.js';
import { errorHandler } from './middleware/error.middleware.js';
import { logger } from './logger/logger.js';
import { SocketHandler } from './SocketHandler.js';
import { containerService } from './services/ContainerService.js';

export class Application {
    private static instance: Application;
    public app: Express;
    public server: http.Server;
    public io: SocketServer;
    private refreshTimeout: NodeJS.Timeout | undefined;

    private constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = new SocketServer(this.server, {
            cors: {
                origin: '*', // Configurable via env if needed, but keeping existing behavior
                methods: ['GET', 'POST']
            }
        });
    }

    static getInstance(): Application {
        if (!Application.instance) {
            Application.instance = new Application();
        }
        return Application.instance;
    }

    async initialize(): Promise<void> {
        logger.info('🚀 [Server] STARTING UP...');

        // 1. Initialize Database
        await this.initializeDatabase();

        // 2. Setup Middleware
        this.setupMiddleware();

        // 3. Setup Routes
        this.setupRoutes();

        // 4. Setup Error Handling
        this.setupErrorHandling();

        // 5. Setup Container Service
        await this.initializeContainerService();

        // 6. Setup Socket.IO & File Watcher
        this.setupSocketIO();
        this.setupFileWatcher();
    }

    private async initializeDatabase(): Promise<void> {
        try {
            logger.info(' [Server] Initializing database connection...');
            await AppDataSource.initialize();
            logger.info('✅ [Database] Connected successfully');
        } catch (error) {
            logger.error(' [Database] Connection failed', error as Error);
            throw error;
        }
    }

    private setupMiddleware(): void {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static('public'));

        // Request Logger
        this.app.use((req, res, next) => {
            logger.info(`${req.method} ${req.url}`);
            next();
        });
    }

    private setupRoutes(): void {
        this.app.use('/api', router);
    }

    private setupErrorHandling(): void {
        this.app.use(errorHandler);
    }

    private async initializeContainerService(): Promise<void> {
        try {
            await containerService.initialize();
            await this.cleanupOldContainers();
        } catch (error) {
            logger.error('Failed to initialize container service', error as Error);
            throw error;
        }
    }

    private setupSocketIO(): void {
        new SocketHandler(this.io);
        logger.info('🔌 [Socket.IO] Handler initialized');
    }

    private setupFileWatcher(): void {
        chokidar.watch('./user').on('all', (event: string, thePath: string) => {
            clearTimeout(this.refreshTimeout);
            this.refreshTimeout = setTimeout(() => {
                this.io.emit('file:refresh', thePath);
            }, 100);
        });
    }

    // Helper for cleaning up abandoned containers on startup
    private async cleanupOldContainers(): Promise<void> {
        const docker = new Docker();
        try {
            const containers = await docker.listContainers({ all: true });
            for (const containerInfo of containers) {
                if (containerInfo.Names.some((name: string) => name.startsWith('/user-'))) {
                    const container = docker.getContainer(containerInfo.Id);
                    try {
                        await container.stop();
                        await container.remove();
                    } catch (err) { }
                }
            }
        } catch (err) { }
    }

    async start(): Promise<void> {
        const port = config.port || 9000;

        this.server.listen(port, () => {
            logger.info(`\n🚀 [Server] Application running on port ${port}`);
            logger.info(`🔌 [Socket.IO] Available at ws://localhost:${port}/socket.io/`);
            logger.info(`📂 [API] Endpoints available at http://localhost:${port}/api/`);
        });
    }

    async shutdown(): Promise<void> {
        logger.info('Shutting down application...');

        // Close server
        await new Promise<void>((resolve) => {
            this.server.close(() => {
                logger.info('HTTP server closed');
                resolve();
            });
        });

        // Close database
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
            logger.info('Database connection closed');
        }
    }
}
