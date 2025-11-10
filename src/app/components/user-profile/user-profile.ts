import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TournamentService } from '../../services/tournament.service';
import { InscriptionService } from '../../services/inscription.service';

interface UserTournament {
  id: number;
  name: string;
  date: string;
  status: 'Registrado' | 'Completado' | 'En progreso' | 'Cancelado';
  location?: string;
}

@Component({
  selector: 'app-user-profile',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './user-profile.html',
  styleUrl: './user-profile.scss'
})
export class UserProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly tournamentService = inject(TournamentService);
  private readonly inscriptionService = inject(InscriptionService);

  protected readonly isEditMode = signal<boolean>(false);
  protected readonly isLoading = signal<boolean>(false);
  protected profileForm!: FormGroup;

  protected readonly currentUser = this.authService.currentUser;
  protected readonly userInitials = computed(() => {
    const user = this.currentUser();
    if (!user) return 'U';
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || 'U';
  });

  protected readonly userTournaments = signal<UserTournament[]>([]);
  protected readonly loadingTournaments = signal<boolean>(false);

  ngOnInit() {
    this.initializeForm();
    this.loadUserTournaments();
  }

  private initializeForm(): void {
    const user = this.currentUser();
    this.profileForm = this.fb.group({
      firstName: [user?.firstName || '', [Validators.required, Validators.minLength(2)]],
      lastName: [user?.lastName || '', [Validators.required, Validators.minLength(2)]],
      email: [user?.email || '', [Validators.required, Validators.email]]
    });
  }

  protected toggleEditMode(): void {
    this.isEditMode.set(!this.isEditMode());
    if (!this.isEditMode()) {
      const user = this.currentUser();
      this.profileForm.patchValue({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || ''
      });
    }
  }

  private loadUserTournaments(): void {
    const currentUser = this.currentUser();
    if (!currentUser?.userId) {
      return;
    }

    this.loadingTournaments.set(true);
    
    // Get user's inscriptions to tournaments
    this.inscriptionService.getInscriptionsByUserId(currentUser.userId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const tournaments = response.data.map(inscription => ({
            id: inscription.tournament?.id || inscription.tournamentId,
            name: inscription.tournament?.name || 'Torneo',
            date: inscription.tournament?.startDate || inscription.registrationDate,
            status: this.mapTournamentStatus(inscription.tournament?.status),
            location: inscription.tournament?.location
          }));
          this.userTournaments.set(tournaments);
        }
        this.loadingTournaments.set(false);
      },
      error: (error) => {
        console.error('Error loading user tournaments:', error);
        this.loadingTournaments.set(false);
      }
    });
  }

  private mapTournamentStatus(status: any): 'Registrado' | 'Completado' | 'En progreso' | 'Cancelado' {
    switch (status) {
      case 'ongoing': return 'En progreso';
      case 'finished': return 'Completado';
      case 'cancelled': return 'Cancelado';
      default: return 'Registrado';
    }
  }

  protected saveProfile(): void {
    if (this.profileForm.valid) {
      this.isLoading.set(true);
      console.log('Saving profile:', this.profileForm.value);
      setTimeout(() => {
        this.isLoading.set(false);
        this.isEditMode.set(false);
      }, 1000);
    }
  }

  protected getStatusClass(status: string): string {
    switch (status) {
      case 'Completado': return 'status-completed';
      case 'En progreso': return 'status-progress';
      case 'Cancelado': return 'status-cancelled';
      default: return 'status-registered';
    }
  }
}
