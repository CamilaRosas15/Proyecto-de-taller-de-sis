// analisis-imagen.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { RouterLink, Router } from '@angular/router';
import { HistorialService, HistorialSidebar } from '../../services/historial.service';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-analisis-imagen',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './analisis-imagen.html',
  styleUrl: './analisis-imagen.scss'
})
export class AnalisisImagenComponent implements OnInit {
  selectedFile: File | null = null;
  imageUrl: string | null = null;
  analysisResult: string | null = null;
  errorMessage: string | null = null;
  isNonFoodMessage: boolean = false;
  historialSidebar: HistorialSidebar[] = [];
  userName: string | null = null;
  
  private readonly FASTAPI_URL = 'http://localhost:8000/api/v1/ai/analyze-food-natural';

  constructor(
    private http: HttpClient,
    private historialService: HistorialService,
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.userName = this.authService.currentUserName;
    this.cargarHistorialSidebar();
  }

  get userId(): string | null {
    return this.authService.currentUserId;
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.imageUrl = URL.createObjectURL(file);
      this.analysisResult = null;
      this.errorMessage = null;
      this.isNonFoodMessage = false;
    }
  }

  uploadImage(): void {
    if (this.selectedFile) {
      const formData = new FormData();
      formData.append('file', this.selectedFile, this.selectedFile.name);

      const headers = new HttpHeaders();

      this.errorMessage = null;
      this.analysisResult = 'Analizando imagen...';

      this.http.post(this.FASTAPI_URL, formData, { 
        headers, 
        responseType: 'text'
      }).subscribe({
        next: (response: string) => {
          this.analysisResult = response;
          this.isNonFoodMessage = response.toLowerCase().includes('no contiene comida') || 
                                 response.toLowerCase().includes('especializada en análisis nutricional') ||
                                 response.toLowerCase().includes('no es una imagen de comida');
          this.errorMessage = null;

          // Guardar en el historial solo si es comida y tenemos el archivo original
          if (!this.isNonFoodMessage && this.selectedFile && this.userId) {
            this.guardarEnHistorial(this.selectedFile, response);
          }
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

  private guardarEnHistorial(imagenFile: File, analysisResult: string): void {
    const userId = this.userId;
    if (!userId) {
      console.error('No hay usuario autenticado');
      return;
    }

    // Crear FormData con la imagen original
    const formData = new FormData();
    formData.append('id_usuario', userId);
    formData.append('analisis', analysisResult);
    formData.append('imagen', imagenFile);

    // Usar HttpClient directamente para enviar el FormData
    const token = localStorage.getItem('accessToken');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    this.http.post('http://localhost:3000/api/platos-escaneados', formData, { headers })
      .subscribe({
        next: (plato: any) => {
          console.log('Análisis guardado en historial:', plato);
          this.cargarHistorialSidebar();
        },
        error: (error) => {
          console.error('Error al guardar en historial:', error);
          // No mostramos error al usuario
        }
      });
  }

  cargarHistorialSidebar(): void {
    const userId = this.userId;
    if (!userId) {
      console.error('No hay usuario autenticado');
      return;
    }

    this.historialService.obtenerHistorialSidebar(userId)
      .subscribe({
        next: (historial) => {
          this.historialSidebar = historial;
          console.log('Historial cargado:', historial);
        },
        error: (error) => {
          console.error('Error al cargar historial:', error);
          this.errorMessage = 'Error al cargar el historial';
        }
      });
  }

  cargarAnalisisDesdeHistorial(idPlato: string): void {
    this.historialService.obtenerDetallePlato(idPlato)
      .subscribe({
        next: (plato) => {
          this.imageUrl = plato.imagen_url;
          this.analysisResult = plato.analisis;
          this.isNonFoodMessage = false;
          this.errorMessage = null;
          this.selectedFile = null;
          
          setTimeout(() => {
            const resultsElement = document.querySelector('.analysis-results');
            if (resultsElement) {
              resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 100);
        },
        error: (error) => {
          console.error('Error al cargar análisis:', error);
          this.errorMessage = 'No se pudo cargar el análisis del historial.';
        }
      });
  }

  eliminarDelHistorial(idPlato: string, event: Event): void {
    event.stopPropagation();
    
    if (confirm('¿Estás seguro de eliminar este análisis del historial?')) {
      this.historialService.eliminarAnalisis(idPlato)
        .subscribe({
          next: () => {
            console.log('Análisis eliminado');
            this.cargarHistorialSidebar();
            
            const platoEliminado = this.historialSidebar.find(item => item.id_plato === idPlato);
            if (platoEliminado && this.analysisResult) {
              this.resetAnalysis();
            }
          },
          error: (error) => {
            console.error('Error al eliminar análisis:', error);
            alert('No se pudo eliminar el análisis. Por favor, intenta nuevamente.');
          }
        });
    }
  }

  resetAnalysis(): void {
    this.selectedFile = null;
    
    if (this.imageUrl && this.imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.imageUrl);
    }
    
    this.imageUrl = null;
    this.analysisResult = null;
    this.errorMessage = null;
    this.isNonFoodMessage = false;
  }

  formatearFecha(fecha: string): string {
    try {
      if (!fecha) return 'Fecha no disponible';
      
      const date = new Date(fecha);
      const hoy = new Date();
      const ayer = new Date(hoy);
      ayer.setDate(ayer.getDate() - 1);

      if (isNaN(date.getTime())) {
        return 'Fecha inválida';
      }

      if (date.toDateString() === hoy.toDateString()) {
        return 'Hoy';
      } else if (date.toDateString() === ayer.toDateString()) {
        return 'Ayer';
      } else {
        return date.toLocaleDateString('es-ES', { 
          day: 'numeric', 
          month: 'short',
          year: date.getFullYear() !== hoy.getFullYear() ? 'numeric' : undefined
        });
      }
    } catch (error) {
      console.error('Error formateando fecha:', error, 'Fecha recibida:', fecha);
      return 'Fecha inválida';
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        this.selectedFile = file;
        this.imageUrl = URL.createObjectURL(file);
        this.analysisResult = null;
        this.errorMessage = null;
        this.isNonFoodMessage = false;
      } else {
        this.errorMessage = 'Por favor, selecciona solo archivos de imagen.';
      }
    }
  }
}