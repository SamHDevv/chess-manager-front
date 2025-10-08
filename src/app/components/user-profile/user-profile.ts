import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

interface UserTournament {
  id: number;
  name: string;
  date: string;
  status: 'Registrado' | 'Completado' | 'En progreso' | 'Cancelado';
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

  protected readonly userTournaments = signal<UserTournament[]>([
    { id: 1, name: 'Campeonato Daganzo Ajedrez', date: '2024-07-15', status: 'Registrado' },
    { id: 2, name: 'Abierto regional', date: '2024-08-05', status: 'Completado' },
    { id: 3, name: 'Clasificatoria Nacional', date: '2024-09-20', status: 'Registrado' }
  ]);

  ngOnInit() {
    this.initializeForm();
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
