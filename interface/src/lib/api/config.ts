// src/lib/config.ts
import { env } from '$env/dynamic/public';

// API Configuration using environment variables
export const API_BASE_URL = env.PUBLIC_API_BASE_URL;

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    ME: '/api/auth/me',
  },
  PROJECTS: {
    LIST: '/api/projects',
    CREATE: '/api/projects',
  },
  FILES: {
    LIST: '/files',
    CONTENT: '/files/content',
    CREATE: '/files/create',
    DELETE: '/files/delete',
    RENAME: '/files/rename',
  }
} as const;

// Define a type for error responses
interface ErrorResponse {
  error?: string;
}

// HTTP Client configuration with CORS headers
export const httpClient = {
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const config: RequestInit = {
      mode: 'cors',
      credentials: 'omit',
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers as Record<string, string>),
      },
    };

    try {
      console.log(`API Request: ${config.method || 'GET'} ${url}`);
      const response = await fetch(url, config);
      
      if (!response.ok) {
        let errorData: ErrorResponse = {};
        try {
          errorData = await response.json();
        } catch {
          // If JSON parsing fails, use empty object
        }
        const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        console.error(`API Error: ${errorMessage}`);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log(`API Success: ${config.method || 'GET'} ${url}`);
      return data;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }
};
