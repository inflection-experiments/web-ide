# Backend Restructuring Guide - Complete Architecture
**Web IDE Server - Professional Node.js/Express/TypeORM Architecture**

---

## Table of Contents
1. [Project Structure](#project-structure)
2. [Layer-by-Layer Implementation](#layer-by-layer-implementation)
3. [Type System & Interfaces](#type-system--interfaces)
4. [Response Handling](#response-handling)
5. [Frontend Integration](#frontend-integration)
6. [Migration Plan](#migration-plan)

---

# Project Structure

## Target Directory Structure

```
server/
├── src/
│   ├── api/                          # API Layer (Route + Controller + Validator)
│   │   ├── auth/
│   │   │   ├── auth.routes.ts        # Route definitions
│   │   │   ├── auth.controller.ts    # Request/Response handling
│   │   │   ├── auth.validator.ts     # Input validation (Joi)
│   │   │   └── auth.auth.ts          # Authorization options
│   │   ├── files/
│   │   │   ├── file.routes.ts
│   │   │   ├── file.controller.ts
│   │   │   └── file.validator.ts
│   │   ├── projects/
│   │   │   ├── project.routes.ts
│   │   │   ├── project.controller.ts
│   │   │   └── project.validator.ts
│   │   ├── ports/
│   │   │   ├── port.routes.ts
│   │   │   └── port.controller.ts
│   │   └── base.validator.ts         # Base validation utilities
│   │
│   ├── auth/                         # Authentication Framework
│   │   ├── auth.handler.ts           # Auth middleware builder
│   │   ├── auth.types.ts             # Auth interfaces
│   │   ├── authenticator.ts          # JWT verification
│   │   └── authorizer.ts             # Permission checking
│   │
│   ├── common/                       # Shared/Cross-cutting
│   │   ├── error-handling/
│   │   │   ├── app.error.ts          # Custom error class
│   │   │   ├── error.handler.ts      # Error utility methods
│   │   │   └── http.status.codes.ts  # HTTP status constants
│   │   ├── handlers/
│   │   │   └── response.handler.ts   # Standardized responses
│   │   └── utilities/
│   │       ├── file-helpers.ts       # File utilities
│   │       └── tree-builder.ts       # Tree utilities
│   │
│   ├── config/                       # Configuration Management
│   │   ├── configuration.manager.ts  # Config singleton
│   │   └── configuration.types.ts    # Config interfaces
│   │
│   ├── database/                     # Database Layer
│   │   ├── typeorm/
│   │   │   ├── models/               # Entity definitions
│   │   │   │   ├── user.entity.ts
│   │   │   │   ├── project.entity.ts
│   │   │   │   └── project-file.entity.ts
│   │   │   ├── mappers/              # Entity → DTO mappers
│   │   │   │   ├── user.mapper.ts
│   │   │   │   ├── project.mapper.ts
│   │   │   │   └── project-file.mapper.ts
│   │   │   └── services/             # Data access services
│   │   │       ├── base.service.ts
│   │   │       ├── user.service.ts
│   │   │       ├── project.service.ts
│   │   │       └── project-file.service.ts
│   │   ├── data-source.ts            # TypeORM DataSource
│   │   └── database.config.ts        # DB configuration
│   │
│   ├── domain-types/                 # Domain Models & DTOs
│   │   ├── auth/
│   │   │   ├── auth.dto.ts           # Auth DTOs
│   │   │   └── auth.types.ts         # Auth domain types
│   │   ├── file/
│   │   │   ├── file.dto.ts
│   │   │   └── file.types.ts
│   │   ├── project/
│   │   │   ├── project.dto.ts
│   │   │   └── project.types.ts
│   │   └── common/
│   │       ├── base.search.types.ts  # Pagination/Search
│   │       ├── current.user.ts       # Current user context
│   │       └── response.dto.ts       # API response types
│   │
│   ├── logger/                       # Logging
│   │   └── logger.ts                 # Logger factory
│   │
│   ├── middleware/                   # Express Middleware
│   │   ├── auth.middleware.ts        # JWT authentication
│   │   ├── error.middleware.ts       # Global error handler
│   │   └── common.middlewares.ts     # CORS, body parser, etc.
│   │
│   ├── services/                     # Business Logic Services
│   │   ├── auth.service.ts           # Authentication logic
│   │   ├── container.service.ts      # Docker container management
│   │   ├── cloud-storage.service.ts  # MinIO/S3 operations
│   │   └── port.service.ts           # Port management
│   │
│   ├── socket/                       # Socket.IO
│   │   ├── socket.handler.ts         # Socket event handlers
│   │   └── socket.types.ts           # Socket event types
│   │
│   ├── startup/                      # Application Startup
│   │   ├── injector.ts               # Dependency injection setup
│   │   └── route.handler.ts          # Route registration
│   │
│   └── docker/                       # Docker Management
│       ├── docker.manager.ts         # Docker operations
│       └── docker.types.ts           # Docker interfaces
│
├── index.ts                          # Entry point
├── app.ts                            # Application class
├── service.config.json               # Default configuration
├── .env                              # Environment variables
├── tsconfig.json                     # TypeScript config
└── package.json                      # Dependencies
```

---

# Layer-by-Layer Implementation

## Layer 1: Type System & Interfaces

### 1.1 Domain Types - Common

```typescript
// File: server/src/domain-types/common/base.search.types.ts

export interface BaseSearchFilters {
  CreatedDateFrom?: Date;
  CreatedDateTo?: Date;
  OrderBy?: string;           // Default: 'CreatedAt'
  Order?: 'ascending' | 'descending';
  PageIndex?: number;         // Default: 0
  ItemsPerPage?: number;      // Default: 25
}

export interface BaseSearchResults<T> {
  TotalCount: number;
  RetrievedCount: number;
  PageIndex: number;
  ItemsPerPage: number;
  Order: string;
  OrderedBy: string;
  Items: T[];
}
```

```typescript
// File: server/src/domain-types/common/current.user.ts

export interface CurrentUser {
  UserId: string;
  Username: string;
  Email: string;
  TenantId?: string;
  SessionId?: string;
}

export interface CurrentClient {
  IsPrivileged?: boolean;
  ClientName?: string;
  ApiKey?: string;
}
```

```typescript
// File: server/src/domain-types/common/response.dto.ts

export interface ApiResponse<T = any> {
  Status: 'success' | 'failure';
  Message: string;
  HttpCode: number;
  Data?: T;
  Timestamp: string;
  RequestId?: string;
}

export interface SuccessResponse<T = any> extends ApiResponse<T> {
  Status: 'success';
  Data: T;
}

export interface ErrorResponse extends ApiResponse {
  Status: 'failure';
  Error?: string;
  ValidationErrors?: string[];
}
```

### 1.2 Domain Types - Auth

```typescript
// File: server/src/domain-types/auth/auth.types.ts

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface TokenPayload {
  userId: string;
  username: string;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}
```

```typescript
// File: server/src/domain-types/auth/auth.dto.ts

export interface UserResponseDto {
  id: string;
  username: string;
  email: string;
  minioBucket?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginResponseDto {
  user: UserResponseDto;
  token: string;
  expiresIn: number;
}

export interface RegisterResponseDto {
  user: UserResponseDto;
  token: string;
  message: string;
}

// Request DTOs (for validation)
export interface RegisterRequestDto {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequestDto {
  email: string;
  password: string;
}
```

### 1.3 Domain Types - Project

```typescript
// File: server/src/domain-types/project/project.types.ts

export type ProjectStatus = 'active' | 'archived' | 'deleted';

export interface ProjectCreateModel {
  name: string;
  description?: string;
  userId: string;
}

export interface ProjectUpdateModel {
  name?: string;
  description?: string;
  status?: ProjectStatus;
}

export interface ProjectSearchFilters extends BaseSearchFilters {
  Name?: string;
  Status?: ProjectStatus;
  UserId?: string;
}
```

```typescript
// File: server/src/domain-types/project/project.dto.ts

export interface ProjectResponseDto {
  id: string;
  name: string;
  description?: string;
  minioPath?: string;
  status: string;
  userId: string;
  fileCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectCreateRequestDto {
  name: string;
  description?: string;
}

export interface ProjectUpdateRequestDto {
  name?: string;
  description?: string;
  status?: string;
}

export interface ProjectSearchResultsDto extends BaseSearchResults<ProjectResponseDto> {}
```

### 1.4 Domain Types - File

```typescript
// File: server/src/domain-types/file/file.types.ts

export type FileType = 'file' | 'directory';

export interface FileNode {
  name: string;
  path: string;
  type: FileType;
  size?: number;
  children?: FileNode[];
}

export interface FileTreeStructure {
  [key: string]: FileTreeStructure | null;
}

export interface FileContentRequest {
  path: string;
  userId: string;
}

export interface FileCreateModel {
  name: string;
  path: string;
  type: FileType;
  content?: string;
  userId: string;
}
```

```typescript
// File: server/src/domain-types/file/file.dto.ts

export interface FileResponseDto {
  name: string;
  path: string;
  type: FileType;
  size?: number;
  content?: string;
  mimeType?: string;
  lastModified?: Date;
}

export interface FileTreeResponseDto {
  tree: FileTreeStructure;
  totalFiles: number;
  totalDirectories: number;
}

export interface FileContentResponseDto {
  path: string;
  content: string;
  mimeType: string;
  size: number;
}

export interface DirectoryContentsDto {
  items: string[];  // Format: "name|type"
  count: number;
}
```

---

## Layer 2: Database Layer

### 2.1 Base Service

```typescript
// File: server/src/database/typeorm/services/base.service.ts

import { FindManyOptions } from 'typeorm';
import { BaseSearchFilters } from '../../../domain-types/common/base.search.types.js';

export interface PaginationResult {
  search: FindManyOptions<any>;
  pageIndex: number;
  limit: number;
  order: 'ASC' | 'DESC';
  orderByColumn: string;
}

export class BaseService {
  protected addSortingAndPagination<T>(
    search: FindManyOptions<T>,
    filters: BaseSearchFilters
  ): PaginationResult {
    const pageIndex = filters.PageIndex ?? 0;
    const limit = filters.ItemsPerPage ?? 25;
    const orderByColumn = filters.OrderBy ?? 'createdAt';
    const order = filters.Order === 'ascending' ? 'ASC' : 'DESC';

    search.skip = pageIndex * limit;
    search.take = limit;
    search.order = { [orderByColumn]: order } as any;

    return { search, pageIndex, limit, order, orderByColumn };
  }

  protected async getPaginatedResults<T, D>(
    repository: any,
    search: FindManyOptions<T>,
    filters: BaseSearchFilters,
    mapper: (entity: T) => D
  ): Promise<BaseSearchResults<D>> {
    const paginationInfo = this.addSortingAndPagination(search, filters);

    const [entities, totalCount] = await repository.findAndCount(paginationInfo.search);

    return {
      TotalCount: totalCount,
      RetrievedCount: entities.length,
      PageIndex: paginationInfo.pageIndex,
      ItemsPerPage: paginationInfo.limit,
      Order: filters.Order ?? 'descending',
      OrderedBy: paginationInfo.orderByColumn,
      Items: entities.map(mapper),
    };
  }
}
```

### 2.2 Mappers

```typescript
// File: server/src/database/typeorm/mappers/user.mapper.ts

import { User } from '../models/user.entity.js';
import { UserResponseDto } from '../../../domain-types/auth/auth.dto.js';

export class UserMapper {
  static toResponseDto(user: User): UserResponseDto {
    if (!user) return null as any;

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      minioBucket: user.minioBucket,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  static toResponseDtoArray(users: User[]): UserResponseDto[] {
    return users.map(user => this.toResponseDto(user));
  }

  // Remove sensitive fields for public responses
  static toPublicDto(user: User): Omit<UserResponseDto, 'minioBucket'> {
    const dto = this.toResponseDto(user);
    const { minioBucket, ...publicData } = dto;
    return publicData;
  }
}
```

```typescript
// File: server/src/database/typeorm/mappers/project.mapper.ts

import { Project } from '../models/project.entity.js';
import { ProjectResponseDto } from '../../../domain-types/project/project.dto.js';

export class ProjectMapper {
  static toResponseDto(project: Project): ProjectResponseDto {
    if (!project) return null as any;

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      minioPath: project.minioPath,
      status: project.status,
      userId: project.user?.id || project.userId,
      fileCount: project.files?.length || 0,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  static toResponseDtoArray(projects: Project[]): ProjectResponseDto[] {
    return projects.map(project => this.toResponseDto(project));
  }
}
```

### 2.3 Enhanced Services

```typescript
// File: server/src/database/typeorm/services/user.service.ts

import { Repository } from 'typeorm';
import { AppDataSource } from '../../data-source.js';
import { User } from '../models/user.entity.js';
import { UserMapper } from '../mappers/user.mapper.js';
import { UserResponseDto } from '../../../domain-types/auth/auth.dto.js';
import { ErrorHandler } from '../../../common/error-handling/error.handler.js';
import { BaseService } from './base.service.js';

export class UserService extends BaseService {
  private userRepository: Repository<User>;

  constructor() {
    super();
    this.userRepository = AppDataSource.getRepository(User);
  }

  async create(userData: {
    username: string;
    email: string;
    password: string;
    minioBucket?: string;
  }): Promise<UserResponseDto> {
    const user = this.userRepository.create(userData);
    const savedUser = await this.userRepository.save(user);
    return UserMapper.toResponseDto(savedUser);
  }

  async getById(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['projects'],
    });

    if (!user) {
      ErrorHandler.throwNotFoundError(`User with ID ${id} not found`);
    }

    return UserMapper.toResponseDto(user);
  }

  async getByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { email },
    });
  }

  async getByUsername(username: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { username },
    });
  }

  async update(id: string, updates: Partial<User>): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      ErrorHandler.throwNotFoundError(`User with ID ${id} not found`);
    }

    Object.assign(user, updates);
    const updatedUser = await this.userRepository.save(user);

    return UserMapper.toResponseDto(updatedUser);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.userRepository.delete(id);
    return result.affected !== undefined && result.affected > 0;
  }

  async exists(email: string, username: string): Promise<boolean> {
    const count = await this.userRepository.count({
      where: [{ email }, { username }],
    });
    return count > 0;
  }
}
```

```typescript
// File: server/src/database/typeorm/services/project.service.ts

import { Repository, FindManyOptions, Like } from 'typeorm';
import { AppDataSource } from '../../data-source.js';
import { Project } from '../models/project.entity.js';
import { ProjectMapper } from '../mappers/project.mapper.js';
import {
  ProjectResponseDto,
  ProjectSearchResultsDto,
} from '../../../domain-types/project/project.dto.js';
import {
  ProjectCreateModel,
  ProjectUpdateModel,
  ProjectSearchFilters,
} from '../../../domain-types/project/project.types.js';
import { ErrorHandler } from '../../../common/error-handling/error.handler.js';
import { BaseService } from './base.service.js';

export class ProjectService extends BaseService {
  private projectRepository: Repository<Project>;

  constructor() {
    super();
    this.projectRepository = AppDataSource.getRepository(Project);
  }

  async create(model: ProjectCreateModel): Promise<ProjectResponseDto> {
    const project = this.projectRepository.create({
      name: model.name,
      description: model.description,
      status: 'active',
      user: { id: model.userId } as any,
    });

    const savedProject = await this.projectRepository.save(project);

    return ProjectMapper.toResponseDto(savedProject);
  }

  async getById(id: string): Promise<ProjectResponseDto> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['user', 'files'],
    });

    if (!project) {
      ErrorHandler.throwNotFoundError(`Project with ID ${id} not found`);
    }

    return ProjectMapper.toResponseDto(project);
  }

  async getUserProjects(userId: string): Promise<ProjectResponseDto[]> {
    const projects = await this.projectRepository.find({
      where: { user: { id: userId } },
      relations: ['files'],
      order: { createdAt: 'DESC' },
    });

    return ProjectMapper.toResponseDtoArray(projects);
  }

  async search(filters: ProjectSearchFilters): Promise<ProjectSearchResultsDto> {
    const search: FindManyOptions<Project> = {
      where: {},
      relations: ['user', 'files'],
    };

    // Apply filters
    if (filters.Name) {
      (search.where as any).name = Like(`%${filters.Name}%`);
    }
    if (filters.Status) {
      (search.where as any).status = filters.Status;
    }
    if (filters.UserId) {
      (search.where as any).user = { id: filters.UserId };
    }

    return this.getPaginatedResults(
      this.projectRepository,
      search,
      filters,
      ProjectMapper.toResponseDto
    );
  }

  async update(id: string, model: ProjectUpdateModel): Promise<ProjectResponseDto> {
    const project = await this.projectRepository.findOne({ where: { id } });

    if (!project) {
      ErrorHandler.throwNotFoundError(`Project with ID ${id} not found`);
    }

    if (model.name !== undefined) project.name = model.name;
    if (model.description !== undefined) project.description = model.description;
    if (model.status !== undefined) project.status = model.status;

    const updatedProject = await this.projectRepository.save(project);

    return ProjectMapper.toResponseDto(updatedProject);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.projectRepository.delete(id);
    return result.affected !== undefined && result.affected > 0;
  }

  async getUserProjectCount(userId: string): Promise<number> {
    return await this.projectRepository.count({
      where: { user: { id: userId } },
    });
  }
}
```

---

## Layer 3: Error Handling & Response System

### 3.1 Error System

```typescript
// File: server/src/common/error-handling/http.status.codes.ts

export const HttpStatusCode = {
  // Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,

  // Redirection
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,

  // Client Errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  GONE: 410,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  // Server Errors
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

export type HttpStatusCode = typeof HttpStatusCode[keyof typeof HttpStatusCode];
```

```typescript
// File: server/src/common/error-handling/app.error.ts

export class AppError extends Error {
  public readonly Code: number;
  public readonly Trace: string[];
  public readonly Context?: any;

  constructor(
    message: string,
    errorCode: number,
    originalError?: Error,
    context?: any
  ) {
    super(message);
    this.name = 'AppError';
    this.Code = errorCode;
    this.Context = context;

    // Create stack trace array
    if (originalError?.stack) {
      this.Trace = originalError.stack.split('\n');
    } else if (this.stack) {
      this.Trace = this.stack.split('\n');
    } else {
      this.Trace = [];
    }

    // Maintain proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.Code,
      context: this.Context,
    };
  }
}

export class ValidationError extends AppError {
  public readonly ValidationErrors: string[];

  constructor(messages: string[]) {
    super(messages.join('; '), 400);
    this.name = 'ValidationError';
    this.ValidationErrors = messages;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
    this.name = 'ConflictError';
  }
}
```

```typescript
// File: server/src/common/error-handling/error.handler.ts

import { AppError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError } from './app.error.js';
import { HttpStatusCode } from './http.status.codes.js';

export class ErrorHandler {
  static throwInputValidationError(messages: string[]): never {
    throw new ValidationError(messages);
  }

  static throwNotFoundError(message: string): never {
    throw new NotFoundError(message);
  }

  static throwUnauthorizedUserError(message: string = 'Unauthorized'): never {
    throw new UnauthorizedError(message);
  }

  static throwForbiddenAccessError(message: string = 'Forbidden'): never {
    throw new ForbiddenError(message);
  }

  static throwConflictError(message: string): never {
    throw new ConflictError(message);
  }

  static throwInternalServerError(message: string, error?: Error): never {
    throw new AppError(
      message,
      HttpStatusCode.INTERNAL_SERVER_ERROR,
      error
    );
  }

  static throwDbAccessError(message: string, error: Error): never {
    console.error('[DB Error]', message, error);
    throw new AppError(
      'Database operation failed',
      HttpStatusCode.INTERNAL_SERVER_ERROR,
      error,
      { originalMessage: message }
    );
  }

  static throwBadRequestError(message: string): never {
    throw new AppError(message, HttpStatusCode.BAD_REQUEST);
  }

  static handleValidationError(error: any): never {
    if (error.isJoi || error.name === 'ValidationError') {
      const messages = error.details
        ? error.details.map((d: any) => d.message)
        : [error.message];
      this.throwInputValidationError(messages);
    }
    throw error;
  }
}
```

### 3.2 Response Handler

```typescript
// File: server/src/common/handlers/response.handler.ts

import { Request, Response } from 'express';
import { AppError } from '../error-handling/app.error.js';
import { HttpStatusCode } from '../error-handling/http.status.codes.js';
import { ApiResponse, SuccessResponse, ErrorResponse } from '../../domain-types/common/response.dto.js';
import { logger } from '../../logger/logger.js';

export class ResponseHandler {
  /**
   * Send success response
   */
  static success<T = any>(
    request: Request,
    response: Response,
    message: string,
    httpCode: number = HttpStatusCode.OK,
    data?: T
  ): void {
    const responseBody: SuccessResponse<T> = {
      Status: 'success',
      Message: message,
      HttpCode: httpCode,
      Data: data as T,
      Timestamp: new Date().toISOString(),
      RequestId: (request as any).id || undefined,
    };

    logger.info(`[API Success] ${request.method} ${request.path} - ${httpCode}`, {
      message,
      statusCode: httpCode,
    });

    response.status(httpCode).json(responseBody);
  }

  /**
   * Send failure response
   */
  static failure(
    request: Request,
    response: Response,
    message: string,
    httpErrorCode: number = HttpStatusCode.INTERNAL_SERVER_ERROR,
    error?: Error | string
  ): void {
    const responseBody: ErrorResponse = {
      Status: 'failure',
      Message: message,
      HttpCode: httpErrorCode,
      Timestamp: new Date().toISOString(),
      RequestId: (request as any).id || undefined,
      Error: typeof error === 'string' ? error : error?.message,
    };

    logger.error(
      `[API Error] ${request.method} ${request.path} - ${httpErrorCode}`,
      error instanceof Error ? error : new Error(message),
      {
        statusCode: httpErrorCode,
        path: request.path,
        method: request.method,
      }
    );

    response.status(httpErrorCode).json(responseBody);
  }

  /**
   * Handle any error and send appropriate response
   */
  static handleError(
    request: Request,
    response: Response,
    error: Error | AppError | unknown
  ): void {
    // Handle known AppError instances
    if (error instanceof AppError) {
      this.failure(request, response, error.message, error.Code, error);
      return;
    }

    // Handle standard errors
    if (error instanceof Error) {
      // Check for specific error types
      if (error.name === 'ValidationError') {
        this.failure(request, response, error.message, HttpStatusCode.BAD_REQUEST, error);
        return;
      }

      if (error.message.includes('not found')) {
        this.failure(request, response, error.message, HttpStatusCode.NOT_FOUND, error);
        return;
      }

      // Default to internal server error
      this.failure(
        request,
        response,
        'Internal server error',
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        error
      );
      return;
    }

    // Handle unknown error types
    this.failure(
      request,
      response,
      'An unexpected error occurred',
      HttpStatusCode.INTERNAL_SERVER_ERROR,
      String(error)
    );
  }

  /**
   * Send no content response (204)
   */
  static noContent(request: Request, response: Response): void {
    logger.info(`[API Success] ${request.method} ${request.path} - 204 No Content`);
    response.status(HttpStatusCode.NO_CONTENT).send();
  }

  /**
   * Send created response (201)
   */
  static created<T = any>(
    request: Request,
    response: Response,
    message: string,
    data: T
  ): void {
    this.success(request, response, message, HttpStatusCode.CREATED, data);
  }
}
```

---

## Layer 4: Validation Layer

```typescript
// File: server/src/api/base.validator.ts

import Joi from 'joi';
import { Request } from 'express';
import { ErrorHandler } from '../common/error-handling/error.handler.js';
import { BaseSearchFilters } from '../domain-types/common/base.search.types.js';

export class BaseValidator {
  /**
   * Validate data against Joi schema
   */
  protected async validate<T>(schema: Joi.Schema, data: any): Promise<T> {
    try {
      return await schema.validateAsync(data, {
        abortEarly: false,
        stripUnknown: true,
      });
    } catch (error) {
      ErrorHandler.handleValidationError(error);
    }
  }

  /**
   * Extract and validate UUID from request params
   */
  protected requestParamAsUUID(request: Request, paramName: string): string {
    const value = request.params[paramName];

    if (!value) {
      ErrorHandler.throwInputValidationError([`${paramName} is required`]);
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      ErrorHandler.throwInputValidationError([`${paramName} must be a valid UUID`]);
    }

    return value;
  }

  /**
   * Extract and validate integer from request params
   */
  protected requestParamAsInteger(request: Request, paramName: string): number {
    const value = request.params[paramName];

    if (!value) {
      ErrorHandler.throwInputValidationError([`${paramName} is required`]);
    }

    const num = parseInt(value, 10);
    if (isNaN(num)) {
      ErrorHandler.throwInputValidationError([`${paramName} must be a valid integer`]);
    }

    return num;
  }

  /**
   * Extract base search filters from query params
   */
  protected getBaseSearchFilters(request: Request): BaseSearchFilters {
    return {
      OrderBy: (request.query.orderBy as string) || 'createdAt',
      Order: (request.query.order as 'ascending' | 'descending') || 'descending',
      PageIndex: parseInt(request.query.pageIndex as string) || 0,
      ItemsPerPage: parseInt(request.query.itemsPerPage as string) || 25,
    };
  }

  /**
   * Validate base search filters
   */
  protected async validateBaseSearchFilters(request: Request): Promise<BaseSearchFilters> {
    const schema = Joi.object({
      orderBy: Joi.string().optional(),
      order: Joi.string().valid('ascending', 'descending').optional(),
      pageIndex: Joi.number().integer().min(0).optional(),
      itemsPerPage: Joi.number().integer().min(1).max(100).optional(),
    });

    await this.validate(schema, request.query);
    return this.getBaseSearchFilters(request);
  }
}
```

```typescript
// File: server/src/api/auth/auth.validator.ts

import Joi from 'joi';
import { Request } from 'express';
import { BaseValidator } from '../base.validator.js';
import { RegisterRequestDto, LoginRequestDto } from '../../domain-types/auth/auth.dto.js';

export class AuthValidator extends BaseValidator {
  /**
   * Validate registration request
   */
  async validateRegisterRequest(request: Request): Promise<RegisterRequestDto> {
    const schema = Joi.object({
      username: Joi.string()
        .min(3)
        .max(32)
        .pattern(/^[a-zA-Z0-9_]+$/)
        .required()
        .messages({
          'string.pattern.base': 'Username can only contain letters, numbers, and underscores',
          'string.min': 'Username must be at least 3 characters',
          'string.max': 'Username must be less than 32 characters',
          'any.required': 'Username is required',
        }),
      email: Joi.string()
        .email()
        .required()
        .messages({
          'string.email': 'Please provide a valid email address',
          'any.required': 'Email is required',
        }),
      password: Joi.string()
        .min(8)
        .required()
        .messages({
          'string.min': 'Password must be at least 8 characters',
          'any.required': 'Password is required',
        }),
    });

    return this.validate<RegisterRequestDto>(schema, request.body);
  }

  /**
   * Validate login request
   */
  async validateLoginRequest(request: Request): Promise<LoginRequestDto> {
    const schema = Joi.object({
      email: Joi.string()
        .email()
        .required()
        .messages({
          'string.email': 'Please provide a valid email address',
          'any.required': 'Email is required',
        }),
      password: Joi.string()
        .required()
        .messages({
          'any.required': 'Password is required',
        }),
    });

    return this.validate<LoginRequestDto>(schema, request.body);
  }
}
```

```typescript
// File: server/src/api/projects/project.validator.ts

import Joi from 'joi';
import { Request } from 'express';
import { BaseValidator } from '../base.validator.js';
import {
  ProjectCreateRequestDto,
  ProjectUpdateRequestDto,
} from '../../domain-types/project/project.dto.js';
import { ProjectSearchFilters } from '../../domain-types/project/project.types.js';

export class ProjectValidator extends BaseValidator {
  /**
   * Validate project creation request
   */
  async validateCreateRequest(request: Request): Promise<ProjectCreateRequestDto> {
    const schema = Joi.object({
      name: Joi.string()
        .min(3)
        .max(64)
        .required()
        .messages({
          'string.min': 'Project name must be at least 3 characters',
          'string.max': 'Project name must be less than 64 characters',
          'any.required': 'Project name is required',
        }),
      description: Joi.string()
        .max(500)
        .optional()
        .allow('')
        .messages({
          'string.max': 'Description must be less than 500 characters',
        }),
    });

    return this.validate<ProjectCreateRequestDto>(schema, request.body);
  }

  /**
   * Validate project update request
   */
  async validateUpdateRequest(request: Request): Promise<ProjectUpdateRequestDto> {
    const schema = Joi.object({
      name: Joi.string().min(3).max(64).optional(),
      description: Joi.string().max(500).optional().allow(''),
      status: Joi.string().valid('active', 'archived', 'deleted').optional(),
    }).min(1); // At least one field must be present

    return this.validate<ProjectUpdateRequestDto>(schema, request.body);
  }

  /**
   * Validate project search request
   */
  async validateSearchRequest(request: Request): Promise<ProjectSearchFilters> {
    const baseFilters = await this.validateBaseSearchFilters(request);

    const schema = Joi.object({
      name: Joi.string().optional(),
      status: Joi.string().valid('active', 'archived', 'deleted').optional(),
      userId: Joi.string().uuid().optional(),
    });

    const specificFilters = await this.validate(schema, request.query);

    return {
      ...baseFilters,
      ...specificFilters,
    };
  }
}
```

---

## Layer 5: Controllers

```typescript
// File: server/src/api/auth/auth.controller.ts

import { Request, Response } from 'express';
import { AuthService } from '../../services/auth.service.js';
import { ResponseHandler } from '../../common/handlers/response.handler.js';
import { AuthValidator } from './auth.validator.js';
import { HttpStatusCode } from '../../common/error-handling/http.status.codes.js';

export class AuthController {
  private authService: AuthService;
  private validator: AuthValidator;

  constructor() {
    this.authService = new AuthService();
    this.validator = new AuthValidator();
  }

  /**
   * Register new user
   * POST /api/auth/register
   */
  register = async (request: Request, response: Response): Promise<void> => {
    try {
      // 1. Validate input
      const model = await this.validator.validateRegisterRequest(request);

      // 2. Business logic
      const result = await this.authService.register(
        model.username,
        model.email,
        model.password
      );

      // 3. Send success response
      ResponseHandler.created(
        request,
        response,
        'User registered successfully',
        result
      );

    } catch (error) {
      ResponseHandler.handleError(request, response, error as Error);
    }
  };

  /**
   * Login user
   * POST /api/auth/login
   */
  login = async (request: Request, response: Response): Promise<void> => {
    try {
      const model = await this.validator.validateLoginRequest(request);

      const result = await this.authService.login(
        model.email,
        model.password
      );

      ResponseHandler.success(
        request,
        response,
        'Login successful',
        HttpStatusCode.OK,
        result
      );

    } catch (error) {
      ResponseHandler.handleError(request, response, error as Error);
    }
  };

  /**
   * Get current user
   * GET /api/auth/me
   */
  getCurrentUser = async (request: Request, response: Response): Promise<void> => {
    try {
      const userId = (request as any).userId;

      if (!userId) {
        ResponseHandler.failure(
          request,
          response,
          'User not authenticated',
          HttpStatusCode.UNAUTHORIZED
        );
        return;
      }

      const user = await this.authService.getUserById(userId);

      ResponseHandler.success(
        request,
        response,
        'User retrieved successfully',
        HttpStatusCode.OK,
        user
      );

    } catch (error) {
      ResponseHandler.handleError(request, response, error as Error);
    }
  };
}
```

```typescript
// File: server/src/api/projects/project.controller.ts

import { Request, Response } from 'express';
import { ProjectService } from '../../database/typeorm/services/project.service.js';
import { ResponseHandler } from '../../common/handlers/response.handler.js';
import { ProjectValidator } from './project.validator.js';
import { HttpStatusCode } from '../../common/error-handling/http.status.codes.js';

export class ProjectController {
  private projectService: ProjectService;
  private validator: ProjectValidator;

  constructor() {
    this.projectService = new ProjectService();
    this.validator = new ProjectValidator();
  }

  /**
   * Create new project
   * POST /api/projects
   */
  create = async (request: Request, response: Response): Promise<void> => {
    try {
      const userId = (request as any).userId;

      if (!userId) {
        ResponseHandler.failure(
          request,
          response,
          'User not authenticated',
          HttpStatusCode.UNAUTHORIZED
        );
        return;
      }

      const model = await this.validator.validateCreateRequest(request);

      const project = await this.projectService.create({
        ...model,
        userId,
      });

      ResponseHandler.created(
        request,
        response,
        'Project created successfully',
        project
      );

    } catch (error) {
      ResponseHandler.handleError(request, response, error as Error);
    }
  };

  /**
   * Get project by ID
   * GET /api/projects/:id
   */
  getById = async (request: Request, response: Response): Promise<void> => {
    try {
      const id = this.validator.requestParamAsUUID(request, 'id');

      const project = await this.projectService.getById(id);

      ResponseHandler.success(
        request,
        response,
        'Project retrieved successfully',
        HttpStatusCode.OK,
        project
      );

    } catch (error) {
      ResponseHandler.handleError(request, response, error as Error);
    }
  };

  /**
   * Get user's projects
   * GET /api/projects
   */
  getUserProjects = async (request: Request, response: Response): Promise<void> => {
    try {
      const userId = (request as any).userId;

      if (!userId) {
        ResponseHandler.failure(
          request,
          response,
          'User not authenticated',
          HttpStatusCode.UNAUTHORIZED
        );
        return;
      }

      const projects = await this.projectService.getUserProjects(userId);

      ResponseHandler.success(
        request,
        response,
        'Projects retrieved successfully',
        HttpStatusCode.OK,
        { projects, count: projects.length }
      );

    } catch (error) {
      ResponseHandler.handleError(request, response, error as Error);
    }
  };

  /**
   * Search projects
   * GET /api/projects/search
   */
  search = async (request: Request, response: Response): Promise<void> => {
    try {
      const filters = await this.validator.validateSearchRequest(request);

      const results = await this.projectService.search(filters);

      ResponseHandler.success(
        request,
        response,
        'Projects search completed',
        HttpStatusCode.OK,
        results
      );

    } catch (error) {
      ResponseHandler.handleError(request, response, error as Error);
    }
  };

  /**
   * Update project
   * PUT /api/projects/:id
   */
  update = async (request: Request, response: Response): Promise<void> => {
    try {
      const id = this.validator.requestParamAsUUID(request, 'id');
      const model = await this.validator.validateUpdateRequest(request);

      const project = await this.projectService.update(id, model);

      ResponseHandler.success(
        request,
        response,
        'Project updated successfully',
        HttpStatusCode.OK,
        project
      );

    } catch (error) {
      ResponseHandler.handleError(request, response, error as Error);
    }
  };

  /**
   * Delete project
   * DELETE /api/projects/:id
   */
  delete = async (request: Request, response: Response): Promise<void> => {
    try {
      const id = this.validator.requestParamAsUUID(request, 'id');

      await this.projectService.delete(id);

      ResponseHandler.success(
        request,
        response,
        'Project deleted successfully',
        HttpStatusCode.NO_CONTENT
      );

    } catch (error) {
      ResponseHandler.handleError(request, response, error as Error);
    }
  };
}
```

---

## Layer 6: Routes

```typescript
// File: server/src/api/auth/auth.routes.ts

import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();
const controller = new AuthController();

// Public routes
router.post('/register', controller.register);
router.post('/login', controller.login);

// Protected routes
router.get('/me', authenticate, controller.getCurrentUser);

export default router;
```

```typescript
// File: server/src/api/projects/project.routes.ts

import { Router } from 'express';
import { ProjectController } from './project.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();
const controller = new ProjectController();

// All project routes require authentication
router.use(authenticate);

router.post('/', controller.create);
router.get('/', controller.getUserProjects);
router.get('/search', controller.search);
router.get('/:id', controller.getById);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

export default router;
```

---

## Layer 7: Application Setup

```typescript
// File: server/src/startup/route.handler.ts

import { Express, Request, Response } from 'express';
import authRoutes from '../api/auth/auth.routes.js';
import projectRoutes from '../api/projects/project.routes.js';
import fileRoutes from '../api/files/file.routes.js';
import portRoutes from '../api/ports/port.routes.js';
import { ConfigurationManager } from '../config/configuration.manager.js';
import { logger } from '../logger/logger.js';

export class RouteHandler {
  static setup(app: Express): void {
    // Health check
    app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: ConfigurationManager.config.Server.ApiVersion || '1.0.0',
      });
    });

    // API info
    app.get('/api/info', (req: Request, res: Response) => {
      res.json({
        name: 'Web IDE API',
        version: ConfigurationManager.config.Server.ApiVersion || '1.0.0',
        environment: ConfigurationManager.Environment(),
        endpoints: [
          'POST /api/auth/register',
          'POST /api/auth/login',
          'GET /api/auth/me',
          'GET /api/projects',
          'POST /api/projects',
          'GET /api/projects/:id',
          'PUT /api/projects/:id',
          'DELETE /api/projects/:id',
        ],
      });
    });

    // Mount route modules
    app.use('/api/auth', authRoutes);
    app.use('/api/projects', projectRoutes);
    app.use('/api/files', fileRoutes);
    app.use('/api/ports', portRoutes);

    logger.info('Routes registered successfully');
  }
}
```

```typescript
// File: server/app.ts

import express, { Express } from 'express';
import { Server as SocketServer } from 'socket.io';
import * as http from 'http';
import { ConfigurationManager } from './src/config/configuration.manager.js';
import { AppDataSource } from './src/database/data-source.js';
import { CommonMiddlewares } from './src/middleware/common.middlewares.js';
import { RouteHandler } from './src/startup/route.handler.js';
import { errorHandler } from './src/middleware/error.middleware.js';
import { logger } from './src/logger/logger.js';
import { setupSocketHandlers } from './src/socket/socket.handler.js';

export class Application {
  private static instance: Application;
  private app: Express;
  private server: http.Server;
  private io: SocketServer;
  private isInitialized: boolean = false;

  private constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new SocketServer(this.server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });
  }

  static getInstance(): Application {
    if (!Application.instance) {
      Application.instance = new Application();
    }
    return Application.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Application already initialized');
      return;
    }

    try {
      // 1. Initialize configuration
      ConfigurationManager.initialize();
      logger.info('✓ Configuration loaded');

      // 2. Initialize database
      await this.initializeDatabase();
      logger.info('✓ Database connected');

      // 3. Setup middleware
      CommonMiddlewares.setup(this.app);
      logger.info('✓ Middleware configured');

      // 4. Setup routes
      RouteHandler.setup(this.app);
      logger.info('✓ Routes registered');

      // 5. Setup error handling (MUST BE LAST)
      this.app.use(errorHandler);
      logger.info('✓ Error handler registered');

      // 6. Setup Socket.IO
      await this.setupSocketIO();
      logger.info('✓ Socket.IO configured');

      this.isInitialized = true;
      logger.info('✓ Application initialized successfully');

    } catch (error) {
      logger.error('✗ Application initialization failed', error as Error);
      throw error;
    }
  }

  private async initializeDatabase(): Promise<void> {
    try {
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }
      logger.info('Database connection established');
    } catch (error) {
      logger.error('Database connection failed', error as Error);
      throw error;
    }
  }

  private async setupSocketIO(): Promise<void> {
    setupSocketHandlers(this.io);
    logger.info('Socket.IO event handlers registered');
  }

  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Application not initialized. Call initialize() first.');
    }

    const port = ConfigurationManager.Port();

    return new Promise((resolve) => {
      this.server.listen(port, () => {
        logger.info('═══════════════════════════════════════════════════');
        logger.info(`🚀 Server started successfully`);
        logger.info(`📍 Port: ${port}`);
        logger.info(`🌍 Environment: ${ConfigurationManager.Environment()}`);
        logger.info(`🔗 API: ${ConfigurationManager.config.Server.BaseUrl}`);
        logger.info(`🔌 Socket.IO: ws://localhost:${port}/socket.io/`);
        logger.info(`❤️  Health: http://localhost:${port}/health`);
        logger.info('═══════════════════════════════════════════════════');
        resolve();
      });
    });
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down application...');

    // Close HTTP server
    await new Promise<void>((resolve) => {
      this.server.close(() => {
        logger.info('✓ HTTP server closed');
        resolve();
      });
    });

    // Close Socket.IO
    this.io.close(() => {
      logger.info('✓ Socket.IO closed');
    });

    // Close database connection
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      logger.info('✓ Database connection closed');
    }

    logger.info('✓ Application shutdown complete');
  }

  getExpressApp(): Express {
    return this.app;
  }

  getSocketIO(): SocketServer {
    return this.io;
  }
}
```

```typescript
// File: server/index.ts

