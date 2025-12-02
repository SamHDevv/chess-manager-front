import { Component, inject, input, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TournamentService } from '../../services/tournament.service';
import { MatchService } from '../../services/match.service';
import { Tournament } from '../../models';

export interface PlayerRanking {
  playerId: number;
  playerName: string;
  playerElo: number;
  points: number;
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
}

@Component({
  selector: 'app-tournament-ranking',
  imports: [CommonModule],
  templateUrl: './tournament-ranking.component.html',
  styleUrl: './tournament-ranking.component.scss'
})
export class TournamentRankingComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tournamentService = inject(TournamentService);
  private readonly matchService = inject(MatchService);

  // Inputs
  readonly tournamentId = input<number>();

  // Signals
  private readonly tournament = signal<Tournament | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  // Rankings from backend
  readonly rankings = signal<PlayerRanking[]>([]);

  // Effect to load data when tournament ID changes
  constructor() {
    effect(() => {
      const tournamentIdFromRoute = this.route.snapshot.paramMap.get('id');
      const tourId = this.tournamentId() || (tournamentIdFromRoute ? parseInt(tournamentIdFromRoute) : null);
      
      if (tourId) {
        this.loadTournamentData(tourId);
      }
    });
  }

  private async loadTournamentData(tourId: number) {
    try {
      this.loading.set(true);
      this.error.set(null);

      // Load tournament and standings from backend
      const [tournament, standings] = await Promise.all([
        this.tournamentService.getTournamentById(tourId).toPromise(),
        this.matchService.getTournamentStandings(tourId).toPromise()
      ]);

      this.tournament.set(tournament?.data || null);
      
      // Backend ya envía los datos completos con playerName y playerElo
      const rankingsData = (standings?.data || []).map(standing => ({
        playerId: standing.playerId,
        playerName: standing.playerName, // Backend ya incluye el nombre
        playerElo: standing.playerElo,
        points: standing.points,
        wins: standing.wins || 0,
        losses: standing.losses || 0,
        draws: standing.draws || 0,
        gamesPlayed: standing.gamesPlayed
      }));

      this.rankings.set(rankingsData);
    } catch (err) {
      console.error('Error loading tournament ranking:', err);
      this.error.set('Error al cargar la clasificación del torneo');
    } finally {
      this.loading.set(false);
    }
  }

  formatPoints(points: number): string {
    return points % 1 === 0 ? points.toString() : points.toString();
  }

  /**
   * Navigate back to tournament detail
   */
  onBackToTournament(): void {
    const tournament = this.tournament();
    if (!tournament) return;
    
    this.router.navigate(['/tournaments', tournament.id]);
  }
}
