import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';
import { config } from '../config/env.config.js';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    let error = err;

    if (!(error instanceof AppError)) {
        const statusCode = (error as any).statusCode || 500;
        const message = error.message || 'Internal Server Error';
        error = new AppError(message, statusCode);
    }

    const statusCode = (error as AppError).statusCode;

    if (config.env === 'development') {
        res.status(statusCode).json({
            status: (error as AppError).status,
            error: error,
            message: error.message,
            stack: error.stack,
        });
    } else {
        // Production: don't leak stack traces
        if ((error as AppError).isOperational) {
            res.status(statusCode).json({
                status: (error as AppError).status,
                message: error.message,
            });
        } else {
            // Programming or other unknown error: don't leak details
            console.error('ERROR 💥', error);
            res.status(500).json({
                status: 'error',
                message: 'Something went very wrong!',
            });
        }
    }
};
