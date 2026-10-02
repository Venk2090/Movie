import os
import io
import zipfile
import uuid
from typing import List, Dict, Any
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import Project, ProjectStage, Scene, Translation, PipelineLog, StageStatus
from app.schemas.project_schemas import ProjectCreateRequest, ProjectResponse
from app.pipelines.runner import PipelineRunner
from app.core.config import settings

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.post("", response_model=ProjectResponse)
def create_project(payload: ProjectCreateRequest, db: Session = Depends(get_db)):
    project_id = f"VID-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    
    project = Project(
        id=project_id,
        name=payload.name,
        description=payload.description,
        source_type=payload.source_type,
        source_url=payload.source_url,
        source_language=payload.source_language,
        target_languages=payload.target_languages,
        resolution=payload.resolution,
        tts_voice=payload.tts_voice,
        status=StageStatus.PENDING,
        progress=0.0
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

@router.get("", response_model=List[ProjectResponse])
def list_projects(db: Session = Depends(get_db)):
    return db.query(Project).order_by(Project.created_at.desc()).all()

@router.get("/{project_id}")
def get_project_details(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    scenes = db.query(Scene).filter(Scene.project_id == project_id).order_by(Scene.scene_number).all()
    translations = db.query(Translation).filter(Translation.project_id == project_id).all()
    stages = db.query(ProjectStage).filter(ProjectStage.project_id == project_id).all()
    logs = db.query(PipelineLog).filter(PipelineLog.project_id == project_id).order_by(PipelineLog.timestamp.desc()).limit(50).all()
    
    return {
        "project": project,
        "scenes": scenes,
        "translations": translations,
        "stages": stages,
        "logs": logs
    }

def run_project_pipeline_task(project_id: str):
    from app.core.database import SessionLocal
    db = SessionLocal()
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        db.close()
        return

    project.status = StageStatus.RUNNING
    db.commit()

    def on_progress(stage_name: str, pct: float, msg: str):
        project.current_stage = stage_name
        project.progress = pct
        log = PipelineLog(project_id=project_id, stage=stage_name, message=msg)
        db.add(log)
        db.commit()

    try:
        runner = PipelineRunner(project_id, progress_callback=on_progress)
        result = runner.execute_all({
            "name": project.name,
            "source_url": project.source_url,
            "target_languages": project.target_languages,
            "resolution": project.resolution
        })
        
        # Save scenes into DB
        for s in result.get("scenes", []):
            db_scene = Scene(
                project_id=project_id,
                scene_number=s["scene_number"],
                start_time=s["start_time"],
                end_time=s["end_time"],
                duration=s["duration"],
                visual_description=s["visual_description"],
                camera=s.get("camera", "Cinematic"),
                lighting=s.get("lighting", "Natural"),
                style=s.get("style", "cinematic"),
                prompt=s["visual_description"],
                seed=s.get("seed", 42),
                image_path=s.get("image_path")
            )
            db.add(db_scene)

        # Save translations into DB
        for lang_code, res in result.get("languages", {}).items():
            db_trans = Translation(
                project_id=project_id,
                language=lang_code,
                language_name=lang_code.upper(),
                srt_path=res.get("subtitles_srt"),
                voiceover_path=res.get("voiceover_wav"),
                video_path=res.get("video_mp4"),
                qa_status=res.get("qa_status", "PASS")
            )
            db.add(db_trans)

        project.status = StageStatus.COMPLETED
        project.progress = 100.0
        db.commit()
    except Exception as e:
        project.status = StageStatus.FAILED
        err_log = PipelineLog(project_id=project_id, stage="ERROR", level="ERROR", message=str(e))
        db.add(err_log)
        db.commit()
    finally:
        db.close()

@router.post("/{project_id}/run")
def trigger_project_run(project_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    background_tasks.add_task(run_project_pipeline_task, project_id)
    return {"status": "QUEUED", "message": f"Pipeline scheduled for project {project_id}"}

@router.post("/{project_id}/cancel")
def cancel_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project.status = StageStatus.CANCELLED
    db.commit()
    return {"status": "CANCELLED"}

@router.get("/{project_id}/export")
def export_project_zip(project_id: str):
    proj_dir = settings.STORAGE_DIR / "projects" / project_id
    if not proj_dir.exists():
        raise HTTPException(status_code=404, detail="Project directory not found")

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for root, dirs, files in os.walk(proj_dir):
            for file in files:
                abs_path = os.path.join(root, file)
                rel_path = os.path.relpath(abs_path, proj_dir)
                zip_file.write(abs_path, rel_path)

    zip_buffer.seek(0)
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={project_id}_localized_package.zip"}
    )
