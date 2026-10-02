# Configuration Guide

All platform parameters are defined in modular configuration files under `/configs/` and environment variables.

---

## 1. Environment Variables (`.env`)
```bash
# Server Configuration
HOST=0.0.0.0
PORT=8000
ENVIRONMENT=development
LOG_LEVEL=INFO

# Storage
STORAGE_DIR=./storage
MAX_UPLOAD_SIZE_MB=500

# Hardware & Engine
HARDWARE_MODE=auto       # Options: auto, cpu, cuda
MOCK_PIPELINE=true       # Instantaneous testing without heavy weights

# Database
DATABASE_URL=sqlite:///./storage/studio.db
# PostgreSQL Alternative:
# DATABASE_URL=postgresql://user:password@localhost:5432/videostudio

# Redis Task Queue
REDIS_URL=redis://localhost:6379/0

# Model Paths
MODEL_CACHE_DIR=./models/cache
```

---

## 2. Configuration Files

### `configs/languages.yaml`
Specifies language codes, human names, script directions, and default TTS voices.

### `configs/models.yaml`
Maps model aliases to local directories, Hugging Face repos, compute types (`float16`, `int8`, `int4`), and licenses.

### `configs/pipeline.yaml`
Defines stage execution flags, retry policies, subtitle max characters per line, and resolution defaults (1080p, 1440p, 4K).

### `configs/hardware.yaml`
Fine-tunes thread allocation, maximum concurrent worker jobs, and GPU VRAM thresholds.
