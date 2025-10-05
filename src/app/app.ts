import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent, type NavigationItem } from './components/shared/header/header.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('Chess Manager');
  
  // Configuración de navegación usando signals
  protected readonly navigation = signal<NavigationItem[]>([
    { label: 'Torneos', route: '/tournaments', icon: '🏆', visible: true },
    { label: 'Ranking', route: '/ranking', icon: '📊', visible: false }, // Future feature
    { label: 'Mis Partidas', route: '/matches', icon: '⚔️', visible: false } // Future feature
  ]);
  
  // User state (ejemplo para futuras implementaciones)
  protected readonly showUserMenu = signal(true);
  protected readonly currentUser = signal<string | null>(null); // null = no logged in
}
