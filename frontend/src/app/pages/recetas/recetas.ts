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
  recipes: Receta[] = []; // Cambiar a array de recetas
  isLoading = false;
  error: string | null = null;

  constructor(
    private recipeService: RecipeService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadAllRecipes(); // Cargar todas las recetas
  }

  loadAllRecipes(): void {
    this.isLoading = true;
    this.error = null;
    this.recipes = [];

    this.recipeService.getAllRecipes().subscribe({
      next: (data) => {
        this.recipes = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = err.message || 'No se pudieron cargar las recetas desde Supabase.';
        this.isLoading = false;
      }
    });
  }
}