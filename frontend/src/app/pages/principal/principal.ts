import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-principal',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './principal.html',
  styleUrls: ['./principal.scss']
})
export class Principal implements OnInit {
  successMessage: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router  
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['message'] === 'register_success') {
        this.successMessage = '¡Registro exitoso! Bienvenido a NutriChef IA.';
        this.clearQueryParams();
        setTimeout(() => {
          this.successMessage = '';
        }, 5000);
      }
      if (params['message'] === 'login_success') {
        this.successMessage = '¡Inicio de sesión exitoso! Bienvenido de nuevo.';
        this.clearQueryParams();
        setTimeout(() => {
          this.successMessage = '';
        }, 5000);
      }
    });
  }

  /** Limpia los parámetros de la URL después de mostrar el mensaje */
  private clearQueryParams(): void {
    this.router.navigate([], {  
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true 
    });
  }

  /** Cierra manualmente el mensaje */
  closeMessage(): void {
    this.successMessage = '';
  }

  /** Desplaza suavemente hasta la sección indicada */
  scrollToSection(id: string): void {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
