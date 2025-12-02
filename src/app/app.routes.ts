import { Routes } from '@angular/router';
import { TournamentListComponent } from './components/tournament-list/tournament-list.component';
import { TournamentDetailComponent } from './components/tournament-detail/tournament-detail.component';
import { TournamentMatchesComponent } from './components/tournament-matches/tournament-matches.component';
import { TournamentRankingComponent } from './components/tournament-ranking/tournament-ranking.component';
import { TournamentCreateComponent } from './components/tournament-create/tournament-create.component';
import { AuthComponent } from './components/auth/auth.component';
import { AdminPanelComponent } from './components/admin-panel/admin-panel.component';
import { UserProfileComponent } from './components/user-profile/user-profile';
import { PlayerListComponent } from './components/player-list/player-list.component';
import { PlayerDetailComponent } from './components/player-detail/player-detail.component';
import { adminGuard, authGuard } from './guards/auth.guards';

export const routes: Routes = [
  { path: '', redirectTo: '/tournaments', pathMatch: 'full' },
  { path: 'login', component: AuthComponent },
  { path: 'register', component: AuthComponent },
  { path: 'tournaments', component: TournamentListComponent },
  { 
    path: 'tournaments/create', 
    component: TournamentCreateComponent,
    canActivate: [authGuard]
  },
  { path: 'tournaments/:id', component: TournamentDetailComponent },
  { 
    path: 'tournaments/:id/edit', 
    component: TournamentCreateComponent,
    canActivate: [authGuard]
  },
  { path: 'tournaments/:id/matches', component: TournamentMatchesComponent },
  { path: 'tournaments/:id/ranking', component: TournamentRankingComponent },
  { path: 'players', component: PlayerListComponent },
  { path: 'players/:id', component: PlayerDetailComponent },
  { 
    path: 'admin', 
    component: AdminPanelComponent,
    canActivate: [adminGuard]
  },
  { 
    path: 'profile', 
    component: UserProfileComponent,
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: '/tournaments' }
];
