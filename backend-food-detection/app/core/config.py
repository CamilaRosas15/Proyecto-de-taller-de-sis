from pydantic import BaseModel
from typing import Optional
import os

class Settings(BaseModel):
    # 🔑 Gemini Configuration
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY")
    GEMINI_CONFIDENCE_THRESHOLD: float = 0.7
    
    # 🔐 Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "tu_clave_secreta_muy_segura_aqui")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # 📁 File Upload
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: str = ".jpg,.jpeg,.png,.gif,.webp"
    
    # 🌐 CORS
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "*")  # Permisivo para aplicaciones móviles
    
    # 📊 APIs externas (opcional)
    NUTRITIONIX_APP_ID: Optional[str] = os.getenv("NUTRITIONIX_APP_ID")
    NUTRITIONIX_API_KEY: Optional[str] = os.getenv("NUTRITIONIX_API_KEY")
    
    # 🛠️ Development
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    API_V1_STR: str = "/api/v1"
    
    @property
    def cors_origins_list(self) -> list:
        """Convierte CORS_ORIGINS string a lista"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    @property
    def allowed_extensions_set(self) -> set:
        """Convierte ALLOWED_EXTENSIONS string a set"""
        return {ext.strip() for ext in self.ALLOWED_EXTENSIONS.split(",")}

settings = Settings()