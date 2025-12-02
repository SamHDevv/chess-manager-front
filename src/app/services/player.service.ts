import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

export interface Player {
  id: number;
  name: string;
  role: 'player' | 'admin';
  elo?: number;
  isDeleted: boolean;
  deletedAt: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class PlayerService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/users`;

  /**
   * Get all active players (public endpoint)
   * No authentication required
   */
  getAllPlayers(): Observable<ApiResponse<Player[]>> {
    return this.http.get<ApiResponse<Player[]>>(`${this.baseUrl}/players`);
  }

  /**
   * Get player by ID
   */
  getPlayerById(id: number): Observable<ApiResponse<Player>> {
    return this.http.get<ApiResponse<Player>>(`${this.baseUrl}/${id}`);
  }
}
