# API de Análisis Corporal

## Descripción General

La API ahora incluye capacidades avanzadas de análisis corporal usando inteligencia artificial. Permite a los usuarios tomar fotografías de su cuerpo para obtener estimaciones de composición corporal, porcentaje de grasa, tipo de cuerpo y recomendaciones nutricionales personalizadas.

## Nuevos Endpoints

### 1. POST `/api/v1/ai/body-analysis`

Analiza una fotografía corporal para estimar métricas corporales y generar recomendaciones nutricionales.

**Parámetros:**
- `file`: Imagen corporal (JPG, PNG, etc.) - **Requerido**
- `age`: Edad en años - *Opcional*
- `height`: Altura en centímetros - *Opcional*
- `weight`: Peso en kilogramos - *Opcional*
- `gender`: Sexo (masculino/femenino) - *Opcional*
- `activity_level`: Nivel de actividad (sedentario/ligero/moderado/intenso) - *Opcional*
- `dietary_restrictions`: Restricciones dietéticas - *Opcional*

**Respuesta de ejemplo:**
```json
{
  "success": true,
  "body_analysis": {
    "body_analysis": {
      "body_composition": {
        "estimated_body_fat_percentage": "15-20%",
        "body_type": "Mesomorfo",
        "muscle_mass_level": "Medio",
        "overall_fitness_level": "Bueno"
      },
      "measurements_estimation": {
        "bmi_category": "Normal",
        "waist_to_hip_ratio": "0.85",
        "posture_assessment": "Buena"
      },
      "health_indicators": {
        "visible_muscle_definition": "Moderada",
        "skin_health": "Buena",
        "overall_health_impression": "Saludable"
      },
      "recommendations": [
        "Mantener rutina de ejercicio actual",
        "Incluir más proteína en la dieta",
        "Hidratarse adecuadamente"
      ]
    },
    "nutrition_recommendations": {
      "caloric_needs": {
        "daily_calories": "2000-2200",
        "bmr_estimate": "1600",
        "activity_calories": "400-600"
      },
      "macronutrient_distribution": {
        "proteins": {
          "percentage": "25%",
          "grams_per_day": "125g",
          "sources": ["pollo", "pescado", "quinua"]
        },
        "carbohydrates": {
          "percentage": "45%",
          "grams_per_day": "225g",
          "sources": ["arroz integral", "camote", "avena"]
        },
        "fats": {
          "percentage": "30%",
          "grams_per_day": "67g",
          "sources": ["palta", "frutos secos", "aceite de oliva"]
        }
      }
    },
    "integrated_plan": {
      "primary_goal": "Mantener composición corporal actual",
      "timeline": "4-8 semanas para ver cambios iniciales",
      "weekly_action_plan": [
        "Semana 1-2: Establecer rutina alimentaria",
        "Semana 3-4: Ajustar porciones según progreso"
      ]
    }
  },
  "filename": "body_photo.jpg",
  "message": "Análisis corporal completado exitosamente"
}
```

### 2. GET `/api/v1/ai/body-analysis-info`

Obtiene información sobre las capacidades del servicio de análisis corporal.

**Respuesta de ejemplo:**
```json
{
  "success": true,
  "body_analysis_capabilities": {
    "service_name": "Body Analysis Service",
    "version": "1.0.0",
    "capabilities": [
      "Análisis de composición corporal por imagen",
      "Estimación de porcentaje de grasa corporal",
      "Recomendaciones nutricionales personalizadas",
      "Planes integrados de fitness y nutrición"
    ],
    "supported_metrics": [
      "Porcentaje de grasa corporal",
      "Tipo de cuerpo (somatotipo)",
      "Nivel de masa muscular",
      "Evaluación de postura"
    ]
  }
}
```

### 3. GET `/api/v1/ai/body-metrics-info`

Obtiene información detallada sobre las métricas corporales que se pueden analizar.

**Respuesta de ejemplo:**
```json
{
  "success": true,
  "body_metrics_info": {
    "primary_metrics": {
      "body_fat_percentage": {
        "description": "Estimación del porcentaje de grasa corporal",
        "accuracy": "Estimativo basado en análisis visual",
        "range": "5-50%"
      },
      "body_type": {
        "description": "Clasificación del somatotipo corporal",
        "categories": ["Ectomorfo", "Mesomorfo", "Endomorfo", "Mixto"]
      }
    },
    "best_practices": {
      "photo_guidelines": [
        "Tomar foto de cuerpo completo",
        "Usar buena iluminación natural",
        "Mantener postura natural y relajada"
      ]
    }
  }
}
```

