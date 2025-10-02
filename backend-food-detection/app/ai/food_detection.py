"""
Sistema de detección de alimentos con Google Gemini.
Solución simplificada y enfocada en la mejor IA disponible.
"""

import logging
from typing import Dict, List
from app.core.config import settings
from app.ai.gemini_detector import GeminiFoodDetector

logger = logging.getLogger(__name__)

class FoodDetectionSystem:
    """
    Sistema principal de detección de alimentos usando Google Gemini.
    """
    
    def __init__(self):
        self.detector = None
        
        # Verificar configuración de Gemini (validar que no sea placeholder)
        api_key = settings.GEMINI_API_KEY
        is_valid_key = (api_key and 
                       api_key != "AQUI_VA_TU_API_KEY_DE_GEMINI" and 
                       len(api_key) > 20 and 
                       not api_key.startswith("tu_") and
                       not api_key.startswith("AQUI_"))
        
        if is_valid_key:
            try:
                self.detector = GeminiFoodDetector()
                logger.info("✅ Sistema de detección inicializado con Google Gemini")
            except Exception as e:
                logger.error(f"❌ Error inicializando Gemini: {str(e)}")
                logger.info("🔄 Usando modo simulación")
        else:
            if api_key:
                logger.warning("⚠️ GEMINI_API_KEY parece ser un placeholder, usando modo simulación")
            else:
                logger.warning("⚠️ GEMINI_API_KEY no configurada, usando modo simulación")

    async def detect_objects(self, image_data: bytes) -> Dict:
        """
        Detecta objetos de comida en una imagen usando Gemini.
        
        Args:
            image_data: Datos de la imagen en bytes
            
        Returns:
            Diccionario con los resultados de detección
        """
        try:
            if self.detector:
                return await self.detector.detect_food(image_data)
            else:
                logger.info("🎭 Usando detección simulada (Gemini no configurado)")
                return self._simulate_detection()
                
        except Exception as e:
            logger.error(f"❌ Error en detección: {str(e)}")
            return self._simulate_detection()

    def get_supported_foods(self) -> Dict:
        """
        Obtiene información sobre las capacidades de detección de alimentos.
        
        Returns:
            Información sobre capacidades de detección
        """
        if self.detector:
            return self.detector.get_supported_foods()
        
        # Información básica para modo simulación
        return {
            "detection_capability": "simulation",
            "description": "Modo simulación - API key de Gemini no configurada",
            "local_nutrition_database": {
                "count": 29,
                "foods": [
                    "manzana", "plátano", "naranja", "pechuga_pollo", "arroz", 
                    "brócoli", "pan", "huevo", "leche", "queso"
                ],
                "note": "Lista limitada para simulación"
            },
            "simulation_note": "Para capacidades completas, configura GEMINI_API_KEY",
            "examples": [
                "frutas básicas", "verduras comunes", "carnes principales", 
                "cereales", "lácteos", "comida rápida básica"
            ]
        }

    def get_model_info(self) -> Dict:
        """
        Obtiene información sobre el modelo Gemini.
        
        Returns:
            Información del modelo
        """
        foods_info = self.get_supported_foods()
        foods_count = foods_info.get("local_nutrition_database", {}).get("count", 0) if not self.detector else "unlimited"
        
        # Validar API key correctamente
        api_key = settings.GEMINI_API_KEY
        is_valid_key = (api_key and 
                       api_key != "AQUI_VA_TU_API_KEY_DE_GEMINI" and 
                       len(api_key) > 20 and 
                       not api_key.startswith("tu_") and
                       not api_key.startswith("AQUI_"))
        
        return {
            "backend": "gemini",
            "model_name": "Gemini 1.5 Flash",
            "provider": "Google AI",
            "status": "active" if self.detector else "simulation",
            "capabilities": [
                "food_recognition", 
                "portion_estimation", 
                "nutritional_analysis", 
                "meal_analysis",
                "ingredient_detection"
            ],
            "confidence_threshold": settings.GEMINI_CONFIDENCE_THRESHOLD,
            "api_configured": is_valid_key,
            "supported_foods_count": foods_count,
            "features": {
                "multi_food_detection": True,
                "portion_estimation": True,
                "nutritional_calculation": True,
                "meal_type_recognition": True,
                "ingredient_analysis": True
            }
        }

    def _simulate_detection(self) -> Dict:
        """
        Simulación de detección para desarrollo y testing.
        
        Returns:
            Resultados simulados realistas
        """
        return {
            "detections": [
                {
                    "class": "pechuga_pollo",
                    "confidence": 0.94,
                    "bbox": [0.2, 0.3, 0.3, 0.4],
                    "estimated_weight": 150,
                    "nutrition": {
                        "calories": 165,
                        "protein": 31.0,
                        "carbs": 0.0,
                        "fat": 3.6,
                        "fiber": 0.0,
                        "sugar": 0.0,
                        "sodium": 74
                    }
                },
                {
                    "class": "arroz",
                    "confidence": 0.89,
                    "bbox": [0.5, 0.4, 0.25, 0.3],
                    "estimated_weight": 120,
                    "nutrition": {
                        "calories": 130,
                        "protein": 2.7,
                        "carbs": 28.0,
                        "fat": 0.3,
                        "fiber": 0.4,
                        "sugar": 0.1,
                        "sodium": 1
                    }
                },
                {
                    "class": "brócoli",
                    "confidence": 0.87,
                    "bbox": [0.1, 0.6, 0.2, 0.25],
                    "estimated_weight": 80,
                    "nutrition": {
                        "calories": 27,
                        "protein": 2.2,
                        "carbs": 5.6,
                        "fat": 0.3,
                        "fiber": 2.2,
                        "sugar": 1.5,
                        "sodium": 26
                    }
                }
            ],
            "meal_analysis": {
                "meal_type": "almuerzo",
                "estimated_calories": 322,
                "nutritional_balance": "balanceado",
                "protein_percentage": 35.8,
                "carbs_percentage": 41.6,
                "fat_percentage": 22.6,
                "health_score": 8.5,
                "recommendations": [
                    "Excelente balance de proteínas",
                    "Buena cantidad de vegetales",
                    "Porción adecuada de carbohidratos"
                ]
            },
            "total_items": 3,
            "confidence_avg": 0.90,
            "backend_used": "gemini_simulation",
            "processing_time": "1.2s"
        }

# Instancia global del sistema de detección
food_detector = FoodDetectionSystem()

# Clase legacy para compatibilidad con código existente
class ImageAnalyzer:
    """Analizador legacy para compatibilidad con código existente"""
    
    def __init__(self):
        self.food_detector = food_detector
    
    async def analyze_food_image(self, image_path: str, confidence_threshold: float = 0.7):
        """Método legacy para compatibilidad"""
        try:
            # Leer imagen
            with open(image_path, 'rb') as f:
                image_data = f.read()
            
            # Usar el nuevo sistema
            result = await self.food_detector.detect_objects(image_data)
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Error en análisis legacy: {str(e)}")
            return {"error": str(e)}

# Instancia global del analizador legacy
image_analyzer = ImageAnalyzer()