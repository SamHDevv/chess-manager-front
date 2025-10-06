// Authentication Models
export interface AuthLoginRequest {
  email: string;
  password: string;
}

export interface AuthRegisterRequest {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: AuthUser;
  message?: string;
  error?: string;
}

export type UserRole = 'player' | 'admin';

export type Permission = 
  // Permisos básicos
  | 'view_tournaments'
  | 'join_tournaments'
  | 'view_matches'
  | 'view_rankings'
  
  // Permisos de gestión propia (players)
  | 'create_tournaments'
  | 'edit_own_tournaments'
  | 'delete_own_tournaments'
  | 'manage_own_tournament_inscriptions'
  
  // Permisos administrativos (solo admin)
  | 'manage_users'
  | 'edit_any_tournament'
  | 'delete_any_tournament'
  | 'view_system_analytics';

export interface AuthUser {
  userId: number;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  createdAt?: Date;
  lastLogin?: Date;
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