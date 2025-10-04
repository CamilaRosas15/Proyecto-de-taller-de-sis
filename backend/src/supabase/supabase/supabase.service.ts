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

  async getRecetaById(id: number): Promise<any | null> {
    this.logger.log(`Fetching recipe with ID: ${id}`);
    const { data, error } = await this.supabase
      .from('recetas')
      .select('*')
      .eq('id_receta', id)
      .single(); 

    if (error) {
      this.logger.error(`Error fetching recipe ${id}: ${error.message}`);
      return null;
    }
    return data;
  }

async getRecetaCompletaById(id: number): Promise<any | null> {
  this.logger.log(`Fetching full recipe with ID: ${id}`);

  const { data: receta, error: recErr } = await this.supabase
    .from('recetas')
    .select('*')
    .eq('id_receta', id)
    .single();
  if (recErr) {
    this.logger.error(`Error receta ${id}: ${recErr.message}`);
    return null;
  }

  const { data: enlaces, error: linkErr } = await this.supabase
    .from('receta_ingredientes')
    .select('id_ingrediente, cantidad')
    .eq('id_receta', id);
  if (linkErr) {
    this.logger.error(`Error enlaces receta ${id}: ${linkErr.message}`);
    return { ...receta, ingredientes: [] };
  }

  const ids = (enlaces ?? []).map(e => e.id_ingrediente);
  let ingredientes: any[] = [];
  if (ids.length) {
    const { data: ing, error: ingErr } = await this.supabase
      .from('ingredientes')
      .select('*')
      .in('id_ingrediente', ids);
    if (ingErr) {
      this.logger.error(`Error ingredientes receta ${id}: ${ingErr.message}`);
    } else {
      const mapCant = new Map(enlaces.map(e => [e.id_ingrediente, e.cantidad]));
      ingredientes = ing.map(x => ({
        ...x,
        cantidad: mapCant.get(x.id_ingrediente) ?? null,
      }));
    }
  }

  return { ...receta, ingredientes };
}


async getUserDetails(userId: string): Promise<any | null> {
  this.logger.log(`Fetching user details for ID: ${userId}`);
  const { data, error } = await this.supabase
    .from('usuario_detalles')
    .select('*')
    .eq('id', userId)        
    .single();

  if (error) {
    this.logger.error(`Error fetching user details ${userId}: ${error.message}`);
    return null;
  }
  return data;
}

}