## Estrategia de Análisis

### 1. Análisis de Imagen
- **Procesamiento**: Gemini AI analiza la fotografía corporal
- **Métricas**: Estima porcentaje de grasa, tipo de cuerpo, masa muscular
- **Evaluación**: Postura, definición muscular, indicadores de salud

### 2. Recomendaciones Nutricionales
- **Personalización**: Basada en análisis corporal y datos del usuario
- **Cálculos**: Necesidades calóricas, distribución de macronutrientes
- **Contexto**: Adaptado a alimentos peruanos y presupuesto local

### 3. Plan Integrado
- **Objetivos**: Determinados automáticamente según análisis
- **Timeline**: Plan de 4-8 semanas con seguimiento
- **Métricas**: Indicadores de progreso y señales de alerta

## Precisión y Limitaciones

### Factores que Mejoran la Precisión
- **Calidad de imagen**: Alta resolución, buena iluminación
- **Ángulo**: Frontal o lateral, cuerpo completo visible
- **Ropa**: Ajustada o deportiva para mejor evaluación
- **Datos adicionales**: Edad, altura, peso, nivel de actividad

### Limitaciones Importantes
- **Estimativo**: No es un diagnóstico médico profesional
- **Variabilidad**: Precisión depende de la calidad de la imagen
- **Complementario**: No reemplaza mediciones profesionales
- **Validación**: Requiere confirmación con profesionales de la salud

## Mejores Prácticas para Fotografías

### Recomendaciones de Captura
1. **Iluminación**: Natural, uniforme, evitar sombras fuertes
2. **Postura**: Natural, relajada, brazos a los costados
3. **Ángulo**: Frontal o lateral, cámara a la altura del torso
4. **Ropa**: Ajustada, deportiva, o mínima para mejor análisis
5. **Fondo**: Simple, sin distracciones

### Información Adicional Recomendada
- **Edad**: Para cálculos metabólicos más precisos
- **Altura y peso**: Para estimaciones de IMC y necesidades calóricas
- **Nivel de actividad**: Para recomendaciones de macronutrientes
- **Restricciones dietéticas**: Para personalizar recomendaciones

## Variables de Entorno

### Requeridas
- `GEMINI_API_KEY`: Clave de API de Google Gemini (requerida para análisis real)

### Modo Simulación
Si no se configura `GEMINI_API_KEY`, la API funcionará en modo simulación con datos de ejemplo.

## Casos de Uso

### 1. Evaluación Inicial
- Usuario toma foto corporal
- Obtiene análisis de composición corporal
- Recibe plan nutricional personalizado

### 2. Seguimiento de Progreso
- Fotos periódicas para comparar cambios
- Ajuste de recomendaciones según evolución
- Monitoreo de métricas corporales

### 3. Planificación Nutricional
- Recomendaciones calóricas personalizadas
- Distribución de macronutrientes optimizada
- Alimentos específicos para objetivos corporales

## Consideraciones de Privacidad

### Manejo de Imágenes
- **Procesamiento temporal**: Las imágenes no se almacenan permanentemente
- **Análisis local**: Procesamiento optimizado para privacidad
- **Confidencialidad**: Datos sensibles manejados con seguridad

### Datos Personales
- **Opcional**: Toda la información personal es opcional
- **Encriptación**: Datos transmitidos de forma segura
- **No persistencia**: No se almacenan datos personales a largo plazo

## Integración con Flutter

### Ejemplo de Uso
```dart
// Análisis corporal con información del usuario
final result = await ApiService.analyzeBodyPhoto(
  imageFile: selectedImage,
  age: 25,
  height: 170,
  weight: 70,
  gender: 'masculino',
  activityLevel: 'moderado'
);

if (result['success']) {
  final bodyAnalysis = result['body_analysis'];
  final nutritionPlan = bodyAnalysis['nutrition_recommendations'];
  // Mostrar resultados en la UI
}
```

## Notas Importantes

1. **Disclaimer Médico**: Este análisis es estimativo y educativo, no reemplaza consulta médica
2. **Precisión Variable**: Los resultados pueden variar según la calidad de la imagen
3. **Uso Responsable**: Siempre consultar profesionales para decisiones de salud importantes
4. **Actualización Regular**: Tomar nuevas fotos cada 2-4 semanas para seguimiento

## Próximas Mejoras

- Análisis de múltiples ángulos corporales
- Comparación temporal de progreso
- Integración con datos de actividad física
- Recomendaciones de ejercicios específicos