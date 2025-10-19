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
  // Variables públicas para el template
  public successMessage: string = '';
  public welcomeMessage: string = '';
  public currentUser: any = null;
  public isLoadingUser: boolean = false;
  public isUserLoggedIn: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Verificar estado de autenticación
    this.checkAuthenticationStatus();
    
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
        // Si viene de login exitoso, actualizar estado y recargar usuario
        this.isUserLoggedIn = true;
        this.loadCurrentUser();
        this.successMessage = '¡Inicio de sesión exitoso! Bienvenido de nuevo.';
        this.clearQueryParams();
        setTimeout(() => {
          this.successMessage = '';
        }, 5000);
      }
    });

    // Detectar cambios en el localStorage (cuando el usuario hace login/logout en otra pestaña)
    window.addEventListener('storage', (e) => {
      if (e.key === 'accessToken' || e.key === 'userId') {
        this.checkAuthenticationStatus();
        this.setInitialWelcomeMessage();
        this.loadCurrentUser();
      }
    });
  }

  /** Muestra mensaje inicial según la información disponible */
  private setInitialWelcomeMessage(): void {
    try {
      // Si el usuario está autenticado, personalizar mensaje
      if (this.isUserLoggedIn) {
        // Intentar obtener nombre guardado en localStorage
        // Compatibilidad: leer tanto 'userName' (nuevo) como 'user_name' (legacy)
        const savedUserName = localStorage.getItem('userName') || localStorage.getItem('user_name');
        const savedUserEmail = localStorage.getItem('userEmail');
        
        if (savedUserName && savedUserName.trim() !== '') {
          this.welcomeMessage = `¡Bienvenido, ${savedUserName}!`;
        } else if (savedUserEmail) {
          // Si no hay nombre, usar la parte del email antes del @
          const emailName = savedUserEmail.split('@')[0];
          this.welcomeMessage = `¡Bienvenido, ${emailName}!`;
        } else {
          // Intentar obtener nombre del servicio de auth
          const userName = this.authService.currentUserName;
          if (userName && userName.trim() !== '') {
            this.welcomeMessage = `¡Bienvenido, ${userName}!`;
          } else {
            this.welcomeMessage = '¡Bienvenido de nuevo!';
          }
        }
      } else {
        // Usuario no autenticado - mensaje genérico
        this.welcomeMessage = '¡Bienvenido a NutriChef IA!';
      }
    } catch (error) {
      console.warn('Error setting initial welcome message:', error);
      this.welcomeMessage = '¡Bienvenido a NutriChef IA!';
    }
  }

  /** Carga los datos del usuario actual si está autenticado */
  private loadCurrentUser(): void {
    if (this.authService.isAuthenticated()) {
      this.isLoadingUser = true;
      
      this.authService.getCurrentUser().subscribe({
        next: (user) => {
          console.log('🔍 Usuario cargado exitosamente:', user);
          console.log('🔍 Perfil del usuario:', user?.profile);
          console.log('🔍 Nombre en perfil:', user?.profile?.nombre);
          console.log('🔍 Nombre completo en perfil:', user?.profile?.nombre_completo);
          console.log('🔍 Email del usuario:', user?.email);
          
          this.currentUser = user;
          this.setWelcomeMessage();
          this.isLoadingUser = false;
        },
        error: (error) => {
          console.error('❌ Error loading user:', error);
          // Fallback: intentar obtener el perfil directamente por userId si está disponible
          const savedUserId = localStorage.getItem('userId');
          const savedEmail = localStorage.getItem('userEmail') || undefined;

          if (savedUserId) {
            this.authService.getUserProfile(savedUserId).subscribe({
              next: (profile) => {
                console.log('🔁 Fallback perfil por userId cargado:', profile);
                this.currentUser = {
                  id: savedUserId,
                  email: savedEmail,
                  profile
                };
                this.setWelcomeMessage();
                this.isLoadingUser = false;
              },
              error: (fallbackErr) => {
                console.error('❌ Fallback getUserProfile también falló:', fallbackErr);
                // Si hay error obteniendo el usuario, usar información básica disponible
                this.handleUserLoadError();
                this.isLoadingUser = false;
              }
            });
          } else {
            // Si no hay userId, usar información básica disponible
            this.handleUserLoadError();
            this.isLoadingUser = false;
          }
        }
      });
    } else {
      console.log('🔍 Usuario no está autenticado');
    }
  }

  /** Maneja errores al cargar usuario y aplica fallbacks */
  private handleUserLoadError(): void {
    try {
      // Intentar usar información básica del localStorage
      const savedEmail = localStorage.getItem('userEmail');
      const savedUserId = localStorage.getItem('userId');
      
      if (savedEmail && savedUserId) {
        // Crear un objeto usuario básico con la información disponible
        this.currentUser = {
          id: savedUserId,
          email: savedEmail,
          profile: null // Sin perfil completo
        };
        
        // Actualizar mensaje de bienvenida con información básica
        const emailName = savedEmail.split('@')[0];
        this.welcomeMessage = `¡Bienvenido, ${emailName}!`;
        
        console.log('Usuario básico creado desde localStorage:', this.currentUser);
      } else {
        console.warn('No se pudo cargar información del usuario');
        // Mantener mensaje genérico si está autenticado pero sin datos
        this.welcomeMessage = '¡Bienvenido de nuevo!';
      }
    } catch (error) {
      console.error('Error in handleUserLoadError:', error);
      this.welcomeMessage = '¡Bienvenido a NutriChef IA!';
    }
  }

  /** Establece mensaje personalizado según los datos del perfil */
  private setWelcomeMessage(): void {
    try {
      let userName = null;

      // PRIORIDAD 1: Nombre del perfil (campo 'nombre')
      if (this.currentUser?.profile?.nombre && this.currentUser.profile.nombre.trim() !== '') {
        userName = this.currentUser.profile.nombre;
      }
      // PRIORIDAD 2: Nombre completo del perfil
      else if (this.currentUser?.profile?.nombre_completo && this.currentUser.profile.nombre_completo.trim() !== '') {
        userName = this.currentUser.profile.nombre_completo;
      }
      // PRIORIDAD 3: Si hay usuario pero sin perfil, usar email
      else if (this.currentUser?.email) {
        userName = this.currentUser.email.split('@')[0];
        console.log('Usuario sin perfil completo, usando nombre del email:', userName);
      }

      // Aplicar el nombre encontrado
      if (userName) {
        this.welcomeMessage = `¡Bienvenido, ${userName}!`;
        // Normalizar clave de almacenamiento
        localStorage.setItem('userName', userName);
        // Limpieza de clave legacy para evitar inconsistencias
        localStorage.removeItem('user_name');
        console.log('Mensaje de bienvenida actualizado con:', userName);
        return;
      }
      
      // FALLBACK: Mensaje personalizado para usuarios autenticados
      if (this.isUserLoggedIn) {
        this.welcomeMessage = '¡Bienvenido de nuevo!';
      } else {
        this.welcomeMessage = '¡Bienvenido a NutriChef IA!';
      }
    } catch (error) {
      console.error('Error setting welcome message:', error);
      this.welcomeMessage = '¡Bienvenido a NutriChef IA!';
    }
  }

  /** Verifica el estado actual de autenticación */
  private checkAuthenticationStatus(): void {
    this.isUserLoggedIn = this.authService.isAuthenticated();
    console.log('Estado de autenticación:', this.isUserLoggedIn);
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
  public closeMessage(): void {
    this.successMessage = '';
  }

  /** Wrapper usado por el template para verificar login */
  public isLoggedIn(): boolean {
    return this.isUserLoggedIn;
  }

  /** Wrapper usado por el template para cerrar sesión */
  public onLogout(): void {
    this.logout();
  }

  /** Cerrar sesión del usuario */
  public logout(): void {
    try {
      // Limpiar datos locales primero
      this.isUserLoggedIn = false;
      this.currentUser = null;
      this.welcomeMessage = '¡Bienvenido a NutriChef IA!';
      
      // Llamar al logout del servicio (esto limpará localStorage y redirigirá)
      this.authService.logout();
      
      // Mostrar mensaje de confirmación
      this.successMessage = '¡Sesión cerrada exitosamente!';
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);
      
      console.log('Logout completado exitosamente');
    } catch (error) {
      console.error('Error during logout:', error);
      // Aún así mostrar mensaje de confirmación
      this.successMessage = 'Sesión cerrada';
      setTimeout(() => {
        this.successMessage = '';
      }, 2000);
    }
  }

  /** Desplaza suavemente hasta la sección indicada */
  scrollToSection(id: string): void {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
