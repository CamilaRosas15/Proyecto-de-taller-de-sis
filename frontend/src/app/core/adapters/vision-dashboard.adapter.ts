export interface FoodItemDetection {
  name: string;
  confidenceText?: string;
  portionText?: string;
  estimatedGrams?: number;
  extra?: string[];
  // Macros por ítem (si se logran extraer de la sección nutricional)
  calories?: number;
  proteinGrams?: number;
  carbsGrams?: number;
  fatGrams?: number;
}

export interface MacroTotals {
  calories: number;
  proteinGrams?: number;
  carbsGrams?: number;
  fatGrams?: number;
}

export interface FoodDashboardData {
  summary: {
    quickSummary?: string;
    mealType?: string;
    healthScore?: number;
    totalCaloriesEst?: string;
  };
  kpis: { label: string; value: string | number }[];
  items: FoodItemDetection[];
  nutrition: { label: string; value: string }[];
  recommendations: string[];
  aggregates?: MacroTotals;
  analysis?: string;
  raw: string;
}

function parseNumberFromText(text: string): number | undefined {
  const match = text.match(/([0-9]+(?:\.[0-9]+)?)/);
  return match ? Number(match[1]) : undefined;
}

function parseEstimatedGrams(text?: string): number | undefined {
  if (!text) return undefined;
  const gramsMatch = text.match(/([0-9]+(?:\.[0-9]+)?)\s*g(ramos)?/i);
  if (gramsMatch) return Number(gramsMatch[1]);
  const mlMatch = text.match(/([0-9]+(?:\.[0-9]+)?)\s*ml/i);
  if (mlMatch) return Number(mlMatch[1]);
  return undefined;
}

function normalizeTextForMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar acentos
    .replace(/\([^\)]*\)/g, '') // quitar paréntesis y contenido
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function adaptFriendlyTextToFoodDashboard(text: string): FoodDashboardData {
  console.log('Procesando texto:', text);
  
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const items: FoodItemDetection[] = [];
  const recommendations: string[] = [];
  const nutrition: { label: string; value: string }[] = [];
  const totals: MacroTotals = { calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0 };
  let analysisParagraphs: string[] = [];

  let currentItem: FoodItemDetection | null = null;
  let i = 0;
  let inTotalsSection = false;

  while (i < lines.length) {
    const line = lines[i];
    console.log(`Procesando línea ${i}: "${line}"`);
    
    // Detectar nombres de alimentos con patrones mejorados
    const foodPatterns = [
      /^(.+?)\s+\((\d+(?:\.\d+)?)\s*g\):\s*$/,     // "Carne seca deshebrada (100 g):"
      /^(.+?)\s+\((.+?)\):\s*$/,                    // "Huevos (2 pieza):"
      /^(.+?)\s+\((\d+(?:\.\d+)?)\s*pieza\):\s*$/, // "Papas cocidas (2 pieza):"
      /^(.+?):\s*$/                                 // "Nombre del alimento:"
    ];

    let foodMatch = null;
    let estimatedGrams = null;
    
    for (const pattern of foodPatterns) {
      foodMatch = line.match(pattern);
      if (foodMatch) {
        const weightText = foodMatch[2];
        if (weightText && /\d+/.test(weightText)) {
          // Si es solo números, asumir que son gramos
          const numMatch = weightText.match(/(\d+(?:\.\d+)?)/);
          estimatedGrams = numMatch ? parseFloat(numMatch[1]) : null;
          
          // Si dice "pieza", convertir a estimación de gramos
          if (weightText.includes('pieza')) {
            const count = estimatedGrams || 1;
            // Estimaciones básicas por pieza
            const foodName = foodMatch[1].toLowerCase();
            if (foodName.includes('huevo')) {
              estimatedGrams = count * 50; // ~50g por huevo
            } else if (foodName.includes('papa')) {
              estimatedGrams = count * 150; // ~150g por papa mediana
            } else {
              estimatedGrams = count * 100; // estimación general
            }
          }
        }
        break;
      }
    }

    if (foodMatch) {
      if (currentItem) {
        items.push(currentItem);
      }
      
      currentItem = {
        name: foodMatch[1].trim(),
        estimatedGrams: estimatedGrams || undefined,
        extra: []
      };
      console.log('Nuevo alimento detectado:', currentItem);
      i++;
      continue;
    }

    // Detectar información nutricional individual (formato exacto de la imagen)
    const nutritionPatterns = [
      /^Calories:\s*(\d+(?:\.\d+)?)$/,
      /^Protein:\s*(\d+(?:\.\d+)?)g?$/,
      /^Carbs:\s*(\d+(?:\.\d+)?)g?$/,
      /^Fat:\s*(\d+(?:\.\d+)?)g?$/
    ];

    let nutritionMatch = null;
    for (const pattern of nutritionPatterns) {
      nutritionMatch = line.match(pattern);
      if (nutritionMatch) break;
    }

    if (nutritionMatch && currentItem) {
      const value = parseFloat(nutritionMatch[1]);
      const lowerLine = line.toLowerCase();
      
      if (lowerLine.startsWith('calories')) {
        currentItem.calories = value;
      } else if (lowerLine.startsWith('protein')) {
        currentItem.proteinGrams = value;
      } else if (lowerLine.startsWith('carbs')) {
        currentItem.carbsGrams = value;
      } else if (lowerLine.startsWith('fat')) {
        currentItem.fatGrams = value;
      }
      
      console.log('Información nutricional añadida:', line, value);
      i++;
      continue;
    }

    // Detectar sección de totales (formato exacto)
    if (line.match(/^(Calorías|Carbos|Proteína|Grasa)$/)) {
      if (currentItem) {
        items.push(currentItem);
        currentItem = null;
      }
      
      inTotalsSection = true;
      const label = line;
      
      // Buscar valor en las siguientes líneas
      if (i + 1 < lines.length) {
        const valueLine = lines[i + 1];
        const valueMatch = valueLine.match(/^(\d+(?:\.\d+)?)g?$/);
        
        if (valueMatch) {
          const numValue = parseFloat(valueMatch[1]);
          
          switch (label) {
            case 'Calorías':
              totals.calories = numValue;
              break;
            case 'Carbos':
              totals.carbsGrams = numValue;
              break;
            case 'Proteína':
              totals.proteinGrams = numValue;
              break;
            case 'Grasa':
              totals.fatGrams = numValue;
              break;
          }
          
          console.log('Total detectado:', label, numValue);
          i += 2; // Saltar línea del valor
          
          // Saltar porcentaje si existe
          if (i < lines.length && lines[i].match(/^\d+%$/)) {
            i++;
          }
          continue;
        }
      }
    }

    // Líneas de información adicional del alimento actual
    if (currentItem && !inTotalsSection) {
      const infoPatterns = [
        /^Qué es:/,
        /^Seguridad:/,
        /^Tamaño de la porción:/,
        /^Peso estimado:/
      ];
      
      for (const pattern of infoPatterns) {
        if (pattern.test(line)) {
          currentItem.extra = currentItem.extra || [];
          currentItem.extra.push(line);
          break;
        }
      }
    }

    i++;
  }

  // Agregar el último alimento si existe
  if (currentItem) {
    items.push(currentItem);
  }

  console.log('Alimentos procesados:', items);
  console.log('Totales procesados:', totals);

  // Si no se detectaron totales pero sí alimentos, calcular totales
  if (items.length > 0 && totals.calories === 0) {
    totals.calories = items.reduce((sum, item) => sum + (item.calories || 0), 0);
    totals.proteinGrams = items.reduce((sum, item) => sum + (item.proteinGrams || 0), 0);
    totals.carbsGrams = items.reduce((sum, item) => sum + (item.carbsGrams || 0), 0);
    totals.fatGrams = items.reduce((sum, item) => sum + (item.fatGrams || 0), 0);
    
    console.log('Totales calculados a partir de items:', totals);
  }

  // KPIs básicos
  const kpis: { label: string; value: string | number }[] = [];
  if (items.length) kpis.push({ label: 'Alimentos detectados', value: items.length });
  if (totals.calories > 0) kpis.push({ label: 'Calorías totales', value: Math.round(totals.calories) });

  const result = {
    summary: {
      quickSummary: undefined,
      mealType: undefined,
      healthScore: undefined,
      totalCaloriesEst: undefined
    },
    kpis,
    items,
    nutrition,
    recommendations,
    aggregates: (totals.calories > 0 || (totals.proteinGrams || 0) > 0 || (totals.carbsGrams || 0) > 0 || (totals.fatGrams || 0) > 0) ? totals : undefined,
    analysis: analysisParagraphs.length ? analysisParagraphs.join('\n\n') : undefined,
    raw: text
  };

  console.log('Resultado final del adaptador:', result);
  return result;
}


