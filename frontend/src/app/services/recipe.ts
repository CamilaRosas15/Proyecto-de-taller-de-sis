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

// Nuevas interfaces para las recomendaciones
export interface RecommendRequest {
  userId?: string;
  alergias?: string[];
  no_me_gusta?: string[];
  gustos?: string[];
  kcal_diarias?: number;
  tiempo_max?: number;
  use_llm?: boolean;
  top_n?: number;
  exclude_ids?: number[];
  random?: boolean;
  seed?: number;
}

export interface OpcionOut {
  id_receta: number;
  titulo: string;
  descripcion: string | null;
  categoria: string | null;
  tiempo_preparacion: number | null;
  kcal_totales: number | null;
  pasos: string[];
  imagen_url: string | null;
  ingredientes: IngredienteReceta[];
  motivos: string[];
  ia_explicacion?: string | null;
}

export interface RecommendResponse {
  opciones: OpcionOut[];
  mensaje?: string;
}

@Injectable({ providedIn: 'root' })
export class RecipeService {
  private baseUrl = 'http://localhost:3000/api/recipes'; 

  constructor(private http: HttpClient) {}

  // NUEVO MÉTODO: Para obtener todas las recetas
  getAllRecipes(): Observable<Receta[]> {
    return this.http.get<Receta[]>(`${this.baseUrl}`).pipe(
      catchError(this.handleError)
    );
  }

  // Método existente
  getRecipeById(id: string | number): Observable<Receta> {
    const numId = typeof id === 'string' ? Number(id) : id;
    if (Number.isNaN(numId)) {
      return throwError(() => new Error('El ID de la receta debe ser numérico.'));
    }
    return this.http.get<Receta>(`${this.baseUrl}/${numId}`).pipe(
      catchError(this.handleError)
    );
  }

  // Método existente: Para obtener recomendaciones de recetas con IA
  recomendarRecetas(params: RecommendRequest): Observable<RecommendResponse> {
    return this.http.post<RecommendResponse>(`${this.baseUrl}/recomendaciones`, params).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: any) {
    console.error('Error en RecipeService:', error);
    return throwError(() =>
      new Error(error?.error?.message || 'Error desconocido al obtener la receta.')
    );
  }

  // Añadir en RecipeService
  saveToHistory(userId: string, idReceta: number): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/history/${userId}`, 
      { id_receta: idReceta }
    ).pipe(
      catchError(this.handleError)
    );
  }
}