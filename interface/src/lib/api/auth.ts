import { httpClient, API_ENDPOINTS } from './config';

export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  minioBucket: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export class AuthAPI {
  /**
   * Login user with credentials
   */
  static async login(credentials: LoginRequest): Promise<AuthResponse> {
    console.log('AuthAPI: Sending login request');
    return httpClient.request<AuthResponse>(API_ENDPOINTS.AUTH.LOGIN, {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  /**
   * Register new user account
   */
  static async register(userData: RegisterRequest): Promise<AuthResponse> {
    console.log('AuthAPI: Sending registration request');
    return httpClient.request<AuthResponse>(API_ENDPOINTS.AUTH.REGISTER, {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  /**
   * Get current user profile
   */
  static async getCurrentUser(token: string): Promise<User> {
    console.log('AuthAPI: Getting current user');
    return httpClient.request<User>(API_ENDPOINTS.AUTH.ME, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  /**
   * Validate token format
   */
  static isValidToken(token: string | null): boolean {
    const isValid = Boolean(token && token.length > 0 && typeof token === 'string');
    console.log('Token validation:', isValid);
    return isValid;
  }
}
