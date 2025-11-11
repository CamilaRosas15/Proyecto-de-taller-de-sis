import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, UserProfileData } from '../../services/auth';

@Component({
  selector: 'app-perfil-usuario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './perfil-usuario.html',
  styleUrls: ['./perfil-usuario.scss']
})
export class PerfilUsuarioComponent implements OnInit {
  
  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  // Datos reales del usuario
  usuario = {
    id: '',
    nombre: 'Cargando...',
    email: 'Cargando...',
    avatar: 'assets/user.png',
    edad: 0,
    sexo: '',
    altura: 0,
    peso: 0,
    objetivo_calorico: 0,
    gustos: '',
    alergias: '',
    no_me_gusta: '',
    objetivo: '',
    fecha_creacion: new Date(),
    badges: [
      { text: 'Activo', class: 'activo' }
    ]
  };

  // Datos para el formulario de edición
  usuarioEditado = {
    nombre: '',
    edad: 0,
    sexo: '',
    altura: 0,
    peso: 0,
    objetivo_calorico: 0,
    gustos: [] as string[],
    alergias: [] as string[],
    no_me_gusta: [] as string[],
    objetivo: ''
  };

  // Variables para nuevos tags
  nuevaAlergia = '';
  nuevoGusto = '';
  nuevoNoMeGusta = '';

  isLoading = true;
  errorMessage = '';
  isEditing = false;
  isSaving = false;
  saveMessage = '';

  progresoSemanal = [
    { dia: 'Lun', progreso: 85 },
    { dia: 'Mar', progreso: 90 },
    { dia: 'Mié', progreso: 70 },
    { dia: 'Jue', progreso: 95 },
    { dia: 'Vie', progreso: 80 },
    { dia: 'Sáb', progreso: 65 },
    { dia: 'Dom', progreso: 75 }
  ];

  opcionesSexo = ['Masculino', 'Femenino', 'Otro'];
  opcionesObjetivo = [
    'Perder peso',
    'Mantener peso', 
    'Ganar masa muscular',
    'Comer más saludable'
  ];

  ngOnInit(): void {
    this.cargarDatosUsuario();
  }

  // Cargar datos reales del usuario desde Supabase
  cargarDatosUsuario(): void {
    if (!this.authService.isAuthenticated()) {
      this.errorMessage = 'Debes iniciar sesión para ver tu perfil';
      this.isLoading = false;
      return;
    }

    const userId = this.authService.currentUserId;
    if (!userId) {
      this.errorMessage = 'No se pudo identificar al usuario';
      this.isLoading = false;
      return;
    }

    this.authService.getCurrentUser().subscribe({
      next: (userData) => {
        console.log('Datos completos del usuario:', userData);
        this.mapearDatosUsuario(userData);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando datos del usuario:', error);
        
        // Fallback: intentar cargar solo el perfil
        this.authService.getUserProfile(userId).subscribe({
          next: (profileData) => {
            console.log('Perfil cargado por fallback:', profileData);
            this.mapearDatosPerfil(profileData);
            this.isLoading = false;
          },
          error: (fallbackError) => {
            console.error('Error en fallback también:', fallbackError);
            this.errorMessage = 'Error al cargar los datos del perfil';
            this.isLoading = false;
          }
        });
      }
    });
  }

  // Mapear datos cuando se usa getCurrentUser (que incluye profile)
  private mapearDatosUsuario(userData: any): void {
    const profile = userData.profile;
    const email = userData.email || this.authService.currentUserEmail;
    
    if (profile) {
      this.mapearDesdePerfil(profile, email);
    } else {
      // Si no hay perfil, usar datos básicos
      this.usuario.email = email || 'No disponible';
      this.usuario.nombre = this.authService.currentUserName || 'Usuario';
      this.errorMessage = 'Perfil incompleto. Completa tu información personal.';
    }
  }

  // Mapear datos cuando se usa getUserProfile directamente
  private mapearDatosPerfil(profileData: any): void {
    const email = this.authService.currentUserEmail;
    this.mapearDesdePerfil(profileData, email);
  }

