/**
 * API Route: Get File Tree
 * Proxies requests to backend server
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { FileService } from '$lib/server/services/file';

export const GET: RequestHandler = async ({ request }) => {
    try {
        const token = request.headers.get('authorization');

        if (!token) {
            return json({ error: 'No authorization token' }, { status: 401 });
        }

        const data = await FileService.getFileTree(token);
        return json(data);

    } catch (error) {
        console.error('[API] File tree error:', error);
        return json(
            { error: error instanceof Error ? error.message : 'Failed to fetch file tree' },
            { status: 500 }
        );
    }
};
