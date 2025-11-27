import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RecipeService, RecommendRequest, RecommendResponse, OpcionOut,ShoppingListItem } from '../../services/recipe';
import { Router, RouterLink } from '@angular/router';
import { HistoryService } from '../../services/history.service';
import { AuthService } from '../../services/auth';

import jsPDF from 'jspdf';

@Component({
  selector: 'app-chat-ia',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, RouterLink],
  templateUrl: './chat-ia.html',
  styleUrls: ['./chat-ia.scss']
})
export class ChatIAComponent implements OnInit {
  userMessage: string = '';
  opcionesRecetas: any[] = [];
  cargando: boolean = false;
  errorMessage: string = '';
  historialRecetas: any[] = []; 
  recetaSeleccionada: any = null; 
  isMobileMenuOpen = false;
  shoppingList: ShoppingListItem[] = []; 

  conversationHistory: any[] = [];
  editingMessageIndex: number = -1;
  editingMessageText: string = '';
  userName: string | null = null;
  userEmail: string | null = null;
  userAvatar: string = 'assets/user.png';

  preferencias = {
    alergias: [] as string[],
    noMeGusta: [] as string[],
    gustos: [] as string[],
    kcalDiarias: 2000,
    tiempoMax: 30
  };

  ultimoPayload: any = null;

  constructor(
    private recipeService: RecipeService,
    private historyService: HistoryService, 
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.cargarHistorial(); 
    this.cargarDatosUsuario();
  }

