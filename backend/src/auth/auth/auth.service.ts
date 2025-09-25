import { Injectable, Logger, ConflictException, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase/supabase.service';
import { AuthResponse } from '@supabase/supabase-js'; 

interface RegisterDto { email: string; password: string; }
interface LoginDto { email: string; password: string; }
export interface ProfileDto { // Exporta para usar en Controller
    email: string;
    nombre_completo: string;
    edad: number;
    peso: number;
    objetivo_salud: string;
    objetivo_calorico: number;
    alergias: string[];
    gustos: string[];
    no_me_gusta: string[];
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    try {
      const { data, error } = await this.supabaseService.client.auth.signUp({
        email: dto.email,
        password: dto.password,
      });

      if (error) {
        this.logger.error(`Error during user registration: ${error.message}`);
        if (error.status === 400 && error.message.includes('already registered')) {
          throw new ConflictException('Email already registered.');
        }
        throw new InternalServerErrorException(error.message);
      }
      this.logger.log(`User registered successfully: ${data.user?.id}`);
      return { data, error };
    } catch (e) {
      if (e instanceof ConflictException || e instanceof InternalServerErrorException) { throw e; }
      this.logger.error(`Unexpected error during registration: ${e.message}`);
      throw new InternalServerErrorException('An unexpected error occurred during registration.');
    }
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    try {
      const { data, error } = await this.supabaseService.client.auth.signInWithPassword({
        email: dto.email,
        password: dto.password,
      });

      if (error) {
        this.logger.error(`Error during user login: ${error.message}`);
        throw new UnauthorizedException('Invalid credentials.');
      }

      this.logger.log(`User logged in successfully: ${data.user?.id}`);
      return { data, error };
    } catch (e) {
      if (e instanceof UnauthorizedException) { throw e; }
      this.logger.error(`Unexpected error during login: ${e.message}`);
      throw new InternalServerErrorException('An unexpected error occurred during login.');
    }
  }

  async saveUserProfile(userId: string, profileDto: ProfileDto): Promise<any> {
    try {
      // Intentar actualizar el perfil si ya existe
      const { data: existingProfile, error: fetchError } = await this.supabaseService.client
        .from('usuario_detalles') // ✅ ¡Usar el nombre de tu tabla!
        .select('*')
        .eq('id_usuario', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
          this.logger.error(`Error fetching existing profile for user ${userId}: ${fetchError.message}`);
          throw new InternalServerErrorException('Error retrieving user profile.');
      }

      let result;
      if (existingProfile) {
        // Si el perfil existe, actualízalo
        const { data, error } = await this.supabaseService.client
          .from('usuario_detalles') // ✅ ¡Usar el nombre de tu tabla!
          .update({ ...profileDto })
          .eq('id_usuario', userId)
          .select()
          .single();
        result = { data, error };
        this.logger.log(`User profile updated for user: ${userId}`);
      } else {
        // Si el perfil no existe, créalo
        const { data, error } = await this.supabaseService.client
          .from('usuario_detalles') // ✅ ¡Usar el nombre de tu tabla!
          .insert({ id_usuario: userId, ...profileDto })
          .select()
          .single();
        result = { data, error };
        this.logger.log(`User profile created for user: ${userId}`);
      }

      if (result.error) {
        this.logger.error(`Error saving user profile for user ${userId}: ${result.error.message}`);
        throw new InternalServerErrorException(result.error.message);
      }
      return result.data;
    } catch (e) {
      this.logger.error(`Unexpected error saving user profile: ${e.message}`);
      throw new InternalServerErrorException('An unexpected error occurred while saving profile.');
    }
  }

  async getUserProfile(userId: string): Promise<any | null> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('usuario_detalles') // ✅ ¡Usar el nombre de tu tabla!
        .select('*')
        .eq('id_usuario', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        this.logger.error(`Error fetching user profile ${userId}: ${error.message}`);
        throw new InternalServerErrorException(error.message);
      }
      return data;
    } catch (e) {
      this.logger.error(`Unexpected error fetching user profile: ${e.message}`);
      throw new InternalServerErrorException('An unexpected error occurred while fetching profile.');
    }
  }
}