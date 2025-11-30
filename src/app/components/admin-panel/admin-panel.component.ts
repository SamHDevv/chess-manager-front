import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { RolePermissionService } from '../../services/role-permission.service';
import { UserService } from '../../services/user.service';
import { TournamentService } from '../../services/tournament.service';
import { User } from '../../models/user.model';
import { UserRole } from '../../models/auth.model';
import { Tournament } from '../../models/tournament.model';

interface AdminStats {
  totalUsers: number;
  totalTournaments: number;
  activeTournaments: number;
  usersByRole: Record<string, number>;
}

@Component({
  selector: 'app-admin-panel',
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-panel.component.html',
  styleUrl: './admin-panel.component.scss'
})
export class AdminPanelComponent {
  // Injected services
  private readonly authService = inject(AuthService);
  private readonly rolePermissionService = inject(RolePermissionService);
  private readonly userService = inject(UserService);
  private readonly tournamentService = inject(TournamentService);

  // Make Object available to template
  protected readonly Object = Object;

  // Component state
  protected readonly activeTab = signal<'dashboard' | 'users' | 'tournaments'>('dashboard');
  protected readonly isLoading = signal<boolean>(false);
  protected readonly users = signal<User[]>([]);
  protected readonly tournaments = signal<Tournament[]>([]);
  protected readonly stats = signal<AdminStats>({
    totalUsers: 0,
    totalTournaments: 0,
    activeTournaments: 0,
    usersByRole: {}
  });

  // Computed properties
  protected readonly currentUser = this.authService.currentUser;
  protected readonly isAdmin = computed(() => 
    this.currentUser() ? this.rolePermissionService.isAdmin(this.currentUser()!.role as UserRole) : false
  );

  ngOnInit() {
    this.loadDashboardData();
  }

  // Tab navigation
  protected setActiveTab(tab: 'dashboard' | 'users' | 'tournaments'): void {
    this.activeTab.set(tab);
    
    switch (tab) {
      case 'users':
        this.loadUsers();
        break;
      case 'tournaments':
        this.loadTournaments();
        break;
      case 'dashboard':
        this.loadDashboardData();
        break;
    }
  }

  // Data loading methods
  private loadDashboardData(): void {
    this.isLoading.set(true);
    
    // Load real stats from backend
    Promise.all([
      this.userService.getAllUsers().toPromise(),
      this.tournamentService.getAllTournaments().toPromise()
    ]).then(([usersResponse, tournamentsResponse]) => {
      const users = usersResponse?.data || [];
      const tournaments = tournamentsResponse?.data || [];
      
      // Count users by role
      const usersByRole: Record<string, number> = {};
      users.forEach(user => {
        const role = user.role || 'player';
        usersByRole[role] = (usersByRole[role] || 0) + 1;
      });
      
      // Count active tournaments (ongoing status)
      const activeTournaments = tournaments.filter(t => t.status === 'ongoing').length;
      
      this.stats.set({
        totalUsers: users.length,
        totalTournaments: tournaments.length,
        activeTournaments: activeTournaments,
        usersByRole: usersByRole
      });
      
      this.isLoading.set(false);
    }).catch(error => {
      console.error('Error loading dashboard data:', error);
      // Set empty stats on error
      this.stats.set({
        totalUsers: 0,
        totalTournaments: 0,
        activeTournaments: 0,
        usersByRole: {}
      });
      this.isLoading.set(false);
    });
  }

