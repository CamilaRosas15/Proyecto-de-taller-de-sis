import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface DetectedFoodVM {
  food_name: string;
  confidence: number;
  portion_label?: string;
  estimated_quantity: number; // grams
  nutrition_estimate: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
  };
}

export interface ImageAnalysis {
  detected_foods: DetectedFoodVM[];
  overall_confidence: number; // 0..1
  processing_time?: number;
  suggestions: string[];
  estimated_totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
  };
}

@Injectable({ providedIn: 'root' })
export class ImageAnalysisService {
  private last: ImageAnalysis | null = null;
  private readonly API_BASE = 'https://proyecto-de-taller-de-sis-6xbp.onrender.com/api/v1/ai';

  constructor(private http: HttpClient) {}

  getLastAnalysis(): ImageAnalysis | null {
    return this.last;
  }

  async analyzeImageStructured(file: File): Promise<ImageAnalysis> {
    // Prefer structured endpoint; fallback to parsing natural text if needed
    const form = new FormData();
    form.append('file', file, file.name);

    // Try /test-detection which returns JSON with detection_result
    const raw: any = await this.http
      .post(`${this.API_BASE}/test-detection`, form)
      .toPromise()
      .catch(() => null);

    let analysis: ImageAnalysis | null = null;

    if (raw && raw.detection_result) {
      const det = raw.detection_result;
      if (det.analysis_type === 'natural_language' && typeof det.gemini_analysis === 'string') {
        analysis = this.parseNaturalText(det.gemini_analysis);
      } else if (Array.isArray(det.detections)) {
        analysis = this.mapDetections(det);
      }
    }

    if (!analysis) {
      // Best-effort empty structure to avoid UI crash
      analysis = {
        detected_foods: [],
        overall_confidence: 0,
        suggestions: [],
        estimated_totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      };
    }

    this.last = analysis;
    return analysis;
  }

  private mapDetections(det: any): ImageAnalysis {
    const foods: DetectedFoodVM[] = (det.detections || []).map((f: any) => ({
      food_name: (f.class || 'Alimento').replace(/_/g, ' '),
      confidence: f.confidence ?? 0,
      portion_label: this.estimatePortionLabel(f.estimated_weight),
      estimated_quantity: f.estimated_weight ?? 0,
      nutrition_estimate: {
        calories: f.nutrition?.calories ?? 0,
        protein: f.nutrition?.protein ?? 0,
        carbs: f.nutrition?.carbs ?? 0,
        fat: f.nutrition?.fat ?? 0,
        fiber: f.nutrition?.fiber ?? 0,
        sugar: f.nutrition?.sugar ?? 0,
        sodium: f.nutrition?.sodium ?? 0,
      },
    }));

    const totals = foods.reduce(
      (acc, f) => {
        acc.calories += f.nutrition_estimate.calories;
        acc.protein += f.nutrition_estimate.protein;
        acc.carbs += f.nutrition_estimate.carbs;
        acc.fat += f.nutrition_estimate.fat;
        if (f.nutrition_estimate.fiber) acc.fiber = (acc.fiber || 0) + f.nutrition_estimate.fiber;
        if (f.nutrition_estimate.sugar) acc.sugar = (acc.sugar || 0) + f.nutrition_estimate.sugar;
        if (f.nutrition_estimate.sodium) acc.sodium = (acc.sodium || 0) + f.nutrition_estimate.sodium;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 } as any
    );

    const avgConf = foods.length
      ? foods.reduce((s, f) => s + (f.confidence || 0), 0) / foods.length
      : 0;

    return {
      detected_foods: foods,
      overall_confidence: avgConf,
      processing_time: this.parseProcessingTime(det.processing_time),
      suggestions: det.meal_analysis?.recommendations || [],
      estimated_totals: totals,
    };
  }

  private parseNaturalText(text: string): ImageAnalysis {
    // Heuristic parser for the Spanish natural response we request from Gemini
    // Look for the "Alimentos detectados" section and extract name, portion, grams and confidence words
    const lines = text
      .replace(/\r/g, '')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length);

