// src/app/services/historial.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface PlatoEscaneado {
  id_plato: string;
  nombre: string;
  analisis: string;
  fecha_escaneo: string;
  imagen_url: string;
}

export interface HistorialSidebar {
  id_escaneo: string;
  id_plato: string;
  nombre: string;
  fecha: string;  // Cambiado de created_at a fecha
  imagen_url: string;
}

@Injectable({
  providedIn: 'root'
})
export class HistorialService {
  private readonly BASE_URL = 'https://proyecto-de-taller-de-sis.onrender.com/api/platos-escaneados';

  constructor(private http: HttpClient) {}

  // Guardar análisis en el historial
  guardarAnalisis(userId: string, imageUrl: string, analysisResult: string): Observable<any> {
    // Si imageUrl es una data URL (blob), necesitamos convertirla a File
    let imagenFile: File | null = null;
    
    if (imageUrl.startsWith('blob:')) {
      // Para blobs, ya tenemos el selectedFile, así que lo usamos directamente
      // Este método se llamará después de uploadImage, donde selectedFile está disponible
      return throwError(() => new Error('No se puede guardar imagen blob directamente'));
    } else if (imageUrl.startsWith('data:')) {
      imagenFile = this.dataURLtoFile(imageUrl, `analisis_${Date.now()}.jpg`);
    }

    const formData = new FormData();
    formData.append('id_usuario', userId);
    formData.append('analisis', analysisResult);
    
    if (imagenFile) {
      formData.append('imagen', imagenFile);
    } else {
      // Si no podemos obtener la imagen, guardar solo el análisis
      formData.append('analisis', analysisResult);
    }

    return this.http.post<any>(this.BASE_URL, formData, { 
      headers: this.getAuthHeaders() 
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Método auxiliar para convertir dataURL a File
  private dataURLtoFile(dataurl: string, filename: string): File {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new File([u8arr], filename, { type: mime });
  }

  // Obtener historial para sidebar
  obtenerHistorialSidebar(userId: string): Observable<HistorialSidebar[]> {
    return this.http.get<HistorialSidebar[]>(`${this.BASE_URL}/historial-sidebar`, {
      headers: this.getAuthHeaders(),
      params: { id_usuario: userId }
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Obtener detalle de un plato
  obtenerDetallePlato(idPlato: string): Observable<PlatoEscaneado> {
    return this.http.get<PlatoEscaneado>(`${this.BASE_URL}/${idPlato}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Eliminar análisis
  eliminarAnalisis(idPlato: string): Observable<any> {
    return this.http.delete(`${this.BASE_URL}/${idPlato}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Método auxiliar para obtener headers con token
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    });
  }

  // Manejo de errores
  private handleError(error: any) {
    console.error('Error en HistorialService:', error);
    let errorMessage = 'Error en el servicio de historial';
    
    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return throwError(() => new Error(errorMessage));
  }
}