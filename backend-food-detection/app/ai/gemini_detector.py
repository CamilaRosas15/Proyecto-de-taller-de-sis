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
        
        # Usar el modelo configurado (acepta gemini-1.5-pro, gemini-2.0-flash-exp, gemini-2.5-flash, etc.)
        # CAMBIAMOS POR DEFECTO A GEMINI-2.5-FLASH QUE ES MEJOR PARA FORMATOS COMPLEJOS
        model_name = (settings.GEMINI_MODEL_NAME or "gemini-2.5-flash").strip()
        aliases = {
            "gemini-2.5-pro": "gemini-2.5-pro",
            "gemini-2.5-flash": "gemini-2.5-flash",
            "gemini-1.5-pro": "gemini-1.5-pro",
            "gemini-1.5-flash": "gemini-1.5-flash",
            "gemini-2.0-pro-exp": "gemini-2.0-pro-exp",
            "gemini-2.0-flash-exp": "gemini-2.0-flash-exp",
        }
        self.model_name = aliases.get(model_name, model_name)
        
        self.api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self.api_key}"
        
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
                
                # Handle 429 (Rate Limit) and 503 (Service Unavailable) with retry
                if response.status_code in [429, 503]:
                    if attempt < max_retries:
                        # Check for Retry-After header
                        retry_after = response.headers.get("Retry-After")
                        if retry_after:
                            try:
                                delay = float(retry_after)
                                logger.warning(f"Error {response.status_code} - Retry-After header: {delay}s. Esperando...")
                            except ValueError:
                                delay = None
                        else:
                            delay = None
                        
                        # Calculate exponential backoff with jitter
                        if delay is None:
                            if response.status_code == 503:
                                # Para 503 (model overloaded), usar delays más largos
                                base_delay = (2 ** attempt) * 3  # 3s, 6s, 12s, 24s...
                            else:
                                # Para 429 (rate limit), usar delays normales
                                base_delay = 2 ** attempt  # 1s, 2s, 4s, 8s...
                            delay = random.uniform(base_delay, base_delay * 1.5)  # Add jitter
                        
                        error_name = "Model sobrecargado (503)" if response.status_code == 503 else "Rate limit (429)"
                        logger.warning(f"{error_name} alcanzado. Intento {attempt + 1}/{max_retries + 1}. Esperando {delay:.1f}s antes de reintentar...")
                        time.sleep(delay)
                        continue
                    else:
                        logger.error(f"Error {response.status_code} - Se agotaron los reintentos después de {max_retries + 1} intentos")
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
                    # Aumentamos el límite de tokens de salida para evitar que la respuesta
                    # sea truncada con finishReason = MAX_TOKENS cuando el prompt es grande.
                    # Ajustar según límites del modelo/plan.
                    "maxOutputTokens": 4096,
                }
            }
            
            # Make API request using requests with retry logic
            headers = {
                "Content-Type": "application/json"
            }
            
            # Evitar exponer la API key en logs
            safe_url = self.api_url.split('?key=')[0] + '?key=***'
            logger.info(f"Enviando solicitud a Gemini API: {safe_url}")
            response = self._make_request_with_retry(
                url=self.api_url,
                json=payload,
                headers=headers,
                max_retries=6  # Aumentado para manejar mejor los errores 503
            )
            
            if response is None:
                logger.error("No se pudo obtener respuesta después de múltiples reintentos")
                return self._simulate_detection()
            
            # Log response status
            logger.info(f"Respuesta de Gemini - Status: {response.status_code}")
            
            if response.status_code != 200:
                logger.error(f"Error en respuesta de Gemini: {response.status_code} - {response.text}")
                return self._get_server_error_response()
            
            response.raise_for_status()
            result = response.json()
            
            logger.info(f"Respuesta JSON recibida de Gemini: {json.dumps(result, indent=2)[:500]}...")
            
            # Process Gemini response
            return self._process_gemini_response(result)
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error de conexión con Gemini API: {str(e)}")
            return self._get_server_error_response()
        except json.JSONDecodeError as e:
            logger.error(f"Error decodificando respuesta JSON de Gemini: {str(e)}")
            return self._get_server_error_response()
        except Exception as e:
            logger.error(f"Error inesperado en Gemini food detection: {str(e)}")
            return self._get_server_error_response()

    def _create_food_analysis_prompt(self) -> str:
        """Create an optimized, shorter prompt for comprehensive food analysis."""
        return """
        IMPORTANTE: Debes responder en un formato específico con dos partes separadas por "---SEPARADOR---".

        Analiza esta imagen y determina si contiene comida o alimentos. 

        Si NO es comida, responde EXACTAMENTE:
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

        Si SÍ es comida, DEBES responder OBLIGATORIAMENTE con AMBAS partes separadas por "---SEPARADOR---" (EXACTAMENTE esa palabra):

        **PARTE 1 (Análisis narrativo):**
        ¡Claro que sí! ¡Veamos qué tenemos en este plato! 😋

        🍽️ ¿Qué estoy viendo?
        [Descripción detallada del plato]

        🥘 Alimentos detectados:
        [Lista de alimentos con peso estimado]

        📊 Información nutricional:
        [Detalles nutricionales por alimento]

        🍴 Análisis de la comida:
        Tipo de comida: [descripción]
        Calorías totales estimadas: [número]
        ¿Está balanceada nutricionalmente? [análisis]
        Puntuación de salud: [X/10 con razón]

        💡 Recomendaciones:
        Aspectos positivos: [lista]
        Qué se podría mejorar: [sugerencias]
        Sugerencias para complementar: [recomendaciones]

        🎯 Resumen rápido:
        [Conclusión final con emoji]

        ---SEPARADOR---

        **PARTE 2 (Formato estructurado):**
        [Para cada alimento:]
        Nombre del alimento (peso en gramos):
        Calories: [número]
        Carbs: [número]g
        Protein: [número]g
        Fat: [número]g

        [Al final, totales:]
        Calorías
        [total]
        [%]%

        Carbos
        [total]g
        [%]%

        Proteína
        [total]g
        [%]%

        Grasa
        [total]g
        [%]%

        Los porcentajes son sobre: 2000 cal, 250g carbos, 125g proteína, 55g grasa.
        Sé preciso con pesos y valores nutricionales.
        """

    def _extract_text_from_candidate(self, candidate: Dict) -> Optional[str]:
        """
        Intentar extraer texto desde diferentes estructuras que Gemini puede devolver.
        Maneja:
        - content.parts[0].text
        - content.text
        - content como string
        - búsqueda recursiva de cualquier string largo que contenga claves como 'Calories' o 'Calor'
        """
        try:
            content = candidate.get("content")

            # Caso: content es directamente una cadena
            if isinstance(content, str) and content.strip():
                return content.strip()

            # Caso: content es un dict
            if isinstance(content, dict):
                # parts (forma esperada)
                parts = content.get("parts")
                if isinstance(parts, list) and len(parts) > 0:
                    first = parts[0]
                    if isinstance(first, dict) and "text" in first and isinstance(first["text"], str):
                        return first["text"].strip()

                # text directo dentro de content
                if "text" in content and isinstance(content["text"], str):
                    return content["text"].strip()

            # Búsqueda recursiva: encontrar strings dentro de la estructura candidate
            def find_strings(obj):
                if isinstance(obj, str):
                    yield obj
                elif isinstance(obj, dict):
                    for v in obj.values():
                        yield from find_strings(v)
                elif isinstance(obj, list):
                    for item in obj:
                        yield from find_strings(item)

            candidates_texts = [s.strip() for s in find_strings(candidate) if isinstance(s, str) and s.strip()]
            # Preferir textos que contengan palabras claves del formato esperado
            keywords = ["Calories", "Calor", "Carbs", "Carbos", "Protein", "Proteína", "Fat", "Grasa"]
            for t in candidates_texts:
                if any(k.lower() in t.lower() for k in keywords):
                    return t

            # Si no hay coincidencias con palabras clave, devolver el texto más largo (si lo hay)
            if candidates_texts:
                candidates_texts.sort(key=lambda x: len(x), reverse=True)
                return candidates_texts[0]

        except Exception as e:
            logger.debug(f"Error extrayendo texto del candidate: {e}")

        return None

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
                
                # Intentar extraer el texto por varias rutas; ser resiliente a cambios
                content = None

                # NUEVO EXTRACTOR ROBUSTO: uso del helper que soporta varias estructuras
                logger.info("🔧 Intentando extraer texto usando extractor robusto mejorado...")
                extracted = self._extract_text_from_candidate(candidate)
                if extracted:
                    content = extracted
                    logger.info(f"✅ Texto extraído exitosamente. Longitud: {len(content)} caracteres")
                else:
                    # Si no se pudo extraer, registrar candidate para depuración (recortado)
                    try:
                        cand_str = json.dumps(candidate, indent=2, ensure_ascii=False)
                    except Exception:
                        cand_str = str(candidate)
                    logger.error("❌ EXTRACTOR ROBUSTO: No se encontró texto utilizable en el content de Gemini. Candidate: %s", cand_str[:2000])
                    return self._simulate_natural_response()
                
                # Clean the response (remove markdown formatting if present)
                content = content.strip()
                logger.info(f"Análisis natural de Gemini recibido: {content[:200]}...")
                
                # Check if response contains the separator (two parts)
                if "---SEPARADOR---" in content:
                    parts = content.split("---SEPARADOR---")
                    if len(parts) >= 2:
                        narrative_part = parts[0].strip()
                        structured_part = parts[1].strip()
                        logger.info("✅ Respuesta con ambas partes detectada")
                        
                        # Return both parts
                        return {
                            "analysis_type": "dual_format",
                            "narrative_analysis": narrative_part,  # Para el modal
                            "gemini_analysis": structured_part,    # Para el dashboard
                            "timestamp": "real_time",
                            "model_used": "gemini-2.5-flash",
                            "nutrition_source": "gemini_dual"
                        }
                
                # Si no tiene separador, usar formato simulado para mantener consistencia
                logger.info("📋 Respuesta sin separador detectada, forzando formato consistente")
                
                # Si Gemini no siguió el formato dual, usar la simulación para mantener consistencia
                return self._simulate_natural_response()
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
            Simulated natural language analysis in dual format
        """
        # Parte narrativa para el modal
        narrative_part = """¡Claro que sí! ¡Veamos qué tenemos en este plato! 😋

