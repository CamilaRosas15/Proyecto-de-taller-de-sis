import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';

import { RecipeService, Receta } from '../../services/recipe';

@Component({
  selector: 'app-recetas',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './recetas.html',
  styleUrls: ['./recetas.scss']
})
export class Recetas implements OnInit {
  currentRecipe: Receta | null = null;
  isLoading = false;
  error: string | null = null;

  constructor(
    private recipeService: RecipeService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Si NO usas /recetas/:id, descomenta la línea de abajo y borra la suscripción
    // this.loadRecipe(1);

    // Si en algún momento usas /recetas/:id, esto evitará el mismo error:
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');          // string | null
      const id: string | number = idParam ?? 1;  // puede ser string o number
      this.loadRecipe(id);
    });
  }

  // 👇 acepta string | number y normaliza
  loadRecipe(id: string | number): void {
    this.isLoading = true;
    this.error = null;
    this.currentRecipe = null;

    this.recipeService.getRecipeById(id).subscribe({
      next: (data) => {
        this.currentRecipe = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = err.message || `No se pudo cargar la receta con ID ${id}.`;
        this.isLoading = false;
      }
    });
  }
}
