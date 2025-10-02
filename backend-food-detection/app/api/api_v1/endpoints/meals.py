from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date
import os
import uuid
from pathlib import Path

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.meal import (
    Meal, MealCreate, MealUpdate, QuickMealEntry, QuickMealResponse,
    ImageAnalysisResponse, MealTypeEnum
)
from app.services.dependencies import get_meal_service
from app.core.config import settings

router = APIRouter()

@router.post("/", response_model=Meal)
async def create_meal(
    meal_data: MealCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crear nueva comida"""
    
    meal_service = get_meal_service(db)
    
    try:
        meal = meal_service.create_meal(current_user.id, meal_data)
        return meal
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/", response_model=List[Meal])
async def get_meals(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener comidas del usuario"""
    
    meal_service = get_meal_service(db)
    meals = meal_service.get_user_meals(
        current_user.id, start_date, end_date, limit
    )
    return meals

@router.get("/{meal_id}", response_model=Meal)
async def get_meal(
    meal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener comida específica"""
    
    meal_service = get_meal_service(db)
    meal = meal_service.get_meal_by_id(meal_id, current_user.id)
    
    if not meal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comida no encontrada"
        )
    
    return meal

@router.put("/{meal_id}", response_model=Meal)
async def update_meal(
    meal_id: int,
    meal_data: MealUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizar comida"""
    
    meal_service = get_meal_service(db)
    meal = meal_service.update_meal(meal_id, current_user.id, meal_data)
    
    if not meal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comida no encontrada"
        )
    
    return meal

@router.delete("/{meal_id}")
async def delete_meal(
    meal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Eliminar comida"""
    
    meal_service = get_meal_service(db)
    success = meal_service.delete_meal(meal_id, current_user.id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comida no encontrada"
        )
    
    return {"message": "Comida eliminada exitosamente"}

@router.post("/upload-image", response_model=ImageAnalysisResponse)
async def upload_meal_image(
    file: UploadFile = File(...),
    confidence_threshold: float = 0.7,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Subir y analizar imagen de comida"""
    
    # Validar tipo de archivo
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo debe ser una imagen"
        )
    
    # Validar tamaño
    if file.size > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El archivo es demasiado grande. Máximo {settings.MAX_FILE_SIZE / 1024 / 1024}MB"
        )
    
    # Generar nombre único
    file_extension = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = Path(settings.UPLOAD_DIR) / unique_filename
    
    # Guardar archivo
    try:
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Analizar imagen
        meal_service = get_meal_service(db)
        analysis = await meal_service.analyze_meal_image(
            str(file_path), current_user.id, confidence_threshold
        )
        
        return analysis
        
    except Exception as e:
        # Limpiar archivo si hay error
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error procesando imagen: {str(e)}"
        )

@router.post("/from-image", response_model=Meal)
async def create_meal_from_image(
    file: UploadFile = File(...),
    meal_type: MealTypeEnum = Form(...),
    eaten_at: Optional[datetime] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crear comida directamente desde imagen"""
    
    # Validar archivo
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo debe ser una imagen"
        )
    
    # Usar tiempo actual si no se especifica
    if not eaten_at:
        eaten_at = datetime.utcnow()
    
    # Generar nombre único y guardar
    file_extension = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = Path(settings.UPLOAD_DIR) / unique_filename
    
    try:
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Crear comida desde imagen
        meal_service = get_meal_service(db)
        meal = await meal_service.create_meal_from_image(
            current_user.id, str(file_path), meal_type, eaten_at
        )
        
        return meal
        
    except Exception as e:
        # Limpiar archivo si hay error
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creando comida desde imagen: {str(e)}"
        )

@router.post("/quick-entry", response_model=QuickMealResponse)
async def quick_meal_entry(
    entry_data: QuickMealEntry,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Entrada rápida de comida por texto"""
    
    meal_service = get_meal_service(db)
    
    try:
        response = await meal_service.quick_meal_entry(current_user.id, entry_data)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error procesando entrada rápida: {str(e)}"
        )

@router.get("/today/summary")
async def get_today_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener resumen de comidas del día actual"""
    
    today = date.today()
    meal_service = get_meal_service(db)
    
    # Obtener comidas del día
    meals = meal_service.get_user_meals(
        current_user.id, start_date=today, end_date=today
    )
    
    # Calcular totales
    total_calories = sum(meal.total_calories for meal in meals)
    total_protein = sum(meal.total_protein for meal in meals)
    total_carbs = sum(meal.total_carbs for meal in meals)
    total_fat = sum(meal.total_fat for meal in meals)
    total_fiber = sum(meal.total_fiber for meal in meals)
    
    # Calcular adherencia
    adherence = {}
    if current_user.target_calories:
        adherence["calories"] = min(total_calories / current_user.target_calories, 2.0)
    if current_user.target_protein:
        adherence["protein"] = min(total_protein / current_user.target_protein, 2.0)
    if current_user.target_carbs:
        adherence["carbs"] = min(total_carbs / current_user.target_carbs, 2.0)
    if current_user.target_fat:
        adherence["fat"] = min(total_fat / current_user.target_fat, 2.0)
    
    return {
        "date": today,
        "meals": meals,
        "totals": {
            "calories": total_calories,
            "protein": total_protein,
            "carbs": total_carbs,
            "fat": total_fat,
            "fiber": total_fiber
        },
        "targets": {
            "calories": current_user.target_calories,
            "protein": current_user.target_protein,
            "carbs": current_user.target_carbs,
            "fat": current_user.target_fat
        },
        "adherence": adherence,
        "meal_count": len(meals)
    }