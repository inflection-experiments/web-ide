import { httpClient, API_ENDPOINTS } from './config';

// Define proper types for file tree structure
export interface FileTreeItem {
  [key: string]: string | FileTreeItem;
}

export interface FileTreeResponse {
  tree: FileTreeItem;
}

export interface FileContentResponse {
  content: string;
}

export class FilesAPI {
  /**
   * Load file tree for user
   */
  static async getFileTree(userId?: string): Promise<FileTreeResponse> {
    const params = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return httpClient.request<FileTreeResponse>(`${API_ENDPOINTS.FILES.LIST}${params}`);
  }

  /**
   * Load file content
   */
  static async getFileContent(path: string, userId: string): Promise<FileContentResponse> {
    const params = new URLSearchParams({
      path: path,
      userId: userId
    });
    return httpClient.request<FileContentResponse>(`${API_ENDPOINTS.FILES.CONTENT}?${params.toString()}`);
  }

  /**
   * Clean file path - removes control characters and normalizes path
   * Using character code filtering to avoid ESLint no-control-regex rule
   */
  static cleanFilePath(path: string): string {
    if (!path) return '';
    let cleanPath = String(path);
    
    // Remove control characters using character code filtering (ESLint-safe approach)
    cleanPath = cleanPath.split('').filter(char => {
      const code = char.charCodeAt(0);
      // Remove characters 0-31 and 127-159 (control characters)
      return !(code <= 31 || (code >= 127 && code <= 159));
    }).join('');
    
    // Remove leading/trailing quotes and whitespace
    cleanPath = cleanPath.replace(/^['"\s]+|['"\s]+$/g, '');
    
    // Remove workspace prefix
    cleanPath = cleanPath.replace(/^workspace[/\\]/, '');
    
    // Remove leading ./ or .\
    cleanPath = cleanPath.replace(/^\.[\\/]+/g, '');
    
    // Remove leading slashes or backslashes
    cleanPath = cleanPath.replace(/^[\\/]+/, '');
    
    return cleanPath;
  }
}
