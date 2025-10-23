import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RecipeService, Receta } from '../../services/recipe';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-recetas',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './recetas.html',
  styleUrls: ['./recetas.scss']
})
export class Recetas implements OnInit {
  recipes: Receta[] = [];
  selectedRecipe: Receta | null = null;
  closing = false;
  
  // 🔥 NUEVA VARIABLE PARA CONTROLAR EL MENÚ MÓVIL
  isMobileMenuOpen = false;

  constructor(
    private recipeService: RecipeService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadRecipes();
  }

  loadRecipes(): void {
    this.recipeService.getAllRecipes().subscribe({
      next: (data) => (this.recipes = data),
      error: (err) => console.error('Error cargando recetas', err)
    });
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  onLogout(): void {
    this.authService.logout();
  }

  // 🔥 NUEVOS MÉTODOS PARA EL MENÚ MÓVIL
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

  openModal(recipe: Receta): void {
    this.selectedRecipe = recipe;
    document.body.style.overflow = 'hidden'; // Bloquea scroll del fondo
  }

  closeModal(): void {
    this.closing = true;
    setTimeout(() => {
      this.selectedRecipe = null;
      this.closing = false;
      document.body.style.overflow = ''; // Restaura scroll del fondo
    }, 300); // Duración de la animación
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    const modalContent = document.querySelector('.modal-content');
    if (this.selectedRecipe && modalContent && !modalContent.contains(event.target as Node)) {
      this.closeModal();
    }
  }
}