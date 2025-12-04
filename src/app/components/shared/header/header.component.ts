import { Component, input, inject, signal, computed, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { RolePermissionService } from '../../../services/role-permission.service';
import { UserRole } from '../../../models/auth.model';

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  // Injected services
  protected readonly authService = inject(AuthService);
  protected readonly rolePermissionService = inject(RolePermissionService);
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef);

  // Props usando signals
  title = input<string>('Chess Manager');
  
  // Component state
  protected readonly showUserMenu = signal<boolean>(false);
  protected readonly showMobileMenu = signal<boolean>(false);
  
  // Computed properties
  protected readonly isAdmin = computed(() => {
    const user = this.authService.currentUser();
    return user ? this.rolePermissionService.isAdmin(user.role as UserRole) : false;
  });

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const clickedInside = this.elementRef.nativeElement.querySelector('.user-menu')?.contains(event.target);
    if (!clickedInside && this.showUserMenu()) {
      this.showUserMenu.set(false);
    }
  }

  protected toggleUserMenu(): void {
    this.showUserMenu.set(!this.showUserMenu());
  }

  protected toggleMobileMenu(): void {
    this.showMobileMenu.set(!this.showMobileMenu());
  }

  protected closeMobileMenu(): void {
    this.showMobileMenu.set(false);
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

  protected navigateToAdminPanel(): void {
    this.showUserMenu.set(false);
    this.router.navigate(['/admin']);
  }

  protected logout(): void {
    this.showUserMenu.set(false);
    this.authService.logout();
  }
}