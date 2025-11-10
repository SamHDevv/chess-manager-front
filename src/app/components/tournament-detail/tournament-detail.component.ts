import { Component, input, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { TournamentService } from '../../services/tournament.service';
import { InscriptionService } from '../../services/inscription.service';
import { AuthService } from '../../services/auth.service';
import { Tournament, TournamentStatus } from '../../models/tournament.model';
import { User } from '../../models/user.model';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-tournament-detail',
  imports: [CommonModule],
  templateUrl: './tournament-detail.component.html',
  styleUrl: './tournament-detail.component.scss'
})
export class TournamentDetailComponent implements OnInit {
  // Dependencies
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly tournamentService = inject(TournamentService);
  private readonly inscriptionService = inject(InscriptionService);
  protected readonly authService = inject(AuthService);

  // State signals
  protected readonly tournament = signal<Tournament | null>(null);
  protected readonly participants = signal<User[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly inscriptionLoading = signal(false);
  protected readonly userInscribed = signal(false);

  // Computed values
  protected readonly canInscribe = computed(() => {
    const tournament = this.tournament();
    const isAuthenticated = this.authService.isAuthenticated();
    if (!tournament || !isAuthenticated) return false;
    
    return tournament.status === 'upcoming' && 
           !this.userInscribed() &&
           (!tournament.maxParticipants || this.participants().length < tournament.maxParticipants) &&
           (!tournament.registrationDeadline || new Date(tournament.registrationDeadline) > new Date());
  });

  protected readonly spotsLeft = computed(() => {
    const tournament = this.tournament();
    if (!tournament || !tournament.maxParticipants) return null;
    return tournament.maxParticipants - this.participants().length;
  });

  protected readonly isRegistrationClosed = computed(() => {
    const tournament = this.tournament();
    if (!tournament || !tournament.registrationDeadline) return false;
    return new Date(tournament.registrationDeadline) <= new Date();
  });

  ngOnInit() {
    // Get tournament ID from route parameters
    const tournamentId = this.route.snapshot.paramMap.get('id');
    if (tournamentId) {
      this.loadTournamentDetails(+tournamentId);
    } else {
      this.error.set('ID de torneo no válido');
    }
  }

  private async loadTournamentDetails(tournamentId: number) {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Load tournament details using firstValueFrom instead of toPromise
      const tournamentResponse = await firstValueFrom(
        this.tournamentService.getTournamentById(tournamentId)
      );
      
      if (tournamentResponse?.success && tournamentResponse.data) {
        this.tournament.set(tournamentResponse.data);
        
        // Load participants
        await this.loadParticipants(tournamentId);
        
        // Check if current user is inscribed
        await this.checkUserInscription(tournamentId);
      } else {
        this.error.set(tournamentResponse?.message || 'Error al cargar el torneo');
      }
    } catch (error) {
      console.error('Error loading tournament:', error);
      this.error.set('Error al conectar con el servidor');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadParticipants(tournamentId: number) {
    try {
      const inscriptionsResponse = await firstValueFrom(
        this.inscriptionService.getInscriptionsByTournamentId(tournamentId)
      );
      
      if (inscriptionsResponse?.success && inscriptionsResponse.data) {
        // Extract users from inscriptions
        const users = inscriptionsResponse.data.map((inscription: any) => inscription.user).filter(Boolean);
        this.participants.set(users);
      }
    } catch (error) {
      console.error('Error loading participants:', error);
    }
  }

  private async checkUserInscription(tournamentId: number) {
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      this.userInscribed.set(false);
      return;
    }

    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      this.userInscribed.set(false);
      return;
    }

    try {
      // Get user's inscriptions to check if they're already registered
      const inscriptionsResponse = await firstValueFrom(
        this.inscriptionService.getInscriptionsByUserId(currentUser.userId)
      );
      
      if (inscriptionsResponse?.success && inscriptionsResponse.data) {
        // Check if user is inscribed in this tournament
        const isInscribed = inscriptionsResponse.data.some(
          (inscription: any) => inscription.tournamentId === tournamentId
        );
        this.userInscribed.set(isInscribed);
      } else {
        this.userInscribed.set(false);
      }
    } catch (error) {
      console.error('Error checking user inscription:', error);
      this.userInscribed.set(false);
    }
  }

  async onInscribe() {
    const tournament = this.tournament();
    if (!tournament || !this.canInscribe()) return;

    // Check authentication
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: this.router.url } 
      });
      return;
    }

    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      this.error.set('Error de autenticación. Por favor, inicia sesión nuevamente.');
      return;
    }

    this.inscriptionLoading.set(true);
    this.error.set(null);

    try {
      const response = await firstValueFrom(
        this.inscriptionService.createInscription({ 
          userId: currentUser.userId, 
          tournamentId: tournament.id 
        })
      );
      
      if (response?.success) {
        this.userInscribed.set(true);
        // Reload participants to show updated count
        await this.loadParticipants(tournament.id);
      } else {
        this.error.set(response?.message || 'Error al inscribirse en el torneo');
      }
    } catch (error: any) {
      console.error('Error inscribing in tournament:', error);
      this.error.set(
        error?.error?.message || 
        error?.message || 
        'Error al conectar con el servidor'
      );
    } finally {
      this.inscriptionLoading.set(false);
    }
  }

  async onCancelInscription() {
    const tournament = this.tournament();
    if (!tournament || !this.userInscribed()) return;

    // Check authentication
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      this.error.set('Error de autenticación. Por favor, inicia sesión nuevamente.');
      return;
    }

    this.inscriptionLoading.set(true);
    this.error.set(null);

    try {
      const response = await firstValueFrom(
        this.inscriptionService.cancelInscriptionByUserAndTournament(
          currentUser.userId, 
          tournament.id
        )
      );
      
      if (response?.success) {
        this.userInscribed.set(false);
        // Reload participants to show updated count
        await this.loadParticipants(tournament.id);
      } else {
        this.error.set(response?.message || 'Error al cancelar inscripción');
      }
    } catch (error: any) {
      console.error('Error canceling inscription:', error);
      this.error.set(
        error?.error?.message || 
        error?.message || 
        'Error al conectar con el servidor'
      );
    } finally {
      this.inscriptionLoading.set(false);
    }
  }

  onBackToList() {
    this.router.navigate(['/tournaments']);
  }

  onViewMatches() {
    const tournament = this.tournament();
    if (tournament) {
      this.router.navigate(['/tournaments', tournament.id, 'matches']);
    }
  }

  onViewRanking() {
    const tournament = this.tournament();
    if (tournament) {
      this.router.navigate(['/tournaments', tournament.id, 'ranking']);
    }
  }

  // Helper methods
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStatusLabel(status: TournamentStatus): string {
    const statusLabels = {
      upcoming: 'Próximo',
      ongoing: 'En curso',
      finished: 'Finalizado',
      cancelled: 'Cancelado'
    };
    return statusLabels[status] || status;
  }

  getStatusClass(status: TournamentStatus): string {
    return `status-${status}`;
  }
}