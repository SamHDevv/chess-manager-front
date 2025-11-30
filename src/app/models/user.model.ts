import { UserRole } from './auth.model';

export interface User {
  id: number;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  elo?: number; // Rating ELO del jugador (opcional)
  isDeleted?: boolean; // Indica si el usuario ha sido eliminado (soft delete)
  deletedAt?: Date | string; // Fecha de eliminación
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface UserDeletionInfo {
  canDelete: boolean;
  warnings: string[];
  affectedItems: {
    tournaments: number;
    inscriptions: number;
    matches: number;
  };
}

// Constante para identificar usuarios eliminados (debe coincidir con el backend)
export const DELETED_USER_ID = 999999;

// Helper para verificar si un usuario está eliminado
export function isDeletedUser(userId: number | undefined | null): boolean {
  return userId === DELETED_USER_ID;
}

// Helper mejorado para verificar si un objeto User está eliminado
export function isUserDeleted(user: User | null | undefined): boolean {
  if (!user) return false;
  // Verificar soft delete o ID especial
  return user.isDeleted === true || user.id === DELETED_USER_ID;
}

// Helper para obtener el nombre de display de un usuario (con trazabilidad)
export function getUserDisplayName(user: User | null | undefined, showId: boolean = false): string {
  if (!user) return 'Usuario Desconocido';
  
  // Si el usuario está eliminado
  if (isUserDeleted(user)) {
    // Opción A: Solo mostrar "Usuario Eliminado" (más privacidad)
    if (!showId) {
      return 'Usuario Eliminado';
    }
    // Opción B: Mostrar ID para trazabilidad (mejor para historial)
    return `Usuario #${user.id} (Eliminado)`;
  }
  
  return user.name;
}
