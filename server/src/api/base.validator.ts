import Joi from 'joi';
import { Request } from 'express';
import { AppError } from '../common/AppError.js';

export interface BaseSearchFilters {
    OrderBy?: string;
    Order?: 'ascending' | 'descending';
    PageIndex?: number;
    ItemsPerPage?: number;
}

export class BaseValidator {
    protected async validate(schema: Joi.Schema, data: any): Promise<any> {
        try {
            return await schema.validateAsync(data, {
                abortEarly: false,
                stripUnknown: true,
            });
        } catch (error: any) {
            if (error.isJoi || error.name === 'ValidationError') {
                const messages = error.details?.map((d: any) => d.message) || [error.message];
                throw new AppError(messages.join('; '), 400);
            }
            throw error;
        }
    }

    protected requestParamAsUUID(request: Request, paramName: string): string {
        const value = request.params[paramName];
        if (!value) {
            throw new AppError(`${paramName} is required`, 400);
        }

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(value)) {
            throw new AppError(`${paramName} must be a valid UUID`, 400);
        }

        return value;
    }

    protected getBaseSearchFilters(request: Request): BaseSearchFilters {
        return {
            OrderBy: request.query.orderBy as string || 'CreatedAt',
            Order: (request.query.order as any) || 'descending',
            PageIndex: parseInt(request.query.pageIndex as string) || 0,
            ItemsPerPage: parseInt(request.query.itemsPerPage as string) || 25,
        };
    }
}
