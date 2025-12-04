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
  tournamentFormat?: TournamentFormat;
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

export enum TournamentFormat {
  SWISS = 'swiss',
  ROUND_ROBIN = 'round_robin',
  ELIMINATION = 'elimination'
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
  tournamentFormat?: TournamentFormat;
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
  tournamentFormat?: TournamentFormat;
}

/**
 * Calcula el número de rondas estimadas según el formato del torneo y número de participantes
 */
export function calculateEstimatedRounds(format: TournamentFormat, participants: number): number {
  if (!participants || participants < 2) return 0;
  
  switch (format) {
    case TournamentFormat.SWISS:
      return Math.ceil(Math.log2(participants));
    case TournamentFormat.ROUND_ROBIN:
      return participants - 1;
    case TournamentFormat.ELIMINATION:
      return Math.ceil(Math.log2(participants));
    default:
      return Math.ceil(Math.log2(participants));
  }
}
