import Joi from 'joi';
import { Request } from 'express';
import { BaseValidator } from '../base.validator.js';

export interface RegisterModel {
    username: string;
    email: string;
    password: string;
}

export interface LoginModel {
    email: string;
    password: string;
}

export class AuthValidator extends BaseValidator {
    async validateRegisterRequest(request: Request): Promise<RegisterModel> {
        const schema = Joi.object({
            username: Joi.string()
                .min(3)
                .max(32)
                .pattern(/^[a-zA-Z0-9_]+$/)
                .required()
                .messages({
                    'string.pattern.base': 'Username can only contain letters, numbers, and underscores',
                    'string.min': 'Username must be at least 3 characters',
                    'string.max': 'Username must be less than 32 characters',
                }),
            email: Joi.string()
                .email()
                .required()
                .messages({
                    'string.email': 'Please provide a valid email address',
                }),
            password: Joi.string()
                .min(8)
                .required()
                .messages({
                    'string.min': 'Password must be at least 8 characters',
                }),
        });

        return this.validate(schema, request.body);
    }

    async validateLoginRequest(request: Request): Promise<LoginModel> {
        const schema = Joi.object({
            email: Joi.string().email().required(),
            password: Joi.string().required(),
        });

        return this.validate(schema, request.body);
    }
}
