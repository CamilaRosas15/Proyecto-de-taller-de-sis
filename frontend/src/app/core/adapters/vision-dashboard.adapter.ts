export interface FoodItemDetection {
  name: string;
  confidenceText?: string;
  portionText?: string;
  estimatedGrams?: number;
  extra?: string[];
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

export function adaptFriendlyTextToFoodDashboard(text: string): FoodDashboardData {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const items: FoodItemDetection[] = [];
  const recommendations: string[] = [];
  const nutrition: { label: string; value: string }[] = [];
  const totals: MacroTotals = { calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0 };

  let section: 'seeing' | 'items' | 'nutrition' | 'analysis' | 'reco' | 'summary' | undefined;
  for (const line of lines) {
    if (/\*\*.*Qué estoy viendo\?\*\*/i.test(line)) { section = 'seeing'; continue; }
    if (/\*\*.*Alimentos detectados\:*\*\*/i.test(line)) { section = 'items'; continue; }
    if (/\*\*.*Información nutricional\:*\*\*/i.test(line)) { section = 'nutrition'; continue; }
    if (/\*\*.*Análisis de la comida\:*\*\*/i.test(line)) { section = 'analysis'; continue; }
    if (/\*\*.*Recomendaciones\:*\*\*/i.test(line)) { section = 'reco'; continue; }
    if (/\*\*.*Resumen rápido\:*\*\*/i.test(line)) { section = 'summary'; continue; }

    if (section === 'items') {
      const labelJoiners = ['Qué es', 'Seguridad', 'Tamaño', 'Peso estimado'];
      if (line.startsWith('*')) {
        const noAst = line.replace(/^\*\s*/, '');
        const nameMatch = noAst.match(/^\*?\*?([^:]+):?/i) || noAst.match(/^([^:]+):/);
        const name = (nameMatch ? nameMatch[1] : noAst).replace(/\*\*/g, '').trim();
        const confidenceTextMatch = noAst.match(/(Muy seguro|Bastante seguro|Posiblemente|Poco seguro)/i);
        const portionMatch = noAst.match(/(\b(?:porci[oó]n|vaso|taza|cucharada|gramos|ml|g)\b[^.,]*)/i);
        const estimatedGrams = parseEstimatedGrams(noAst);
        items.push({
          name,
          confidenceText: confidenceTextMatch?.[1],
          portionText: portionMatch?.[1],
          estimatedGrams,
          extra: []
        });
        continue;
      }
      // Unbulleted lines: treat as attributes for the last item when matching known labels
      const last = items[items.length - 1];
      if (last) {
        const labeled = labelJoiners.find(lbl => new RegExp(`^${lbl}`, 'i').test(line));
        const hasConfidenceWord = /(Muy seguro|Bastante seguro|Posiblemente|Poco seguro)/i.test(line);
        const hasPortionWord = /(porci[oó]n|taza|cucharada|vaso)/i.test(line);
        const hasGrams = /(\~?\d+\s*g(ramos)?|\d+\s*ml)/i.test(line);

        if (labeled || hasConfidenceWord || hasPortionWord || hasGrams) {
          // Extract meta into fields so the UI can render like the screenshot
          const confMatch = line.match(/(Muy seguro|Bastante seguro|Posiblemente|Poco seguro)/i);
          if (confMatch) last.confidenceText = confMatch[1];
          const portionMatch = line.match(/(porci[oó]n\s*(?:grande|mediana|pequeña))/i);
          if (portionMatch) last.portionText = portionMatch[1].replace(/\s+:/, '').trim();
          const grams = parseEstimatedGrams(line);
          if (grams !== undefined) last.estimatedGrams = grams;

          // Keep raw line for reference too
          last.extra = last.extra || [];
          last.extra.push(line);
          continue;
        }
      }
      // Otherwise, consider it a new item name if it's not a key-value detail
      if (!/:/.test(line)) {
        const name = line.replace(/\*\*/g, '').trim();
        if (name) {
          items.push({ name, extra: [] });
          continue;
        }
      }
    }

    if (section === 'nutrition') {
      // Acepta líneas con o sin viñetas ("*" o "-")
      const noAst = line.replace(/^([*\-])\s*/, '');
      if (!noAst) continue;
      const parts = noAst.split(':');
      const labelRaw = parts[0].replace(/\*\*/g, '').trim();
      const valueRaw = parts.slice(1).join(':').trim();
      const label = labelRaw;
      const value = valueRaw || '';
      nutrition.push({ label, value });

      // Normaliza número decimal (comas a puntos)
      const toNum = (s: string | undefined): number | undefined => {
        if (!s) return undefined;
        const n = s.replace(',', '.');
        const num = Number(n);
        return isNaN(num) ? undefined : num;
      };

      const lowerLabel = label.toLowerCase();
      const joined = `${label} ${value}`;
      const kcalNum = toNum((joined.match(/([0-9]+(?:[\.,][0-9]+)?)\s*(?:k?cal|calor[ií]as)/i) || [])[1]);
      const protNum = toNum((joined.match(/prote[ií]na[^0-9]*\(?\s*([0-9]+(?:[\.,][0-9]+)?)\s*g/i) || [])[1])
        ?? toNum((joined.match(/([0-9]+(?:[\.,][0-9]+)?)\s*g(?:r|ramos)?\b.*?(prote[ií]na|prot\b)/i) || [])[1])
        ?? toNum((value.match(/([0-9]+(?:[\.,][0-9]+)?)\s*g\b/) || [])[1]);
      const carbNum = toNum((joined.match(/carboh?idratos|hidratos|carbs?/i) ? (joined.match(/([0-9]+(?:[\.,][0-9]+)?)\s*g/i) || [])[1] : undefined))
        ?? toNum((joined.match(/([0-9]+(?:[\.,][0-9]+)?)\s*g(?:r|ramos)?\b.*?(carboh?idratos|hidratos|carbs?)/i) || [])[1]);
      const fatNum = toNum((joined.match(/grasa[s]?/i) ? (joined.match(/([0-9]+(?:[\.,][0-9]+)?)\s*g/i) || [])[1] : undefined))
        ?? toNum((joined.match(/([0-9]+(?:[\.,][0-9]+)?)\s*g(?:r|ramos)?\b.*?(grasa|grasas|fat)/i) || [])[1]);

      // Si el label indica el nutriente, acepta cualquier nº + unidad en el valor
      if (lowerLabel.includes('calor')) {
        const n = toNum((value.match(/([0-9]+(?:[\.,][0-9]+)?)/) || [])[1]);
        if (n !== undefined) totals.calories += n;
      } else if (lowerLabel.startsWith('prote')) {
        if (protNum !== undefined && totals.proteinGrams !== undefined) totals.proteinGrams += protNum;
      } else if (lowerLabel.includes('carbo')) {
        if (carbNum !== undefined && totals.carbsGrams !== undefined) totals.carbsGrams += carbNum;
      } else if (lowerLabel.startsWith('grasa')) {
        if (fatNum !== undefined && totals.fatGrams !== undefined) totals.fatGrams += fatNum;
      } else {
        // Fallback por fraseo en párrafo dentro de la sección
        if (kcalNum !== undefined) totals.calories += kcalNum;
        if (protNum !== undefined && totals.proteinGrams !== undefined) totals.proteinGrams += protNum;
        if (carbNum !== undefined && totals.carbsGrams !== undefined) totals.carbsGrams += carbNum;
        if (fatNum !== undefined && totals.fatGrams !== undefined) totals.fatGrams += fatNum;
      }
      continue;
    }

    if (section === 'reco' && line.startsWith('*')) {
      const noAst = line.replace(/^\*\s*/, '');
      const clean = noAst.replace(/\*\*/g, '').trim();
      const tip = clean.replace(/^(Aspectos positivos:|Qu[eé] se podr[ií]a mejorar:|Sugerencias para complementar:)\s*/i, '');
      recommendations.push(tip);
      continue;
    }
  }

  // KPIs
  // Calorías totales estimadas si existe
  const totalCalsLine = lines.find(l => /Calor[ií]as totales estimadas/i.test(l));
  const totalCaloriesEst = totalCalsLine ? (totalCalsLine.match(/\*\*.*\*\*\s*([^\n]+)/)?.[1] || totalCalsLine) : undefined;

  // Puntuación de salud
  const healthScoreLine = lines.find(l => /Puntuaci[oó]n de salud/i.test(l));
  const healthScore = healthScoreLine ? parseNumberFromText(healthScoreLine) : undefined;

  // Meal type
  const mealTypeLine = lines.find(l => /Tipo de comida/i.test(l));
  const mealType = mealTypeLine ? (mealTypeLine.split(':')[1] || '').trim() : undefined;

  const kpis: { label: string; value: string | number }[] = [];
  if (items.length) kpis.push({ label: 'Alimentos detectados', value: items.length });
  if (totalCaloriesEst) kpis.push({ label: 'Calorías totales (estim.)', value: totalCaloriesEst });
  if (healthScore !== undefined) kpis.push({ label: 'Puntuación de salud', value: `${healthScore}/10` });
  if (totals.calories > 0) kpis.push({ label: 'Calorías (sumadas)', value: Math.round(totals.calories) });

  // Macro totales aproximados si hay fila de "Arroz frito (...)" etc., ya vienen en nutrition
  const proteinLine = lines.find(l => /prote[ií]na/i.test(l) && /g/.test(l) && /Calor[ií]as totales estimadas/i.test(l) === false);
  // No forzamos parsing profundo; nutrition ya expone detalle por ítem

  const sanitize = (s?: string) => s?.replace(/\*\*|\*/g, '').trim();
  const quickSummaryLine = lines.find(l => /Resumen r[aá]pido/i.test(l));
  const quickSummaryRaw = quickSummaryLine ? lines[lines.indexOf(quickSummaryLine) + 1] : undefined;
  const quickSummary = sanitize(quickSummaryRaw);

  return {
    summary: {
      quickSummary,
      mealType,
      healthScore,
      totalCaloriesEst
    },
    kpis,
    items,
    nutrition,
    recommendations,
    aggregates: totals.calories > 0 ? totals : undefined,
    raw: text
  };
}


