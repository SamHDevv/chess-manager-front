// Authentication Models
export interface AuthLoginRequest {
  email: string;
  password: string;
}

export interface AuthRegisterRequest {
  email: string;
  password: string;
  name: string;
  role?: string;
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

// Permission enum for role-based access control
export enum Permission {
  VIEW_TOURNAMENTS = 'view_tournaments',
  JOIN_TOURNAMENTS = 'join_tournaments',
  VIEW_MATCHES = 'view_matches',
  VIEW_RANKINGS = 'view_rankings',
  CREATE_TOURNAMENTS = 'create_tournaments',
  EDIT_OWN_TOURNAMENTS = 'edit_own_tournaments',
  DELETE_OWN_TOURNAMENTS = 'delete_own_tournaments',
  MANAGE_OWN_TOURNAMENT_INSCRIPTIONS = 'manage_own_tournament_inscriptions',
  MANAGE_USERS = 'manage_users',
  EDIT_ANY_TOURNAMENT = 'edit_any_tournament',
  DELETE_ANY_TOURNAMENT = 'delete_any_tournament',
  VIEW_SYSTEM_ANALYTICS = 'view_system_analytics'
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