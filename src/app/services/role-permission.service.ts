import { Injectable } from '@angular/core';
import { Permission } from '../models/auth.model';
import { UserRole } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class RolePermissionService {
  
  private readonly ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
    [UserRole.PLAYER]: [
      // Permisos básicos
      Permission.VIEW_TOURNAMENTS,
      Permission.JOIN_TOURNAMENTS, 
      Permission.VIEW_MATCHES,
      Permission.VIEW_RANKINGS,
      
      // Permisos de gestión propia (✨ NOVEDAD)
      Permission.CREATE_TOURNAMENTS,
      Permission.EDIT_OWN_TOURNAMENTS,
      Permission.DELETE_OWN_TOURNAMENTS,
      Permission.MANAGE_OWN_TOURNAMENT_INSCRIPTIONS
    ],
    [UserRole.ADMIN]: [
      // Hereda todos los permisos de player
      Permission.VIEW_TOURNAMENTS,
      Permission.JOIN_TOURNAMENTS,
      Permission.VIEW_MATCHES, 
      Permission.VIEW_RANKINGS,
      Permission.CREATE_TOURNAMENTS,
      Permission.EDIT_OWN_TOURNAMENTS,
      Permission.DELETE_OWN_TOURNAMENTS,
      Permission.MANAGE_OWN_TOURNAMENT_INSCRIPTIONS,
      
      // Permisos exclusivos de admin
      Permission.MANAGE_USERS,
      Permission.EDIT_ANY_TOURNAMENT,
      Permission.DELETE_ANY_TOURNAMENT,
      Permission.VIEW_SYSTEM_ANALYTICS
    ]
  };

  /**
   * Verifica si un rol tiene un permiso específico
   */
  hasPermission(role: UserRole, permission: Permission): boolean {
    return this.ROLE_PERMISSIONS[role].includes(permission);
  }

  /**
   * Obtiene todos los permisos de un rol
   */
  getPermissions(role: UserRole): Permission[] {
    return [...this.ROLE_PERMISSIONS[role]];
  }

  /**
   * Verifica si un usuario puede realizar una acción específica en un torneo
   */
  canPerformTournamentAction(
    userRole: UserRole, 
    userId: number, 
    tournamentCreatorId: number | null | undefined, 
    action: 'edit' | 'delete' | 'manage_inscriptions'
  ): boolean {
    const isAdmin = userRole === UserRole.ADMIN;
    const isOwner = userId === tournamentCreatorId;
    
    // Los admins pueden hacer todo
    if (isAdmin) {
      if (action === 'edit') return this.hasPermission(userRole, Permission.EDIT_ANY_TOURNAMENT);
      if (action === 'delete') return this.hasPermission(userRole, Permission.DELETE_ANY_TOURNAMENT);
      if (action === 'manage_inscriptions') return this.hasPermission(userRole, Permission.MANAGE_OWN_TOURNAMENT_INSCRIPTIONS);
    }
    
    // Los players solo pueden gestionar sus propios torneos
    if (isOwner) {
      if (action === 'edit') return this.hasPermission(userRole, Permission.EDIT_OWN_TOURNAMENTS);
      if (action === 'delete') return this.hasPermission(userRole, Permission.DELETE_OWN_TOURNAMENTS);
      if (action === 'manage_inscriptions') return this.hasPermission(userRole, Permission.MANAGE_OWN_TOURNAMENT_INSCRIPTIONS);
    }
    
    return false;
  }

  /**
   * Verifica si un usuario puede crear torneos
   */
  canCreateTournaments(role: UserRole): boolean {
    return this.hasPermission(role, Permission.CREATE_TOURNAMENTS);
  }

  /**
   * Verifica si un usuario es administrador
   */
  isAdmin(role: UserRole): boolean {
    return role === UserRole.ADMIN;
  }

  /**
   * Verifica si un usuario puede gestionar otros usuarios
   */
  canManageUsers(role: UserRole): boolean {
    return this.hasPermission(role, Permission.MANAGE_USERS);
  }

  /**
   * Obtiene descripción legible del rol
   */
  getRoleDisplayName(role: UserRole): string {
    const roleNames: Record<UserRole, string> = {
      [UserRole.PLAYER]: 'Jugador',
      [UserRole.ADMIN]: 'Administrador'
    };
    
    return roleNames[role];
  }

  /**
   * Obtiene descripción de permisos del rol
   */
  getRoleDescription(role: UserRole): string {
    const descriptions: Record<UserRole, string> = {
      [UserRole.PLAYER]: 'Puede crear y gestionar sus propios torneos, inscribirse en cualquier torneo',
      [UserRole.ADMIN]: 'Control total del sistema, puede gestionar cualquier torneo y usuarios'
    };
    
    return descriptions[role];
  }
}