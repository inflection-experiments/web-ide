import 'reflect-metadata'; // MUST BE FIRST IMPORT
import * as http from 'http';
import express from 'express';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import * as chokidar from 'chokidar';
import Docker from 'dockerode';

// Services
import { ContainerService } from './src/services/ContainerService.js';
import { AuthService } from './src/services/AuthService.js';
import { AppDataSource } from './src/database/data-source.js';

// Routes and Middleware
import router from './src/routes/index.js';
import { initFileController } from './src/controllers/file.controller.js';
import { errorHandler } from './src/middleware/error.middleware.js';

// Initialize database connection FIRST
console.log(' [Server] Initializing database connection...');
AppDataSource.initialize()
  .then(() => {
    console.log('[Database] Connected successfully');
  })
  .catch((error) => {
    console.error(' [Database] Connection failed:', error);
    process.exit(1);
  });

// Initialize services
const containerService = new ContainerService();
const authService = new AuthService();

const app = express();
const server = http.createServer(app);

// Socket.IO configuration
const io = new SocketServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Express middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// File watcher
let refreshTimeout: NodeJS.Timeout | undefined;

chokidar.watch('./user').on('all', (event: string, thePath: string) => {
  clearTimeout(refreshTimeout);
  refreshTimeout = setTimeout(() => {
    io.emit('file:refresh', thePath);
  }, 100);
});

// Socket user mapping
const socketUserMap = new Map<string, string>();
const userSocketMap = new Map<string, string>();

// Initialize file controller with socket maps
initFileController(socketUserMap, userSocketMap, io);

// Mount all routes
app.use(router);

// Error handling middleware (must be last)
app.use(errorHandler);

// ========================================
// SOCKET.IO CONNECTION HANDLING
// ========================================

