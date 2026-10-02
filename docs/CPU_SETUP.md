# CPU Setup Guide

OpenVideoStudio is engineered to run 100% functionally on standard CPU workstations and cloud VMs without any dedicated GPU hardware.

---

## 1. Automatic CPU Optimizations
When running in CPU mode:
1. **STT Engine**: `faster-whisper` uses INT8 quantization via CTranslate2 CPU engine (`compute_type: int8`).
2. **Translation**: Efficient distilled NLLB-200 600M or quantized Qwen 2.5 3B with AVX-512 acceleration.
3. **TTS**: Kokoro-82M is ultra-lightweight (runs faster than real-time on a quad-core CPU).
4. **Cinematic Rendering**: FFmpeg procedural Ken Burns engine generates motion, pan, zoom, and crossfade transitions deterministically on CPU.

---

## 2. Launching in CPU Mode
```bash
docker compose -f docker-compose.cpu.yml up -d
```
Or for local development:
```bash
export HARDWARE_MODE=cpu
uvicorn backend.app.main:app --port 8000
```
