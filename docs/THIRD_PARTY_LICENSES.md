# Third-Party Model & Software License Inventory

This document provides a comprehensive audit of all models, libraries, and frameworks used in the **OpenVideoStudio** platform in compliance with strict FOSS verification.

---

## 1. Core Principles
1. **No False FOSS Attribution**: Models marked with custom non-commercial or community restrictions (e.g. Llama Community License) are clearly identified with their exact terms.
2. **Zero Mandatory Paid Subscriptions**: The core platform runs completely without proprietary cloud APIs (no OpenAI, no ElevenLabs, no Google Cloud Translate API).
3. **FOSS-First Prioritization**: Apache 2.0, MIT, BSD-3, and permissive open-weights models are selected as defaults.

---

## 2. AI Model License Matrix

| Capability | Model / Engine | Version | License | Commercial Use? | Redistribution? | Source URL | Known Restrictions / Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Speech-to-Text (STT)** | `faster-whisper` (OpenAI Whisper) | `large-v3` / `base` | MIT License | **Yes** | **Yes** | [github.com/SYSTRAN/faster-whisper](https://github.com/SYSTRAN/faster-whisper) | Weights and code under MIT. Permissive and unrestricted. |
| **Translation (FOSS)** | Meta NLLB-200 | `nllb-200-distilled-600M` / `3.3B` | CC-BY-NC 4.0 (Base) / MIT (Code) | **Non-Commercial for NLLB base weights** | Attribution required | [huggingface.co/facebook/nllb-200-distilled-600M](https://huggingface.co/facebook/nllb-200-distilled-600M) | *Alternative FOSS for commercial*: Helsinki-NLP / OPUS-MT (Apache 2.0). |
| **Translation (Commercial Permissive)** | OPUS-MT / MarianMT | v1.0 | Apache 2.0 / CC-BY-4.0 | **Yes** | **Yes** | [github.com/Helsinki-NLP/Opus-MT](https://github.com/Helsinki-NLP/Opus-MT) | Completely permissive open-source models for 100+ language pairs. |
| **Local LLM Orchestrator** | Ollama Engine | v0.5+ | MIT License | **Yes** | **Yes** | [github.com/ollama/ollama](https://github.com/ollama/ollama) | Engine is MIT. Models run under their respective model licenses. |
| **Local LLM Model** | Qwen 2.5 / Mistral | Qwen2.5-7B-Instruct | Apache 2.0 | **Yes** | **Yes** | [github.com/QwenLM/Qwen2.5](https://github.com/QwenLM/Qwen2.5) | Fully Apache 2.0 licensed, unrestricted commercial usage. |
| **Text-to-Speech (TTS)** | Kokoro-82M | v0.19 / v1.0 | Apache 2.0 | **Yes** | **Yes** | [huggingface.co/hexgrad/Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) | Permissive Apache 2.0, ultra-fast 82M parameter multi-voice synthesis. |
| **Text-to-Speech (Voice Clone)** | Coqui XTTS-v2 | v2.0.3 | Coqui Public Model License (CPML) | **Non-Commercial** without waiver | Restricted | [github.com/coqui-ai/TTS](https://github.com/coqui-ai/TTS) | **RESTRICTION**: CPML restricts commercial redistribution. Disabled by default; Kokoro is the default permissive engine. |
| **Image Generation Engine** | ComfyUI | v0.3+ | GPL-3.0 | **Yes** | GPL copyleft | [github.com/comfyanonymous/ComfyUI](https://github.com/comfyanonymous/ComfyUI) | Self-hosted modular node execution engine. |
| **Image Diffusion Model** | Stable Diffusion XL (SDXL) Base 1.0 | 1.0 | CreativeML OpenRAIL++-M | **Yes** (with behavioral limits) | Under OpenRAIL terms | [huggingface.co/stabilityai/stable-diffusion-xl-base-1.0](https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0) | Open weights. Prohibits malicious use (CSAM, malware, illegal acts). |
| **Video Engine** | FFmpeg | 6.0+ / 7.0+ | LGPL v2.1+ / GPL v2+ (depending on build) | **Yes** | **Yes** (dynamic linking for LGPL) | [ffmpeg.org](https://ffmpeg.org) | Deterministic Ken Burns, motion transitions, pan/zoom, and subtitle rendering. |
| **Media Downloader** | `yt-dlp` | Latest | Unlicense (Public Domain) | **Yes** | **Yes** | [github.com/yt-dlp/yt-dlp](https://github.com/yt-dlp/yt-dlp) | Dedicated tool for permitted source download. |

---

## 3. Platform Software Dependencies

| Component | Library / Framework | License | Commercial Permissiveness |
| :--- | :--- | :--- | :--- |
| **Backend API** | FastAPI | MIT | Permissive |
| **Web Server** | Uvicorn | BSD-3-Clause | Permissive |
| **Database ORM** | SQLAlchemy | MIT | Permissive |
| **Relational Database** | PostgreSQL / SQLite | PostgreSQL License / Public Domain | Permissive |
| **Task Queue** | Redis + Celery / RQ | BSD-3-Clause | Permissive |
| **Frontend UI** | React 19 + TypeScript | MIT | Permissive |
| **Build Tooling** | Vite | MIT | Permissive |
| **Styling** | Tailwind CSS v4 | MIT | Permissive |
| **Icons** | Lucide Icons | ISC | Permissive |

---

## 4. Compliance Guidelines for Enterprise Deployment
1. When deploying strictly for commercial monetization where CC-BY-NC licenses cannot be used:
   - Configure translation provider to `opus-mt` or `qwen2.5` (both Apache 2.0).
   - Set TTS provider to `kokoro` (Apache 2.0).
2. Voice cloning models requiring consent verification:
   - Guarded behind explicit cryptographic or UI consent confirmation flag (`consent_confirmed: true`).
