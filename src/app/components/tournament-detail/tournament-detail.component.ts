import { Component, input, computed, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { TournamentService } from '../../services/tournament.service';
import { InscriptionService } from '../../services/inscription.service';
import { AuthService } from '../../services/auth.service';
import { Tournament, TournamentStatus, TournamentFormat, calculateEstimatedRounds } from '../../models/tournament.model';
import { User } from '../../models/user.model';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-tournament-detail',
  imports: [CommonModule],
  templateUrl: './tournament-detail.component.html',
  styleUrl: './tournament-detail.component.scss'
})
export class TournamentDetailComponent {
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

  // Check if current user is the organizer or admin
  protected readonly isOrganizer = computed(() => {
    const tournament = this.tournament();
    const currentUser = this.authService.currentUser();
    if (!tournament || !currentUser) return false;
    
    return tournament.createdBy === currentUser.userId;
  });

  protected readonly isAdmin = computed(() => {
    const currentUser = this.authService.currentUser();
    return currentUser?.role === 'admin';
  });

  // User can edit if they are organizer or admin AND tournament is not ongoing
  protected readonly canEdit = computed(() => {
    const tournament = this.tournament();
    const isAuthorized = this.isOrganizer() || this.isAdmin();
    const isNotOngoing = tournament?.status !== 'ongoing';
    return isAuthorized && isNotOngoing;
  });

  // User can delete if they are organizer or admin AND tournament is not ongoing or finished
  protected readonly canDelete = computed(() => {
    const tournament = this.tournament();
    const isAuthorized = this.isOrganizer() || this.isAdmin();
    const canBeDeleted = tournament?.status !== 'ongoing' && tournament?.status !== 'finished';
    return isAuthorized && canBeDeleted;
  });

  // User can manage matches if they are organizer or admin AND tournament is ongoing AND not completed
  protected readonly canManageMatches = computed(() => {
    const tournament = this.tournament();
    const isAuthorized = this.isOrganizer() || this.isAdmin();
    const isOngoing = tournament?.status === 'ongoing';
    const isCompleted = this.isTournamentCompleted();
    // Solo puede registrar resultados si está ongoing y NO ha completado todas las rondas
    return isAuthorized && isOngoing && !isCompleted;
  });

  // Can start tournament: organizer/admin, status=upcoming, has >=2 participants
  protected readonly canStartTournament = computed(() => {
    const tournament = this.tournament();
    const isAuthorized = this.isOrganizer() || this.isAdmin();
    const isUpcoming = tournament?.status === 'upcoming';
    const hasEnoughParticipants = this.participants().length >= 2;
    return isAuthorized && isUpcoming && hasEnoughParticipants;
  });

  // Can finish tournament: organizer/admin, status=ongoing
  protected readonly canFinishTournament = computed(() => {
    const tournament = this.tournament();
    const isAuthorized = this.isOrganizer() || this.isAdmin();
    const isOngoing = tournament?.status === 'ongoing';
    const isCompleted = this.isTournamentCompleted();
    // No mostrar el botón si el torneo ya está completado (todas las rondas jugadas)
    return isAuthorized && isOngoing && !isCompleted;
  });

