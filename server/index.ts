import 'reflect-metadata'; // MUST BE FIRST IMPORT
import * as http from 'http';
import express from 'express';
import { promises as fs } from 'fs';
import { Server as SocketServer } from 'socket.io';
import * as path from 'path';
import cors from 'cors';
import * as chokidar from 'chokidar';
import { ContainerService } from './src/services/ContainerService.js';
import { AuthService } from './src/services/AuthService.js';
import { ProjectService } from './src/services/ProjectService.js';
import { AppDataSource } from './src/database/data-source.js';
import { randomBytes } from 'crypto';
import Docker from 'dockerode';


// Initialize database connection FIRST
console.log(' [Server] Initializing database connection...');
AppDataSource.initialize()
  .then(() => {
    console.log('✅ [Database] Connected successfully');
  })
  .catch((error) => {
    console.error(' [Database] Connection failed:', error);
    process.exit(1);
  });


// Initialize services
const containerService = new ContainerService();
const authService = new AuthService();
const projectService = new ProjectService();


const app = express();
const server = http.createServer(app);


// ✅ KEEP YOUR ORIGINAL SOCKET.IO CONFIG
const io = new SocketServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});


app.use(cors());
app.use(express.json());
app.use(express.static('public'));


let refreshTimeout: NodeJS.Timeout | undefined;


// ✅ KEEP YOUR ORIGINAL FILE WATCHER (NO CHANGES)
chokidar.watch('./user').on('all', (event: string, thePath: string) => {
  clearTimeout(refreshTimeout);
  refreshTimeout = setTimeout(() => {
    io.emit('file:refresh', thePath);
  }, 100);
});


// ✅ KEEP YOUR ORIGINAL SOCKET MAPS (NO CHANGES)
const socketUserMap = new Map<string, string>();
const userSocketMap = new Map<string, string>();


// ✅ KEEP ALL YOUR ORIGINAL CONTENT FUNCTIONS (NO CHANGES)
function ultraCleanContent(content: string, filePath: string = ''): string {
  console.log(` [DEBUG] Ultra-cleaning content for: ${filePath}`);
  console.log(` [DEBUG] Original length: ${content.length}`);
  
  if (!content) return '';
  
  let cleaned = content;
  
  // Keep ONLY safe ASCII characters + \n + \t
  cleaned = cleaned.replace(/[^\x20-\x7E\x09\x0A\x0D]/g, '');
  
  // Remove control characters but keep newlines and tabs
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\xFF]/g, '');
  
  // Normalize line endings
  cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Special handling for JSON files
  if (filePath.includes('.json') || filePath.includes('package')) {
    try {
      console.log(` [DEBUG] JSON file detected, validating...`);
      const parsed = JSON.parse(cleaned);
      cleaned = JSON.stringify(parsed, null, 2);
      console.log(` [DEBUG] JSON validated and reformatted`);
    } catch (jsonError) {
      console.log(` [DEBUG] JSON invalid, creating safe default`);
      if (filePath.includes('package.json')) {
        cleaned = JSON.stringify({
          "name": "test",
          "version": "1.0.0",
          "main": "index.js",
          "type": "module",
          "scripts": {
            "test": "echo \"Error: no test specified\" && exit 1"
          },
          "keywords": [],
          "author": "",
          "license": "ISC",
          "description": ""
        }, null, 2);
      } else {
        cleaned = '{}';
      }
    }
  }
  
  console.log(` [DEBUG] Cleaning complete: ${content.length} -> ${cleaned.length}`);
  return cleaned;
}


function fixIncompleteExtension(filePath: string): string {
  console.log(`🔧 [DEBUG] Checking extension for: "${filePath}"`);
  
  const extensionMap: { [key: string]: string } = {
    '.j': '.js',
    '.t': '.ts', 
    '.p': '.py',
    '.c': '.cpp',
    '.h': '.hpp',
    '.ja': '.java',
    '.ph': '.php',
    '.r': '.rb',
    '.g': '.go',
    '.ru': '.rust',
    '.sw': '.swift',
    '.k': '.kt',
    '.s': '.sh',
    '.ht': '.html',
    '.cs': '.css',
    '.jso': '.json',
    '.x': '.xml',
    '.m': '.md',
    '.y': '.yml',
    '.do': '.dockerfile'
  };


  for (const [incomplete, complete] of Object.entries(extensionMap)) {
    if (filePath.endsWith(incomplete) && !filePath.endsWith(complete)) {
      const fixedPath = filePath.replace(incomplete, complete);
      console.log(` [DEBUG] EXTENSION FIXED: "${filePath}" -> "${fixedPath}"`);
      return fixedPath;
    }
  }


  console.log(`🔧 [DEBUG] NO EXTENSION FIX NEEDED: "${filePath}"`);
  return filePath;
}