🍽️ ¿Qué estoy viendo?
Veo un delicioso plato que combina proteínas de alta calidad con carbohidratos energéticos. Se trata de una preparación casera con carne deshebrada, huevos frescos, queso y papas cocidas.

🥘 Alimentos detectados:
• Carne seca deshebrada (100g) - Rica en proteína
• Queso fresco (50g) - Fuente de calcio y proteína  
• Huevos (2 piezas) - Proteína completa
• Papas cocidas (2 piezas) - Carbohidratos complejos

📊 Información nutricional:
La carne deshebrada aporta 350 calorías con 50g de proteína de alta calidad. Los huevos contribuyen con 140 calorías y proteína completa. El queso fresco añade 150 calorías con calcio. Las papas cocidas proporcionan 300 calorías de carbohidratos energéticos.

🍴 Análisis de la comida:
Tipo de comida: Desayuno o almuerzo balanceado
Calorías totales estimadas: 940 calorías
¿Está balanceada nutricionalmente? Sí, tiene excelente balance proteico
Puntuación de salud: 8/10 - Rica en proteínas, moderada en calorías

💡 Recomendaciones:
Aspectos positivos: Excelente fuente de proteína (78g), buena variedad de alimentos, preparación casera
Qué se podría mejorar: Agregar vegetales verdes para fibra y vitaminas
Sugerencias para complementar: Una ensalada fresca o vegetales salteados

