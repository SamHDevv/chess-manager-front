import { Component, input, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { TournamentService } from '../../services/tournament.service';
import { InscriptionService } from '../../services/inscription.service';
import { Tournament, TournamentStatus } from '../../models/tournament.model';
import { User } from '../../models/user.model';

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

  // State signals
  protected readonly tournament = signal<Tournament | null>(null);
  protected readonly participants = signal<User[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly inscriptionLoading = signal(false);
  protected readonly userInscribed = signal(false);

  // Computed values
  protected readonly canInscribe = computed(() => {
    const t = this.tournament();
    if (!t) return false;
    
    return t.status === 'upcoming' && 
           !this.userInscribed() &&
           (!t.maxParticipants || this.participants().length < t.maxParticipants) &&
           (!t.registrationDeadline || new Date(t.registrationDeadline) > new Date());
  });

  protected readonly spotsLeft = computed(() => {
    const t = this.tournament();
    if (!t || !t.maxParticipants) return null;
    return t.maxParticipants - this.participants().length;
  });

  protected readonly isRegistrationClosed = computed(() => {
    const t = this.tournament();
    if (!t || !t.registrationDeadline) return false;
    return new Date(t.registrationDeadline) <= new Date();
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
      // Load tournament details
      const tournamentResponse = await this.tournamentService.getTournamentById(tournamentId).toPromise();
      
      if (tournamentResponse?.success && tournamentResponse.data) {
        this.tournament.set(tournamentResponse.data);
        
        // Load participants
        await this.loadParticipants(tournamentId);
        
        // Check if current user is inscribed (mock for now - will be real when auth is implemented)
        this.checkUserInscription(tournamentId);
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
      const inscriptionsResponse = await this.inscriptionService.getInscriptionsByTournamentId(tournamentId).toPromise();
      
      if (inscriptionsResponse?.success && inscriptionsResponse.data) {
        // Extract users from inscriptions
        const users = inscriptionsResponse.data.map((inscription: any) => inscription.user).filter(Boolean);
        this.participants.set(users);
      }
    } catch (error) {
      console.error('Error loading participants:', error);
    }
  }

  private checkUserInscription(tournamentId: number) {
    // TODO: Implement real user authentication check
    // For now, simulate user not inscribed
    this.userInscribed.set(false);
  }

  async onInscribe() {
    const t = this.tournament();
    if (!t || !this.canInscribe()) return;

    this.inscriptionLoading.set(true);

    try {
      // TODO: Get real user ID from auth service when implemented
      const mockUserId = 1; // This will be replaced with real auth
      
      const response = await this.inscriptionService.createInscription({ userId: mockUserId, tournamentId: t.id }).toPromise();
      
      if (response?.success) {
        this.userInscribed.set(true);
        // Reload participants to show updated count
        await this.loadParticipants(t.id);
      } else {
        this.error.set(response?.message || 'Error al inscribirse en el torneo');
      }
    } catch (error) {
      console.error('Error inscribing in tournament:', error);
      this.error.set('Error al conectar con el servidor');
    } finally {
      this.inscriptionLoading.set(false);
    }
  }

  async onCancelInscription() {
    const t = this.tournament();
    if (!t || !this.userInscribed()) return;

    this.inscriptionLoading.set(true);

    try {
      // TODO: Get real user ID from auth service when implemented
      const mockUserId = 1;
      
      const response = await this.inscriptionService.cancelInscriptionByUserAndTournament(mockUserId, t.id).toPromise();
      
      if (response?.success) {
        this.userInscribed.set(false);
        // Reload participants to show updated count
        await this.loadParticipants(t.id);
      } else {
        this.error.set(response?.message || 'Error al cancelar inscripción');
      }
    } catch (error) {
      console.error('Error canceling inscription:', error);
      this.error.set('Error al conectar con el servidor');
    } finally {
      this.inscriptionLoading.set(false);
    }
  }

  onBackToList() {
    this.router.navigate(['/tournaments']);
  }

  onViewMatches() {
    const t = this.tournament();
    if (t) {
      this.router.navigate(['/tournaments', t.id, 'matches']);
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