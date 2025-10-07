import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { RolePermissionService } from '../services/role-permission.service';
import { Permission } from '../models/auth.model';
import { UserRole } from '../models/user.model';

/**
 * Guard para rutas que requieren autenticación
 */
export const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isAuthenticated = authService.isAuthenticated();
  
  if (isAuthenticated) {
    return true;
  } else {
    router.navigate(['/login']);
    return false;
  }
};

/**
 * Guard para rutas que requieren permisos específicos
 */
export const permissionGuard = (requiredPermission: Permission) => {
  const authService = inject(AuthService);
  const rolePermissionService = inject(RolePermissionService);
  const router = inject(Router);

  const user = authService.currentUser();
  
  if (!user) {
    router.navigate(['/login']);
    return false;
  }

  const hasPermission = rolePermissionService.hasPermission(user.role as UserRole, requiredPermission);
  
  if (!hasPermission) {
    router.navigate(['/tournaments']); // Redirigir a página principal
    return false;
  }

  return true;
};

/**
 * Guard específico para administradores
 */
export const adminGuard = () => {
  const authService = inject(AuthService);
  const rolePermissionService = inject(RolePermissionService);
  const router = inject(Router);

  const user = authService.currentUser();
  
  if (!user) {
    router.navigate(['/login']);
    return false;
  }

  const isAdmin = rolePermissionService.isAdmin(user.role as UserRole);
  
  if (!isAdmin) {
    router.navigate(['/tournaments']); // No autorizado
    return false;
  }

  return true;
};

/**
 * Guard para verificar si puede crear torneos
 */
export const canCreateTournamentGuard = () => {
  return permissionGuard(Permission.CREATE_TOURNAMENTS);
};

/**
 * Guard para gestión de usuarios (solo admins)
 */
export const canManageUsersGuard = () => {
  return permissionGuard(Permission.MANAGE_USERS);
};