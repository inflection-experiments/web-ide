import { httpClient, API_ENDPOINTS } from './config';
import socket from '$lib/socket'; // Import your existing socket

// ✅ Define specific response interfaces instead of using 'any'
export interface FileTreeItem {
  [key: string]: string | FileTreeItem;
}

export interface FileTreeResponse {
  tree: FileTreeItem;
}

export interface DirectoryResponse {
  items: string[];
}

export interface FileContentResponse {
  content: string;
}

export interface CreateFileResponse {
  success: boolean;
  path: string;
  type: string;
  error?: string;
}

export interface DeleteResponse {
  success: boolean;
  error?: string;
}

export interface RenameResponse {
  success: boolean;
  error?: string;
}

export class FilesAPI {
  /**
   * ✅ FIXED: Load file tree using standardized API with authentication
   */
  static async getFileTree(): Promise<FileTreeResponse> {
    const token = localStorage.getItem('auth_token');
    return httpClient.request<FileTreeResponse>(API_ENDPOINTS.FILES.LIST, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  /**
   * ✅ FIXED: Load file content using authenticated request
   */
  static async getFileContent(path: string): Promise<FileContentResponse> {
    const token = localStorage.getItem('auth_token');
    const params = new URLSearchParams({ path });

    return httpClient.request<FileContentResponse>(`${API_ENDPOINTS.FILES.CONTENT}?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  /**
   * ✅ ADDED: Load directory items using authenticated request
   */
  static async getDirectory(path: string): Promise<DirectoryResponse> {
    const token = localStorage.getItem('auth_token');
    const params = new URLSearchParams({ path });

    return httpClient.request<DirectoryResponse>(`${API_ENDPOINTS.FILES.DIRECTORY}?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  /**
   * ✅ FIXED: Save file using socket with real user authentication for persistence
   */
  static saveFile(path: string, content: string): void {
    console.log('💾 FilesAPI: Saving file with authenticated user for persistence:', path);

    if (!socket.connected) {
      console.error('❌ FilesAPI: Socket not connected - file may not persist across logins');
      return;
    }

    // ✅ USE AUTHENTICATED SOCKET FOR FILE PERSISTENCE
    socket.emit('file:change', { path, content });
  }

  /**
   * ✅ FIXED: Create file/directory using authenticated request
   */
  static async createFileOrDirectory(
    type: 'file' | 'directory',
    path: string,
    content: string = '',
    parentPath: string = ''
  ): Promise<CreateFileResponse> {
    const token = localStorage.getItem('auth_token');

    return httpClient.request<CreateFileResponse>(`${API_ENDPOINTS.FILES.CREATE}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        type,
        path,
        content,
        parentPath
      }),
    });
  }

  /**
   * ✅ ADDED: Delete file/directory with proper typing and auth
   */
  static async deleteFileOrDirectory(
    path: string,
    type: 'file' | 'directory'
  ): Promise<DeleteResponse> {
    const token = localStorage.getItem('auth_token');
    const params = new URLSearchParams({ path, type });

    return httpClient.request<DeleteResponse>(`${API_ENDPOINTS.FILES.DELETE}?${params.toString()}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  /**
   * ✅ ADDED: Rename file/directory with proper typing and auth
   */
  static async renameFileOrDirectory(
    oldPath: string,
    newPath: string
  ): Promise<RenameResponse> {
    const token = localStorage.getItem('auth_token');

    return httpClient.request<RenameResponse>(`${API_ENDPOINTS.FILES.RENAME}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        oldPath,
        newPath
      }),
    });
  }

  /**
   * Clean file path - removes control characters and normalizes path
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
