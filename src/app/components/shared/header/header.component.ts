import { Component, input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  // Injected services
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // Props usando signals
  title = input<string>('Chess Manager');
  
  // Component state
  protected readonly showUserMenu = signal<boolean>(false);

  protected toggleUserMenu(): void {
    this.showUserMenu.set(!this.showUserMenu());
  }

  protected getUserInitials(): string {
    const user = this.authService.currentUser();
    if (!user) return 'U';
    
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || 'U';
  }

  protected navigateToProfile(): void {
    this.showUserMenu.set(false);
    this.router.navigate(['/profile']);
  }

  protected logout(): void {
    this.showUserMenu.set(false);
    this.authService.logout();
  }
}