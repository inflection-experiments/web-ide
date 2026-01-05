/**
 * Tree Builder Utility
 * Converts flat file list to tree structure
 */

/**
 * Convert flat file list to tree structure
 * @param items - Array of file paths with type (format: "path|type")
 * @returns Tree structure as nested object
 */
export function toTree(items: string[]): Record<string, any> {
    const tree: Record<string, any> = {};
    const uniqueItems: string[] = Array.from(new Set(items));

    console.log(` [DEBUG] Building tree from items:`, uniqueItems);

    for (const item of uniqueItems) {
        if (!item) continue;

        const parts = item.split('|');
        const name = parts[0];
        const type = parts[1];

        // Type guard - ensure both parts exist
        if (!name || !type) {
            console.warn(` [DEBUG] Invalid item format: ${item}`);
            continue;
        }

        console.log(` [DEBUG] Adding to tree: ${name} (${type})`);
        tree[name] = type === 'd' ? {} : null;
    }

    console.log(` [DEBUG] Final tree:`, tree);
    return tree;
}
