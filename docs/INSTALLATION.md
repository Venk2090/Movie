# Installation Guide

OpenVideoStudio can be run in two modes:
1. **Containerized (Docker Compose)**: Recommended for isolated deployments on Linux, Windows WSL2, and macOS.
2. **Native Local (Python + Node.js)**: Recommended for workstation development and fine-grained hardware tuning.

---

## 1. Prerequisites
- **Git**
- **Docker & Docker Compose** (for containerized mode)
- **Python 3.11+** (for native mode)
- **Node.js 20+** and npm (for frontend)
- **FFmpeg 6.0+** with libx264, libx265, and libvpx support:
  ```bash
  # Debian/Ubuntu
  sudo apt-get update && sudo apt-get install -y ffmpeg

  # Fedora
  sudo dnf install -y ffmpeg

  # macOS
  brew install ffmpeg
  ```

---

## 2. Docker Quickstart (CPU Mode)
```bash
git clone https://github.com/open-video-studio/open-video-studio.git
cd open-video-studio
cp .env.example .env
docker compose -f docker-compose.cpu.yml up --build -d
```
Access the application at `http://localhost:3000`. Backend documentation is available at `http://localhost:8000/docs`.

---

## 3. Docker Quickstart (NVIDIA GPU Mode)
Ensure the NVIDIA Container Toolkit is installed:
```bash
docker compose -f docker-compose.gpu.yml up --build -d
```

---

## 4. Native Workstation Installation

### Backend Setup:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Setup:
```bash
npm install
npm run dev
```
Open `http://localhost:3000` in your web browser.
