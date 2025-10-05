import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface NavigationItem {
  label: string;
  route: string;
  icon?: string;
  visible?: boolean;
}

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  // Props usando signals
  title = input<string>('Chess Manager');
  navigation = input<NavigationItem[]>([]);
  showUserMenu = input<boolean>(false);
  currentUser = input<string | null>(null);

  onUserMenuClick() {
    // Lógica del menú de usuario
    console.log('User menu clicked');
  }

  onLogout() {
    // Lógica de logout
    console.log('Logout clicked');
  }
}