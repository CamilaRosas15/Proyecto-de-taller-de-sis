from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, JSON, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class SyncData(Base):
    __tablename__ = "sync_data"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Identificación del dispositivo/sesión
    device_id = Column(String, nullable=False, index=True)
    session_id = Column(String, index=True)
    
    # Datos de sincronización
    entity_type = Column(String, nullable=False)  # 'meal', 'weight', 'user_settings'
    entity_id = Column(String, nullable=False)    # ID local del entity
    action = Column(String, nullable=False)       # 'create', 'update', 'delete'
    
    # Datos del entity
    entity_data = Column(JSON)  # Datos completos del entity
    
    # Estado de sincronización
    sync_status = Column(String, default="pending")  # 'pending', 'synced', 'conflict', 'failed'
    server_entity_id = Column(Integer)  # ID asignado por el servidor después de sync
    
    # Resolución de conflictos
    conflict_resolution = Column(String)  # 'server_wins', 'client_wins', 'merged'
    conflict_data = Column(JSON)  # Datos del conflicto si existe
    
    # Timestamps
    client_timestamp = Column(DateTime(timezone=True), nullable=False)
    server_timestamp = Column(DateTime(timezone=True), server_default=func.now())
    synced_at = Column(DateTime(timezone=True))
    
    # Metadatos
    app_version = Column(String)
    platform = Column(String)  # 'android', 'ios', 'web'
    
    # Relaciones
    user = relationship("User", back_populates="sync_data")
    
    def __repr__(self):
        return f"<SyncData(user_id={self.user_id}, type='{self.entity_type}', status='{self.sync_status}')>"

class SyncSession(Base):
    __tablename__ = "sync_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    device_id = Column(String, nullable=False)
    
    # Información de la sesión
    session_token = Column(String, unique=True, nullable=False)
    last_sync_timestamp = Column(DateTime(timezone=True))
    
    # Estado de la sesión
    is_active = Column(Boolean, default=True)
    sync_in_progress = Column(Boolean, default=False)
    
    # Estadísticas
    total_syncs = Column(Integer, default=0)
    successful_syncs = Column(Integer, default=0)
    failed_syncs = Column(Integer, default=0)
    
    # Metadatos del dispositivo
    device_info = Column(JSON)  # Información del dispositivo
    app_version = Column(String)
    platform = Column(String)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_activity = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<SyncSession(user_id={self.user_id}, device_id='{self.device_id}', active={self.is_active})>"