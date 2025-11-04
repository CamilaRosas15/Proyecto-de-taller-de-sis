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
import time
import random

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
        
        # Usar el modelo correcto disponible
        model_name = settings.GEMINI_MODEL_NAME
        if model_name == "gemini-2.5-flash":
            model_name = "gemini-2.0-flash-exp"  # Corregir al modelo real disponible
        
        self.api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={self.api_key}"
        
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

    def _make_request_with_retry(self, url: str, json: Dict, headers: Dict, max_retries: int = 4) -> Optional[requests.Response]:
        """
        Make API request with exponential backoff retry logic for 429 errors.
        
        Args:
            url: API endpoint URL
            json: Request payload
            headers: Request headers
            max_retries: Maximum number of retry attempts
            
        Returns:
            Response object or None if all retries failed
        """
        for attempt in range(max_retries + 1):
            try:
                response = requests.post(url, json=json, headers=headers, timeout=60)
                
                # If successful or non-retryable error, return immediately
                if response.status_code == 200:
                    return response
                
                # Handle 429 (Rate Limit) with retry
                if response.status_code == 429:
                    if attempt < max_retries:
                        # Check for Retry-After header
                        retry_after = response.headers.get("Retry-After")
                        if retry_after:
                            try:
                                delay = float(retry_after)
                                logger.warning(f"Rate limit (429) - Retry-After header: {delay}s. Esperando...")
                            except ValueError:
                                delay = None
                        else:
                            delay = None
                        
                        # Calculate exponential backoff with jitter
                        if delay is None:
                            base_delay = 2 ** attempt  # 1s, 2s, 4s, 8s...
                            delay = random.uniform(base_delay, base_delay * 2)  # Add jitter
                        
                        logger.warning(f"Rate limit (429) alcanzado. Intento {attempt + 1}/{max_retries + 1}. Esperando {delay:.1f}s antes de reintentar...")
                        time.sleep(delay)
                        continue
                    else:
                        logger.error(f"Rate limit (429) - Se agotaron los reintentos después de {max_retries + 1} intentos")
                        return response  # Return last response even if it's an error
                
                # For other errors, return immediately (no retry)
                return response
                
            except requests.exceptions.Timeout as e:
                logger.warning(f"Timeout en intento {attempt + 1}/{max_retries + 1}: {str(e)}")
                if attempt < max_retries:
                    delay = 2 ** attempt
                    logger.info(f"Esperando {delay}s antes de reintentar...")
                    time.sleep(delay)
                    continue
                else:
                    logger.error("Timeout - Se agotaron los reintentos")
                    return None
                    
            except requests.exceptions.RequestException as e:
                logger.error(f"Error de conexión en intento {attempt + 1}/{max_retries + 1}: {str(e)}")
                if attempt < max_retries:
                    delay = 2 ** attempt
                    logger.info(f"Esperando {delay}s antes de reintentar...")
                    time.sleep(delay)
                    continue
                else:
                    logger.error("Error de conexión - Se agotaron los reintentos")
                    return None
        
        return None

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
            logger.info(f"Imagen convertida a base64 (tamaño: {len(base64_image)} caracteres)")
            
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
            
            # Make API request using requests with retry logic
            headers = {
                "Content-Type": "application/json"
            }
            
            logger.info(f"Enviando solicitud a Gemini API: {self.api_url}")
            response = self._make_request_with_retry(
                url=self.api_url,
                json=payload,
                headers=headers,
                max_retries=4
            )
            
            if response is None:
                logger.error("No se pudo obtener respuesta después de múltiples reintentos")
                return self._simulate_detection()
            
            # Log response status
            logger.info(f"Respuesta de Gemini - Status: {response.status_code}")
            
            if response.status_code != 200:
                logger.error(f"Error en respuesta de Gemini: {response.status_code} - {response.text}")
                return self._simulate_detection()
            
            response.raise_for_status()
            result = response.json()
            
            logger.info(f"Respuesta JSON recibida de Gemini: {json.dumps(result, indent=2)[:500]}...")
            
            # Process Gemini response
            return self._process_gemini_response(result)
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error de conexión con Gemini API: {str(e)}")
            return self._simulate_detection()
        except json.JSONDecodeError as e:
            logger.error(f"Error decodificando respuesta JSON de Gemini: {str(e)}")
            return self._simulate_detection()
        except Exception as e:
            logger.error(f"Error inesperado en Gemini food detection: {str(e)}")
            return self._simulate_detection()

    def _create_food_analysis_prompt(self) -> str:
        """Create an optimized prompt for comprehensive food analysis."""
        return """
        Analiza esta imagen y determina si contiene comida o alimentos. 
        
        IMPORTANTE: Solo analizo imágenes de comida y alimentos. Si la imagen NO contiene comida, responde EXACTAMENTE esto:

        "¡Hola! 👋 

        Soy una IA especializada en análisis nutricional de alimentos, pero parece que la imagen que subiste no contiene comida. 

        🤖 **¿Qué puedo hacer por ti?**
        Solo puedo analizar imágenes que contengan:
        - Platos de comida preparados
        - Frutas y verduras 
        - Snacks y bebidas
        - Ingredientes para cocinar
        - Cualquier tipo de alimento

        🍽️ **¿Podrías intentar de nuevo?**
        Sube una foto de tu comida y te daré un análisis nutricional detallado con recomendaciones personalizadas.

        ¡Estoy aquí para ayudarte a llevar una alimentación más saludable! 💪✨"

        ---

        Si la imagen SÍ contiene comida, analízala usando esta estructura en ESPAÑOL:

        **🍽️ ¿Qué estoy viendo?**
        Identifica el plato principal y describe brevemente lo que observas en la imagen.

        **🥘 Alimentos detectados:**
        Para cada alimento que veas, menciona:
        - Qué es exactamente
        - Qué tan seguro estás de la identificación (muy seguro/bastante seguro/posiblemente)
        - El tamaño de la porción (pequeña/mediana/grande)
        - Peso estimado en gramos

        **📊 Información nutricional:**
        Para cada alimento, proporciona de manera conversacional:
        - Calorías aproximadas de la porción
        - Contenido de proteínas, carbohidratos y grasas
        - Si tiene fibra significativa
        - Cualquier nutriente destacable

        **🍴 Análisis de la comida:**
        - ¿Qué tipo de comida es? (desayuno/almuerzo/cena/snack)
        - Calorías totales estimadas
        - ¿Está balanceada nutricionalmente?
        - Puntuación de salud del 1 al 10 y por qué

        **💡 Recomendaciones:**
        Da 2-3 consejos amigables sobre:
        - Aspectos positivos de esta comida
        - Qué se podría mejorar
        - Sugerencias para complementar la comida

        **🎯 Resumen rápido:**
        Termina con un resumen de una línea sobre la comida.

        INSTRUCCIONES IMPORTANTES: 
        - PRIMERO determina si hay comida en la imagen
        - Si NO hay comida, usa EXACTAMENTE el mensaje de "no es comida" de arriba
        - Si SÍ hay comida, sigue la estructura completa de análisis
        - Usa un tono conversacional y amigable
        - Evita ser demasiado técnico
        - Incluye emojis para hacer la respuesta más visual
        - Sé específico con los números pero explícalos de forma simple
        - Si no estás seguro de algo, dilo honestamente
        """

    def _process_gemini_response(self, response: Dict) -> Dict:
        """
        Process the response from Gemini API with natural language format.
        
        Args:
            response: Raw response from Gemini API
            
        Returns:
            Processed detection results with natural language analysis
        """
        try:
            # Extract text from Gemini response
            logger.info(f"Procesando respuesta de Gemini: {response}")
            
            if "candidates" in response and len(response["candidates"]) > 0:
                candidate = response["candidates"][0]
                
                # Verificar estructura de la respuesta
                if "content" not in candidate:
                    logger.error("No se encontró 'content' en la respuesta de Gemini")
                    return self._simulate_natural_response()
                
                content_data = candidate["content"]
                if "parts" not in content_data:
                    logger.error("No se encontró 'parts' en el content de Gemini")
                    return self._simulate_natural_response()
                
                if len(content_data["parts"]) == 0:
                    logger.error("Array 'parts' está vacío en la respuesta de Gemini")
                    return self._simulate_natural_response()
                
                if "text" not in content_data["parts"][0]:
                    logger.error("No se encontró 'text' en parts[0] de la respuesta de Gemini")
                    return self._simulate_natural_response()
                
                content = content_data["parts"][0]["text"]
                
                # Clean the response (remove markdown formatting if present)
                content = content.strip()
                logger.info(f"Análisis natural de Gemini recibido: {content[:200]}...")
                
                # Return the natural language response directly
                return {
                    "analysis_type": "natural_language",
                    "gemini_analysis": content,
                    "timestamp": "real_time",
                    "model_used": "gemini-2.0-flash-exp",
                    "nutrition_source": "gemini_natural"
                }
            else:
                logger.warning("No se encontraron candidates en la respuesta de Gemini")
            
        except Exception as e:
            logger.error(f"Error processing Gemini response: {str(e)}")
            import traceback
            logger.error(f"Traceback completo: {traceback.format_exc()}")
        
        logger.info("Usando análisis simulado como fallback")
        return self._simulate_natural_response()

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

    def _simulate_natural_response(self) -> Dict:
        """
        Simulate enhanced food detection in natural language for development/testing.
        
        Returns:
            Simulated natural language analysis
        """
        # Simular análisis de comida válida
        natural_analysis = """
**🍽️ ¿Qué estoy viendo?**
¡Veo un delicioso plato que parece ser una comida balanceada! Se trata de lo que parece ser pechuga de pollo acompañada de arroz blanco y brócoli fresco.

**🥘 Alimentos detectados:**

🍗 **Pechuga de pollo** - Estoy muy seguro de esta identificación
- Porción: mediana
- Peso estimado: 150 gramos
- Se ve bien cocida y jugosa

🍚 **Arroz blanco** - Bastante seguro de la identificación  
- Porción: mediana
- Peso estimado: 120 gramos
- Parece ser arroz de grano largo

🥦 **Brócoli** - Muy seguro de la identificación
- Porción: pequeña
- Peso estimado: 80 gramos
- Se ve fresco y bien verde

**📊 Información nutricional:**

El **pollo** aporta aproximadamente 248 calorías, con un excelente contenido de proteína (46.5g) y muy poca grasa (5.4g). Es prácticamente libre de carbohidratos.

El **arroz** contribuye con unas 156 calorías, principalmente de carbohidratos (33.6g), con algo de proteína (3.2g) y muy poca grasa.

El **brócoli** es el héroe nutritivo con solo 27 calorías, pero rico en fibra (2.1g) y vitaminas, aportando 2.2g de proteína vegetal.

**🍴 Análisis de la comida:**
- Tipo: Definitivamente un almuerzo o cena
- Calorías totales: Aproximadamente 431 calorías
- Balance nutricional: ¡Muy bien balanceado! 
- Puntuación de salud: 8.5/10 - ¡Excelente elección!

**💡 Recomendaciones:**

✅ **Lo que está genial:** 
- Excelente fuente de proteína magra
- Incluye vegetales frescos
- Porciones adecuadas

🌟 **Para mejorar:**
- Podrías agregar un poquito de aceite de oliva o aguacate para grasas saludables
- Una ensalada pequeña le daría más color y nutrientes

💪 **Sugerencia extra:** Este plato es perfecto si estás enfocado en mantener o ganar masa muscular.

**🎯 Resumen rápido:**
Un almuerzo saludable y balanceado que cualquier nutricionista aprobaría - ¡alta proteína, carbohidratos complejos y vegetales frescos!
        """
        
        return {
            "analysis_type": "natural_language",
            "gemini_analysis": natural_analysis,
            "timestamp": "simulation",
            "model_used": "simulation_mode",
            "nutrition_source": "simulation_natural"
        }

    def _simulate_non_food_response(self) -> Dict:
        """
        Simulate response for non-food images.
        
        Returns:
            Simulated response for non-food content
        """
        non_food_message = """¡Hola! 👋 

Soy una IA especializada en análisis nutricional de alimentos, pero parece que la imagen que subiste no contiene comida. 

🤖 **¿Qué puedo hacer por ti?**
Solo puedo analizar imágenes que contengan:
- Platos de comida preparados
- Frutas y verduras 
- Snacks y bebidas
- Ingredientes para cocinar
- Cualquier tipo de alimento

🍽️ **¿Podrías intentar de nuevo?**
Sube una foto de tu comida y te daré un análisis nutricional detallado con recomendaciones personalizadas.

¡Estoy aquí para ayudarte a llevar una alimentación más saludable! 💪✨"""
        
        return {
            "analysis_type": "natural_language",
            "gemini_analysis": non_food_message,
            "timestamp": "simulation",
            "model_used": "simulation_mode",
            "nutrition_source": "non_food_detection"
        }

    def _simulate_detection(self) -> Dict:
        """
        Mantener método original para compatibilidad con food_detection.py
        """
        return self._simulate_natural_response()

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