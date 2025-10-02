"""
Gemini Food Detection Module
Integrates with Google's Gemini API for advanced food recognition and nutritional analysis.
"""

import base64
import json
import logging
from typing import Dict, List, Optional, Tuple
import requests
import asyncio
import io

from app.core.config import settings

logger = logging.getLogger(__name__)

class GeminiFoodDetector:
    """
    Food detection using Google's Gemini API.
    Provides advanced food recognition with detailed nutritional analysis.
    """
    
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.confidence_threshold = settings.GEMINI_CONFIDENCE_THRESHOLD
        self.api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.api_key}"
        
        # Nutritional database mapping
        self.nutritional_data = {
            # Frutas
            "apple": {"calories": 52, "protein": 0.3, "carbs": 14, "fat": 0.2, "fiber": 2.4},
            "banana": {"calories": 89, "protein": 1.1, "carbs": 23, "fat": 0.3, "fiber": 2.6},
            "orange": {"calories": 47, "protein": 0.9, "carbs": 12, "fat": 0.1, "fiber": 2.4},
            "strawberry": {"calories": 32, "protein": 0.7, "carbs": 8, "fat": 0.3, "fiber": 2.0},
            "grapes": {"calories": 62, "protein": 0.6, "carbs": 16, "fat": 0.2, "fiber": 0.9},
            
            # Vegetales
            "broccoli": {"calories": 34, "protein": 2.8, "carbs": 7, "fat": 0.4, "fiber": 2.6},
            "carrot": {"calories": 41, "protein": 0.9, "carbs": 10, "fat": 0.2, "fiber": 2.8},
            "tomato": {"calories": 18, "protein": 0.9, "carbs": 4, "fat": 0.2, "fiber": 1.2},
            "lettuce": {"calories": 15, "protein": 1.4, "carbs": 3, "fat": 0.2, "fiber": 1.3},
            "spinach": {"calories": 23, "protein": 2.9, "carbs": 4, "fat": 0.4, "fiber": 2.2},
            
            # Proteínas
            "chicken_breast": {"calories": 165, "protein": 31, "carbs": 0, "fat": 3.6, "fiber": 0},
            "salmon": {"calories": 208, "protein": 20, "carbs": 0, "fat": 12, "fiber": 0},
            "beef": {"calories": 250, "protein": 26, "carbs": 0, "fat": 15, "fiber": 0},
            "egg": {"calories": 155, "protein": 13, "carbs": 1.1, "fat": 11, "fiber": 0},
            "tofu": {"calories": 76, "protein": 8, "carbs": 1.9, "fat": 4.8, "fiber": 0.3},
            
            # Carbohidratos
            "rice": {"calories": 130, "protein": 2.7, "carbs": 28, "fat": 0.3, "fiber": 0.4},
            "bread": {"calories": 265, "protein": 9, "carbs": 49, "fat": 3.2, "fiber": 2.7},
            "pasta": {"calories": 131, "protein": 5, "carbs": 25, "fat": 1.1, "fiber": 1.8},
            "potato": {"calories": 77, "protein": 2, "carbs": 17, "fat": 0.1, "fiber": 2.2},
            "quinoa": {"calories": 120, "protein": 4.4, "carbs": 22, "fat": 1.9, "fiber": 2.8},
            
            # Lácteos
            "milk": {"calories": 42, "protein": 3.4, "carbs": 5, "fat": 1, "fiber": 0},
            "cheese": {"calories": 113, "protein": 7, "carbs": 1, "fat": 9, "fiber": 0},
            "yogurt": {"calories": 59, "protein": 10, "carbs": 3.6, "fat": 0.4, "fiber": 0},
            
            # Frutos secos y semillas
            "almonds": {"calories": 579, "protein": 21, "carbs": 22, "fat": 50, "fiber": 12},
            "walnuts": {"calories": 654, "protein": 15, "carbs": 14, "fat": 65, "fiber": 7},
            
            # Legumbres
            "beans": {"calories": 127, "protein": 9, "carbs": 23, "fat": 0.5, "fiber": 9},
            "lentils": {"calories": 116, "protein": 9, "carbs": 20, "fat": 0.4, "fiber": 8},
            
            # Aceites y grasas
            "olive_oil": {"calories": 884, "protein": 0, "carbs": 0, "fat": 100, "fiber": 0},
            "avocado": {"calories": 160, "protein": 2, "carbs": 9, "fat": 15, "fiber": 7},
        }
        
        # Weight estimation factors (grams per typical serving)
        self.weight_factors = {
            "apple": 150, "banana": 120, "orange": 130, "strawberry": 15, "grapes": 5,
            "broccoli": 100, "carrot": 80, "tomato": 120, "lettuce": 20, "spinach": 30,
            "chicken_breast": 150, "salmon": 150, "beef": 150, "egg": 50, "tofu": 100,
            "rice": 150, "bread": 30, "pasta": 100, "potato": 150, "quinoa": 100,
            "milk": 250, "cheese": 30, "yogurt": 150,
            "almonds": 30, "walnuts": 30,
            "beans": 100, "lentils": 100,
            "olive_oil": 15, "avocado": 150
        }

    async def detect_food(self, image_data: bytes) -> Dict:
        """
        Detect food items in an image using Gemini API.
        
        Args:
            image_data: Raw image bytes
            
        Returns:
            Dictionary with detection results
        """
        if not self.api_key:
            logger.warning("Gemini API key not configured, using simulation")
            return self._simulate_detection()
        
        try:
            # Convert image to base64
            base64_image = base64.b64encode(image_data).decode('utf-8')
            
            # Prepare the prompt for food analysis
            prompt = self._create_food_analysis_prompt()
            
            # Prepare request payload
            payload = {
                "contents": [{
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": "image/jpeg",
                                "data": base64_image
                            }
                        }
                    ]
                }],
                "generationConfig": {
                    "temperature": 0.1,
                    "topK": 32,
                    "topP": 1,
                    "maxOutputTokens": 2048,
                }
            }
            
            # Make API request using requests
            headers = {
                "Content-Type": "application/json"
            }
            
            response = requests.post(self.api_url, json=payload, headers=headers)
            response.raise_for_status()
            result = response.json()
            
            # Process Gemini response
            return self._process_gemini_response(result)
            
        except Exception as e:
            logger.error(f"Error in Gemini food detection: {str(e)}")
            return self._simulate_detection()

    def _create_food_analysis_prompt(self) -> str:
        """Create an optimized prompt for comprehensive food analysis."""
        return """
        Analiza esta imagen de comida y proporciona una respuesta JSON detallada con la siguiente estructura.
        IMPORTANTE: Todas las descripciones, recomendaciones y textos deben estar en ESPAÑOL.

        {
            "dish_identification": {
                "dish_name": "nombre_del_plato_principal",
                "dish_type": "ceviche/ensalada/guiso/etc",
                "cuisine_type": "peruana/italiana/mexicana/etc",
                "description": "Descripción breve del plato identificado EN ESPAÑOL"
            },
            "foods_detected": [
                {
                    "name": "nombre_comida_en_español",
                    "confidence": 0.95,
                    "portion_size": "mediana/pequeña/grande",
                    "estimated_weight_grams": 150,
                    "bounding_box": {
                        "x": 0.1,
                        "y": 0.1,
                        "width": 0.3,
                        "height": 0.4
                    },
                    "nutrition_per_100g": {
                        "calories": 165,
                        "protein": 31.0,
                        "carbs": 0.0,
                        "fat": 3.6,
                        "fiber": 0.0,
                        "sodium": 74,
                        "sugar": 0.0
                    },
                    "total_nutrition": {
                        "calories": 248,
                        "protein": 46.5,
                        "carbs": 0.0,
                        "fat": 5.4,
                        "fiber": 0.0
                    }
                }
            ],
            "meal_analysis": {
                "meal_type": "desayuno/almuerzo/cena/snack",
                "total_calories": 450,
                "total_protein_grams": 35.2,
                "total_carbs_grams": 45.8,
                "total_fat_grams": 12.3,
                "total_fiber_grams": 8.1,
                "nutritional_balance": "equilibrado/alto_carbohidratos/alta_proteina/alta_grasa",
                "health_score": 8.5,
                "macronutrient_units": "Todos los macronutrientes (proteína, carbohidratos, grasa, fibra) están expresados en gramos (g). Sodio en miligramos (mg). Calorías en kilocalorías (kcal).",
                "recommendations": ["Recomendaciones de salud EN ESPAÑOL", "Ejemplo: Excelente fuente de proteína"]
            }
        }

        Instrucciones:
        1. IDENTIFICA EL PLATO PRINCIPAL: Reconoce qué tipo de comida es (ceviche, ensalada, etc.)
        2. Identifica TODOS los alimentos visibles en la imagen con alta precisión
        3. Proporciona puntuaciones de confianza (0.0 a 1.0) basadas en la claridad visual
        4. Estima tamaños de porciones y pesos de manera realista basándote en pistas visuales
        5. Usa nombres en ESPAÑOL para los alimentos (ej: "pescado", "cebolla_roja", "lechuga", "maíz")
        6. Proporciona coordenadas de bounding box como porcentajes (0.0 a 1.0)
        7. Calcula valores nutricionales precisos por 100g Y totales para la porción estimada
        8. INCLUYE las unidades en el análisis nutricional para claridad
        9. Analiza la composición general de la comida con recomendaciones de salud EN ESPAÑOL
        10. Proporciona una puntuación de salud (1-10) basada en el equilibrio nutricional
        11. Sé lo más preciso posible con todas las estimaciones
        12. TODAS las descripciones, recomendaciones, cuisine_type y textos descriptivos deben estar en ESPAÑOL
        13. Para cuisine_type usa términos en español: "peruana", "italiana", "mexicana", "china", "japonesa", etc.
        14. IMPORTANTE: Los nombres de alimentos en el campo "name" deben estar en ESPAÑOL (ej: "pollo", "arroz", "plátano", "tomate", "cebolla")

        Devuelve SOLO la respuesta JSON, sin texto adicional o formato markdown.
        """

    def _process_gemini_response(self, response: Dict) -> Dict:
        """
        Process the response from Gemini API with enhanced nutrition handling.
        
        Args:
            response: Raw response from Gemini API
            
        Returns:
            Processed detection results with Gemini nutrition data
        """
        try:
            # Extract text from Gemini response
            if "candidates" in response and len(response["candidates"]) > 0:
                content = response["candidates"][0]["content"]["parts"][0]["text"]
                
                # Clean the response (remove markdown formatting if present)
                content = content.strip()
                if content.startswith("```json"):
                    content = content[7:]
                if content.endswith("```"):
                    content = content[:-3]
                content = content.strip()
                
                # Parse JSON
                gemini_result = json.loads(content)
                
                # Convert to our internal format with enhanced nutrition
                detections = []
                for food in gemini_result.get("foods_detected", []):
                    if food.get("confidence", 0) >= self.confidence_threshold:
                        # Use Gemini nutrition data if available, fallback to local database
                        nutrition_data = food.get("total_nutrition", {})
                        if not nutrition_data:
                            # Fallback to local database
                            nutrition_data = self._get_nutrition_info(food["name"])
                            estimated_weight = food.get("estimated_weight_grams", 
                                                       self.weight_factors.get(food["name"], 100))
                            # Calculate total nutrition from per-100g data
                            for key, value in nutrition_data.items():
                                nutrition_data[key] = round((value * estimated_weight) / 100, 1)
                        
                        detection = {
                            "class": food["name"],
                            "confidence": food["confidence"],
                            "bbox": [
                                food["bounding_box"]["x"],
                                food["bounding_box"]["y"],
                                food["bounding_box"]["width"],
                                food["bounding_box"]["height"]
                            ],
                            "estimated_weight": food.get("estimated_weight_grams", 
                                                       self.weight_factors.get(food["name"], 100)),
                            "nutrition": nutrition_data,
                            "nutrition_per_100g": food.get("nutrition_per_100g", 
                                                         self._get_nutrition_info(food["name"])),
                            "portion_size": food.get("portion_size", "medium")
                        }
                        detections.append(detection)
                
                # Enhanced meal analysis
                meal_analysis = gemini_result.get("meal_analysis", {})
                dish_info = gemini_result.get("dish_identification", {})
                
                return {
                    "dish_identification": {
                        "dish_name": dish_info.get("dish_name", "Plato no identificado"),
                        "dish_type": dish_info.get("dish_type", "unknown"),
                        "cuisine_type": dish_info.get("cuisine_type", "unknown"),
                        "description": dish_info.get("description", "")
                    },
                    "detections": detections,
                    "meal_analysis": {
                        "meal_type": meal_analysis.get("meal_type", "unknown"),
                        "total_calories": meal_analysis.get("total_calories", 0),
                        "total_protein_grams": meal_analysis.get("total_protein_grams", 0),
                        "total_carbs_grams": meal_analysis.get("total_carbs_grams", 0),
                        "total_fat_grams": meal_analysis.get("total_fat_grams", 0),
                        "total_fiber_grams": meal_analysis.get("total_fiber_grams", 0),
                        "nutritional_balance": meal_analysis.get("nutritional_balance", "unknown"),
                        "health_score": meal_analysis.get("health_score", 5.0),
                        "macronutrient_units": meal_analysis.get("macronutrient_units", 
                            "Todos los macronutrientes (proteína, carbohidratos, grasa, fibra) están expresados en gramos (g). Sodio en miligramos (mg). Calorías en kilocalorías (kcal)."),
                        "recommendations": meal_analysis.get("recommendations", [])
                    },
                    "total_items": len(detections),
                    "confidence_avg": sum(d["confidence"] for d in detections) / len(detections) if detections else 0,
                    "nutrition_source": "gemini_enhanced"
                }
            
        except Exception as e:
            logger.error(f"Error processing Gemini response: {str(e)}")
        
        return self._simulate_detection()

    def _get_nutrition_info(self, food_name: str) -> Dict:
        """
        Get nutritional information for a food item.
        
        Args:
            food_name: Name of the food item
            
        Returns:
            Nutritional information dictionary
        """
        # Normalize food name
        normalized_name = food_name.lower().replace(" ", "_")
        
        # Return nutritional data or default values
        return self.nutritional_data.get(normalized_name, {
            "calories": 100,
            "protein": 5,
            "carbs": 15,
            "fat": 3,
            "fiber": 2
        })

    def _simulate_detection(self) -> Dict:
        """
        Simulate enhanced food detection for development/testing.
        
        Returns:
            Simulated detection results with enhanced nutrition data
        """
        return {
            "detections": [
                {
                    "class": "chicken_breast",
                    "confidence": 0.92,
                    "bbox": [0.2, 0.3, 0.3, 0.4],
                    "estimated_weight": 150,
                    "nutrition": {
                        "calories": 248,
                        "protein": 46.5,
                        "carbs": 0,
                        "fat": 5.4,
                        "fiber": 0
                    },
                    "nutrition_per_100g": self._get_nutrition_info("chicken_breast"),
                    "portion_size": "mediana"
                },
                {
                    "class": "rice",
                    "confidence": 0.88,
                    "bbox": [0.5, 0.4, 0.25, 0.3],
                    "estimated_weight": 120,
                    "nutrition": {
                        "calories": 156,
                        "protein": 3.2,
                        "carbs": 33.6,
                        "fat": 0.4,
                        "fiber": 0.5
                    },
                    "nutrition_per_100g": self._get_nutrition_info("rice"),
                    "portion_size": "mediana"
                },
                {
                    "class": "broccoli",
                    "confidence": 0.85,
                    "bbox": [0.1, 0.1, 0.2, 0.25],
                    "estimated_weight": 80,
                    "nutrition": {
                        "calories": 27,
                        "protein": 2.2,
                        "carbs": 5.6,
                        "fat": 0.3,
                        "fiber": 2.1
                    },
                    "nutrition_per_100g": self._get_nutrition_info("broccoli"),
                    "portion_size": "pequeña"
                }
            ],
            "meal_analysis": {
                "meal_type": "almuerzo",
                "total_calories": 431,
                "total_protein": 51.9,
                "total_carbs": 39.2,
                "total_fat": 6.1,
                "nutritional_balance": "alta_proteina",
                "health_score": 8.5,
                "recommendations": [
                    "Excelente contenido de proteína",
                    "Buena inclusión de vegetales",
                    "Considera agregar grasas saludables como aguacate"
                ]
            },
            "total_items": 3,
            "confidence_avg": 0.88,
            "nutrition_source": "simulation_enhanced"
        }

    def get_supported_foods(self) -> Dict:
        """
        Get information about supported food detection capabilities.
        
        Returns:
            Dictionary with food detection capabilities info
        """
        return {
            "detection_capability": "unlimited",
            "description": "Gemini puede detectar miles de alimentos diferentes",
            "local_nutrition_database": {
                "count": len(self.nutritional_data),
                "foods": list(self.nutritional_data.keys())[:10],  # Solo muestra 10 ejemplos
                "note": "Base de datos local para respaldo nutricional"
            },
            "gemini_capabilities": {
                "food_detection": "Ilimitada - cualquier alimento visible",
                "nutrition_analysis": "Análisis nutricional en tiempo real",
                "portion_estimation": "Estimación automática de porciones",
                "health_scoring": "Puntuación de salud automática",
                "recommendations": "Recomendaciones nutricionales personalizadas"
            },
            "examples": [
                "frutas", "verduras", "carnes", "pescados", "lácteos",
                "cereales", "legumbres", "frutos secos", "bebidas",
                "comida rápida", "postres", "platos preparados"
            ]
        }

    def get_optimization_info(self) -> Dict:
        """
        Get information about the optimization strategy implemented.
        
        Returns:
            Dictionary with optimization details
        """
        return {
            "strategy": "hybrid_enhanced",
            "description": "Enfoque optimizado usando Gemini para análisis integral",
            "features": {
                "single_api_call": True,
                "gemini_nutrition": True,
                "local_fallback": True,
                "enhanced_analysis": True,
                "health_scoring": True,
                "recommendations": True
            },
            "benefits": [
                "Consumo reducido de tokens por análisis",
                "Datos nutricionales más precisos de Gemini",
                "Análisis integral de comida en una sola llamada",
                "Puntuación de salud y recomendaciones",
                "Respaldo a base de datos local para confiabilidad"
            ],
            "token_optimization": {
                "previous_approach": "Solo detección, búsqueda nutricional local",
                "current_approach": "Análisis integral en una sola llamada",
                "estimated_savings": "30-40% comparado con múltiples llamadas API",
                "enhanced_accuracy": "Gemini proporciona análisis nutricional en tiempo real"
            }
        }

    def estimate_portion_weight(self, food_name: str, bbox: List[float]) -> float:
        """
        Estimate the weight of a food portion based on bounding box size.
        
        Args:
            food_name: Name of the detected food
            bbox: Bounding box coordinates [x, y, width, height]
            
        Returns:
            Estimated weight in grams
        """
        base_weight = self.weight_factors.get(food_name.lower(), 100)
        
        # Calculate area from bounding box
        area = bbox[2] * bbox[3]  # width * height
        
        # Adjust weight based on visual size
        # Assuming area of 0.25 (50% x 50%) represents standard portion
        size_factor = area / 0.25
        
        # Apply reasonable bounds
        size_factor = max(0.3, min(size_factor, 3.0))
        
        return int(base_weight * size_factor)