  // Mapeo común desde los datos del perfil
  private mapearDesdePerfil(profile: any, email: string | null): void {
    console.log('Mapeando desde perfil:', profile);
    
    this.usuario = {
      id: profile.id || '',
      nombre: profile.nombre || profile.nombre_completo || this.authService.currentUserName || 'Usuario',
      email: email || 'No disponible',
      avatar: 'assets/user.png',
      edad: profile.edad || 0,
      sexo: profile.sexo || 'No especificado',
      altura: profile.altura || 0,
      peso: profile.peso || 0,
      objetivo_calorico: profile.objetivo_calorico || profile.calorias_diarias_objetivo || 0,
      gustos: profile.gustos || '',
      alergias: profile.alergias || '',
      no_me_gusta: profile.no_me_gusta || '',
      objetivo: profile.objetivo || 'No especificado',
      fecha_creacion: profile.fecha_creacion ? new Date(profile.fecha_creacion) : new Date(),
      badges: [
        { text: 'Activo', class: 'activo' }
      ]
    };

    // Inicializar datos de edición
    this.inicializarDatosEdicion();
  }

  // Inicializar datos para edición
  private inicializarDatosEdicion(): void {
    // Convertir los datos del usuario a números para asegurar comparación correcta
    const objetivoCalorico = Number(this.usuario.objetivo_calorico) || 0;
    const edad = Number(this.usuario.edad) || 0;
    const altura = Number(this.usuario.altura) || 0;
    const peso = Number(this.usuario.peso) || 0;

    const alturaEnMetros = altura > 10 ? altura / 100 : altura;

    this.usuarioEditado = {
      nombre: this.usuario.nombre || '',
      edad: edad,
      sexo: this.usuario.sexo || '',
      altura: alturaEnMetros,
      peso: peso,
      objetivo_calorico: objetivoCalorico,
      gustos: this.getGustosArray(),
      alergias: this.getAlergiasArray(),
      no_me_gusta: this.getNoGustosArray(),
      objetivo: this.usuario.objetivo || ''
    };
  }

  // Método para verificar si hay cambios (solo se usará internamente en guardarCambios)
  private hayCambios(): boolean {
    // Convertir datos originales para comparación correcta
    const alturaOriginal = Number(this.usuario.altura) || 0;
    const alturaOriginalEnMetros = alturaOriginal > 10 ? alturaOriginal / 100 : alturaOriginal;

    const datosOriginales = {
      nombre: this.usuario.nombre || '',
      edad: Number(this.usuario.edad) || 0,
      sexo: this.usuario.sexo || '',
      altura: alturaOriginalEnMetros, // ← Usar la misma unidad que usuarioEditado.altura
      peso: Number(this.usuario.peso) || 0,
      objetivo_calorico: Number(this.usuario.objetivo_calorico) || 0,
      objetivo: this.usuario.objetivo || '',
      gustos: this.getGustosArray(),
      alergias: this.getAlergiasArray(),
      no_me_gusta: this.getNoGustosArray()
    };

    // DEBUG DETALLADO
    console.log('🔍 COMPARANDO CAMBIOS:');
    console.log('Original - Nombre:', datosOriginales.nombre, '| Editado:', this.usuarioEditado.nombre);
    console.log('Original - Edad:', datosOriginales.edad, '| Editado:', this.usuarioEditado.edad);
    console.log('Original - Altura:', datosOriginales.altura, '| Editado:', this.usuarioEditado.altura);
    console.log('Original - Peso:', datosOriginales.peso, '| Editado:', this.usuarioEditado.peso);
    console.log('Original - Sexo:', datosOriginales.sexo, '| Editado:', this.usuarioEditado.sexo);
    console.log('Original - Objetivo:', datosOriginales.objetivo, '| Editado:', this.usuarioEditado.objetivo);
    console.log('Original - Calorías:', datosOriginales.objetivo_calorico, '| Editado:', this.usuarioEditado.objetivo_calorico);
    console.log('Original - Gustos:', datosOriginales.gustos);
    console.log('Editado - Gustos:', this.usuarioEditado.gustos);
    console.log('Original - Alergias:', datosOriginales.alergias);
    console.log('Editado - Alergias:', this.usuarioEditado.alergias);
    console.log('Original - No me gusta:', datosOriginales.no_me_gusta);
    console.log('Editado - No me gusta:', this.usuarioEditado.no_me_gusta);

    const cambios = (
      this.usuarioEditado.nombre !== datosOriginales.nombre ||
      this.usuarioEditado.edad !== datosOriginales.edad ||
      this.usuarioEditado.sexo !== datosOriginales.sexo ||
      this.usuarioEditado.altura !== datosOriginales.altura || // ← Ahora comparamos en la misma unidad
      this.usuarioEditado.peso !== datosOriginales.peso ||
      this.usuarioEditado.objetivo_calorico !== datosOriginales.objetivo_calorico ||
      this.usuarioEditado.objetivo !== datosOriginales.objetivo ||
      !this.arraysIguales(this.usuarioEditado.gustos, datosOriginales.gustos) ||
      !this.arraysIguales(this.usuarioEditado.alergias, datosOriginales.alergias) ||
      !this.arraysIguales(this.usuarioEditado.no_me_gusta, datosOriginales.no_me_gusta)
    );

    console.log('🔍 ¿Hay cambios?', cambios);
    return cambios;
  }

