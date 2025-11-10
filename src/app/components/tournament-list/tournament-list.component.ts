import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TournamentService } from '../../services/tournament.service';
import { AuthService } from '../../services/auth.service';
import { Tournament, TournamentStatus } from '../../models/tournament.model';

@Component({
  selector: 'app-tournament-list',
  imports: [CommonModule, RouterLink],
  templateUrl: './tournament-list.component.html',
  styleUrl: './tournament-list.component.scss'
})
export class TournamentListComponent implements OnInit {
  private readonly tournamentService = inject(TournamentService);
  protected readonly authService = inject(AuthService);

  // Signals for state management
  protected readonly tournaments = signal<Tournament[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly selectedFilter = signal<'all' | 'upcoming' | 'ongoing'>('all');

  // Computed values
  protected readonly upcomingTournaments = computed(() =>
    this.tournaments().filter(t => t.status === TournamentStatus.UPCOMING)
  );

  protected readonly ongoingTournaments = computed(() =>
    this.tournaments().filter(t => t.status === TournamentStatus.ONGOING)
  );

  protected readonly filteredTournaments = computed(() => {
    const filter = this.selectedFilter();
    const allTournaments = this.tournaments();

    switch (filter) {
      case 'upcoming':
        return this.upcomingTournaments();
      case 'ongoing':
        return this.ongoingTournaments();
      default:
        return allTournaments;
    }
  });

  ngOnInit(): void {
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

  protected formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
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