import 'reflect-metadata';
import { Application } from './app.js';
import { logger } from './src/logger/logger.js';

const app = Application.getInstance();

// Graceful shutdown handler
const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}, initiating graceful shutdown...`);

  try {
    await app.shutdown();
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', error as Error);
    process.exit(1);
  }
};

// Register shutdown handlers
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGUSR2', () => shutdown('SIGUSR2')); // Nodemon restart

// Handle uncaught errors
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', error);
  shutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Promise Rejection', reason);
  shutdown('UNHANDLED_REJECTION');
});

// Start application
(async () => {
  try {
    await app.initialize();
    await app.start();
  } catch (error) {
    logger.error('Failed to start application', error as Error);
    process.exit(1);
  }
})();
```

---

# Frontend Integration

## Response Type Definitions

```typescript
// File: interface/src/lib/types/api.types.ts

export interface ApiResponse<T = any> {
  Status: 'success' | 'failure';
  Message: string;
  HttpCode: number;
  Data?: T;
  Timestamp: string;
  RequestId?: string;
  Error?: string;
  ValidationErrors?: string[];
}

export interface SuccessResponse<T> extends ApiResponse<T> {
  Status: 'success';
  Data: T;
}

export interface ErrorResponse extends ApiResponse {
  Status: 'failure';
}
```

