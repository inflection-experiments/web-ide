/**
 * File Helper Utilities
 * Extracted from main server file for better organization
 */

/**
 * Ultra-clean file content by removing invalid characters and normalizing
 * @param content - Raw file content
 * @param filePath - File path for context (used for JSON validation)
 * @returns Cleaned content
 */
export function ultraCleanContent(content: string, filePath: string = ''): string {
    console.log(` [DEBUG] Ultra-cleaning content for: ${filePath}`);
    console.log(` [DEBUG] Original length: ${content.length}`);

    if (!content) return '';

    let cleaned = content;

    // Keep ONLY safe ASCII characters + \n + \t
    cleaned = cleaned.replace(/[^\x20-\x7E\x09\x0A\x0D]/g, '');

    // Remove control characters but keep newlines and tabs
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\xFF]/g, '');

    // Normalize line endings
    cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Special handling for JSON files
    if (filePath.includes('.json') || filePath.includes('package')) {
        try {
            console.log(` [DEBUG] JSON file detected, validating...`);
            const parsed = JSON.parse(cleaned);
            cleaned = JSON.stringify(parsed, null, 2);
            console.log(` [DEBUG] JSON validated and reformatted`);
        } catch (jsonError) {
            console.log(` [DEBUG] JSON invalid, creating safe default`);
            if (filePath.includes('package.json')) {
                cleaned = JSON.stringify({
                    "name": "test",
                    "version": "1.0.0",
                    "main": "index.js",
                    "type": "module",
                    "scripts": {
                        "test": "echo \"Error: no test specified\" && exit 1"
                    },
                    "keywords": [],
                    "author": "",
                    "license": "ISC",
                    "description": ""
                }, null, 2);
            } else {
                cleaned = '{}';
            }
        }
    }

    console.log(` [DEBUG] Cleaning complete: ${content.length} -> ${cleaned.length}`);
    return cleaned;
}

/**
 * Fix incomplete file extensions
 * @param filePath - File path to check and fix
 * @returns Fixed file path
 */
export function fixIncompleteExtension(filePath: string): string {
    console.log(` [DEBUG] Checking extension for: "${filePath}"`);

    const extensionMap: { [key: string]: string } = {
        '.j': '.js',
        '.t': '.ts',
        '.p': '.py',
        '.c': '.cpp',
        '.h': '.hpp',
        '.ja': '.java',
        '.ph': '.php',
        '.r': '.rb',
        '.g': '.go',
        '.ru': '.rust',
        '.sw': '.swift',
        '.k': '.kt',
        '.s': '.sh',
        '.ht': '.html',
        '.cs': '.css',
        '.jso': '.json',
        '.x': '.xml',
        '.m': '.md',
        '.y': '.yml',
        '.do': '.dockerfile'
    };

    for (const [incomplete, complete] of Object.entries(extensionMap)) {
        if (filePath.endsWith(incomplete) && !filePath.endsWith(complete)) {
            const fixedPath = filePath.replace(incomplete, complete);
            console.log(` [DEBUG] EXTENSION FIXED: "${filePath}" -> "${fixedPath}"`);
            return fixedPath;
        }
    }

    console.log(` [DEBUG] NO EXTENSION FIX NEEDED: "${filePath}"`);
    return filePath;
}