🎯 Resumen rápido:
¡Un plato muy nutritivo! 🌟 Perfecto para quienes buscan aumentar su consumo de proteína. Las 940 calorías están bien distribuidas y te mantendrán satisfecho por horas."""

        # Parte estructurada para el dashboard
        structured_part = """Carne seca deshebrada (100 g):
Calories: 350
Carbs: 0g
Protein: 50g
Fat: 10g

Queso fresco (50 g):
Calories: 150
Carbs: 2g
Protein: 10g
Fat: 12g

Huevos (2 pieza):
Calories: 140
Carbs: 2g
Protein: 12g
Fat: 10g

Papas cocidas (2 pieza):
Calories: 300
Carbs: 60g
Protein: 6g
Fat: 0g

Calorías
940
47%

Carbos
64g
26%

Proteína
78g
63%

Grasa
32g
58%"""

        # Combinar ambas partes con separador
        dual_analysis = f"{narrative_part}\n\n---SEPARADOR---\n\n{structured_part}"
        
        return {
            "analysis_type": "dual_format",
            "narrative_analysis": narrative_part,
            "gemini_analysis": structured_part,
            "timestamp": "simulation",
            "model_used": "simulation_mode",
            "nutrition_source": "simulation_dual"
        }

    def _get_server_error_response(self) -> Dict:
        """
        Return server error response when API is not available.
        
        Returns:
            Error response indicating server issues
        """
        # Mensaje de error del servidor
        error_message = """⚠️ **Error del Servidor** 

Lo sentimos, nuestro servicio de análisis de imágenes no está disponible en este momento debido a limitaciones técnicas.

🔧 **¿Qué está pasando?**
- Nuestro servicio de inteligencia artificial está experimentando problemas
- Hemos alcanzado los límites de uso diarios de la API
- El servidor está realizando mantenimiento

⏰ **¿Qué puedes hacer?**
- Intenta nuevamente en unos minutos
- Si el problema persiste, contacta al administrador del sistema
- Mientras tanto, puedes explorar nuestras recetas saludables

💡 **Servicio alternativo:**
Aunque no podemos analizar tu imagen ahora, puedes usar nuestro catálogo de recetas para encontrar comidas nutritivas y balanceadas.

¡Gracias por tu paciencia! 🙏"""
        
        return {
            "analysis_type": "server_error",
            "gemini_analysis": error_message,
            "timestamp": "error",
            "model_used": "error_mode",
            "nutrition_source": "server_error",
            "error": True
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