io.on('connection', async (socket) => {
  console.log(` [DEBUG] === NEW SOCKET CONNECTION ===`);
  console.log(` [DEBUG] SocketId: ${socket.id}`);
  console.log(` [DEBUG] Auth token provided: ${socket.handshake.auth?.token ? 'YES' : 'NO'}`);

  // Extract JWT token from socket handshake
  const token = socket.handshake.auth?.token;
  if (!token) {
    console.log(' [AUTH] No token provided in socket connection');
    socket.emit('auth:required', 'Authentication token required');
    socket.disconnect();
    return;
  }

  // Verify token and get REAL database user ID
  let realUserId: string;
  try {
    console.log(` [AUTH] Verifying token: ${token.substring(0, 20)}...`);
    const decoded = authService.verifyToken(token);
    realUserId = decoded.userId.toString();
    console.log(` [AUTH] Token verified successfully! REAL User ID: ${realUserId}`);
  } catch (error) {
    console.log(` [AUTH] Token verification failed: ${error}`);
    socket.emit('auth:invalid', 'Invalid authentication token');
    socket.disconnect();
    return;
  }

  // Map socket to REAL user ID
  socketUserMap.set(socket.id, realUserId);
  userSocketMap.set(realUserId, socket.id);

  console.log(` [DEBUG] User mapping created: Socket(${socket.id}) <-> REAL User(${realUserId})`);

  let containerReady: boolean = false;

  // Create container with REAL user ID
  console.log(` [DEBUG] Creating user session for REAL user: ${realUserId}`);
  containerService.createUserSession(realUserId)
    .then(() => {
      containerReady = true;
      socket.emit('terminal:ready');
      console.log(`[DEBUG] Container ready for REAL user: ${realUserId}`);

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

  // Socket event handlers
  socket.on('file:change', async ({ path, content }: { path: string; content: string }) => {
    console.log(`\n [DEBUG] =================== FILE CHANGE START ===================`);
    console.log(` [DEBUG] REAL User: ${realUserId}`);
    console.log(` [DEBUG] Original Path: "${path}"`);
    console.log(` [DEBUG] Content Length: ${content ? content.length : 0}`);

    if (!containerReady) {
      socket.emit('file:error', { path, error: 'Container not ready' });
      return;
    }

    try {
      // Import utilities dynamically to avoid circular dependencies
      const { ultraCleanContent, fixIncompleteExtension } = await import('./src/utils/file-helpers.js');

      const finalPath = fixIncompleteExtension(path);
      console.log(` [DEBUG] Final Path: "${finalPath}"`);

      if (typeof content !== 'string') {
        throw new Error(`Invalid content type: ${typeof content}`);
      }

      const cleanContent = ultraCleanContent(content, finalPath);
      console.log(` [DEBUG] Content cleaned successfully`);

      await containerService.handleFileChange(realUserId, finalPath, cleanContent);
      console.log(` [DEBUG] File saved successfully for REAL user: ${realUserId}`);

      await containerService.dockerManager.cleanupDuplicateFiles(realUserId);
      console.log(` [DEBUG] Duplicates cleaned up`);

      setTimeout(() => {
        socket.emit('file:refresh');
        console.log(` [DEBUG] UI refresh emitted`);
      }, 100);

      console.log(` [DEBUG] =================== FILE CHANGE SUCCESS ===================\n`);

    } catch (error) {
      console.error(`\n [ERROR] =================== FILE CHANGE FAILED ===================`);
      console.error(` [ERROR] REAL User: ${realUserId}, Path: ${path}`);
      console.error(` [ERROR] Error:`, error);
      console.error(` [ERROR] =================== FILE CHANGE FAILED ===================\n`);

      socket.emit('file:error', {
        path: path,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  socket.on('terminal:data', async (data: string) => {
    if (!containerReady) return;
    console.log(` [DEBUG] Terminal data for REAL user: ${realUserId}`);
    await containerService.sendTerminalData(realUserId, data);
  });

  socket.on('terminal:write', async (data: string) => {
    if (!containerReady) {
      socket.emit('terminal:data', 'Container not ready yet, please wait...\r\n$ ');
      return;
    }
    console.log(`[DEBUG] Terminal write for REAL user: ${realUserId}`);
    await containerService.sendTerminalData(realUserId, data + '\n');
  });

  socket.on('terminal:paste', async (text: string) => {
    if (!containerReady) return;
    console.log(` [DEBUG] Terminal paste for REAL user: ${realUserId}`);
    await containerService.sendTerminalData(realUserId, text);
  });

  socket.on('file:save', async ({ path, content }: { path: string; content: string }) => {
    console.log(`\n [DEBUG] =================== MANUAL SAVE START ===================`);
    console.log(` [DEBUG] REAL User: ${realUserId}, Path: ${path}`);

    try {
      const { ultraCleanContent, fixIncompleteExtension } = await import('./src/utils/file-helpers.js');

      const fixedPath = fixIncompleteExtension(path);
      const cleanContent = ultraCleanContent(content, fixedPath);

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

      console.log(` [DEBUG] =================== MANUAL SAVE SUCCESS ===================\n`);

    } catch (error) {
      console.error(`\n [ERROR] =================== MANUAL SAVE FAILED ===================`);
      console.error(` [ERROR] Error:`, error);
      console.error(` [ERROR] =================== MANUAL SAVE FAILED ===================\n`);

      socket.emit('file:saved', {
        path: path,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  socket.on('disconnect', async () => {
    console.log(` [DEBUG] === SOCKET DISCONNECTION ===`);
    console.log(` [DEBUG] SocketId: ${socket.id}, REAL User: ${realUserId}`);
    socketUserMap.delete(socket.id);
    userSocketMap.delete(realUserId);
    await containerService.cleanupUserSession(realUserId);
    console.log(` [DEBUG] Cleanup completed for REAL user: ${realUserId}`);
  });
});

// ========================================
// SERVER STARTUP
// ========================================

async function cleanupOldContainers(): Promise<void> {
  const docker = new Docker();

  try {
    const containers = await docker.listContainers({ all: true });
    for (const containerInfo of containers) {
      if (containerInfo.Names.some((name: string) => name.startsWith('/user-'))) {
        const container = docker.getContainer(containerInfo.Id);
        try {
          await container.stop();
          await container.remove();
        } catch (err) {
          // Silently handle errors
        }
      }
    }
  } catch (err) {
    // Silently handle errors
  }
}

containerService.initialize().then(async () => {
  await cleanupOldContainers();
  server.listen(9000, () => {
    console.log(' Docker-enabled Replit clone with database running on port 9000');
    console.log(' [Server] Authentication enabled (optional)');
    console.log(' [Server] Persistent user sessions active');
    console.log(' [Server] Database integration complete');
    console.log(' [Server] Socket.IO using REAL USER ID authentication');
    console.log(' [Server] Dynamic port allocation enabled');
    console.log(' [Socket.IO] Available at ws://localhost:9000/socket.io/');
    console.log(' [Health] Check at http://localhost:9000/health');
    console.log(' [Test] API test at http://localhost:9000/api/test');
    console.log(' [Auth] Register at POST http://localhost:9000/api/auth/register');
    console.log(' [Auth] Login at POST http://localhost:9000/api/auth/login');
    console.log(' [Auth] Get current user at GET http://localhost:9000/api/auth/me');
    console.log(' [Ports] Get port mappings at GET http://localhost:9000/api/user/ports');
    console.log(' [Ports] Check port status at GET http://localhost:9000/api/user/port-status/:port');
  });
}).catch((error) => {
  console.error('Failed to initialize container service:', error);
  process.exit(1);
});
