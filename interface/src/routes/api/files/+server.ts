/**
 * API Route: Get File Tree
 * Proxies requests to backend server
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const BACKEND_URL = 'http://localhost:9000';

export const GET: RequestHandler = async ({ request }) => {
    try {
        const token = request.headers.get('authorization');

        if (!token) {
            return json({ error: 'No authorization token' }, { status: 401 });
        }

        // Forward request to backend
        const response = await fetch(`${BACKEND_URL}/files`, {
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
        console.error('[API] File tree error:', error);
        return json(
            { error: 'Failed to fetch file tree' },
            { status: 500 }
        );
    }
};
