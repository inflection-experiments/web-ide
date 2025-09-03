import { httpClient, API_ENDPOINTS } from './config';
import socket from '$lib/socket'; // Import your existing socket

// ✅ Define specific response interfaces instead of using 'any'
export interface FileTreeItem {
  [key: string]: string | FileTreeItem;
}

export interface FileTreeResponse {
  tree: FileTreeItem;
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
   * ✅ FIXED: Load file tree using socket with real user authentication
   */
  static async getFileTree(userId?: string): Promise<FileTreeResponse> {
    // ✅ USE SOCKET ID FOR AUTHENTICATED USER IDENTIFICATION
    const socketId = socket.id || userId;
    
    if (!socketId) {
      console.warn('⚠️ FilesAPI: No socket connection - files may not persist');
    }
    
    const params = socketId ? `?userId=${encodeURIComponent(socketId)}` : '';
    return httpClient.request<FileTreeResponse>(`${API_ENDPOINTS.FILES.LIST}${params}`);
  }

  /**
   * ✅ FIXED: Load file content using authenticated socket
   */
  static async getFileContent(path: string, userId: string): Promise<FileContentResponse> {
    // ✅ USE SOCKET ID FOR AUTHENTICATED USER IDENTIFICATION
    const socketId = socket.id || userId;
    
    if (!socketId) {
      console.warn('⚠️ FilesAPI: No socket connection - files may not persist');
    }
    
    const params = new URLSearchParams({
      path: path,
      userId: socketId || userId
    });
    return httpClient.request<FileContentResponse>(`${API_ENDPOINTS.FILES.CONTENT}?${params.toString()}`);
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
   * ✅ FIXED: Create file/directory using authenticated socket - NO MORE 'any' TYPE
   */
  static async createFileOrDirectory(
    type: 'file' | 'directory',
    path: string,
    content: string = '',
    parentPath: string = ''
  ): Promise<CreateFileResponse> {
    console.log('📁 FilesAPI: Creating', type, 'with authenticated user:', path);

    // ✅ USE SOCKET ID FOR AUTHENTICATED USER IDENTIFICATION
    const socketId = socket.id;
    
    if (!socketId) {
      console.error('❌ FilesAPI: Socket not connected - creation may fail');
      throw new Error('Socket not connected - please refresh the page');
    }

    return httpClient.request<CreateFileResponse>(`${API_ENDPOINTS.FILES.CREATE}`, {
      method: 'POST',
      body: JSON.stringify({
        userId: socketId,
        type,
        path,
        content,
        parentPath
      }),
    });
  }

  /**
   * ✅ ADDED: Delete file/directory with proper typing
   */
  static async deleteFileOrDirectory(
    path: string,
    type: 'file' | 'directory'
  ): Promise<DeleteResponse> {
    const socketId = socket.id;
    
    if (!socketId) {
      throw new Error('Socket not connected - please refresh the page');
    }

    const params = new URLSearchParams({
      userId: socketId,
      path: path,
      type: type
    });

    return httpClient.request<DeleteResponse>(`${API_ENDPOINTS.FILES.DELETE}?${params.toString()}`, {
      method: 'DELETE'
    });
  }

  /**
   * ✅ ADDED: Rename file/directory with proper typing
   */
  static async renameFileOrDirectory(
    oldPath: string,
    newPath: string
  ): Promise<RenameResponse> {
    const socketId = socket.id;
    
    if (!socketId) {
      throw new Error('Socket not connected - please refresh the page');
    }

    return httpClient.request<RenameResponse>(`${API_ENDPOINTS.FILES.RENAME}`, {
      method: 'POST',
      body: JSON.stringify({
        userId: socketId,
        oldPath: oldPath,
        newPath: newPath
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
