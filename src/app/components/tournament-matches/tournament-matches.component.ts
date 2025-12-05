import { Component, inject, input, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatchService } from '../../services/match.service';
import { TournamentService } from '../../services/tournament.service';
import { AuthService } from '../../services/auth.service';
import { Match, Tournament, MatchResult, isDeletedUser, isUserDeleted, getUserDisplayName, calculateEstimatedRounds } from '../../models';

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
  private readonly router = inject(Router);
  private readonly matchService = inject(MatchService);
  private readonly tournamentService = inject(TournamentService);
  protected readonly authService = inject(AuthService);

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
    
    if (!tournament || !currentUser) return false;
    
    // Admin can always manage matches
    if (this.authService.isAdmin()) return true;
    
    // Organizer can manage their tournament
    return tournament.createdBy === currentUser.userId;
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

  readonly maxRoundsAllowed = computed(() => {
    const tournament = this.tournament();
    if (!tournament || !tournament.tournamentFormat) return null;
    
    const participantCount = tournament.inscriptions?.length || tournament.maxParticipants || 0;
    if (participantCount < 2) return null;
    
    return calculateEstimatedRounds(tournament.tournamentFormat, participantCount);
  });

  readonly hasReachedMaxRounds = computed(() => {
    const maxRounds = this.maxRoundsAllowed();
    const currentRound = this.getCurrentRoundNumber();
    return maxRounds !== null && currentRound >= maxRounds;
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
    const getPlayerName = (player: any, playerId: number): string => {
      if (isDeletedUser(playerId)) {
        return 'Usuario Eliminado';
      }
      
      // Si el jugador tiene datos pero está marcado como eliminado
      if (player && isUserDeleted(player)) {
        return `Usuario #${player.id} (Eliminado)`;
      }
      
      return player?.name || player?.firstName + ' ' + player?.lastName || `Player ${playerId}`;
    };

    return {
      id: match.id,
      round: match.round,
      table: match.id, // Use match ID as table number
      player1Name: getPlayerName(match.whitePlayer, match.whitePlayerId),
      player1Rating: match.whitePlayer?.elo || match.whitePlayer?.rating || match.whitePlayer?.eloRating || null,
      player2Name: getPlayerName(match.blackPlayer, match.blackPlayerId),
      player2Rating: match.blackPlayer?.elo || match.blackPlayer?.rating || match.blackPlayer?.eloRating || null,
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
  /**
   * Generate matches for the tournament using Swiss pairing system
   */
  async onGenerateMatches(): Promise<void> {
    const tournament = this.tournament();
    if (!tournament) return;

    // Check if max rounds reached
    if (this.hasReachedMaxRounds()) {
      const maxRounds = this.maxRoundsAllowed();
      alert(`❌ No se pueden generar más rondas.\n\nEste torneo en formato ${this.getFormatName(tournament.tournamentFormat)} permite un máximo de ${maxRounds} rondas con ${tournament.inscriptions?.length || 0} participantes.`);
      return;
    }

    const nextRound = this.getNextRoundNumber();
    const maxRounds = this.maxRoundsAllowed();
    const roundInfo = maxRounds ? ` (${nextRound}/${maxRounds})` : '';
    
    if (!confirm(`¿Generar partidas para el torneo "${tournament.name}"?\n\nSe generará la Ronda ${nextRound}${roundInfo} utilizando el sistema ${this.getFormatName(tournament.tournamentFormat)}.`)) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.tournamentService.generateMatches(tournament.id).subscribe({
      next: (response) => {
        if (response.success) {
          alert('✅ Partidas generadas correctamente');
          // Reload matches
          this.loadMatchesFromBackend(tournament.id);
        } else {
          this.error.set(response.message || 'Error al generar partidas');
          this.loading.set(false);
        }
      },
      error: (error) => {
        console.error('Error generating matches:', error);
        let errorMessage = 'Error al generar partidas';
        
        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.status === 400) {
          errorMessage = 'No se pueden generar partidas. Verifica que el torneo tenga suficientes participantes.';
        }
        
        this.error.set(errorMessage);
        alert('❌ ' + errorMessage);
        this.loading.set(false);
      }
    });
  }

  /**
   * Navigate to tournament ranking
   */
  onViewRanking(): void {
    const tournament = this.tournament();
    if (!tournament) return;
    
    this.router.navigate(['/tournaments', tournament.id, 'ranking']);
  }

  /**
   * Navigate back to tournament detail
   */
  onBackToTournament(): void {
    const tournament = this.tournament();
    if (!tournament) return;
    
    this.router.navigate(['/tournaments', tournament.id]);
  }

  /**
   * Check if all results in the current (last) round are complete
   */
  protected allResultsComplete(): boolean {
    const rounds = this.roundsData();
    if (rounds.length === 0) return false;
    
    const lastRound = rounds[rounds.length - 1];
    return lastRound.matches.every(match => match.result !== null && match.result !== undefined);
  }

  /**
   * Check if we can generate the next round
   * - All results from current round must be complete
   * - Tournament must be ongoing
   * - Must not have reached max rounds for the format
   */
  protected canGenerateNextRound(): boolean {
    const tournament = this.tournament();
    if (!tournament) return false;
    
    // Only allow generating rounds for ongoing tournaments
    if (tournament.status !== 'ongoing') return false;
    
    // Check if max rounds reached
    if (this.hasReachedMaxRounds()) return false;
    
    return this.allResultsComplete();
  }

  /**
   * Get the current (last) round number
   */
  protected getCurrentRoundNumber(): number {
    const rounds = this.roundsData();
    return rounds.length > 0 ? rounds[rounds.length - 1].roundNumber : 0;
  }

  /**
   * Get the next round number to be generated
   */
  protected getNextRoundNumber(): number {
    return this.getCurrentRoundNumber() + 1;
  }

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

  private getFormatName(format?: string): string {
    switch (format) {
      case 'swiss': return 'Suizo';
      case 'round_robin': return 'Todos contra todos';
      case 'elimination': return 'Eliminación directa';
      default: return 'Suizo';
    }
  }
}