  // Método auxiliar para comparar arrays
  private arraysIguales(arr1: string[], arr2: string[]): boolean {
    if (arr1.length !== arr2.length) return false;
    return arr1.every((item, index) => item === arr2[index]);
  }

  // Métodos para manejar tags
  addAlergia(): void {
    if (this.nuevaAlergia.trim()) {
      this.usuarioEditado.alergias.push(this.nuevaAlergia.trim());
      this.nuevaAlergia = '';
    }
  }

  removeAlergia(index: number): void {
    this.usuarioEditado.alergias.splice(index, 1);
  }

  addGusto(): void {
    if (this.nuevoGusto.trim()) {
      this.usuarioEditado.gustos.push(this.nuevoGusto.trim());
      this.nuevoGusto = '';
    }
  }

  removeGusto(index: number): void {
    this.usuarioEditado.gustos.splice(index, 1);
  }

  addNoMeGusta(): void {
    if (this.nuevoNoMeGusta.trim()) {
      this.usuarioEditado.no_me_gusta.push(this.nuevoNoMeGusta.trim());
      this.nuevoNoMeGusta = '';
    }
  }

  removeNoMeGusta(index: number): void {
    this.usuarioEditado.no_me_gusta.splice(index, 1);
  }

  // Abrir modal de edición
  editarPerfil(): void {
    this.isEditing = true;
    this.saveMessage = '';
  }

  // Cerrar modal de edición
  cancelarEdicion(): void {
    this.isEditing = false;
    this.inicializarDatosEdicion(); // Restaurar datos originales
    this.nuevaAlergia = '';
    this.nuevoGusto = '';
    this.nuevoNoMeGusta = '';
  }

