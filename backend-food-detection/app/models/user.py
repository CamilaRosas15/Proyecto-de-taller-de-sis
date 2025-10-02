from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    
    # Datos físicos
    age = Column(Integer)
    gender = Column(String)  # 'male', 'female', 'other'
    height = Column(Float)  # en cm
    activity_level = Column(String)  # 'sedentary', 'light', 'moderate', 'active', 'very_active'
    
    # Objetivos
    goal = Column(String)  # 'lose_weight', 'maintain', 'gain_weight', 'gain_muscle'
    target_calories = Column(Float)
    target_protein = Column(Float)
    target_carbs = Column(Float)
    target_fat = Column(Float)
    
    # Sistema adaptativo (tipo MacroFactor)
    estimated_tdee = Column(Float)  # TDEE calculado por el sistema
    tdee_confidence = Column(Float, default=0.0)  # Confianza en el cálculo (0-1)
    adaptive_calories = Column(Float)  # Calorías ajustadas automáticamente
    
    # Configuración
    is_active = Column(Boolean, default=True)
    timezone = Column(String, default="UTC")
    units = Column(String, default="metric")  # 'metric' o 'imperial'
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True))
    
    # Relaciones
    meals = relationship("Meal", back_populates="user", cascade="all, delete-orphan")
    weight_entries = relationship("WeightEntry", back_populates="user", cascade="all, delete-orphan")
    daily_stats = relationship("DailyStats", back_populates="user", cascade="all, delete-orphan")
    sync_data = relationship("SyncData", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', name='{self.full_name}')>"