import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PlayerService, Player } from '../../services/player.service';
import { MatchService } from '../../services/match.service';
import { InscriptionService } from '../../services/inscription.service';
import { AuthService } from '../../services/auth.service';
import { Match } from '../../models/match.model';
import { Inscription } from '../../models/inscription.model';

interface PlayerStats {
  totalMatches: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  totalTournaments: number;
  activeTournaments: number;
}

@Component({
  selector: 'app-player-detail',
  imports: [CommonModule, RouterLink],
  templateUrl: './player-detail.component.html',
  styleUrl: './player-detail.component.scss'
})
export class PlayerDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly playerService = inject(PlayerService);
  private readonly matchService = inject(MatchService);
  private readonly inscriptionService = inject(InscriptionService);
  protected readonly authService = inject(AuthService);

  // Signals
  protected readonly player = signal<Player | null>(null);
  protected readonly matches = signal<Match[]>([]);
  protected readonly inscriptions = signal<Inscription[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  // Computed stats
  protected readonly stats = computed((): PlayerStats => {
    const playerMatches = this.matches();
    const playerId = this.player()?.id;

    if (!playerId) {
      return {
        totalMatches: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        totalTournaments: 0,
        activeTournaments: 0
      };
    }

    let wins = 0;
    let losses = 0;
    let draws = 0;

    playerMatches.forEach(match => {
      if (match.result === 'draw') {
        draws++;
      } else if (match.result === 'white_wins') {
        if (match.whitePlayerId === playerId) wins++;
        else losses++;
      } else if (match.result === 'black_wins') {
        if (match.blackPlayerId === playerId) wins++;
        else losses++;
      }
    });

    const totalMatches = wins + losses + draws;
    const winRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;
    const allInscriptions = this.inscriptions();

    return {
      totalMatches,
      wins,
      losses,
      draws,
      winRate,
      totalTournaments: allInscriptions.length,
      activeTournaments: allInscriptions.length
    };
  });

  protected readonly recentMatches = computed(() => {
    return this.matches().slice(0, 5);
  });

  constructor() {
    // Load player data when route params change
    effect(() => {
      const playerId = this.route.snapshot.paramMap.get('id');
      if (playerId) {
        this.loadPlayerData(+playerId);
      } else {
        this.error.set('ID de jugador inválido');
        this.loading.set(false);
      }
    });
  }

  private loadPlayerData(playerId: number): void {
    this.loading.set(true);
    this.error.set(null);

    // Load player info
    this.playerService.getPlayerById(playerId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.player.set(response.data);
          this.loadMatchesAndInscriptions(playerId);
        } else {
          this.error.set('Jugador no encontrado');
          this.loading.set(false);
        }
      },
      error: (err) => {
        this.error.set('Error al cargar el jugador');
        this.loading.set(false);
        console.error('Error loading player:', err);
      }
    });
  }

  private loadMatchesAndInscriptions(playerId: number): void {
    // Load matches
    this.matchService.getMatchesByPlayerId(playerId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.matches.set(response.data);
        }
      },
      error: (err) => {
        console.error('Error loading matches:', err);
      }
    });

    // Load inscriptions
    this.inscriptionService.getInscriptionsByUserId(playerId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.inscriptions.set(response.data);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading inscriptions:', err);
        this.loading.set(false);
      }
    });
  }

  protected goBack(): void {
    this.router.navigate(['/players']);
  }

  protected getRoleLabel(role: string): string {
    return role === 'admin' ? 'Administrador' : 'Jugador';
  }

  protected getRoleClass(role: string): string {
    return role === 'admin' ? 'role-admin' : 'role-player';
  }

  protected getMatchResult(match: Match): string {
    const playerId = this.player()?.id;
    if (!playerId) return 'N/A';

    if (match.result === 'draw') return 'Empate';
    if (match.result === 'ongoing' || match.result === 'not_started') return 'Pendiente';

    const isWhite = match.whitePlayerId === playerId;
    const won = (match.result === 'white_wins' && isWhite) || (match.result === 'black_wins' && !isWhite);

    return won ? 'Victoria' : 'Derrota';
  }

  protected getMatchResultClass(match: Match): string {
    const playerId = this.player()?.id;
    if (!playerId) return '';

    if (match.result === 'draw') return 'result-draw';
    if (match.result === 'ongoing' || match.result === 'not_started') return 'result-pending';

    const isWhite = match.whitePlayerId === playerId;
    const won = (match.result === 'white_wins' && isWhite) || (match.result === 'black_wins' && !isWhite);

    return won ? 'result-win' : 'result-loss';
  }
}
