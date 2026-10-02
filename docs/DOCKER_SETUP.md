# Docker Setup Guide

OpenVideoStudio provides multi-architecture, production-ready container configurations.

---

## 1. Provided Compose Profiles
- `docker-compose.yml`: Standard balanced configuration with Postgres, Redis, Backend, and Frontend.
- `docker-compose.cpu.yml`: Lean CPU profile disabling GPU runtime mounts.
- `docker-compose.gpu.yml`: NVIDIA container runtime enabled with PyTorch CUDA pass-through.

---

## 2. Service Architecture
- `frontend`: Vite React distribution served through high-performance Nginx.
- `backend`: FastAPI Python 3.11 asynchronous web gateway.
- `worker`: Celery / RQ async task executor processing long-running media jobs.
- `postgres`: ACID compliant relational data store.
- `redis`: High throughput task queue and pub/sub message broker.
- `comfyui`: Self-hosted image diffusion generation engine (optional).
- `ollama`: Local open-weights LLM inference engine (optional).
