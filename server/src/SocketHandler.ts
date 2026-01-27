import { Server as SocketServer, Socket } from 'socket.io';
import { containerService } from './services/ContainerService.js';
import { AuthService } from './services/AuthService.js';

export class SocketHandler {
    private io: SocketServer;
    private authService: AuthService;
    private socketUserMap = new Map<string, string>();
    private userSocketMap = new Map<string, string>();

    constructor(io: SocketServer) {
        this.io = io;
        this.authService = new AuthService();
        this.setupHandlers();
    }

    private setupHandlers() {
        this.io.on('connection', async (socket: Socket) => {
            console.log(` [DEBUG] === NEW SOCKET CONNECTION ===`);
            console.log(` [DEBUG] SocketId: ${socket.id}`);

            const token = socket.handshake.auth?.token;
            if (!token) {
                console.log(' [AUTH] No token provided in socket connection');
                socket.emit('auth:required', 'Authentication token required');
                socket.disconnect();
                return;
            }

            let realUserId: string;
            try {
                const decoded = this.authService.verifyToken(token);
                realUserId = decoded.userId.toString();
                console.log(` [AUTH] Token verified successfully! REAL User ID: ${realUserId}`);
            } catch (error) {
                console.log(` [AUTH] Token verification failed: ${error}`);
                socket.emit('auth:invalid', 'Invalid authentication token');
                socket.disconnect();
                return;
            }

            this.socketUserMap.set(socket.id, realUserId);
            this.userSocketMap.set(realUserId, socket.id);

            let containerReady = false;

            containerService.createUserSession(realUserId)
                .then(() => {
                    containerReady = true;
                    socket.emit('terminal:ready');

                    const shell = containerService.dockerManager.getUserShellStream(realUserId);
                    if (shell) {
                        shell.on('data', (chunk: Buffer) => {
                            socket.emit('terminal:data', chunk.toString());
                        });
                    }
                })
                .catch((error: Error) => {
                    console.error(` [ERROR] Failed to create user session for REAL user ${realUserId}:`, error);
                });

            socket.emit('file:refresh');

            socket.on('file:change', async ({ path, content }: { path: string; content: string }) => {
                if (!containerReady) {
                    socket.emit('file:error', { path, error: 'Container not ready' });
                    return;
                }

                try {
                    const finalPath = this.fixIncompleteExtension(path);
                    const cleanContent = this.ultraCleanContent(content, finalPath);
                    await containerService.handleFileChange(realUserId, finalPath, cleanContent);
                    await containerService.dockerManager.cleanupDuplicateFiles(realUserId);

                    setTimeout(() => {
                        socket.emit('file:refresh');
                    }, 100);
                } catch (error) {
                    socket.emit('file:error', {
                        path: path,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            });

            socket.on('terminal:data', async (data: string) => {
                if (!containerReady) return;
                await containerService.sendTerminalData(realUserId, data);
            });

            socket.on('terminal:write', async (data: string) => {
                if (!containerReady) {
                    socket.emit('terminal:data', 'Container not ready yet, please wait...\r\n$ ');
                    return;
                }
                await containerService.sendTerminalData(realUserId, data + '\n');
            });

            socket.on('terminal:paste', async (text: string) => {
                if (!containerReady) return;
                await containerService.sendTerminalData(realUserId, text);
            });

            socket.on('file:save', async ({ path, content }: { path: string; content: string }) => {
                try {
                    const fixedPath = this.fixIncompleteExtension(path);
                    const cleanContent = this.ultraCleanContent(content, fixedPath);
                    await containerService.handleFileChange(realUserId, fixedPath, cleanContent);
                    await containerService.dockerManager.cleanupDuplicateFiles(realUserId);

                    const container = containerService.dockerManager.getContainer(realUserId);
                    if (container) {
                        const syncExec = await container.exec({
                            Cmd: ['sync'],
                            AttachStdout: false,
                            AttachStderr: false,
                            Tty: false
                        });
                        await syncExec.start({ hijack: false });
                    }

                    socket.emit('file:saved', { path: fixedPath, success: true });
                    socket.emit('file:refresh');
                } catch (error) {
                    socket.emit('file:saved', {
                        path,
                        success: false,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            });

            socket.on('disconnect', async () => {
                this.socketUserMap.delete(socket.id);
                this.userSocketMap.delete(realUserId);
                await containerService.cleanupUserSession(realUserId);
            });
        });
    }

    private ultraCleanContent(content: string, filePath: string = ''): string {
        if (!content) return '';
        let cleaned = content;
        cleaned = cleaned.replace(/[^\x20-\x7E\x09\x0A\x0D]/g, '');
        cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\xFF]/g, '');
        cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        return cleaned;
    }

    private fixIncompleteExtension(filePath: string): string {
        const extensionMap: { [key: string]: string } = {
            '.j': '.js', '.t': '.ts', '.p': '.py', '.c': '.cpp', '.h': '.hpp',
            '.ja': '.java', '.ph': '.php', '.r': '.rb', '.g': '.go', '.ru': '.rust',
            '.sw': '.swift', '.k': '.kt', '.s': '.sh', '.ht': '.html', '.cs': '.css',
            '.jso': '.json', '.x': '.xml', '.m': '.md', '.y': '.yml', '.do': '.dockerfile'
        };
        for (const [incomplete, complete] of Object.entries(extensionMap)) {
            if (filePath.endsWith(incomplete) && !filePath.endsWith(complete)) {
                return filePath.replace(incomplete, complete);
            }
        }
        return filePath;
    }
}
