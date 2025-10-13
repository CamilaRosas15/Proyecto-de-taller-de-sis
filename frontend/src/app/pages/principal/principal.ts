import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-principal',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './principal.html',
  styleUrls: ['./principal.scss']
})
export class Principal implements OnInit {
  successMessage: string = '';
  welcomeMessage: string = '';
  currentUser: any = null;
  isLoadingUser: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Mostrar mensaje de bienvenida inmediato si hay información en caché
    this.setInitialWelcomeMessage();
    
    // Cargar información del usuario si está autenticado
    this.loadCurrentUser();

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

  private setInitialWelcomeMessage(): void {
    // Intentar obtener nombre guardado en localStorage
    const savedUserName = localStorage.getItem('user_name');
    
    if (savedUserName) {
      this.welcomeMessage = `¡Bienvenido, ${savedUserName}!`;
    } else {
      // Intentar obtener nombre del servicio de auth
      const userName = this.authService.currentUserName;
      if (userName) {
        this.welcomeMessage = `¡Bienvenido, ${userName}!`;
      } else {
        this.welcomeMessage = '¡Bienvenido a NutriChef IA!';
      }
    }
  }

  private loadCurrentUser(): void {
    if (this.authService.isAuthenticated()) {
      this.isLoadingUser = true;
      
      this.authService.getCurrentUser().subscribe({
        next: (user) => {
          this.currentUser = user;
          this.setWelcomeMessage();
          this.isLoadingUser = false;
        },
        error: (error) => {
          console.error('Error loading user:', error);
          // Si hay error obteniendo el usuario, mantener mensaje inicial
          this.isLoadingUser = false;
        }
      });
    }
  }

  private setWelcomeMessage(): void {
    if (this.currentUser?.profile?.nombre) {
      // PRIORIDAD 1: Si tiene nombre en el perfil de la base de datos, usarlo
      this.welcomeMessage = `¡Bienvenido, ${this.currentUser.profile.nombre}!`;
      
      // Guardar en localStorage para próximas visitas
      localStorage.setItem('user_name', this.currentUser.profile.nombre);
      
    } else if (this.currentUser?.profile?.nombre_completo) {
      // PRIORIDAD 2: Si tiene nombre_completo en el perfil, usarlo  
      this.welcomeMessage = `¡Bienvenido, ${this.currentUser.profile.nombre_completo}!`;
      
      // Guardar en localStorage para próximas visitas
      localStorage.setItem('user_name', this.currentUser.profile.nombre_completo);
      
    } else {
      // PRIORIDAD 3: Mensaje genérico si no hay nombre
      this.welcomeMessage = '¡Bienvenido a NutriChef IA!';
    }
  }

  private clearQueryParams(): void {
    this.router.navigate([], {  
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true 
    });
  }

  // Método para cerrar el mensaje manualmente
  closeMessage(): void {
    this.successMessage = '';
  }
}