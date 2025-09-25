// src/app/services/auth.ts (Frontend Angular)
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError, tap } from 'rxjs';
import { Router } from '@angular/router';

interface LoginResponse { accessToken: string; user: { id: string; email: string; /* ...otros datos */ } }
interface RegisterResponse { message: string; userId: string; email: string; }
export interface UserProfileData {
    nombre_completo: string;
    edad: number;
    peso: number;
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
export class AuthService { // ✅ ¡CLASE RENOMBRADA!
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

  isLoggedIn(): boolean {
      return !!this._accessToken && !!this._currentUserId;
  }

  register(email: string, password: string): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.baseUrl}/register`, { email, password }).pipe(
      catchError(this.handleError)
    );
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, { email, password }).pipe(
      tap(response => {
        this._accessToken = response.accessToken;
        this._currentUserId = response.user.id;
        this._currentUserEmail = response.user.email;
        localStorage.setItem('accessToken', response.accessToken);
        localStorage.setItem('userId', response.user.id);
        localStorage.setItem('userEmail', response.user.email);
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

  private handleError(error: any) {
    console.error('Error en AuthService:', error);
    const errorMessage = error.error?.message || error.message || 'Error desconocido de autenticación.';
    return throwError(() => new Error(errorMessage));
  }
}