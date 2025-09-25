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
  nombre: string;
  edad: number;
  peso: number;
  altura: number;
  sexo: string;
  objetivo_calorico: number;
  gustos: string;
  alergias: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  
  // ✅ FORZAR MODO DESARROLLO - varias opciones
  private readonly DEV_MODE = 
    process.env.NODE_ENV === 'development' || 
    process.env.AUTH_BYPASS === 'true';
    
  constructor(private readonly supabaseService: SupabaseService) {
    this.logger.log(`AuthService initialized - DEV_MODE: ${this.DEV_MODE}`);
    this.logger.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  }

  async register(dto: RegisterDto): Promise<AuthResponse> {
    try {
      this.logger.log(`Attempting to register user: ${dto.email}`);

      // ✅ MODO DESARROLLO: Siempre éxito
      if (this.DEV_MODE) {
        this.logger.warn('🎯 DEV MODE ACTIVE: Bypassing actual registration');
        
        const mockUser: User = {
          id: 'dev-user-id-' + Date.now(),
          email: dto.email,
          created_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          confirmed_at: new Date().toISOString(),
          email_confirmed_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          role: 'authenticated',
          updated_at: new Date().toISOString(),
        } as any;

        return {
          data: {
            user: mockUser,
            session: null
          },
          error: null
        };
      }

      // Código original para producción...
      const { data, error } = await this.supabaseService.getClient().auth.signUp({
        email: dto.email,
        password: dto.password,
      });

      if (error) {
        this.logger.error(`Registration error: ${error.message}`);
        if (error.message.includes('already registered')) {
          throw new ConflictException('Email already registered.');
        }
        throw new InternalServerErrorException('Registration failed.');
      }

      this.logger.log(`User registered: ${data.user?.id}`);
      return { data, error: null };

    } catch (error) {
      this.logger.error(`Registration error: ${error.message}`);
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    try {
      this.logger.log(`Attempting to log in user: ${dto.email}`);

      // ✅ MODO DESARROLLO: Siempre éxito
      if (this.DEV_MODE) {
        this.logger.warn('🎯 DEV MODE ACTIVE: Bypassing actual login');
        
        const mockUser: User = {
          id: 'dev-user-id-' + Date.now(),
          email: dto.email,
          created_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          confirmed_at: new Date().toISOString(),
          email_confirmed_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          role: 'authenticated',
          updated_at: new Date().toISOString(),
        } as any;

        const mockSession: Session = {
          access_token: 'dev-token-' + Date.now(),
          refresh_token: 'dev-refresh-token-' + Date.now(),
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          token_type: 'bearer',
          user: mockUser,
        } as any;

        this.logger.log(`✅ DEV LOGIN SUCCESSFUL for: ${dto.email}`);
        
        return {
          data: {
            user: mockUser,
            session: mockSession
          },
          error: null
        };
      }

      // Código original para producción...
      const { data, error } = await this.supabaseService.getClient().auth.signInWithPassword({
        email: dto.email,
        password: dto.password,
      });

      if (error) {
        this.logger.error(`Login error: ${error.message}`);
        
        if (error.message.includes('Email not confirmed')) {
          this.logger.warn(`Email not confirmed - using workaround for: ${dto.email}`);
          return await this.simpleWorkaround(dto.email, dto.password);
        }
        
        if (error.message.includes('Invalid login credentials')) {
          throw new UnauthorizedException('Invalid email or password.');
        }
        
        throw new UnauthorizedException('Login failed.');
      }

      this.logger.log(`Login successful: ${data.user.id}`);
      return { data, error: null };

    } catch (error) {
      this.logger.error(`Login error: ${error.message}`);
      throw error;
    }
  }

  private async simpleWorkaround(email: string, password: string): Promise<AuthResponse> {
    try {
      this.logger.log(`Using simple workaround for: ${email}`);
      
      for (let i = 0; i < 3; i++) {
        const { data, error } = await this.supabaseService.getClient().auth.signInWithPassword({
          email: email,
          password: password,
        });

        if (!error) {
          this.logger.log(`Workaround successful on attempt ${i + 1}`);
          return { data, error: null };
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      }

      throw new UnauthorizedException('Please execute the SQL query in Supabase to fix this permanently.');

    } catch (error) {
      this.logger.error(`Workaround failed: ${error.message}`);
      throw new UnauthorizedException('Login failed. Please contact support.');
    }
  }

  // ... (los demás métodos saveUserProfile, getUserProfile, logout permanecen igual)
  async saveUserProfile(userId: string, profileDto: ProfileDto): Promise<any> {
    try {
      this.logger.log(`Saving profile for user: ${userId}`);

      // ✅ MODO DESARROLLO: Simular guardado
      if (this.DEV_MODE) {
        this.logger.warn('🎯 DEV MODE: Simulating profile save');
        return {
          id: Date.now(),
          id_usuario: userId,
          ...profileDto,
          fecha_creacion: new Date().toISOString()
        };
      }

      const profileData = {
        id_usuario: userId,
        nombre: profileDto.nombre,
        edad: profileDto.edad,
        peso: profileDto.peso,
        altura: profileDto.altura,
        sexo: profileDto.sexo,
        objetivo_calorico: profileDto.objetivo_calorico,
        gustos: profileDto.gustos,
        alergias: profileDto.alergias,
        fecha_creacion: new Date().toISOString()
      };

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
        throw new InternalServerErrorException('Failed to save profile.');
      }

      return result.data;

    } catch (error) {
      this.logger.error(`Unexpected error saving profile: ${error.message}`);
      throw new InternalServerErrorException('Failed to save user profile.');
    }
  }

  async getUserProfile(userId: string): Promise<any | null> {
    try {
      this.logger.log(`Fetching profile for user: ${userId}`);

      // ✅ MODO DESARROLLO: Simular perfil
      if (this.DEV_MODE) {
        this.logger.warn('🎯 DEV MODE: Returning mock profile');
        return {
          id: 1,
          id_usuario: userId,
          nombre: 'Usuario Desarrollo',
          edad: 25,
          peso: 70,
          altura: 175,
          sexo: 'femenino',
          objetivo_calorico: 2000,
          gustos: 'Comida saludable',
          alergias: 'Ninguna',
          fecha_creacion: new Date().toISOString()
        };
      }

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
      // ✅ MODO DESARROLLO: No hacer nada
      if (this.DEV_MODE) {
        this.logger.warn('🎯 DEV MODE: Bypassing actual logout');
        return;
      }

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