# GPU Setup Guide

OpenVideoStudio features automatic hardware detection. When an NVIDIA GPU with CUDA drivers is detected, GPU-intensive models are dispatched directly to VRAM.

---

## 1. Requirements
- NVIDIA Pascal architecture or newer (GTX 1080+, RTX 20/30/40 series, A100, H100, L4).
- Minimum VRAM:
  - 8 GB: SDXL Turbo, Whisper Medium, Kokoro TTS.
  - 16 GB+: SDXL Base 1.0, Whisper Large-v3, NLLB-3.3B.
  - 24 GB+: Full multi-stage concurrent pipeline.
- NVIDIA Driver 535+ and CUDA 12.1+.

---

## 2. Docker NVIDIA Toolkit Setup
```bash
distribution=$(. /etc/os-release;echo $ID$VERSION_ID) \
  && curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg \
  && curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker
```

Run with GPU compose:
```bash
docker compose -f docker-compose.gpu.yml up -d
```
