import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth';
import { Observable, catchError, throwError, from } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HistoryService {
  private baseUrl = 'http://localhost:3000/api/recipes';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  async savePreferredRecipe(idReceta: number): Promise<any> {
    try {
        const userId = this.authService.currentUserId;
        if (!userId) {
        throw new Error('Usuario no autenticado');
        }

        return await this.http.post(
        `${this.baseUrl}/history/${userId}`,
        { id_receta: idReceta },
        {
            headers: {
            'Authorization': `Bearer ${this.authService.accessToken}` // AÑADIR esto
            }
        }
        ).toPromise();

    } catch (error) {
        console.error('Error guardando receta preferida:', error);
        throw error;
    }
    }

    // Y también añadir headers en getUserHistory:
    getUserHistory(): Observable<any> {
    const userId = this.authService.currentUserId;
    if (!userId) {
        return throwError(() => new Error('Usuario no autenticado'));
    }

    return this.http.get(`${this.baseUrl}/history/user/${userId}`, {
        headers: {
        'Authorization': `Bearer ${this.authService.accessToken}` // AÑADIR esto
        }
    }).pipe(
        catchError(this.handleError)
    );
    }

  private handleError(error: any) {
    console.error('Error en HistoryService:', error);
    return throwError(() => 
      new Error(error?.error?.message || 'Error desconocido en el servicio de historial.')
    );
  }
}