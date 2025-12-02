import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TournamentService } from '../../services/tournament.service';
import { AuthService } from '../../services/auth.service';
import { Tournament } from '../../models/tournament.model';

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  private readonly tournamentService = inject(TournamentService);
  protected readonly authService = inject(AuthService);

  // Signals
  protected readonly upcomingTournaments = signal<Tournament[]>([]);
  protected readonly loading = signal(false);

  // How it works steps
  protected readonly steps = [
    {
      number: 1,
      icon: 'tournament',
      title: 'Crea tu torneo',
      description: 'Configura el nombre, fecha y tipo de torneo en minutos'
    },
    {
      number: 2,
      icon: 'players',
      title: 'Inscribe jugadores',
      description: 'Los jugadores se registran fácilmente en tu torneo'
    },
    {
      number: 3,
      icon: 'matches',
      title: 'Gestiona partidas',
      description: 'Registra resultados y consulta rankings en tiempo real'
    }
  ];

  ngOnInit(): void {
    this.loadUpcomingTournaments();
  }

  private loadUpcomingTournaments(): void {
    this.loading.set(true);
    
    this.tournamentService.getUpcomingTournaments().subscribe({
      next: (response) => {
        this.loading.set(false);
        if (response.success && response.data) {
          // Limitar a los primeros 3 torneos
          this.upcomingTournaments.set(response.data.slice(0, 3));
        }
      },
      error: (err) => {
        this.loading.set(false);
        console.error('Error loading upcoming tournaments:', err);
      }
    });
  }

  protected getStepIcon(icon: string): string {
    const icons: Record<string, string> = {
      tournament: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
      players: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
      matches: 'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11'
    };
    return icons[icon] || icons['tournament'];
  }
}
