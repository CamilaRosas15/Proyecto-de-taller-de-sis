"""
Servicio de análisis de productos con códigos de barras
Integra detección de códigos de barras con análisis nutricional de Gemini
"""

import logging
from typing import Dict, Optional
import json
from app.ai.barcode_detector import BarcodeDetector
from app.ai.gemini_detector import GeminiFoodDetector
from app.core.config import settings

logger = logging.getLogger(__name__)

class ProductAnalysisService:
    """
    Servicio que combina detección de códigos de barras con análisis nutricional de Gemini
    """
    
    def __init__(self):
        self.barcode_detector = BarcodeDetector()
        self.gemini_detector = GeminiFoodDetector()
        
    def analyze_product_by_barcode(self, barcode: str) -> Dict:
        """
        Analiza un producto usando su código de barras
        
        Args:
            barcode: Código de barras del producto
            
        Returns:
            Análisis completo del producto con información nutricional y recomendaciones
        """
        try:
            # 1. Obtener información básica del producto
            product_info = self.barcode_detector.get_product_info(barcode)
            
            if not product_info.get("found"):
                return self._create_not_found_response(barcode, product_info)
            
            # 2. Analizar formato del código de barras
            barcode_analysis = self.barcode_detector.analyze_barcode_format(barcode)
            
            # 3. Generar análisis nutricional con Gemini
            gemini_analysis = self._generate_gemini_analysis(product_info)
            
            # 4. Combinar toda la información
            complete_analysis = {
                "success": True,
                "barcode_info": {
                    "barcode": barcode,
                    "format": barcode_analysis.get("format", "Unknown"),
                    "country": barcode_analysis.get("country", "No identificado"),
                    "is_peruvian_product": barcode_analysis.get("is_peruvian", False)
                },
                "product_info": {
                    "name": product_info.get("product_name", "Producto sin nombre"),
                    "brand": product_info.get("brand", "Marca no especificada"),
                    "category": product_info.get("category", "Categoría no especificada"),
                    "image_url": product_info.get("image_url", ""),
                    "ingredients": product_info.get("ingredients", "No disponibles"),
                    "country_origin": product_info.get("country_origin", "No especificado"),
                    "packaging": product_info.get("packaging", "No especificado"),
                    "allergens": product_info.get("allergens", "No especificados"),
                    "labels": product_info.get("labels", ""),
                    "data_source": product_info.get("source", "Unknown")
                },
                "nutrition_analysis": self._process_nutrition_data(product_info),
                "health_analysis": gemini_analysis,
                "recommendations": self._generate_recommendations(product_info, gemini_analysis),
                "processing_level": self._determine_processing_level(product_info),
                "sustainability_info": self._get_sustainability_info(product_info)
            }
            
            return complete_analysis
            
        except Exception as e:
            logger.error(f"Error analizando producto por código de barras: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "barcode": barcode,
                "message": "Error interno del servidor"
            }
    
    def analyze_product_by_image(self, image_data: bytes) -> Dict:
        """
        Analiza un producto detectando el código de barras en una imagen
        
        Args:
            image_data: Datos de la imagen en bytes
            
        Returns:
            Análisis completo del producto
        """
        try:
            # 1. Detectar códigos de barras en la imagen
            detected_barcodes = self.barcode_detector.detect_barcode_from_image(image_data)
            
            if not detected_barcodes:
                return {
                    "success": False,
                    "message": "No se detectaron códigos de barras en la imagen",
                    "suggestion": "Asegúrate de que el código de barras esté visible y enfocado",
                    "alternative": "Puedes usar la detección de alimentos por imagen como alternativa"
                }
            
            # 2. Analizar el primer código de barras detectado
            primary_barcode = detected_barcodes[0]
            analysis = self.analyze_product_by_barcode(primary_barcode)
            
            # 3. Agregar información sobre la detección
            if analysis.get("success"):
                analysis["detection_info"] = {
                    "total_barcodes_detected": len(detected_barcodes),
                    "all_detected_barcodes": detected_barcodes,
                    "primary_barcode_used": primary_barcode,
                    "detection_method": "image_scan"
                }
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error analizando producto por imagen: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": "Error procesando la imagen"
            }
    
    def _generate_gemini_analysis(self, product_info: Dict) -> Dict:
        """
        Genera análisis nutricional y de salud usando Gemini
        """
        try:
            # Crear prompt específico para análisis de productos
            product_name = product_info.get("product_name", "Producto")
            ingredients = product_info.get("ingredients", "No disponibles")
            nutrition = product_info.get("nutrition_per_100g", {})
            category = product_info.get("category", "")
            
            # Prompt para Gemini
            prompt = f"""
            Analiza este producto alimenticio y proporciona un análisis nutricional y de salud en ESPAÑOL:
            
            Producto: {product_name}
            Categoría: {category}
            Ingredientes: {ingredients}
            Información nutricional por 100g: {json.dumps(nutrition, indent=2)}
            
            Proporciona un análisis que incluya:
            1. Puntuación de salud (1-10, donde 10 es muy saludable)
            2. Nivel de procesamiento (mínimo/moderado/alto/ultra-procesado)
            3. Principales beneficios nutricionales
            4. Principales preocupaciones nutricionales
            5. Recomendaciones de consumo
            6. Alternativas más saludables si aplica
            
            Responde en formato JSON con esta estructura:
            {{
                "health_score": 7.5,
                "processing_level": "moderado",
                "benefits": ["Beneficio 1", "Beneficio 2"],
                "concerns": ["Preocupación 1", "Preocupación 2"],
                "consumption_recommendation": "Recomendación específica",
                "healthier_alternatives": ["Alternativa 1", "Alternativa 2"],
                "summary": "Resumen general del producto"
            }}
            
            IMPORTANTE: Todas las respuestas deben estar en ESPAÑOL.
            """
            
            # Si Gemini está configurado, usar análisis real
            if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "your-gemini-api-key-here":
                # Aquí iría la llamada real a Gemini
                # Por ahora, simulamos una respuesta
                pass
            
            # Análisis basado en datos nutricionales disponibles
            return self._analyze_nutrition_data(nutrition, product_name, category)
            
        except Exception as e:
            logger.error(f"Error generando análisis con Gemini: {str(e)}")
            return self._get_default_analysis()
    
    def _analyze_nutrition_data(self, nutrition: Dict, product_name: str, category: str) -> Dict:
        """
        Analiza datos nutricionales y genera puntuación de salud
        """
        try:
            calories = nutrition.get("calories", 0)
            protein = nutrition.get("protein", 0)
            carbs = nutrition.get("carbs", 0)
            fat = nutrition.get("fat", 0)
            fiber = nutrition.get("fiber", 0)
            sugar = nutrition.get("sugar", 0)
            sodium = nutrition.get("sodium", 0)
            
            # Calcular puntuación de salud (1-10)
            health_score = 5.0  # Base
            
            # Factores positivos
            if protein > 10:
                health_score += 1.0
            if fiber > 3:
                health_score += 1.0
            if calories < 100:
                health_score += 0.5
            
            # Factores negativos
            if sugar > 15:
                health_score -= 1.5
            if sodium > 500:
                health_score -= 1.0
            if fat > 20:
                health_score -= 0.5
            if calories > 400:
                health_score -= 1.0
            
            # Ajustar por categoría
            if "bebida" in category.lower() and sugar > 10:
                health_score -= 2.0
            if "snack" in category.lower() or "dulce" in category.lower():
                health_score -= 1.0
            
            health_score = max(1.0, min(10.0, health_score))
            
            # Determinar nivel de procesamiento
            processing_level = self._determine_processing_by_nutrition(nutrition, product_name)
            
            # Generar beneficios y preocupaciones
            benefits = self._identify_benefits(nutrition)
            concerns = self._identify_concerns(nutrition)
            
            return {
                "health_score": round(health_score, 1),
                "processing_level": processing_level,
                "benefits": benefits,
                "concerns": concerns,
                "consumption_recommendation": self._get_consumption_recommendation(health_score),
                "healthier_alternatives": self._suggest_alternatives(category, health_score),
                "summary": self._generate_summary(product_name, health_score, processing_level)
            }
            
        except Exception as e:
            logger.error(f"Error analizando datos nutricionales: {str(e)}")
            return self._get_default_analysis()
    
    def _determine_processing_by_nutrition(self, nutrition: Dict, product_name: str) -> str:
        """
        Determina el nivel de procesamiento basado en información nutricional
        """
        sodium = nutrition.get("sodium", 0)
        sugar = nutrition.get("sugar", 0)
        
        # Palabras clave que indican alto procesamiento
        ultra_processed_keywords = ["refresco", "gaseosa", "chips", "galleta", "dulce", "caramelo"]
        
        if any(keyword in product_name.lower() for keyword in ultra_processed_keywords):
            return "ultra-procesado"
        elif sodium > 600 or sugar > 20:
            return "alto"
        elif sodium > 300 or sugar > 10:
            return "moderado"
        else:
            return "mínimo"
    
    def _identify_benefits(self, nutrition: Dict) -> list:
        """
        Identifica beneficios nutricionales
        """
        benefits = []
        
        if nutrition.get("protein", 0) > 10:
            benefits.append("Buena fuente de proteína")
        if nutrition.get("fiber", 0) > 3:
            benefits.append("Rico en fibra")
        if nutrition.get("calcium", 0) > 100:
            benefits.append("Fuente de calcio")
        if nutrition.get("iron", 0) > 2:
            benefits.append("Contiene hierro")
        if nutrition.get("vitamin_c", 0) > 10:
            benefits.append("Fuente de vitamina C")
        if nutrition.get("calories", 0) < 100:
            benefits.append("Bajo en calorías")
        
        return benefits if benefits else ["Proporciona energía"]
    
    def _identify_concerns(self, nutrition: Dict) -> list:
        """
        Identifica preocupaciones nutricionales
        """
        concerns = []
        
        if nutrition.get("sugar", 0) > 15:
            concerns.append("Alto contenido de azúcar")
        if nutrition.get("sodium", 0) > 500:
            concerns.append("Alto contenido de sodio")
        if nutrition.get("saturated_fat", 0) > 5:
            concerns.append("Alto en grasas saturadas")
        if nutrition.get("calories", 0) > 400:
            concerns.append("Alto en calorías")
        
        return concerns if concerns else ["Sin preocupaciones nutricionales significativas"]
    
    def _get_consumption_recommendation(self, health_score: float) -> str:
        """
        Genera recomendación de consumo basada en puntuación de salud
        """
        if health_score >= 8:
            return "Excelente opción, puede consumirse regularmente como parte de una dieta equilibrada"
        elif health_score >= 6:
            return "Buena opción, consumir con moderación dentro de una dieta balanceada"
        elif health_score >= 4:
            return "Consumir ocasionalmente, no como parte regular de la dieta"
        else:
            return "Limitar el consumo, buscar alternativas más saludables"
    
    def _suggest_alternatives(self, category: str, health_score: float) -> list:
        """
        Sugiere alternativas más saludables
        """
        if health_score >= 7:
            return ["El producto ya es una opción saludable"]
        
        alternatives = []
        category_lower = category.lower()
        
        if "bebida" in category_lower:
            alternatives = ["Agua natural", "Agua con limón", "Té sin azúcar", "Agua de frutas naturales"]
        elif "snack" in category_lower:
            alternatives = ["Frutas frescas", "Frutos secos", "Yogur natural", "Verduras con hummus"]
        elif "dulce" in category_lower:
            alternatives = ["Frutas frescas", "Yogur con miel", "Chocolate negro 70%+", "Frutos secos"]
        else:
            alternatives = ["Opciones integrales", "Productos con menos azúcar", "Alternativas caseras", "Productos orgánicos"]
        
        return alternatives
    
    def _generate_summary(self, product_name: str, health_score: float, processing_level: str) -> str:
        """
        Genera resumen del análisis
        """
        if health_score >= 8:
            return f"{product_name} es una excelente opción nutricional con procesamiento {processing_level}."
        elif health_score >= 6:
            return f"{product_name} es una buena opción con procesamiento {processing_level}, adecuado para consumo moderado."
        elif health_score >= 4:
            return f"{product_name} tiene procesamiento {processing_level} y debe consumirse ocasionalmente."
        else:
            return f"{product_name} es un producto {processing_level} que debe limitarse en la dieta."
    
    def _process_nutrition_data(self, product_info: Dict) -> Dict:
        """
        Procesa y estructura los datos nutricionales
        """
        nutrition_100g = product_info.get("nutrition_per_100g", {})
        serving_size = product_info.get("serving_size", "100g")
        
        # Calcular nutrición por porción si se conoce el tamaño
        nutrition_per_serving = {}
        if serving_size and serving_size != "100g":
            try:
                # Extraer número del tamaño de porción
                serving_grams = float(''.join(filter(str.isdigit, serving_size)))
                if serving_grams > 0:
                    multiplier = serving_grams / 100
                    for key, value in nutrition_100g.items():
                        if isinstance(value, (int, float)):
                            nutrition_per_serving[key] = round(value * multiplier, 1)
            except:
                nutrition_per_serving = nutrition_100g
        else:
            nutrition_per_serving = nutrition_100g
        
        return {
            "per_100g": nutrition_100g,
            "per_serving": {
                "serving_size": serving_size,
                "nutrition": nutrition_per_serving
            },
            "units": {
                "calories": "kcal",
                "protein": "g",
                "carbs": "g",
                "fat": "g",
                "fiber": "g",
                "sugar": "g",
                "sodium": "mg",
                "calcium": "mg",
                "iron": "mg",
                "vitamin_c": "mg"
            }
        }
    
    def _generate_recommendations(self, product_info: Dict, health_analysis: Dict) -> list:
        """
        Genera recomendaciones personalizadas
        """
        recommendations = []
        
        # Recomendaciones basadas en puntuación de salud
        health_score = health_analysis.get("health_score", 5)
        
        if health_score < 4:
            recommendations.append("Considera limitar el consumo de este producto")
            recommendations.append("Busca alternativas más saludables en la misma categoría")
        
        # Recomendaciones específicas para productos peruanos
        if product_info.get("is_peruvian_product"):
            recommendations.append("Producto peruano - apoya la industria local")
        
        # Recomendaciones basadas en preocupaciones
        concerns = health_analysis.get("concerns", [])
        if "Alto contenido de azúcar" in concerns:
            recommendations.append("Modera el consumo debido al alto contenido de azúcar")
        if "Alto contenido de sodio" in concerns:
            recommendations.append("Limita el consumo si tienes hipertensión")
        
        return recommendations if recommendations else ["Disfruta con moderación como parte de una dieta equilibrada"]
    
    def _determine_processing_level(self, product_info: Dict) -> Dict:
        """
        Determina el nivel de procesamiento del producto
        """
        nova_group = product_info.get("nova_group", 0)
        
        processing_levels = {
            1: {"level": "Mínimamente procesado", "description": "Alimentos naturales o mínimamente procesados"},
            2: {"level": "Procesado", "description": "Ingredientes culinarios procesados"},
            3: {"level": "Procesado", "description": "Alimentos procesados"},
            4: {"level": "Ultra-procesado", "description": "Productos ultra-procesados"}
        }
        
        return processing_levels.get(nova_group, {
            "level": "No determinado",
            "description": "Nivel de procesamiento no disponible"
        })
    
    def _get_sustainability_info(self, product_info: Dict) -> Dict:
        """
        Proporciona información sobre sostenibilidad
        """
        labels = product_info.get("labels", "").lower()
        
        sustainability_features = []
        if "orgánico" in labels or "organic" in labels:
            sustainability_features.append("Producto orgánico")
        if "comercio justo" in labels or "fair trade" in labels:
            sustainability_features.append("Comercio justo")
        if "local" in labels or product_info.get("is_peruvian_product"):
            sustainability_features.append("Producto local")
        
        return {
            "features": sustainability_features,
            "carbon_footprint": "Bajo" if product_info.get("is_peruvian_product") else "No determinado",
            "packaging_info": product_info.get("packaging", "No especificado")
        }
    
    def _create_not_found_response(self, barcode: str, product_info: Dict) -> Dict:
        """
        Crea respuesta para productos no encontrados
        """
        return {
            "success": False,
            "barcode": barcode,
            "message": "Producto no encontrado en las bases de datos",
            "suggestion": "Puedes intentar con la detección por imagen o agregar el producto manualmente",
            "barcode_info": self.barcode_detector.analyze_barcode_format(barcode),
            "alternative_options": [
                "Usar detección de alimentos por imagen",
                "Verificar que el código de barras esté completo",
                "Intentar con otro ángulo de la imagen"
            ]
        }
    
    def _get_default_analysis(self) -> Dict:
        """
        Análisis por defecto cuando hay errores
        """
        return {
            "health_score": 5.0,
            "processing_level": "no determinado",
            "benefits": ["Información nutricional limitada"],
            "concerns": ["Análisis completo no disponible"],
            "consumption_recommendation": "Consulta la información nutricional del empaque",
            "healthier_alternatives": ["Productos con información nutricional completa"],
            "summary": "Análisis limitado debido a información insuficiente"
        }