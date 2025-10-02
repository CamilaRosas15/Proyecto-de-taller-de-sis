from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Date, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class WeightEntry(Base):
    __tablename__ = "weight_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    weight = Column(Float, nullable=False)  # en kg
    date = Column(Date, nullable=False, index=True)
    
    # Metadatos
    source = Column(String, default="manual")  # 'manual', 'scale_sync', 'estimated'
    notes = Column(String)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    user = relationship("User", back_populates="weight_entries")
    
    def __repr__(self):
        return f"<WeightEntry(user_id={self.user_id}, weight={self.weight}kg, date={self.date})>"

class DailyStats(Base):
    __tablename__ = "daily_stats"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False, index=True)
    
    # Consumo real del día
    consumed_calories = Column(Float, default=0.0)
    consumed_protein = Column(Float, default=0.0)
    consumed_carbs = Column(Float, default=0.0)
    consumed_fat = Column(Float, default=0.0)
    consumed_fiber = Column(Float, default=0.0)
    
    # Objetivos del día (pueden cambiar con el sistema adaptativo)
    target_calories = Column(Float)
    target_protein = Column(Float)
    target_carbs = Column(Float)
    target_fat = Column(Float)
    
    # Métricas de adherencia
    calorie_adherence = Column(Float)  # % de adherencia a calorías
    macro_adherence = Column(Float)   # % de adherencia a macros
    meal_count = Column(Integer, default=0)
    
    # Peso del día
    weight = Column(Float)  # Peso registrado ese día
    
    # Sistema adaptativo - datos para el aprendizaje
    estimated_expenditure = Column(Float)  # Gasto calórico estimado
    weight_trend = Column(Float)  # Tendencia de peso (promedio móvil)
    tdee_adjustment = Column(Float)  # Ajuste al TDEE base
    
    # Metadatos
    complete_day = Column(Boolean, default=False)  # Si el día está "cerrado"
    data_quality = Column(Float, default=1.0)  # Calidad de los datos (0-1)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    user = relationship("User", back_populates="daily_stats")
    
    def __repr__(self):
        return f"<DailyStats(user_id={self.user_id}, date={self.date}, calories={self.consumed_calories})>"

class ProgressSummary(Base):
    __tablename__ = "progress_summaries"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Período del resumen
    period_type = Column(String, nullable=False)  # 'week', 'month', 'quarter'
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    
    # Estadísticas del período
    avg_calories = Column(Float)
    avg_protein = Column(Float)
    avg_carbs = Column(Float)
    avg_fat = Column(Float)
    
    # Adherencia promedio
    avg_calorie_adherence = Column(Float)
    avg_macro_adherence = Column(Float)
    
    # Cambios en peso
    weight_start = Column(Float)
    weight_end = Column(Float)
    weight_change = Column(Float)
    weight_trend = Column(Float)
    
    # Sistema adaptativo
    tdee_start = Column(Float)
    tdee_end = Column(Float)
    tdee_confidence = Column(Float)
    
    # Métricas de calidad
    days_logged = Column(Integer)
    total_days = Column(Integer)
    logging_consistency = Column(Float)  # % de días con registro
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<ProgressSummary(user_id={self.user_id}, period={self.period_type}, start={self.start_date})>"