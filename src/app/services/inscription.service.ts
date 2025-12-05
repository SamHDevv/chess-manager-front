import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { Inscription, CreateInscriptionRequest } from '../models/inscription.model';

@Injectable({
  providedIn: 'root'
})
export class InscriptionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/inscriptions`;

  getAllInscriptions(): Observable<ApiResponse<Inscription[]>> {
    return this.http.get<ApiResponse<Inscription[]>>(this.baseUrl);
  }

  getInscriptionById(id: number): Observable<ApiResponse<Inscription>> {
    return this.http.get<ApiResponse<Inscription>>(`${this.baseUrl}/${id}`);
  }

  getInscriptionsByUserId(userId: number): Observable<ApiResponse<Inscription[]>> {
    return this.http.get<ApiResponse<Inscription[]>>(`${this.baseUrl}/user/${userId}`);
  }

  getInscriptionsByTournamentId(tournamentId: number): Observable<ApiResponse<Inscription[]>> {
    return this.http.get<ApiResponse<Inscription[]>>(`${this.baseUrl}/tournament/${tournamentId}`);
  }

  createInscription(inscriptionData: CreateInscriptionRequest): Observable<ApiResponse<Inscription>> {
    return this.http.post<ApiResponse<Inscription>>(this.baseUrl, inscriptionData);
  }

  deleteInscription(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }

  // Cancelar la inscripción del usuario actual en un torneo específico
  cancelMyInscription(tournamentId: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/tournament/${tournamentId}/cancel`);
  }
}