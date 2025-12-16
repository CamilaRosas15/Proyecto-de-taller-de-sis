// src/app/services/auth.ts (Frontend Angular)
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError, tap, switchMap, map } from 'rxjs';
import { Router } from '@angular/router';

// ✅ INTERFACES ACTUALIZADAS
interface LoginResponse { 
  message: string;
  accessToken: string; 
  refreshToken?: string;
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
  refreshToken?: string; // ✅ AÑADIDO
  user?: any;            // ✅ AÑADIDO
}

export interface UserProfileData {
  nombre_completo: string;
  edad: number;
  peso: number;
  sexo: string;            // ✅ Nuevo campo
  altura: number;        // ✅ Nuevo campo
  objetivo: string;
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
  private baseUrl = 'https://proyecto-de-taller-de-sis.onrender.com/api/auth';
  private _accessToken: string | null = null;
  private _currentUserId: string | null = null;
  private _currentUserEmail: string | null = null;
  private _refreshToken: string | null = null;

  constructor(private http: HttpClient, private router: Router) {
    this._accessToken = localStorage.getItem('accessToken');
    this._currentUserId = localStorage.getItem('userId');
    this._currentUserEmail = localStorage.getItem('userEmail');
    this._refreshToken = localStorage.getItem('refreshToken');
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

  get refreshToken(): string | null {
    return this._refreshToken;
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

  // ✅ Guardar refresh token (cuando esté disponible)
  setRefreshToken(refreshToken?: string | null): void {
    if (refreshToken) {
      this._refreshToken = refreshToken;
      localStorage.setItem('refreshToken', refreshToken);
    }
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
          this.setRefreshToken(response.refreshToken);
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
        this.setRefreshToken(response.refreshToken);
      }),
      catchError(this.handleError)
    );
  }

  logout(): void {
    this._accessToken = null;
    this._currentUserId = null;
    this._currentUserEmail = null;
    this._refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName'); // Limpiar también el nombre (clave normalizada)
    localStorage.removeItem('user_name'); // Limpiar clave legacy
    localStorage.removeItem('refreshToken');
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
          console.log('[AuthService] /me respondió:', user);
          console.log('[AuthService] Campos de nombre recibidos -> nombre:', user?.profile?.nombre, ' | nombre_completo:', user?.profile?.nombre_completo);
          // Guardar el nombre del usuario en localStorage si está disponible
          if (user?.profile?.nombre) {
            localStorage.setItem('userName', user.profile.nombre);
            localStorage.removeItem('user_name');
            console.log('[AuthService] Persistido userName con profile.nombre:', user.profile.nombre);
          } else if (user?.profile?.nombre_completo) {
            localStorage.setItem('userName', user.profile.nombre_completo);
            localStorage.removeItem('user_name');
            console.log('[AuthService] Persistido userName con profile.nombre_completo:', user.profile.nombre_completo);
          }
        }),
        catchError((err) => {
          // Si el token expiró, intentar refresh y reintentar una sola vez
          const msg = err?.message || err?.error?.message || '';
          if (msg.toLowerCase().includes('expired') || err.status === 401) {
            console.warn('[AuthService] Token expirado detectado, intentando refresh...');
            return this.refreshSession().pipe(
              tap((newToken) => {
                console.log('[AuthService] Refresh exitoso, nuevo accessToken obtenido');
                this._accessToken = newToken;
                localStorage.setItem('accessToken', newToken || '');
              }),
              // Reintentar la llamada a /me con el nuevo token
              switchMap(() => this.http.get<any>(`${this.baseUrl}/me`, {
                headers: { 'Authorization': `Bearer ${this._accessToken}` }
              }).pipe(
                tap((user) => {
                  console.log('[AuthService] /me (tras refresh) respondió:', user);
                  if (user?.profile?.nombre) {
                    localStorage.setItem('userName', user.profile.nombre);
                    localStorage.removeItem('user_name');
                  } else if (user?.profile?.nombre_completo) {
                    localStorage.setItem('userName', user.profile.nombre_completo);
                    localStorage.removeItem('user_name');
                  }
                })
              ))
            );
          }
          return this.handleError(err);
        })
    );
  }

  // Intenta refrescar la sesión usando el refreshToken guardado
  refreshSession(): Observable<string | null> {
    const refresh = this._refreshToken || localStorage.getItem('refreshToken');
    if (!refresh) {
      console.warn('[AuthService] No hay refreshToken disponible');
      return throwError(() => new Error('No refresh token available'));
    }
    // Endpoint simplificado: reutilizamos login de Supabase vía backend no disponible aquí,
    // así que implementamos un endpoint de refresh en backend en una siguiente iteración.
    // Por ahora simulamos un flujo de refresh en backend: POST /auth/login con refresh no está,
    // así que creamos un endpoint mínimo luego. Aquí dejamos la estructura:
    return this.http.post<{ accessToken: string | null }>(`${this.baseUrl}/refresh`, { refreshToken: refresh }).pipe(
      tap((res) => {
        if (!res?.accessToken) throw new Error('No access token on refresh');
        this._accessToken = res.accessToken;
        localStorage.setItem('accessToken', res.accessToken);
      }),
      // devolver el nuevo token
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map((res: any) => res?.accessToken ?? null),
      catchError((e) => {
        console.error('[AuthService] Error al refrescar sesión:', e);
        // Si falla el refresh, forzar logout
        this.logout();
        return throwError(() => e);
      })
    );
  }

  // 📸 NUEVO: Método para subir foto de perfil
  uploadProfilePicture(userId: string, file: File): Observable<{ message: string; url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<{ message: string; url: string }>(
      `${this.baseUrl}/profile/${userId}/upload-picture`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${this._accessToken}`
          // NO incluir 'Content-Type', Angular lo maneja automáticamente con FormData
        }
      }
    ).pipe(
      tap((response) => {
        console.log('[AuthService] Foto de perfil subida exitosamente:', response);
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