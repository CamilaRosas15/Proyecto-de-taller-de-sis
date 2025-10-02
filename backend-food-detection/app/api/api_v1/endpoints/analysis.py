from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import Dict, Any
import json

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.ai.adaptive_learning import AdaptiveLearningEngine
from app.ai.food_detection import ImageAnalyzer
from app.schemas.meal import ImageAnalysisResponse
from app.schemas.progress import AdaptiveGoalsUpdate, AdaptiveGoalsHistory

router = APIRouter()

@router.post("/image", response_model=ImageAnalysisResponse)
async def analyze_food_image(
    file: UploadFile = File(...),
    confidence_threshold: float = 0.7,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Analizar imagen de comida con IA"""
    
    # Validar archivo
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo debe ser una imagen"
        )
    
    try:
        # Leer contenido de la imagen
        image_content = await file.read()
        
        # Obtener analizador de imágenes
        analyzer = ImageAnalyzer()
        
        # Analizar imagen
        analysis = await analyzer.analyze_image(
            image_content, 
            confidence_threshold=confidence_threshold
        )
        
        return analysis
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analizando imagen: {str(e)}"
        )

@router.get("/adaptive-goals", response_model=Dict[str, Any])
async def get_adaptive_goals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener objetivos adaptativos actuales"""
    
    return {
        "user_id": current_user.id,
        "current_tdee": current_user.estimated_tdee,
        "adaptive_calories": current_user.adaptive_calories,
        "confidence_level": current_user.tdee_confidence,
        "target_calories": current_user.target_calories,
        "target_protein": current_user.target_protein,
        "target_carbs": current_user.target_carbs,
        "target_fat": current_user.target_fat,
        "last_updated": current_user.updated_at,
        "adaptive_enabled": current_user.adaptive_enabled,
        "learning_rate": current_user.learning_rate
    }

@router.post("/update-adaptive-goals")
async def update_adaptive_goals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Forzar actualización de objetivos adaptativos"""
    
    try:
        # Ejecutar actualización del sistema adaptativo
        adaptive_engine = AdaptiveLearningEngine()
        updated = await adaptive_engine.update_user_goals(current_user.id, db)
        
        if updated:
            # Refrescar datos del usuario
            db.refresh(current_user)
            
            return {
                "message": "Objetivos adaptativos actualizados exitosamente",
                "new_tdee": current_user.estimated_tdee,
                "new_adaptive_calories": current_user.adaptive_calories,
                "confidence": current_user.tdee_confidence
            }
        else:
            return {
                "message": "No se requiere actualización en este momento",
                "current_tdee": current_user.estimated_tdee,
                "current_adaptive_calories": current_user.adaptive_calories
            }
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error actualizando objetivos adaptativos: {str(e)}"
        )

@router.put("/adaptive-settings")
async def update_adaptive_settings(
    settings_update: AdaptiveGoalsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizar configuración del sistema adaptativo"""
    
    # Actualizar configuraciones
    if settings_update.adaptive_enabled is not None:
        current_user.adaptive_enabled = settings_update.adaptive_enabled
    
    if settings_update.learning_rate is not None:
        current_user.learning_rate = settings_update.learning_rate
    
    if settings_update.confidence_threshold is not None:
        current_user.confidence_threshold = settings_update.confidence_threshold
    
    if settings_update.manual_tdee is not None:
        current_user.estimated_tdee = settings_update.manual_tdee
        current_user.tdee_confidence = 1.0  # Máxima confianza en valor manual
    
    db.commit()
    db.refresh(current_user)
    
    return {
        "message": "Configuración adaptativa actualizada",
        "adaptive_enabled": current_user.adaptive_enabled,
        "learning_rate": current_user.learning_rate,
        "confidence_threshold": current_user.confidence_threshold,
        "estimated_tdee": current_user.estimated_tdee
    }

@router.get("/adaptive-history", response_model=AdaptiveGoalsHistory)
async def get_adaptive_history(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener historial de cambios en objetivos adaptativos"""
    
    from datetime import date, timedelta
    from app.models.progress import DailyStats
    
    end_date = date.today()
    start_date = end_date - timedelta(days=days)
    
    # Obtener estadísticas diarias para ver evolución
    daily_stats = db.query(DailyStats).filter(
        DailyStats.user_id == current_user.id,
        DailyStats.date >= start_date,
        DailyStats.date <= end_date
    ).order_by(DailyStats.date).all()
    
    # Extraer datos históricos
    dates = [stat.date for stat in daily_stats]
    tdee_values = [stat.estimated_tdee for stat in daily_stats if stat.estimated_tdee]
    calorie_targets = [stat.target_calories for stat in daily_stats if stat.target_calories]
    confidence_values = [stat.tdee_confidence for stat in daily_stats if stat.tdee_confidence]
    
    return AdaptiveGoalsHistory(
        period_days=days,
        dates=dates,
        tdee_history=tdee_values,
        calorie_target_history=calorie_targets,
        confidence_history=confidence_values,
        current_tdee=current_user.estimated_tdee,
        current_confidence=current_user.tdee_confidence,
        total_adjustments=len([t for t in tdee_values if t != current_user.estimated_tdee])
    )

@router.get("/nutrition-insights")
async def get_nutrition_insights(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener insights nutricionales basados en IA"""
    
    from datetime import date, timedelta
    from app.models.progress import DailyStats
    
    # Obtener datos de los últimos 14 días
    end_date = date.today()
    start_date = end_date - timedelta(days=14)
    
    daily_stats = db.query(DailyStats).filter(
        DailyStats.user_id == current_user.id,
        DailyStats.date >= start_date
    ).order_by(DailyStats.date).all()
    
    if not daily_stats:
        return {
            "insights": ["No hay suficientes datos para generar insights"],
            "recommendations": [],
            "trends": {}
        }
    
    # Calcular promedios
    avg_calories = sum(s.consumed_calories for s in daily_stats) / len(daily_stats)
    avg_protein = sum(s.consumed_protein for s in daily_stats) / len(daily_stats)
    avg_adherence = sum(s.calorie_adherence for s in daily_stats if s.calorie_adherence) / len([s for s in daily_stats if s.calorie_adherence])
    
    # Generar insights básicos
    insights = []
    recommendations = []
    
    if avg_adherence < 0.8:
        insights.append(f"Tu adherencia promedio es del {avg_adherence:.1%}, por debajo del objetivo")
        recommendations.append("Considera ajustar tus objetivos calóricos para mejorar la adherencia")
    
    if avg_protein < current_user.target_protein * 0.8:
        insights.append(f"Tu consumo promedio de proteína ({avg_protein:.1f}g) está por debajo del objetivo")
        recommendations.append("Incluye más fuentes de proteína en tus comidas")
    
    if avg_calories > current_user.target_calories * 1.1:
        insights.append("Estás consumiendo más calorías de las recomendadas consistentemente")
        recommendations.append("El sistema adaptativo ajustará tus objetivos automáticamente")
    
    return {
        "insights": insights,
        "recommendations": recommendations,
        "trends": {
            "avg_calories": avg_calories,
            "avg_protein": avg_protein,
            "avg_adherence": avg_adherence,
            "target_calories": current_user.target_calories,
            "target_protein": current_user.target_protein
        },
        "period_analyzed": f"{len(daily_stats)} días"
    }

@router.post("/recalculate-tdee")
async def recalculate_tdee(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Recalcular TDEE basado en datos actuales"""
    
    try:
        # Obtener peso más reciente
        from app.models.progress import WeightEntry
        latest_weight = db.query(WeightEntry).filter(
            WeightEntry.user_id == current_user.id
        ).order_by(WeightEntry.date.desc()).first()
        
        if not latest_weight:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Se requiere al menos una entrada de peso para calcular TDEE"
            )
        
        # Calcular TDEE tradicional
        adaptive_engine = AdaptiveLearningEngine()
        traditional_tdee = adaptive_engine.calculate_traditional_tdee(
            current_user, latest_weight.weight
        )
        
        # Calcular TDEE adaptativo si hay suficientes datos
        adaptive_tdee = adaptive_engine.calculate_adaptive_tdee(
            current_user, latest_weight.weight, db
        )
        
        # Usar el adaptativo si está disponible, sino el tradicional
        new_tdee = adaptive_tdee if adaptive_tdee else traditional_tdee
        
        # Actualizar usuario
        current_user.estimated_tdee = new_tdee
        current_user.adaptive_calories = adaptive_engine.calculate_adaptive_calories(
            current_user, new_tdee
        )
        
        db.commit()
        
        return {
            "message": "TDEE recalculado exitosamente",
            "traditional_tdee": traditional_tdee,
            "adaptive_tdee": adaptive_tdee,
            "final_tdee": new_tdee,
            "new_calorie_target": current_user.adaptive_calories
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error recalculando TDEE: {str(e)}"
        )