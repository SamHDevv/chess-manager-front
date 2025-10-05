export interface Match {
  id: number;
  tournamentId: number;
  whitePlayerId: number;
  blackPlayerId: number;
  result: MatchResult;
  round: number;
  tournament?: any; // Relación opcional
  whitePlayer?: any; // Relación opcional
  blackPlayer?: any; // Relación opcional
}

export enum MatchResult {
  WHITE_WINS = 'white_wins',
  BLACK_WINS = 'black_wins',
  DRAW = 'draw',
  ONGOING = 'ongoing',
  NOT_STARTED = 'not_started'
}

export interface CreateMatchRequest {
  tournamentId: number;
  whitePlayerId: number;
  blackPlayerId: number;
  round?: number;
  result?: MatchResult;
}

export interface UpdateMatchRequest {
  result?: MatchResult;
  round?: number;
}
