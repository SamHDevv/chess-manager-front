import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TournamentService } from '../../services/tournament.service';
import { AuthService } from '../../services/auth.service';
import { CreateTournamentRequest, TournamentStatus, Tournament, TournamentFormat, calculateEstimatedRounds } from '../../models/tournament.model';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-tournament-create',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './tournament-create.component.html',
  styleUrl: './tournament-create.component.scss'
})
export class TournamentCreateComponent {
  // Servicios inyectados
  private readonly fb = inject(FormBuilder);
  private readonly tournamentService = inject(TournamentService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Estado del componente
  protected readonly isLoading = signal<boolean>(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<boolean>(false);
  protected readonly isEditMode = signal<boolean>(false);
  protected readonly tournamentId = signal<number | null>(null);
  
  // Formulario reactivo
  protected tournamentForm!: FormGroup;

  // Computed para verificar autenticación
  protected readonly isAuthenticated = computed(() => 
    this.authService.isAuthenticated()
  );

  // Computed para el título de la página
  protected readonly pageTitle = computed(() => 
    this.isEditMode() ? 'Editar Torneo' : 'Crear Nuevo Torneo'
  );

  protected readonly pageSubtitle = computed(() => 
    this.isEditMode() ? 'Modifica los detalles de tu torneo' : 'Organiza tu propio torneo de ajedrez'
  );

  // Formatos de torneo disponibles
  protected readonly tournamentFormats = [
    { value: TournamentFormat.SWISS, label: 'Sistema Suizo', description: 'Jugadores enfrentan oponentes con puntuación similar' },
    { value: TournamentFormat.ROUND_ROBIN, label: 'Todos contra todos', description: 'Cada jugador enfrenta a todos los demás' },
    { value: TournamentFormat.ELIMINATION, label: 'Eliminación directa', description: 'Los perdedores son eliminados del torneo' }
  ];

  // Signal para rondas estimadas que se actualiza manualmente
  protected readonly estimatedRounds = signal<number | null>(null);

  constructor() {
    // Inicializar formulario
    this.initializeForm();

    // Efecto para verificar autenticación y cargar datos
    effect(() => {
      // Verificar autenticación
      if (!this.isAuthenticated()) {
        this.router.navigate(['/login']);
        return;
      }

      // Verificar si está en modo edición
      const tournamentIdParam = this.route.snapshot.paramMap.get('id');
      if (tournamentIdParam) {
        const id = +tournamentIdParam;
        this.isEditMode.set(true);
        this.tournamentId.set(id);
        
        // Cargar datos del torneo
        this.loadTournamentData(id);
      }
    });
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
      tournamentFormat: [TournamentFormat.SWISS, [Validators.required]]
    }, {
      validators: this.dateValidator
    });

    // Calcular rondas iniciales
    this.updateEstimatedRounds();

    // Suscribirse a cambios en los campos relevantes
    this.maxParticipantsControl?.valueChanges.subscribe(() => {
      this.updateEstimatedRounds();
    });

    this.tournamentFormatControl?.valueChanges.subscribe(() => {
      this.updateEstimatedRounds();
    });
  }

  // Método para actualizar las rondas estimadas
  private updateEstimatedRounds(): void {
    const maxParticipants = this.maxParticipantsControl?.value;
    const format = this.tournamentFormatControl?.value || TournamentFormat.SWISS;
    
    if (!maxParticipants || maxParticipants < 2) {
      this.estimatedRounds.set(null);
      return;
    }
    
    const rounds = calculateEstimatedRounds(format, maxParticipants);
    this.estimatedRounds.set(rounds);
    console.log('🔄 Rondas actualizadas:', { format, maxParticipants, rounds });
  }

  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Cargar datos del torneo para edición
  private async loadTournamentData(tournamentId: number): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const response = await firstValueFrom(
        this.tournamentService.getTournamentById(tournamentId)
      );

      if (response?.success && response.data) {
        const tournament = response.data;
        
        // Verificar que el usuario es el organizador o admin
        const currentUser = this.authService.currentUser();
        if (currentUser && tournament.createdBy !== currentUser.userId && currentUser.role !== 'admin') {
          this.error.set('No tienes permisos para editar este torneo');
          setTimeout(() => this.router.navigate(['/tournaments', tournamentId]), 2000);
          return;
        }

        // Rellenar el formulario con los datos del torneo
        this.tournamentForm.patchValue({
          name: tournament.name,
          description: tournament.description || '',
          startDate: this.formatDateForInput(new Date(tournament.startDate)),
          endDate: this.formatDateForInput(new Date(tournament.endDate)),
          registrationDeadline: tournament.registrationDeadline 
            ? this.formatDateForInput(new Date(tournament.registrationDeadline))
            : '',
          location: tournament.location,
          maxParticipants: tournament.maxParticipants,
          tournamentFormat: tournament.tournamentFormat || TournamentFormat.SWISS
        });
      } else {
        this.error.set('No se pudo cargar el torneo');
      }
    } catch (error: any) {
      console.error('Error loading tournament:', error);
      this.error.set('Error al cargar el torneo');
    } finally {
      this.isLoading.set(false);
    }
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
  get tournamentFormatControl() { return this.tournamentForm.get('tournamentFormat'); }

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

  // Método principal para crear o actualizar el torneo
  protected createTournament(): void {
    if (this.tournamentForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    const formValue = this.tournamentForm.value;
    
    // Ajustar fechas para que terminen a las 23:59:59
    // Crear las fechas en hora local para evitar problemas de zona horaria
    const endDateParts = formValue.endDate.split('-');
    const endDateTime = `${formValue.endDate}T23:59:59`;
    
    const regDeadlineParts = formValue.registrationDeadline.split('-');
    const registrationDeadlineTime = `${formValue.registrationDeadline}T23:59:59`;
    
    const tournamentData: CreateTournamentRequest = {
      name: formValue.name.trim(),
      description: formValue.description?.trim() || '',
      startDate: `${formValue.startDate}T00:00:00`,
      endDate: endDateTime,
      registrationDeadline: registrationDeadlineTime,
      location: formValue.location.trim(),
      maxParticipants: formValue.maxParticipants,
      tournamentFormat: formValue.tournamentFormat || TournamentFormat.SWISS,
      status: TournamentStatus.UPCOMING // Siempre crear como "Próximo"
    };

    console.log('📤 Enviando datos del torneo:', tournamentData);

    const operation$ = this.isEditMode() && this.tournamentId()
      ? this.tournamentService.updateTournament(this.tournamentId()!, tournamentData)
      : this.tournamentService.createTournament(tournamentData);

    operation$.subscribe({
      next: (response) => {
        console.log(`Tournament ${this.isEditMode() ? 'updated' : 'created'} successfully:`, response);
        this.success.set(true);
        
        // Redirigir al detalle del torneo después de 2 segundos
        setTimeout(() => {
          const tournamentId = this.isEditMode() 
            ? this.tournamentId() 
            : response.data?.id;
            
          if (tournamentId) {
            this.router.navigate(['/tournaments', tournamentId]);
          } else {
            this.router.navigate(['/tournaments']);
          }
        }, 2000);
      },
      error: (error) => {
        console.error(`Error ${this.isEditMode() ? 'updating' : 'creating'} tournament:`, error);
        this.error.set(
          error?.error?.message || error?.message || `Error al ${this.isEditMode() ? 'actualizar' : 'crear'} el torneo. Por favor, inténtalo de nuevo.`
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