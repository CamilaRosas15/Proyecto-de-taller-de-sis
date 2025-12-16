// analisis-imagen.component.ts
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { RouterLink, Router } from '@angular/router';
import { HistorialService, HistorialSidebar } from '../../services/historial.service';
import { AuthService } from '../../services/auth';
import { adaptFriendlyTextToFoodDashboard, FoodDashboardData } from '../../core/adapters/vision-dashboard.adapter';
import { FoodDashboardComponent } from '../../components/food-dashboard/food-dashboard.component';
import { AiTextToHtmlPipe } from '../../pipes/ai-text-to-html.pipe';

@Component({
  selector: 'app-analisis-imagen',
  standalone: true,
  imports: [CommonModule, RouterLink, FoodDashboardComponent, AiTextToHtmlPipe],
  templateUrl: './analisis-imagen.html',
  styleUrls: ['./analisis-imagen.scss']
})
export class AnalisisImagenComponent implements OnInit {
  selectedFile: File | null = null;
  imageUrl: string | null = null;
  imageBase64: string = '';
  analysisResult: string | null = null;
  narrativeAnalysis: string | null = null; // Parte narrativa para el modal
  dashboardData: FoodDashboardData | null = null;
  showRaw: boolean = false;
  errorMessage: string | null = null;
  isNonFoodMessage: boolean = false;
  historialSidebar: HistorialSidebar[] = [];
  userName: string | null = null;
  userEmail: string | null = null;
  userAvatar: string = 'assets/user.png'; // NUEVA PROPIEDAD PARA LA FOTO
  hasCameraSupport: boolean = false;
  
  private readonly FASTAPI_URL = 'https://proyecto-de-taller-de-sis.onrender.com/api/v1/ai/analyze-food-natural';

  constructor(
    private http: HttpClient,
    private historialService: HistorialService,
    public authService: AuthService,
    private router: Router,
    private cdRef: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.userName = this.authService.currentUserName;
    this.userEmail = this.authService.currentUserEmail;
    this.cargarDatosUsuario(); // NUEVO: Cargar datos del usuario incluyendo foto
    this.cargarHistorialSidebar();
    
    // Detectar si hay cámara disponible
    await this.detectCamera();
  }

  // NUEVO MÉTODO: Cargar datos del usuario incluyendo foto de perfil
  cargarDatosUsuario() {
    // Intentar cargar la foto del usuario si está autenticado
    if (this.authService.isAuthenticated()) {
      const userId = this.authService.currentUserId;
      if (userId) {
        this.authService.getCurrentUser().subscribe({
          next: (userData) => {
            console.log('Datos del usuario cargados en análisis-imagen:', userData);
            const profile = userData.profile;
            if (profile) {
              // Usar propiedades seguras con type assertion
              this.userAvatar = this.getSafeProfileProperty(profile, 'foto_perfil_url') || 
                               this.getSafeProfileProperty(profile, 'avatar') || 
                               this.getSafeProfileProperty(profile, 'photo_url') || 
                               'assets/user.png';
              
              this.userName = this.getSafeProfileProperty(profile, 'nombre') || 
                             this.getSafeProfileProperty(profile, 'nombre_completo') || 
                             this.authService.currentUserName || 
                             'Usuario';
              
              this.userEmail = userData.email || this.authService.currentUserEmail || '@usuario';
            } else {
              // Fallback: intentar cargar solo el perfil
              this.authService.getUserProfile(userId).subscribe({
                next: (profileData) => {
                  console.log('Perfil cargado por fallback en análisis-imagen:', profileData);
                  this.userAvatar = this.getSafeProfileProperty(profileData, 'foto_perfil_url') || 
                                   this.getSafeProfileProperty(profileData, 'avatar') || 
                                   this.getSafeProfileProperty(profileData, 'photo_url') || 
                                   'assets/user.png';
                  
                  this.userName = this.getSafeProfileProperty(profileData, 'nombre') || 
                                 this.getSafeProfileProperty(profileData, 'nombre_completo') || 
                                 'Usuario';
                },
                error: (fallbackError) => {
                  console.error('Error en fallback también en análisis-imagen:', fallbackError);
                }
              });
            }
          },
          error: (error) => {
            console.error('Error cargando datos del usuario en análisis-imagen:', error);
          }
        });
      }
    }
  }

  // MÉTODO AUXILIAR: Obtener propiedades de perfil de manera segura
  private getSafeProfileProperty(profile: any, property: string): string | null {
    return profile && typeof profile === 'object' && property in profile 
      ? (profile as any)[property] 
      : null;
  }

