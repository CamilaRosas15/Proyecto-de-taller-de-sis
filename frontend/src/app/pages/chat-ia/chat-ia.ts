import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RecipeService, RecommendRequest, RecommendResponse, OpcionOut,ShoppingListItem } from '../../services/recipe';
import { RouterLink} from '@angular/router'; 
import { HistoryService } from '../../services/history.service'; // AÑADIR
import { AuthService } from '../../services/auth'; // AÑADIR

@Component({
  selector: 'app-chat-ia',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule,RouterLink],
  templateUrl: './chat-ia.html',
  styleUrls: ['./chat-ia.scss']
})
export class ChatIAComponent {
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
    public authService: AuthService 
  ) {
    this.cargarHistorial(); 
    this.userName = this.authService.currentUserName;
    this.userEmail = this.authService.currentUserEmail;
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    
    // Prevenir scroll del body cuando el menú está abierto
    if (this.isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  closeMobileMenu() {
    this.isMobileMenuOpen = false;
    document.body.style.overflow = ''; // Restaurar scroll
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
        
        // Debug MEJORADO
        this.historialRecetas.forEach((item: any, index: number) => {
          console.log(`--- Item ${index} del historial ---`);
          console.log('ID Receta:', item.id_receta);
          console.log('Fecha:', item.fecha);
          
          if (item.receta) {
            console.log('📖 Receta completa:', item.receta);
            console.log('🥬 Ingredientes:', item.receta.ingredientes);
            console.log('📝 Instrucciones:', item.receta.instrucciones);
            console.log('🔍 Tiene ingredientes array?', Array.isArray(item.receta.ingredientes));
            console.log('🔍 Tiene instrucciones?', !!item.receta.instrucciones);
          } else {
            console.log('❌ NO HAY RECETA en este item');
          }
        });
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

    console.log('💾 Guardando receta en historial con contexto...');
    console.log('id_receta:', receta.id_receta);
    console.log('contexto_ia:', contexto);
    console.log('titulo_conversacion:', titulo);

    this.recipeService
      .saveToHistory(userId, receta.id_receta, contexto, titulo)
      .subscribe({
        next: () => {
          this.errorMessage = '';
          this.recetaSeleccionada = receta;
          this.opcionesRecetas = [];
          this.shoppingList = [];
          this.cargarHistorial(); // recarga panel izquierdo
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
      console.log('📋 Receta cargada del historial:', recetaMapeada);
    } else {
      this.errorMessage = 'No se pudo cargar la receta del historial';
    }
  }
  
  private mapearRecetaAOpcionOut(receta: any): any {
    console.log('🔄 ===== INICIANDO MAPEO =====');
    console.log('📥 Receta recibida:', receta);
    console.log('🥬 Ingredientes originales:', receta.ingredientes);
    console.log('🔍 Tipo de ingredientes:', typeof receta.ingredientes);
    console.log('📋 ¿Es array?', Array.isArray(receta.ingredientes));
    
    let ingredientes: any[] = [];
    if (receta.ingredientes && Array.isArray(receta.ingredientes)) {
      console.log('✅ Ingredientes ES array, mapeando...');
      
      ingredientes = receta.ingredientes.map((item: any, index: number) => {
        let nombre = '';
        if (typeof item === 'string') {
          nombre = item;
        } else if (typeof item === 'object' && item !== null) {
          nombre = item.nombre || item.name || 'Sin nombre';
        } else {
          nombre = String(item);
        }
        
        const ingredienteMapeado = {
          id_ingrediente: index + 1,
          nombre: nombre,
          unidad: null,
          cantidad: null,
          calorias: null,
          proteinas: null,
          carbohidratos: null,
          grasas: null
        };
        
        console.log(`🥬 Ingrediente ${index}:`, ingredienteMapeado);
        return ingredienteMapeado;
      });
    } else {
      console.log('❌ Ingredientes NO es array o no existe');
    }

    console.log('📤 Ingredientes mapeados finales:', ingredientes);
    console.log('======= FIN MAPEO =======');

    // Convertir instrucciones string a array de pasos
    let pasos: string[] = [];
    if (receta.instrucciones) {
      pasos = receta.instrucciones
        .split('\n')
        .map((paso: string) => paso.trim())
        .filter((paso: string) => paso.length > 0);
    }

    // Estructura que espera el frontend (OpcionOut)
    return {
      id_receta: receta.id_receta,
      titulo: receta.nombre || 'Sin título',
      descripcion: receta.descripcion || null,
      categoria: receta.categoria || null,
      tiempo_preparacion: receta.tiempo_preparacion || null,
      kcal_totales: receta.calorias_totales || null,
      pasos: pasos,
      //imagen_url: receta.imagen_url || null,
      imagen_url: receta.imagen_url || receta.imagen || null,
      ingredientes: ingredientes,
      motivos: [], // No hay motivos en el historial
      ia_explicacion: null // No hay explicación IA en el historial
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
  // NUEVO: Método para validar antes de enviar (para el botón "Enviar")
  sendMessageWithValidation() {
    if (!this.userMessage.trim()) {
      this.errorMessage = 'Por favor, escribe tu mensaje para comenzar la conversación';
      return; // Detener si está vacío
    }
    
    this.sendMessage();
  }

  // NUEVO: Iniciar edición inline
  startEditMessage(messageIndex: number) {
    console.log('✏ Iniciando edición del mensaje:', messageIndex);
    
    const messageToEdit = this.conversationHistory[messageIndex];
    this.editingMessageIndex = messageIndex;
    this.editingMessageText = messageToEdit.content;
    
    // Forzar la detección de cambios
    setTimeout(() => {
      const inputElement = document.querySelector('.edit-message-input') as HTMLInputElement;
      if (inputElement) {
        inputElement.focus();
        inputElement.select();
        console.log('✅ Input de edición enfocado');
      } else {
        console.log('❌ No se encontró el input de edición');
      }
    }, 100);
  }

  // NUEVO: Guardar mensaje editado
  saveEditedMessage() {
    console.log('💾 Intentando guardar mensaje editado...');
    
    if (!this.editingMessageText.trim()) {
      console.log('❌ Mensaje vacío, cancelando');
      this.cancelEdit();
      return;
    }

    if (this.editingMessageIndex !== -1) {
      console.log('✅ Guardando mensaje en índice:', this.editingMessageIndex);
      
      // Actualizar el mensaje en el historial
      this.conversationHistory[this.editingMessageIndex].content = this.editingMessageText.trim();
      this.conversationHistory[this.editingMessageIndex].timestamp = new Date();
      
      const userMessageIndex = this.editingMessageIndex;
      
      console.log('📝 Mensaje actualizado:', this.editingMessageText);
      
      // Eliminar mensajes de IA posteriores al mensaje editado
      this.conversationHistory = this.conversationHistory.slice(0, userMessageIndex + 1);
      console.log('🗑 Mensajes posteriores eliminados');
      
      // Limpiar estado de edición
      this.cancelEdit();
      
      // Generar nueva respuesta basada en el mensaje editado
      this.regenerateResponse(userMessageIndex);
    } else {
      console.log('❌ Índice de edición inválido');
    }
  }

  // NUEVO: Cancelar edición
  cancelEdit() {
    console.log('❌ Cancelando edición');
    this.editingMessageIndex = -1;
    this.editingMessageText = '';
  }

  // NUEVO: Regenerar respuesta después de editar
  regenerateResponse(messageIndex: number) {
    console.log('🔄 Regenerando respuesta para mensaje:', messageIndex);
    
    const editedMessage = this.conversationHistory[messageIndex].content;
    
    this.cargando = true;
    this.errorMessage = '';
    this.recetaSeleccionada = null;

    // Procesar el mensaje editado
    this.procesarMensaje(editedMessage);

    // Generar nuevas recomendaciones basadas en el mensaje editado
    this.generarRecomendaciones(editedMessage);
  }

  sendMessage() {
    // AÑADIR estas 2 líneas:
    // Limpiar estado de edición si existe
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

    // 1. AGREGAR MENSAJE DEL USUARIO AL HISTORIAL
    this.conversationHistory.push({
      type: 'user',
      content: this.userMessage,
      timestamp: new Date()
    });

    // 2. Limpiar y preparar para nueva generación
    const currentMessage = this.userMessage;
    this.userMessage = ''; // Limpiar input para próximo mensaje
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
      userId,           // deja que el back fusione con lo guardado en perfil
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

        // 3. AGREGAR RESPUESTA DE LA IA AL HISTORIAL
        this.conversationHistory.push({
          type: 'assistant',
          content: `Te recomiendo ${this.opcionesRecetas.length} recetas:`,
          recipes: [...this.opcionesRecetas], // Copia de las recetas actuales
          timestamp: new Date()
        });

        // Limpiar opcionesRecetas para la próxima generación
        this.opcionesRecetas = [];
        
        console.log('Historial de conversación:', this.conversationHistory);
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

    console.log('🧾 Item historial recibido para borrar:', itemHistorial);

    // 👇 Usamos el id_historial que viene de la tabla
    const historyId: string =
      itemHistorial.id_historial ??
      itemHistorial.id ??
      itemHistorial.historial_id;

    console.log('➡️ ID usado para borrar historial:', historyId);

    if (!historyId) {
      console.error('❌ No se encontró un ID de historial en el item:', itemHistorial);
      this.errorMessage =
        'No se pudo identificar el elemento del historial a eliminar';
      return;
    }

    if (!confirm('¿Eliminar esta receta del historial?')) {
      return;
    }

    console.log('🗑 Eliminando historial con id:', historyId);

    this.historyService.deleteHistoryEntry(historyId).subscribe({
      next: () => {
        console.log('✅ Historial eliminado en backend');

        // Quitar del array local
        this.historialRecetas = this.historialRecetas.filter((h: any) => {
          const hId =
            h.id_historial ??
            h.id ??
            h.historial_id;
          return hId !== historyId;
        });

        if (
          this.recetaSeleccionada &&
          this.recetaSeleccionada.id_receta === itemHistorial.id_receta
        ) {
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

}
