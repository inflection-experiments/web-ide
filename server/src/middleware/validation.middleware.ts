import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AppError } from '../common/AppError.js';

export const validateRequest = (schema: Joi.ObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const { error } = schema.validate(req.body, { abortEarly: false });

        if (error) {
            const errorMessage = error.details.map((detail) => detail.message).join(', ');
            return next(new AppError(errorMessage, 400));
        }

        next();
    };
};
