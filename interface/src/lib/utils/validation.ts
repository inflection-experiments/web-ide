export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}

export class FormValidator {
    static validateUsername(username: string): ValidationResult {
        const errors: string[] = [];

        if (!username.trim()) {
            errors.push('Username is required');
        } else if (username.trim().length < 3) {
            errors.push('Username must be at least 3 characters long');
        } else if (username.trim().length > 32) {
            errors.push('Username must be less than 32 characters');
        } else if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
            errors.push('Username can only contain letters, numbers, and underscores');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    static validateEmail(email: string): ValidationResult {
        const errors: string[] = [];
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email.trim()) {
            errors.push('Email is required');
        } else if (!emailRegex.test(email.trim())) {
            errors.push('Please enter a valid email address');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    static validatePassword(password: string): ValidationResult {
        const errors: string[] = [];

        if (!password) {
            errors.push('Password is required');
        } else if (password.length < 8) {
            errors.push('Password must be at least 8 characters long');
        } else if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        } else if (!/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        } else if (!/[0-9]/.test(password)) {
            errors.push('Password must contain at least one number');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    static validatePasswordMatch(password: string, confirmPassword: string): ValidationResult {
        const errors: string[] = [];

        if (password !== confirmPassword) {
            errors.push('Passwords do not match');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
