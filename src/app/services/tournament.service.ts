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
}