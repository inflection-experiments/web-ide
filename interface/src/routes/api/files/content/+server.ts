/**
 * API Route: Get File Content
 * Proxies requests to backend server
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const BACKEND_URL = 'http://localhost:9000';

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

        // Forward request to backend
        const params = new URLSearchParams({ path });
        const response = await fetch(`${BACKEND_URL}/files/content?${params.toString()}`, {
            headers: {
                'Authorization': token
            }
        });

        if (!response.ok) {
            const error = await response.text();
            return json({ error }, { status: response.status });
        }

        const data = await response.json();
        return json(data);

    } catch (error) {
        console.error('[API] File content error:', error);
        return json(
            { error: 'Failed to fetch file content' },
            { status: 500 }
        );
    }
};
