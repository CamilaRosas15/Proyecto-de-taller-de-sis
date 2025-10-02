import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple
from datetime import datetime, date, timedelta
from dataclasses import dataclass
import logging
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.progress import DailyStats, WeightEntry
from app.schemas.progress import AdaptiveGoalsUpdate

logger = logging.getLogger(__name__)

@dataclass
class TDEECalculation:
    """Resultado del cálculo de TDEE"""
    estimated_tdee: float
    confidence: float
    method: str
    factors: List[str]
    adjustment_reason: str

class AdaptiveLearningEngine:
    """
    Motor de aprendizaje adaptativo tipo MacroFactor
    Ajusta automáticamente TDEE y objetivos basado en datos del usuario
    """
    
    def __init__(self):
        self.min_data_days = 14  # Mínimo de días para hacer ajustes
        self.learning_rate = 0.1  # Qué tan rápido se adapta
        self.confidence_threshold = 0.7
        
    def calculate_bmr(self, user: User, weight: float) -> float:
        """Calcular BMR usando ecuación de Mifflin-St Jeor"""
        if not user.age or not user.height or not user.gender:
            return 1800.0  # Valor por defecto
        
        if user.gender == "male":
            bmr = 10 * weight + 6.25 * user.height - 5 * user.age + 5
        else:
            bmr = 10 * weight + 6.25 * user.height - 5 * user.age - 161
        
        return bmr
    
    def get_activity_multiplier(self, activity_level: str) -> float:
        """Obtener multiplicador de actividad"""
        multipliers = {
            "sedentary": 1.2,
            "light": 1.375,
            "moderate": 1.55,
            "active": 1.725,
            "very_active": 1.9
        }
        return multipliers.get(activity_level, 1.55)
    
    def calculate_traditional_tdee(self, user: User, current_weight: float) -> float:
        """Calcular TDEE usando método tradicional"""
        bmr = self.calculate_bmr(user, current_weight)
        activity_multiplier = self.get_activity_multiplier(user.activity_level or "moderate")
        return bmr * activity_multiplier
    
    def analyze_weight_trend(self, weight_entries: List[WeightEntry], 
                           days: int = 14) -> Tuple[float, float]:
        """Analizar tendencia de peso"""
        if len(weight_entries) < 2:
            return 0.0, 0.0
        
        # Convertir a DataFrame para análisis
        df = pd.DataFrame([
            {"date": entry.date, "weight": entry.weight}
            for entry in weight_entries[-days:]
        ])
        
        if len(df) < 2:
            return 0.0, 0.0
        
        df = df.sort_values("date")
        
        # Calcular tendencia usando regresión lineal simple
        x = np.arange(len(df))
        y = df["weight"].values
        
        # Pendiente de la línea de tendencia (kg por día)
        slope = np.polyfit(x, y, 1)[0]
        
        # Convertir a kg por semana
        weekly_trend = slope * 7
        
        # Calcular R² para confianza
        correlation = np.corrcoef(x, y)[0, 1] if len(x) > 1 else 0
        confidence = abs(correlation) ** 2
        
        return weekly_trend, confidence
    
    def calculate_adaptive_tdee(self, user: User, daily_stats: List[DailyStats],
                              weight_entries: List[WeightEntry]) -> TDEECalculation:
        """Calcular TDEE adaptativo basado en datos reales"""
        
        if len(daily_stats) < self.min_data_days:
            # No hay suficientes datos, usar método tradicional
            current_weight = weight_entries[-1].weight if weight_entries else 70.0
            traditional_tdee = self.calculate_traditional_tdee(user, current_weight)
            
            return TDEECalculation(
                estimated_tdee=traditional_tdee,
                confidence=0.3,
                method="traditional",
                factors=["insufficient_data"],
                adjustment_reason="Datos insuficientes, usando cálculo tradicional"
            )
        
        # Analizar últimos 30 días
        recent_stats = daily_stats[-30:]
        recent_weights = weight_entries[-30:]
        
        # Calcular tendencia de peso
        weight_trend, weight_confidence = self.analyze_weight_trend(recent_weights)
        
        # Calcular promedio de calorías consumidas
        valid_days = [stat for stat in recent_stats if stat.consumed_calories > 0]
        
        if len(valid_days) < self.min_data_days:
            current_weight = recent_weights[-1].weight if recent_weights else 70.0
            traditional_tdee = self.calculate_traditional_tdee(user, current_weight)
            
            return TDEECalculation(
                estimated_tdee=traditional_tdee,
                confidence=0.4,
                method="traditional_fallback",
                factors=["insufficient_valid_days"],
                adjustment_reason="Pocos días con datos válidos"
            )
        
        avg_calories = np.mean([stat.consumed_calories for stat in valid_days])
        
        # Calcular TDEE basado en balance energético
        # 1 kg de grasa = ~7700 calorías
        calories_per_kg = 7700
        
        # Si está perdiendo peso: TDEE = calorías consumidas - (pérdida de peso * 7700 / días)
        # Si está ganando peso: TDEE = calorías consumidas + (ganancia de peso * 7700 / días)
        
        days_analyzed = len(valid_days)
        weight_change_total = weight_trend * (days_analyzed / 7)  # Cambio total en el período
        
        # Ajuste calórico por cambio de peso
        caloric_adjustment = (weight_change_total * calories_per_kg) / days_analyzed
        
        estimated_tdee = avg_calories + caloric_adjustment
        
        # Calcular confianza basada en varios factores
        confidence_factors = []
        
        # Factor 1: Confianza en tendencia de peso
        confidence_factors.append(weight_confidence * 0.4)
        
        # Factor 2: Consistencia en el registro
        logging_consistency = len(valid_days) / len(recent_stats)
        confidence_factors.append(logging_consistency * 0.3)
        
        # Factor 3: Estabilidad de las calorías
        calorie_std = np.std([stat.consumed_calories for stat in valid_days])
        calorie_cv = calorie_std / avg_calories if avg_calories > 0 else 1
        stability_score = max(0, 1 - calorie_cv)
        confidence_factors.append(stability_score * 0.3)
        
        total_confidence = sum(confidence_factors)
        
        # Factores que influyen en el cálculo
        factors = []
        if weight_confidence > 0.7:
            factors.append("strong_weight_trend")
        if logging_consistency > 0.8:
            factors.append("consistent_logging")
        if abs(weight_trend) < 0.1:
            factors.append("stable_weight")
        if calorie_cv < 0.2:
            factors.append("consistent_intake")
        
        # Razón del ajuste
        if abs(weight_trend) > 0.2:
            if weight_trend > 0:
                adjustment_reason = f"Ganando {abs(weight_trend):.1f}kg/semana, aumentando TDEE"
            else:
                adjustment_reason = f"Perdiendo {abs(weight_trend):.1f}kg/semana, aumentando TDEE"
        else:
            adjustment_reason = "Peso estable, TDEE basado en balance energético"
        
        # Suavizar cambios drásticos
        if user.estimated_tdee:
            max_change = user.estimated_tdee * 0.15  # Máximo 15% de cambio
            tdee_diff = estimated_tdee - user.estimated_tdee
            
            if abs(tdee_diff) > max_change:
                estimated_tdee = user.estimated_tdee + (max_change if tdee_diff > 0 else -max_change)
                factors.append("smoothed_change")
        
        return TDEECalculation(
            estimated_tdee=round(estimated_tdee),
            confidence=min(total_confidence, 1.0),
            method="adaptive",
            factors=factors,
            adjustment_reason=adjustment_reason
        )
    
    def calculate_adaptive_calories(self, user: User, estimated_tdee: float) -> float:
        """Calcular calorías objetivo adaptativas basadas en el objetivo del usuario"""
        
        goal_adjustments = {
            "lose_weight": -500,    # Déficit de 500 cal (aprox 0.5kg/semana)
            "maintain": 0,          # Mantenimiento
            "gain_weight": 300,     # Superávit de 300 cal
            "gain_muscle": 200      # Superávit moderado para ganancia muscular
        }
        
        adjustment = goal_adjustments.get(user.goal, 0)
        adaptive_calories = estimated_tdee + adjustment
        
        # Límites de seguridad
        min_calories = max(1200, estimated_tdee * 0.7)  # No menos del 70% del TDEE
        max_calories = estimated_tdee * 1.3  # No más del 130% del TDEE
        
        adaptive_calories = max(min_calories, min(adaptive_calories, max_calories))
        
        return round(adaptive_calories)
    
    def should_update_goals(self, user: User, new_tdee: float, confidence: float) -> bool:
        """Determinar si se deben actualizar los objetivos"""
        
        # No actualizar si la confianza es muy baja
        if confidence < self.confidence_threshold:
            return False
        
        # No actualizar si no hay TDEE previo
        if not user.estimated_tdee:
            return True
        
        # Calcular diferencia porcentual
        tdee_diff_pct = abs(new_tdee - user.estimated_tdee) / user.estimated_tdee
        
        # Actualizar si la diferencia es significativa (>5%)
        return tdee_diff_pct > 0.05
    
    def update_user_goals(self, db: Session, user: User, 
                         tdee_calc: TDEECalculation) -> Optional[AdaptiveGoalsUpdate]:
        """Actualizar objetivos del usuario"""
        
        if not self.should_update_goals(user, tdee_calc.estimated_tdee, tdee_calc.confidence):
            return None
        
        # Calcular nuevas calorías objetivo
        new_calories = self.calculate_adaptive_calories(user, tdee_calc.estimated_tdee)
        
        # Actualizar usuario
        user.estimated_tdee = tdee_calc.estimated_tdee
        user.tdee_confidence = tdee_calc.confidence
        user.adaptive_calories = new_calories
        
        # También actualizar target_calories si no está configurado manualmente
        if not user.target_calories or abs(user.target_calories - (user.adaptive_calories or 0)) < 50:
            user.target_calories = new_calories
        
        db.commit()
        
        return AdaptiveGoalsUpdate(
            new_tdee=tdee_calc.estimated_tdee,
            new_target_calories=new_calories,
            confidence=tdee_calc.confidence,
            adjustment_reason=tdee_calc.adjustment_reason,
            effective_date=date.today()
        )

# Instancia global del motor de aprendizaje
adaptive_engine = AdaptiveLearningEngine()