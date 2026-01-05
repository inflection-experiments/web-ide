/**
 * Port Controller
 * Handles port-related requests for user containers
 */

import { Response } from 'express';
import { ContainerService } from '../services/ContainerService.js';
import { AuthRequest } from '../middleware/auth.middleware.js';

const containerService = new ContainerService();

/**
 * Get port mappings for user's container
 */
export async function getUserPorts(req: AuthRequest, res: Response): Promise<void> {
    try {
        if (!req.userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const realUserId = req.userId;

        console.log(` [PORT] Getting port mappings for user: ${realUserId}`);

        // Get container and inspect port mappings
        const container = containerService.dockerManager.getContainer(realUserId);
        if (!container) {
            res.json({ success: true, portMappings: [] });
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

        console.log(`[PORT] Found ${portMappings.length} port mappings for user: ${realUserId}`);
        res.json({ success: true, portMappings });

    } catch (error) {
        console.error(' [PORT] Port mapping retrieval failed:', error);
        res.status(500).json({ success: false, error: 'Failed to get port mappings' });
    }
}

/**
 * Check if a service is running on a specific port
 */
export async function checkPortStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
        if (!req.userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const realUserId = req.userId;

        const portParam = req.params.port;
        if (!portParam) {
            res.status(400).json({ error: 'Port parameter is required' });
            return;
        }

        const port = parseInt(portParam);
        if (isNaN(port)) {
            res.status(400).json({ error: 'Invalid port number' });
            return;
        }

        console.log(` [PORT] Checking port ${port} status for user: ${realUserId}`);

        const container = containerService.dockerManager.getContainer(realUserId);
        if (!container) {
            res.json({ success: true, isRunning: false, message: 'Container not found' });
            return;
        }

        // Check if service is running on this port
        try {
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

                console.log(` [PORT] Port ${port} status for user ${realUserId}: ${isRunning ? 'RUNNING' : 'NOT RUNNING'}`);
                res.json({
                    success: true,
                    isRunning,
                    containerPort: port,
                    message: isRunning ? `Service running on port ${port}` : `No service on port ${port}`
                });
            });

        } catch (checkError) {
            console.log(` [PORT] Could not check port ${port} for user ${realUserId}`);
            res.json({ success: true, isRunning: false, message: 'Port check failed' });
        }

    } catch (error) {
        console.error(' [PORT] Port status check failed:', error);
        res.status(500).json({ success: false, error: 'Failed to check port status' });
    }
}
