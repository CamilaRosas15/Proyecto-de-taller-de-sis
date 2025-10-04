import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase/supabase.service';

export interface RecommendRequestDto {
  userId?: string;          // si llega y el body viene vacío, tomamos preferencias del perfil
  alergias?: string[];
  no_me_gusta?: string[];
  gustos?: string[];
  kcal_diarias?: number;    // objetivo diario aprox.
  tiempo_max?: number;      // minutos máximos deseados
}

export interface IngredienteOut {
  id_ingrediente: number;
  nombre: string;
  unidad: string | null;
  cantidad: number | null;
  calorias?: number | null;
  proteinas?: number | null;
  carbohidratos?: number | null;
  grasas?: number | null;
}

export interface RecetaOut {
  id_receta: number;
  nombre: string;
  descripcion: string | null;
  categoria?: string | null;
  tiempo_preparacion?: number | null;
  calorias_totales?: number | null;
  instrucciones: string | null;
  imagen_url?: string | null;
  ingredientes?: IngredienteOut[];
}

function splitCsv(txt?: string | null) {
  if (!txt) return [];
  return txt.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}

@Injectable()
export class RecipesService {
  private readonly logger = new Logger(RecipesService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Devuelve una receta por ID, incluyendo sus ingredientes (con cantidad),
   * usando el join receta_ingredientes -> ingredientes.
   */
  async getById(id: number): Promise<RecetaOut | null> {
    this.logger.log(`Leyendo receta ${id} desde Supabase`);
    // Implementado en SupabaseService: getRecetaCompletaById
    return this.supabase.getRecetaCompletaById(id);
  }

  /**
   * Recomendador simple:
   * - Si llega userId y el body no trae preferencias, carga el perfil (usuario_detalles).
   * - Aplica reglas básicas vs alergias / no me gusta / tiempo / kcal.
   * - (Demo) prueba con la receta 1; luego podemos expandir a ranking/filtrado real.
   */
  async recomendarReceta(req: RecommendRequestDto) {
    // Valores base
    let alergias = (req.alergias ?? []).map(s => s.toLowerCase());
    let noMeGusta = (req.no_me_gusta ?? []).map(s => s.toLowerCase());
    let gustos = (req.gustos ?? []).map(s => s.toLowerCase());
    let kcal = req.kcal_diarias ?? 2000;
    let tiempoMax = req.tiempo_max ?? 30;

    // Si recibimos userId y el body viene vacío, usamos perfil
    const bodyVacio =
      !(req.alergias?.length) &&
      !(req.no_me_gusta?.length) &&
      !(req.gustos?.length) &&
      !req.kcal_diarias &&
      !req.tiempo_max;

    if (req.userId && bodyVacio) {
      this.logger.log(`Cargando preferencias desde perfil de usuario ${req.userId}`);
      const perfil = await this.supabase.getUserDetails(req.userId);
      if (perfil) {
        alergias = splitCsv(perfil.alergias);
        gustos = splitCsv(perfil.gustos);
        if (perfil.objetivo_calorico) kcal = perfil.objetivo_calorico;
      }
    }

    // (Demo) Tomamos receta candidata ID=1
    const candidata = await this.supabase.getRecetaCompletaById(1);
    if (!candidata) {
      return {
        titulo: 'Sin recetas en BD',
        motivos: ['No se encontró la receta ID 1 en la base de datos.'],
      };
    }

    // Texto para chequeos simples
    const texto = [
      candidata.nombre,
      candidata.descripcion,
      candidata.instrucciones,
      ...(candidata.ingredientes ?? []).map((i: any) => i.nombre),
    ]
      .join(' ')
      .toLowerCase();

    // Reglas
    const pegaAlergia = alergias.find(a => a && texto.includes(a));
    const pegaNoMeGusta = noMeGusta.find(n => n && texto.includes(n));

    const motivos: string[] = [];
    if (pegaAlergia) motivos.push(`Contiene alérgeno: ${pegaAlergia}`);
    if (pegaNoMeGusta) motivos.push(`Incluye ingrediente no deseado: ${pegaNoMeGusta}`);
    if (candidata.tiempo_preparacion && candidata.tiempo_preparacion > tiempoMax) {
      motivos.push(`Supera el tiempo máximo (${tiempoMax} min)`);
    }
    if (candidata.calorias_totales && candidata.calorias_totales > kcal * 0.6) {
      motivos.push(`Calorías altas vs objetivo (${kcal} kcal/día)`);
    }

    // (Opcional) Registrar historial_recetas aquí si lo necesitas
    // if (req.userId) {
    //   await this.supabase.getClient().from('historial_recetas').insert({
    //     id_usuario: req.userId,
    //     id_receta: candidata.id_receta,
    //     fecha: new Date().toISOString(),
    //   });
    // }

    return {
      id_receta: candidata.id_receta,
      titulo: candidata.nombre,
      descripcion: candidata.descripcion,
      categoria: candidata.categoria ?? null,
      tiempo_preparacion: candidata.tiempo_preparacion ?? null,
      kcal_totales: candidata.calorias_totales ?? null,
      pasos: (candidata.instrucciones || '').split('\n').filter(Boolean),
      imagen_url: candidata.imagen_url ?? null,
      ingredientes: (candidata.ingredientes ?? []).map((i: any) => ({
        id_ingrediente: i.id_ingrediente,
        nombre: i.nombre,
        unidad: i.unidad ?? null,
        cantidad: i.cantidad ?? null,
        calorias: i.calorias ?? null,
        proteinas: i.proteinas ?? null,
        carbohidratos: i.carbohidratos ?? null,
        grasas: i.grasas ?? null,
      })),
      motivos: motivos.length ? motivos : ['Apta según tu perfil/preferencias.'],
      // Puedes agregar aquí “sustitutos_posibles” si quieres que la IA proponga cambios:
      // sustitutos: (candidata.ingredientes ?? []).map((i: any) => i.sustitutos_posibles ?? null),
    };
  }
}
