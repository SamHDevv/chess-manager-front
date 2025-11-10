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
    const tournament = this.tournament();
    const currentUser = this.authService.currentUser();
    
    // Local check: user must be the tournament creator
    return tournament && currentUser && tournament.createdBy === currentUser.userId;
  });

  readonly roundsData = computed<RoundData[]>(() => {
    const matches = this.allMatches();
    
    // If no real matches loaded yet and still loading, show empty
    if (!matches.length && this.loading()) {
      return [];
    }
    
    // If no matches loaded, return empty array
    if (!matches.length) {
      return [];
    }

    // Group real matches by round
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

      // Load tournament info
      const tournament = await this.tournamentService.getTournamentById(tourId).toPromise();
      this.tournament.set(tournament?.data || null);
      
      // Load real matches from backend
      this.loadMatchesFromBackend(tourId);
      
    } catch (err) {
      console.error('Error loading tournament matches:', err);
      this.error.set('Error al cargar las partidas del torneo');
      this.loading.set(false);
    }
  }

  /**
   * Load matches from backend
   */
  private loadMatchesFromBackend(tournamentId: number): void {
    this.matchService.getMatchesByTournamentId(tournamentId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Convert backend matches to SimpleMatch format
          const simpleMatches = response.data.map(this.convertToSimpleMatch.bind(this));
          this.allMatches.set(simpleMatches);
        } else {
          this.error.set('Error al cargar las partidas');
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading matches:', error);
        this.error.set('Error al cargar las partidas');
        this.loading.set(false);
      }
    });
  }

  /**
   * Convert backend Match to SimpleMatch
   */
  private convertToSimpleMatch(match: Match): SimpleMatch {
    return {
      id: match.id,
      round: match.round,
      table: match.id, // Use match ID as table number
      player1Name: match.whitePlayer?.name || match.whitePlayer?.firstName + ' ' + match.whitePlayer?.lastName || `Player ${match.whitePlayerId}`,
      player1Rating: match.whitePlayer?.rating || match.whitePlayer?.eloRating,
      player2Name: match.blackPlayer?.name || match.blackPlayer?.firstName + ' ' + match.blackPlayer?.lastName || `Player ${match.blackPlayerId}`,
      player2Rating: match.blackPlayer?.rating || match.blackPlayer?.eloRating,
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
    
    if (backendResult === null && result !== null) {
      console.error('Invalid result format:', result);
      this.savingResult.set(false);
      return;
    }

    // Real API call to update match result
    this.matchService.updateMatchResult(match.id, backendResult!).subscribe({
      next: (response) => {
        if (response.success) {
          this.updateLocalMatch(match, result);
          console.log('Match result updated successfully');
        } else {
          console.error('Failed to update match result:', response.message);
        }
        this.savingResult.set(false);
      },
      error: (error) => {
        console.error('Failed to update match result:', error);
        this.savingResult.set(false);
      }
    });
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