## API Client with Type Safety

```typescript
// File: interface/src/lib/api/client.ts

import { getApiUrl } from '$lib/env';
import type { ApiResponse, SuccessResponse, ErrorResponse } from '$lib/types/api.types';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public response?: ErrorResponse
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiClient {
  private static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(getApiUrl(endpoint), {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
          ...options.headers,
        },
      });

      const data: ApiResponse<T> = await response.json();

      if (!response.ok || data.Status === 'failure') {
        throw new ApiError(
          data.HttpCode,
          data.Message || 'Request failed',
          data as ErrorResponse
        );
      }

      // Return the Data field from successful response
      return (data as SuccessResponse<T>).Data;

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(
        500,
        error instanceof Error ? error.message : 'Network error',
      );
    }
  }

  static async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  static async post<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async put<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}
```

## Frontend Type Definitions (matching backend DTOs)

```typescript
// File: interface/src/lib/types/auth.types.ts

export interface UserDto {
  id: string;
  username: string;
  email: string;
  minioBucket?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponseDto {
  user: UserDto;
  token: string;
  expiresIn: number;
}

export interface RegisterResponseDto {
  user: UserDto;
  token: string;
  message: string;
}
```

```typescript
// File: interface/src/lib/types/project.types.ts

export interface ProjectDto {
  id: string;
  name: string;
  description?: string;
  minioPath?: string;
  status: string;
  userId: string;
  fileCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectsResponseDto {
  projects: ProjectDto[];
  count: number;
}
```

