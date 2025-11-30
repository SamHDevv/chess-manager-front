import { Injectable } from '@angular/core';
import { Permission, UserRole } from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class RolePermissionService {
  
  private readonly ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
    'player': [
      // Permisos básicos
      'view_tournaments',
      'join_tournaments', 
      'view_matches',
      'view_rankings',
      
      // Permisos de gestión propia
      'create_tournaments',
      'edit_own_tournaments',
      'delete_own_tournaments',
      'manage_own_tournament_inscriptions'
    ],
    'admin': [
      // Hereda todos los permisos de player
      'view_tournaments',
      'join_tournaments',
      'view_matches', 
      'view_rankings',
      'create_tournaments',
      'edit_own_tournaments',
      'delete_own_tournaments',
      'manage_own_tournament_inscriptions',
      
      // Permisos exclusivos de admin
      'manage_users',
      'edit_any_tournament',
      'delete_any_tournament',
      'view_system_analytics'
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
    const isAdmin = userRole === 'admin';
    const isOwner = userId === tournamentCreatorId;
    
    // Los admins pueden hacer todo
    if (isAdmin) {
      if (action === 'edit') return this.hasPermission(userRole, 'edit_any_tournament');
      if (action === 'delete') return this.hasPermission(userRole, 'delete_any_tournament');
      if (action === 'manage_inscriptions') return this.hasPermission(userRole, 'manage_own_tournament_inscriptions');
    }
    
    // Los players solo pueden gestionar sus propios torneos
    if (isOwner) {
      if (action === 'edit') return this.hasPermission(userRole, 'edit_own_tournaments');
      if (action === 'delete') return this.hasPermission(userRole, 'delete_own_tournaments');
      if (action === 'manage_inscriptions') return this.hasPermission(userRole, 'manage_own_tournament_inscriptions');
    }
    
    return false;
  }

  /**
   * Verifica si un usuario puede crear torneos
   */
  canCreateTournaments(role: UserRole): boolean {
    return this.hasPermission(role, 'create_tournaments');
  }

  /**
   * Verifica si un usuario es administrador
   */
  isAdmin(role: UserRole): boolean {
    return role === 'admin';
  }

  /**
   * Verifica si un usuario puede gestionar otros usuarios
   */
  canManageUsers(role: UserRole): boolean {
    return this.hasPermission(role, 'manage_users');
  }

  /**
   * Obtiene descripción legible del rol
   */
  getRoleDisplayName(role: UserRole): string {
    const roleNames: Record<UserRole, string> = {
      'player': 'Jugador',
      'admin': 'Administrador'
    };
    
    return roleNames[role];
  }

  /**
   * Obtiene descripción de permisos del rol
   */
  getRoleDescription(role: UserRole): string {
    const descriptions: Record<UserRole, string> = {
      'player': 'Puede crear y gestionar sus propios torneos, inscribirse en cualquier torneo',
      'admin': 'Control total del sistema, puede gestionar cualquier torneo y usuarios'
    };
    
    return descriptions[role];
  }
}