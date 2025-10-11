import { Component, inject, input, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatchService } from '../../services/match.service';
import { TournamentService } from '../../services/tournament.service';
import { AuthService } from '../../services/auth.service';
import { Match, Tournament, MatchResult } from '../../models';

export interface SimpleMatch {
  id: number;
  round: number;
  table: number;
  player1Name: string;
  player1Rating?: number;
  player2Name: string;
  player2Rating?: number;
  result?: '1-0' | '0-1' | '½-½' | null;
  status: 'pending' | 'in-progress' | 'completed';
  scheduledTime?: string;
}

export interface RoundData {
  roundNumber: number;
  matches: SimpleMatch[];
}

@Component({
  selector: 'app-tournament-matches',
  imports: [CommonModule, FormsModule],
  templateUrl: './tournament-matches.component.html',
  styleUrl: './tournament-matches.component.scss'
})
export class TournamentMatchesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly matchService = inject(MatchService);
  private readonly tournamentService = inject(TournamentService);
  private readonly authService = inject(AuthService);

  // Inputs
  readonly tournamentId = input<number>();

  // Signals
  private readonly allMatches = signal<SimpleMatch[]>([]);
  private readonly tournament = signal<Tournament | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly savingResult = signal(false);

  // Computed signals
  readonly isOrganizer = computed(() => {
    // TODO: Replace with actual tournament organizer check
    // When backend is ready, use:
    // const tournament = this.tournament();
    // const currentUser = this.authService.currentUser();
    // return tournament?.createdBy === currentUser?.userId;
    
    // For demonstration purposes, return true if user is logged in
    const currentUser = this.authService.currentUser();
    return !!currentUser;
  });

  readonly roundsData = computed<RoundData[]>(() => {
    const matches = this.allMatches();
    if (!matches.length) return this.generateMockMatches();

    // Group matches by round
    const roundsMap = new Map<number, SimpleMatch[]>();
    
    matches.forEach(match => {
      const roundNum = match.round || 1;
      if (!roundsMap.has(roundNum)) {
        roundsMap.set(roundNum, []);
      }
      roundsMap.get(roundNum)!.push(match);
    });

    // Convert to array and sort by round number
    return Array.from(roundsMap.entries())
      .map(([roundNumber, matches]) => ({
        roundNumber,
        matches: matches.sort((a, b) => a.id - b.id)
      }))
      .sort((a, b) => a.roundNumber - b.roundNumber);
  });

  // Generate mock data for demonstration
  private generateMockMatches(): RoundData[] {
    return [
      {
        roundNumber: 1,
        matches: [
          {
            id: 1,
            round: 1,
            table: 1,
            player1Name: 'Liam',
            player1Rating: 1800,
            player2Name: 'Sophia',
            player2Rating: 1750,
            result: '1-0',
            status: 'completed'
          },
          {
            id: 2,
            round: 1,
            table: 2,
            player1Name: 'Ethan',
            player1Rating: 1780,
            player2Name: 'Olivia',
            player2Rating: 1760,
            result: '½-½',
            status: 'completed'
          },
          {
            id: 3,
            round: 1,
            table: 3,
            player1Name: 'Noah',
            player1Rating: 1740,
            player2Name: 'Ava',
            player2Rating: 1720,
            result: '0-1',
            status: 'completed'
          }
        ]
      },
      {
        roundNumber: 2,
        matches: [
          {
            id: 4,
            round: 2,
            table: 1,
            player1Name: 'Liam',
            player1Rating: 1800,
            player2Name: 'Ava',
            player2Rating: 1720,
            result: null,
            status: 'pending'
          },
          {
            id: 5,
            round: 2,
            table: 2,
            player1Name: 'Ethan',
            player1Rating: 1780,
            player2Name: 'Sophia',
            player2Rating: 1750,
            result: null,
            status: 'pending'
          },
          {
            id: 6,
            round: 2,
            table: 3,
            player1Name: 'Olivia',
            player1Rating: 1760,
            player2Name: 'Noah',
            player2Rating: 1740,
            result: null,
            status: 'pending'
          }
        ]
      }
    ];
  }

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

      // For now, just load tournament info and use mock data for matches
      const tournament = await this.tournamentService.getTournamentById(tourId).toPromise();
      this.tournament.set(tournament?.data || null);
      
      // Mock matches will be generated by the computed signal
      this.allMatches.set([]);
      
    } catch (err) {
      console.error('Error loading tournament matches:', err);
      this.error.set('Error al cargar las partidas del torneo');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * TODO: Load matches from backend when API is available
   */
  private loadMatchesFromBackend(tournamentId: number): void {
    // this.matchService.getMatchesByTournamentId(tournamentId).subscribe({
    //   next: (response) => {
    //     if (response.success) {
    //       // Convert backend matches to SimpleMatch format
    //       const simpleMatches = response.data.map(this.convertToSimpleMatch.bind(this));
    //       this.allMatches.set(simpleMatches);
    //     } else {
    //       this.error.set('Error al cargar las partidas');
    //     }
    //     this.loading.set(false);
    //   },
    //   error: (error) => {
    //     this.error.set('Error al cargar las partidas');
    //     this.loading.set(false);
    //   }
    // });
  }

  /**
   * TODO: Convert backend Match to SimpleMatch when backend is ready
   */
  private convertToSimpleMatch(match: Match): SimpleMatch {
    return {
      id: match.id,
      round: match.round,
      table: match.id, // Use match ID as table number for now
      player1Name: match.whitePlayer?.name || `Player ${match.whitePlayerId}`,
      player1Rating: match.whitePlayer?.rating,
      player2Name: match.blackPlayer?.name || `Player ${match.blackPlayerId}`,
      player2Rating: match.blackPlayer?.rating,
      result: this.mapBackendResultToFrontend(match.result),
      status: this.mapBackendStatusToFrontend(match.result)
    };
  }

  /**
   * Maps backend MatchResult to frontend result format
   */
  private mapBackendResultToFrontend(result: MatchResult): '1-0' | '0-1' | '½-½' | null {
    switch (result) {
      case MatchResult.WHITE_WINS: return '1-0';
      case MatchResult.BLACK_WINS: return '0-1';
      case MatchResult.DRAW: return '½-½';
      default: return null;
    }
  }

  /**
   * Maps backend MatchResult to frontend status
   */
  private mapBackendStatusToFrontend(result: MatchResult): 'pending' | 'completed' | 'in-progress' {
    switch (result) {
      case MatchResult.ONGOING: return 'in-progress';
      case MatchResult.WHITE_WINS:
      case MatchResult.BLACK_WINS:
      case MatchResult.DRAW: return 'completed';
      default: return 'pending';
    }
  }

  // Helper methods
  getResultDisplay(result: string | null | undefined): string {
    return result || '-';
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

  // Organizer methods
  onResultChange(event: Event, match: SimpleMatch): void {
    const target = event.target as HTMLSelectElement;
    const result = target.value || null;
    this.updateMatchResult(match, result);
  }

  /**
   * Maps frontend result format to backend MatchResult enum
   */
  private mapResultToBackend(result: string | null): MatchResult | null {
    if (!result) return null;
    
    switch (result) {
      case '1-0': return MatchResult.WHITE_WINS;
      case '0-1': return MatchResult.BLACK_WINS;
      case '½-½': return MatchResult.DRAW;
      default: return null;
    }
  }

  updateMatchResult(match: SimpleMatch, result: string | null): void {
    if (!this.isOrganizer()) {
      console.warn('Only organizer can update match results');
      return;
    }

    this.savingResult.set(true);
    
    // Map result to backend format
    const backendResult = this.mapResultToBackend(result);
    
    // TODO: Replace with actual API call when backend is ready
    // this.matchService.updateMatchResult(match.id, backendResult).subscribe({
    //   next: (response) => {
    //     if (response.success) {
    //       this.updateLocalMatch(match, result);
    //       console.log('Match result updated successfully');
    //     }
    //     this.savingResult.set(false);
    //   },
    //   error: (error) => {
    //     console.error('Failed to update match result:', error);
    //     this.savingResult.set(false);
    //   }
    // });

    // Temporary: Update local data and simulate API call
    this.updateLocalMatch(match, result);
    setTimeout(() => {
      this.savingResult.set(false);
      console.log(`Match ${match.id} result updated to: ${result} (Backend: ${backendResult})`);
    }, 500);
  }

  /**
   * Updates match in local data
   */
  private updateLocalMatch(match: SimpleMatch, result: string | null): void {
    const rounds = this.roundsData();
    const roundData = rounds.find(r => r.roundNumber === match.round);
    if (roundData) {
      const matchToUpdate = roundData.matches.find(m => m.id === match.id);
      if (matchToUpdate) {
        matchToUpdate.result = result as '1-0' | '0-1' | '½-½' | null;
        matchToUpdate.status = result ? 'completed' : 'pending';
        
        // Force update by creating new array
        this.allMatches.set([...this.allMatches()]);
      }
    }
  }

  canEditMatch(match: SimpleMatch): boolean {
    return !!this.isOrganizer() && !this.savingResult();
  }
}