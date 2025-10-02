from sqlalchemy.orm import Session
from sqlalchemy import and_, func, desc
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
import uuid
import os
from pathlib import Path

from app.models.meal import Meal, MealFood, Food
from app.models.user import User
from app.models.progress import DailyStats
from app.schemas.meal import (
    MealCreate, MealUpdate, MealFoodCreate, 
    ImageAnalysisResponse, QuickMealEntry, QuickMealResponse
)
from app.ai.food_detection import ImageAnalyzer
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class MealService:
    """Servicio para gestión de comidas"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_meal(self, user_id: int, meal_data: MealCreate) -> Meal:
        """Crear nueva comida"""
        
        # Crear meal
        meal = Meal(
            user_id=user_id,
            name=meal_data.name,
            meal_type=meal_data.meal_type,
            notes=meal_data.notes,
            eaten_at=meal_data.eaten_at,
            local_id=meal_data.local_id
        )
        
        self.db.add(meal)
        self.db.flush()  # Para obtener el ID
        
        # Agregar alimentos
        total_calories = 0
        total_protein = 0
        total_carbs = 0
        total_fat = 0
        total_fiber = 0
        
        for food_data in meal_data.foods:
            meal_food = self._create_meal_food(meal.id, food_data)
            meal.foods.append(meal_food)
            
            total_calories += meal_food.calories
            total_protein += meal_food.protein
            total_carbs += meal_food.carbs
            total_fat += meal_food.fat
            total_fiber += meal_food.fiber
        
        # Actualizar totales
        meal.total_calories = total_calories
        meal.total_protein = total_protein
        meal.total_carbs = total_carbs
        meal.total_fat = total_fat
        meal.total_fiber = total_fiber
        
        self.db.commit()
        
        # Actualizar estadísticas diarias
        self._update_daily_stats(user_id, meal.eaten_at.date())
        
        return meal
    
    def _create_meal_food(self, meal_id: int, food_data: MealFoodCreate) -> MealFood:
        """Crear relación meal-food"""
        
        # Obtener información del alimento
        food = self.db.query(Food).filter(Food.id == food_data.food_id).first()
        if not food:
            raise ValueError(f"Alimento con ID {food_data.food_id} no encontrado")
        
        # Calcular macronutrientes para la cantidad específica
        multiplier = food_data.quantity / 100.0
        
        meal_food = MealFood(
            meal_id=meal_id,
            food_id=food_data.food_id,
            quantity=food_data.quantity,
            portion_description=food_data.portion_description,
            calories=food.calories_per_100g * multiplier,
            protein=food.protein_per_100g * multiplier,
            carbs=food.carbs_per_100g * multiplier,
            fat=food.fat_per_100g * multiplier,
            fiber=food.fiber_per_100g * multiplier
        )
        
        return meal_food
    
    def get_user_meals(self, user_id: int, start_date: Optional[date] = None,
                      end_date: Optional[date] = None, limit: int = 50) -> List[Meal]:
        """Obtener comidas del usuario"""
        
        query = self.db.query(Meal).filter(Meal.user_id == user_id)
        
        if start_date:
            query = query.filter(Meal.eaten_at >= start_date)
        if end_date:
            query = query.filter(Meal.eaten_at <= end_date)
        
        return query.order_by(desc(Meal.eaten_at)).limit(limit).all()
    
    def get_meal_by_id(self, meal_id: int, user_id: int) -> Optional[Meal]:
        """Obtener comida por ID"""
        return self.db.query(Meal).filter(
            and_(Meal.id == meal_id, Meal.user_id == user_id)
        ).first()
    
    def update_meal(self, meal_id: int, user_id: int, meal_data: MealUpdate) -> Optional[Meal]:
        """Actualizar comida"""
        
        meal = self.get_meal_by_id(meal_id, user_id)
        if not meal:
            return None
        
        # Actualizar campos
        for field, value in meal_data.dict(exclude_unset=True).items():
            setattr(meal, field, value)
        
        self.db.commit()
        
        # Actualizar estadísticas diarias si cambió la fecha
        self._update_daily_stats(user_id, meal.eaten_at.date())
        
        return meal
    
    def delete_meal(self, meal_id: int, user_id: int) -> bool:
        """Eliminar comida"""
        
        meal = self.get_meal_by_id(meal_id, user_id)
        if not meal:
            return False
        
        eaten_date = meal.eaten_at.date()
        
        self.db.delete(meal)
        self.db.commit()
        
        # Actualizar estadísticas diarias
        self._update_daily_stats(user_id, eaten_date)
        
        return True
    
    async def analyze_meal_image(self, image_path: str, user_id: int,
                               confidence_threshold: float = 0.7) -> ImageAnalysisResponse:
        """Analizar imagen de comida con IA"""
        
        try:
            # Analizar imagen
            analysis = await image_analyzer.analyze_food_image(image_path, confidence_threshold)
            
            # Buscar alimentos en la base de datos y sugerir IDs
            for detected_food in analysis.detected_foods:
                food = self._find_similar_food(detected_food.food_name)
                if food:
                    detected_food.suggested_food_id = food.id
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error analizando imagen: {e}")
            raise
    
    def _find_similar_food(self, food_name: str) -> Optional[Food]:
        """Buscar alimento similar en la base de datos"""
        
        # Búsqueda exacta
        food = self.db.query(Food).filter(
            func.lower(Food.name) == food_name.lower()
        ).first()
        
        if food:
            return food
        
        # Búsqueda parcial
        food = self.db.query(Food).filter(
            Food.name.ilike(f"%{food_name}%")
        ).first()
        
        return food
    
    async def create_meal_from_image(self, user_id: int, image_path: str,
                                   meal_type: str, eaten_at: datetime) -> Meal:
        """Crear comida a partir de análisis de imagen"""
        
        # Analizar imagen
        analysis = await self.analyze_meal_image(image_path, user_id)
        
        # Crear meal
        meal = Meal(
            user_id=user_id,
            meal_type=meal_type,
            eaten_at=eaten_at,
            image_path=image_path,
            image_analysis=analysis.dict(),
            confidence_score=analysis.overall_confidence
        )
        
        self.db.add(meal)
        self.db.flush()
        
        # Agregar alimentos detectados
        total_calories = 0
        total_protein = 0
        total_carbs = 0
        total_fat = 0
        total_fiber = 0
        
        for detected_food in analysis.detected_foods:
            if detected_food.suggested_food_id:
                # Crear MealFood con el alimento sugerido
                food_data = MealFoodCreate(
                    food_id=detected_food.suggested_food_id,
                    quantity=detected_food.estimated_quantity
                )
                
                meal_food = self._create_meal_food(meal.id, food_data)
                meal_food.ai_detected = True
                meal_food.ai_confidence = detected_food.confidence
                meal_food.bounding_box = detected_food.bounding_box
                
                meal.foods.append(meal_food)
                
                total_calories += meal_food.calories
                total_protein += meal_food.protein
                total_carbs += meal_food.carbs
                total_fat += meal_food.fat
                total_fiber += meal_food.fiber
        
        # Actualizar totales
        meal.total_calories = total_calories
        meal.total_protein = total_protein
        meal.total_carbs = total_carbs
        meal.total_fat = total_fat
        meal.total_fiber = total_fiber
        
        self.db.commit()
        
        # Actualizar estadísticas diarias
        self._update_daily_stats(user_id, meal.eaten_at.date())
        
        return meal
    
    async def quick_meal_entry(self, user_id: int, entry_data: QuickMealEntry) -> QuickMealResponse:
        """Entrada rápida de comida por texto"""
        
        # Procesar texto con IA (simplificado)
        suggested_foods = self._parse_meal_text(entry_data.text_description)
        
        # Calcular confianza general
        confidence = sum(food.confidence for food in suggested_foods) / len(suggested_foods) if suggested_foods else 0.0
        
        return QuickMealResponse(
            suggested_foods=suggested_foods,
            confidence=confidence,
            original_text=entry_data.text_description
        )
    
    def _parse_meal_text(self, text: str) -> List:
        """Parsear texto de comida (implementación simplificada)"""
        # En producción, esto usaría NLP más avanzado
        
        # Palabras clave básicas
        food_keywords = {
            "manzana": {"name": "apple", "quantity": 150},
            "plátano": {"name": "banana", "quantity": 120},
            "pollo": {"name": "chicken", "quantity": 100},
            "arroz": {"name": "rice", "quantity": 200},
            "pan": {"name": "bread", "quantity": 50},
            "huevo": {"name": "egg", "quantity": 50}
        }
        
        detected_foods = []
        text_lower = text.lower()
        
        for keyword, info in food_keywords.items():
            if keyword in text_lower:
                # Buscar alimento en BD
                food = self._find_similar_food(info["name"])
                if food:
                    from app.schemas.meal import DetectedFood
                    detected_food = DetectedFood(
                        food_name=info["name"],
                        confidence=0.8,
                        estimated_quantity=info["quantity"],
                        bounding_box={"x": 0, "y": 0, "width": 1, "height": 1},
                        suggested_food_id=food.id,
                        nutrition_estimate={
                            "calories": food.calories_per_100g * (info["quantity"] / 100),
                            "protein": food.protein_per_100g * (info["quantity"] / 100),
                            "carbs": food.carbs_per_100g * (info["quantity"] / 100),
                            "fat": food.fat_per_100g * (info["quantity"] / 100)
                        }
                    )
                    detected_foods.append(detected_food)
        
        return detected_foods
    
    def _update_daily_stats(self, user_id: int, target_date: date):
        """Actualizar estadísticas diarias"""
        
        # Calcular totales del día
        daily_totals = self.db.query(
            func.sum(Meal.total_calories).label('calories'),
            func.sum(Meal.total_protein).label('protein'),
            func.sum(Meal.total_carbs).label('carbs'),
            func.sum(Meal.total_fat).label('fat'),
            func.sum(Meal.total_fiber).label('fiber'),
            func.count(Meal.id).label('meal_count')
        ).filter(
            and_(
                Meal.user_id == user_id,
                func.date(Meal.eaten_at) == target_date
            )
        ).first()
        
        # Buscar o crear DailyStats
        daily_stat = self.db.query(DailyStats).filter(
            and_(DailyStats.user_id == user_id, DailyStats.date == target_date)
        ).first()
        
        if not daily_stat:
            daily_stat = DailyStats(user_id=user_id, date=target_date)
            self.db.add(daily_stat)
        
        # Actualizar valores
        daily_stat.consumed_calories = daily_totals.calories or 0
        daily_stat.consumed_protein = daily_totals.protein or 0
        daily_stat.consumed_carbs = daily_totals.carbs or 0
        daily_stat.consumed_fat = daily_totals.fat or 0
        daily_stat.consumed_fiber = daily_totals.fiber or 0
        daily_stat.meal_count = daily_totals.meal_count or 0
        
        # Calcular adherencia si hay objetivos
        user = self.db.query(User).filter(User.id == user_id).first()
        if user and user.target_calories:
            daily_stat.calorie_adherence = min(daily_stat.consumed_calories / user.target_calories, 2.0)
        
        self.db.commit()

def get_meal_service(db: Session) -> MealService:
    """Factory function para obtener instancia del servicio"""
    return MealService(db)