    const foods: DetectedFoodVM[] = [];
    let current: Partial<DetectedFoodVM> | null = null;

    const pushCurrent = () => {
      if (current && current.food_name) {
        foods.push({
          food_name: current.food_name!,
          confidence: current.confidence ?? this.confidenceFromLabel(current.portion_label || ''),
          portion_label: current.portion_label,
          estimated_quantity: current.estimated_quantity ?? 0,
          nutrition_estimate: current.nutrition_estimate || {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
          },
        });
      }
      current = null;
    };

    for (const line of lines) {
      // Item title like "🍗 Pechuga de pollo" or "- Nombre"
      const mTitle = line.match(/^(?:[-*•]\s*)?(?:[\p{Emoji}_A-Za-z0-9]+\s*)?\*\*?([^*]+?)\*\*?/u);
      if (mTitle && !line.toLowerCase().includes('qué estoy viendo') && !line.startsWith('**📊') && !line.startsWith('**💡')) {
        pushCurrent();
        current = { food_name: mTitle[1].trim() };
        continue;
      }

      if (!current) continue;

      // Portion
      const mPortion = line.match(/porci[oó]n:\s*([a-záéíóúñ ]+)/i);
      if (mPortion) current.portion_label = mPortion[1].trim();

      // Grams
      const mGrams = line.match(/(peso\s+estimado|gramos):\s*~?(\d+)\s*g/i);
      if (mGrams) current.estimated_quantity = parseFloat(mGrams[2]);

      // Confidence words
      const conf = this.extractConfidence(line);
      if (conf !== null) current.confidence = conf;

      // Macro numeric hints (rare in natural section)
      const kcal = line.match(/(\d+)\s*kcal/i);
      if (kcal) {
        current.nutrition_estimate = current.nutrition_estimate || {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        };
        current.nutrition_estimate.calories = parseFloat(kcal[1]);
      }
    }
    pushCurrent();

    // Totals best-effort
    const totals = foods.reduce(
      (acc, f) => {
        acc.calories += f.nutrition_estimate.calories || 0;
        acc.protein += f.nutrition_estimate.protein || 0;
        acc.carbs += f.nutrition_estimate.carbs || 0;
        acc.fat += f.nutrition_estimate.fat || 0;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const avgConf = foods.length
      ? foods.reduce((s, f) => s + (f.confidence || 0), 0) / foods.length
      : 0;

    // Extract suggestions section
    const suggestions = text
      .split('**💡')
      .slice(1)
      .join('**💡')
      .split(/\n[-•]\s*/)
      .slice(1, 4)
      .map((s) => s.replace(/\*\*.*?\*\*:?\s*/g, '').trim())
      .filter(Boolean);

    return {
      detected_foods: foods,
      overall_confidence: avgConf,
      suggestions,
      estimated_totals: totals,
    };
  }

  private estimatePortionLabel(grams?: number): string | undefined {
    if (!grams && grams !== 0) return undefined;
    if (grams >= 150) return 'Porción grande';
    if (grams >= 90) return 'Porción mediana';
    if (grams > 0) return 'Porción pequeña';
    return undefined;
  }

  private extractConfidence(line: string): number | null {
    const l = line.toLowerCase();
    if (l.includes('muy seguro')) return 0.9;
    if (l.includes('bastante seguro')) return 0.75;
    if (l.includes('posible') || l.includes('posiblemente')) return 0.5;
    return null;
  }

  private confidenceFromLabel(_label: string): number {
    const l = _label.toLowerCase();
    if (l.includes('muy')) return 0.9;
    if (l.includes('bastante')) return 0.75;
    return 0.6;
  }

  private parseProcessingTime(val: any): number | undefined {
    if (!val) return undefined;
    if (typeof val === 'number') return val;
    const m = String(val).match(/([0-9]+(?:\.[0-9]+)?)s/);
    return m ? parseFloat(m[1]) : undefined;
  }
}
