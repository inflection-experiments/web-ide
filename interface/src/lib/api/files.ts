import { httpClient, API_ENDPOINTS } from './config';
import socket from '$lib/socket'; // Your existing socket import

import type {
  FileTreeResponse,
  FileContentResponse,
  CreateFileResponse,
  DeleteResponse,
  RenameResponse,
} from '../types/types';

export class FilesAPI {
  static async getFileTree(userId?: string): Promise<FileTreeResponse> {
    const socketId = socket.id || userId;
    if (!socketId) {
      console.warn(' FilesAPI: No socket connection - files may not persist');
    }
    const params = socketId ? `?userId=${encodeURIComponent(socketId)}` : '';
    return httpClient.request<FileTreeResponse>(`${API_ENDPOINTS.FILES.LIST}${params}`);
  }

  static async getFileContent(path: string, userId: string): Promise<FileContentResponse> {
    const socketId = socket.id || userId;
    if (!socketId) {
      console.warn(' FilesAPI: No socket connection - files may not persist');
    }
    const params = new URLSearchParams({
      path: path,
      userId: socketId || userId,
    });
    return httpClient.request<FileContentResponse>(`${API_ENDPOINTS.FILES.CONTENT}?${params.toString()}`);
  }

  static saveFile(path: string, content: string): void {
    console.log(' FilesAPI: Saving file with authenticated user for persistence:', path);
    if (!socket.connected) {
      console.error('FilesAPI: Socket not connected - file may not persist across logins');
      return;
    }
    socket.emit('file:change', { path, content });
  }

  static async createFileOrDirectory(
    type: 'file' | 'directory',
    path: string,
    content: string = '',
    parentPath: string = ''
  ): Promise<CreateFileResponse> {
    console.log(' FilesAPI: Creating', type, 'with authenticated user:', path);
    const socketId = socket.id;
    if (!socketId) {
      console.error(' FilesAPI: Socket not connected - creation may fail');
      throw new Error('Socket not connected - please refresh the page');
    }
    return httpClient.request<CreateFileResponse>(`${API_ENDPOINTS.FILES.CREATE}`, {
      method: 'POST',
      body: JSON.stringify({
        userId: socketId,
        type,
        path,
        content,
        parentPath,
      }),
    });
  }

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
      type: type,
    });
    return httpClient.request<DeleteResponse>(`${API_ENDPOINTS.FILES.DELETE}?${params.toString()}`, {
      method: 'DELETE',
    });
  }

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
        newPath: newPath,
      }),
    });
  }

  static cleanFilePath(path: string): string {
    if (!path) return '';
    let cleanPath = String(path);
    cleanPath = cleanPath.split('').filter(char => {
      const code = char.charCodeAt(0);
      return !(code <= 31 || (code >= 127 && code <= 159));
    }).join('');
    cleanPath = cleanPath.replace(/^['"\s]+|['"\s]+$/g, '');
    cleanPath = cleanPath.replace(/^workspace[/\\]/, '');
    cleanPath = cleanPath.replace(/^\.[\\/]+/g, '');
    cleanPath = cleanPath.replace(/^[\\/]+/, '');
    return cleanPath;
  }
}
