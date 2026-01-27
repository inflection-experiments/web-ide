import Joi from 'joi';
import { Request } from 'express';
import { BaseValidator } from '../base.validator.js';

export interface CreateFileModel {
    userId: string;
    path: string;
    type: 'file' | 'directory';
    content?: string;
    parentPath?: string;
}

export interface RenameFileModel {
    userId: string;
    oldPath: string;
    newPath: string;
}

export class FileValidator extends BaseValidator {
    async validateCreateRequest(request: Request): Promise<CreateFileModel> {
        const schema = Joi.object({
            userId: Joi.string().required(), // SocketID in legacy, but we should move to Auth Token eventually. Keeping as is for compatibility with current frontend payload
            path: Joi.string().required(),
            type: Joi.string().valid('file', 'directory').required(),
            content: Joi.string().allow('').optional(),
            parentPath: Joi.string().allow('').optional(),
        });
        return this.validate(schema, request.body);
    }

    async validateRenameRequest(request: Request): Promise<RenameFileModel> {
        const schema = Joi.object({
            userId: Joi.string().required(),
            oldPath: Joi.string().required(),
            newPath: Joi.string().required(),
        });
        return this.validate(schema, request.body);
    }
}