## API Service Layer

```typescript
// File: interface/src/lib/api/auth.service.ts

import { ApiClient } from './client';
import type { LoginResponseDto, RegisterResponseDto, UserDto } from '$lib/types/auth.types';

export class AuthService {
  static async login(email: string, password: string): Promise<LoginResponseDto> {
    return ApiClient.post<LoginResponseDto>('/api/auth/login', {
      email,
      password,
    });
  }

  static async register(
    username: string,
    email: string,
    password: string
  ): Promise<RegisterResponseDto> {
    return ApiClient.post<RegisterResponseDto>('/api/auth/register', {
      username,
      email,
      password,
    });
  }

  static async getCurrentUser(): Promise<UserDto> {
    return ApiClient.get<UserDto>('/api/auth/me');
  }
}
```

```typescript
// File: interface/src/lib/api/project.service.ts

import { ApiClient } from './client';
import type { ProjectDto, ProjectsResponseDto } from '$lib/types/project.types';

export class ProjectService {
  static async getUserProjects(): Promise<ProjectsResponseDto> {
    return ApiClient.get<ProjectsResponseDto>('/api/projects');
  }

  static async getProjectById(id: string): Promise<ProjectDto> {
    return ApiClient.get<ProjectDto>(`/api/projects/${id}`);
  }

  static async createProject(name: string, description?: string): Promise<ProjectDto> {
    return ApiClient.post<ProjectDto>('/api/projects', {
      name,
      description,
    });
  }

  static async updateProject(
    id: string,
    updates: { name?: string; description?: string; status?: string }
  ): Promise<ProjectDto> {
    return ApiClient.put<ProjectDto>(`/api/projects/${id}`, updates);
  }

  static async deleteProject(id: string): Promise<void> {
    return ApiClient.delete<void>(`/api/projects/${id}`);
  }
}
```

