import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TournamentService } from '../../services/tournament.service';
import { AuthService } from '../../services/auth.service';
import { CreateTournamentRequest, TournamentStatus } from '../../models/tournament.model';

@Component({
  selector: 'app-tournament-create',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './tournament-create.component.html',
  styleUrl: './tournament-create.component.scss'
})
export class TournamentCreateComponent implements OnInit {
  // Servicios inyectados
  private readonly fb = inject(FormBuilder);
  private readonly tournamentService = inject(TournamentService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // Estado del componente
  protected readonly isLoading = signal<boolean>(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<boolean>(false);
  
  // Formulario reactivo
  protected tournamentForm!: FormGroup;

  // Computed para verificar autenticación
  protected readonly isAuthenticated = computed(() => 
    this.authService.isAuthenticated()
  );

  // Opciones para selects
  protected readonly tournamentStatuses = [
    { value: TournamentStatus.UPCOMING, label: 'Próximo' },
    { value: TournamentStatus.ONGOING, label: 'En curso' }
  ];

  ngOnInit(): void {
    // Verificar autenticación
    if (!this.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.initializeForm();
  }

  private initializeForm(): void {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    this.tournamentForm = this.fb.group({
      name: ['', [
        Validators.required, 
        Validators.minLength(3),
        Validators.maxLength(100)
      ]],
      description: ['', [Validators.maxLength(500)]],
      startDate: [this.formatDateForInput(tomorrow), [Validators.required]],
      endDate: [this.formatDateForInput(nextWeek), [Validators.required]],
      registrationDeadline: [this.formatDateForInput(today), [Validators.required]],
      location: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(200)
      ]],
      maxParticipants: [16, [
        Validators.required,
        Validators.min(4),
        Validators.max(128)
      ]],
      status: [TournamentStatus.UPCOMING, [Validators.required]]
    }, {
      validators: this.dateValidator
    });
  }

  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Validador personalizado para fechas
  private dateValidator(form: FormGroup) {
    const startDate = form.get('startDate')?.value;
    const endDate = form.get('endDate')?.value;
    const registrationDeadline = form.get('registrationDeadline')?.value;

    const errors: any = {};

    if (startDate && endDate) {
      if (new Date(startDate) >= new Date(endDate)) {
        errors.endDateInvalid = true;
      }
    }

    if (registrationDeadline && startDate) {
      if (new Date(registrationDeadline) >= new Date(startDate)) {
        errors.registrationDeadlineInvalid = true;
      }
    }

    return Object.keys(errors).length > 0 ? errors : null;
  }

  // Getters para acceso fácil a controles del formulario
  get nameControl() { return this.tournamentForm.get('name'); }
  get descriptionControl() { return this.tournamentForm.get('description'); }
  get startDateControl() { return this.tournamentForm.get('startDate'); }
  get endDateControl() { return this.tournamentForm.get('endDate'); }
  get registrationDeadlineControl() { return this.tournamentForm.get('registrationDeadline'); }
  get locationControl() { return this.tournamentForm.get('location'); }
  get maxParticipantsControl() { return this.tournamentForm.get('maxParticipants'); }

  // Métodos para validación de errores específicos
  protected hasDateError(): boolean {
    return this.tournamentForm.hasError('endDateInvalid') || 
           this.tournamentForm.hasError('registrationDeadlineInvalid');
  }

  protected getDateErrorMessage(): string {
    if (this.tournamentForm.hasError('endDateInvalid')) {
      return 'La fecha de fin debe ser posterior a la fecha de inicio';
    }
    if (this.tournamentForm.hasError('registrationDeadlineInvalid')) {
      return 'La fecha límite de inscripción debe ser anterior a la fecha de inicio';
    }
    return '';
  }

  // Método principal para crear el torneo
  protected createTournament(): void {
    if (this.tournamentForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    const formValue = this.tournamentForm.value;
    
    const createRequest: CreateTournamentRequest = {
      name: formValue.name.trim(),
      description: formValue.description?.trim() || '',
      startDate: formValue.startDate,
      endDate: formValue.endDate,
      registrationDeadline: formValue.registrationDeadline,
      location: formValue.location.trim(),
      maxParticipants: formValue.maxParticipants,
      status: formValue.status
    };

    this.tournamentService.createTournament(createRequest).subscribe({
      next: (response) => {
        console.log('Tournament created successfully:', response);
        this.success.set(true);
        
        // Redirigir al detalle del torneo creado después de 2 segundos
        setTimeout(() => {
          if (response.data?.id) {
            this.router.navigate(['/tournaments', response.data.id]);
          } else {
            this.router.navigate(['/tournaments']);
          }
        }, 2000);
      },
      error: (error) => {
        console.error('Error creating tournament:', error);
        this.error.set(
          error?.error?.message || error?.message || 'Error al crear el torneo. Por favor, inténtalo de nuevo.'
        );
        this.isLoading.set(false);
      },
      complete: () => {
        this.isLoading.set(false);
      }
    });
  }

  // Marcar todos los campos como touched para mostrar errores
  private markFormGroupTouched(): void {
    Object.keys(this.tournamentForm.controls).forEach(key => {
      const control = this.tournamentForm.get(key);
      control?.markAsTouched();
    });
  }

  // Método para cancelar y volver
  protected goBack(): void {
    this.router.navigate(['/tournaments']);
  }

  // Método para resetear el formulario
  protected resetForm(): void {
    this.tournamentForm.reset();
    this.error.set(null);
    this.success.set(false);
    this.initializeForm();
  }
}