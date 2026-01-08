import { env } from '$env/dynamic/private';

const BACKEND_URL = env.BACKEND_URL || 'http://127.0.0.1:9000';

export const FileService = {
    async getFileTree(token: string) {
        console.log(`[FileService] Fetching file tree from: ${BACKEND_URL}/files`);
        try {
            const response = await fetch(`${BACKEND_URL}/files`, {
                headers: {
                    'Authorization': token
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[FileService] Backend error: ${response.status} - ${errorText}`);
                throw new Error(errorText || `Backend responded with ${response.status}`);
            }

            return response.json();
        } catch (error) {
            console.error('[FileService] Network or parsing error:', error);
            throw error;
        }
    },

    async getFileContent(token: string, path: string) {
        try {
            const params = new URLSearchParams({ path });
            const url = `${BACKEND_URL}/files/content?${params.toString()}`;
            console.log(`[FileService] Fetching content from: ${url}`);

            const response = await fetch(url, {
                headers: {
                    'Authorization': token
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[FileService] Backend content error: ${response.status} - ${errorText}`);
                throw new Error(errorText || `Backend responded with ${response.status}`);
            }

            return response.json();
        } catch (error) {
            console.error('[FileService] Content fetch error:', error);
            throw error;
        }
    }
};
