from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date, timedelta

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.progress import WeightEntry, DailyStats, ProgressSummary
from app.schemas.progress import (
    WeightEntry as WeightEntrySchema, WeightEntryCreate, WeightEntryUpdate,
    DailyStats as DailyStatsSchema, DailyStatsCreate,
    ProgressSummary as ProgressSummarySchema,
    ProgressAnalysisRequest, ProgressAnalysisResponse,
    DashboardStats, WeeklyOverview, PeriodTypeEnum
)
from app.ai.adaptive_learning import adaptive_engine

router = APIRouter()

@router.post("/weight", response_model=WeightEntrySchema)
async def log_weight(
    weight_data: WeightEntryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Registrar peso"""
    
    # Verificar si ya existe entrada para esta fecha
    existing_entry = db.query(WeightEntry).filter(
        WeightEntry.user_id == current_user.id,
        WeightEntry.date == weight_data.date
    ).first()
    
    if existing_entry:
        # Actualizar entrada existente
        existing_entry.weight = weight_data.weight
        existing_entry.body_fat_percentage = weight_data.body_fat_percentage
        existing_entry.muscle_mass = weight_data.muscle_mass
        existing_entry.notes = weight_data.notes
        db.commit()
        db.refresh(existing_entry)
        return WeightEntrySchema.from_orm(existing_entry)
    else:
        # Crear nueva entrada
        weight_entry = WeightEntry(
            user_id=current_user.id,
            date=weight_data.date,
            weight=weight_data.weight,
            body_fat_percentage=weight_data.body_fat_percentage,
            muscle_mass=weight_data.muscle_mass,
            notes=weight_data.notes
        )
        
        db.add(weight_entry)
        db.commit()
        db.refresh(weight_entry)
        
        # Actualizar sistema adaptativo
        await adaptive_engine.update_user_goals(current_user.id, db)
        
        return WeightEntrySchema.from_orm(weight_entry)

@router.get("/weight", response_model=List[WeightEntrySchema])
async def get_weight_history(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    limit: int = Query(100, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener historial de peso"""
    
    query = db.query(WeightEntry).filter(WeightEntry.user_id == current_user.id)
    
    if start_date:
        query = query.filter(WeightEntry.date >= start_date)
    if end_date:
        query = query.filter(WeightEntry.date <= end_date)
    
    weight_entries = query.order_by(WeightEntry.date.desc()).limit(limit).all()
    
    return [WeightEntrySchema.from_orm(entry) for entry in weight_entries]

@router.put("/weight/{entry_id}", response_model=WeightEntrySchema)
async def update_weight_entry(
    entry_id: int,
    weight_data: WeightEntryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizar entrada de peso"""
    
    weight_entry = db.query(WeightEntry).filter(
        WeightEntry.id == entry_id,
        WeightEntry.user_id == current_user.id
    ).first()
    
    if not weight_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entrada de peso no encontrada"
        )
    
    # Actualizar campos
    for field, value in weight_data.dict(exclude_unset=True).items():
        setattr(weight_entry, field, value)
    
    db.commit()
    db.refresh(weight_entry)
    
    return WeightEntrySchema.from_orm(weight_entry)

@router.delete("/weight/{entry_id}")
async def delete_weight_entry(
    entry_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Eliminar entrada de peso"""
    
    weight_entry = db.query(WeightEntry).filter(
        WeightEntry.id == entry_id,
        WeightEntry.user_id == current_user.id
    ).first()
    
    if not weight_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entrada de peso no encontrada"
        )
    
    db.delete(weight_entry)
    db.commit()
    
    return {"message": "Entrada de peso eliminada exitosamente"}

@router.get("/daily-stats", response_model=List[DailyStatsSchema])
async def get_daily_stats(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    limit: int = Query(30, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener estadísticas diarias"""
    
    query = db.query(DailyStats).filter(DailyStats.user_id == current_user.id)
    
    if start_date:
        query = query.filter(DailyStats.date >= start_date)
    if end_date:
        query = query.filter(DailyStats.date <= end_date)
    
    daily_stats = query.order_by(DailyStats.date.desc()).limit(limit).all()
    
    return [DailyStatsSchema.from_orm(stat) for stat in daily_stats]

@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener estadísticas para el dashboard"""
    
    today = date.today()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)
    
    # Estadísticas de hoy
    today_stats = db.query(DailyStats).filter(
        DailyStats.user_id == current_user.id,
        DailyStats.date == today
    ).first()
    
    # Peso actual
    latest_weight = db.query(WeightEntry).filter(
        WeightEntry.user_id == current_user.id
    ).order_by(WeightEntry.date.desc()).first()
    
    # Promedio semanal
    weekly_stats = db.query(DailyStats).filter(
        DailyStats.user_id == current_user.id,
        DailyStats.date >= week_ago
    ).all()
    
    # Calcular promedios
    if weekly_stats:
        avg_calories = sum(s.consumed_calories for s in weekly_stats) / len(weekly_stats)
        avg_adherence = sum(s.calorie_adherence for s in weekly_stats if s.calorie_adherence) / len([s for s in weekly_stats if s.calorie_adherence])
    else:
        avg_calories = 0
        avg_adherence = 0
    
    # Tendencia de peso (últimos 7 días)
    recent_weights = db.query(WeightEntry).filter(
        WeightEntry.user_id == current_user.id,
        WeightEntry.date >= week_ago
    ).order_by(WeightEntry.date).all()
    
    weight_trend = "stable"
    if len(recent_weights) >= 2:
        weight_change = recent_weights[-1].weight - recent_weights[0].weight
        if weight_change > 0.5:
            weight_trend = "increasing"
        elif weight_change < -0.5:
            weight_trend = "decreasing"
    
    return DashboardStats(
        current_weight=latest_weight.weight if latest_weight else None,
        weight_trend=weight_trend,
        today_calories=today_stats.consumed_calories if today_stats else 0,
        today_adherence=today_stats.calorie_adherence if today_stats else 0,
        weekly_avg_calories=avg_calories,
        weekly_avg_adherence=avg_adherence,
        current_tdee=current_user.estimated_tdee,
        adaptive_calories=current_user.adaptive_calories,
        streak_days=0,  # Implementar lógica de racha
        total_meals_logged=db.query(DailyStats).filter(
            DailyStats.user_id == current_user.id
        ).count()
    )

@router.get("/weekly-overview", response_model=WeeklyOverview)
async def get_weekly_overview(
    week_offset: int = Query(0, description="Semanas hacia atrás (0 = semana actual)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener resumen semanal"""
    
    # Calcular fechas de la semana
    today = date.today()
    days_since_monday = today.weekday()
    monday = today - timedelta(days=days_since_monday + (week_offset * 7))
    sunday = monday + timedelta(days=6)
    
    # Obtener estadísticas de la semana
    weekly_stats = db.query(DailyStats).filter(
        DailyStats.user_id == current_user.id,
        DailyStats.date >= monday,
        DailyStats.date <= sunday
    ).order_by(DailyStats.date).all()
    
    # Obtener pesos de la semana
    weekly_weights = db.query(WeightEntry).filter(
        WeightEntry.user_id == current_user.id,
        WeightEntry.date >= monday,
        WeightEntry.date <= sunday
    ).order_by(WeightEntry.date).all()
    
    # Calcular totales y promedios
    total_calories = sum(s.consumed_calories for s in weekly_stats)
    avg_calories = total_calories / 7 if weekly_stats else 0
    
    adherence_values = [s.calorie_adherence for s in weekly_stats if s.calorie_adherence is not None]
    avg_adherence = sum(adherence_values) / len(adherence_values) if adherence_values else 0
    
    # Cambio de peso
    weight_change = None
    if len(weekly_weights) >= 2:
        weight_change = weekly_weights[-1].weight - weekly_weights[0].weight
    
    return WeeklyOverview(
        week_start=monday,
        week_end=sunday,
        daily_stats=weekly_stats,
        weight_entries=weekly_weights,
        total_calories=total_calories,
        avg_calories=avg_calories,
        avg_adherence=avg_adherence,
        weight_change=weight_change,
        days_logged=len(weekly_stats),
        target_calories=current_user.target_calories
    )

@router.post("/analysis", response_model=ProgressAnalysisResponse)
async def analyze_progress(
    analysis_request: ProgressAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Analizar progreso del usuario"""
    
    # Obtener datos del período solicitado
    stats = db.query(DailyStats).filter(
        DailyStats.user_id == current_user.id,
        DailyStats.date >= analysis_request.start_date,
        DailyStats.date <= analysis_request.end_date
    ).order_by(DailyStats.date).all()
    
    weights = db.query(WeightEntry).filter(
        WeightEntry.user_id == current_user.id,
        WeightEntry.date >= analysis_request.start_date,
        WeightEntry.date <= analysis_request.end_date
    ).order_by(WeightEntry.date).all()
    
    if not stats and not weights:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay datos suficientes para el análisis"
        )
    
    # Aquí implementarías la lógica de análisis
    # Por ahora retornamos un análisis básico
    
    return ProgressAnalysisResponse(
        period_start=analysis_request.start_date,
        period_end=analysis_request.end_date,
        total_days=len(stats),
        avg_calories=sum(s.consumed_calories for s in stats) / len(stats) if stats else 0,
        avg_adherence=sum(s.calorie_adherence for s in stats if s.calorie_adherence) / len([s for s in stats if s.calorie_adherence]) if stats else 0,
        weight_change=weights[-1].weight - weights[0].weight if len(weights) >= 2 else 0,
        trends={
            "calories": [s.consumed_calories for s in stats],
            "weight": [w.weight for w in weights],
            "adherence": [s.calorie_adherence for s in stats if s.calorie_adherence]
        },
        predictions={
            "estimated_weight_next_week": weights[-1].weight if weights else current_user.current_weight,
            "recommended_calorie_adjustment": 0
        },
        insights=[
            "Análisis de progreso generado exitosamente",
            f"Datos analizados de {len(stats)} días",
            f"Promedio de adherencia: {sum(s.calorie_adherence for s in stats if s.calorie_adherence) / len([s for s in stats if s.calorie_adherence]):.1%}" if stats else "Sin datos de adherencia"
        ]
    )