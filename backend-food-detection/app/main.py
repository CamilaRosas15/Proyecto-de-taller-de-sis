from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import logging

from app.core.config import settings
from app.api.api_v1.api import api_router

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Food Detection API con Google Gemini",
    description="Backend especializado en detección de alimentos usando Google Gemini 1.5 Flash",
    version="2.0.1",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Middleware personalizado para headers CORS adicionales
@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Expose-Headers"] = "*"
    return response

# Configurar CORS - Usar configuración de variables de entorno
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=False,  # False para mayor compatibilidad con herramientas
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Crear directorio de uploads si no existe
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

# Servir archivos estáticos
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Incluir rutas de la API
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.on_event("startup")
async def startup_event():
    """Eventos de inicio de la aplicación"""
    logger.info("Iniciando Food Detection API...")
    logger.info("Backend especializado en IA para detección de alimentos")
    logger.info("Base de datos: Manejada por el frontend con Firebase")

@app.options("/{full_path:path}")
async def options_handler(full_path: str):
    """Manejar solicitudes OPTIONS para CORS preflight"""
    return {"message": "OK"}

@app.get("/")
async def root():
    """Endpoint raíz con información del sistema"""
    return {
        "message": "Food Detection API con Google Gemini",
        "version": "2.0.1",
        "ai_backend": "Google Gemini 1.5 Flash",
        "architecture": "Backend especializado en IA",
        "database": "Firebase (manejado por frontend)",
        "docs": "/docs",
        "status": "running",
        "features": [
            "Detección avanzada de alimentos con IA",
            "Análisis nutricional automático",
            "Alta precisión en reconocimiento",
            "API optimizada solo para IA",
        ]
    }

@app.get("/health")
async def health_check():
    """Verificación de salud del sistema"""
    gemini_status = "configured" if settings.GEMINI_API_KEY else "not_configured"
    
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "gemini": gemini_status,
        "architecture": "AI-focused backend",
        "timestamp": "2024-12-25T00:00:00Z"
    }

@app.get("/system-info")
async def system_info():
    """Información detallada del sistema"""
    return {
        "api": {
            "name": "Food Detection API",
            "version": "2.0.1",
            "ai_backend": "Google Gemini 1.5 Flash",
            "purpose": "Specialized AI backend for food detection"
        },
        "architecture": {
            "type": "AI-focused microservice",
            "database": "Firebase (handled by frontend)",
            "benefits": [
                "Simpler backend",
                "Better performance", 
                "Real-time database",
                "Reduced complexity"
            ]
        },
        "configuration": {
            "gemini_configured": bool(settings.GEMINI_API_KEY),
            "environment": settings.ENVIRONMENT,
            "debug": settings.DEBUG
        },
        "capabilities": {
            "food_detection": True,
            "nutrition_analysis": True,
            "portion_estimation": True,
            "file_upload": True,
            "real_time_sync": "Handled by frontend Firebase"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )