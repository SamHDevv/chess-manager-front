import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AuthResponse } from '../../models/auth.model';

type AuthMode = 'login' | 'register';

@Component({
  selector: 'app-auth',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss'
})
export class AuthComponent {
  // Injected services
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  protected readonly authService = inject(AuthService);
  
  // Component state with signals
  protected readonly mode = signal<AuthMode>('login');
  protected readonly errorMessage = signal<string>('');
  
  // Computed properties
  protected readonly isLogin = computed(() => this.mode() === 'login');
  protected readonly isRegister = computed(() => this.mode() === 'register');
  
  // Form configuration
  protected readonly authForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    name: [''],
    confirmPassword: [''],
    rememberMe: [false],
    acceptTerms: [false]
  });

  constructor() {
    // Set initial mode based on URL
    const currentUrl = window.location.pathname;
    if (currentUrl.includes('register')) {
      this.setMode('register');
    }
  }

  // Public methods
  protected setMode(newMode: AuthMode): void {
    this.mode.set(newMode);
    this.errorMessage.set('');
    this.authForm.reset();
    this.updateFormValidators();
    this.updateUrl();
  }

  protected toggleMode(): void {
    const newMode = this.isLogin() ? 'register' : 'login';
    this.setMode(newMode);
  }

  protected onSubmit(): void {
    if (this.authForm.valid && this.isFormValid()) {
      this.errorMessage.set('');
      
      if (this.isLogin()) {
        this.handleLogin();
      } else {
        this.handleRegister();
      }
    } else {
      this.markFormGroupTouched();
    }
  }

  protected isFieldInvalid(fieldName: string): boolean {
    const field = this.authForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  protected hasPasswordMismatch(): boolean {
    if (this.isLogin()) return false;
    
    const password = this.authForm.get('password')?.value;
    const confirmPassword = this.authForm.get('confirmPassword')?.value;
    return password !== confirmPassword && confirmPassword !== '';
  }

  protected getEmailFieldClass(): string {
    if (this.isLogin()) {
      return 'top-field';
    }
    return 'middle-field';
  }

  protected getPasswordFieldClass(): string {
    if (this.isLogin()) {
      return 'bottom-field';
    }
    return this.isRegister() ? 'middle-field' : 'bottom-field';
  }

  // Private methods
  private updateFormValidators(): void {
    const nameControl = this.authForm.get('name');
    const confirmPasswordControl = this.authForm.get('confirmPassword');
    const acceptTermsControl = this.authForm.get('acceptTerms');

    if (this.isRegister()) {
      // Add validators for register mode
      nameControl?.setValidators([Validators.required, Validators.minLength(2)]);
      confirmPasswordControl?.setValidators([Validators.required]);
      acceptTermsControl?.setValidators([Validators.requiredTrue]);
    } else {
      // Remove validators for login mode
      nameControl?.clearValidators();
      confirmPasswordControl?.clearValidators();
      acceptTermsControl?.clearValidators();
    }

    // Update validity
    nameControl?.updateValueAndValidity();
    confirmPasswordControl?.updateValueAndValidity();
    acceptTermsControl?.updateValueAndValidity();
  }

  private updateUrl(): void {
    const newUrl = this.isLogin() ? '/login' : '/register';
    this.router.navigate([newUrl], { replaceUrl: true });
  }

  private isFormValid(): boolean {
    if (this.isRegister()) {
      return !this.hasPasswordMismatch() && this.authForm.get('acceptTerms')?.value;
    }
    return true;
  }

  private handleLogin(): void {
    const { email, password } = this.authForm.value;
    
    this.authService.login({ email, password }).subscribe({
      next: (response: AuthResponse) => {
        if (response.success) {
          this.router.navigate(['/tournaments']);
        } else {
          this.errorMessage.set(response.message || 'Error en el inicio de sesión');
        }
      },
      error: (error: any) => {
        this.errorMessage.set('Error de conexión. Intenta nuevamente.');
        console.error('Login error:', error);
      }
    });
  }

  private handleRegister(): void {
    const { name, email, password } = this.authForm.value;
    
    // Backend expects 'name' field and optional role (defaults to 'player')
    this.authService.register({
      email,
      password,
      name,
      role: 'player' as const
    }).subscribe({
      next: (response: AuthResponse) => {
        if (response.success) {
          this.router.navigate(['/tournaments']);
        } else {
          this.errorMessage.set(response.message || 'Error al crear la cuenta');
        }
      },
      error: (error: any) => {
        this.errorMessage.set('Error de conexión. Intenta nuevamente.');
        console.error('Register error:', error);
      }
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.authForm.controls).forEach(key => {
      const control = this.authForm.get(key);
      control?.markAsTouched();
    });
  }
}