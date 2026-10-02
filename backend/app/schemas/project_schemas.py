from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

class ProjectCreateRequest(BaseModel):
    name: str = Field(..., description="Project name")
    description: Optional[str] = None
    source_type: str = Field("youtube", description="youtube, upload_video, upload_audio")
    source_url: Optional[str] = Field(None, description="YouTube source URL or media path")
    source_language: str = Field("auto", description="Source audio language or 'auto'")
    target_languages: List[str] = Field(
        default=["en", "es", "pt", "fr", "te", "kn", "ml", "hi", "bn", "gu", "zh", "ru"],
        description="List of target language codes"
    )
    resolution: str = Field("4k", description="1080p, 1440p, or 4k")
    tts_voice: str = Field("default", description="Selected voice identifier")

class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    source_type: str
    source_url: Optional[str]
    source_language: str
    detected_language: Optional[str]
    target_languages: List[str]
    resolution: str
    tts_voice: str
    status: str
    progress: float
    current_stage: Optional[str]
    duration_seconds: float
    total_storage_bytes: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class HardwareDiagnosticsResponse(BaseModel):
    cpu: Dict[str, Any]
    ram_gb: float
    gpu: Dict[str, Any]
    storage_free_gb: float
    execution_mode: str

class PipelineStageStatus(BaseModel):
    stage_name: str
    status: str
    progress: float
    message: Optional[str]
    worker: str
    model_used: Optional[str]
    duration_seconds: float
    error_message: Optional[str]
