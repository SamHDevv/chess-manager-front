import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { RolePermissionService } from '../../services/role-permission.service';
import { UserService } from '../../services/user.service';
import { TournamentService } from '../../services/tournament.service';
import { User, UserRole } from '../../models/user.model';
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
    
    // Load basic stats (mock data for now)
    // TODO: Replace with actual API calls
    setTimeout(() => {
      this.stats.set({
        totalUsers: 150,
        totalTournaments: 25,
        activeTournaments: 8,
        usersByRole: {
          'player': 145,
          'admin': 5
        }
      });
      this.isLoading.set(false);
    }, 1000);
  }

  private loadUsers(): void {
    this.isLoading.set(true);
    
    // TODO: Replace with actual UserService call
    // this.userService.getAllUsers().subscribe({
    //   next: (users) => {
    //     this.users.set(users);
    //     this.isLoading.set(false);
    //   },
    //   error: (error) => {
    //     console.error('Error loading users:', error);
    //     this.isLoading.set(false);
    //   }
    // });

    // Mock data for now
    setTimeout(() => {
      this.users.set([
        {
          id: 1,
          email: 'demo@test.com',
          name: 'Demo User',
          role: 'player'
        },
        {
          id: 2,
          email: 'admin@test.com', 
          name: 'Admin User',
          role: 'admin'
        }
      ] as User[]);
      this.isLoading.set(false);
    }, 800);
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
    // TODO: Implement promote user API call
    console.log('Promoting user to admin:', userId);
    // this.userService.updateUserRole(userId, 'admin').subscribe({...});
  }

  protected demoteUserToPlayer(userId: number): void {
    // TODO: Implement demote user API call
    console.log('Demoting user to player:', userId);
    // this.userService.updateUserRole(userId, 'player').subscribe({...});
  }

  protected deleteUser(userId: number): void {
    if (confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
      // TODO: Implement delete user API call
      console.log('Deleting user:', userId);
      // this.userService.deleteUser(userId).subscribe({...});
    }
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