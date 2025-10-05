// Authentication Models
export interface AuthLoginRequest {
  email: string;
  password: string;
}

export interface AuthRegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: AuthUser;
  message?: string;
  error?: string;
}

export interface AuthUser {
  userId: number;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
}

export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

// Auth-specific enums
export enum AuthUserRole {
  ADMIN = 'admin',
  USER = 'user'
}

// Type guards
export function isAuthUser(obj: any): obj is AuthUser {
  return obj && 
    typeof obj.userId === 'number' &&
    typeof obj.email === 'string' &&
    typeof obj.role === 'string';
}

export function isAuthResponse(obj: any): obj is AuthResponse {
  return obj && typeof obj.success === 'boolean';
}