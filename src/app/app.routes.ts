import { Routes } from '@angular/router';
import { TournamentListComponent } from './components/tournament-list/tournament-list.component';
import { TournamentDetailComponent } from './components/tournament-detail/tournament-detail.component';
import { TournamentMatchesComponent } from './components/tournament-matches/tournament-matches.component';
import { TournamentRankingComponent } from './components/tournament-ranking/tournament-ranking.component';

export const routes: Routes = [
  { path: '', redirectTo: '/tournaments', pathMatch: 'full' },
  { path: 'tournaments', component: TournamentListComponent },
  { path: 'tournaments/:id', component: TournamentDetailComponent },
  { path: 'tournaments/:id/matches', component: TournamentMatchesComponent },
  { path: 'tournaments/:id/ranking', component: TournamentRankingComponent },
  { path: '**', redirectTo: '/tournaments' }
];
