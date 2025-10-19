// src/app/services/auth.ts (Frontend Angular)
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError, tap } from 'rxjs';
import { Router } from '@angular/router';

// ✅ INTERFACES ACTUALIZADAS
interface LoginResponse { 
  message: string;
  accessToken: string; 
  user: { 
    id: string; 
    email: string; 
    sexo: string;
    altura: number;
    /* ...otros datos */ 
  } 
}

interface RegisterResponse { 
  message: string; 
  userId: string; 
  email: string; 
  accessToken?: string;  // ✅ AÑADIDO
  user?: any;            // ✅ AÑADIDO
}

export interface UserProfileData {
  nombre_completo: string;
  edad: number;
  peso: number;
  sexo: string;            // ✅ Nuevo campo
  altura: number;        // ✅ Nuevo campo
  objetivo_salud: string;
  calorias_diarias_objetivo: number;
  alergias: string[];
  gustos: string[];
  no_me_gusta: string[];
  email: string;
}


@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // ✅ CORREGIR la URL base (eliminar /api si tu backend no lo tiene)
  private baseUrl = 'http://localhost:3000/api/auth';
  private _accessToken: string | null = null;
  private _currentUserId: string | null = null;
  private _currentUserEmail: string | null = null;

  constructor(private http: HttpClient, private router: Router) {
    this._accessToken = localStorage.getItem('accessToken');
    this._currentUserId = localStorage.getItem('userId');
    this._currentUserEmail = localStorage.getItem('userEmail');
  }

  get accessToken(): string | null {
      return this._accessToken;
  }

  get currentUserId(): string | null {
      return this._currentUserId;
  }

  get currentUserEmail(): string | null {
      return this._currentUserEmail;
  }

  get currentUserName(): string | null {
      return localStorage.getItem('userName');
  }

  isLoggedIn(): boolean {
      return !!this._accessToken && !!this._currentUserId;
  }

  // ✅ MÉTODO AÑADIDO para setSession
  setSession(accessToken: string, userId?: string, userEmail?: string): void {
    this._accessToken = accessToken;
    if (userId) this._currentUserId = userId;
    if (userEmail) this._currentUserEmail = userEmail;
    
    localStorage.setItem('accessToken', accessToken);
    if (userId) localStorage.setItem('userId', userId);
    if (userEmail) localStorage.setItem('userEmail', userEmail);
  }

  // ✅ MÉTODO AÑADIDO para obtener token (alias de accessToken)
  getToken(): string | null {
    return this._accessToken;
  }

  // ✅ MÉTODO AÑADIDO para verificar autenticación (alias de isLoggedIn)
  isAuthenticated(): boolean {
    return this.isLoggedIn();
  }

  register(email: string, password: string): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.baseUrl}/register`, { email, password }).pipe(
      tap(response => {
        // ✅ AÑADIDO: Auto-sesión después del registro si hay accessToken
        if (response.accessToken) {
          this.setSession(
            response.accessToken, 
            response.userId, 
            response.email
          );
        }
      }),
      catchError(this.handleError)
    );
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, { email, password }).pipe(
      tap(response => {
        this.setSession(
          response.accessToken,
          response.user.id,
          response.user.email
        );
      }),
      catchError(this.handleError)
    );
  }

  logout(): void {
    this._accessToken = null;
    this._currentUserId = null;
    this._currentUserEmail = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName'); // Limpiar también el nombre
    //localStorage.removeItem('user_name'); // Limpiar el nombre de usuario usado en principal
    this.router.navigate(['/login']);
  }

  saveUserProfile(userId: string, profileData: UserProfileData): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/profile/${userId}`, profileData, {
        headers: {
            'Authorization': `Bearer ${this._accessToken}`
        }
    }).pipe(
        catchError(this.handleError)
    );
  }

  getUserProfile(userId: string): Observable<UserProfileData> {
    return this.http.get<UserProfileData>(`${this.baseUrl}/profile/${userId}`, {
        headers: {
            'Authorization': `Bearer ${this._accessToken}`
        }
    }).pipe(
        catchError(this.handleError)
    );
  }

  getCurrentUser(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/me`, {
        headers: {
            'Authorization': `Bearer ${this._accessToken}`
        }
    }).pipe(
        tap((user) => {
          // Guardar el nombre del usuario en localStorage si está disponible
          if (user?.profile?.nombre) {
            localStorage.setItem('userName', user.profile.nombre);
          } else if (user?.profile?.nombre_completo) {
            localStorage.setItem('userName', user.profile.nombre_completo);
          }
        }),
        catchError(this.handleError)
    );
  }

  private handleError(error: any) {
    console.error('Error en AuthService:', error);
    const errorMessage = error.error?.message || error.message || 'Error desconocido de autenticación.';
    return throwError(() => new Error(errorMessage));
  }
}