from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class GenderEnum(str, Enum):
    male = "male"
    female = "female"
    other = "other"

class ActivityLevelEnum(str, Enum):
    sedentary = "sedentary"
    light = "light"
    moderate = "moderate"
    active = "active"
    very_active = "very_active"

class GoalEnum(str, Enum):
    lose_weight = "lose_weight"
    maintain = "maintain"
    gain_weight = "gain_weight"
    gain_muscle = "gain_muscle"

class UnitsEnum(str, Enum):
    metric = "metric"
    imperial = "imperial"

# Esquemas base
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    age: Optional[int] = None
    gender: Optional[GenderEnum] = None
    height: Optional[float] = None
    activity_level: Optional[ActivityLevelEnum] = None
    goal: Optional[GoalEnum] = None
    timezone: str = "UTC"
    units: UnitsEnum = UnitsEnum.metric

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[GenderEnum] = None
    height: Optional[float] = None
    activity_level: Optional[ActivityLevelEnum] = None
    goal: Optional[GoalEnum] = None
    target_calories: Optional[float] = None
    target_protein: Optional[float] = None
    target_carbs: Optional[float] = None
    target_fat: Optional[float] = None
    timezone: Optional[str] = None
    units: Optional[UnitsEnum] = None

class UserProfile(UserBase):
    id: int
    target_calories: Optional[float] = None
    target_protein: Optional[float] = None
    target_carbs: Optional[float] = None
    target_fat: Optional[float] = None
    estimated_tdee: Optional[float] = None
    tdee_confidence: Optional[float] = None
    adaptive_calories: Optional[float] = None
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserInDB(UserProfile):
    hashed_password: str

# Esquemas de autenticación
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int

class TokenData(BaseModel):
    user_id: Optional[int] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    user: UserProfile
    token: Token

# Esquemas de configuración de objetivos
class GoalSetup(BaseModel):
    goal: GoalEnum
    target_weight: Optional[float] = None
    weekly_goal: Optional[float] = None  # kg por semana
    custom_calories: Optional[float] = None
    custom_protein: Optional[float] = None
    custom_carbs: Optional[float] = None
    custom_fat: Optional[float] = None

class AdaptiveSettings(BaseModel):
    enable_adaptive_calories: bool = True
    tdee_learning_rate: float = Field(default=0.1, ge=0.01, le=1.0)
    min_data_days: int = Field(default=14, ge=7, le=60)
    confidence_threshold: float = Field(default=0.7, ge=0.1, le=1.0)