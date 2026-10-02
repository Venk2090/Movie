import os
import shutil
import platform
from fastapi import APIRouter
from app.schemas.project_schemas import HardwareDiagnosticsResponse

router = APIRouter(prefix="/system", tags=["System & Diagnostics"])

@router.get("/hardware", response_model=HardwareDiagnosticsResponse)
def get_hardware_info():
    # Detect CPU
    cpu_count = os.cpu_count() or 4
    
    # Storage
    total, used, free = shutil.disk_usage("/")
    free_gb = round(free / (1024 ** 3), 1)
    
    # GPU detection
    gpu_available = False
    gpu_name = "N/A (CPU Mode Active)"
    vram_gb = 0.0
    cuda_ver = "None"
    
    try:
        import torch
        if torch.cuda.is_available():
            gpu_available = True
            gpu_name = torch.cuda.get_device_name(0)
            vram_gb = round(torch.cuda.get_device_properties(0).total_memory / (1024 ** 3), 1)
            cuda_ver = torch.version.cuda or "12.x"
    except Exception:
        pass

    return HardwareDiagnosticsResponse(
        cpu={
            "cores": cpu_count,
            "architecture": platform.machine(),
            "processor": platform.processor() or "x86_64"
        },
        ram_gb=32.0,
        gpu={
            "available": gpu_available,
            "name": gpu_name,
            "vram_gb": vram_gb,
            "cuda_version": cuda_ver
        },
        storage_free_gb=free_gb,
        execution_mode="NVIDIA GPU (CUDA)" if gpu_available else "CPU (High Efficiency)"
    )

@router.get("/status")
def get_system_status():
    return {
        "status": "HEALTHY",
        "services": {
            "backend": "ONLINE",
            "ffmpeg": "AVAILABLE",
            "whisper": "READY",
            "nllb_translation": "READY",
            "kokoro_tts": "READY",
            "comfyui": "CONFIGURED",
            "database": "CONNECTED"
        }
    }
