/**
 * Project Controller
 * Handles project-related requests
 */

import { Response } from 'express';
import { ProjectService } from '../services/ProjectService.js';
import { AuthRequest } from '../middleware/auth.middleware.js';

const projectService = new ProjectService();

/**
 * Get all projects for authenticated user
 */
export async function getUserProjects(req: AuthRequest, res: Response): Promise<void> {
    try {
        if (!req.userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const result = await projectService.getUserProjects(req.userId);
        console.log(` [Projects] Retrieved ${result.projects.length} projects for user ${req.userId}`);
        res.json(result);
    } catch (error) {
        console.error(' [Projects] Failed to fetch projects:', error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
}

/**
 * Create a new project
 */
export async function createProject(req: AuthRequest, res: Response): Promise<void> {
    try {
        if (!req.userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const { name, description } = req.body;

        if (!name) {
            res.status(400).json({ error: 'Project name is required' });
            return;
        }

        const project = await projectService.createProject(req.userId, name, description);
        console.log(` [Projects] Project created: ${name} for user ${req.userId}`);
        res.json(project);
    } catch (error) {
        console.error(' [Projects] Project creation failed:', error);
        res.status(400).json({
            error: error instanceof Error ? error.message : 'Project creation failed'
        });
    }
}
