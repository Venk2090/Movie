import enum
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, DateTime,
    ForeignKey, Enum, JSON
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class StageStatus(str, enum.Enum):
    PENDING = "PENDING"
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    SKIPPED = "SKIPPED"

class Project(Base):
    __tablename__ = "projects"

    id = Column(String(64), primary_key=True, index=True) # e.g. VID-20260928-000001
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    source_type = Column(String(32), default="youtube") # youtube, upload_video, upload_audio
    source_url = Column(String(1024), nullable=True)
    source_language = Column(String(16), default="auto")
    detected_language = Column(String(16), nullable=True)
    target_languages = Column(JSON, default=list) # List of lang codes
    resolution = Column(String(16), default="4k") # 1080p, 1440p, 4k
    tts_voice = Column(String(64), default="default")
    status = Column(Enum(StageStatus), default=StageStatus.PENDING)
    progress = Column(Float, default=0.0)
    current_stage = Column(String(64), nullable=True)
    duration_seconds = Column(Float, default=0.0)
    total_storage_bytes = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    stages = relationship("ProjectStage", back_populates="project", cascade="all, delete-orphan")
    scenes = relationship("Scene", back_populates="project", cascade="all, delete-orphan")
    translations = relationship("Translation", back_populates="project", cascade="all, delete-orphan")
    logs = relationship("PipelineLog", back_populates="project", cascade="all, delete-orphan")

class ProjectStage(Base):
    __tablename__ = "project_stages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(String(64), ForeignKey("projects.id"), index=True)
    stage_name = Column(String(64), nullable=False)
    status = Column(Enum(StageStatus), default=StageStatus.PENDING)
    progress = Column(Float, default=0.0)
    message = Column(String(512), nullable=True)
    worker = Column(String(64), default="worker-1")
    model_used = Column(String(128), nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Float, default=0.0)
    error_message = Column(Text, nullable=True)

    project = relationship("Project", back_populates="stages")

class Scene(Base):
    __tablename__ = "scenes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(String(64), ForeignKey("projects.id"), index=True)
    scene_number = Column(Integer, nullable=False)
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)
    duration = Column(Float, nullable=False)
    dialogue = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    visual_description = Column(Text, nullable=False)
    camera = Column(String(128), default="Wide cinematic establishing shot")
    lighting = Column(String(128), default="Natural soft volumetric lighting")
    environment = Column(String(256), nullable=True)
    style = Column(String(64), default="cinematic")
    image_path = Column(String(512), nullable=True)
    prompt = Column(Text, nullable=True)
    seed = Column(Integer, default=42)

    project = relationship("Project", back_populates="scenes")

class Translation(Base):
    __tablename__ = "translations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(String(64), ForeignKey("projects.id"), index=True)
    language = Column(String(16), nullable=False) # en, es, pt, kn, etc.
    language_name = Column(String(64), nullable=False)
    srt_path = Column(String(512), nullable=True)
    vtt_path = Column(String(512), nullable=True)
    voiceover_path = Column(String(512), nullable=True)
    video_path = Column(String(512), nullable=True)
    qa_status = Column(String(32), default="PENDING") # PASS, WARNING, FAIL
    qa_report = Column(JSON, default=dict)

    project = relationship("Project", back_populates="translations")

class PipelineLog(Base):
    __tablename__ = "pipeline_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(String(64), ForeignKey("projects.id"), index=True)
    stage = Column(String(64), nullable=False)
    language = Column(String(16), nullable=True)
    level = Column(String(16), default="INFO") # INFO, WARNING, ERROR
    message = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="logs")
