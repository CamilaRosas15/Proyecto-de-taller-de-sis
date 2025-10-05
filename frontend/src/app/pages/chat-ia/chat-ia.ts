import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RecipeService, RecommendRequest, RecommendResponse } from '../../services/recipe';

@Component({
  selector: 'app-chat-ia',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './chat-ia.html',
  styleUrls: ['./chat-ia.scss']
})
export class ChatIAComponent {
  userMessage: string = '';
  opcionesRecetas: any[] = [];
  cargando: boolean = false;
  errorMessage: string = '';

  // Preferencias por defecto
  preferencias = {
    alergias: [] as string[],
    noMeGusta: [] as string[],
    gustos: [] as string[],
    kcalDiarias: 2000,
    tiempoMax: 30
  };

  constructor(private recipeService: RecipeService) {}

  // Enviar mensaje
  sendMessage() {
    if (!this.userMessage.trim()) {
      // Si no hay mensaje, usar parámetros por defecto
      this.userMessage = "Recomiéndame recetas";
    }

    this.cargando = true;
    this.errorMessage = '';

    // Procesar el mensaje para extraer preferencias
    this.procesarMensaje(this.userMessage);
    
    // Generar recomendaciones
    this.generarRecomendaciones();
  }

  // Procesar el mensaje del usuario para extraer preferencias
  procesarMensaje(mensaje: string) {
    const mensajeLower = mensaje.toLowerCase();

    // Detectar gustos
    if (mensajeLower.includes('pollo') || mensajeLower.includes('pasta') || mensajeLower.includes('ensalada')) {
      this.preferencias.gustos = this.extraerPalabrasClave(mensajeLower, ['pollo', 'pasta', 'ensalada', 'verduras', 'frutas']);
    }

    // Detectar alergias
    if (mensajeLower.includes('alergia') || mensajeLower.includes('intolerancia')) {
      this.preferencias.alergias = this.extraerPalabrasClave(mensajeLower, ['mariscos', 'nueces', 'lactosa', 'gluten']);
    }

    // Detectar tiempo
    const tiempoMatch = mensajeLower.match(/(\d+)\s*min/);
    if (tiempoMatch) {
      this.preferencias.tiempoMax = parseInt(tiempoMatch[1]);
    }

    // Detectar calorías
    const kcalMatch = mensajeLower.match(/(\d+)\s*kcal/);
    if (kcalMatch) {
      this.preferencias.kcalDiarias = parseInt(kcalMatch[1]);
    }
  }

  extraerPalabrasClave(mensaje: string, palabras: string[]): string[] {
    return palabras.filter(palabra => mensaje.includes(palabra));
  }

  // Generar recomendaciones
  generarRecomendaciones() {
    const params: RecommendRequest = {
      top_n: 3,  // Siempre pedir 3 recetas
      use_llm: true,
      alergias: this.preferencias.alergias,
      no_me_gusta: this.preferencias.noMeGusta,
      gustos: this.preferencias.gustos,
      kcal_diarias: this.preferencias.kcalDiarias,
      tiempo_max: this.preferencias.tiempoMax
    };

    this.recipeService.recomendarRecetas(params).subscribe({
      next: (response: RecommendResponse) => {
        this.cargando = false;
        this.opcionesRecetas = response.opciones;
        console.log('Recomendaciones con IA:', this.opcionesRecetas);
      },
      error: (error: Error) => {
        this.cargando = false;
        this.errorMessage = 'Error al generar recomendaciones: ' + error.message;
        console.error('Error:', error);
      }
    });
  }

  // Limpiar chat
  clearChat() {
    this.userMessage = '';
    this.opcionesRecetas = [];
    this.errorMessage = '';
    this.preferencias = {
      alergias: [],
      noMeGusta: [],
      gustos: [],
      kcalDiarias: 2000,
      tiempoMax: 30
    };
  }
}