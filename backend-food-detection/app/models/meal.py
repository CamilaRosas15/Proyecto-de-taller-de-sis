from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Food(Base):
    __tablename__ = "foods"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    brand = Column(String)
    
    # Macronutrientes por 100g
    calories_per_100g = Column(Float, nullable=False)
    protein_per_100g = Column(Float, nullable=False)
    carbs_per_100g = Column(Float, nullable=False)
    fat_per_100g = Column(Float, nullable=False)
    fiber_per_100g = Column(Float, default=0.0)
    sugar_per_100g = Column(Float, default=0.0)
    sodium_per_100g = Column(Float, default=0.0)
    
    # Metadatos
    category = Column(String)  # 'protein', 'vegetable', 'fruit', 'grain', etc.
    barcode = Column(String, unique=True, index=True)
    verified = Column(Boolean, default=False)
    
    # Datos de IA
    ai_confidence = Column(Float)  # Confianza de detección por IA
    common_portions = Column(JSON)  # Porciones comunes: {"cup": 240, "slice": 30}
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    meal_foods = relationship("MealFood", back_populates="food")
    
    def __repr__(self):
        return f"<Food(id={self.id}, name='{self.name}', calories={self.calories_per_100g})>"

class Meal(Base):
    __tablename__ = "meals"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Información básica
    name = Column(String)  # "Desayuno", "Almuerzo", etc.
    meal_type = Column(String)  # 'breakfast', 'lunch', 'dinner', 'snack'
    
    # Análisis de imagen
    image_path = Column(String)  # Ruta de la imagen original
    image_analysis = Column(JSON)  # Resultado del análisis de IA
    
    # Totales calculados
    total_calories = Column(Float, default=0.0)
    total_protein = Column(Float, default=0.0)
    total_carbs = Column(Float, default=0.0)
    total_fat = Column(Float, default=0.0)
    total_fiber = Column(Float, default=0.0)
    
    # Metadatos
    confidence_score = Column(Float)  # Confianza general del análisis
    manual_override = Column(Boolean, default=False)  # Si el usuario editó manualmente
    notes = Column(Text)
    
    # Timestamps
    eaten_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Sincronización offline
    synced = Column(Boolean, default=False)
    local_id = Column(String)  # ID local para sincronización offline
    
    # Relaciones
    user = relationship("User", back_populates="meals")
    foods = relationship("MealFood", back_populates="meal", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Meal(id={self.id}, user_id={self.user_id}, type='{self.meal_type}', calories={self.total_calories})>"

class MealFood(Base):
    __tablename__ = "meal_foods"
    
    id = Column(Integer, primary_key=True, index=True)
    meal_id = Column(Integer, ForeignKey("meals.id"), nullable=False)
    food_id = Column(Integer, ForeignKey("foods.id"), nullable=False)
    
    # Cantidad consumida
    quantity = Column(Float, nullable=False)  # en gramos
    portion_description = Column(String)  # "1 taza", "2 rebanadas", etc.
    
    # Macronutrientes calculados para esta porción
    calories = Column(Float, nullable=False)
    protein = Column(Float, nullable=False)
    carbs = Column(Float, nullable=False)
    fat = Column(Float, nullable=False)
    fiber = Column(Float, default=0.0)
    
    # Análisis de IA específico
    ai_detected = Column(Boolean, default=False)  # Si fue detectado por IA
    ai_confidence = Column(Float)  # Confianza de la detección
    bounding_box = Column(JSON)  # Coordenadas en la imagen
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    meal = relationship("Meal", back_populates="foods")
    food = relationship("Food", back_populates="meal_foods")
    
    def __repr__(self):
        return f"<MealFood(meal_id={self.meal_id}, food_id={self.food_id}, quantity={self.quantity}g)>"