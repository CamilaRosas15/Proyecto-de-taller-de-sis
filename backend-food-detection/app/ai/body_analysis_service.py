"""
Servicio de análisis corporal que integra la detección de composición corporal
con recomendaciones nutricionales personalizadas.
"""

import logging
from typing import Dict, List, Optional
from .body_analyzer import body_analyzer

logger = logging.getLogger(__name__)

class BodyAnalysisService:
    """
    Servicio completo de análisis corporal con recomendaciones nutricionales
    """
    
    def __init__(self):
        self.body_analyzer = body_analyzer
        logger.info("BodyAnalysisService inicializado")
    
    def analyze_body_photo(self, image_data: bytes, user_info: Dict = None) -> Dict:
        """
        Analiza una fotografía corporal y proporciona análisis completo
        
        Args:
            image_data: Datos de la imagen en bytes
            user_info: Información del usuario (edad, altura, peso, etc.)
            
        Returns:
            Análisis completo con métricas corporales y recomendaciones
        """
        try:
            # Realizar análisis corporal
            body_analysis = self.body_analyzer.analyze_body_composition(
                image_data, user_info
            )
            
            if not body_analysis.get("success", True):
                return body_analysis
            
            # Generar recomendaciones nutricionales personalizadas
            nutrition_recommendations = self._generate_nutrition_recommendations(
                body_analysis.get("analysis", {}), user_info
            )
            
            # Combinar resultados
            complete_analysis = {
                "success": True,
                "body_analysis": body_analysis.get("analysis", {}),
                "nutrition_recommendations": nutrition_recommendations,
                "integrated_plan": self._create_integrated_plan(
                    body_analysis.get("analysis", {}), 
                    nutrition_recommendations,
                    user_info
                ),
                "timestamp": self._get_timestamp(),
                "disclaimer": "Este análisis es estimativo y educativo. Consulte profesionales de la salud para decisiones médicas."
            }
            
            return complete_analysis
            
        except Exception as e:
            logger.error(f"Error en análisis corporal completo: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": "Error procesando análisis corporal"
            }
    
    def _generate_nutrition_recommendations(self, body_analysis: Dict, user_info: Dict = None) -> Dict:
        """
        Genera recomendaciones nutricionales basadas en el análisis corporal
        """
        try:
            # Crear prompt para recomendaciones nutricionales
            prompt = self._create_nutrition_prompt(body_analysis, user_info)
            
            # Generar recomendaciones con Gemini
            if self.body_analyzer.model:
                response = self.body_analyzer.model.generate_content(prompt)
                recommendations = self._process_nutrition_response(response.text)
            else:
                recommendations = self._get_default_nutrition_recommendations()
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error generando recomendaciones nutricionales: {str(e)}")
            return self._get_default_nutrition_recommendations()
    
    def _create_nutrition_prompt(self, body_analysis: Dict, user_info: Dict = None) -> str:
        """
        Crea prompt para recomendaciones nutricionales personalizadas
        """
        user_data = ""
        if user_info:
            if user_info.get("age"):
                user_data += f"Edad: {user_info['age']} años\n"
            if user_info.get("height"):
                user_data += f"Altura: {user_info['height']} cm\n"
            if user_info.get("weight"):
                user_data += f"Peso: {user_info['weight']} kg\n"
            if user_info.get("gender"):
                user_data += f"Sexo: {user_info['gender']}\n"
            if user_info.get("activity_level"):
                user_data += f"Nivel de actividad: {user_info['activity_level']}\n"
            if user_info.get("dietary_restrictions"):
                user_data += f"Restricciones dietéticas: {user_info['dietary_restrictions']}\n"
        
        body_data = ""
        if body_analysis.get("body_composition"):
            comp = body_analysis["body_composition"]
            body_data += f"Porcentaje de grasa estimado: {comp.get('estimated_body_fat_percentage', 'No determinado')}\n"
            body_data += f"Tipo de cuerpo: {comp.get('body_type', 'No determinado')}\n"
            body_data += f"Nivel de masa muscular: {comp.get('muscle_mass_level', 'No determinado')}\n"
            body_data += f"Nivel de fitness: {comp.get('overall_fitness_level', 'No determinado')}\n"
        
        prompt = f"""
Eres un nutricionista experto. Basándote en el análisis corporal y la información del usuario, crea un plan nutricional personalizado.

INFORMACIÓN DEL USUARIO:
{user_data if user_data else "No se proporcionó información adicional."}

ANÁLISIS CORPORAL:
{body_data if body_data else "Análisis corporal no disponible."}

Proporciona tu respuesta en el siguiente formato JSON:

{{
    "caloric_needs": {{
        "daily_calories": "calorías diarias recomendadas",
        "bmr_estimate": "metabolismo basal estimado",
        "activity_calories": "calorías por actividad"
    }},
    "macronutrient_distribution": {{
        "proteins": {{
            "percentage": "porcentaje de proteínas",
            "grams_per_day": "gramos diarios",
            "sources": ["fuente 1", "fuente 2", "fuente 3"]
        }},
        "carbohydrates": {{
            "percentage": "porcentaje de carbohidratos",
            "grams_per_day": "gramos diarios",
            "sources": ["fuente 1", "fuente 2", "fuente 3"]
        }},
        "fats": {{
            "percentage": "porcentaje de grasas",
            "grams_per_day": "gramos diarios",
            "sources": ["fuente 1", "fuente 2", "fuente 3"]
        }}
    }},
    "meal_timing": {{
        "meals_per_day": "número de comidas",
        "pre_workout": "recomendaciones pre-entrenamiento",
        "post_workout": "recomendaciones post-entrenamiento",
        "hydration": "recomendaciones de hidratación"
    }},
    "specific_recommendations": [
        "recomendación específica 1",
        "recomendación específica 2",
        "recomendación específica 3"
    ],
    "foods_to_prioritize": [
        "alimento prioritario 1",
        "alimento prioritario 2",
        "alimento prioritario 3"
    ],
    "foods_to_limit": [
        "alimento a limitar 1",
        "alimento a limitar 2"
    ],
    "supplements_consideration": [
        "suplemento a considerar 1",
        "suplemento a considerar 2"
    ],
    "weekly_goals": [
        "objetivo semanal 1",
        "objetivo semanal 2"
    ]
}}

IMPORTANTE:
- Adapta las recomendaciones al contexto peruano
- Incluye alimentos locales y accesibles
- Considera el presupuesto promedio
- Sé específico con las cantidades
- Responde SOLO en español
- Mantén un enfoque saludable y sostenible
"""
        
        return prompt
    
    def _process_nutrition_response(self, response_text: str) -> Dict:
        """
        Procesa la respuesta de recomendaciones nutricionales
        """
        try:
            import json
            import re
            
            # Buscar JSON en la respuesta
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group()
                return json.loads(json_str)
            else:
                return self._get_default_nutrition_recommendations()
                
        except Exception as e:
            logger.error(f"Error procesando respuesta nutricional: {str(e)}")
            return self._get_default_nutrition_recommendations()
    
    def _get_default_nutrition_recommendations(self) -> Dict:
        """
        Recomendaciones nutricionales por defecto
        """
        return {
            "caloric_needs": {
                "daily_calories": "1800-2200 (estimación general)",
                "bmr_estimate": "1400-1600 (estimación)",
                "activity_calories": "400-600 (según actividad)"
            },
            "macronutrient_distribution": {
                "proteins": {
                    "percentage": "20-25%",
                    "grams_per_day": "90-110g",
                    "sources": ["pollo", "pescado", "huevos", "quinua", "legumbres"]
                },
                "carbohydrates": {
                    "percentage": "45-50%",
                    "grams_per_day": "200-250g",
                    "sources": ["arroz integral", "quinua", "camote", "avena", "frutas"]
                },
                "fats": {
                    "percentage": "25-30%",
                    "grams_per_day": "60-75g",
                    "sources": ["palta", "frutos secos", "aceite de oliva", "pescado graso"]
                }
            },
            "meal_timing": {
                "meals_per_day": "4-5 comidas",
                "pre_workout": "Carbohidratos 30-60 min antes",
                "post_workout": "Proteína + carbohidratos dentro de 2 horas",
                "hydration": "2-3 litros de agua diarios"
            },
            "specific_recommendations": [
                "Incluir proteína en cada comida",
                "Consumir 5 porciones de frutas y verduras",
                "Elegir carbohidratos integrales",
                "Mantener horarios regulares de comida"
            ],
            "foods_to_prioritize": [
                "Quinua (superalimento peruano)",
                "Pescados del Pacífico",
                "Frutas tropicales locales",
                "Verduras de estación"
            ],
            "foods_to_limit": [
                "Alimentos ultraprocesados",
                "Bebidas azucaradas",
                "Frituras excesivas"
            ],
            "supplements_consideration": [
                "Vitamina D (consultar médico)",
                "Omega-3 si no consume pescado regularmente"
            ],
            "weekly_goals": [
                "Preparar comidas saludables 5 días a la semana",
                "Incluir 3 porciones de pescado semanales"
            ]
        }
    
    def _create_integrated_plan(self, body_analysis: Dict, nutrition_recommendations: Dict, user_info: Dict = None) -> Dict:
        """
        Crea un plan integrado combinando análisis corporal y nutrición
        """
        return {
            "fitness_nutrition_sync": {
                "primary_goal": self._determine_primary_goal(body_analysis),
                "timeline": "4-8 semanas para ver cambios iniciales",
                "key_metrics_to_track": [
                    "Peso corporal",
                    "Medidas corporales",
                    "Nivel de energía",
                    "Calidad del sueño"
                ]
            },
            "weekly_action_plan": [
                "Semana 1-2: Establecer rutina alimentaria",
                "Semana 3-4: Ajustar porciones según progreso",
                "Semana 5-6: Optimizar timing de comidas",
                "Semana 7-8: Evaluar y ajustar plan"
            ],
            "progress_indicators": [
                "Mejora en composición corporal",
                "Aumento de energía",
                "Mejor recuperación post-ejercicio",
                "Estabilidad en el peso"
            ],
            "red_flags": [
                "Pérdida de peso muy rápida (>1kg/semana)",
                "Fatiga extrema",
                "Pérdida de masa muscular",
                "Problemas digestivos persistentes"
            ]
        }
    
    def _determine_primary_goal(self, body_analysis: Dict) -> str:
        """
        Determina el objetivo principal basado en el análisis corporal
        """
        if not body_analysis.get("body_composition"):
            return "Mantener salud general"
        
        comp = body_analysis["body_composition"]
        muscle_level = comp.get("muscle_mass_level", "").lower()
        fitness_level = comp.get("overall_fitness_level", "").lower()
        
        if "bajo" in muscle_level:
            return "Aumentar masa muscular"
        elif "alto" in fitness_level:
            return "Mantener composición corporal actual"
        else:
            return "Mejorar composición corporal general"
    
    def _get_timestamp(self) -> str:
        """
        Obtiene timestamp actual
        """
        from datetime import datetime
        return datetime.now().isoformat()
    
    def get_service_info(self) -> Dict:
        """
        Información sobre el servicio de análisis corporal
        """
        return {
            "service_name": "Body Analysis Service",
            "version": "1.0.0",
            "capabilities": [
                "Análisis de composición corporal por imagen",
                "Estimación de porcentaje de grasa corporal",
                "Recomendaciones nutricionales personalizadas",
                "Planes integrados de fitness y nutrición",
                "Seguimiento de progreso"
            ],
            "supported_metrics": [
                "Porcentaje de grasa corporal",
                "Tipo de cuerpo (somatotipo)",
                "Nivel de masa muscular",
                "Evaluación de postura",
                "Recomendaciones calóricas",
                "Distribución de macronutrientes"
            ],
            "input_requirements": {
                "required": ["imagen corporal"],
                "optional": ["edad", "altura", "peso", "sexo", "nivel_actividad", "restricciones_dietéticas"]
            },
            "accuracy_notes": [
                "Análisis estimativo basado en IA",
                "Precisión mejora con información adicional del usuario",
                "No reemplaza evaluación médica profesional"
            ],
            "privacy_policy": [
                "Imágenes procesadas temporalmente",
                "No almacenamiento permanente de fotos",
                "Datos personales manejados confidencialmente"
            ]
        }

# Instancia global del servicio
body_analysis_service = BodyAnalysisService()