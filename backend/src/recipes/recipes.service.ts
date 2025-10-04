import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase/supabase.service';

export interface RecommendRequestDto {
  userId?: string;         
  alergias?: string[];
  no_me_gusta?: string[];
  gustos?: string[];
  kcal_diarias?: number;   
  tiempo_max?: number;     
  use_llm?: boolean;        
  top_n?: number;          
  exclude_ids?: number[];   
  random?: boolean;         
  seed?: number;           
}

export interface IngredienteOut {
  id_ingrediente: number;
  nombre: string;
  unidad: string | null;
  cantidad: number | null;
  calorias: number | null;
  proteinas: number | null;
  carbohidratos: number | null;
  grasas: number | null;
}

export interface OpcionOut {
  id_receta: number;
  titulo: string;
  descripcion: string | null;
  categoria: string | null;
  tiempo_preparacion: number | null;
  kcal_totales: number | null;
  pasos: string[];
  imagen_url: string | null;
  ingredientes: IngredienteOut[];
  motivos: string[];               
  ia_explicacion?: string | null;  
}

@Injectable()
export class RecipesService {
  private readonly logger = new Logger(RecipesService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async getById(id: number): Promise<any | null> {
    this.logger.log(`Leyendo receta ${id} desde Supabase`);
    return this.supabase.getRecetaCompletaById(id);
  }

  private async askOllama(prompt: string): Promise<string> {
    const base = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
    const model = process.env.OLLAMA_MODEL || 'qwen3:4b';

    const res = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        options: { temperature: 0.7 },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Ollama error ${res.status}: ${text}`);
    }
    const json = await res.json();
    return (json?.message?.content ?? '').trim();
  }

private sanitizeLlmAnswer(txt: string): string {
  if (!txt) return txt;
  txt = txt.replace(/<\/?think>/gi, '');
  txt = txt.replace(/<think[\s\S]*?<\/think>/gi, '');
  txt = txt.replace(/^(ok(ay)?[,.\s-]*)?/i, '');
  txt = txt.replace(/^(let me think[,.\s-]*)?/i, '');
  txt = txt.replace(/^the (user|task).*\n?/i, '');

  const lines = txt.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const top4 = lines.slice(0, 4);
  const result = top4.join('\n').trim();

  return result || 'Encaja con tus gustos y tiempo. Sustituir mayonesa por yogur natural para aligerar.';
}

  async recomendarReceta(req: RecommendRequestDto): Promise<{ opciones: OpcionOut[]; mensaje?: string }> {
    let alergias = (req.alergias ?? []).map(s => s.toLowerCase());
    let noMeGusta = (req.no_me_gusta ?? []).map(s => s.toLowerCase());
    let gustos = (req.gustos ?? []).map(s => s.toLowerCase());
    let kcal = req.kcal_diarias ?? 2000;
    let tiempoMax = req.tiempo_max ?? 30;

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
        const split = (t?: string | null) =>
          t ? t.split(',').map((x: string) => x.trim().toLowerCase()).filter(Boolean) : [];
        alergias = split(perfil.alergias);
        gustos = split(perfil.gustos);
        if (perfil.objetivo_calorico) kcal = perfil.objetivo_calorico;
      }
    }

    const recetas = await this.supabase.listRecetas(200);             
    const ids = recetas.map((r: any) => r.id_receta);
    const mapIngs = await this.supabase.getIngredientesPorRecetas(ids); 

    type Cand = {
      receta: any;
      ingredientes: any[];
      score: number;
      motivos: string[];
      texto: string;
    };

    const toTexto = (r: any, ings: any[]) =>
      [r.nombre, r.descripcion, r.instrucciones, ...ings.map(i => i.nombre)]
        .join(' ')
        .toLowerCase();

    const candidatos: Cand[] = recetas.map((r: any) => {
      const ings = mapIngs.get(r.id_receta) ?? [];
      const texto = toTexto(r, ings);

      const motivos: string[] = [];
      let score = 0;

      const aler = alergias.find(a => a && texto.includes(a));
      if (aler) motivos.push(`Contiene alérgeno: ${aler}`);

      const nog = noMeGusta.find(n => n && texto.includes(n));
      if (nog) motivos.push(`Incluye ingrediente no deseado: ${nog}`);

      if (r.tiempo_preparacion && r.tiempo_preparacion > tiempoMax) {
        motivos.push(`Supera el tiempo máximo (${tiempoMax} min)`);
      }
      if (r.calorias_totales && r.calorias_totales > kcal * 0.6) {
        motivos.push(`Calorías altas vs objetivo (${kcal} kcal/día)`);
      }

      const gustoHits = gustos.filter(g => g && texto.includes(g)).length;
      score += gustoHits * 2;

      if (aler || nog) score -= 1000;
      if (r.tiempo_preparacion && r.tiempo_preparacion > tiempoMax) score -= 5;
      if (r.calorias_totales && r.calorias_totales > kcal * 0.6) score -= 3;

      return { receta: r, ingredientes: ings, score, motivos, texto };
    });

    let aptos = candidatos.filter(c => c.score > -1000);

    if (Array.isArray(req.exclude_ids) && req.exclude_ids.length) {
      const ex = new Set(req.exclude_ids.map(Number));
      aptos = aptos.filter(c => !ex.has(Number(c.receta.id_receta)));
    }

    aptos = aptos.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const at = a.receta.tiempo_preparacion ?? 999;
      const bt = b.receta.tiempo_preparacion ?? 999;
      if (at !== bt) return at - bt;
      return Number(b.receta.id_receta) - Number(a.receta.id_receta);
    });

    if (req.random) {
      let seed = typeof req.seed === 'number' ? req.seed : Date.now();
      const rng = () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
      };
      for (let i = aptos.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [aptos[i], aptos[j]] = [aptos[j], aptos[i]];
      }
    }

    const topN = Math.max(1, Math.min(req.top_n ?? 3, 10));
    const top = aptos.slice(0, topN);

    if (!top.length) {
      return {
        opciones: [],
        mensaje: 'No se encontraron recetas que cumplan alergias/no_me_gusta/tiempo/kcal.',
      };
    }

    const opcionesBase: OpcionOut[] = top.map((t) => ({
      id_receta: Number(t.receta.id_receta),
      titulo: String(t.receta.nombre),
      descripcion: t.receta.descripcion ?? null,
      categoria: t.receta.categoria ?? null,
      tiempo_preparacion: t.receta.tiempo_preparacion ?? null,
      kcal_totales: t.receta.calorias_totales ?? null,
      pasos: (t.receta.instrucciones || '').split('\n').filter(Boolean),
      imagen_url: t.receta.imagen_url ?? null,
      ingredientes: (t.ingredientes ?? []).map((i: any) => ({
        id_ingrediente: Number(i.id_ingrediente),
        nombre: String(i.nombre),
        unidad: i.unidad ?? null,
        cantidad: i.cantidad ?? null,
        calorias: i.calorias ?? null,
        proteinas: i.proteinas ?? null,
        carbohidratos: i.carbohidratos ?? null,
        grasas: i.grasas ?? null,
      })),
      motivos: Array.isArray(t.motivos) ? t.motivos : [],
    }));

    //Explicación IA (Ollama)
    const useLlm = req.use_llm ?? true;
    if (!useLlm) {
      return { opciones: opcionesBase };
    }

    const opcionesConIA: OpcionOut[] = await Promise.all(
      opcionesBase.map(async (op) => {
        const prompt = `
Eres NutriChef IA. Responde en español y SOLO con el siguiente formato exacto (máximo 4 líneas):
- Encaje: <1–2 líneas por qué encaja con tiempo/objetivo/gustos>
- Sugerencia: <si hay conflicto menor, una sola sustitución "X por Y"; si no, "ninguna">

Perfil:
- Alergias: ${alergias.join(', ') || 'ninguna'}
- No me gusta: ${noMeGusta.join(', ') || 'ninguno'}
- Gustos: ${gustos.join(', ') || 'no especificados'}
- Objetivo kcal/día: ${kcal}
- Tiempo máx (min): ${tiempoMax}

Receta: ${op.titulo}
Ingredientes:
${op.ingredientes.map(i => `- ${i.nombre}${i.cantidad ? `: ${i.cantidad} ${i.unidad ?? ''}` : ''}`).join('\n')}

Recuerda: NO incluyas razonamientos, ni explicaciones meta, ni inglés, ni cálculos largos. Solo las 2 líneas pedidas.
`.trim();


        let ia_explicacion: string | null = null;
        try {
          ia_explicacion = await this.askOllama(prompt);
          ia_explicacion = this.sanitizeLlmAnswer(ia_explicacion);
          
        } catch (e) {
          this.logger.warn(`Ollama no respondió: ${(e as Error).message}`);
          ia_explicacion = null;
        }



        return { ...op, ia_explicacion };
      })
    );

    return { opciones: opcionesConIA };
  }
}