// ========================================
// AUTHENTICATION ROUTES (NO CHANGES)
// ========================================


app.get('/api/test', (req, res) => {
  console.log('🧪 [API] Test endpoint accessed');
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


app.post('/api/auth/register', async (req, res) => {
  try {
    console.log(' [Auth] Registration attempt:', req.body);
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      console.log(' [Auth] Missing required fields');
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    const result = await authService.register(username, email, password);
    console.log(` [Auth] User registered successfully: ${username}`);
    res.json(result);
  } catch (error) {
    console.error(' [Auth] Registration failed:', error);
    res.status(400).json({ 
      error: error instanceof Error ? error.message : 'Registration failed' 
    });
  }
});


app.post('/api/auth/login', async (req, res) => {
  try {
    console.log(' [Auth] Login attempt:', { usernameOrEmail: req.body.usernameOrEmail });
    const { usernameOrEmail, password } = req.body;
    
    if (!usernameOrEmail || !password) {
      console.log(' [Auth] Missing login credentials');
      return res.status(400).json({ error: 'Username/email and password are required' });
    }
    
    const result = await authService.login(usernameOrEmail, password);
    console.log(`✅ [Auth] User logged in successfully: ${result.user.username}`);
    res.json(result);
  } catch (error) {
    console.error(' [Auth] Login failed:', error);
    res.status(400).json({ 
      error: error instanceof Error ? error.message : 'Login failed' 
    });
  }
});


app.get('/api/auth/me', async (req, res) => {
  try {
    console.log(' [Auth] === GET CURRENT USER START ===');
    console.log(' [Auth] Headers received:', req.headers.authorization ? 'Authorization header present' : 'No authorization header');
    
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      console.log(' [Auth] No token provided in request');
      return res.status(401).json({ error: 'No token provided' });
    }


    console.log(' [Auth] Token found, length:', token.length);
    console.log(' [Auth] Token preview:', token.substring(0, 20) + '...');
    
    console.log(' [Auth] Verifying token with AuthService...');
    const decoded = authService.verifyToken(token);
    console.log(' [Auth] Token decoded successfully, userId:', decoded.userId);
    
    // Get user from database using the decoded userId
    console.log(' [Auth] Fetching user from database...');
    const user = await authService.getUserById(decoded.userId);
    
    if (!user) {
      console.log(' [Auth] User not found in database for ID:', decoded.userId);
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log(` [Auth] Current user retrieved: ${user.username} (${user.email})`);
    
    res.json(user);
    console.log(' [Auth] === GET CURRENT USER SUCCESS ===');
  } catch (error) {
    console.error(' [Auth] Get current user failed:', error);
    console.error(' [Auth] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    res.status(401).json({ error: 'Invalid token' });
    console.log(' [Auth] === GET CURRENT USER FAILED ===');
  }
});


// PROJECT ROUTES (NO CHANGES)
app.get('/api/projects', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }


    const decoded = authService.verifyToken(token);
    const result = await projectService.getUserProjects(decoded.userId);
    console.log(` [Projects] Retrieved ${result.projects.length} projects for user ${decoded.userId}`);
    res.json(result);
  } catch (error) {
    console.error(' [Projects] Failed to fetch projects:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});


app.post('/api/projects', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }


    const decoded = authService.verifyToken(token);
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }
    
    const project = await projectService.createProject(decoded.userId, name, description);
    console.log(` [Projects] Project created: ${name} for user ${decoded.userId}`);
    res.json(project);
  } catch (error) {
    console.error(' [Projects] Project creation failed:', error);
    res.status(400).json({ 
      error: error instanceof Error ? error.message : 'Project creation failed' 
    });
  }
});


// ========================================
// ✅ FIXED SOCKET.IO CODE - USES REAL USER IDS FROM JWT
// ========================================


