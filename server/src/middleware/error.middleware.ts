/**
 * Error Handling Middleware
 * Global error handler for Express
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Global error handling middleware
 * Formats errors consistently and logs them
 */
export function errorHandler(
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void {
    console.error(' [Error Handler] Unhandled error:', {
        message: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method
    });

    res.status(500).json({
        error: error.message || 'Internal server error',
        path: req.path
    });
}
