// src/app/pages/recetas/recetas.ts (Frontend Angular - Standalone)
import { Component, OnInit } from '@angular/core'; // ✅ Importar OnInit
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; // ✅ Importar RouterModule si tienes routerLink en tu HTML


import { RecipeService, Receta } from '../../services/recipe';

@Component({
  selector: 'app-recetas',
  standalone: true,
  imports: [CommonModule, RouterModule], // ✅ Añadir RouterModule a imports
  templateUrl: './recetas.html',
  styleUrls: ['./recetas.scss'] // O styleUrl
})
export class Recetas implements OnInit { // ✅ Implementar OnInit
  // ✅ Ahora solo guardamos UNA receta, no un array de recetas simuladas
  currentRecipe: Receta | null = null;
  isLoading: boolean = false;
  error: string | null = null;

  constructor(private recipeService: RecipeService) { } // ✅ Inyectar RecipeService

  ngOnInit(): void { // ✅ Implementar ngOnInit
    this.loadRecipe(1); // ✅ Cargar específicamente la receta con ID 1 al iniciar
  }

  loadRecipe(id: number): void {
    this.isLoading = true;
    this.error = null; // Limpiar errores previos
    this.currentRecipe = null; // Limpiar receta previa

    this.recipeService.getRecipeById(id).subscribe({
      next: (data) => {
        this.currentRecipe = data; // ✅ Asignar directamente al objeto currentRecipe
        this.isLoading = false;
      },
      error: (err) => {
        this.error = err.message || `No se pudo cargar la receta con ID ${id}.`;
        this.isLoading = false;
      }
    });
  }
}