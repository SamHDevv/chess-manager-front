import { Component, inject, input, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { TournamentService } from '../../services/tournament.service';
import { MatchService } from '../../services/match.service';
import { UserService } from '../../services/user.service';
import { Tournament, Match, MatchResult, User, DELETED_USER_ID, isDeletedUser, isUserDeleted, getUserDisplayName } from '../../models';

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
  private readonly tournamentService = inject(TournamentService);
  private readonly matchService = inject(MatchService);
  private readonly userService = inject(UserService);

  // Inputs
  readonly tournamentId = input<number>();

  // Signals
  private readonly tournament = signal<Tournament | null>(null);
  private readonly matches = signal<Match[]>([]);
  private readonly users = signal<Map<number, User>>(new Map());
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

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

      const usersMap = this.users();
      const user = usersMap.get(playerId);
      const playerElo = user?.elo || 0;

      return {
        playerId,
        playerName: isDeletedUser(playerId) 
          ? `Usuario #${playerId} (Eliminado)` 
          : user?.name || `Player ${playerId}`,
        playerElo,
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

  private async loadTournamentData(tourId: number) {
    try {
      this.loading.set(true);
      this.error.set(null);

      // Load tournament and matches in parallel
      const [tournament, matches] = await Promise.all([
        this.tournamentService.getTournamentById(tourId).toPromise(),
        this.matchService.getMatchesByTournamentId(tourId).toPromise()
      ]);

      this.tournament.set(tournament?.data || null);
      this.matches.set(matches?.data || []);

      // Get unique player IDs from matches
      const playerIds = new Set<number>();
      (matches?.data || []).forEach(match => {
        playerIds.add(match.whitePlayerId);
        playerIds.add(match.blackPlayerId);
      });

      // Load all users data
      const usersMap = new Map<number, User>();
      await Promise.all(
        Array.from(playerIds).map(async playerId => {
          if (!isDeletedUser(playerId)) {
            try {
              const userResponse = await this.userService.getUserById(playerId).toPromise();
              if (userResponse?.data) {
                usersMap.set(playerId, userResponse.data);
              }
            } catch (error) {
              console.error(`Error loading user ${playerId}:`, error);
            }
          }
        })
      );

      this.users.set(usersMap);
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