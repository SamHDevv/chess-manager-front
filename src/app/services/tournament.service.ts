import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { Tournament, CreateTournamentRequest, UpdateTournamentRequest, TournamentStatus } from '../models/tournament.model';

@Injectable({
  providedIn: 'root'
})
export class TournamentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/tournaments`;

  getAllTournaments(): Observable<ApiResponse<Tournament[]>> {
    return this.http.get<ApiResponse<Tournament[]>>(this.baseUrl);
  }

  getUpcomingTournaments(): Observable<ApiResponse<Tournament[]>> {
    return this.http.get<ApiResponse<Tournament[]>>(`${this.baseUrl}/upcoming`);
  }

  getTournamentById(id: number): Observable<ApiResponse<Tournament>> {
    return this.http.get<ApiResponse<Tournament>>(`${this.baseUrl}/${id}`);
  }

  createTournament(tournamentData: CreateTournamentRequest): Observable<ApiResponse<Tournament>> {
    return this.http.post<ApiResponse<Tournament>>(this.baseUrl, tournamentData);
  }

  updateTournament(id: number, tournamentData: UpdateTournamentRequest): Observable<ApiResponse<Tournament>> {
    return this.http.put<ApiResponse<Tournament>>(`${this.baseUrl}/${id}`, tournamentData);
  }

  deleteTournament(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }

  updateTournamentStatus(id: number, status: TournamentStatus): Observable<ApiResponse<Tournament>> {
    return this.http.patch<ApiResponse<Tournament>>(`${this.baseUrl}/${id}/status`, { status });
  }

  generateMatches(tournamentId: number): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/${tournamentId}/generate-matches`, {});
  }

  /**
   * Start tournament manually (admin/organizer only)
   */
  startTournament(id: number): Observable<ApiResponse<Tournament>> {
    return this.http.post<ApiResponse<Tournament>>(`${this.baseUrl}/${id}/start`, {});
  }

  /**
   * Finish tournament manually (admin/organizer only)
   */
  finishTournament(id: number): Observable<ApiResponse<Tournament>> {
    return this.http.post<ApiResponse<Tournament>>(`${this.baseUrl}/${id}/finish`, {});
  }

  /**
   * Calculate tournament status based on current date
   * NOTE: If the backend has already marked a tournament as FINISHED 
   * (e.g., because all matches are completed), respect that status
   * instead of reverting it based on dates alone
   */
  calculateTournamentStatus(tournament: Tournament): TournamentStatus {
    // If the backend already marked it as FINISHED, don't change it
    // This happens when all matches are completed even if endDate hasn't passed
    if (tournament.status === TournamentStatus.FINISHED) {
      return TournamentStatus.FINISHED;
    }

    const now = new Date();
    const startDate = new Date(tournament.startDate);
    const endDate = new Date(tournament.endDate);

    // Remove time component for date comparison
    now.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    if (tournament.status === TournamentStatus.CANCELLED) {
      return TournamentStatus.CANCELLED;
    }

    if (now < startDate) {
      return TournamentStatus.UPCOMING;
    } else if (now >= startDate && now <= endDate) {
      return TournamentStatus.ONGOING;
    } else {
      return TournamentStatus.FINISHED;
    }
  }

  /**
   * Update tournament status if it has changed based on dates
   */
  updateStatusIfNeeded(tournament: Tournament): Observable<Tournament> {
    const calculatedStatus = this.calculateTournamentStatus(tournament);
    
    if (calculatedStatus !== tournament.status) {
      return new Observable(observer => {
        this.updateTournamentStatus(tournament.id, calculatedStatus).subscribe({
          next: (response) => {
            if (response.success && response.data) {
              observer.next(response.data);
            } else {
              observer.next(tournament);
            }
            observer.complete();
          },
          error: (error) => {
            console.error('Failed to update tournament status:', error);
            observer.next(tournament);
            observer.complete();
          }
        });
      });
    } else {
      return new Observable(observer => {
        observer.next(tournament);
        observer.complete();
      });
    }
  }
}