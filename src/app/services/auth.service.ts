import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, tap, catchError, of, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { 
  AuthLoginRequest, 
  AuthRegisterRequest, 
  AuthResponse, 
  AuthUser,
  JwtPayload,
  UserRole,
  isAuthUser
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  
  // Storage keys
  private readonly TOKEN_KEY = 'chess_manager_token';
  private readonly USER_KEY = 'chess_manager_user';

  // State management with signals
  private readonly _currentUser = signal<AuthUser | null>(null);
  private readonly _isAuthenticated = signal<boolean>(false);
  private readonly _isLoading = signal<boolean>(false);

  // Public readonly signals
  public readonly currentUser = this._currentUser.asReadonly();
  public readonly isAuthenticated = this._isAuthenticated.asReadonly();
  public readonly isLoading = this._isLoading.asReadonly();

  constructor() {
    this.initializeAuth();
  }

  /**
   * Initialize authentication state from localStorage
   */
  private initializeAuth(): void {
    const token = this.getStoredToken();
    const user = this.getStoredUser();

    if (token && user && this.isTokenValid(token)) {
      this._currentUser.set(user);
      this._isAuthenticated.set(true);
    } else {
      this.clearAuth();
    }
  }

  /**
   * Login user with email and password
   */
  login(credentials: AuthLoginRequest): Observable<AuthResponse> {
    this._isLoading.set(true);

    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      map(response => {
        // Backend response structure: { success, message, data: { user, token } }
        if (response.success && response.data?.token && response.data?.user) {
          // Map backend user format to frontend AuthUser format
          const backendUser = response.data.user;
          const authUser: AuthUser = {
            userId: backendUser.id || backendUser.userId,
            email: backendUser.email,
            role: backendUser.role,
            firstName: backendUser.firstName || backendUser.name?.split(' ')[0],
            lastName: backendUser.lastName || backendUser.name?.split(' ').slice(1).join(' ')
          };
          
          const authResponse: AuthResponse = {
            success: response.success,
            message: response.message,
            token: response.data.token,
            user: authUser
          };
          this.setAuth(response.data.token, authUser);
          this._isLoading.set(false);
          return authResponse;
        } else {
          this._isLoading.set(false);
          return {
            success: false,
            message: response.message || 'Error en el login',
            error: 'Invalid response structure'
          } as AuthResponse;
        }
      }),
      catchError(error => {
        this._isLoading.set(false);
        console.error('Login error:', error);
        return of({
          success: false,
          message: 'Error de conexión. Intenta nuevamente.',
          error: error.message
        } as AuthResponse);
      })
    );
  }

  /**
   * Register new user
   */
  register(userData: AuthRegisterRequest): Observable<AuthResponse> {
    this._isLoading.set(true);

    return this.http.post<any>(`${this.apiUrl}/register`, userData).pipe(
      map(response => {
        // Backend response structure: { success, message, data: { user, token } }
        if (response.success && response.data?.token && response.data?.user) {
          // Map backend user format to frontend AuthUser format
          const backendUser = response.data.user;
          const authUser: AuthUser = {
            userId: backendUser.userId,
            email: backendUser.email,
            role: backendUser.role,
            firstName: backendUser.firstName || backendUser.name?.split(' ')[0],
            lastName: backendUser.lastName || backendUser.name?.split(' ').slice(1).join(' ')
          };
          
          const authResponse: AuthResponse = {
            success: response.success,
            message: response.message,
            token: response.data.token,
            user: authUser
          };
          this.setAuth(response.data.token, authUser);
          this._isLoading.set(false);
          return authResponse;
        } else {
          this._isLoading.set(false);
          return {
            success: false,
            message: response.message || 'Error en el registro',
            error: 'Invalid response structure'
          } as AuthResponse;
        }
      }),
      catchError(error => {
        this._isLoading.set(false);
        console.error('Register error:', error);
        return of({
          success: false,
          message: 'Error al registrar usuario. Intenta nuevamente.',
          error: error.message
        } as AuthResponse);
      })
    );
  }

  /**
   * Logout user
   */
  logout(): void {
    this.clearAuth();
    this.router.navigate(['/login']);
  }

  /**
   * Get current JWT token
   */
  getToken(): string | null {
    return this.getStoredToken();
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: UserRole): boolean {
    const user = this._currentUser();
    return user ? user.role === role : false;
  }

  /**
   * Check if user is admin
   */
  isAdmin(): boolean {
    return this.hasRole('admin');
  }

  /**
   * Check if user owns resource or is admin
   */
  canAccessResource(resourceUserId: number): boolean {
    const user = this._currentUser();
    if (!user) return false;
    
    return user.userId === resourceUserId || this.isAdmin();
  }

  /**
   * Refresh user data
   */
  refreshUser(): Observable<AuthUser | null> {
    const token = this.getToken();
    if (!token) {
      return of(null);
    }

    return this.http.get<{ success: boolean; user: AuthUser }>(`${this.apiUrl}/me`).pipe(
      map(response => {
        if (response.success && response.user) {
          this.setUser(response.user);
          return response.user;
        }
        return null;
      }),
      catchError(() => {
        this.logout();
        return of(null);
      })
    );
  }

  // Private helper methods

  private setAuth(token: string, user: AuthUser): void {
    console.log('🚀 AUTH SUCCESS - Setting user:', user);
    console.log('🚀 AUTH SUCCESS - User role:', user.role);
    console.log('🚀 AUTH SUCCESS - Is admin?', user.role === 'admin');
    
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this._currentUser.set(user);
    this._isAuthenticated.set(true);
  }

  private setUser(user: AuthUser): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this._currentUser.set(user);
  }

  private clearAuth(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this._currentUser.set(null);
    this._isAuthenticated.set(false);
  }

  private getStoredToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private getStoredUser(): AuthUser | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    if (!userStr) return null;
    
    try {
      const user = JSON.parse(userStr);
      return isAuthUser(user) ? user : null;
    } catch {
      return null;
    }
  }

  private isTokenValid(token: string): boolean {
    try {
      const payload = this.decodeToken(token);
      const now = Math.floor(Date.now() / 1000);
      return payload.exp ? payload.exp > now : true;
    } catch {
      return false;
    }
  }

  private decodeToken(token: string): JwtPayload {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  }
}