import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { Match, CreateMatchRequest, UpdateMatchRequest, MatchResult } from '../models/match.model';

@Injectable({
  providedIn: 'root'
})
export class MatchService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/matches`;

  getAllMatches(): Observable<ApiResponse<Match[]>> {
    return this.http.get<ApiResponse<Match[]>>(this.baseUrl);
  }

  getMatchById(id: number): Observable<ApiResponse<Match>> {
    return this.http.get<ApiResponse<Match>>(`${this.baseUrl}/${id}`);
  }

  getMatchesByTournamentId(tournamentId: number): Observable<ApiResponse<Match[]>> {
    return this.http.get<ApiResponse<Match[]>>(`${this.baseUrl}/tournament/${tournamentId}`);
  }

  getMatchesByRound(tournamentId: number, round: number): Observable<ApiResponse<Match[]>> {
    return this.http.get<ApiResponse<Match[]>>(`${this.baseUrl}/round/${tournamentId}/${round}`);
  }

  getMatchesByPlayerId(playerId: number): Observable<ApiResponse<Match[]>> {
    return this.http.get<ApiResponse<Match[]>>(`${this.baseUrl}/player/${playerId}`);
  }

  getOngoingMatches(): Observable<ApiResponse<Match[]>> {
    return this.http.get<ApiResponse<Match[]>>(`${this.baseUrl}/ongoing`);
  }

  createMatch(matchData: CreateMatchRequest): Observable<ApiResponse<Match>> {
    return this.http.post<ApiResponse<Match>>(this.baseUrl, matchData);
  }

  updateMatchResult(id: number, result: MatchResult): Observable<ApiResponse<Match>> {
    return this.http.put<ApiResponse<Match>>(`${this.baseUrl}/${id}/result`, { result });
  }

  startMatch(id: number): Observable<ApiResponse<Match>> {
    return this.http.put<ApiResponse<Match>>(`${this.baseUrl}/${id}/start`, {});
  }

  deleteMatch(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }

  generateRoundPairings(tournamentId: number): Observable<ApiResponse<Match[]>> {
    return this.http.post<ApiResponse<Match[]>>(`${this.baseUrl}/tournament/${tournamentId}/generate-pairings`, {});
  }

  getTournamentStandings(tournamentId: number): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/tournament/${tournamentId}/standings`);
  }
}