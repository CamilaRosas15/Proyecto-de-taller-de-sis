from app.services.meal_service import MealService
from app.ai.food_detection import ImageAnalyzer
from app.ai.adaptive_learning import AdaptiveLearningEngine

# Instancias globales
_meal_service = None
_image_analyzer = None
_adaptive_engine = None

def get_meal_service(db):
    """Obtener instancia del servicio de comidas"""
    global _meal_service
    if _meal_service is None:
        _meal_service = MealService(db)
    return _meal_service

def get_image_analyzer():
    """Obtener instancia del analizador de imágenes"""
    global _image_analyzer
    if _image_analyzer is None:
        _image_analyzer = ImageAnalyzer()
    return _image_analyzer

def get_adaptive_engine():
    """Obtener instancia del motor adaptativo"""
    global _adaptive_engine
    if _adaptive_engine is None:
        _adaptive_engine = AdaptiveLearningEngine()
    return _adaptive_engine