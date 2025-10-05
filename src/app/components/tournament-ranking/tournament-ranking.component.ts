import { Component, inject, input, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { TournamentService } from '../../services/tournament.service';
import { MatchService } from '../../services/match.service';
import { Tournament, Match, MatchResult } from '../../models';

export interface PlayerRanking {
  playerId: number;
  playerName: string;
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
export class TournamentRankingComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly tournamentService = inject(TournamentService);
  private readonly matchService = inject(MatchService);

  // Inputs
  readonly tournamentId = input<number>();

  // Signals
  private readonly tournament = signal<Tournament | null>(null);
  private readonly matches = signal<Match[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  // Computed rankings
  readonly rankings = computed<PlayerRanking[]>(() => {
    const tournamentMatches = this.matches();
    if (!tournamentMatches.length) return [];

    // Get all unique player IDs
    const playerIds = new Set<number>();
    tournamentMatches.forEach(match => {
      playerIds.add(match.whitePlayerId);
      playerIds.add(match.blackPlayerId);
    });

    // Calculate stats for each player
    const playerStats = Array.from(playerIds).map(playerId => {
      let points = 0;
      let wins = 0;
      let losses = 0;
      let draws = 0;
      let gamesPlayed = 0;

      tournamentMatches.forEach(match => {
        if (match.whitePlayerId === playerId || match.blackPlayerId === playerId) {
          if (match.result && match.result !== MatchResult.NOT_STARTED && match.result !== MatchResult.ONGOING) {
            gamesPlayed++;
            
            if (match.whitePlayerId === playerId) {
              // Player is white
              switch (match.result) {
                case MatchResult.WHITE_WINS:
                  wins++;
                  points += 1;
                  break;
                case MatchResult.BLACK_WINS:
                  losses++;
                  break;
                case MatchResult.DRAW:
                  draws++;
                  points += 0.5;
                  break;
              }
            } else {
              // Player is black
              switch (match.result) {
                case MatchResult.BLACK_WINS:
                  wins++;
                  points += 1;
                  break;
                case MatchResult.WHITE_WINS:
                  losses++;
                  break;
                case MatchResult.DRAW:
                  draws++;
                  points += 0.5;
                  break;
              }
            }
          }
        }
      });

      return {
        playerId,
        playerName: `Player ${playerId}`, // Placeholder - would normally come from user service
        points,
        wins,
        losses,
        draws,
        gamesPlayed
      };
    });

    // Sort by points (descending), then by wins (descending)
    return playerStats.sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      return b.wins - a.wins;
    });
  });

  async ngOnInit() {
    try {
      this.loading.set(true);
      this.error.set(null);

      // Get tournament ID from route or input
      const tournamentIdFromRoute = this.route.snapshot.paramMap.get('id');
      const tourId = this.tournamentId() || (tournamentIdFromRoute ? parseInt(tournamentIdFromRoute) : null);
      
      if (!tourId) {
        throw new Error('Tournament ID not found');
      }

      // Load tournament and matches in parallel
      const [tournament, matches] = await Promise.all([
        this.tournamentService.getTournamentById(tourId).toPromise(),
        this.matchService.getMatchesByTournamentId(tourId).toPromise()
      ]);

      this.tournament.set(tournament?.data || null);
      this.matches.set(matches?.data || []);
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
}