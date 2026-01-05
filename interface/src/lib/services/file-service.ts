// src/lib/services/file-service.ts

import { PUBLIC_API_BASE_URL } from '$env/static/public';

const BASE_URL = PUBLIC_API_BASE_URL;

// ============================================
// EXISTING FUNCTIONS (Kept as is)
// ============================================

export async function fetchFileTreeRaw() {
    console.log('[SERVICE] fetchFileTreeRaw called');

    const token = localStorage.getItem('auth_token');
    if (!token) {
        console.error('[SERVICE ERROR] No auth token for file tree request');
        return null;
    }

    console.log('[SERVICE] Making file tree request to API route');
    const response = await fetch('/api/files', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        console.error('[SERVICE ERROR] File tree request failed:', response.status);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[SERVICE SUCCESS] File tree data received');
    return data;
}

export async function fetchFileContentRaw(cleanPath: string) {
    console.log('[SERVICE] fetchFileContentRaw called for path:', cleanPath);

    const token = localStorage.getItem('auth_token');
    if (!token) {
        console.error('[SERVICE ERROR] No auth token for file content request');
        return null;
    }

    const params = new URLSearchParams({ path: cleanPath });

    console.log('[SERVICE] Making file content request to API route');
    const response = await fetch(`/api/files/content?${params.toString()}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        console.error('[SERVICE ERROR] File content request failed:', response.status);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[SERVICE SUCCESS] File content data received for:', cleanPath);
    return data;
}

export async function fetchUserPortsRaw() {
    console.log('[SERVICE] fetchUserPortsRaw called');

    const token = localStorage.getItem('auth_token');
    if (!token) {
        console.log('[SERVICE] No auth_token found in localStorage');
        return null;
    }

    console.log('[SERVICE] Making user ports request with token');
    const response = await fetch(`${BASE_URL}/api/user/ports`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('[SERVICE] Fetch ports response status:', response.status);

    if (!response.ok) {
        console.error('[SERVICE ERROR] Failed to fetch ports:', response.status);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[SERVICE SUCCESS] User ports data received');
    return data;
}

// ============================================
// NEW FUNCTIONS (For FileTree component)
// ============================================

export async function loadDirectoryContents(userId: string, path: string) {
    console.log('[SERVICE] loadDirectoryContents called for path:', path);

    const url = `${BASE_URL}/files/directory?userId=${encodeURIComponent(userId)}&path=${encodeURIComponent(path)}`;

    console.log('[SERVICE] Making directory contents request');
    const response = await fetch(url);

    if (!response.ok) {
        console.error('[SERVICE ERROR] Directory contents request failed:', response.status);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[SERVICE SUCCESS] Directory contents received for:', path);
    return data;
}

export async function createFileOrFolder(
    userId: string,
    path: string,
    type: 'file' | 'directory',
    parentPath: string,
    content?: string
) {
    console.log('[SERVICE] createFileOrFolder called:', { type, path, parentPath });

    const response = await fetch(`${BASE_URL}/files/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId,
            path,
            type,
            content: type === 'file' ? (content ?? '') : undefined,
            parentPath
        })
    });

    if (!response.ok) {
        const result = await response.json();
        console.error('[SERVICE ERROR] Create failed:', result.error);
        throw new Error(result.error || 'Failed to create item');
    }

    const data = await response.json();
    console.log('[SERVICE SUCCESS] Item created:', type, path);
    return data;
}

export async function renameFileOrFolder(userId: string, oldPath: string, newPath: string) {
    console.log('[SERVICE] renameFileOrFolder called:', { oldPath, newPath });

    const response = await fetch(`${BASE_URL}/files/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, oldPath, newPath })
    });

    if (!response.ok) {
        const result = await response.json();
        console.error('[SERVICE ERROR] Rename failed:', result.error);
        throw new Error(result.error || 'Failed to rename item');
    }

    const data = await response.json();
    console.log('[SERVICE SUCCESS] Item renamed from', oldPath, 'to', newPath);
    return data;
}

export async function deleteFileOrFolder(userId: string, path: string) {
    console.log('[SERVICE] deleteFileOrFolder called for path:', path);

    const url = `${BASE_URL}/files/delete?userId=${userId}&path=${encodeURIComponent(path)}`;

    const response = await fetch(url, { method: 'DELETE' });

    if (!response.ok) {
        const result = await response.json();
        console.error('[SERVICE ERROR] Delete failed:', result.error);
        throw new Error(result.error || 'Failed to delete item');
    }

    const data = await response.json();
    console.log('[SERVICE SUCCESS] Item deleted:', path);
    return data;
}
