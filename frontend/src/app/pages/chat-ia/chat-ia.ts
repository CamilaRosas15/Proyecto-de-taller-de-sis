import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RecipeService, RecommendRequest, RecommendResponse } from '../../services/recipe';
import { RouterLink} from '@angular/router'; 

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

  preferencias = {
    alergias: [] as string[],
    noMeGusta: [] as string[],
    gustos: [] as string[],
    kcalDiarias: 2000,
    tiempoMax: 30
  };

  ultimoPayload: any = null;

  constructor(private recipeService: RecipeService) {}

  sendMessage() {
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

    if (this.preferencias.alergias.length)   params.alergias     = this.preferencias.alergias;
    if (this.preferencias.noMeGusta.length)  params.no_me_gusta  = this.preferencias.noMeGusta;
    if (this.preferencias.gustos.length)     params.gustos       = this.preferencias.gustos;
    if (this.preferencias.kcalDiarias !== 2000) params.kcal_diarias = this.preferencias.kcalDiarias;
    if (this.preferencias.tiempoMax !== 30)     params.tiempo_max   = this.preferencias.tiempoMax;

    this.ultimoPayload = params; 

    this.recipeService.recomendarRecetas(params).subscribe({
      next: (response: RecommendResponse) => {
        this.cargando = false;
        this.opcionesRecetas = response.opciones || [];
        console.log('Recomendaciones:', this.opcionesRecetas);
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
    this.preferencias = {
      alergias: [],
      noMeGusta: [],
      gustos: [],
      kcalDiarias: 2000,
      tiempoMax: 30
    };
  }
}
