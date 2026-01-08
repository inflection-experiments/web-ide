/**
 * API Route: Get File Content
 * Proxies requests to backend server
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { FileService } from '$lib/server/services/file';

export const GET: RequestHandler = async ({ request, url }) => {
    try {
        const token = request.headers.get('authorization');
        const path = url.searchParams.get('path');

        if (!token) {
            return json({ error: 'No authorization token' }, { status: 401 });
        }

        if (!path) {
            return json({ error: 'No file path provided' }, { status: 400 });
        }

        const data = await FileService.getFileContent(token, path);
        return json(data);

    } catch (error) {
        console.error('[API] File content error:', error);
        return json(
            { error: error instanceof Error ? error.message : 'Failed to fetch file content' },
            { status: 500 }
        );
    }
};
