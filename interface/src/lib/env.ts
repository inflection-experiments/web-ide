import { PUBLIC_API_BASE_URL, PUBLIC_SOCKET_URL } from '$env/static/public';

export const API_CONFIG = {
    BASE_URL: PUBLIC_API_BASE_URL || 'http://localhost:9000',
    SOCKET_URL: PUBLIC_SOCKET_URL || 'http://localhost:9000',
} as const;

// Type-safe environment access
export function getApiUrl(endpoint: string): string {
    // Ensure we don't double slashes if endpoint starts with /
    const base = API_CONFIG.BASE_URL.replace(/\/$/, '');
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${base}${path}`;
}
