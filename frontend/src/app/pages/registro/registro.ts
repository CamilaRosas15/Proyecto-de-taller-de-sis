// src/app/pages/registro/registro.ts (Frontend Angular - ¡Alineado a tu estructura!)
import { Component, OnInit } from '@angular/core'; // ✅ Importar OnInit
import { FormsModule, NgForm } from '@angular/forms'; // ✅ Importar NgForm para validación del formulario
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router'; // Importar Router y RouterModule

import { AuthService, UserProfileData } from '../../services/auth'; // ✅ Ruta del servicio, UserProfileData

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './registro.html', // ✅ ¡CORREGIDO para tu nombre de archivo!
  styleUrls: ['./registro.scss'] // ✅ ¡CORREGIDO para tu nombre de archivo!
})
export class Registro implements OnInit { // ✅ Nombre de CLASE ALINEADO
  // Datos para el registro de autenticación (Paso 1 del formulario)
  email = '';
  password = '';
  errorMessageAuth: string | null = null;
  isLoadingAuth = false;

  // Datos para el perfil de usuario detallado (Paso 2 del formulario)
  userId: string | null = null; // Para guardar el ID del usuario recién registrado
  userEmail: string | null = null; // Para guardar el email del usuario
  profileData: UserProfileData = {
      nombre_completo: '',
      edad: 0,
      peso: 0,
      objetivo_salud: 'Mantener peso', // Valor por defecto
      calorias_diarias_objetivo: 2000, // Valor por defecto
      alergias: [],
      gustos: [],
      no_me_gusta: [],
      email: '' // Se llenará con el email de registro
  };
  nuevaAlergia = '';
  nuevoGusto = '';
  nuevoNoMeGusta = '';
  errorMessageProfile: string | null = null;
  isLoadingProfile = false;
  registrationStep = 1; // 1: Registro Auth, 2: Datos de Perfil

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
      // Si ya está logueado, podría redirigir o cargar perfil
      // Por ahora, lo dejamos vacío, pero se podría añadir lógica aquí.
  }

  async onRegisterAuth(): Promise<void> {
    this.errorMessageAuth = null;
    this.isLoadingAuth = true;

    this.authService.register(this.email, this.password).subscribe({
      next: (response) => {
        this.isLoadingAuth = false;
        this.userId = response.userId;
        this.userEmail = response.email;
        this.profileData.email = response.email; // Pre-llenar el email en el perfil
        this.registrationStep = 2; // Avanzar al paso del perfil
        console.log('Registro de autenticación exitoso:', response.userId);
      },
      error: (err) => {
        this.isLoadingAuth = false;
        this.errorMessageAuth = err.message || 'Error al registrar usuario.';
        console.error('Error de registro de autenticación:', err);
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

    this.errorMessageProfile = null;
    this.isLoadingProfile = true;

    this.authService.saveUserProfile(this.userId, this.profileData).subscribe({
      next: (response) => {
        this.isLoadingProfile = false;
        console.log('Perfil de usuario guardado exitosamente:', response.profile);
        // Redirigir al login o a la página principal después de guardar el perfil
        this.router.navigate(['/login']); // ✅ Redirigir al login después de guardar el perfil
      },
      error: (err) => {
        this.isLoadingProfile = false;
        this.errorMessageProfile = err.message || 'Error al guardar el perfil del usuario.';
        console.error('Error al guardar el perfil:', err);
      }
    });
  }

  // Métodos para añadir/eliminar alergias, gustos, no-gustos (para la UI)
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