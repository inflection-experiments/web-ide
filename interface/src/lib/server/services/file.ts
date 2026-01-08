import { env } from '$env/dynamic/private';

const BACKEND_URL = env.BACKEND_URL || 'http://localhost:9000';

export const FileService = {
    async getFileTree(token: string) {
        const response = await fetch(`${BACKEND_URL}/files`, {
            headers: {
                'Authorization': token
            }
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        return response.json();
    },

    async getFileContent(token: string, path: string) {
        const params = new URLSearchParams({ path });
        const response = await fetch(`${BACKEND_URL}/files/content?${params.toString()}`, {
            headers: {
                'Authorization': token
            }
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        return response.json();
    }
};
