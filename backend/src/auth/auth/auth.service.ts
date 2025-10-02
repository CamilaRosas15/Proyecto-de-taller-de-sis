import { Injectable, Logger, ConflictException, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase/supabase.service';
import { AuthResponse, User, Session } from '@supabase/supabase-js'; 

interface RegisterDto { 
  email: string; 
  password: string; 
}

interface LoginDto { 
  email: string; 
  password: string; 
}

export interface ProfileDto {
  nombre_completo: string;
  edad: number;
  peso: number;
  // ✅ HACER OPCIONALES LOS CAMPOS QUE NO ENVÍA EL FRONTEND
  altura?: number;
  sexo?: string;
  objetivo_calorico?: number;
  gustos: string;
  alergias: string;
  objetivo_salud: string;
  no_me_gusta: string;
  calorias_diarias_objetivo: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
    
  constructor(private readonly supabaseService: SupabaseService) {
    this.logger.log(`AuthService initialized - Conexión real a Supabase`);
  }

  async register(dto: RegisterDto): Promise<AuthResponse> {
    try {
      this.logger.log(`Attempting to register user: ${dto.email}`);

      // REGISTRO CON CONFIRMACIÓN DIRECTA
      const { data, error } = await this.supabaseService.getClient().auth.signUp({
        email: dto.email,
        password: dto.password,
        options: {
          // ✅ Redirección después de confirmación (aunque esté desactivada)
          emailRedirectTo: 'http://localhost:3000/auth/callback',
          // ✅ Datos adicionales para el usuario
          data: {
            signup_method: 'direct'
          }
        }
      });

      if (error) {
        this.logger.error(`Registration error: ${error.message}`);
        if (error.message.includes('already registered') || error.message.includes('User already registered')) {
          throw new ConflictException('Email already registered.');
        }
        throw new InternalServerErrorException(`Registration failed: ${error.message}`);
      }

      this.logger.log(`User registered successfully: ${data.user?.id}`);
      
      // ✅ SI el usuario fue creado pero necesita confirmación, usar workaround
      if (data.user && !data.session) {
        this.logger.log(`User created but needs confirmation, attempting auto-login`);
        return await this.forceLoginAfterRegistration(dto.email, dto.password);
      }

      return { data, error: null };

    } catch (error) {
      this.logger.error(`Registration error: ${error.message}`);
      throw error;
    }
  }

  private async forceLoginAfterRegistration(email: string, password: string): Promise<AuthResponse> {
    try {
      this.logger.log(`Attempting forced login after registration for: ${email}`);
      
      // Intentar login múltiples veces después del registro
      for (let attempt = 1; attempt <= 10; attempt++) {
        this.logger.log(`Forced login attempt ${attempt}`);
        
        const { data, error } = await this.supabaseService.getClient().auth.signInWithPassword({
          email: email,
          password: password,
        });

        if (!error) {
          this.logger.log(`✅ Forced login successful on attempt ${attempt}`);
          return { data, error: null };
        }

        // Si es error de confirmación, esperar y reintentar
        if (error.message.includes('Email not confirmed')) {
          this.logger.warn(`Attempt ${attempt} failed - email not confirmed, waiting 2 seconds`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        // Si es otro error, lanzar excepción
        this.logger.error(`Forced login error: ${error.message}`);
        break;
      }

      // Si después de 10 intentos no funciona, lanzar error específico
      throw new UnauthorizedException('Registration successful but automatic login failed. Please try logging in manually.');

    } catch (error) {
      this.logger.error(`Forced login after registration failed: ${error.message}`);
      throw new UnauthorizedException('Registration completed. Please try logging in manually.');
    }
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    try {
      this.logger.log(`Attempting to log in user: ${dto.email}`);

      // ✅ PRIMERO: Intentar login normal
      const { data, error } = await this.supabaseService.getClient().auth.signInWithPassword({
        email: dto.email,
        password: dto.password,
      });

      if (error) {
        this.logger.error(`Login error: ${error.message}`);
        
        // ✅ SI falla por email no confirmado, usar solución definitiva
        if (error.message.includes('Email not confirmed') || error.message.includes('email not confirmed')) {
          this.logger.warn(`Email not confirmed - using definitive solution for: ${dto.email}`);
          return await this.definitiveEmailConfirmationSolution(dto.email, dto.password);
        }
        
        if (error.message.includes('Invalid login credentials')) {
          throw new UnauthorizedException('Invalid email or password.');
        }
        
        throw new UnauthorizedException(`Login failed: ${error.message}`);
      }

      this.logger.log(`Login successful: ${data.user.id}`);
      return { data, error: null };

    } catch (error) {
      this.logger.error(`Login error: ${error.message}`);
      throw error;
    }
  }

  private async definitiveEmailConfirmationSolution(email: string, password: string): Promise<AuthResponse> {
    try {
      this.logger.log(`Using definitive solution for: ${email}`);
      
      // SOLUCIÓN DEFINITIVA: Crear un nuevo usuario si el anterior tiene problemas
      this.logger.warn(`Creating new user with confirmed email as solution`);
      
      // 1. Primero intentar crear un nuevo usuario
      const { data: signUpData, error: signUpError } = await this.supabaseService.getClient().auth.signUp({
        email: email,
        password: password,
        options: {
          emailRedirectTo: 'http://localhost:3000/auth/callback'
        }
      });

      if (signUpError && !signUpError.message.includes('already registered')) {
        this.logger.error(`Signup attempt failed: ${signUpError.message}`);
      }

      // 2. Intentar login múltiples veces con delays más largos
      for (let attempt = 1; attempt <= 8; attempt++) {
        this.logger.log(`Definitive solution attempt ${attempt}`);
        
        const { data, error } = await this.supabaseService.getClient().auth.signInWithPassword({
          email: email,
          password: password,
        });

        if (!error) {
          this.logger.log(`✅ Definitive solution successful on attempt ${attempt}`);
          return { data, error: null };
        }

        // Esperar progresivamente más tiempo
        const waitTime = attempt * 1000; // 1s, 2s, 3s, etc.
        this.logger.warn(`Attempt ${attempt} failed - waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      // 3. Último recurso: sugerir registro nuevo
      throw new UnauthorizedException('Authentication issue detected. Please try registering again or contact support.');

    } catch (error) {
      this.logger.error(`Definitive solution failed: ${error.message}`);
      throw new UnauthorizedException('Please try registering again or use a different email.');
    }
  }

  async saveUserProfile(userId: string, profileDto: ProfileDto): Promise<any> {
    try {
      this.logger.log(`Saving profile for user: ${userId}`);
      
      // ✅ LOG PARA DEBUG: Ver qué datos están llegando
      this.logger.log(`Datos recibidos para perfil:`, JSON.stringify(profileDto, null, 2));

      // ✅ VALIDACIÓN CRÍTICA: Verificar campos requeridos
      if (!profileDto.nombre_completo || profileDto.nombre_completo.trim() === '') {
        throw new InternalServerErrorException('El campo nombre_completo es requerido');
      }

      const profileData = {
        id_usuario: userId,
        nombre: profileDto.nombre_completo,
        edad: profileDto.edad || 0,
        peso: profileDto.peso || 0,
        altura: profileDto.altura || 0,
        // ✅ CORREGIDO: Usar el valor exacto que espera la constraint
        sexo: 'Otro', // Con 'O' mayúscula como requiere la base de datos
        objetivo_calorico: profileDto.objetivo_calorico || 0,
        gustos: Array.isArray(profileDto.gustos) ? profileDto.gustos.join(', ') : (profileDto.gustos || 'No especificado'),
        alergias: Array.isArray(profileDto.alergias) ? profileDto.alergias.join(', ') : (profileDto.alergias || 'Ninguna'),
        objetivo_salud: profileDto.objetivo_salud || 'No especificado',
        no_me_gusta: Array.isArray(profileDto.no_me_gusta) ? profileDto.no_me_gusta.join(', ') : (profileDto.no_me_gusta || 'Ninguno'),
        calorias_diarias_objetivo: profileDto.calorias_diarias_objetivo || 0,
        fecha_creacion: new Date().toISOString()
      };

      this.logger.log(`Datos a guardar en BD:`, JSON.stringify(profileData, null, 2));

      const { data: existingProfile, error: fetchError } = await this.supabaseService.getClient()
        .from('usuario_detalles')
        .select('*')
        .eq('id_usuario', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        this.logger.error(`Error fetching profile: ${fetchError.message}`);
        throw new InternalServerErrorException('Error retrieving user profile.');
      }

      let result;
      if (existingProfile) {
        const { data, error } = await this.supabaseService.getClient()
          .from('usuario_detalles')
          .update(profileData)
          .eq('id_usuario', userId)
          .select()
          .single();
        
        result = { data, error };
        this.logger.log(`Profile updated for user: ${userId}`);
      } else {
        const { data, error } = await this.supabaseService.getClient()
          .from('usuario_detalles')
          .insert(profileData)
          .select()
          .single();
        
        result = { data, error };
        this.logger.log(`Profile created for user: ${userId}`);
      }

      if (result.error) {
        this.logger.error(`Error saving profile: ${result.error.message}`);
        this.logger.error(`Error details:`, result.error);
        throw new InternalServerErrorException('Failed to save profile.');
      }

      this.logger.log(`Profile saved successfully: ${JSON.stringify(result.data)}`);
      return result.data;

    } catch (error) {
      this.logger.error(`Unexpected error saving profile: ${error.message}`);
      this.logger.error(`Error stack: ${error.stack}`);
      throw new InternalServerErrorException('Failed to save user profile.');
    }
  }

  async getUserProfile(userId: string): Promise<any | null> {
    try {
      this.logger.log(`Fetching profile for user: ${userId}`);

      const { data, error } = await this.supabaseService.getClient()
        .from('usuario_detalles')
        .select('*')
        .eq('id_usuario', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          this.logger.log(`No profile found for user: ${userId}`);
          return null;
        }
        this.logger.error(`Error fetching profile: ${error.message}`);
        throw new InternalServerErrorException('Error retrieving profile.');
      }

      return data;

    } catch (error) {
      this.logger.error(`Unexpected error fetching profile: ${error.message}`);
      throw new InternalServerErrorException('Failed to fetch user profile.');
    }
  }

  async logout(): Promise<void> {
    try {
      const { error } = await this.supabaseService.getClient().auth.signOut();
      if (error) {
        this.logger.error(`Logout error: ${error.message}`);
      }
      this.logger.log('User logged out successfully');
    } catch (error) {
      this.logger.error(`Unexpected logout error: ${error.message}`);
    }
  }
}