  // MÉTODO CORREGIDO: Cargar datos del usuario usando propiedades seguras
  cargarDatosUsuario() {
    this.userName = this.authService.currentUserName;
    this.userEmail = this.authService.currentUserEmail;
    
    if (this.authService.isAuthenticated()) {
      const userId = this.authService.currentUserId;
      if (userId) {
        this.authService.getCurrentUser().subscribe({
          next: (userData) => {
            console.log('Datos del usuario cargados en chat:', userData);
            const profile = userData.profile;
            if (profile) {
              // CORREGIDO: Usar propiedades seguras con type assertion
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
                  console.log('Perfil cargado por fallback en chat:', profileData);
                  this.userAvatar = this.getSafeProfileProperty(profileData, 'foto_perfil_url') || 
                                   this.getSafeProfileProperty(profileData, 'avatar') || 
                                   this.getSafeProfileProperty(profileData, 'photo_url') || 
                                   'assets/user.png';
                  
                  this.userName = this.getSafeProfileProperty(profileData, 'nombre') || 
                                 this.getSafeProfileProperty(profileData, 'nombre_completo') || 
                                 'Usuario';
                },
                error: (fallbackError) => {
                  console.error('Error en fallback también en chat:', fallbackError);
                }
              });
            }
          },
          error: (error) => {
            console.error('Error cargando datos del usuario en chat:', error);
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

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    
    if (this.isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  closeMobileMenu() {
    this.isMobileMenuOpen = false;
    document.body.style.overflow = '';
  }

  cargarHistorial() {
    if (!this.authService.isLoggedIn()) {
      console.log('Usuario no autenticado, no se puede cargar historial');
      return;
    }

    this.historyService.getUserHistory().subscribe({
      next: (historial: any) => {
        this.historialRecetas = historial || [];
        console.log('📚 Historial cargado:', this.historialRecetas);
      },
      error: (error) => {
        console.error('Error cargando historial:', error);
        this.historialRecetas = [];
      }
    });
  }

  async onSeleccionarReceta(receta: OpcionOut) {
    try {
      if (!this.authService.isLoggedIn()) {
        this.errorMessage = 'Debes iniciar sesión para guardar recetas en tu historial';
        return;
      }

      const userId = localStorage.getItem('userId');
      if (!userId) {
        this.errorMessage = 'No se encontró el usuario en la sesión';
        return;
      }

      const contexto = [
        this.userMessage ? `Usuario: ${this.userMessage}` : '',
        receta.ia_explicacion ? `IA: ${receta.ia_explicacion}` : ''
      ]
        .filter(Boolean)
        .join('\n');

      const titulo =
        this.userMessage && this.userMessage.trim().length > 0
          ? this.userMessage.trim().slice(0, 60)
          : `Recomendación: ${receta.titulo}`;

      this.recipeService
        .saveToHistory(userId, receta.id_receta, contexto, titulo)
        .subscribe({
          next: () => {
            this.errorMessage = '';
            this.recetaSeleccionada = receta;
            this.opcionesRecetas = [];
            this.shoppingList = [];
            this.cargarHistorial();
            console.log('✅ Receta guardada en historial:', receta.titulo);
          },
          error: (err) => {
            console.error('❌ Error guardando receta:', err);
            this.errorMessage = 'Error al guardar la receta en el historial';
          },
        });
      } catch (error: any) {
        console.error('❌ Error guardando receta:', error);
        this.errorMessage = error.message || 'Error al guardar la receta en el historial';
      }
  }

  onCargarRecetaDelHistorial(itemHistorial: any) {
    if (itemHistorial.receta) {
      const recetaMapeada = this.mapearRecetaAOpcionOut(itemHistorial.receta);

      if (itemHistorial.contexto_ia) {
        recetaMapeada.ia_explicacion = itemHistorial.contexto_ia;
      }

      if (!recetaMapeada.imagen_url) {
        recetaMapeada.imagen_url = this.getImagenRecetaSafe(itemHistorial.receta) || 'assets/placeholder-recipe.jpg';
      }

      this.recetaSeleccionada = recetaMapeada;
      this.opcionesRecetas = [];
      this.userMessage = '';
      this.errorMessage = '';
      this.shoppingList = [];
    } else {
      this.errorMessage = 'No se pudo cargar la receta del historial';
    }
  }
  
  private mapearRecetaAOpcionOut(receta: any): any {
    let ingredientes: any[] = [];
    if (receta.ingredientes && Array.isArray(receta.ingredientes)) {
      ingredientes = receta.ingredientes.map((item: any, index: number) => {
        let nombre = '';
        if (typeof item === 'string') {
          nombre = item;
        } else if (typeof item === 'object' && item !== null) {
          nombre = item.nombre || item.name || 'Sin nombre';
        } else {
          nombre = String(item);
        }
        
        return {
          id_ingrediente: index + 1,
          nombre: nombre,
          unidad: null,
          cantidad: null,
          calorias: null,
          proteinas: null,
          carbohidratos: null,
          grasas: null
        };
      });
    }

    let pasos: string[] = [];
    if (receta.instrucciones) {
      pasos = receta.instrucciones
        .split('\n')
        .map((paso: string) => paso.trim())
        .filter((paso: string) => paso.length > 0);
    }

    return {
      id_receta: receta.id_receta,
      titulo: receta.nombre || 'Sin título',
      descripcion: receta.descripcion || null,
      categoria: receta.categoria || null,
      tiempo_preparacion: receta.tiempo_preparacion || null,
      kcal_totales: receta.calorias_totales || null,
      pasos: pasos,
      imagen_url: receta.imagen_url || receta.imagen || null,
      ingredientes: ingredientes,
      motivos: [],
      ia_explicacion: null
    };
  }

  volverAlChat() {
    this.recetaSeleccionada = null;
    this.opcionesRecetas = [];
    this.userMessage = '';
    this.errorMessage = '';
    this.conversationHistory = [];
    this.shoppingList = [];
    this.cancelEdit();
  }

  sendMessageWithValidation() {
    if (!this.userMessage.trim()) {
      this.errorMessage = 'Por favor, escribe tu mensaje para comenzar la conversación';
      return;
    }
    
    this.sendMessage();
  }

  startEditMessage(messageIndex: number) {
    const messageToEdit = this.conversationHistory[messageIndex];
    this.editingMessageIndex = messageIndex;
    this.editingMessageText = messageToEdit.content;
    
    setTimeout(() => {
      const inputElement = document.querySelector('.edit-message-input') as HTMLInputElement;
      if (inputElement) {
        inputElement.focus();
        inputElement.select();
      }
    }, 100);
  }

  saveEditedMessage() {
    if (!this.editingMessageText.trim()) {
      this.cancelEdit();
      return;
    }

    if (this.editingMessageIndex !== -1) {
      this.conversationHistory[this.editingMessageIndex].content = this.editingMessageText.trim();
      this.conversationHistory[this.editingMessageIndex].timestamp = new Date();
      
      const userMessageIndex = this.editingMessageIndex;
      this.conversationHistory = this.conversationHistory.slice(0, userMessageIndex + 1);
      
      this.cancelEdit();
      this.regenerateResponse(userMessageIndex);
    }
  }

  cancelEdit() {
    this.editingMessageIndex = -1;
    this.editingMessageText = '';
  }

  regenerateResponse(messageIndex: number) {
    const editedMessage = this.conversationHistory[messageIndex].content;
    
    this.cargando = true;
    this.errorMessage = '';
    this.recetaSeleccionada = null;

    this.procesarMensaje(editedMessage);
    this.generarRecomendaciones(editedMessage);
  }

  sendMessage() {
    if (this.editingMessageIndex !== -1) {
      this.cancelEdit();
    }

    this.recetaSeleccionada = null;

    this.preferencias = {
      alergias: [],
      noMeGusta: [],
      gustos: [],
      kcalDiarias: 2000,
      tiempoMax: 30
    };

    if (!this.userMessage.trim()) {
      this.userMessage = 'Recomiéndame recetas';
    }

    this.conversationHistory.push({
      type: 'user',
      content: this.userMessage,
      timestamp: new Date()
    });

    const currentMessage = this.userMessage;
    this.userMessage = '';
    this.recetaSeleccionada = null;
    this.cargando = true;
    this.errorMessage = '';

    this.procesarMensaje(currentMessage);
    this.generarRecomendaciones(currentMessage);
  }

  procesarMensaje(mensaje: string) {
    const normalize = (s: string) => s
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); 

    const msg = normalize(mensaje);

    const catalogoGustos = ['pollo','pasta','ensalada','verduras','frutas','wrap','arroz','sopa','pescado'];
    this.preferencias.gustos = catalogoGustos.filter(x => msg.includes(x));

    const alergias: string[] = [];
    const reAlergia = /(alergi\w*\s+a|intoleran\w*\s+a)\s+([^.,;]+)/g; 
    let m: RegExpExecArray | null;
    while ((m = reAlergia.exec(msg)) !== null) {
      const lista = m[2].split(/,| y | e |\/|;/).map(s => s.trim()).filter(Boolean);
      alergias.push(...lista);
    }

    const catalogoAlergenos = ['gluten','lactosa','mariscos','nueces','mani','maní','huevo','soya','soja','avena','fresa','fresas'];
    catalogoAlergenos.forEach(x => { if (msg.includes(x)) alergias.push(x); });
    this.preferencias.alergias = Array.from(new Set(alergias));

    const dislikes: string[] = [];
    const reDislike = /(no\s+me\s+gustan?|odio|evito)\s+([^.,;]+)/g;
    while ((m = reDislike.exec(msg)) !== null) {
      const lista = m[2].split(/,| y | e |\/|;/).map(s => s.trim()).filter(Boolean);
      dislikes.push(...lista);
    }
    const catalogoNoMeGusta = ['tomate','cebolla','pimiento','picante','cilantro','pepino','berenjena','aceituna'];
    catalogoNoMeGusta.forEach(x => {
      if (msg.includes(`no me gusta ${x}`) || msg.includes(`odio ${x}`) || msg.includes(`evito ${x}`)) dislikes.push(x);
    });
    this.preferencias.noMeGusta = Array.from(new Set(dislikes));

    const tiempoMatch = msg.match(/(\d+)\s*min/);
    if (tiempoMatch) {
      this.preferencias.tiempoMax = parseInt(tiempoMatch[1], 10);
    }

    const kcalMatch = msg.match(/(\d+)\s*kcal/);
    if (kcalMatch) {
      this.preferencias.kcalDiarias = parseInt(kcalMatch[1], 10);
    }
  }

  generarRecomendaciones(userMessage?: string) {
    const userId = localStorage.getItem('userId') || undefined;

    const params: RecommendRequest = {
      userId,
      top_n: 2,
      use_llm: true
    };
    
    if (userMessage && userMessage.trim()) {
      (params as any).user_msg = userMessage.trim();
    }

    if (this.preferencias.alergias.length)   params.alergias     = this.preferencias.alergias;
    if (this.preferencias.noMeGusta.length)  params.no_me_gusta  = this.preferencias.noMeGusta;
    if (this.preferencias.gustos.length)     params.gustos       = this.preferencias.gustos;
    if (this.preferencias.kcalDiarias !== 2000) params.kcal_diarias = this.preferencias.kcalDiarias;
    if (this.preferencias.tiempoMax !== 30)     params.tiempo_max   = this.preferencias.tiempoMax;

    this.ultimoPayload = params; 

    this.recipeService.recomendarRecetas(params).subscribe({
      next: (response: RecommendResponse) => {
        this.cargando = false;
        
        this.opcionesRecetas = (response.opciones || []).map(receta => {
          if (receta.pasos && Array.isArray(receta.pasos)) {
            receta.pasos = receta.pasos.filter(paso => {
              const pasoLimpio = typeof paso === 'string' ? paso.trim() : String(paso).trim();
              return pasoLimpio.length > 0;
            });
          }

          if (!receta.imagen_url) {
            receta.imagen_url = 'assets/placeholder-recipe.jpg';
          }
  
          return receta;
        });

        this.conversationHistory.push({
          type: 'assistant',
          content: `Te recomiendo ${this.opcionesRecetas.length} recetas:`,
          recipes: [...this.opcionesRecetas],
          timestamp: new Date()
        });

        this.opcionesRecetas = [];
      },
      error: (error: any) => {
        this.cargando = false;
        this.errorMessage = 'Error al generar recomendaciones: ' + (error?.message || error?.statusText || 'desconocido');
        console.error('Error:', error);
      }
    });
  }

  clearChat() {
    this.userMessage = '';
    this.opcionesRecetas = [];
    this.errorMessage = '';
    this.ultimoPayload = null;
    this.recetaSeleccionada = null; 
    this.shoppingList = [];
    this.editingMessageIndex = -1; 
    this.editingMessageText = ''; 
    this.preferencias = {
      alergias: [],
      noMeGusta: [],
      gustos: [],
      kcalDiarias: 2000,
      tiempoMax: 30
    };
    this.conversationHistory = [];
  }

  getImagenRecetaSafe(receta: any): string | null {
    const url = receta?.imagen_url || receta?.imagen || null;
    return (typeof url === 'string' && url.trim().length > 0) ? url : null;
  }

  onEliminarDelHistorial(itemHistorial: any, event: MouseEvent) {
    event.stopPropagation();

    if (!this.authService.isLoggedIn()) {
      this.errorMessage = 'Debes iniciar sesión para gestionar tu historial';
      return;
    }

    const historyId: string =
      itemHistorial.id_historial ??
      itemHistorial.id ??
      itemHistorial.historial_id;

    if (!historyId) {
      this.errorMessage = 'No se pudo identificar el elemento del historial a eliminar';
      return;
    }

    if (!confirm('¿Eliminar esta receta del historial?')) {
      return;
    }

    this.historyService.deleteHistoryEntry(historyId).subscribe({
      next: () => {
        this.historialRecetas = this.historialRecetas.filter((h: any) => {
          const hId = h.id_historial ?? h.id ?? h.historial_id;
          return hId !== historyId;
        });

        if (this.recetaSeleccionada && this.recetaSeleccionada.id_receta === itemHistorial.id_receta) {
          this.recetaSeleccionada = null;
        }

        this.errorMessage = '';
      },
      error: (err: any) => {
        console.error('❌ Error eliminando historial:', err);
        this.errorMessage = 'Error al eliminar la receta del historial';
      },
    });
  }

  verListaIngredientesSeleccionada() {
    if (!this.recetaSeleccionada || !this.recetaSeleccionada.id_receta) {
      this.errorMessage = 'Primero selecciona una receta del top o desde tu historial';
      return;
    }

    const id = this.recetaSeleccionada.id_receta;
    console.log('🛒 Pidiendo lista de ingredientes para receta', id);

    this.cargando = true;
    this.errorMessage = '';
    this.shoppingList = [];

    this.recipeService.getShoppingListForRecipe(id).subscribe({
      next: (lista) => {
        this.cargando = false;
        this.shoppingList = lista || [];
        console.log('🛒 Lista de ingredientes recibida:', this.shoppingList);
      },
      error: (err) => {
        this.cargando = false;
        console.error('❌ Error al obtener lista de ingredientes:', err);
        this.errorMessage = 'Error al obtener la lista de ingredientes para esta receta';
      },
    });
  }

  async descargarListaComprasPDF() {
    if (!this.recetaSeleccionada) {
      console.error('No hay receta seleccionada para descargar');
      return;
    }

    if (this.shoppingList.length === 0) {
      alert('Primero debes cargar la lista de compras haciendo clic en "Ver lista detallada"');
      return;
    }

    console.log('📄 Generando PDF de lista de compras para:', this.recetaSeleccionada.titulo);
    
    try {
      this.cargando = true;

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      
      let yPosition = 40;

      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text(this.recetaSeleccionada.titulo, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Lista de Compras', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 25;

      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 20;

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');

      const todosLosDetalles: string[] = [];
      
      this.shoppingList.forEach((item) => {
        if (item.detalles && item.detalles.length > 0) {
          todosLosDetalles.push(...item.detalles);
        }
      });

      todosLosDetalles.forEach((detalle: string, index: number) => {
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 40;
          pdf.setFontSize(18);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Lista de Compras (continuación)', pageWidth / 2, yPosition, { align: 'center' });
          yPosition += 25;
          pdf.setDrawColor(200, 200, 200);
          pdf.line(margin, yPosition, pageWidth - margin, yPosition);
          yPosition += 20;
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'normal');
        }

        const detalleConVineta = `• ${detalle}`;
        const detalleLines = pdf.splitTextToSize(detalleConVineta, contentWidth);
        
        detalleLines.forEach((line: string) => {
          pdf.text(line, margin, yPosition);
          yPosition += 5;
        });
        
        yPosition += 3;
      });

      const currentDate = new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generado por Nutrichef IA - ${currentDate}`, pageWidth / 2, 280, { align: 'center' });

      pdf.save(`Lista de Compras - ${this.recetaSeleccionada.titulo}.pdf`);
      
      console.log('✅ PDF de lista de compras generado exitosamente');
      
    } catch (error) {
      console.error('❌ Error al generar PDF de lista de compras:', error);
      alert('Error al generar el PDF. Por favor, intenta nuevamente.');
    } finally {
      this.cargando = false;
    }
  }
}