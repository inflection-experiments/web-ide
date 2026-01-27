import { Request, Response } from 'express';
import { containerService } from '../services/ContainerService.js';
import { AuthService } from '../services/AuthService.js';
import { AppDataSource } from '../database/data-source.js';
import { ResponseHandler } from '../utils/ResponseHandler.js';
import { SystemValidator } from '../api/system.validator.js';
import { AppError } from '../utils/AppError.js';

export class SystemController {
    private authService: AuthService;
    private validator: SystemValidator;

    constructor() {
        this.authService = new AuthService();
        this.validator = new SystemValidator();
    }

    health = async (req: Request, res: Response): Promise<void> => {
        try {
            const health = await containerService.getHealthStatus();
            const status = {
                ...health,
                database: {
                    status: AppDataSource.isInitialized ? 'healthy' : 'unhealthy',
                    connected: AppDataSource.isInitialized
                }
            };
            ResponseHandler.success(res, status, 200, 'System is healthy');
        } catch (error) {
            ResponseHandler.error(res, (error as Error).message || 'Health check failed', 500);
        }
    };

    test = (req: Request, res: Response): Promise<void> => {
        const status = {
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
        };
        ResponseHandler.success(res, status);
        return Promise.resolve();
    };

    getUserPorts = async (req: Request, res: Response): Promise<void> => {
        try {
            const token = req.headers.authorization?.replace('Bearer ', '');
            if (!token) throw new AppError('No token provided', 401);

            const decoded = this.authService.verifyToken(token);
            const realUserId = decoded.userId.toString();

            const container = containerService.dockerManager.getContainer(realUserId);
            if (!container) {
                ResponseHandler.success(res, { portMappings: [] });
                return;
            }

            const containerInfo = await container.inspect();
            const portMappings: Array<{ containerPort: number, hostPort: number, status: string }> = [];

            if (containerInfo.NetworkSettings?.Ports) {
                for (const [containerPortStr, hostMapping] of Object.entries(containerInfo.NetworkSettings.Ports)) {
                    if (hostMapping && Array.isArray(hostMapping) && hostMapping[0]?.HostPort) {
                        const containerPortPart = containerPortStr.split('/')[0];
                        if (containerPortPart) {
                            const containerPort = parseInt(containerPortPart);
                            const hostPortStr = hostMapping[0].HostPort;
                            if (hostPortStr && !isNaN(containerPort)) {
                                const hostPort = parseInt(hostPortStr);
                                if (!isNaN(hostPort)) {
                                    portMappings.push({
                                        containerPort,
                                        hostPort,
                                        status: 'available'
                                    });
                                }
                            }
                        }
                    }
                }
            }

            ResponseHandler.success(res, { portMappings });
        } catch (error) {
            this.handleError(res, error);
        }
    };

    getPortStatus = async (req: Request, res: Response): Promise<void> => {
        try {
            const token = req.headers.authorization?.replace('Bearer ', '');
            if (!token) throw new AppError('No token provided', 401);

            const decoded = this.authService.verifyToken(token);
            const realUserId = decoded.userId.toString();
            const port = this.validator.validatePort(req);

            const container = containerService.dockerManager.getContainer(realUserId);
            if (!container) {
                ResponseHandler.success(res, { isRunning: false, message: 'Container not found' });
                return;
            }

            const exec = await container.exec({
                Cmd: ['netstat', '-tlnp', '|', 'grep', `:${port}`],
                AttachStdout: true,
                AttachStderr: true,
                Tty: false
            });

            const stream = await exec.start({ hijack: true, stdin: false, Tty: false });
            let output = '';
            stream.on('data', (chunk: Buffer) => {
                output += chunk.toString();
            });

            stream.on('end', async () => {
                const inspect = await exec.inspect();
                const isRunning = inspect.ExitCode === 0 && output.trim().length > 0;
                ResponseHandler.success(res, {
                    isRunning,
                    containerPort: port,
                    message: isRunning ? `Service running on port ${port}` : `No service on port ${port}`
                });
            });
        } catch (error) {
            this.handleError(res, error);
        }
    };

    private handleError(res: Response, error: unknown) {
        if (error instanceof AppError) {
            ResponseHandler.error(res, error.message, error.statusCode);
        } else {
            ResponseHandler.error(res, (error as Error).message || 'Internal Server Error', 500);
        }
    }
}

export const systemController = new SystemController();
