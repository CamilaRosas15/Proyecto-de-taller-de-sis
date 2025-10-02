from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime
import json

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.sync import SyncData, SyncSession
from app.schemas.sync import (
    SyncDataCreate, SyncDataUpdate, SyncData as SyncDataSchema,
    SyncSessionCreate, SyncSession as SyncSessionSchema,
    SyncRequest, SyncResponse, ConflictResolution
)

router = APIRouter()

@router.post("/session", response_model=SyncSessionSchema)
async def create_sync_session(
    session_data: SyncSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crear nueva sesión de sincronización"""
    
    # Verificar si ya existe una sesión activa para este dispositivo
    existing_session = db.query(SyncSession).filter(
        SyncSession.user_id == current_user.id,
        SyncSession.device_id == session_data.device_id,
        SyncSession.is_active == True
    ).first()
    
    if existing_session:
        # Actualizar sesión existente
        existing_session.last_sync = datetime.utcnow()
        existing_session.app_version = session_data.app_version
        existing_session.platform = session_data.platform
        db.commit()
        db.refresh(existing_session)
        return SyncSessionSchema.from_orm(existing_session)
    
    # Crear nueva sesión
    sync_session = SyncSession(
        user_id=current_user.id,
        device_id=session_data.device_id,
        device_name=session_data.device_name,
        app_version=session_data.app_version,
        platform=session_data.platform,
        sync_token=f"sync_{current_user.id}_{session_data.device_id}_{int(datetime.utcnow().timestamp())}",
        last_sync=datetime.utcnow(),
        is_active=True
    )
    
    db.add(sync_session)
    db.commit()
    db.refresh(sync_session)
    
    return SyncSessionSchema.from_orm(sync_session)

@router.post("/upload", response_model=Dict[str, Any])
async def upload_sync_data(
    sync_request: SyncRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Subir datos para sincronización"""
    
    # Verificar sesión de sincronización
    sync_session = db.query(SyncSession).filter(
        SyncSession.sync_token == sync_request.sync_token,
        SyncSession.user_id == current_user.id,
        SyncSession.is_active == True
    ).first()
    
    if not sync_session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de sincronización inválido"
        )
    
    uploaded_count = 0
    conflicts = []
    
    # Procesar cada elemento de datos
    for data_item in sync_request.data:
        try:
            # Verificar si ya existe
            existing_data = db.query(SyncData).filter(
                SyncData.user_id == current_user.id,
                SyncData.entity_type == data_item.entity_type,
                SyncData.entity_id == data_item.entity_id,
                SyncData.device_id == sync_session.device_id
            ).first()
            
            if existing_data:
                # Verificar conflicto por timestamp
                if existing_data.client_timestamp != data_item.client_timestamp:
                    conflicts.append({
                        "entity_type": data_item.entity_type,
                        "entity_id": data_item.entity_id,
                        "server_timestamp": existing_data.server_timestamp,
                        "client_timestamp": data_item.client_timestamp,
                        "conflict_type": "timestamp_mismatch"
                    })
                    continue
                
                # Actualizar datos existentes
                existing_data.data = data_item.data
                existing_data.action = data_item.action
                existing_data.server_timestamp = datetime.utcnow()
                existing_data.sync_status = "synced"
            else:
                # Crear nuevo registro
                sync_data = SyncData(
                    user_id=current_user.id,
                    device_id=sync_session.device_id,
                    entity_type=data_item.entity_type,
                    entity_id=data_item.entity_id,
                    action=data_item.action,
                    data=data_item.data,
                    client_timestamp=data_item.client_timestamp,
                    server_timestamp=datetime.utcnow(),
                    sync_status="synced"
                )
                db.add(sync_data)
            
            uploaded_count += 1
            
        except Exception as e:
            conflicts.append({
                "entity_type": data_item.entity_type,
                "entity_id": data_item.entity_id,
                "error": str(e),
                "conflict_type": "processing_error"
            })
    
    # Actualizar sesión
    sync_session.last_sync = datetime.utcnow()
    sync_session.items_synced += uploaded_count
    
    db.commit()
    
    return {
        "uploaded_count": uploaded_count,
        "conflicts": conflicts,
        "session_id": sync_session.id,
        "last_sync": sync_session.last_sync
    }

