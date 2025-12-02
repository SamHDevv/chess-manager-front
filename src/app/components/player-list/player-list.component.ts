import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PlayerService, Player } from '../../services/player.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-player-list',
  imports: [CommonModule, RouterLink],
  templateUrl: './player-list.component.html',
  styleUrl: './player-list.component.scss'
})
export class PlayerListComponent {
  private readonly playerService = inject(PlayerService);
  protected readonly authService = inject(AuthService);

  // Signals for state management
  protected readonly players = signal<Player[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly searchQuery = signal('');
  protected readonly sortBy = signal<'name' | 'elo'>('name');

  // Computed values
  protected readonly filteredPlayers = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const allPlayers = this.players();
    const sort = this.sortBy();

    let filtered = allPlayers;

    // Apply search filter (only by name for public view)
    if (query) {
      filtered = allPlayers.filter(player => 
        player.name.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      switch (sort) {
        case 'elo':
          return (b.elo || 0) - (a.elo || 0);
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });
  });

  protected readonly playersCount = computed(() => this.players().length);
  protected readonly filteredCount = computed(() => this.filteredPlayers().length);

  constructor() {
    // Load players on initialization
    this.loadPlayers();
  }

  protected loadPlayers(): void {
    this.loading.set(true);
    this.error.set(null);

    this.playerService.getAllPlayers().subscribe({
      next: (response) => {
        this.loading.set(false);
        if (response.success && response.data) {
          // Players endpoint already returns only active players
          this.players.set(response.data);
        } else {
          this.error.set(response.message || 'Error desconocido');
        }
      },
      error: (err) => {
        this.loading.set(false);
        console.error('Error loading players:', err);
        
        // Load demo data when server is not available
        this.loadDemoData();
      }
    });
  }

  private loadDemoData(): void {
    const demoPlayers: Player[] = [
      {
        id: 1,
        name: 'María García',
        role: 'player',
        elo: 1850,
        isDeleted: false,
        deletedAt: null
      },
      {
        id: 2,
        name: 'Carlos López',
        role: 'player',
        elo: 2100,
        isDeleted: false,
        deletedAt: null
      },
      {
        id: 3,
        name: 'Ana Martínez',
        role: 'player',
        elo: 1950,
        isDeleted: false,
        deletedAt: null
      },
      {
        id: 4,
        name: 'Pedro Sánchez',
        role: 'player',
        elo: 1720,
        isDeleted: false,
        deletedAt: null
      },
      {
        id: 5,
        name: 'Laura Fernández',
        role: 'player',
        elo: 2250,
        isDeleted: false,
        deletedAt: null
      },
      {
        id: 6,
        name: 'David Rodríguez',
        role: 'player',
        elo: 1890,
        isDeleted: false,
        deletedAt: null
      },
      {
        id: 7,
        name: 'Sofia Torres',
        role: 'player',
        elo: 2050,
        isDeleted: false,
        deletedAt: null
      },
      {
        id: 8,
        name: 'Miguel Ángel',
        role: 'player',
        isDeleted: false,
        deletedAt: null
      }
    ];

    this.players.set(demoPlayers);
    this.error.set('Mostrando datos de demostración (backend no disponible)');
  }

  protected onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  protected onSortChange(sortType: 'name' | 'elo'): void {
    this.sortBy.set(sortType);
  }
}
