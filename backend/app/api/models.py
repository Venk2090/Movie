from fastapi import APIRouter
from typing import List, Dict, Any

router = APIRouter(prefix="/models", tags=["Model Registry"])

@router.get("", response_model=List[Dict[str, Any]])
def list_models():
    return [
        {
            "category": "Speech-to-Text",
            "name": "faster-whisper-large-v3",
            "provider": "faster-whisper",
            "size_mb": 3100,
            "vram_req_gb": 8,
            "license": "MIT",
            "commercial": True,
            "status": "INSTALLED"
        },
        {
            "category": "Speech-to-Text",
            "name": "faster-whisper-base",
            "provider": "faster-whisper",
            "size_mb": 145,
            "vram_req_gb": 2,
            "license": "MIT",
            "commercial": True,
            "status": "INSTALLED"
        },
        {
            "category": "Translation",
            "name": "NLLB-200-distilled-600M",
            "provider": "Meta AI",
            "size_mb": 1200,
            "vram_req_gb": 4,
            "license": "CC-BY-NC-4.0",
            "commercial": False,
            "status": "INSTALLED"
        },
        {
            "category": "Translation",
            "name": "Qwen 2.5 7B (Ollama)",
            "provider": "Alibaba Cloud / Ollama",
            "size_mb": 4500,
            "vram_req_gb": 6,
            "license": "Apache-2.0",
            "commercial": True,
            "status": "AVAILABLE"
        },
        {
            "category": "Text-to-Speech",
            "name": "Kokoro-82M",
            "provider": "Hexgrad",
            "size_mb": 320,
            "vram_req_gb": 2,
            "license": "Apache-2.0",
            "commercial": True,
            "status": "INSTALLED"
        },
        {
            "category": "Storyboard",
            "name": "SDXL Base 1.0 (ComfyUI)",
            "provider": "Stability AI",
            "size_mb": 6900,
            "vram_req_gb": 8,
            "license": "CreativeML OpenRAIL++-M",
            "commercial": True,
            "status": "AVAILABLE"
        }
    ]
