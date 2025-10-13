import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-analisis-imagen',
  standalone: true,
  imports: [CommonModule,RouterLink],
  templateUrl: './analisis-imagen.html',
  styleUrl: './analisis-imagen.scss'
})
export class AnalisisImagenComponent {
  selectedFile: File | null = null;
  imageUrl: string | null = null;
  analysisResult: string | null = null; // Cambiar de any a string para texto natural
  errorMessage: string | null = null;
  isNonFoodMessage: boolean = false; // Nueva propiedad para detectar mensajes de no-comida

  private readonly API_URL = 'http://localhost:8000/api/v1/ai/analyze-food-natural'; // Nuevo endpoint para respuesta natural

  constructor(private http: HttpClient) { }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.imageUrl = URL.createObjectURL(file);
      this.analysisResult = null;
      this.errorMessage = null;
    }
  }

  uploadImage(): void {
    if (this.selectedFile) {
      const formData = new FormData();
      formData.append('file', this.selectedFile, this.selectedFile.name);

      const headers = new HttpHeaders();
      // No Content-Type header needed for FormData, HttpClient sets it automatically

      // Configurar para recibir respuesta como texto plano
      this.http.post(this.API_URL, formData, { 
        headers, 
        responseType: 'text' // Importante: esto hace que reciba texto en lugar de JSON
      }).subscribe({
        next: (response: string) => {
          this.analysisResult = response; // Ahora response es un string
          // Detectar si es un mensaje de no-comida
          this.isNonFoodMessage = response.toLowerCase().includes('no contiene comida') || 
                                 response.includes('especializada en análisis nutricional');
          this.errorMessage = null;
        },
        error: (error) => {
          console.error('Error al subir la imagen:', error);
          this.errorMessage = 'Hubo un error al analizar la imagen. Por favor, inténtalo de nuevo.';
          this.analysisResult = null;
        }
      });
    } else {
      this.errorMessage = 'Por favor, selecciona una imagen para subir.';
    }
  }

  resetAnalysis(): void {
    this.selectedFile = null;
    this.imageUrl = null;
    this.analysisResult = null;
    this.errorMessage = null;
    this.isNonFoodMessage = false;
  }
}
