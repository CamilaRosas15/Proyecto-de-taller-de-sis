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

    // Solo obtener los datos básicos de la receta
    const { data: receta, error: recErr } = await this.supabase
      .from('recetas')
      .select('*')
      .eq('id_receta', id)
      .single();
    
    if (recErr) {
      this.logger.error(`Error receta ${id}: ${recErr.message}`);
      return null;
    }

    // SOLUCIÓN: No intentar acceder a receta_ingredientes, usar directamente el JSON
    let ingredientes: any[] = [];
    
    // Usar ingredientes del campo JSON directamente
    if (receta.ingredientes && Array.isArray(receta.ingredientes)) {
      ingredientes = receta.ingredientes.map((nombre: string, index: number) => ({
        id_ingrediente: index + 1,
        nombre: nombre,
        cantidad: null,
        unidad: null,
        calorias: null,
        proteinas: null,
        carbohidratos: null,
        grasas: null
      }));
    }

    this.logger.log(`✅ Receta ${id} cargada correctamente con ${ingredientes.length} ingredientes`);
    return { ...receta, ingredientes };
  }

  async getUserDetailsFresh(userId: string): Promise<any | null> {
    this.logger.log(`Fetching user details (fresh) for ID: ${userId}`);
    const { data, error } = await this.supabase
      .from('usuario_detalles')   // <-- tu tabla actual
      .select('*')
      //.or(`id_usuario.eq.${userId},id.eq.${userId}`)
      .eq('id', userId)
      .single();

    if (error) {
      this.logger.error(`Error fetching user details ${userId}: ${error.message}`);
      return null;
    }
    return data;
  }

  async getUserDetails(userId: string): Promise<any | null> {
    return this.getUserDetailsFresh(userId);
  }

  async listRecetas(limit = 200): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('recetas')
      .select('id_receta, nombre, descripcion, categoria, tiempo_preparacion, calorias_totales, instrucciones, imagen_url, ingredientes')
      .limit(limit);

    if (error) {
      this.logger.error(`listRecetas error: ${error.message}`);
      return [];
    }
    return data ?? [];
  }

  async getIngredientesPorRecetas(recetaIds: number[]): Promise<Map<number, any[]>> {
    const out = new Map<number, any[]>();
    if (!recetaIds.length) return out;

    const { data: enlaces, error: e1 } = await this.supabase
      .from('receta_ingredientes')
      .select('id_receta, id_ingrediente, cantidad')
      .in('id_receta', recetaIds);

    if (e1 || !enlaces?.length) return out;

    const ingIds = Array.from(new Set(enlaces.map(e => e.id_ingrediente)));
    const { data: ing, error: e2 } = await this.supabase
      .from('ingredientes')
      .select('id_ingrediente, nombre, unidad, calorias, proteinas, carbohidratos, grasas')
      .in('id_ingrediente', ingIds);

    if (e2 || !ing?.length) return out;

    const mapIng = new Map(ing.map(x => [x.id_ingrediente, x]));
    for (const e of enlaces) {
      const base = mapIng.get(e.id_ingrediente);
      if (!base) continue;
      const item = { ...base, cantidad: e.cantidad ?? null };
      const arr = out.get(e.id_receta) ?? [];
      arr.push(item);
      out.set(e.id_receta, arr);
    }
    return out;
  }
}