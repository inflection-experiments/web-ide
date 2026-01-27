export interface AuthOptions {
    roles?: string[];
    permissions?: string[];
    allowAnonymous?: boolean;
}

export interface AuthUser {
    userId: string;
    username: string;
    role?: string; // Optional for now until we add roles to DB
    permissions?: string[];
}
