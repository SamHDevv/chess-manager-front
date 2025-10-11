export interface Tournament {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  location: string;
  description?: string;
  maxParticipants?: number;
  registrationDeadline?: string;
  status: TournamentStatus;
  createdBy?: number; // User ID of the tournament organizer
  matches?: any[];
  inscriptions?: any[];
}

export enum TournamentStatus {
  UPCOMING = 'upcoming',
  ONGOING = 'ongoing',
  FINISHED = 'finished',
  CANCELLED = 'cancelled'
}

export interface CreateTournamentRequest {
  name: string;
  startDate: string;
  endDate: string;
  location: string;
  description?: string;
  maxParticipants?: number;
  registrationDeadline?: string;
  status?: TournamentStatus;
}

export interface UpdateTournamentRequest {
  name?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  description?: string;
  maxParticipants?: number;
  registrationDeadline?: string;
  status?: TournamentStatus;
}
