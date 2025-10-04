import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

export interface IngredienteReceta {
  id_ingrediente: number;
  nombre: string;
  unidad: string | null;
  cantidad: number | null;
  calorias?: number | null;
  proteinas?: number | null;
  carbohidratos?: number | null;
  grasas?: number | null;
}

export interface Receta {
  id_receta: number;
  nombre: string;
  descripcion: string | null;
  categoria?: string | null;
  tiempo_preparacion?: number | null;
  calorias_totales?: number | null;
  instrucciones: string | null;
  imagen_url?: string | null;
  ingredientes?: IngredienteReceta[];
}

@Injectable({ providedIn: 'root' })
export class RecipeService {
  private baseUrl = 'http://localhost:3000/api/recipes';

  constructor(private http: HttpClient) {}

  getRecipeById(id: string | number): Observable<Receta> {
    const numId = typeof id === 'string' ? Number(id) : id;
    if (Number.isNaN(numId)) {
      return throwError(() => new Error('El ID de la receta debe ser numérico.'));
    }
    return this.http.get<Receta>(`${this.baseUrl}/${numId}`).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: any) {
    console.error('Error en RecipeService:', error);
    return throwError(() =>
      new Error(error?.error?.message || 'Error desconocido al obtener la receta.')
    );
  }
}
