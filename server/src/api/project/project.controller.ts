import { Request, Response } from 'express';
import { ProjectService } from '../../services/ProjectService.js';
import { ResponseHandler } from '../../common/ResponseHandler.js';
import { ProjectValidator } from './project.validator.js';
import { AppError } from '../../common/AppError.js';

export class ProjectController {
    private projectService: ProjectService;
    private validator: ProjectValidator;

    constructor() {
        this.projectService = new ProjectService();
        this.validator = new ProjectValidator();
    }

    createProject = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).userId;
            const model = await this.validator.validateCreateProject(req);

            const project = await this.projectService.createProject(
                userId,
                model.name,
                model.description
            );

            ResponseHandler.success(res, project, 201, 'Project created successfully');
        } catch (error) {
            // Handle specific known errors
            if (error instanceof Error && error.message.includes('already exists')) {
                ResponseHandler.error(res, error.message, 409);
                return;
            }
            this.handleError(res, error);
        }
    };

    getUserProjects = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).userId;
            const result = await this.projectService.getUserProjects(userId);
            ResponseHandler.success(res, result);
        } catch (error) {
            this.handleError(res, error);
        }
    };

    getProject = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).userId;
            const projectId = this.validator.validateProjectId(req);

            const project = await this.projectService.getProject(projectId, userId);
            ResponseHandler.success(res, project);
        } catch (error) {
            if (error instanceof Error && error.message.includes('not found')) {
                ResponseHandler.error(res, error.message, 404);
                return;
            }
            this.handleError(res, error);
        }
    };

    private handleError(res: Response, error: unknown) {
        if (error instanceof AppError) {
            ResponseHandler.error(res, error.message, error.statusCode);
        } else {
            ResponseHandler.error(res, (error as Error).message || 'Internal Server Error', 500);
        }
    }
}

export const projectController = new ProjectController();
