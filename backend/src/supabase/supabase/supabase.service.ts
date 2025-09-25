import { Injectable ,Logger} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';


@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;
  private readonly logger = new Logger(SupabaseService.name);

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      this.logger.error('Variables de entorno SUPABASE_URL o SUPABASE_ANON_KEY no configuradas.');
      throw new Error(`Supabase credentials are not set. Please check your .env file.`);
    }

    this.supabase = createClient(supabaseUrl, supabaseAnonKey);
    this.logger.log('Supabase client initialized successfully.');
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  // Método para obtener una receta por ID (usando la estructura de tu tabla 'recetas')
  async getRecetaById(id: number): Promise<any | null> {
    this.logger.log(`Fetching recipe with ID: ${id}`);
    const { data, error } = await this.supabase
      .from('recetas') // Nombre de tu tabla de recetas
      .select('*')
      .eq('id_receta', id) // 'id_receta' es el nombre de tu columna ID
      .single(); // Para obtener un solo registro

    if (error) {
      this.logger.error(`Error fetching recipe ${id}: ${error.message}`);
      return null;
    }
    return data;
  }

  // Método para obtener los detalles de un usuario por ID (para la IA, si ya tienes la tabla usuario_detalles)
  async getUserDetails(userId: number): Promise<any | null> {
    this.logger.log(`Fetching user details for ID: ${userId}`);
    const { data, error } = await this.supabase
        .from('usuario_detalles') // Nombre de tu tabla de detalles de usuario
        .select('*')
        .eq('id_usuario', userId) // Asume una columna 'id_usuario'
        .single();

    if (error) {
        this.logger.error(`Error fetching user details ${userId}: ${error.message}`);
        return null;
    }
    return data;
  }

  // Puedes añadir más métodos para interactuar con otras tablas según necesites
  
}