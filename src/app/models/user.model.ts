export interface User {
  id: number;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
}

export enum UserRole {
  ADMIN = 'admin',
  PLAYER = 'player'
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}
