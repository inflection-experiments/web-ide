import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ResponseHandler } from '../common/ResponseHandler.js';

export interface AuthRequest extends Request {
    userId: string;
    username: string;
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return ResponseHandler.error(res, 'No token provided', 401);
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: string; username: string };

        (req as any).userId = decoded.userId;
        (req as any).username = decoded.username;

        next();
    } catch (error) {
        return ResponseHandler.error(res, 'Invalid or expired token', 401);
    }
};
