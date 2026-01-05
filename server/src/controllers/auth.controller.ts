/**
 * Authentication Controller
 * Handles authentication-related requests
 */

import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService.js';
import { AuthRequest } from '../middleware/auth.middleware.js';

const authService = new AuthService();

/**
 * Register a new user
 */
export async function register(req: Request, res: Response): Promise<void> {
    try {
        console.log(' [Auth] Registration attempt:', req.body);
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            console.log(' [Auth] Missing required fields');
            res.status(400).json({ error: 'All fields are required' });
            return;
        }

        const result = await authService.register(username, email, password);
        console.log(` [Auth] User registered successfully: ${username}`);
        res.json(result);
    } catch (error) {
        console.error(' [Auth] Registration failed:', error);
        res.status(400).json({
            error: error instanceof Error ? error.message : 'Registration failed'
        });
    }
}

/**
 * Login user
 */
export async function login(req: Request, res: Response): Promise<void> {
    try {
        console.log(' [Auth] Login attempt:', { usernameOrEmail: req.body.usernameOrEmail });
        const { usernameOrEmail, password } = req.body;

        if (!usernameOrEmail || !password) {
            console.log(' [Auth] Missing login credentials');
            res.status(400).json({ error: 'Username/email and password are required' });
            return;
        }

        const result = await authService.login(usernameOrEmail, password);
        console.log(`✅ [Auth] User logged in successfully: ${result.user.username}`);
        res.json(result);
    } catch (error) {
        console.error(' [Auth] Login failed:', error);
        res.status(400).json({
            error: error instanceof Error ? error.message : 'Login failed'
        });
    }
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(req: AuthRequest, res: Response): Promise<void> {
    try {
        console.log(' [Auth] === GET CURRENT USER START ===');
        console.log(' [Auth] Headers received:', req.headers.authorization ? 'Authorization header present' : 'No authorization header');

        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            console.log(' [Auth] No token provided in request');
            res.status(401).json({ error: 'No token provided' });
            return;
        }

        console.log(' [Auth] Token found, length:', token.length);
        console.log(' [Auth] Token preview:', token.substring(0, 20) + '...');

        console.log(' [Auth] Verifying token with AuthService...');
        const decoded = authService.verifyToken(token);
        console.log(' [Auth] Token decoded successfully, userId:', decoded.userId);

        // Get user from database using the decoded userId
        console.log(' [Auth] Fetching user from database...');
        const user = await authService.getUserById(decoded.userId);

        if (!user) {
            console.log(' [Auth] User not found in database for ID:', decoded.userId);
            res.status(404).json({ error: 'User not found' });
            return;
        }

        console.log(` [Auth] Current user retrieved: ${user.username} (${user.email})`);

        res.json(user);
        console.log(' [Auth] === GET CURRENT USER SUCCESS ===');
    } catch (error) {
        console.error(' [Auth] Get current user failed:', error);
        console.error(' [Auth] Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : 'No stack trace'
        });
        res.status(401).json({ error: 'Invalid token' });
        console.log(' [Auth] === GET CURRENT USER FAILED ===');
    }
}
