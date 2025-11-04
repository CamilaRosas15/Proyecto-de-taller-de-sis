import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RecipeService, RecommendRequest, RecommendResponse, OpcionOut } from '../../services/recipe';
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
      this.recetaSeleccionada = recetaMapeada;
      this.opcionesRecetas = [];
      this.userMessage = '';
      this.errorMessage = '';
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
      imagen_url: receta.imagen_url || null,
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
  }

  sendMessage() {
    // AÑADIR estas 2 líneas:
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

    this.cargando = true;
    this.errorMessage = '';

    this.procesarMensaje(this.userMessage);

    this.generarRecomendaciones();
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

  generarRecomendaciones() {
    const userId = localStorage.getItem('userId') || undefined;

    const params: RecommendRequest = {
      userId,           // deja que el back fusione con lo guardado en perfil
      top_n: 2,
      use_llm: true
    };
    
    if (this.userMessage && this.userMessage.trim()) {
    (params as any).user_msg = this.userMessage.trim(); // <--- AÑADIR
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
          return receta;
        });
        
        console.log('Recomendaciones procesadas:', this.opcionesRecetas);
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
    this.recetaSeleccionada = null; // AÑADIR esta línea
    this.preferencias = {
      alergias: [],
      noMeGusta: [],
      gustos: [],
      kcalDiarias: 2000,
      tiempoMax: 30
    };
  }

}
