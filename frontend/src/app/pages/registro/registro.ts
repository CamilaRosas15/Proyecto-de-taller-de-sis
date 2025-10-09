// registro.ts - VERSIÓN CORREGIDA CON SEXO Y ESTATURA
import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService, UserProfileData } from '../../services/auth';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './registro.html',
  styleUrls: ['./registro.scss']
})
export class Registro implements OnInit {
  email = '';
  password = '';
  errorMessageAuth: string | null = null;
  isLoadingAuth = false;

  userId: string | null = null;
  userEmail: string | null = null;

  profileData: UserProfileData = {
      nombre_completo: '',
      edad: 0,
      peso: 0,
      sexo: '', 
      altura: 0, 
      objetivo_salud: 'Mantener peso',
      calorias_diarias_objetivo: 2000,
      alergias: [],
      gustos: [],
      no_me_gusta: [],
      email: ''
  };

  nuevaAlergia = '';
  nuevoGusto = '';
  nuevoNoMeGusta = '';
  errorMessageProfile: string | null = null;
  isLoadingProfile = false;
  registrationStep = 1;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {}

  async onRegisterAuth(): Promise<void> {
    this.errorMessageAuth = null;
    this.isLoadingAuth = true;

    this.authService.register(this.email, this.password).subscribe({
      next: (response) => {
        this.isLoadingAuth = false;
        this.userId = response.userId;
        this.userEmail = response.email;
        this.profileData.email = response.email;

        if (response.accessToken) {
          this.authService.setSession(response.accessToken);
          console.log('Sesión automática iniciada después del registro');
        }

        this.registrationStep = 2;
        console.log('Registro y auto-login exitoso:', response.userId);
      },
      error: (err) => {
        this.isLoadingAuth = false;
        this.errorMessageAuth = err.message || 'Error al registrar usuario.';
        console.error('Error de registro:', err);
      }
    });
  }

  async onSaveProfile(form: NgForm): Promise<void> {
    if (!form.valid) {
        this.errorMessageProfile = 'Por favor, completa todos los campos requeridos.';
        return;
    }
    if (!this.userId) {
        this.errorMessageProfile = 'Error: ID de usuario no disponible. Intenta registrarte de nuevo.';
        return;
    }

    
    if (!this.profileData.sexo) {
      this.errorMessageProfile = 'Por favor, selecciona tu sexo.';
      return;
    }
    if (this.profileData.altura <= 0) {
      this.errorMessageProfile = 'Por favor, ingresa una altura válida.';
      return;
    }

    this.errorMessageProfile = null;
    this.isLoadingProfile = true;

    this.authService.saveUserProfile(this.userId, this.profileData).subscribe({
    next: (response) => {
      this.isLoadingProfile = false;
      console.log('Perfil de usuario guardado exitosamente:', response.profile);
      
      // ✅ REDIRECCIÓN CON MENSAJE
      this.router.navigate(['/principal'], { 
        queryParams: { message: 'register_success' } 
      });
    },
    error: (err) => {
      this.isLoadingProfile = false;
      this.errorMessageProfile = err.message || 'Error al guardar el perfil del usuario.';
      console.error('Error al guardar el perfil:', err);
    }
  });
  }

  // Métodos para añadir/eliminar alergias, gustos, no-gustos
  addAlergia(): void {
    if (this.nuevaAlergia.trim() && !this.profileData.alergias.includes(this.nuevaAlergia.trim())) {
      this.profileData.alergias.push(this.nuevaAlergia.trim());
      this.nuevaAlergia = '';
    }
  }

  removeAlergia(index: number): void {
    this.profileData.alergias.splice(index, 1);
  }

  addGusto(): void {
    if (this.nuevoGusto.trim() && !this.profileData.gustos.includes(this.nuevoGusto.trim())) {
      this.profileData.gustos.push(this.nuevoGusto.trim());
      this.nuevoGusto = '';
    }
  }

  removeGusto(index: number): void {
    this.profileData.gustos.splice(index, 1);
  }

  addNoMeGusta(): void {
    if (this.nuevoNoMeGusta.trim() && !this.profileData.no_me_gusta.includes(this.nuevoNoMeGusta.trim())) {
      this.profileData.no_me_gusta.push(this.nuevoNoMeGusta.trim());
      this.nuevoNoMeGusta = '';
    }
  }

  removeNoMeGusta(index: number): void {
    this.profileData.no_me_gusta.splice(index, 1);
  }
}
