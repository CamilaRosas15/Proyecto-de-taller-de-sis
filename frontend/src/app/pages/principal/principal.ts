import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/auth';
import { filter } from 'rxjs/operators';

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
    // Inicializar componente
    this.initializeComponent();

    // Escuchar cambios de navegación para reinicializar si es necesario
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      if (this.router.url === '/principal') {
        this.initializeComponent();
      }
    });

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

  /** Inicializa o reinicializa el componente */
  private initializeComponent(): void {
    // Mostrar mensaje de bienvenida inmediato si hay información en caché
    this.setInitialWelcomeMessage();
    
    // Cargar información del usuario si está autenticado
    this.loadCurrentUser();
  }

  /** Muestra mensaje inicial según la información disponible */
  private setInitialWelcomeMessage(): void {
    // Primero verificar si el usuario está autenticado
    if (this.authService.isAuthenticated()) {
      const savedUserName = localStorage.getItem('user_name');
      
      if (savedUserName) {
        this.welcomeMessage = `¡Bienvenido, ${savedUserName}!`;
      } else {
        const userName = this.authService.currentUserName;
        if (userName) {
          this.welcomeMessage = `¡Bienvenido, ${userName}!`;
        } else {
          this.welcomeMessage = '¡Bienvenido a NutriChef IA!';
        }
      }
    } else {
      // Si no está autenticado, mensaje genérico
      this.welcomeMessage = '¡Bienvenido a NutriChef IA!';
    }
  }

  /** Carga los datos del usuario actual si está autenticado */
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
          this.isLoadingUser = false;
          // Si hay error al cargar usuario, limpiar datos
          this.currentUser = null;
          this.welcomeMessage = '¡Bienvenido a NutriChef IA!';
        }
      });
    } else {
      // Si no está autenticado, asegurar que los datos estén limpios
      this.currentUser = null;
      this.isLoadingUser = false;
    }
  }

  /** Establece mensaje personalizado según los datos del perfil */
  private setWelcomeMessage(): void {
    if (this.currentUser?.profile?.nombre) {
      this.welcomeMessage = `¡Bienvenido, ${this.currentUser.profile.nombre}!`;
      localStorage.setItem('user_name', this.currentUser.profile.nombre);
    } else if (this.currentUser?.profile?.nombre_completo) {
      this.welcomeMessage = `¡Bienvenido, ${this.currentUser.profile.nombre_completo}!`;
      localStorage.setItem('user_name', this.currentUser.profile.nombre_completo);
    } else {
      this.welcomeMessage = '¡Bienvenido a NutriChef IA!';
    }
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

  /** Verifica si el usuario está logueado */
  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  /** Cierra la sesión del usuario */
  onLogout(): void {
    // Limpiar datos locales antes del logout
    this.currentUser = null;
    this.welcomeMessage = '¡Bienvenido a NutriChef IA!';
    
    this.authService.logout();
    // El servicio ya redirige a /login, pero podemos mostrar un mensaje
    this.successMessage = 'Sesión cerrada exitosamente.';
    setTimeout(() => {
      this.successMessage = '';
    }, 3000);
  }
}
