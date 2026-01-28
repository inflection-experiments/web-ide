import { Request, Response } from 'express';
import { AuthService } from '../../services/AuthService.js';
import { ResponseHandler } from '../../common/ResponseHandler.js';
import { AuthValidator } from './auth.validator.js';
import { AppError } from '../../common/AppError.js';

import { autoInjectable, inject } from 'tsyringe';

@autoInjectable()
export class AuthController {
    private authService: AuthService;

    constructor(
        @inject(AuthService) authService?: AuthService,
        private validator: AuthValidator = new AuthValidator()
    ) {
        this.authService = authService || new AuthService();
    }

    register = async (request: Request, response: Response): Promise<void> => {
        try {
            // Validate input - will throw if invalid
            const model = await this.validator.validateRegisterRequest(request);

            // Business logic
            const result = await this.authService.register(
                model.username,
                model.email,
                model.password
            );

            // Success response
            ResponseHandler.success(
                response,
                result,
                201, // Created
                'User registered successfully'
            );

        } catch (error) {
            if (error instanceof Error && error.message === 'User already exists') {
                ResponseHandler.error(response, error.message, 409); // Conflict
                return;
            }
            // Pass known AppErrors or wrap internal errors
            if (error instanceof AppError) {
                ResponseHandler.error(response, error.message, error.statusCode);
            } else {
                ResponseHandler.error(response, (error as Error).message || 'Registration failed', 500);
            }
        }
    };

    login = async (request: Request, response: Response): Promise<void> => {
        try {
            const model = await this.validator.validateLoginRequest(request);

            const result = await this.authService.login(
                model.usernameOrEmail,
                model.password
            );

            ResponseHandler.success(
                response,
                result,
                200,
                'Login successful'
            );

        } catch (error) {
            if (error instanceof Error && error.message === 'Invalid credentials') {
                ResponseHandler.error(response, error.message, 401); // Unauthorized
                return;
            }

            if (error instanceof AppError) {
                ResponseHandler.error(response, error.message, error.statusCode);
            } else {
                ResponseHandler.error(response, (error as Error).message || 'Login failed', 500);
            }
        }
    };

    getCurrentUser = async (request: Request, response: Response): Promise<void> => {
        try {
            const userId = (request as any).userId;

            if (!userId) {
                ResponseHandler.error(response, 'User not authenticated', 401);
                return;
            }

            const user = await this.authService.getUserById(userId);

            ResponseHandler.success(
                response,
                user,
                200,
                'User retrieved successfully'
            );

        } catch (error) {
            if (error instanceof AppError) {
                ResponseHandler.error(response, error.message, error.statusCode);
            } else {
                ResponseHandler.error(response, (error as Error).message || 'Failed to retrieve user', 500);
            }
        }
    };
}


