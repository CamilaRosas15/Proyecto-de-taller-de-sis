
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http'; // ¡Importar HttpClient!
import { Observable, catchError, throwError } from 'rxjs'; // ¡Importar Observable y operadores de RxJS!

// Define una interfaz para tus recetas para mejor tipado (¡muy recomendado!)
// Ajusta estos campos para que coincidan EXACTAMENTE con tu tabla 'recetas' en Supabase
export interface Receta {
  id_receta: number;
  nombre: string;
  descripcion: string;
  categoria?: string; // Hazlo opcional si es nullable en tu DB
  tiempo_preparacion?: number; // Hazlo opcional si es nullable
  calorias_totales?: number; // Hazlo opcional si es nullable
  instrucciones: string;
  imagen_url?: string; // Opcional
  // Añade otros campos de tu tabla 'recetas' aquí si los tienes
}

@Injectable({
  providedIn: 'root'
})
export class RecipeService { // <-- ¡Nota el cambio de 'Recipe' a 'RecipeService'!
  private baseUrl = 'http://localhost:3000/api/recipes'; // URL de tu controlador NestJS

  constructor(private http: HttpClient) { } // ¡Inyectar HttpClient en el constructor!

  getRecipeById(id: number): Observable<Receta> {
    return this.http.get<Receta>(`${this.baseUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: any) {
    console.error('Error en RecipeService:', error);
    return throwError(() => new Error(error.error?.message || 'Error desconocido al obtener la receta.'));
  }
}