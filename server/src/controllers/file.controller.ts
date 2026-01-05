/**
 * File Controller
 * Handles file and directory operations
 */

import { Request, Response } from 'express';
import { Server as SocketServer } from 'socket.io';
import { ContainerService } from '../services/ContainerService.js';
import { AuthService } from '../services/AuthService.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { ultraCleanContent, fixIncompleteExtension } from '../utils/file-helpers.js';
import { toTree } from '../utils/tree-builder.js';

const containerService = new ContainerService();
const authService = new AuthService();

// Socket maps - these are passed from main server
let socketUserMap: Map<string, string>;
let userSocketMap: Map<string, string>;
let io: SocketServer;

/**
 * Initialize file controller with socket maps and io instance
 */
export function initFileController(
    _socketUserMap: Map<string, string>,
    _userSocketMap: Map<string, string>,
    _io: SocketServer
): void {
    socketUserMap = _socketUserMap;
    userSocketMap = _userSocketMap;
    io = _io;
}

/**
 * Get file tree for authenticated user
 */
export async function getFiles(req: AuthRequest, res: Response): Promise<void> {
    console.log(' [DEBUG] === GET /files API CALL ===');

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        console.log(' [AUTH] No authorization header provided');
        res.status(401).json({ error: 'No token provided' });
        return;
    }

    let realUserId: string;
    try {
        const decoded = authService.verifyToken(token);
        realUserId = decoded.userId.toString();
        console.log(` [AUTH] API authenticated for REAL user: ${realUserId}`);
    } catch (error) {
        console.log(' [AUTH] API token verification failed:', error);
        res.status(401).json({ error: 'Invalid token' });
        return;
    }

    try {
        console.log(` [DEBUG] Loading files for REAL user: ${realUserId}`);
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
}

/**
 * Get file content
 */
export async function getFileContent(req: AuthRequest, res: Response): Promise<void> {
    console.log('\n [DEBUG] =================== GET FILE CONTENT ===================');

    const token = req.headers.authorization?.replace('Bearer ', '');
    const rawPath: string = req.query.path as string;

    if (!token) {
        res.status(401).json({ error: 'No token provided' });
        return;
    }

    let realUserId: string;
    try {
        const decoded = authService.verifyToken(token);
        realUserId = decoded.userId.toString();
        console.log(` [DEBUG] File content request for REAL user: ${realUserId}`);
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
        return;
    }

    try {
        let decodedPath: string = decodeURIComponent(rawPath);
        decodedPath = decodedPath.replace(/^\/+/, '');

        const finalPath = fixIncompleteExtension(decodedPath);
        console.log(` [DEBUG] Final path: ${finalPath}`);

        if (!finalPath) {
            res.status(400).json({ error: 'Invalid file path' });
            return;
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
}

/**
 * Create file or directory
 */
export async function createFileOrDirectory(req: Request, res: Response): Promise<void> {
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
            res.status(400).json({ error: 'User session not found' });
            return;
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
            console.log(` [DEBUG]  CALLING containerService.createDirectory("${userId}", "${fullPath}")`);

            await containerService.createDirectory(userId, fullPath);

            console.log(' [DEBUG] Directory created and stored in cloud successfully');
        } else {
            console.error(` [ERROR] Invalid type: ${requestType}`);
            res.status(400).json({ error: `Invalid type: ${requestType}` });
            return;
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
}

/**
 * Rename file or directory
 */
export async function renameFile(req: Request, res: Response): Promise<void> {
    console.log('=== POST /files/rename ===');

    try {
        const socketId: string = req.body.userId;
        const oldPath: string = req.body.oldPath;
        const newPath: string = req.body.newPath;

        const userId: string | undefined = socketUserMap.get(socketId);
        if (!userId) {
            res.status(400).json({ error: 'User session not found' });
            return;
        }

        console.log(` [DEBUG] Renaming for REAL user: ${userId}`);
        await containerService.dockerManager.renamePath(userId, oldPath, newPath);
        res.json({ success: true });
    } catch (error: unknown) {
        console.error('Error in rename:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
}

/**
 * Delete file or directory
 */
export async function deleteFile(req: Request, res: Response): Promise<void> {
    console.log('=== DELETE /files/delete ===');

    try {
        const socketId: string = req.query.userId as string;
        const path: string = req.query.path as string;
        const type: string = req.query.type as string;

        const userId: string | undefined = socketUserMap.get(socketId);
        if (!userId) {
            res.status(400).json({ error: 'User session not found' });
            return;
        }

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
}

/**
 * List directory contents
 */
export async function listDirectory(req: Request, res: Response): Promise<void> {
    console.log('=== GET /files/directory ===');

    try {
        const socketId: string = req.query.userId as string;
        const directoryPath: string = req.query.path as string;

        const userId: string | undefined = socketUserMap.get(socketId);
        if (!userId) {
            res.status(400).json({ error: 'User session not found' });
            return;
        }

        console.log(` [DEBUG] Directory listing for REAL user: ${userId}`);
        const items: string[] = await containerService.dockerManager.listDirectory(userId, directoryPath);
        res.json({ items });
    } catch (error: unknown) {
        console.error('Error in directory listing:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
}
