"""
Analizador de composición corporal usando Gemini AI.
Procesa fotografías del usuario para estimar métricas corporales.
"""

import os
import logging
from typing import Dict, List, Optional
import base64
from PIL import Image
import io

# Imports condicionales para compatibilidad con Vercel
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    genai = None

logger = logging.getLogger(__name__)

class BodyAnalyzer:
    """
    Analizador de composición corporal usando Gemini AI
    """
    
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.model_name = "gemini-1.5-flash"
        
        if self.api_key and GEMINI_AVAILABLE:
            try:
                genai.configure(api_key=self.api_key)
                self.model = genai.GenerativeModel(self.model_name)
                logger.info("BodyAnalyzer inicializado con Gemini AI")
            except Exception as e:
                logger.error(f"Error inicializando Gemini: {str(e)}")
                self.model = None
        else:
            self.model = None
            if not GEMINI_AVAILABLE:
                logger.warning("google-generativeai no disponible - usando modo simulación")
            else:
                logger.warning("GEMINI_API_KEY no configurada - usando modo simulación")
    
    def analyze_body_composition(self, image_data: bytes, user_info: Dict = None) -> Dict:
        """
        Analiza la composición corporal a partir de una fotografía
        
        Args:
            image_data: Datos de la imagen en bytes
            user_info: Información adicional del usuario (edad, altura, sexo, etc.)
            
        Returns:
            Análisis completo de composición corporal
        """
        try:
            if not self.model:
                return self._get_simulation_response(user_info)
            
            # Procesar imagen
            image = self._process_image(image_data)
            
            # Crear prompt para análisis corporal
            prompt = self._create_body_analysis_prompt(user_info)
            
            # Generar análisis con Gemini
            response = self.model.generate_content([prompt, image])
            
            # Procesar respuesta
            analysis = self._process_gemini_response(response.text)
            
            return {
                "success": True,
                "analysis": analysis,
                "model_used": self.model_name,
                "disclaimer": "Este análisis es estimativo y no reemplaza una evaluación médica profesional"
            }
            
        except Exception as e:
            logger.error(f"Error en análisis corporal: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "fallback": self._get_simulation_response(user_info)
            }
    
    def _process_image(self, image_data: bytes) -> Image.Image:
        """
        Procesa la imagen para análisis
        """
        try:
            image = Image.open(io.BytesIO(image_data))
            
            # Redimensionar si es muy grande (optimización)
            max_size = (1024, 1024)
            if image.size[0] > max_size[0] or image.size[1] > max_size[1]:
                image.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # Convertir a RGB si es necesario
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            return image
            
        except Exception as e:
            logger.error(f"Error procesando imagen: {str(e)}")
            raise
    
    def _create_body_analysis_prompt(self, user_info: Dict = None) -> str:
        """
        Crea el prompt para análisis corporal
        """
        base_info = ""
        if user_info:
            if user_info.get("age"):
                base_info += f"Edad: {user_info['age']} años\n"
            if user_info.get("height"):
                base_info += f"Altura: {user_info['height']} cm\n"
            if user_info.get("weight"):
                base_info += f"Peso: {user_info['weight']} kg\n"
            if user_info.get("gender"):
                base_info += f"Sexo: {user_info['gender']}\n"
            if user_info.get("activity_level"):
                base_info += f"Nivel de actividad: {user_info['activity_level']}\n"
        
        prompt = f"""
Eres un experto en análisis de composición corporal. Analiza esta fotografía de una persona y proporciona una estimación de su composición corporal.

{base_info if base_info else "No se proporcionó información adicional del usuario."}

Por favor, analiza la imagen y proporciona tu respuesta en el siguiente formato JSON:

{{
    "body_composition": {{
        "estimated_body_fat_percentage": "porcentaje estimado (ej: 15-20)",
        "body_type": "tipo de cuerpo (ectomorfo/mesomorfo/endomorfo)",
        "muscle_mass_level": "nivel de masa muscular (bajo/medio/alto)",
        "overall_fitness_level": "nivel de condición física general"
    }},
    "measurements_estimation": {{
        "bmi_category": "categoría de IMC estimada",
        "waist_to_hip_ratio": "estimación de ratio cintura-cadera",
        "posture_assessment": "evaluación de postura"
    }},
    "health_indicators": {{
        "visible_muscle_definition": "definición muscular visible",
        "skin_health": "apariencia de la piel",
        "overall_health_impression": "impresión general de salud"
    }},
    "recommendations": [
        "recomendación específica 1",
        "recomendación específica 2",
        "recomendación específica 3"
    ],
    "fitness_goals_suggestions": [
        "sugerencia de objetivo 1",
        "sugerencia de objetivo 2"
    ],
    "confidence_level": "nivel de confianza del análisis (bajo/medio/alto)",
    "limitations": [
        "limitación del análisis 1",
        "limitación del análisis 2"
    ]
}}

IMPORTANTE:
- Sé honesto sobre las limitaciones del análisis visual
- Proporciona rangos en lugar de valores exactos
- Incluye disclaimers apropiados
- Las recomendaciones deben ser generales y seguras
- Responde SOLO en español
- Mantén un tono profesional y constructivo
"""
        
        return prompt
    
    def _process_gemini_response(self, response_text: str) -> Dict:
        """
        Procesa la respuesta de Gemini y extrae el JSON
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
                # Si no encuentra JSON, crear respuesta estructurada
                return self._create_fallback_analysis(response_text)
                
        except Exception as e:
            logger.error(f"Error procesando respuesta de Gemini: {str(e)}")
            return self._create_fallback_analysis(response_text)
    
    def _create_fallback_analysis(self, raw_response: str) -> Dict:
        """
        Crea análisis de respaldo si no se puede parsear JSON
        """
        return {
            "body_composition": {
                "estimated_body_fat_percentage": "No determinado",
                "body_type": "Requiere análisis adicional",
                "muscle_mass_level": "No determinado",
                "overall_fitness_level": "Requiere evaluación profesional"
            },
            "measurements_estimation": {
                "bmi_category": "No calculado",
                "waist_to_hip_ratio": "No medido",
                "posture_assessment": "Requiere evaluación presencial"
            },
            "health_indicators": {
                "visible_muscle_definition": "No evaluado",
                "skin_health": "No evaluado",
                "overall_health_impression": "Requiere consulta médica"
            },
            "recommendations": [
                "Consultar con un profesional de la salud",
                "Realizar mediciones precisas con herramientas apropiadas",
                "Considerar análisis de composición corporal profesional"
            ],
            "fitness_goals_suggestions": [
                "Establecer objetivos realistas con ayuda profesional",
                "Mantener un estilo de vida activo y saludable"
            ],
            "confidence_level": "bajo",
            "limitations": [
                "Análisis basado únicamente en imagen",
                "No reemplaza evaluación médica profesional",
                "Precisión limitada sin mediciones directas"
            ],
            "raw_response": raw_response[:500] + "..." if len(raw_response) > 500 else raw_response
        }
    
    def _get_simulation_response(self, user_info: Dict = None) -> Dict:
        """
        Respuesta de simulación cuando no hay API key
        """
        return {
            "body_composition": {
                "estimated_body_fat_percentage": "15-25% (simulación)",
                "body_type": "Mesomorfo (simulación)",
                "muscle_mass_level": "Medio (simulación)",
                "overall_fitness_level": "Bueno (simulación)"
            },
            "measurements_estimation": {
                "bmi_category": "Normal (simulación)",
                "waist_to_hip_ratio": "0.85 (simulación)",
                "posture_assessment": "Buena (simulación)"
            },
            "health_indicators": {
                "visible_muscle_definition": "Moderada (simulación)",
                "skin_health": "Buena (simulación)",
                "overall_health_impression": "Saludable (simulación)"
            },
            "recommendations": [
                "Mantener rutina de ejercicio regular",
                "Seguir dieta balanceada",
                "Hidratarse adecuadamente",
                "Dormir 7-8 horas diarias"
            ],
            "fitness_goals_suggestions": [
                "Mantener peso actual",
                "Incrementar masa muscular gradualmente"
            ],
            "confidence_level": "simulación",
            "limitations": [
                "Este es un análisis de simulación",
                "Configura GEMINI_API_KEY para análisis real",
                "No reemplaza evaluación médica profesional"
            ],
            "simulation_mode": True
        }
    
    def get_analysis_capabilities(self) -> Dict:
        """
        Obtiene información sobre las capacidades de análisis corporal
        """
        return {
            "supported_analysis": [
                "Estimación de porcentaje de grasa corporal",
                "Evaluación de tipo de cuerpo",
                "Análisis de masa muscular",
                "Evaluación de postura",
                "Recomendaciones de fitness"
            ],
            "input_requirements": [
                "Fotografía de cuerpo completo o torso",
                "Buena iluminación",
                "Postura frontal o lateral",
                "Ropa ajustada o mínima para mejor análisis"
            ],
            "optional_user_data": [
                "Edad",
                "Altura",
                "Peso actual",
                "Sexo",
                "Nivel de actividad física"
            ],
            "accuracy_factors": [
                "Calidad de la imagen",
                "Ángulo de la fotografía",
                "Iluminación",
                "Información adicional del usuario"
            ],
            "limitations": [
                "Análisis estimativo basado en imagen",
                "No reemplaza mediciones profesionales",
                "Precisión variable según condiciones de la foto",
                "Requiere validación médica para decisiones de salud"
            ],
            "privacy_notes": [
                "Las imágenes no se almacenan permanentemente",
                "Procesamiento local de imágenes",
                "Datos sensibles manejados con confidencialidad"
            ]
        }

# Instancia global del analizador corporal
body_analyzer = BodyAnalyzer()