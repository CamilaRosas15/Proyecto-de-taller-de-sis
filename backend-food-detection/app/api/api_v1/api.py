from fastapi import APIRouter

from app.api.api_v1.endpoints import ai_models

api_router = APIRouter()

# Solo incluir rutas de IA - el resto se maneja en el frontend con Firebase
api_router.include_router(ai_models.router, prefix="/ai", tags=["ai-models"])