## Usage in Svelte Components

```svelte
<!-- File: interface/src/routes/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { ProjectService } from '$lib/api/project.service';
  import { ApiError } from '$lib/api/client';
  import type { ProjectDto } from '$lib/types/project.types';

  let projects = $state<ProjectDto[]>([]);
  let loading = $state(true);
  let error = $state('');

  onMount(async () => {
    try {
      const response = await ProjectService.getUserProjects();
      projects = response.projects;
    } catch (err) {
      if (err instanceof ApiError) {
        error = err.message;
        console.error('API Error:', err.statusCode, err.response);
      } else {
        error = 'Failed to load projects';
      }
    } finally {
      loading = false;
    }
  });

  async function createNewProject() {
    try {
      const newProject = await ProjectService.createProject(
        'My New Project',
        'Project description'
      );
      projects = [...projects, newProject];
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.message);
      }
    }
  }
</script>

{#if loading}
  <div>Loading projects...</div>
{:else if error}
  <div class="error">{error}</div>
{:else}
  <div class="projects">
    {#each projects as project}
      <div class="project-card">
        <h3>{project.name}</h3>
        <p>{project.description}</p>
        <small>Created: {new Date(project.createdAt).toLocaleDateString()}</small>
      </div>
    {/each}
  </div>
{/if}

<button onclick={createNewProject}>Create Project</button>
```