  // Guardar cambios
  guardarCambios(): void {
    console.log('🔄 INICIANDO guardarCambios()');
    
    if (!this.authService.isAuthenticated()) {
      this.errorMessage = 'Debes iniciar sesión para editar tu perfil';
      return;
    }

    // Verificar si realmente hay cambios antes de guardar
    if (!this.hayCambios()) {
      console.log('❌ No hay cambios que guardar');
      
      // Cerrar el modal de edición
      this.isEditing = false;
      
      // Mostrar mensaje informativo en la parte superior
      this.saveMessage = 'No se detectaron cambios para guardar';
      
      // Limpiar el mensaje después de 3 segundos
      setTimeout(() => {
        this.saveMessage = '';
      }, 3000);
      
      return;
    }

    this.isSaving = true;
    this.saveMessage = '';

    // DEBUG: Ver qué datos se van a enviar
    console.log('📤 Datos a enviar a Supabase:');
    console.log('Nombre:', this.usuarioEditado.nombre);
    console.log('Edad:', this.usuarioEditado.edad);
    console.log('Altura (cm):', this.usuarioEditado.altura);
    console.log('Peso:', this.usuarioEditado.peso);
    console.log('Sexo:', this.usuarioEditado.sexo);
    console.log('Objetivo:', this.usuarioEditado.objetivo);
    console.log('Calorías:', this.usuarioEditado.objetivo_calorico);
    console.log('Gustos:', this.usuarioEditado.gustos);
    console.log('Alergias:', this.usuarioEditado.alergias);
    console.log('No me gusta:', this.usuarioEditado.no_me_gusta);

    const profileData: UserProfileData = {
      nombre_completo: this.usuarioEditado.nombre,
      edad: this.usuarioEditado.edad,
      peso: this.usuarioEditado.peso,
      sexo: this.usuarioEditado.sexo,
      altura: this.usuarioEditado.altura, // ← Enviar en metros al backend
      objetivo: this.usuarioEditado.objetivo,
      calorias_diarias_objetivo: this.usuarioEditado.objetivo_calorico,
      gustos: this.usuarioEditado.gustos,
      alergias: this.usuarioEditado.alergias,
      no_me_gusta: this.usuarioEditado.no_me_gusta,
      email: this.usuario.email
    };

    console.log('🎯 ProfileData para Supabase:', profileData);

    const userId = this.authService.currentUserId;
    if (!userId) {
      this.errorMessage = 'No se pudo identificar al usuario';
      this.isSaving = false;
      return;
    }

    console.log('🚀 Enviando datos actualizados a Supabase...');

    this.authService.saveUserProfile(userId, profileData).subscribe({
      next: (response) => {
        console.log('✅ Perfil actualizado exitosamente:', response);
        this.isSaving = false;
        this.isEditing = false;
        this.saveMessage = 'Perfil actualizado exitosamente';
        
        // Recargar datos actualizados
        setTimeout(() => {
          this.cargarDatosUsuario();
          this.saveMessage = '';
        }, 2000);
      },
      error: (error) => {
        console.error('❌ Error actualizando perfil:', error);
        this.isSaving = false;
        this.saveMessage = 'Error al actualizar el perfil: ' + (error.message || 'Error desconocido');
        
        // Mostrar error por más tiempo
        setTimeout(() => {
          this.saveMessage = '';
        }, 5000);
      }
    });
  }

  // Método para volver atrás
  volverAtras() {
    this.router.navigate(['/principal']);
  }

  // Métodos para procesar los datos de texto a arrays
  getGustosArray(): string[] {
    if (!this.usuario.gustos) return [];
    return this.usuario.gustos.split(',').map(gusto => gusto.trim()).filter(gusto => gusto.length > 0);
  }

  getAlergiasArray(): string[] {
    if (!this.usuario.alergias) return [];
    return this.usuario.alergias.split(',').map(alergia => alergia.trim()).filter(alergia => alergia.length > 0);
  }

  getNoGustosArray(): string[] {
    if (!this.usuario.no_me_gusta) return [];
    return this.usuario.no_me_gusta.split(',').map(noGusto => noGusto.trim()).filter(noGusto => noGusto.length > 0);
  }

  // Cálculo de IMC
  calcularIMC(): number {
    if (!this.usuario.altura || !this.usuario.peso) return 0;
    const alturaEnMetros = this.usuario.altura / 100;
    return Number((this.usuario.peso / (alturaEnMetros * alturaEnMetros)).toFixed(1));
  }

  getClasificacionIMC(): string {
    const imc = this.calcularIMC();
    if (imc === 0) return 'No disponible';
    if (imc < 18.5) return 'Bajo peso';
    if (imc < 25) return 'Peso normal';
    if (imc < 30) return 'Sobrepeso';
    return 'Obesidad';
  }

  // Calcular semanas activo (desde fecha_creacion)
  calcularSemanasActivo(): number {
    const hoy = new Date();
    const diffTiempo = hoy.getTime() - this.usuario.fecha_creacion.getTime();
    const diffSemanas = Math.floor(diffTiempo / (1000 * 60 * 60 * 24 * 7));
    return diffSemanas;
  }

  // Acciones
  abrirConfiguracion() {
    console.log('Abrir configuración');
  }

  exportarDatos() {
    console.log('Exportar datos del usuario');
  }

  // Método para recargar datos
  recargarPerfil() {
    this.isLoading = true;
    this.errorMessage = '';
    this.cargarDatosUsuario();
  }
}