  private loadUsers(): void {
    this.isLoading.set(true);
    
    this.userService.getAllUsers().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.users.set(response.data);
        } else {
          this.users.set([]);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.users.set([]);
        this.isLoading.set(false);
      }
    });
  }

  private loadTournaments(): void {
    this.isLoading.set(true);
    
    this.tournamentService.getAllTournaments().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Update tournament statuses based on current date
          this.updateTournamentStatuses(response.data);
        } else {
          this.tournaments.set([]);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading tournaments:', error);
        this.tournaments.set([]);
        this.isLoading.set(false);
      }
    });
  }

  private updateTournamentStatuses(tournaments: Tournament[]): void {
    const updatedTournaments: Tournament[] = [];
    let pendingUpdates = tournaments.length;

    if (pendingUpdates === 0) {
      this.tournaments.set([]);
      return;
    }

    tournaments.forEach(tournament => {
      const calculatedStatus = this.tournamentService.calculateTournamentStatus(tournament);
      
      if (calculatedStatus !== tournament.status) {
        // Status needs update - call backend
        this.tournamentService.updateTournamentStatus(tournament.id, calculatedStatus).subscribe({
          next: (updateResponse) => {
            if (updateResponse.success && updateResponse.data) {
              updatedTournaments.push(updateResponse.data);
            } else {
              updatedTournaments.push(tournament);
            }
            
            if (--pendingUpdates === 0) {
              this.tournaments.set(updatedTournaments.sort((a, b) => a.id - b.id));
            }
          },
          error: (error) => {
            console.error('Failed to update tournament status:', error);
            updatedTournaments.push(tournament);
            
            if (--pendingUpdates === 0) {
              this.tournaments.set(updatedTournaments.sort((a, b) => a.id - b.id));
            }
          }
        });
      } else {
        // Status is correct, no update needed
        updatedTournaments.push(tournament);
        
        if (--pendingUpdates === 0) {
          this.tournaments.set(updatedTournaments.sort((a, b) => a.id - b.id));
        }
      }
    });
  }

  // User management actions
  protected promoteUserToAdmin(userId: number): void {
    if (!confirm('¿Estás seguro de que quieres promover este usuario a Administrador?')) {
      return;
    }

    this.userService.updateUser(userId, { role: 'admin' }).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('Usuario promovido a admin exitosamente');
          // Recargar la lista de usuarios
          this.loadUsers();
        } else {
          console.error('Error al promover usuario:', response.message);
          alert('Error al promover usuario: ' + (response.message || 'Error desconocido'));
        }
      },
      error: (error) => {
        console.error('Error al promover usuario:', error);
        alert('Error al conectar con el servidor');
      }
    });
  }

  protected demoteUserToPlayer(userId: number): void {
    if (!confirm('¿Estás seguro de que quieres degradar este usuario a Jugador?')) {
      return;
    }

    this.userService.updateUser(userId, { role: 'player' }).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('Usuario degradado a player exitosamente');
          // Recargar la lista de usuarios
          this.loadUsers();
        } else {
          console.error('Error al degradar usuario:', response.message);
          alert('Error al degradar usuario: ' + (response.message || 'Error desconocido'));
        }
      },
      error: (error) => {
        console.error('Error al degradar usuario:', error);
        alert('Error al conectar con el servidor');
      }
    });
  }

  protected deleteUser(userId: number): void {
    const user = this.users().find(u => u.id === userId);
    const userName = user?.name || 'este usuario';
    
    if (!confirm(`¿Estás seguro de que quieres eliminar a ${userName}? Esta acción no se puede deshacer.`)) {
      return;
    }

    this.userService.deleteUser(userId).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('Usuario eliminado exitosamente');
          // Recargar la lista de usuarios y estadísticas
          this.loadUsers();
          this.loadDashboardData();
        } else {
          console.error('Error al eliminar usuario:', response.message);
          alert('Error al eliminar usuario: ' + (response.message || 'Error desconocido'));
        }
      },
      error: (error) => {
        console.error('Error al eliminar usuario:', error);
        alert('Error al conectar con el servidor');
      }
    });
  }

  // Tournament management actions
  protected deleteTournament(tournamentId: number): void {
    const tournament = this.tournaments().find(t => t.id === tournamentId);
    const confirmMessage = tournament?.status === 'ongoing' 
      ? '¿Estás seguro de que quieres eliminar este torneo EN CURSO? Esta acción no se puede deshacer y eliminará todas las partidas asociadas.'
      : '¿Estás seguro de que quieres eliminar este torneo?';
      
    if (confirm(confirmMessage)) {
      this.tournamentService.deleteTournament(tournamentId).subscribe({
        next: (response) => {
          if (response.success) {
            alert('Torneo eliminado correctamente');
            this.loadTournaments(); // Reload the list
          } else {
            alert('Error al eliminar torneo: ' + (response.message || 'Error desconocido'));
          }
        },
        error: (error) => {
          console.error('Error deleting tournament:', error);
          const errorMsg = error.error?.message || error.message || 'Error al eliminar el torneo';
          alert('Error: ' + errorMsg);
        }
      });
    }
  }

  // Utility methods
  protected getRoleDisplayName(role: string): string {
    return this.rolePermissionService.getRoleDisplayName(role as any);
  }

  protected getRoleDescription(role: string): string {
    return this.rolePermissionService.getRoleDescription(role as any);
  }

  protected formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short', 
      day: 'numeric'
    });
  }
}