io.on('connection', async (socket) => {
  console.log(` [DEBUG] === NEW SOCKET CONNECTION ===`);
  console.log(` [DEBUG] SocketId: ${socket.id}`);
  console.log(` [DEBUG] Auth token provided: ${socket.handshake.auth?.token ? 'YES' : 'NO'}`);
  
  // ✅ CRITICAL FIX: Extract JWT token from socket handshake
  const token = socket.handshake.auth?.token;
  if (!token) {
    console.log(' [AUTH] No token provided in socket connection');
    socket.emit('auth:required', 'Authentication token required');
    socket.disconnect();
    return;
  }


  // ✅ CRITICAL FIX: Verify token and get REAL database user ID
  let realUserId: string;
  try {
    console.log(` [AUTH] Verifying token: ${token.substring(0, 20)}...`);
    const decoded = authService.verifyToken(token);
    realUserId = decoded.userId.toString(); // Convert to string for consistency
    console.log(` [AUTH] Token verified successfully! REAL User ID: ${realUserId}`);
  } catch (error) {
    console.log(` [AUTH] Token verification failed: ${error}`);
    socket.emit('auth:invalid', 'Invalid authentication token');
    socket.disconnect();
    return;
  }


  // ✅ CRITICAL FIX: Map socket to REAL user ID (not random ID)
  socketUserMap.set(socket.id, realUserId);
  userSocketMap.set(realUserId, socket.id);
  
  console.log(` [DEBUG] User mapping created: Socket(${socket.id}) <-> REAL User(${realUserId})`);


  let containerReady: boolean = false;


  // ✅ FIXED: Create container with REAL user ID
  console.log(`🐳 [DEBUG] Creating user session for REAL user: ${realUserId}`);
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


  // ✅ ALL SOCKET HANDLERS NOW USE realUserId INSTEAD OF GENERATED userId
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
      
      console.log(`💾 [DEBUG] =================== MANUAL SAVE SUCCESS ===================\n`);
      
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
// ✅ UPDATED API ROUTES - USE AUTH HEADERS INSTEAD OF SOCKET IDS
// ========================================


// Updated tree function with type safety (NO CHANGES)
function toTree(items: string[]): Record<string, any> {
  const tree: Record<string, any> = {};
  const uniqueItems: string[] = Array.from(new Set(items));
  
  console.log(` [DEBUG] Building tree from items:`, uniqueItems);


  for (const item of uniqueItems) {
    if (!item) continue;
    
    const parts = item.split('|');
    const name = parts[0];
    const type = parts[1];
    
    // Type guard - ensure both parts exist
    if (!name || !type) {
      console.warn(` [DEBUG] Invalid item format: ${item}`);
      continue;
    }


    console.log(` [DEBUG] Adding to tree: ${name} (${type})`);
    tree[name] = type === 'd' ? {} : null;
  }
  
  console.log(` [DEBUG] Final tree:`, tree);
  return tree;
}


// Add health check route with database status (NO CHANGES)
app.get('/health', async (req, res) => {
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


// ✅ FIXED: Use Auth Headers Instead of Socket IDs
app.get('/files', async (req, res) => {
  console.log(' [DEBUG] === GET /files API CALL ===');
  
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    console.log(' [AUTH] No authorization header provided');
    return res.status(401).json({ error: 'No token provided' });
  }


  let realUserId: string;
  try {
    const decoded = authService.verifyToken(token);
    realUserId = decoded.userId.toString();
    console.log(` [AUTH] API authenticated for REAL user: ${realUserId}`);
  } catch (error) {
    console.log(' [AUTH] API token verification failed:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  try {
    console.log(`📁 [DEBUG] Loading files for REAL user: ${realUserId}`);
    await containerService.dockerManager.cleanupDuplicateFiles(realUserId);
    
    const items: string[] = await containerService.getFiles(realUserId);
    const tree: Record<string, any> = toTree(items);
    
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    console.log(` [DEBUG] Files loaded successfully for REAL user: ${realUserId}`);
    res.json({ tree });
  } catch (error: unknown) {
    console.error(` [ERROR] Files loading failed for REAL user ${realUserId}:`, error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});


app.get('/files/content', async (req, res) => {
  console.log('\n [DEBUG] =================== GET FILE CONTENT ===================');
  
  const token = req.headers.authorization?.replace('Bearer ', '');
  const rawPath: string = req.query.path as string;
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  let realUserId: string;
  try {
    const decoded = authService.verifyToken(token);
    realUserId = decoded.userId.toString();
    console.log(` [DEBUG] File content request for REAL user: ${realUserId}`);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  try {
    let decodedPath: string = decodeURIComponent(rawPath);
    decodedPath = decodedPath.replace(/^\/+/, '');
    
    const finalPath = fixIncompleteExtension(decodedPath);
    console.log(` [DEBUG] Final path: ${finalPath}`);
    
    if (!finalPath) {
      return res.status(400).json({ error: 'Invalid file path' });
    }
    
    const content: string = await containerService.readFileFromContainer(realUserId, finalPath);
    const cleanContent = ultraCleanContent(content, finalPath);
    
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Content-Type': 'application/json'
    });
    
    console.log(` [DEBUG] Content returned successfully - Length: ${cleanContent.length}`);
    console.log(` [DEBUG] =================== GET FILE CONTENT SUCCESS ===================\n`);
    
    res.json({ content: cleanContent });
    
  } catch (error: unknown) {
    console.error(`\n [ERROR] =================== GET FILE CONTENT FAILED ===================`);
    console.error(' [ERROR] File content error:', error);
    console.error(` [ERROR] =================== GET FILE CONTENT FAILED ===================\n`);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});


// ✅ Keep other routes but they still use socketUserMap for now (legacy compatibility)
app.post('/files/create', async (req, res) => {
  console.log('\n [DEBUG] =================== CREATE FILE/DIRECTORY START ===================');
  
  try {
    const socketId: string = req.body.userId;
    let requestPath: string = req.body.path;
    const requestType: string = req.body.type;
    const requestContent: string = req.body.content || '';
    const parentPath: string = req.body.parentPath || '';
    
    console.log(` [DEBUG] Socket ID: ${socketId}`);
    console.log(` [DEBUG] Request Path: "${requestPath}"`);
    console.log(` [DEBUG] Request Type: "${requestType}"`);
    console.log(` [DEBUG] Parent Path: "${parentPath}"`);
    console.log(` [DEBUG] Content Length: ${requestContent.length}`);
    
    if (requestType === 'file') {
      requestPath = fixIncompleteExtension(requestPath);
    }
    
    const userId: string | undefined = socketUserMap.get(socketId);
    if (!userId) {
      console.error(` [ERROR] User session not found for socket: ${socketId}`);
      return res.status(400).json({ error: 'User session not found' });
    }
    
    let fullPath: string = requestPath;
    if (parentPath.trim()) {
      const cleanParent = parentPath.replace(/^\/+|\/+$/g, '');
      const cleanRequest = requestPath.replace(/^\/+|\/+$/g, '');
      fullPath = cleanParent ? `${cleanParent}/${cleanRequest}` : cleanRequest;
    }
    
    console.log(` [DEBUG] Full Path: "${fullPath}"`);
    console.log(` [DEBUG] REAL User ID: "${userId}"`);
    
    if (requestType === 'file') {
      console.log(` [DEBUG] Creating FILE: ${fullPath}`);
      const cleanContent = ultraCleanContent(requestContent, fullPath);
      await containerService.handleFileChange(userId, fullPath, cleanContent);
      console.log(' [DEBUG] File created successfully');
    } else if (requestType === 'directory') {
      console.log(` [DEBUG] Creating DIRECTORY: ${fullPath}`);
      console.log(` [DEBUG] 🚀 CALLING containerService.createDirectory("${userId}", "${fullPath}")`);
      
      await containerService.createDirectory(userId, fullPath);
      
      console.log(' [DEBUG] Directory created and stored in cloud successfully');
    } else {
      console.error(` [ERROR] Invalid type: ${requestType}`);
      return res.status(400).json({ error: `Invalid type: ${requestType}` });
    }
    
    console.log(` [DEBUG] Cleaning up duplicates...`);
    await containerService.dockerManager.cleanupDuplicateFiles(userId);
    
    const socketToEmit = userSocketMap.get(userId);
    if (socketToEmit) {
      const socket = io.sockets.sockets.get(socketToEmit);
      if (socket) {
        socket.emit('file:refresh');
        console.log(` [DEBUG] File refresh emitted to socket`);
      }
    }
    
    console.log(` [DEBUG] =================== CREATE ${requestType.toUpperCase()} SUCCESS ===================\n`);
    res.json({ success: true, path: fullPath, type: requestType });
    
  } catch (error: unknown) {
    console.error(`\n [ERROR] =================== CREATE FILE/DIRECTORY FAILED ===================`);
    console.error(' [ERROR] Creation error:', error);
    if (error instanceof Error) {
      console.error(' [ERROR] Error message:', error.message);
      console.error(' [ERROR] Error stack:', error.stack);
    }
    console.error(` [ERROR] =================== CREATE FILE/DIRECTORY FAILED ===================\n`);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});


app.post('/files/rename', async (req, res) => {
  console.log('=== POST /files/rename ===');
  
  try {
    const socketId: string = req.body.userId;
    const oldPath: string = req.body.oldPath;
    const newPath: string = req.body.newPath;
    
    const userId: string | undefined = socketUserMap.get(socketId);
    if (!userId) return res.status(400).json({ error: 'User session not found' });
    
    console.log(`🔄 [DEBUG] Renaming for REAL user: ${userId}`);
    await containerService.dockerManager.renamePath(userId, oldPath, newPath);
    res.json({ success: true });
  } catch (error: unknown) {
    console.error('Error in rename:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});


app.delete('/files/delete', async (req, res) => {
  console.log('=== DELETE /files/delete ===');
  
  try {
    const socketId: string = req.query.userId as string;
    const path: string = req.query.path as string;
    const type: string = req.query.type as string;
    
    const userId: string | undefined = socketUserMap.get(socketId);
    if (!userId) return res.status(400).json({ error: 'User session not found' });
    
    console.log(` [DEBUG] Deleting for REAL user: ${userId}`);
    if (type === 'directory') {
      await containerService.deleteUserDirectory(userId, path);
    } else {
      await containerService.deleteUserFile(userId, path);
    }
    
    res.json({ success: true });
  } catch (error: unknown) {
    console.error('Error in delete:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});


app.get('/files/directory', async (req, res) => {
  console.log('=== GET /files/directory ===');
  
  try {
    const socketId: string = req.query.userId as string;
    const directoryPath: string = req.query.path as string;
    
    const userId: string | undefined = socketUserMap.get(socketId);
    if (!userId) return res.status(400).json({ error: 'User session not found' });
    
    console.log(` [DEBUG] Directory listing for REAL user: ${userId}`);
    const items: string[] = await containerService.dockerManager.listDirectory(userId, directoryPath);
    res.json({ items });
  } catch (error: unknown) {
    console.error('Error in directory listing:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});


// ========================================
// ✅ NEW: DYNAMIC PORT DISCOVERY API ENDPOINTS (FIXED TypeScript errors)
// ========================================

// Get user's port mappings
app.get('/api/user/ports', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = authService.verifyToken(token);
    const realUserId = decoded.userId.toString();
    
    console.log(`🔍 [PORT] Getting port mappings for user: ${realUserId}`);
    
    // Get container and inspect port mappings
    const container = containerService.dockerManager.getContainer(realUserId);
    if (!container) {
      return res.json({ success: true, portMappings: [] });
    }

    const containerInfo = await container.inspect();
    const portMappings: Array<{containerPort: number, hostPort: number, status: string}> = [];

    if (containerInfo.NetworkSettings?.Ports) {
      for (const [containerPortStr, hostMapping] of Object.entries(containerInfo.NetworkSettings.Ports)) {
        if (hostMapping && Array.isArray(hostMapping) && hostMapping[0]?.HostPort) {
          // ✅ FIXED: Added proper type checking and fallback
          const containerPortPart = containerPortStr.split('/')[0];
          if (containerPortPart) {
            const containerPort = parseInt(containerPortPart);
            const hostPortStr = hostMapping[0].HostPort;
            
            // ✅ FIXED: Check if hostPortStr exists before parsing
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
});

// Check if a service is running on a specific container port
app.get('/api/user/port-status/:port', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = authService.verifyToken(token);
    const realUserId = decoded.userId.toString();
    
    // ✅ FIXED: Added proper type checking for port parameter
    const portParam = req.params.port;
    if (!portParam) {
      return res.status(400).json({ error: 'Port parameter is required' });
    }
    
    const port = parseInt(portParam);
    if (isNaN(port)) {
      return res.status(400).json({ error: 'Invalid port number' });
    }
    
    console.log(` [PORT] Checking port ${port} status for user: ${realUserId}`);
    
    const container = containerService.dockerManager.getContainer(realUserId);
    if (!container) {
      return res.json({ success: true, isRunning: false, message: 'Container not found' });
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
});


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
    console.log('🔌 [Socket.IO] Available at ws://localhost:9000/socket.io/');
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
