import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TournamentService } from '../../services/tournament.service';
import { AuthService } from '../../services/auth.service';
import { Tournament, TournamentStatus, TournamentFormat, calculateEstimatedRounds } from '../../models/tournament.model';

@Component({
  selector: 'app-tournament-list',
  imports: [CommonModule, RouterLink],
  templateUrl: './tournament-list.component.html',
  styleUrl: './tournament-list.component.scss'
})
export class TournamentListComponent {
  private readonly tournamentService = inject(TournamentService);
  protected readonly authService = inject(AuthService);

  // Signals for state management
  protected readonly tournaments = signal<Tournament[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly selectedFilter = signal<'all' | 'upcoming' | 'ongoing'>('all');
  protected readonly searchQuery = signal<string>('');

  // Computed values
  protected readonly upcomingTournaments = computed(() =>
    this.tournaments().filter(t => t.status === TournamentStatus.UPCOMING)
  );

  protected readonly ongoingTournaments = computed(() =>
    this.tournaments().filter(t => t.status === TournamentStatus.ONGOING)
  );

  protected readonly filteredTournaments = computed(() => {
    const filter = this.selectedFilter();
    const query = this.searchQuery().toLowerCase().trim();
    let allTournaments = this.tournaments();

    // Apply status filter
    switch (filter) {
      case 'upcoming':
        allTournaments = this.upcomingTournaments();
        break;
      case 'ongoing':
        allTournaments = this.ongoingTournaments();
        break;
    }

    // Apply search filter
    if (query) {
      return allTournaments.filter(t => 
        t.name.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.location.toLowerCase().includes(query)
      );
    }

    return allTournaments;
  });

  constructor() {
    // Load tournaments on initialization
    this.loadTournaments();
  }

  protected loadTournaments(): void {
    this.loading.set(true);
    this.error.set(null);

    this.tournamentService.getAllTournaments().subscribe({
      next: (response) => {
        this.loading.set(false);
        if (response.success && response.data) {
          // Update tournament statuses based on current date
          this.updateTournamentStatuses(response.data);
        } else {
          this.error.set(response.message || 'Error desconocido');
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set('Error de conexión con el servidor');
        console.error('Error loading tournaments:', err);
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

  protected setFilter(filter: 'all' | 'upcoming' | 'ongoing'): void {
    this.selectedFilter.set(filter);
  }

  protected onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  protected formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  protected getTournamentFormatLabel(format?: TournamentFormat): string {
    if (!format) return 'Suizo';
    switch (format) {
      case TournamentFormat.SWISS:
        return 'Suizo';
      case TournamentFormat.ROUND_ROBIN:
        return 'Todos contra todos';
      case TournamentFormat.ELIMINATION:
        return 'Eliminación directa';
      default:
        return 'Suizo';
    }
  }

  protected getEffectiveStatus(tournament: Tournament): TournamentStatus {
    // Si el torneo está ongoing, verificar si ya completó todas las rondas
    if (tournament.status === TournamentStatus.ONGOING && tournament.matches && tournament.tournamentFormat) {
      const participantCount = tournament.inscriptions?.length || tournament.maxParticipants || 0;
      
      if (participantCount >= 2) {
        const maxRounds = calculateEstimatedRounds(tournament.tournamentFormat, participantCount);
        const rounds = tournament.matches.map((m: any) => m.round || 0);
        const currentRound = rounds.length > 0 ? Math.max(...rounds) : 0;
        
        if (currentRound >= maxRounds) {
          return TournamentStatus.FINISHED;
        }
      }
    }
    
    return tournament.status;
  }

  protected getStatusLabel(status: TournamentStatus): string {
    const labels = {
      [TournamentStatus.UPCOMING]: 'Próximo',
      [TournamentStatus.ONGOING]: 'En curso',
      [TournamentStatus.FINISHED]: 'Finalizado',
      [TournamentStatus.CANCELLED]: 'Cancelado'
    };
    return labels[status] || status;
  }
}