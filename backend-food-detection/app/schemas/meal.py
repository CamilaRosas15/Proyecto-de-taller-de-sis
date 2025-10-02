from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class MealTypeEnum(str, Enum):
    breakfast = "breakfast"
    lunch = "lunch"
    dinner = "dinner"
    snack = "snack"

class FoodCategoryEnum(str, Enum):
    protein = "protein"
    vegetable = "vegetable"
    fruit = "fruit"
    grain = "grain"
    dairy = "dairy"
    fat = "fat"
    beverage = "beverage"
    other = "other"

# Esquemas de Food
class FoodBase(BaseModel):
    name: str
    brand: Optional[str] = None
    calories_per_100g: float = Field(..., ge=0)
    protein_per_100g: float = Field(..., ge=0)
    carbs_per_100g: float = Field(..., ge=0)
    fat_per_100g: float = Field(..., ge=0)
    fiber_per_100g: float = Field(default=0.0, ge=0)
    sugar_per_100g: float = Field(default=0.0, ge=0)
    sodium_per_100g: float = Field(default=0.0, ge=0)
    category: Optional[FoodCategoryEnum] = None
    barcode: Optional[str] = None

class FoodCreate(FoodBase):
    common_portions: Optional[Dict[str, float]] = None

class FoodUpdate(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    calories_per_100g: Optional[float] = Field(None, ge=0)
    protein_per_100g: Optional[float] = Field(None, ge=0)
    carbs_per_100g: Optional[float] = Field(None, ge=0)
    fat_per_100g: Optional[float] = Field(None, ge=0)
    fiber_per_100g: Optional[float] = Field(None, ge=0)
    sugar_per_100g: Optional[float] = Field(None, ge=0)
    sodium_per_100g: Optional[float] = Field(None, ge=0)
    category: Optional[FoodCategoryEnum] = None
    common_portions: Optional[Dict[str, float]] = None

class Food(FoodBase):
    id: int
    verified: bool
    ai_confidence: Optional[float] = None
    common_portions: Optional[Dict[str, float]] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Esquemas de MealFood
class MealFoodBase(BaseModel):
    food_id: int
    quantity: float = Field(..., gt=0)  # en gramos
    portion_description: Optional[str] = None

class MealFoodCreate(MealFoodBase):
    pass

class MealFoodUpdate(BaseModel):
    quantity: Optional[float] = Field(None, gt=0)
    portion_description: Optional[str] = None

class MealFood(MealFoodBase):
    id: int
    calories: float
    protein: float
    carbs: float
    fat: float
    fiber: float
    ai_detected: bool
    ai_confidence: Optional[float] = None
    bounding_box: Optional[Dict[str, Any]] = None
    food: Food

    class Config:
        from_attributes = True

# Esquemas de Meal
class MealBase(BaseModel):
    name: Optional[str] = None
    meal_type: MealTypeEnum
    notes: Optional[str] = None

class MealCreate(MealBase):
    eaten_at: datetime
    foods: List[MealFoodCreate] = []
    local_id: Optional[str] = None  # Para sincronización offline

class MealUpdate(BaseModel):
    name: Optional[str] = None
    meal_type: Optional[MealTypeEnum] = None
    notes: Optional[str] = None
    eaten_at: Optional[datetime] = None
    manual_override: Optional[bool] = None

class Meal(MealBase):
    id: int
    user_id: int
    image_path: Optional[str] = None
    image_analysis: Optional[Dict[str, Any]] = None
    total_calories: float
    total_protein: float
    total_carbs: float
    total_fat: float
    total_fiber: float
    confidence_score: Optional[float] = None
    manual_override: bool
    eaten_at: datetime
    created_at: datetime
    synced: bool
    local_id: Optional[str] = None
    foods: List[MealFood] = []

    class Config:
        from_attributes = True

# Esquemas para análisis de imagen
class ImageAnalysisRequest(BaseModel):
    confidence_threshold: float = Field(default=0.7, ge=0.1, le=1.0)
    detect_portions: bool = True
    suggest_alternatives: bool = True

class DetectedFood(BaseModel):
    food_name: str
    confidence: float
    estimated_quantity: float  # en gramos
    bounding_box: Dict[str, float]  # {x, y, width, height}
    suggested_food_id: Optional[int] = None
    nutrition_estimate: Dict[str, float]  # {calories, protein, carbs, fat}

class ImageAnalysisResponse(BaseModel):
    analysis_id: str
    detected_foods: List[DetectedFood]
    overall_confidence: float
    processing_time: float
    suggestions: List[str] = []
    estimated_totals: Dict[str, float]

# Esquemas para búsqueda de alimentos
class FoodSearchQuery(BaseModel):
    query: str = Field(..., min_length=2)
    category: Optional[FoodCategoryEnum] = None
    verified_only: bool = False
    limit: int = Field(default=20, le=100)

class FoodSearchResult(BaseModel):
    foods: List[Food]
    total_count: int
    query: str

# Esquemas para entrada rápida de comidas
class QuickMealEntry(BaseModel):
    text_description: str = Field(..., min_length=3)
    meal_type: MealTypeEnum
    eaten_at: Optional[datetime] = None

class QuickMealResponse(BaseModel):
    suggested_foods: List[DetectedFood]
    confidence: float
    original_text: str
    parsed_meal: Optional[Meal] = None