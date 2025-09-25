import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-analisis-imagen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analisis-imagen.html',
  styleUrl: './analisis-imagen.scss'
})
export class AnalisisImagenComponent {
  selectedFile: File | null = null;
  imageUrl: string | null = null;
  analysisResult: any | null = null;
  errorMessage: string | null = null;

  private readonly API_URL = 'http://localhost:8000/api/v1/ai/test-detection'; // Ajusta esto si tu backend está en otra URL

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

      this.http.post(this.API_URL, formData, { headers }).subscribe({
        next: (response) => {
          this.analysisResult = response;
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
}
