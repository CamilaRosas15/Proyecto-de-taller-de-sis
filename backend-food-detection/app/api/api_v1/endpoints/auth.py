from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from datetime import timedelta

from app.core.database import get_db
from app.core.security import (
    authenticate_user, create_access_token, get_password_hash,
    get_current_user
)
from app.models.user import User
from app.schemas.user import (
    UserCreate, UserProfile, LoginRequest, LoginResponse, 
    Token, UserUpdate, GoalSetup
)
from app.core.config import settings

router = APIRouter()
security = HTTPBearer()

@router.post("/register", response_model=LoginResponse)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Registrar nuevo usuario"""
    
    # Verificar si el email ya existe
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado"
        )
    
    # Crear usuario
    hashed_password = get_password_hash(user_data.password)
    user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        full_name=user_data.full_name,
        age=user_data.age,
        gender=user_data.gender,
        height=user_data.height,
        activity_level=user_data.activity_level,
        goal=user_data.goal,
        timezone=user_data.timezone,
        units=user_data.units
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Crear token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    
    token = Token(
        access_token=access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    
    user_profile = UserProfile.from_orm(user)
    
    return LoginResponse(user=user_profile, token=token)

@router.post("/login", response_model=LoginResponse)
async def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """Iniciar sesión"""
    
    user = authenticate_user(db, login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Actualizar último login
    from datetime import datetime
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Crear token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    
    token = Token(
        access_token=access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    
    user_profile = UserProfile.from_orm(user)
    
    return LoginResponse(user=user_profile, token=token)

@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Obtener perfil del usuario actual"""
    return UserProfile.from_orm(current_user)

@router.put("/me", response_model=UserProfile)
async def update_profile(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizar perfil del usuario"""
    
    # Actualizar campos
    for field, value in user_data.dict(exclude_unset=True).items():
        setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    
    return UserProfile.from_orm(current_user)

@router.post("/setup-goals", response_model=UserProfile)
async def setup_goals(
    goal_data: GoalSetup,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Configurar objetivos del usuario"""
    
    # Actualizar objetivo
    current_user.goal = goal_data.goal
    
    # Si se proporcionan valores personalizados, usarlos
    if goal_data.custom_calories:
        current_user.target_calories = goal_data.custom_calories
    if goal_data.custom_protein:
        current_user.target_protein = goal_data.custom_protein
    if goal_data.custom_carbs:
        current_user.target_carbs = goal_data.custom_carbs
    if goal_data.custom_fat:
        current_user.target_fat = goal_data.custom_fat
    
    # Si no hay valores personalizados, calcular automáticamente
    if not goal_data.custom_calories and current_user.height and current_user.age:
        from app.ai.adaptive_learning import adaptive_engine
        
        # Calcular TDEE inicial
        estimated_weight = 70.0  # Peso por defecto si no hay datos
        traditional_tdee = adaptive_engine.calculate_traditional_tdee(current_user, estimated_weight)
        
        # Calcular calorías objetivo
        adaptive_calories = adaptive_engine.calculate_adaptive_calories(current_user, traditional_tdee)
        
        current_user.estimated_tdee = traditional_tdee
        current_user.target_calories = adaptive_calories
        current_user.adaptive_calories = adaptive_calories
        
        # Calcular macros básicos (ejemplo: 30% proteína, 40% carbs, 30% grasa)
        if not goal_data.custom_protein:
            current_user.target_protein = (adaptive_calories * 0.30) / 4  # 4 cal/g proteína
        if not goal_data.custom_carbs:
            current_user.target_carbs = (adaptive_calories * 0.40) / 4   # 4 cal/g carbs
        if not goal_data.custom_fat:
            current_user.target_fat = (adaptive_calories * 0.30) / 9     # 9 cal/g grasa
    
    db.commit()
    db.refresh(current_user)
    
    return UserProfile.from_orm(current_user)

@router.post("/refresh-token", response_model=Token)
async def refresh_token(current_user: User = Depends(get_current_user)):
    """Renovar token de acceso"""
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(current_user.id)}, expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

@router.delete("/me")
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Eliminar cuenta del usuario"""
    
    # Marcar como inactivo en lugar de eliminar completamente
    current_user.is_active = False
    db.commit()
    
    return {"message": "Cuenta desactivada exitosamente"}