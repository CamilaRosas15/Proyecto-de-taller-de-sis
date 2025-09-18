import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

// Interfaz para el modelo de receta
export interface Receta {
  id_receta: number;
  nombre: string;
  description: string;
  categoria: string;
  tempo_preparacion: number;
  calorias_totales: number;
  instrucciones: string;
  imagen_url: string;
}

@Component({
  selector: 'app-recetas',
  standalone: true, // Esta línea es importante
  imports: [CommonModule], // Necesario para *ngFor
  templateUrl: './recetas.html',
  styleUrls: ['./recetas.scss']
})
export class Recetas {
  // Datos simulados de recetas
  recetas: Receta[] = [
    {
      id_receta: 1,
      nombre: "Tarta de Chocolate",
      description: "Deliciosa tarta de chocolate con base de galleta y crema batida. Perfecta para ocasiones especiales.",
      categoria: "Postres",
      tempo_preparacion: 45,
      calorias_totales: 420,
      instrucciones: "Derretir el chocolate, mezclar con la base de galleta, hornear a 180°C por 25 minutos y decorar con crema batida.",
      imagen_url: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1089&q=80"
    },
    {
      id_receta: 2,
      nombre: "Pasta Alfredo",
      description: "Pasta cremosa con salsa alfredo casera y pollo a la parrilla. Un clásico italiano reconfortante.",
      categoria: "Platos Principales",
      tempo_preparacion: 30,
      calorias_totales: 650,
      instrucciones: "Cocinar la pasta, preparar la salsa alfredo con crema y parmesano, saltear el pollo y mezclar todo.",
      imagen_url: "https://images.unsplash.com/photo-1598866594230-a7c12756260f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80"
    },
    {
      id_receta: 3,
      nombre: "Ensalada César",
      description: "Ensalada fresca con lechuga romana, crutones, queso parmesano y aderezo césar casero.",
      categoria: "Ensaladas",
      tempo_preparacion: 15,
      calorias_totales: 320,
      instrucciones: "Lavar y cortar la lechuga, preparar el aderezo, mezclar todos los ingredientes y añadir crutones.",
      imagen_url: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80"
    },
    {
      id_receta: 4,
      nombre: "Smoothie Bowl",
      description: "Bowl de desayuno nutritivo con base de smoothie de frutas y toppings variados.",
      categoria: "Postres",
      tempo_preparacion: 10,
      calorias_totales: 280,
      instrucciones: "Mezclar las frutas con yogurt, verter en un bowl y decorar con toppings como granola y frutos rojos.",
      imagen_url: "https://images.unsplash.com/photo-1497534446932-c925b458314e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1172&q=80"
    },
    {
      id_receta: 5,
      nombre: "Tacos Mexicanos",
      description: "Tacos auténticos mexicanos con carne marinada, cebolla, cilantro y salsa picante.",
      categoria: "Platos Principales",
      tempo_preparacion: 40,
      calorias_totales: 480,
      instrucciones: "Cocinar la carne con especias, calentar las tortillas, preparar los toppings y servir.",
      imagen_url: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1080&q=80"
    }
  ];
}