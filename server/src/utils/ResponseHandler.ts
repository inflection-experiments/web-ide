import { Response } from 'express';

interface ApiResponse<T> {
    status: 'success' | 'fail' | 'error';
    data?: T | undefined;
    message?: string | undefined;
}

export class ResponseHandler {
    static success<T>(res: Response, data: T, statusCode: number = 200, message?: string) {
        const response: ApiResponse<T> = {
            status: 'success',
            data,
            message,
        };
        return res.status(statusCode).json(response);
    }

    static error(res: Response, message: string, statusCode: number = 500) {
        const response: ApiResponse<null> = {
            status: statusCode >= 500 ? 'error' : 'fail',
            message,
        };
        return res.status(statusCode).json(response);
    }
}
