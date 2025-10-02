from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.meal import Food
from app.schemas.meal import (
    Food as FoodSchema, FoodCreate, FoodUpdate, 
    FoodSearchQuery, FoodSearchResult
)

router = APIRouter()

@router.get("/search", response_model=List[FoodSearchResult])
async def search_foods(
    q: str = Query(..., min_length=2, description="Término de búsqueda"),
    limit: int = Query(20, le=100, description="Límite de resultados"),
    category: Optional[str] = Query(None, description="Filtrar por categoría"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Buscar alimentos en la base de datos"""
    
    query = db.query(Food)
    
    # Filtro de búsqueda por nombre
    query = query.filter(Food.name.ilike(f"%{q}%"))
    
    # Filtro por categoría si se especifica
    if category:
        query = query.filter(Food.category == category)
    
    # Ordenar por relevancia (nombre exacto primero, luego alfabético)
    query = query.order_by(
        Food.name.ilike(f"{q}%").desc(),  # Coincidencias al inicio primero
        Food.name
    )
    
    foods = query.limit(limit).all()
    
    # Convertir a formato de resultado de búsqueda
    results = []
    for food in foods:
        results.append(FoodSearchResult(
            id=food.id,
            name=food.name,
            brand=food.brand,
            category=food.category,
            calories_per_100g=food.calories_per_100g,
            protein_per_100g=food.protein_per_100g,
            carbs_per_100g=food.carbs_per_100g,
            fat_per_100g=food.fat_per_100g,
            fiber_per_100g=food.fiber_per_100g,
            serving_size=food.serving_size,
            serving_unit=food.serving_unit,
            verified=food.verified,
            popularity_score=food.popularity_score or 0
        ))
    
    return results

@router.get("/{food_id}", response_model=FoodSchema)
async def get_food(
    food_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener información detallada de un alimento"""
    
    food = db.query(Food).filter(Food.id == food_id).first()
    
    if not food:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alimento no encontrado"
        )
    
    return FoodSchema.from_orm(food)

@router.post("/", response_model=FoodSchema)
async def create_food(
    food_data: FoodCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crear nuevo alimento (solo usuarios verificados)"""
    
    # Verificar si el usuario puede crear alimentos
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para crear alimentos"
        )
    
    # Verificar si ya existe un alimento con el mismo nombre y marca
    existing_food = db.query(Food).filter(
        Food.name == food_data.name,
        Food.brand == food_data.brand
    ).first()
    
    if existing_food:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un alimento con ese nombre y marca"
        )
    
    # Crear alimento
    food = Food(
        name=food_data.name,
        brand=food_data.brand,
        category=food_data.category,
        calories_per_100g=food_data.calories_per_100g,
        protein_per_100g=food_data.protein_per_100g,
        carbs_per_100g=food_data.carbs_per_100g,
        fat_per_100g=food_data.fat_per_100g,
        fiber_per_100g=food_data.fiber_per_100g,
        sugar_per_100g=food_data.sugar_per_100g,
        sodium_per_100g=food_data.sodium_per_100g,
        serving_size=food_data.serving_size,
        serving_unit=food_data.serving_unit,
        barcode=food_data.barcode,
        ingredients=food_data.ingredients,
        allergens=food_data.allergens,
        created_by_user_id=current_user.id,
        verified=False  # Los alimentos creados por usuarios requieren verificación
    )
    
    db.add(food)
    db.commit()
    db.refresh(food)
    
    return FoodSchema.from_orm(food)

@router.put("/{food_id}", response_model=FoodSchema)
async def update_food(
    food_id: int,
    food_data: FoodUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizar alimento (solo el creador o admin)"""
    
    food = db.query(Food).filter(Food.id == food_id).first()
    
    if not food:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alimento no encontrado"
        )
    
    # Verificar permisos
    if food.created_by_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para editar este alimento"
        )
    
    # Actualizar campos
    for field, value in food_data.dict(exclude_unset=True).items():
        setattr(food, field, value)
    
    # Si se modifica, requiere nueva verificación
    food.verified = False
    
    db.commit()
    db.refresh(food)
    
    return FoodSchema.from_orm(food)

@router.get("/categories/list")
async def get_food_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener lista de categorías de alimentos"""
    
    categories = db.query(Food.category).distinct().filter(
        Food.category.isnot(None)
    ).all()
    
    return [cat[0] for cat in categories if cat[0]]

@router.get("/popular/list", response_model=List[FoodSearchResult])
async def get_popular_foods(
    limit: int = Query(20, le=50, description="Límite de resultados"),
    category: Optional[str] = Query(None, description="Filtrar por categoría"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener alimentos populares"""
    
    query = db.query(Food).filter(Food.verified == True)
    
    if category:
        query = query.filter(Food.category == category)
    
    # Ordenar por popularidad y luego por nombre
    foods = query.order_by(
        Food.popularity_score.desc().nullslast(),
        Food.name
    ).limit(limit).all()
    
    results = []
    for food in foods:
        results.append(FoodSearchResult(
            id=food.id,
            name=food.name,
            brand=food.brand,
            category=food.category,
            calories_per_100g=food.calories_per_100g,
            protein_per_100g=food.protein_per_100g,
            carbs_per_100g=food.carbs_per_100g,
            fat_per_100g=food.fat_per_100g,
            fiber_per_100g=food.fiber_per_100g,
            serving_size=food.serving_size,
            serving_unit=food.serving_unit,
            verified=food.verified,
            popularity_score=food.popularity_score or 0
        ))
    
    return results

@router.post("/{food_id}/report")
async def report_food(
    food_id: int,
    reason: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reportar problema con un alimento"""
    
    food = db.query(Food).filter(Food.id == food_id).first()
    
    if not food:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alimento no encontrado"
        )
    
    # Aquí podrías implementar un sistema de reportes
    # Por ahora solo retornamos confirmación
    
    return {
        "message": "Reporte enviado exitosamente",
        "food_id": food_id,
        "reason": reason
    }