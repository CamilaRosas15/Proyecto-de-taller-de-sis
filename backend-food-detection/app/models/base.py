# Importar todos los modelos para que SQLAlchemy los reconozca
from app.core.database import Base
from app.models.user import User
from app.models.meal import Meal, MealFood, Food
from app.models.progress import WeightEntry, DailyStats
from app.models.sync import SyncData

# Exportar Base para usar en main.py
__all__ = ["Base"]