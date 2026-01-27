import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ResponseHandler } from '../common/ResponseHandler.js';
import { AuthOptions, AuthUser } from '../api/auth/auth.types.js';

export interface AuthRequest extends Request {
    user?: AuthUser;
    userId?: string; // Legacy support
    username?: string; // Legacy support
}

export const requireAuth = (options: AuthOptions = {}) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const token = req.headers.authorization?.replace('Bearer ', '');

            if (!token) {
                if (options.allowAnonymous) {
                    return next();
                }
                return ResponseHandler.error(res, 'No token provided', 401);
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as AuthUser;

            // Attach user to request
            (req as AuthRequest).user = decoded;

            // Legacy support
            (req as any).userId = decoded.userId;
            (req as any).username = decoded.username;

            // Role check (Simple implementation for now)
            if (options.roles && options.roles.length > 0) {
                if (!decoded.role || !options.roles.includes(decoded.role)) {
                    return ResponseHandler.error(res, 'Insufficient permissions', 403);
                }
            }

            next();
        } catch (error) {
            if (options.allowAnonymous) {
                return next();
            }
            return ResponseHandler.error(res, 'Invalid or expired token', 401);
        }
    };
};

export const authMiddleware = requireAuth();

