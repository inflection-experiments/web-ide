// src/lib/types/types.ts

// Auth types
export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  minioBucket: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

//config types
export interface ErrorResponse {
  error?: string;
}




// File management types

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
