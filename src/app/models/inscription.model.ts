export interface Inscription {
  id: number;
  userId: number;
  tournamentId: number;
  registrationDate: string; // Date serializada como string
  user?: any; // Relación opcional
  tournament?: any; // Relación opcional
}

export interface CreateInscriptionRequest {
  userId: number;
  tournamentId: number;
}

export interface UpdateInscriptionRequest {
  // Por ahora no hay campos actualizables en inscripciones
  // Se puede expandir en el futuro si es necesario
}
