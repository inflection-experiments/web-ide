import { Request, Response } from 'express';
// Import the singleton instance
import { containerService } from '../services/ContainerService.js';
import { ResponseHandler } from '../utils/ResponseHandler.js';
import { FileValidator } from '../api/file/file.validator.js';
import { AppError } from '../utils/AppError.js';
import { AuthService } from '../services/AuthService.js';

function ultraCleanContent(content: string, filePath: string = ''): string {
    if (!content) return '';
    let cleaned = content;
    cleaned = cleaned.replace(/[^\x20-\x7E\x09\x0A\x0D]/g, '');
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\xFF]/g, '');
    cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    return cleaned;
}

function fixIncompleteExtension(filePath: string): string {
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

export class FileController {
    private validator: FileValidator;
    private authService: AuthService;

    constructor() {
        this.validator = new FileValidator();
        this.authService = new AuthService();
    }

    getFiles = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).userId;
            if (!userId) throw new AppError('User not authenticated', 401);

            await containerService.dockerManager.cleanupDuplicateFiles(userId);
            const items = await containerService.getFiles(userId);

            const uniqueItems = Array.from(new Set(items));
            const tree: Record<string, any> = {};
            for (const item of uniqueItems) {
                if (!item) continue;
                const parts = item.split('|');
                const name = parts[0];
                const type = parts[1];
                if (name && type) tree[name] = type === 'd' ? {} : null;
            }

            res.set({
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });

            ResponseHandler.success(res, { tree });
        } catch (error) {
            this.handleError(res, error);
        }
    };

    getDirectory = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).userId;
            if (!userId) throw new AppError('User not authenticated', 401);

            const path = req.query.path as string;
            if (!path) throw new AppError('Path required', 400);

            console.log(`[DEBUG] Listing directory for user ${userId}: ${path}`);
            const items = await containerService.dockerManager.listDirectory(userId, path);

            ResponseHandler.success(res, { items });
        } catch (error) {
            this.handleError(res, error);
        }
    };

    getFileContent = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).userId;
            if (!userId) throw new AppError('User not authenticated', 401);

            const rawPath = req.query.path as string;
            if (!rawPath) throw new AppError('Path required', 400);

            let decodedPath = decodeURIComponent(rawPath).replace(/^\/+/, '');
            const finalPath = fixIncompleteExtension(decodedPath);

            const content = await containerService.readFileFromContainer(userId, finalPath);
            const cleanContent = ultraCleanContent(content, finalPath);

            res.set({
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Content-Type': 'application/json'
            });

            ResponseHandler.success(res, { content: cleanContent });
        } catch (error) {
            this.handleError(res, error);
        }
    };

    createFile = async (req: Request, res: Response): Promise<void> => {
        try {
            const model = await this.validator.validateCreateRequest(req);

            const realUserId = (req as any).userId;
            if (!realUserId) throw new AppError('Authentication required', 401);

            let requestPath = model.path;
            if (model.type === 'file') {
                requestPath = fixIncompleteExtension(requestPath);
            }

            let fullPath = requestPath;
            if (model.parentPath && model.parentPath.trim()) {
                const cleanParent = model.parentPath.replace(/^\/+|\/+$/g, '');
                const cleanRequest = requestPath.replace(/^\/+|\/+$/g, '');
                fullPath = cleanParent ? `${cleanParent}/${cleanRequest}` : cleanRequest;
            }

            if (model.type === 'file') {
                const cleanContent = ultraCleanContent(model.content || '', fullPath);
                await containerService.handleFileChange(realUserId, fullPath, cleanContent);
            } else {
                await containerService.createDirectory(realUserId, fullPath);
            }

            await containerService.dockerManager.cleanupDuplicateFiles(realUserId);

            ResponseHandler.success(res, { success: true, path: fullPath, type: model.type }, 201);

        } catch (error) {
            this.handleError(res, error);
        }
    }

    renameFile = async (req: Request, res: Response): Promise<void> => {
        try {
            const model = await this.validator.validateRenameRequest(req);

            const userId = (req as any).userId;
            if (!userId) throw new AppError('Authentication required', 401);

            await containerService.dockerManager.renamePath(userId, model.oldPath, model.newPath);
            ResponseHandler.success(res, { success: true });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    deleteFile = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).userId;
            if (!userId) throw new AppError('Authentication required', 401);

            const path = req.query.path as string;
            const type = req.query.type as string; // 'file' or 'directory'

            if (!path) throw new AppError('Path required', 400);

            if (type === 'directory') {
                await containerService.deleteUserDirectory(userId, path);
            } else {
                await containerService.deleteUserFile(userId, path);
            }

            ResponseHandler.success(res, { success: true });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    private handleError(res: Response, error: unknown) {
        if (error instanceof AppError) {
            ResponseHandler.error(res, error.message, error.statusCode);
        } else {
            ResponseHandler.error(res, (error as Error).message || 'Internal Server Error', 500);
        }
    }
}

export const fileController = new FileController();
