import Joi from 'joi';
import { Request } from 'express';
import { BaseValidator, BaseSearchFilters } from '../base.validator.js';

export interface CreateProjectModel {
    name: string;
    description?: string;
}

export interface UpdateProjectModel {
    name?: string;
    description?: string;
    status?: string;
}

export class ProjectValidator extends BaseValidator {
    async validateCreateProject(request: Request): Promise<CreateProjectModel> {
        const schema = Joi.object({
            name: Joi.string().min(3).max(50).required(),
            description: Joi.string().max(500).allow(null, '').optional(),
        });
        return this.validate(schema, request.body);
    }

    async validateUpdateProject(request: Request): Promise<UpdateProjectModel> {
        const schema = Joi.object({
            name: Joi.string().min(3).max(50).optional(),
            description: Joi.string().max(500).allow(null, '').optional(),
            status: Joi.string().valid('active', 'archived', 'deleted').optional(),
        });
        return this.validate(schema, request.body);
    }

    validateProjectId(request: Request): string {
        return this.requestParamAsUUID(request, 'projectId');
    }
}