  // Detectar cámara disponible
  async detectCamera(): Promise<void> {
    try {
      // Verificar si el navegador soporta getUserMedia
      if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
        // Intentar enumerar dispositivos
        const devices = await navigator.mediaDevices.enumerateDevices();
        this.hasCameraSupport = devices.some(device => device.kind === 'videoinput');
        
        console.log('Cámara detectada:', this.hasCameraSupport);
      } else {
        this.hasCameraSupport = false;
      }
    } catch (error) {
      console.error('Error al detectar cámara:', error);
      this.hasCameraSupport = false;
    }
  }

  // Abrir la cámara del dispositivo
  async openCamera(): Promise<void> {
    try {
      // Detectar si está en dispositivo móvil
      const esMovil = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      if (esMovil) {
        // 📱 En móvil, usar input con capture
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore propiedad válida en navegadores móviles
        input.capture = 'environment'; // Cámara trasera
        input.onchange = (event: any) => {
          const file = event.target.files?.[0];
          if (file) {
            // revoke anterior si existiera
            if (this.imageUrl && this.imageUrl.startsWith('blob:')) {
              URL.revokeObjectURL(this.imageUrl);
            }
            this.selectedFile = file;
            this.imageUrl = URL.createObjectURL(file);
            this.analysisResult = null;
            this.errorMessage = null;
            this.isNonFoodMessage = false;
            
            // Convertir a base64 para el análisis narrativo
            this.convertToBase64(file);
            
            this.cdRef.detectChanges(); // forzar render inmediato
          }
        };
        input.click();
      } else if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
        // 💻 En laptop/PC, abrir cámara con getUserMedia
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;
        video.style.width = '100%';
        video.style.maxWidth = '400px';
        video.style.borderRadius = '10px';
        video.style.display = 'block';

        const captureButton = document.createElement('button');
        captureButton.textContent = '📷 Capturar';
        captureButton.style.marginTop = '10px';
        captureButton.style.padding = '8px 16px';
        captureButton.style.border = 'none';
        captureButton.style.backgroundColor = '#4caf50';
        captureButton.style.color = 'white';
        captureButton.style.borderRadius = '8px';
        captureButton.style.cursor = 'pointer';

        const closeButton = document.createElement('button');
        closeButton.textContent = '❌ Cancelar';
        closeButton.style.marginTop = '10px';
        closeButton.style.padding = '8px 16px';
        closeButton.style.backgroundColor = '#e53935';
        closeButton.style.color = 'white';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '8px';
        closeButton.style.cursor = 'pointer';

        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.background = 'rgba(0,0,0,0.85)';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '10000';
        overlay.style.padding = '20px';
        overlay.appendChild(video);
        overlay.appendChild(captureButton);
        overlay.appendChild(closeButton);
        document.body.appendChild(overlay);

        // Asegurar que el video empiece a reproducir (algunos navegadores requieren play explícito)
        try {
          await (video as HTMLVideoElement).play();
        } catch (playErr) {
          // no fatal, pero sí log
          console.warn('No se pudo auto-play video:', playErr);
        }

        // Capturar la imagen
        captureButton.onclick = () => {
          const w = video.videoWidth || 640;
          const h = video.videoHeight || 480;

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          canvas.toBlob((blob) => {
            if (blob) {
              if (this.imageUrl && this.imageUrl.startsWith('blob:')) {
                URL.revokeObjectURL(this.imageUrl);
              }

              const file = new File([blob], 'foto_capturada.png', { type: 'image/png' });
              this.selectedFile = file;
              this.imageUrl = URL.createObjectURL(file);
              this.analysisResult = null;
              this.errorMessage = null;
              this.isNonFoodMessage = false;

              // Convertir a base64 para el análisis narrativo
              this.convertToBase64(file);

              // 🔹 Forzar render para que Angular muestre la imagen y el botón "Analizar"
              this.cdRef.detectChanges();
            }
          }, 'image/png');

          // Detener video
          try {
            const s = video.srcObject as MediaStream | null;
            if (s) s.getTracks().forEach(t => t.stop());
          } catch (err) {
            console.warn('Error deteniendo tracks:', err);
          }
          video.srcObject = null;

          if (overlay.parentElement) overlay.parentElement.removeChild(overlay);
        };


        // Cerrar cámara sin capturar
        closeButton.onclick = () => {
          try {
            const s = video.srcObject as MediaStream | null;
            if (s) s.getTracks().forEach(t => t.stop());
          } catch (stErr) {
            console.warn('Error deteniendo tracks en close:', stErr);
          }
          video.srcObject = null;
          if (overlay.parentElement) overlay.parentElement.removeChild(overlay);
        };
      } else {
        this.errorMessage = 'Tu dispositivo no tiene cámara disponible.';
      }
    } catch (error) {
      console.error('Error al abrir cámara:', error);
      this.errorMessage = 'No se pudo acceder a la cámara. Verifica los permisos.';
    }
  }

  get userId(): string | null {
    return this.authService.currentUserId;
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files?.[0];
    if (file) {
      if (this.imageUrl && this.imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(this.imageUrl);
      }
      this.selectedFile = file;
      this.imageUrl = URL.createObjectURL(file);
      this.analysisResult = null;
      this.errorMessage = null;
      this.isNonFoodMessage = false;
      
      // Convertir a base64 para el análisis narrativo
      this.convertToBase64(file);
      
      this.cdRef.detectChanges();
    }
  }

  private convertToBase64(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const base64String = e.target.result as string;
        // Remover el prefijo "data:image/...;base64,"
        this.imageBase64 = base64String.split(',')[1];
      }
    };
    reader.readAsDataURL(file);
  }

  uploadImage(): void {
    if (!this.selectedFile) {
      this.errorMessage = 'Por favor, selecciona una imagen para subir.';
      return;
    }

    this.errorMessage = null;
    this.analysisResult = 'Analizando imagen...';
    this.dashboardData = null;
    this.isNonFoodMessage = false;

    // 🔹 Forzar render del spinner antes de la petición
    this.cdRef.detectChanges();

    // 🔹 Pequeño delay para que Angular muestre el loading
    setTimeout(() => {
      const formData = new FormData();
      formData.append('file', this.selectedFile!, this.selectedFile!.name);

      const headers = new HttpHeaders();

      this.http.post(this.FASTAPI_URL, formData, { 
        headers, 
        responseType: 'text'
      }).subscribe({
        next: (response: string) => {
          console.log('Respuesta cruda de la IA:', response);
          
          // Procesar respuesta dual si contiene separador
          if (response.includes('---SEPARADOR---')) {
            const parts = response.split('---SEPARADOR---');
            if (parts.length >= 2) {
              this.narrativeAnalysis = parts[0].trim(); // Parte narrativa para el modal
              this.analysisResult = parts[1].trim(); // Parte estructurada para el dashboard
              console.log('✅ ANÁLISIS SEPARADO CORRECTAMENTE');
              console.log('📖 Análisis narrativo (para modal):', this.narrativeAnalysis.substring(0, 200) + '...');
              console.log('📊 Análisis estructurado (para dashboard):', this.analysisResult.substring(0, 200) + '...');
            } else {
              this.analysisResult = response;
              this.narrativeAnalysis = response;
              console.log('⚠️ SEPARADOR ENCONTRADO PERO NO SE PUDIERON SEPARAR LAS PARTES');
            }
          } else {
            // Respuesta simple (backward compatibility)
            this.analysisResult = response;
            this.narrativeAnalysis = response;
            console.log('⚠️ NO SE ENCONTRÓ SEPARADOR - USANDO RESPUESTA COMPLETA PARA AMBAS');
            console.log('📄 Respuesta completa:', response.substring(0, 500) + '...');
          }
          
          this.dashboardData = adaptFriendlyTextToFoodDashboard(this.analysisResult);
          console.log('Dashboard data procesado:', this.dashboardData);
          
          const lower = response.toLowerCase();
          this.isNonFoodMessage = 
            lower.includes('no contiene comida') || 
            lower.includes('especializada en análisis nutricional') ||
            lower.includes('no es una imagen de comida');
          
          this.errorMessage = null;

          // Guardar en el historial solo si es comida y tenemos el archivo original
          if (!this.isNonFoodMessage && this.selectedFile && this.userId) {
            this.guardarEnHistorial(this.selectedFile, this.analysisResult);
          }

          this.cdRef.detectChanges();
        },
        error: (error) => {
          console.error('Error al subir la imagen:', error);
          this.errorMessage = 'Hubo un error al analizar la imagen. Por favor, inténtalo de nuevo.';
          this.analysisResult = null;
          this.cdRef.detectChanges();
        }
      });
    }, 50);
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

    this.http.post('https://proyecto-de-taller-de-sis-6xbp.onrender.com/api/platos-escaneados', formData, { headers })
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
          this.dashboardData = adaptFriendlyTextToFoodDashboard(plato.analisis);
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
    if (this.imageUrl && this.imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.imageUrl);
    }

    this.selectedFile = null;
    this.imageUrl = null;
    this.imageBase64 = '';
    this.analysisResult = null;
    this.narrativeAnalysis = null;
    this.errorMessage = null;
    this.isNonFoodMessage = false;

    // 👇 Fuerza a Angular a refrescar la vista, arregla el bug del botón
    this.cdRef.detectChanges();
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
        if (this.imageUrl && this.imageUrl.startsWith('blob:')) {
          URL.revokeObjectURL(this.imageUrl);
        }
        this.selectedFile = file;
        this.imageUrl = URL.createObjectURL(file);
        this.analysisResult = null;
        this.errorMessage = null;
        this.isNonFoodMessage = false;
        
        // Convertir a base64 para el análisis narrativo
        this.convertToBase64(file);
        
        this.cdRef.detectChanges();
      } else {
        this.errorMessage = 'Por favor, selecciona solo archivos de imagen.';
      }
    }
  }
}