// src/app/pages/login/login.ts (Frontend Angular - ¡Alineado a tu estructura!)
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms'; // Necesario para ngModel
import { CommonModule } from '@angular/common'; // Necesario para *ngIf
import { Router, RouterModule } from '@angular/router'; // Importar Router y RouterModule

import { AuthService } from '../../services/auth'; // ✅ Ruta del servicio (auth.ts)

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './login.html', // ✅ ¡CORREGIDO para tu nombre de archivo!
  styleUrls: ['./login.scss']  // ✅ ¡CORREGIDO para tu nombre de archivo!
})
export class Login { // ✅ ¡Nombre de CLASE ALINEADO a tu estructura!
  email = '';
  password = '';
  errorMessage: string | null = null;
  isLoading = false;

  constructor(private authService: AuthService, private router: Router) {}

  async onLogin(): Promise<void> {
    this.errorMessage = null;
    this.isLoading = true;

    this.authService.login(this.email, this.password).subscribe({
      next: (response) => {
        this.isLoading = false;
        
        // ✅ REDIRECCIÓN CON MENSAJE
        this.router.navigate(['/principal'], { 
          queryParams: { message: 'login_success' } 
        });
        console.log('Login exitoso:', response.user);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.message || 'Error al iniciar sesión. Verifica tus credenciales.';
        console.error('Error de login:', err);
      }
    });
  }
}