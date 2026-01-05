/**
 * Authentication Middleware
 * Verifies JWT tokens and attaches user info to request
 */

import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService.js';

// Extend Express Request type to include user info
export interface AuthRequest extends Request {
    userId?: string;
    user?: any;
}

const authService = new AuthService();

/**
 * Middleware to authenticate requests using JWT
 * Extracts token from Authorization header and verifies it
 */
export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            res.status(401).json({ error: 'No token provided' });
            return;
        }

        const decoded = authService.verifyToken(token);
        req.userId = decoded.userId.toString();
        req.user = decoded;

        next();
    } catch (error) {
        console.error(' [Auth Middleware] Token verification failed:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
}
