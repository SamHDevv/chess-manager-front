export interface Inscription {
  id: number;
  userId: number;
  tournamentId: number;
  registrationDate: string;
  user?: any;
  tournament?: any;
}

export interface CreateInscriptionRequest {
  userId: number;
  tournamentId: number;
}