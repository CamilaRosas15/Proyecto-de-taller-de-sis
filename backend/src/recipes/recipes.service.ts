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

function isValidUuid(v?: string): boolean {
  if (!v) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

type Cfg = {
  userId?: string;
  kcal: number;
  tiempoMax: number;
  useLlm: boolean;
  topN: number;
  exclude: Set<number>;
  random: boolean;
  seed: number;
};

type Prefs = {
  alergias: string[];
  noMeGusta: string[];
  gustos: string[];
  kcal: number;
  tiempoMax: number;
};

type Cand = {
  receta: any;
  ingredientes: any[]; 
  texto: string;
  motivos: string[];
  score: number;
};

@Injectable()
export class RecipesService {
  private readonly logger = new Logger(RecipesService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async getAll(): Promise<any[]> {
    this.logger.log('📋 Obteniendo todas las recetas desde Supabase');
    const recetas = await this.supabase.listRecetas(200);
    this.logger.log(`✅ Se obtuvieron ${recetas?.length} recetas de Supabase`);
    return recetas;
  }

  async getById(id: number): Promise<any | null> {
    this.logger.log(`Leyendo receta ${id} desde Supabase`);
    return this.supabase.getRecetaCompletaById(id);
  }

  private async askOllama(prompt: string): Promise<string> {
    //const base = process.env.OLLAMA_BASE_URL || 'https://approachable-dale-macroptic.ngrok-free.dev';
    const base = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const model = process.env.OLLAMA_MODEL || 'qwen3:4b';
    console.log('DEPURACIÓN OLLAMA:');
    console.log('URL:', base);
    console.log('Modelo:', model);
    console.log('Prompt (inicio):', prompt.substring(0, 200) + '...');


    try {
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
    } catch (error) {
      this.logger.error('Error en askOllama:', error as any);
      throw error;
    }
  }

  private sanitizeLlmAnswer(txt: string): string {
    const fallback = 'Encaje: Cumple preferencias y tiempo.\nSugerencia: ninguna';
    if (!txt) return fallback;

    txt = txt.replace(/<\/?think>/gi, '').replace(/<think[\s\S]*?<\/think>/gi, '');

    const spanishMeta = [
      /^(veamos[,.\s-]*)/i, /^(analizando[^.\n]*)/i, /^(considerando[^.\n]*)/i,
      /^(basándome en[^.\n]*)/i, /^(observando[^.\n]*)/i, /^(en este caso[^.\n]*)/i,
      /^(procedamos[^.\s-]*)/i, /^(de acuerdo[^.\n]*)/i, /^(perfecto[,.\s-]*)/i,
      /^(entonces[,.\s-]*)/i, /^(ahora[,.\s-]*)/i, /^(bien[,.\s-]*)/i,
    ];
    spanishMeta.forEach((p) => { txt = txt.replace(p, ''); });

    const lines = txt.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const englishHints = /\b(the|and|with|without|is|are|replace|suggestion|fit|based|considering|now|well|here)\b/i;
    if (englishHints.test(lines.join(' '))) return fallback;

    const encajeLine = lines.find(l => /^-\s*Encaje\s*:/i.test(l)) || lines.find(l => /^Encaje\s*:/i.test(l));
    const sugerLine  = lines.find(l => /^-\s*Sugerencia\s*:/i.test(l)) || lines.find(l => /^Sugerencia\s*:/i.test(l));

    const encaje = encajeLine ? encajeLine.replace(/^\s*-\s*/, '') : 'Encaje: Compatible con tus gustos y tiempo.';
    const suger  = sugerLine  ? sugerLine.replace(/^\s*-\s*/, '')  : 'Sugerencia: ninguna';

    return `${encaje}\n${suger}`.trim();
  }

  async recomendarReceta(req: RecommendRequestDto): Promise<{ opciones: OpcionOut[]; mensaje?: string }> {
    const cfg = this.buildConfig(req);

    // Perfil FRESCO y fusión con body
    const perfil = await this.loadPerfil(cfg.userId);
    const prefs  = this.mergePreferencias(req, perfil, cfg);

    const { recetas, mapIngs } = await this.loadRecetasYIngredientes();

    const candidatos = this.buildCandidatos(recetas, mapIngs, prefs);

    let aptos = this.filtrarAptos(candidatos);
    if (cfg.exclude.size) aptos = aptos.filter(c => !cfg.exclude.has(Number(c.receta.id_receta)));
    aptos = this.ordenar(aptos);
    if (cfg.random) aptos = this.shuffleSiRandom(aptos, cfg.seed);

    const top = aptos.slice(0, cfg.topN);
    if (!top.length) {
      return { opciones: [], mensaje: 'No se encontraron recetas que cumplan alergias/no_me_gusta/tiempo/kcal.' };
    }
   
    const opcionesBase = this.mapOpcionOut(top);

    if (!cfg.useLlm) return { opciones: opcionesBase };

    const opcionesConIA: OpcionOut[] = await Promise.all(
      opcionesBase.map(async (op) => {
        const prompt = this.buildPromptReceta(op, prefs);
        try {
          const raw = await this.askOllama(prompt);
          const limpio = this.sanitizeLlmAnswer(raw);
          return { ...op, ia_explicacion: limpio };
        } catch (e) {
          this.logger.warn(`Ollama no respondió: ${(e as Error).message}`);
          return { ...op, ia_explicacion: null };
        }
      })
    );

    return { opciones: opcionesConIA };
  }

  private buildConfig(req: RecommendRequestDto): Cfg {
    return {
      userId: isValidUuid(req.userId) ? req.userId! : undefined,
      kcal: req.kcal_diarias ?? 2000,
      tiempoMax: req.tiempo_max ?? 30,
      useLlm: req.use_llm ?? true,
      topN: Math.max(1, Math.min(req.top_n ?? 2, 10)),
      exclude: new Set((req.exclude_ids ?? []).map(Number)),
      random: !!req.random,
      seed: typeof req.seed === 'number' ? req.seed : Date.now(),
    };
  }

  private async loadPerfil(userId?: string) {
    if (!userId) return null;
    try {
      const perfil = await this.supabase.getUserDetailsFresh(userId);
      //this.logger.debug(`Perfil fresco → ${JSON.stringify(perfil)}`);
      return perfil;
    } catch {
      return null;
    }
  }

  private mergePreferencias(req: RecommendRequestDto, perfil: any, cfg: Cfg): Prefs {
    const pfAlergias  = this.splitCsv(perfil?.alergias);
    const pfNoMeGusta = this.splitCsv((perfil as any)?.no_me_gusta);
    const pfGustos    = this.splitCsv(perfil?.gustos);
    const pfKcal      = typeof perfil?.objetivo_calorico === 'number' ? perfil.objetivo_calorico : undefined;

    const bodyAlergias  = this.uniqNorm(req.alergias ?? []);
    const bodyNoMeGusta = this.uniqNorm(req.no_me_gusta ?? []);
    const bodyGustos    = this.uniqNorm(req.gustos ?? []);

    const alergias  = this.uniqNorm([...pfAlergias, ...bodyAlergias]);
    const noMeGusta = this.uniqNorm([...pfNoMeGusta, ...bodyNoMeGusta]);
    const gustos    = this.uniqNorm([...pfGustos, ...bodyGustos]);

    const kcal = (typeof req.kcal_diarias === 'number' && !Number.isNaN(req.kcal_diarias))
      ? req.kcal_diarias!
      : (pfKcal ?? cfg.kcal);

    //this.logger.debug(`Prefs usadas → alergias=[${alergias.join('|')}], noMeGusta=[${noMeGusta.join('|')}], gustos=[${gustos.join('|')}], kcal=${kcal}, tMax=${cfg.tiempoMax}`);
    return { alergias, noMeGusta, gustos, kcal, tiempoMax: cfg.tiempoMax };
  }

  private async loadRecetasYIngredientes() {
    const recetas = await this.supabase.listRecetas(200);
    const ids = recetas.map((r: any) => r.id_receta);
    const mapIngs = await this.supabase.getIngredientesPorRecetas(ids);
    return { recetas, mapIngs };
  }

  private buildCandidatos(recetas: any[], mapIngs: Map<number, any[]>, prefs: Prefs): Cand[] {
    const norm = (s: string) => this.normalize(s);

    const toTexto = (r: any, ings: any[], extraNames: string[]) => {
      const base = [r.nombre, r.descripcion, r.instrucciones, r.categoria].filter(Boolean).join(' ');
      const li1 = (ings ?? []).map((i: any) => i?.nombre).filter(Boolean).join(' ');
      const li2 = (extraNames ?? []).join(' ');
      return this.normalize(`${base} ${li1} ${li2}`);
    };

    return recetas.map((r: any) => {
      const relIngs = mapIngs.get(r.id_receta) ?? [];

      const jsonIngsRaw: string[] = Array.isArray(r.ingredientes) ? r.ingredientes : [];
      const jsonIngs = jsonIngsRaw
        .map((n) => (typeof n === 'string' ? n : ''))
        .filter(Boolean);

      const nombresTabla = new Set(relIngs.map((i: any) => norm(i?.nombre || '')));
      const jsonOnly = jsonIngs
        .filter((n) => !nombresTabla.has(norm(n)))
        .map((n) => ({
          id_ingrediente: 0,
          nombre: n,
          unidad: null,
          cantidad: null,
          calorias: null,
          proteinas: null,
          carbohidratos: null,
          grasas: null,
        }));

      const ingsCombinados = [...relIngs, ...jsonOnly];

      const texto = toTexto(r, ingsCombinados, jsonIngs);
      const { motivos, score } = this.scoreReceta(r, texto, prefs);

      return { receta: r, ingredientes: ingsCombinados, texto, motivos, score };
    });
  }

  private scoreReceta(r: any, texto: string, prefs: Prefs) {
    const motivos: string[] = [];
    let score = 0;

    const hit = (arr: string[]) => arr.find(x => x && texto.includes(x));
    const aler = hit(prefs.alergias);
    const nog  = hit(prefs.noMeGusta);

    if (aler) motivos.push(`Contiene alérgeno: ${aler}`);
    if (nog)  motivos.push(`Incluye ingrediente no deseado: ${nog}`);

    const tiempo = r.tiempo_preparacion ?? null;
    const kcal   = r.calorias_totales ?? null;

    if (tiempo && tiempo > prefs.tiempoMax) motivos.push(`Supera el tiempo máximo (${prefs.tiempoMax} min)`);
    if (kcal && kcal > prefs.kcal * 0.6)     motivos.push(`Calorías altas vs objetivo (${prefs.kcal} kcal/día)`);

    const gustoHits = prefs.gustos.filter(g => g && texto.includes(g)).length;
    score += gustoHits * 2;

    if (tiempo && tiempo <= prefs.tiempoMax) score += 1;
    if (kcal && kcal <= prefs.kcal * 0.6)    score += 1;

    if (aler || nog) score -= 1000; 
    return { motivos, score };
  }

  private filtrarAptos(cands: Cand[]) {
    return cands.filter(c => c.score > -1000);
  }

  private ordenar(arr: Cand[]) {
    return [...arr].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const at = a.receta.tiempo_preparacion ?? 999;
      const bt = b.receta.tiempo_preparacion ?? 999;
      if (at !== bt) return at - bt;
      return Number(b.receta.id_receta) - Number(a.receta.id_receta);
    });
  }

  private shuffleSiRandom(arr: Cand[], seed: number) {
    const out = [...arr];
    const rng = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  private mapOpcionOut(top: Cand[]): OpcionOut[] {
    return top.map((t) => {
      let ingredientes: IngredienteOut[] = (t.ingredientes ?? []).map((i: any) => ({
        id_ingrediente: Number(i.id_ingrediente ?? 0),
        nombre: String(i.nombre ?? '').trim(),
        unidad: i.unidad ?? null,
        cantidad: i.cantidad ?? null,
        calorias: i.calorias ?? null,
        proteinas: i.proteinas ?? null,
        carbohidratos: i.carbohidratos ?? null,
        grasas: i.grasas ?? null,
      })).filter(i => i.nombre);

      if (!ingredientes.length && Array.isArray(t.receta?.ingredientes)) {
        ingredientes = (t.receta.ingredientes as any[])
          .map((n) => (typeof n === 'string' ? n : ''))
          .filter(Boolean)
          .map((n) => ({
            id_ingrediente: 0,
            nombre: n,
            unidad: null,
            cantidad: null,
            calorias: null,
            proteinas: null,
            carbohidratos: null,
            grasas: null,
          }));
      }

      return {
        id_receta: Number(t.receta.id_receta),
        titulo: String(t.receta.nombre),
        descripcion: t.receta.descripcion ?? null,
        categoria: t.receta.categoria ?? null,
        tiempo_preparacion: t.receta.tiempo_preparacion ?? null,
        kcal_totales: t.receta.calorias_totales ?? null,
        pasos: (t.receta.instrucciones || '').split('\n').filter(Boolean),
        imagen_url: t.receta.imagen_url ?? null,
        ingredientes,
        motivos: Array.isArray(t.motivos) ? t.motivos : [],
      };
    });
  }

  private buildPromptReceta(op: OpcionOut, prefs: Prefs): string {
    const { alergias, noMeGusta, gustos, kcal, tiempoMax } = prefs;
    return `
Eres NutriChef IA. RESPONDE EXCLUSIVAMENTE en ESPAÑOL con un tono cálido y profesional.
Responde SOLO con este formato exacto (máximo 4 líneas). Prohibido razonamientos ocultos, texto meta e inglés.

- Encaje: Indica en 1–2 líneas si la receta encaja con el perfil, mencionando explícitamente tiempo (≤ ${tiempoMax} min), objetivo calórico (≈ ${kcal} kcal/día) y que respeta alergias/no me gusta.
- Sugerencia: Si hay un detalle menor a ajustar, propone UNA sustitución “X por Y”. Si no hace falta, escribe “ninguna”.

Perfil del usuario:
- Alergias: ${alergias.join(', ') || 'ninguna'}
- No me gusta: ${noMeGusta.join(', ') || 'ninguno'}
- Gustos: ${gustos.join(', ') || 'no especificados'}
- Objetivo kcal/día: ${kcal}
- Tiempo máx (min): ${tiempoMax}

Receta: ${op.titulo}
Ingredientes:
${op.ingredientes.map((i) => `- ${i.nombre}${i.cantidad ? `: ${i.cantidad} ${i.unidad ?? ''}` : ''}`).join('\n')}

Comienza DIRECTAMENTE con "- Encaje:" y luego "- Sugerencia:".
`.trim();
  }

  private normalize(s?: string): string {
    return (s ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private uniqNorm(arr: (string | undefined | null)[]): string[] {
    const s = new Set<string>();
    for (const x of arr) {
      if (!x) continue;
      const n = this.normalize(String(x));
      if (n) s.add(n);
    }
    return [...s];
  }

  private splitCsv(t?: string | null): string[] {
    return (t ?? '')
      .split(',')
      .map(x => this.normalize(x))
      .filter(Boolean);
  }
}
