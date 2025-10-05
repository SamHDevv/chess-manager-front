import { Component, inject, input, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatchService } from '../../services/match.service';
import { TournamentService } from '../../services/tournament.service';
import { Match, Tournament, MatchResult } from '../../models';

export interface MatchWithPlayers extends Match {
  whitePlayerName?: string;
  blackPlayerName?: string;
}

export interface RoundMatches {
  roundNumber: number;
  matches: MatchWithPlayers[];
}

@Component({
  selector: 'app-tournament-matches',
  imports: [CommonModule],
  templateUrl: './tournament-matches.component.html',
  styleUrl: './tournament-matches.component.scss'
})
export class TournamentMatchesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly matchService = inject(MatchService);
  private readonly tournamentService = inject(TournamentService);

  // Inputs
  readonly tournamentId = input<number>();

  // Signals
  private readonly allMatches = signal<Match[]>([]);
  private readonly tournament = signal<Tournament | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  // Computed signals
  readonly roundsData = computed<RoundMatches[]>(() => {
    const matches = this.allMatches();
    if (!matches.length) return [];

    // Group matches by round
    const roundsMap = new Map<number, MatchWithPlayers[]>();
    
    matches.forEach(match => {
      const roundNum = match.round || 1;
      if (!roundsMap.has(roundNum)) {
        roundsMap.set(roundNum, []);
      }
      
      // Add player names (this would normally come from a join query)
      const matchWithPlayers: MatchWithPlayers = {
        ...match,
        whitePlayerName: `Player ${match.whitePlayerId}`, // Placeholder
        blackPlayerName: `Player ${match.blackPlayerId}`, // Placeholder
      };
      
      roundsMap.get(roundNum)!.push(matchWithPlayers);
    });

    // Convert to array and sort by round number
    return Array.from(roundsMap.entries())
      .map(([roundNumber, matches]) => ({
        roundNumber,
        matches: matches.sort((a, b) => (a.id || 0) - (b.id || 0))
      }))
      .sort((a, b) => a.roundNumber - b.roundNumber);
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
      this.allMatches.set(matches?.data || []);
    } catch (err) {
      console.error('Error loading tournament matches:', err);
      this.error.set('Error al cargar las partidas del torneo');
    } finally {
      this.loading.set(false);
    }
  }

  getMatchResult(match: MatchWithPlayers): string {
    if (!match.result) return '-';
    
    switch (match.result) {
      case MatchResult.WHITE_WINS: return '1-0';
      case MatchResult.BLACK_WINS: return '0-1';
      case MatchResult.DRAW: return '½-½';
      default: return '-';
    }
  }

  getMatchStatus(match: MatchWithPlayers): 'pending' | 'completed' | 'in-progress' {
    if (match.result && match.result !== MatchResult.NOT_STARTED && match.result !== MatchResult.ONGOING) {
      return 'completed';
    }
    if (match.result === MatchResult.ONGOING) {
      return 'in-progress';
    }
    return 'pending';
  }

  getStatusText(status: 'pending' | 'completed' | 'in-progress'): string {
    switch (status) {
      case 'completed': return 'Finalizada';
      case 'in-progress': return 'En curso';
      case 'pending': return 'Pendiente';
    }
  }

  getStatusClass(status: 'pending' | 'completed' | 'in-progress'): string {
    switch (status) {
      case 'completed': return 'status-completed';
      case 'in-progress': return 'status-in-progress';
      case 'pending': return 'status-pending';
    }
  }
}