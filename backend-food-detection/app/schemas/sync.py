from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class SyncStatusEnum(str, Enum):
    pending = "pending"
    synced = "synced"
    conflict = "conflict"
    failed = "failed"

class ActionEnum(str, Enum):
    create = "create"
    update = "update"
    delete = "delete"

class ResolutionStrategyEnum(str, Enum):
    use_server = "use_server"
    use_client = "use_client"
    merge = "merge"

# SyncData schemas
class SyncDataBase(BaseModel):
    entity_type: str
    entity_id: str
    action: ActionEnum
    data: Dict[str, Any]
    client_timestamp: datetime

class SyncDataCreate(SyncDataBase):
    pass

class SyncDataUpdate(BaseModel):
    action: Optional[ActionEnum] = None
    data: Optional[Dict[str, Any]] = None
    sync_status: Optional[SyncStatusEnum] = None

class SyncData(SyncDataBase):
    id: int
    user_id: int
    device_id: str
    server_timestamp: datetime
    sync_status: SyncStatusEnum
    conflict_data: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# SyncSession schemas
class SyncSessionBase(BaseModel):
    device_id: str
    device_name: str
    app_version: str
    platform: str

class SyncSessionCreate(SyncSessionBase):
    pass

class SyncSession(SyncSessionBase):
    id: int
    user_id: int
    sync_token: str
    last_sync: datetime
    is_active: bool
    items_synced: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Sync request/response schemas
class SyncRequest(BaseModel):
    sync_token: str
    data: List[SyncDataCreate]
    client_timestamp: datetime

class SyncResponse(BaseModel):
    data: List[Dict[str, Any]]
    server_timestamp: datetime
    has_more: bool
    sync_token: str

class ConflictResolution(BaseModel):
    entity_type: str
    entity_id: str
    resolution_strategy: ResolutionStrategyEnum
    client_data: Optional[Dict[str, Any]] = None
    server_data: Optional[Dict[str, Any]] = None

class SyncStatus(BaseModel):
    active_sessions: int
    devices: List[Dict[str, Any]]
    pending_items: int
    conflicts: int
    last_sync: Optional[datetime] = None