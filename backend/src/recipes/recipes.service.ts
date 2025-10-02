import { Injectable, InternalServerErrorException } from '@nestjs/common';
import Ajv from 'ajv';

// Puedes sobreescribir por .env
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'qwen3:4b';

/**
 * Schema de salida esperado para la receta.
 * IMPORTANTE: tiene "default" en campos clave y AJV está configurado con useDefaults:true,
 * así, si el modelo omite algún valor requerido, se completa con defaults.
 */
const schema = {
  type: 'object',
  required: ['titulo', 'ingredientes', 'pasos', 'macros', 'kcal_totales', 'motivos'],
  properties: {
    titulo: { type: 'string', default: 'Receta' },
    ingredientes: {
      type: 'array',
      default: [],
      items: {
        type: 'object',
        required: ['nombre', 'cantidad', 'unidad'],
        properties: {
          nombre:   { type: 'string', default: 'ingrediente' },
          cantidad: { type: 'number', default: 1 },
          unidad:   { type: 'string', default: 'unidad' }
        }
      }
    },
    pasos: { type: 'array', items: { type: 'string' }, default: [] },
    kcal_totales: { type: 'number', default: 0 },
    macros: {
      type: 'object',
      required: ['proteinas', 'carbohidratos', 'grasas'],
      default: { proteinas: 0, carbohidratos: 0, grasas: 0 },
      properties: {
        proteinas:     { type: 'number', default: 0 },
        carbohidratos: { type: 'number', default: 0 },
        grasas:        { type: 'number', default: 0 }
      }
    },
    motivos: { type: 'array', items: { type: 'string' }, default: [] }
  }
};

@Injectable()
export class RecipesService {
  // AJV con defaults y todos los errores
  private ajv = new Ajv({ useDefaults: true, allErrors: true });
  private validator = this.ajv.compile(schema);

  // ---- MOCK: luego reemplazas por SELECT a Supabase (filtrando alergias/no_me_gusta) ----
  private async obtenerCandidatosMock() {
    return [
      {
        nombre: 'Ensalada de pollo',
        descripcion: 'Pollo, vegetales frescos y aderezo ligero',
        ingredientes_txt: 'pechuga de pollo, lechuga, tomate, pepino, aceite de oliva, sal'
      },
      {
        nombre: 'Pasta con tomate',
        descripcion: 'Pasta al dente con salsa de tomate casera',
        ingredientes_txt: 'pasta, tomate, ajo, aceite de oliva, albahaca, sal'
      }
    ];
  }

  // Construye prompt con perfil, contexto y SCHEMA
  private construirPrompt(perfil: any, candidatos: any[]) {
    const schemaStr = JSON.stringify(schema);
    const objetivoPlato = Math.round(((perfil?.kcal_diarias ?? 2000) / 3));

    return `
Eres NutriChefAI. Responde EXCLUSIVAMENTE en JSON válido.
REGLAS:
1) PROHIBIDO usar ingredientes presentes en "alergias" o "no_me_gusta".
2) kcal del plato objetivo ≈ ${objetivoPlato} ± 10%.
3) Usa SOLO el contexto de candidatos. Si no alcanza, devuelve {"motivo":"no_encontrado"}.
4) "ingredientes" DEBE ser un array de OBJETOS con { "nombre": string, "cantidad": number, "unidad": string } (NUNCA strings).
5) Cumple EXACTAMENTE este SCHEMA: ${schemaStr}
6) En "motivos", menciona textualmente las listas recibidas:
   Alergias = ${perfil?.alergias?.join(', ') || 'ninguna'},
   No me gusta = ${perfil?.no_me_gusta?.join(', ') || 'ninguno'}.

EJEMPLO ESTRICTO de "ingredientes":
"ingredientes": [
  {"nombre":"pechuga de pollo","cantidad":150,"unidad":"g"},
  {"nombre":"aceite de oliva","cantidad":1,"unidad":"cda"}
]

Perfil:
- Alergias: ${Array.isArray(perfil?.alergias) ? perfil.alergias.join(', ') : 'ninguna'}
- No me gusta: ${Array.isArray(perfil?.no_me_gusta) ? perfil.no_me_gusta.join(', ') : 'ninguno'}
- Gustos: ${Array.isArray(perfil?.gustos) ? perfil.gustos.join(', ') : 'no especificado'}
- Tiempo máximo: ${perfil?.tiempo_max ?? 'no especificado'}

Contexto de recetas candidatas:
${candidatos.map((r, i) => `[${i + 1}] ${r.nombre} – ${r.descripcion}
Ingredientes: ${r.ingredientes_txt}`).join('\n\n')}

Solicitud:
Devuelve UNA receta óptima (formato JSON válido) con campos del SCHEMA y "motivos".
`.trim();
  }

