"""
Endpoints de la API para información de modelos de IA.
Enfocado exclusivamente en Google Gemini.
Incluye:
- Detección de alimentos por imagen
- Análisis de productos por código de barras
- Análisis corporal y composición corporal por fotografía
- Recomendaciones nutricionales personalizadas
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import PlainTextResponse
from typing import Dict, List, Optional
import logging

from app.ai.food_detection import food_detector
from app.services.product_service import ProductAnalysisService
from app.ai.body_analysis_service import body_analysis_service

router = APIRouter()
logger = logging.getLogger(__name__)

# Instancia del servicio de análisis de productos
product_service = ProductAnalysisService()

def _convert_to_natural_language(result: Dict) -> str:
    """
    Convierte resultados de detección a lenguaje natural amigable.
    """
    if not result:
        return "No se pudo analizar la imagen. Por favor, intenta con otra imagen."
    
    # Verificar si ya es análisis natural
    if result.get("analysis_type") == "natural_language":
        return result.get("gemini_analysis", "Análisis no disponible")
    
    # Convertir formato anterior a lenguaje natural
    detections = result.get("detections", [])
    meal_analysis = result.get("meal_analysis", {})
    
    if not detections:
        return "No pude detectar alimentos claros en esta imagen. ¿Podrías probar con una imagen más clara?"
    
    natural_text = "🍽️ **¡Hola! Te cuento lo que veo en tu plato:**\n\n"
    
    # Describir alimentos detectados
    natural_text += "**🥘 Alimentos que identifico:**\n"
    for i, food in enumerate(detections, 1):
        food_name = food.get("class", "alimento").replace("_", " ")
        confidence = food.get("confidence", 0)
        weight = food.get("estimated_weight", 0)
        calories = food.get("nutrition", {}).get("calories", 0)
        
        confidence_text = "muy seguro" if confidence > 0.9 else "bastante seguro" if confidence > 0.7 else "posiblemente"
        
        natural_text += f"{i}. **{food_name.title()}** - Estoy {confidence_text} de esta identificación\n"
        natural_text += f"   - Peso estimado: {weight}g\n"
        natural_text += f"   - Calorías: {calories} kcal\n\n"
    
    # Análisis nutricional total
    total_calories = meal_analysis.get("total_calories", 0)
    meal_type = meal_analysis.get("meal_type", "comida")
    health_score = meal_analysis.get("health_score", 5)
    
    natural_text += f"**📊 Análisis general:**\n"
    natural_text += f"- Tipo de comida: {meal_type}\n"
    natural_text += f"- Calorías totales: {total_calories} kcal\n"
    natural_text += f"- Puntuación de salud: {health_score}/10\n\n"
    
    # Recomendaciones
    recommendations = meal_analysis.get("recommendations", [])
    if recommendations:
        natural_text += "**💡 Mis recomendaciones:**\n"
        for rec in recommendations:
            natural_text += f"- {rec}\n"
    
    natural_text += "\n🎯 **En resumen:** "
    if health_score >= 8:
        natural_text += "¡Excelente elección! Esta comida está muy balanceada."
    elif health_score >= 6:
        natural_text += "Buena comida, con algunos ajustes podría ser perfecta."
    else:
        natural_text += "Está bien, pero hay muchas oportunidades para hacerla más saludable."
    
    return natural_text

@router.get("/model-info", response_model=Dict)
async def get_model_info():
    """
    Obtiene información detallada sobre el modelo Gemini.
    """
    try:
        info = food_detector.get_model_info()
        return {
            "success": True,
            "model_info": info,
            "message": "Información del modelo obtenida exitosamente"
        }
    except Exception as e:
        logger.error(f"Error obteniendo información del modelo: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/supported-foods", response_model=Dict)
async def get_supported_foods():
    """
    Obtiene información sobre las capacidades de detección de alimentos de Gemini.
    """
    try:
        foods_info = food_detector.get_supported_foods()
        return {
            "success": True,
            "food_detection_info": foods_info,
            "message": "Información de capacidades de detección obtenida exitosamente"
        }
    except Exception as e:
        logger.error(f"Error obteniendo información de alimentos: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/test-detection", response_model=Dict)
async def test_detection(file: UploadFile = File(...)):
    """
    Prueba la detección de alimentos con una imagen usando Gemini.
    """
    try:
        # Validar tipo de archivo
        if not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400, 
                detail="El archivo debe ser una imagen"
            )
        
        # Leer datos de la imagen
        image_data = await file.read()
        
        # Realizar detección
        result = await food_detector.detect_objects(image_data)
        
        return {
            "success": True,
            "detection_result": result,
            "filename": file.filename,
            "message": "Detección completada exitosamente"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en detección de prueba: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze-food-natural")
async def analyze_food_natural(file: UploadFile = File(...)):
    """
    Analiza alimentos en una imagen y devuelve respuesta en lenguaje natural directo.
    """
    try:
        # Validar tipo de archivo
        if not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400, 
                detail="El archivo debe ser una imagen"
            )
        
        # Leer datos de la imagen
        image_data = await file.read()
        
        # Realizar detección
        result = await food_detector.detect_objects(image_data)
        
        # Si es análisis en lenguaje natural, devolver directamente el texto
        if result.get("analysis_type") == "natural_language":
            from fastapi.responses import PlainTextResponse
            return PlainTextResponse(
                content=result.get("gemini_analysis", "No se pudo analizar la imagen"),
                media_type="text/plain; charset=utf-8"
            )
        else:
            # Si es el formato antiguo, convertir a texto amigable
            return PlainTextResponse(
                content=_convert_to_natural_language(result),
                media_type="text/plain; charset=utf-8"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en análisis natural: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/nutrition-database", response_model=Dict)
async def get_nutrition_database():
    """
    Obtiene información sobre la base de datos nutricional de Gemini.
    """
    try:
        # Información sobre las capacidades nutricionales de Gemini
        nutrition_info = {
            "database_type": "AI-powered nutritional analysis",
            "provider": "Google Gemini 1.5 Flash",
            "capabilities": [
                "Cálculo automático de calorías",
                "Análisis de macronutrientes (proteínas, carbohidratos, grasas)",
                "Estimación de micronutrientes",
                "Análisis de fibra y azúcares",
                "Evaluación nutricional completa",
                "Recomendaciones personalizadas"
            ],
            "accuracy": "Alta precisión basada en análisis visual y base de datos USDA",
            "supported_nutrients": [
                "calories", "protein", "carbs", "fat", "fiber", 
                "sugar", "sodium", "calcium", "iron", "vitamin_c"
            ],
            "portion_estimation": "Estimación automática basada en análisis visual",
            "meal_analysis": "Análisis completo de comidas y balance nutricional",
            "total_foods": len(food_detector.get_supported_foods()),
            "update_frequency": "Tiempo real con cada análisis"
        }
        
        return {
            "success": True,
            "nutrition_database": nutrition_info,
            "message": "Información de base de datos nutricional obtenida exitosamente"
        }
        
    except Exception as e:
        logger.error(f"Error obteniendo información nutricional: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/gemini-status", response_model=Dict)
async def get_gemini_status():
    """
    Obtiene el estado actual de la integración con Gemini.
    """
    try:
        model_info = food_detector.get_model_info()
        
        status_info = {
            "gemini_configured": model_info["api_configured"],
            "status": model_info["status"],
            "model_name": model_info["model_name"],
            "provider": model_info["provider"],
            "capabilities": model_info["capabilities"],
            "features": model_info["features"],
            "supported_foods_count": model_info["supported_foods_count"],
            "confidence_threshold": model_info["confidence_threshold"],
            "ready_for_production": model_info["api_configured"] and model_info["status"] == "active"
        }
        
        return {
            "success": True,
            "gemini_status": status_info,
            "message": "Estado de Gemini obtenido exitosamente"
        }
        
    except Exception as e:
        logger.error(f"Error obteniendo estado de Gemini: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/optimization-info", response_model=Dict)
async def get_optimization_info():
    """
    Obtiene información sobre la estrategia de optimización de tokens implementada.
    """
    try:
        # Verificar si el detector está disponible
        if food_detector.detector:
            optimization_info = food_detector.detector.get_optimization_info()
        else:
            # Información de optimización para modo simulación
            optimization_info = {
                "strategy": "simulation_mode",
                "description": "Modo simulación - API key de Gemini no configurada",
                "features": {
                    "single_api_call": False,
                    "gemini_nutrition": False,
                    "local_fallback": True,
                    "enhanced_analysis": False,
                    "health_scoring": True,
                    "recommendations": True
                },
                "benefits": [
                    "Permite desarrollo sin API key",
                    "Respuestas consistentes para testing",
                    "Datos nutricionales básicos incluidos"
                ],
                "token_optimization": {
                    "current_status": "Simulación activa",
                    "note": "Para optimización real, configura GEMINI_API_KEY",
                    "potential_savings": "30-40% con API key real"
                }
            }
        
        return {
            "success": True,
            "optimization": optimization_info,
            "message": "Información de optimización obtenida exitosamente"
        }
        
    except Exception as e:
        logger.error(f"Error obteniendo información de optimización: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/system-health", response_model=Dict)
async def get_system_health():
    """
    Obtiene información sobre la salud general del sistema de IA.
    """
    try:
        model_info = food_detector.get_model_info()
        
        health_info = {
            "overall_status": "healthy" if model_info["api_configured"] else "needs_configuration",
            "ai_backend": "Google Gemini",
            "api_status": "configured" if model_info["api_configured"] else "not_configured",
            "detection_ready": model_info["status"] == "active",
            "last_check": "real_time",
            "recommendations": []
        }
        
        # Agregar recomendaciones basadas en el estado
        if not model_info["api_configured"]:
            health_info["recommendations"].append(
                "Configura GEMINI_API_KEY en las variables de entorno"
            )
        else:
            health_info["recommendations"].append(
                "Sistema listo para detección de alimentos"
            )
        
        return {
            "success": True,
            "system_health": health_info,
            "message": "Información de salud del sistema obtenida exitosamente"
        }
        
    except Exception as e:
        logger.error(f"Error obteniendo salud del sistema: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/barcode-scan", response_model=Dict)
async def scan_barcode(file: UploadFile = File(...)):
    """
    Analiza un producto a partir de una imagen de código de barras.
    Detecta el código de barras, obtiene información del producto y realiza análisis nutricional.
    """
    try:
        # Validar tipo de archivo
        if not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400, 
                detail="El archivo debe ser una imagen"
            )
        
        # Leer datos de la imagen
        image_data = await file.read()
        
        # Analizar producto por código de barras
        result = await product_service.analyze_product_by_barcode(image_data)
        
        return {
            "success": True,
            "product_analysis": result,
            "filename": file.filename,
            "message": "Análisis de código de barras completado exitosamente"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en análisis de código de barras: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/barcode-manual", response_model=Dict)
async def analyze_barcode_manual(barcode: str = Form(...)):
    """
    Analiza un producto a partir de un código de barras ingresado manualmente.
    Obtiene información del producto y realiza análisis nutricional.
    """
    try:
        # Validar formato del código de barras
        if not barcode.isdigit() or len(barcode) not in [8, 12, 13, 14]:
            raise HTTPException(
                status_code=400,
                detail="El código de barras debe contener solo números y tener 8, 12, 13 o 14 dígitos"
            )
        
        # Analizar producto por código de barras manual
        result = await product_service.analyze_product_by_manual_barcode(barcode)
        
        return {
            "success": True,
            "product_analysis": result,
            "barcode": barcode,
            "message": "Análisis de código de barras manual completado exitosamente"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en análisis de código de barras manual: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/barcode-info", response_model=Dict)
async def get_barcode_info():
    """
    Obtiene información sobre las capacidades de análisis de códigos de barras.
    """
    try:
        barcode_info = {
            "supported_formats": [
                "EAN-13 (más común en Perú y el mundo)",
                "EAN-8 (productos pequeños)",
                "UPC-A (productos de Estados Unidos)",
                "UPC-E (versión compacta de UPC-A)"
            ],
            "peru_specific": {
                "country_code": "775",
                "description": "Los productos fabricados en Perú tienen códigos que empiezan con 775",
                "coverage": "Buena cobertura en OpenFoodFacts para productos peruanos"
            },
            "data_sources": [
                {
                    "name": "OpenFoodFacts",
                    "description": "Base de datos colaborativa mundial de productos alimentarios",
                    "coverage": "Excelente para productos internacionales y peruanos conocidos",
                    "cost": "Completamente gratuito",
                    "api_key_required": False,
                    "priority": 1,
                    "status": "Siempre disponible"
                },
                {
                    "name": "UPC Database",
                    "description": "Base de datos comercial de códigos UPC/EAN",
                    "coverage": "Buena para productos que no están en OpenFoodFacts",
                    "cost": "Requiere suscripción y tarjeta de crédito",
                    "api_key_required": True,
                    "priority": 2,
                    "status": "Opcional - No recomendado"
                }
            ],
            "ai_analysis": {
                "provider": "Google Gemini 1.5 Flash",
                "capabilities": [
                    "Análisis nutricional detallado",
                    "Evaluación de nivel de procesamiento",
                    "Recomendaciones de salud",
                    "Análisis de sostenibilidad",
                    "Comparación con alternativas saludables"
                ]
            },
            "fallback_strategy": "Si no se encuentra el código, se puede usar detección de imagen del producto",
            "response_time": "2-5 segundos promedio"
        }
        
        return {
            "success": True,
            "barcode_capabilities": barcode_info,
            "message": "Información de capacidades de códigos de barras obtenida exitosamente"
        }
        
    except Exception as e:
        logger.error(f"Error obteniendo información de códigos de barras: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/body-analysis", response_model=Dict)
async def analyze_body_photo(
    file: UploadFile = File(...),
    age: Optional[int] = Form(None),
    height: Optional[float] = Form(None),
    weight: Optional[float] = Form(None),
    gender: Optional[str] = Form(None),
    activity_level: Optional[str] = Form(None),
    dietary_restrictions: Optional[str] = Form(None)
):
    """
    Analiza una fotografía corporal para estimar composición corporal y generar recomendaciones nutricionales.
    
    Parámetros opcionales del usuario:
    - age: Edad en años
    - height: Altura en centímetros
    - weight: Peso en kilogramos
    - gender: Sexo (masculino/femenino)
    - activity_level: Nivel de actividad (sedentario/ligero/moderado/intenso)
    - dietary_restrictions: Restricciones dietéticas
    """
    try:
        # Validar tipo de archivo
        if not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400, 
                detail="El archivo debe ser una imagen"
            )
        
        # Leer datos de la imagen
        image_data = await file.read()
        
        # Preparar información del usuario
        user_info = {}
        if age is not None:
            user_info["age"] = age
        if height is not None:
            user_info["height"] = height
        if weight is not None:
            user_info["weight"] = weight
        if gender is not None:
            user_info["gender"] = gender
        if activity_level is not None:
            user_info["activity_level"] = activity_level
        if dietary_restrictions is not None:
            user_info["dietary_restrictions"] = dietary_restrictions
        
        # Realizar análisis corporal completo
        result = body_analysis_service.analyze_body_photo(image_data, user_info)
        
        return {
            "success": True,
            "body_analysis": result,
            "filename": file.filename,
            "user_info_provided": user_info,
            "message": "Análisis corporal completado exitosamente"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en análisis corporal: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/body-analysis-info", response_model=Dict)
async def get_body_analysis_info():
    """
    Obtiene información sobre las capacidades de análisis corporal.
    """
    try:
        analysis_info = body_analysis_service.get_service_info()
        
        return {
            "success": True,
            "body_analysis_capabilities": analysis_info,
            "message": "Información de capacidades de análisis corporal obtenida exitosamente"
        }
        
    except Exception as e:
        logger.error(f"Error obteniendo información de análisis corporal: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/body-metrics-info", response_model=Dict)
async def get_body_metrics_info():
    """
    Obtiene información detallada sobre las métricas corporales que se pueden analizar.
    """
    try:
        metrics_info = {
            "primary_metrics": {
                "body_fat_percentage": {
                    "description": "Estimación del porcentaje de grasa corporal",
                    "accuracy": "Estimativo basado en análisis visual",
                    "range": "5-50%",
                    "factors": ["Definición muscular visible", "Distribución de grasa", "Tipo corporal"]
                },
                "body_type": {
                    "description": "Clasificación del somatotipo corporal",
                    "categories": ["Ectomorfo", "Mesomorfo", "Endomorfo", "Mixto"],
                    "characteristics": {
                        "ectomorfo": "Delgado, metabolismo rápido, dificultad para ganar peso",
                        "mesomorfo": "Atlético, gana músculo fácilmente, metabolismo eficiente",
                        "endomorfo": "Tendencia a acumular grasa, metabolismo lento"
                    }
                },
                "muscle_mass_level": {
                    "description": "Evaluación del nivel de masa muscular",
                    "levels": ["Bajo", "Medio", "Alto"],
                    "indicators": ["Definición muscular", "Volumen aparente", "Proporción corporal"]
                }
            },
            "secondary_metrics": {
                "posture_assessment": {
                    "description": "Evaluación básica de la postura corporal",
                    "aspects": ["Alineación de hombros", "Curvatura espinal aparente", "Posición de cabeza"]
                },
                "fitness_level": {
                    "description": "Impresión general del nivel de condición física",
                    "indicators": ["Tono muscular", "Definición", "Proporción corporal"]
                },
                "health_indicators": {
                    "description": "Indicadores visuales de salud general",
                    "aspects": ["Apariencia de la piel", "Distribución de peso", "Vitalidad general"]
                }
            },
            "nutritional_recommendations": {
                "caloric_needs": "Estimación de necesidades calóricas diarias",
                "macronutrient_distribution": "Distribución recomendada de proteínas, carbohidratos y grasas",
                "meal_timing": "Recomendaciones de horarios y frecuencia de comidas",
                "specific_foods": "Alimentos recomendados según objetivos corporales"
            },
            "accuracy_factors": [
                "Calidad y resolución de la imagen",
                "Iluminación adecuada",
                "Ángulo de la fotografía (frontal o lateral)",
                "Ropa ajustada o mínima para mejor evaluación",
                "Información adicional del usuario (edad, altura, peso)"
            ],
            "limitations": [
                "Análisis estimativo, no diagnóstico médico",
                "Precisión variable según calidad de imagen",
                "No reemplaza mediciones profesionales",
                "Requiere validación con profesionales de la salud"
            ],
            "best_practices": {
                "photo_guidelines": [
                    "Tomar foto de cuerpo completo",
                    "Usar buena iluminación natural",
                    "Mantener postura natural y relajada",
                    "Usar ropa ajustada o deportiva",
                    "Incluir vista frontal y/o lateral"
                ],
                "data_input": [
                    "Proporcionar edad para mejor precisión",
                    "Incluir altura y peso si están disponibles",
                    "Especificar nivel de actividad física",
                    "Mencionar restricciones dietéticas relevantes"
                ]
            }
        }
        
        return {
            "success": True,
            "body_metrics_info": metrics_info,
            "message": "Información detallada de métricas corporales obtenida exitosamente"
        }
        
    except Exception as e:
        logger.error(f"Error obteniendo información de métricas corporales: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))