@router.get("/download", response_model=SyncResponse)
async def download_sync_data(
    sync_token: str,
    last_sync: datetime = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Descargar datos sincronizados"""
    
    # Verificar sesión
    sync_session = db.query(SyncSession).filter(
        SyncSession.sync_token == sync_token,
        SyncSession.user_id == current_user.id,
        SyncSession.is_active == True
    ).first()
    
    if not sync_session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de sincronización inválido"
        )
    
    # Obtener datos modificados desde la última sincronización
    query = db.query(SyncData).filter(
        SyncData.user_id == current_user.id,
        SyncData.sync_status == "synced"
    )
    
    if last_sync:
        query = query.filter(SyncData.server_timestamp > last_sync)
    
    # Excluir datos del mismo dispositivo para evitar loops
    query = query.filter(SyncData.device_id != sync_session.device_id)
    
    sync_data = query.order_by(SyncData.server_timestamp).all()
    
    # Convertir a formato de respuesta
    data_items = []
    for item in sync_data:
        data_items.append({
            "entity_type": item.entity_type,
            "entity_id": item.entity_id,
            "action": item.action,
            "data": item.data,
            "server_timestamp": item.server_timestamp,
            "client_timestamp": item.client_timestamp
        })
    
    return SyncResponse(
        data=data_items,
        server_timestamp=datetime.utcnow(),
        has_more=False,  # Implementar paginación si es necesario
        sync_token=sync_token
    )

@router.post("/resolve-conflict")
async def resolve_conflict(
    resolution: ConflictResolution,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Resolver conflicto de sincronización"""
    
    # Buscar el dato en conflicto
    sync_data = db.query(SyncData).filter(
        SyncData.user_id == current_user.id,
        SyncData.entity_type == resolution.entity_type,
        SyncData.entity_id == resolution.entity_id
    ).first()
    
    if not sync_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dato de sincronización no encontrado"
        )
    
    # Aplicar resolución
    if resolution.resolution_strategy == "use_server":
        # Mantener datos del servidor
        sync_data.sync_status = "synced"
    elif resolution.resolution_strategy == "use_client":
        # Usar datos del cliente
        sync_data.data = resolution.client_data
        sync_data.sync_status = "synced"
        sync_data.server_timestamp = datetime.utcnow()
    elif resolution.resolution_strategy == "merge":
        # Implementar lógica de merge específica por tipo de entidad
        # Por ahora, usar datos del cliente
        sync_data.data = resolution.client_data
        sync_data.sync_status = "synced"
        sync_data.server_timestamp = datetime.utcnow()
    
    db.commit()
    
    return {
        "message": "Conflicto resuelto exitosamente",
        "entity_type": resolution.entity_type,
        "entity_id": resolution.entity_id,
        "resolution_strategy": resolution.resolution_strategy
    }

@router.get("/status")
async def get_sync_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener estado de sincronización"""
    
    # Obtener sesiones activas
    active_sessions = db.query(SyncSession).filter(
        SyncSession.user_id == current_user.id,
        SyncSession.is_active == True
    ).all()
    
    # Obtener datos pendientes de sincronización
    pending_data = db.query(SyncData).filter(
        SyncData.user_id == current_user.id,
        SyncData.sync_status == "pending"
    ).count()
    
    # Obtener conflictos sin resolver
    conflicts = db.query(SyncData).filter(
        SyncData.user_id == current_user.id,
        SyncData.sync_status == "conflict"
    ).count()
    
    return {
        "active_sessions": len(active_sessions),
        "devices": [
            {
                "device_id": session.device_id,
                "device_name": session.device_name,
                "last_sync": session.last_sync,
                "items_synced": session.items_synced
            }
            for session in active_sessions
        ],
        "pending_items": pending_data,
        "conflicts": conflicts,
        "last_sync": max([s.last_sync for s in active_sessions]) if active_sessions else None
    }

@router.delete("/session/{device_id}")
async def deactivate_sync_session(
    device_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Desactivar sesión de sincronización"""
    
    sync_session = db.query(SyncSession).filter(
        SyncSession.user_id == current_user.id,
        SyncSession.device_id == device_id,
        SyncSession.is_active == True
    ).first()
    
    if not sync_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesión de sincronización no encontrada"
        )
    
    sync_session.is_active = False
    db.commit()
    
    return {"message": "Sesión de sincronización desactivada"}

@router.post("/force-sync")
async def force_full_sync(
    device_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Forzar sincronización completa"""
    
    # Marcar todos los datos como pendientes de sincronización
    db.query(SyncData).filter(
        SyncData.user_id == current_user.id
    ).update({"sync_status": "pending"})
    
    # Actualizar timestamp de sesión
    sync_session = db.query(SyncSession).filter(
        SyncSession.user_id == current_user.id,
        SyncSession.device_id == device_id,
        SyncSession.is_active == True
    ).first()
    
    if sync_session:
        sync_session.last_sync = datetime.utcnow()
    
    db.commit()
    
    return {
        "message": "Sincronización completa iniciada",
        "device_id": device_id
    }