  /**
   * Llama a Ollama /api/generate leyendo el stream.
   * Acumula evt.response hasta evt.done === true.
   * Con format:"json" la salida completa debe ser JSON parseable.
   */
  private async callOllamaGenerate(prompt: string, model = OLLAMA_MODEL) {
    const resp = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        format: 'json',                 // fuerza JSON
        options: { temperature: 0.0, num_ctx: 4096 } // baja temperatura = JSON estable
      })
    });

    if (!resp.body) {
      throw new InternalServerErrorException('Respuesta vacía de Ollama');
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let acc = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        let evt: any;
        try { evt = JSON.parse(trimmed); } catch { continue; }
        if (typeof evt.response === 'string') acc += evt.response;
        if (evt.done === true) {
          try {
            return JSON.parse(acc);
          } catch {
            throw new InternalServerErrorException('El modelo no devolvió JSON válido.');
          }
        }
      }
    }

    throw new InternalServerErrorException('Stream de Ollama finalizó sin done:true');
  }

  // Normaliza ingredientes (strings u objetos incompletos) y completa defaults "duros"
  private normalizarIngredientes(json: any) {
    if (!json || !Array.isArray(json.ingredientes)) return json;

    json.ingredientes = json.ingredientes.map((it: any) => {
      if (!it) return { nombre: 'ingrediente', cantidad: 1, unidad: 'unidad' };
      if (typeof it === 'string') {
        return { nombre: it, cantidad: 1, unidad: 'unidad' };
      }
      const nombre   = typeof it.nombre   === 'string' ? it.nombre   : 'ingrediente';
      const cantidad = typeof it.cantidad === 'number' ? it.cantidad : 1;
      const unidad   = typeof it.unidad   === 'string' ? it.unidad   : 'unidad';
      return { nombre, cantidad, unidad };
    });

    // “defaults duros” por seguridad adicional
    if (typeof json?.kcal_totales !== 'number') json.kcal_totales = 0;
    if (!json?.macros) json.macros = { proteinas: 0, carbohidratos: 0, grasas: 0 };
    ['proteinas', 'carbohidratos', 'grasas'].forEach(k => {
      if (typeof json.macros[k] !== 'number') json.macros[k] = 0;
    });
    if (!Array.isArray(json.pasos)) json.pasos = [];
    if (!Array.isArray(json.motivos)) json.motivos = [];
    if (typeof json.titulo !== 'string') json.titulo = 'Receta';

    return json;
  }

  // Valida contra el schema (con Ajv useDefaults)
  private validarSalida(json: any) {
    const ok = this.validator(json);
    if (!ok) {
      const errs = (this.validator.errors ?? [])
        .map((e: any) => `${e.instancePath ?? e.dataPath ?? ''} ${e.message}`)
        .join('; ');
      throw new InternalServerErrorException(`JSON inválido según schema: ${errs}`);
    }
    return true;
  }

  // Chequeo de alérgenos
  private verificarAlergias(json: any, alergias: string[] = []) {
    const ing: string[] = (json?.ingredientes ?? []).map((x: any) => `${x?.nombre}`.toLowerCase());
    const choque = (alergias ?? [])
      .map(a => a.toLowerCase())
      .filter(a => ing.some(i => i.includes(a)));
    if (choque.length > 0) {
      throw new InternalServerErrorException(`La receta propuesta contiene alérgenos: ${choque.join(', ')}`);
    }
  }

  // Endpoint principal llamado por el controller
  async recomendarReceta(perfil: any) {
    const candidatos = await this.obtenerCandidatosMock();
    const prompt = this.construirPrompt(perfil, candidatos);

    let json = await this.callOllamaGenerate(prompt);
    json = this.normalizarIngredientes(json);  // normaliza ANTES de validar
    this.validarSalida(json);
    this.verificarAlergias(json, perfil?.alergias ?? []);
    return json;
  }
}