  // Check if tournament has completed all rounds based on format
  protected readonly isTournamentCompleted = computed(() => {
    const tournament = this.tournament();
    if (!tournament || !tournament.matches || !tournament.tournamentFormat) return false;
    
    const participantCount = this.participants().length;
    if (participantCount < 2) return false;
    
    // Calculate max rounds based on format
    const maxRounds = calculateEstimatedRounds(tournament.tournamentFormat, participantCount);
    
    // Get current round from matches
    const rounds = tournament.matches.map((m: any) => m.round || 0);
    const currentRound = rounds.length > 0 ? Math.max(...rounds) : 0;
    
    // Check if we've reached the max rounds
    if (currentRound < maxRounds) return false;
    
    // Verify that ALL matches are completed (have a result, not PENDING)
    const allMatchesCompleted = tournament.matches.every((match: any) => 
      match.result && match.result !== 'PENDING'
    );
    
    return allMatchesCompleted;
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

  // Get the effective status of the tournament (considering if all rounds are completed)
  protected readonly effectiveStatus = computed((): TournamentStatus | null => {
    const tournament = this.tournament();
    if (!tournament) return null;
    
    // Si el torneo está ongoing pero ya completó todas las rondas, considerarlo como finished
    if (tournament.status === 'ongoing' && this.isTournamentCompleted()) {
      return TournamentStatus.FINISHED;
    }
    
    return tournament.status;
  });

  constructor() {
    // Effect para cargar datos del torneo cuando cambia la ruta
    effect(() => {
      const tournamentId = this.route.snapshot.paramMap.get('id');
      if (tournamentId) {
        this.loadTournamentDetails(+tournamentId);
      } else {
        this.error.set('ID de torneo no válido');
      }
    });
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

    // Confirmation dialog
    if (!confirm('¿Estás seguro de que deseas cancelar tu inscripción en este torneo?')) {
      return;
    }

    this.inscriptionLoading.set(true);
    this.error.set(null);

    try {
      const response = await firstValueFrom(
        this.inscriptionService.cancelMyInscription(tournament.id)
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
      const errorMessage = error?.error?.message || error?.message || 'Error al conectar con el servidor';
      this.error.set(errorMessage);
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

  onEditTournament() {
    const tournament = this.tournament();
    if (!tournament || !this.canEdit()) return;
    
    this.router.navigate(['/tournaments', tournament.id, 'edit']);
  }

  async onDeleteTournament() {
    const tournament = this.tournament();
    if (!tournament || !this.canDelete()) return;

    // Confirmation dialog
    const participantCount = this.participants().length;
    let confirmMessage = `¿Estás seguro de que quieres eliminar el torneo "${tournament.name}"?`;
    
    if (participantCount > 0) {
      confirmMessage += `\n\n⚠️ Hay ${participantCount} participante(s) inscrito(s).`;
    }
    
    if (tournament.status === 'ongoing') {
      confirmMessage += '\n\n⚠️ El torneo está EN CURSO. Se eliminarán todas las partidas asociadas.';
    }
    
    confirmMessage += '\n\nEsta acción no se puede deshacer.';

    if (!confirm(confirmMessage)) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const response = await firstValueFrom(
        this.tournamentService.deleteTournament(tournament.id)
      );
      
      if (response?.success) {
        alert('✅ Torneo eliminado correctamente');
        this.router.navigate(['/tournaments']);
      } else {
        this.error.set(response?.message || 'Error al eliminar el torneo');
      }
    } catch (error: any) {
      console.error('Error deleting tournament:', error);
      this.error.set(
        error?.error?.message || 
        error?.message || 
        'Error al conectar con el servidor'
      );
    } finally {
      this.loading.set(false);
    }
  }

  // Tournament state control methods
  protected async startTournament(): Promise<void> {
    const tournament = this.tournament();
    if (!tournament || !this.canStartTournament()) return;

    if (!confirm('¿Estás seguro de que quieres iniciar este torneo ahora? Esta acción generará las partidas automáticamente.')) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const response = await firstValueFrom(
        this.tournamentService.startTournament(tournament.id)
      );

      if (response.success && response.data) {
        this.tournament.set(response.data);
        alert('¡Torneo iniciado exitosamente! Las partidas han sido generadas.');
      }
    } catch (error: any) {
      console.error('Error starting tournament:', error);
      this.error.set(error.error?.message || 'Error al iniciar el torneo');
    } finally {
      this.loading.set(false);
    }
  }

  protected async finishTournament(): Promise<void> {
    const tournament = this.tournament();
    if (!tournament || !this.canFinishTournament()) return;

    if (!confirm('¿Estás seguro de que quieres finalizar este torneo ahora? No se podrán registrar más resultados.')) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const response = await firstValueFrom(
        this.tournamentService.finishTournament(tournament.id)
      );

      if (response.success && response.data) {
        this.tournament.set(response.data);
        alert('¡Torneo finalizado exitosamente!');
      }
    } catch (error: any) {
      console.error('Error finishing tournament:', error);
      this.error.set(error.error?.message || 'Error al finalizar el torneo');
    } finally {
      this.loading.set(false);
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

  getTournamentFormatLabel(format?: TournamentFormat): string {
    if (!format) return 'Suizo';
    switch (format) {
      case TournamentFormat.SWISS:
        return 'Suizo';
      case TournamentFormat.ROUND_ROBIN:
        return 'Todos contra todos';
      case TournamentFormat.ELIMINATION:
        return 'Eliminación directa';
      default:
        return 'Suizo';
    }
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