---

# Migration Plan

## Phase 1: Foundation 

1. **Create directory structure**
   ```bash
   mkdir -p src/{api,auth,common,config,database,domain-types,logger,middleware,services,socket,startup}
   ```

2. **Implement base types**
   - Create all domain-types files
   - Create base.search.types.ts
   - Create response.dto.ts

3. **Implement error handling**
   - Create app.error.ts
   - Create error.handler.ts
   - Create http.status.codes.ts

4. **Implement response handler**
   - Create response.handler.ts

## Phase 2: Configuration & Database

5. **Setup configuration**
   - Create configuration.manager.ts
   - Create service.config.json
   - Update .env file

6. **Refactor database layer**
   - Create mappers (user, project, file)
   - Enhance services (user, project)
   - Create base.service.ts

7. **Implement logger**
   - Create logger.ts

## Phase 3: API Layer 

8. **Create validators**
   - Create base.validator.ts
   - Create auth.validator.ts
   - Create project.validator.ts

9. **Refactor controllers**
   - Update auth.controller.ts
   - Update project.controller.ts
   - Create file.controller.ts (enhanced)

10. **Update routes**
    - Update all route files to use new controllers

## Phase 4: Application Structure 

11. **Create application class**
    - Create app.ts
    - Update index.ts

12. **Create startup handlers**
    - Create route.handler.ts
    - Update middleware setup

## Phase 5: Frontend Integration

13. **Update frontend types**
    - Create matching DTO types
    - Create API response types

14. **Refactor API client**
    - Update client.ts with ResponseHandler support
    - Create service layer files

15. **Update components**
    - Update to use new API services
    - Add proper error handling

## Phase 6: Testing & Documentation 

16. **Test all endpoints**
17. **Update API documentation**
18. **Performance testing**

---

# Checklist

## Backend
- [ ] Create directory structure
- [ ] Implement domain types
- [ ] Implement error handling system
- [ ] Implement response handler
- [ ] Setup configuration manager
- [ ] Create database mappers
- [ ] Create enhanced services
- [ ] Implement logger
- [ ] Create validators
- [ ] Refactor controllers
- [ ] Update routes
- [ ] Create Application class
- [ ] Update index.ts
- [ ] Test all endpoints

## Frontend
- [ ] Create matching type definitions
- [ ] Refactor API client
- [ ] Create API service layer
- [ ] Update components
- [ ] Add error handling
- [ ] Test frontend integration

---
