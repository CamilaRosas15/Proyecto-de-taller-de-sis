from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum

class PeriodTypeEnum(str, Enum):
    week = "week"
    month = "month"
    quarter = "quarter"
    year = "year"

class SourceEnum(str, Enum):
    manual = "manual"
    scale_sync = "scale_sync"
    estimated = "estimated"

# Esquemas de WeightEntry
class WeightEntryBase(BaseModel):
    weight: float = Field(..., gt=0)
    date: date
    source: SourceEnum = SourceEnum.manual
    notes: Optional[str] = None

class WeightEntryCreate(WeightEntryBase):
    pass

class WeightEntryUpdate(BaseModel):
    weight: Optional[float] = Field(None, gt=0)
    notes: Optional[str] = None

class WeightEntry(WeightEntryBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Esquemas de DailyStats
class DailyStatsBase(BaseModel):
    date: date
    consumed_calories: float = 0.0
    consumed_protein: float = 0.0
    consumed_carbs: float = 0.0
    consumed_fat: float = 0.0
    consumed_fiber: float = 0.0

class DailyStatsCreate(DailyStatsBase):
    target_calories: Optional[float] = None
    target_protein: Optional[float] = None
    target_carbs: Optional[float] = None
    target_fat: Optional[float] = None

class DailyStatsUpdate(BaseModel):
    consumed_calories: Optional[float] = None
    consumed_protein: Optional[float] = None
    consumed_carbs: Optional[float] = None
    consumed_fat: Optional[float] = None
    consumed_fiber: Optional[float] = None
    weight: Optional[float] = None
    complete_day: Optional[bool] = None

class DailyStats(DailyStatsBase):
    id: int
    user_id: int
    target_calories: Optional[float] = None
    target_protein: Optional[float] = None
    target_carbs: Optional[float] = None
    target_fat: Optional[float] = None
    calorie_adherence: Optional[float] = None
    macro_adherence: Optional[float] = None
    meal_count: int
    weight: Optional[float] = None
    estimated_expenditure: Optional[float] = None
    weight_trend: Optional[float] = None
    tdee_adjustment: Optional[float] = None
    complete_day: bool
    data_quality: float
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Esquemas de ProgressSummary
class ProgressSummaryBase(BaseModel):
    period_type: PeriodTypeEnum
    start_date: date
    end_date: date

class ProgressSummary(ProgressSummaryBase):
    id: int
    user_id: int
    avg_calories: Optional[float] = None
    avg_protein: Optional[float] = None
    avg_carbs: Optional[float] = None
    avg_fat: Optional[float] = None
    avg_calorie_adherence: Optional[float] = None
    avg_macro_adherence: Optional[float] = None
    weight_start: Optional[float] = None
    weight_end: Optional[float] = None
    weight_change: Optional[float] = None
    weight_trend: Optional[float] = None
    tdee_start: Optional[float] = None
    tdee_end: Optional[float] = None
    tdee_confidence: Optional[float] = None
    days_logged: int
    total_days: int
    logging_consistency: float
    created_at: datetime

    class Config:
        from_attributes = True

# Esquemas para análisis de progreso
class ProgressAnalysisRequest(BaseModel):
    start_date: date
    end_date: date
    include_predictions: bool = True
    include_trends: bool = True

class TrendData(BaseModel):
    date: date
    value: float
    trend: Optional[float] = None
    confidence: Optional[float] = None

class ProgressTrends(BaseModel):
    weight_trend: List[TrendData]
    calorie_trend: List[TrendData]
    adherence_trend: List[TrendData]
    tdee_trend: List[TrendData]

class ProgressPredictions(BaseModel):
    predicted_weight_change: float  # kg en próximas 4 semanas
    predicted_tdee: float
    confidence: float
    factors: List[str]  # Factores que influyen en la predicción

class ProgressAnalysisResponse(BaseModel):
    period: Dict[str, date]  # start_date, end_date
    summary: ProgressSummary
    trends: ProgressTrends
    predictions: Optional[ProgressPredictions] = None
    insights: List[str]  # Insights automáticos
    recommendations: List[str]  # Recomendaciones

# Esquemas para dashboard
class DashboardStats(BaseModel):
    today: DailyStats
    week_summary: Dict[str, Any]
    month_summary: Dict[str, Any]
    current_streak: int  # días consecutivos con registro
    total_days_logged: int
    weight_progress: Dict[str, Any]
    adherence_score: float

class WeeklyOverview(BaseModel):
    week_start: date
    week_end: date
    days: List[DailyStats]
    weekly_avg: Dict[str, float]
    adherence_score: float
    weight_change: Optional[float] = None
    insights: List[str]

# Esquemas para objetivos adaptativos
class AdaptiveGoalsUpdate(BaseModel):
    new_tdee: float
    new_target_calories: float
    confidence: float
    adjustment_reason: str
    effective_date: date

class AdaptiveGoalsHistory(BaseModel):
    updates: List[AdaptiveGoalsUpdate]
    current_goals: Dict[str, float]
    learning_progress: Dict[str, Any]