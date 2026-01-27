import Joi from 'joi';
import { Request } from 'express';
import { BaseValidator } from '../api/base.validator.js';

export class SystemValidator extends BaseValidator {
    validatePort(request: Request): number {
        const schema = Joi.number().integer().min(1).max(65535).required();
        const { port } = request.params;
        const { error, value } = schema.validate(port);

        if (error) {
            throw new Error(`Invalid port: ${error.message}`);
        }

        return value;
    }
}
