# OpenVideoStudio - Architecture Specification

## 1. System Architecture Diagram

```text
                               ┌────────────────────────────────────────────────────────┐
                               │                    Client Layer                        │
                               │          React 19 + TypeScript + Tailwind CSS          │
                               │      (Real-time WebSockets, Video Player, Timeline)    │
                               └───────────────────────────┬────────────────────────────┘
                                                           │ HTTP / REST & WebSockets
                                                           ▼
                               ┌────────────────────────────────────────────────────────┐
                               │                  API Gateway & Server                  │
                               │        FastAPI (Python 3.11+) / Express Node Gateway   │
                               │       - Auth & Session Security                        │
                               │       - Project CRUD & Export Manager                  │
                               │       - Pipeline Orchestrator & State Machine          │
                               │       - Hardware Diagnostics Provider (CPU/CUDA)       │
                               └─────────────┬────────────────────────────┬─────────────┘
                                             │                            │
                                             ▼ Async Queue                ▼ SQL
                               ┌─────────────────────────┐   ┌──────────────────────────┐
                               │       Redis Broker      │   │    PostgreSQL / SQLite   │
                               │    (Tasks & Telemetry)  │   │  (Entities, Stages, Logs)│
                               └─────────────┬───────────┘   └──────────────────────────┘
                                             │
             ┌───────────────────────────────┴───────────────────────────────┐
             │                   Worker Subsystem (Modular Pipeline)          │
             ▼                               ▼                               ▼
   ┌───────────────────┐           ┌───────────────────┐           ┌───────────────────┐
   │ Ingestion Worker  │           │   Audio Worker    │           │ Transcription     │
   │      yt-dlp       │           │   FFmpeg Norm     │           │   faster-whisper  │
   └─────────┬─────────┘           └─────────┬─────────┘           └─────────┬─────────┘
             │                               │                               │
             ▼                               ▼                               ▼
   ┌───────────────────┐           ┌───────────────────┐           ┌───────────────────┐
   │ Translation QA    │           │  Storyboard Gen   │           │ Visual Generation │
   │  NLLB-200 / Qwen  │           │ Semantic Segment  │           │ ComfyUI / SDXL    │
   └─────────┬─────────┘           └─────────┬─────────┘           └─────────┬─────────┘
             │                               │                               │
             ▼                               ▼                               ▼
   ┌───────────────────┐           ┌───────────────────┐           ┌───────────────────┐
   │ TTS Synthesis     │           │ Subtitle Engine   │           │ Cinematic Render  │
   │ Kokoro-82M / XTTS │           │   SRT / VTT / ASS │           │ FFmpeg Ken Burns  │
   └─────────┬─────────┘           └─────────┬─────────┘           └─────────┬─────────┘
             │                               │                               │
             └───────────────────────────────┼───────────────────────────────┘
                                             ▼
                               ┌─────────────────────────┐
                               │  Output Storage & QA    │
                               │  - 4K Video Packages    │
                               │  - Subtitles & Audio    │
                               │  - Quality Validation   │
                               │  - Project ZIP Exporter │
                               └─────────────────────────┘
```

---

## 2. Component List

1. **Ingestion Service**: Handles YouTube URL parsing, stream inspection, permitted audio extraction, rate limiting, and fallback local file uploads.
2. **Audio Processing Service**: Normalizes audio to 16-bit PCM WAV at 16kHz mono, applies loudnorm filter (EBU R128), and cleans silence.
3. **Transcription Service (`TranscriptionProvider`)**: Dispatches to `faster-whisper` (models: `tiny`, `base`, `small`, `medium`, `large-v3`) with automated device auto-detection (CUDA / CPU), producing raw and cleaned transcripts with word-level timestamps.
4. **Translation Service (`TranslationProvider`)**: Modular adapter for NLLB-200, OPUS-MT, or Ollama local LLMs with Translation QA verification (length, consistency, proper nouns).
5. **Storyboard Engine**: Segments transcript into visual scenes with cinematic attributes (camera, lens, lighting, environment, character continuity).
6. **Visual Asset Service (`ImageGenerationProvider`)**: Configurable ComfyUI workflow dispatcher (SDXL base/turbo) and Ken Burns animation frame generator.
7. **TTS Engine (`TTSProvider`)**: Kokoro-82M (Apache 2.0) and XTTS-v2 provider with pitch/speed adjustments and sentence-level timing synchronization.
8. **Subtitle Generator**: Produces SRT, VTT, and ASS files respecting reading speed, line limits, and character bounds.
9. **Cinematic Video Renderer**: FFmpeg-powered deterministic rendering with pan, zoom (Ken Burns), crossfades, and multi-language audio track multiplexing up to 4K (3840x2160).
10. **Quality Assurance Engine**: Verifies audio integrity, subtitle alignment, video codec conformity, and outputs `quality_report.json` and `quality_report.html`.

---

## 3. Technology Selection & Rationale

- **Backend**: Python 3.11+ with FastAPI. High-performance asynchronous REST and WebSocket primitives with native typing via Pydantic v2.
- **Relational Storage**: SQLAlchemy with SQLite (zero-config local dev) and PostgreSQL (production).
- **Frontend**: React 19 + TypeScript + Tailwind CSS v4. Clean UI meeting strict WCAG AA legibility, zero-pill typography, and tabular metrics.
- **Task Queue**: Redis + Celery/RQ with an in-memory fallback for lightweight standalone execution.
- **AI Acceleration**: PyTorch with CUDA 12.x / ROCm / CPU fallback.

---

## 4. Database ER Diagram

```text
┌─────────────────┐       1:N       ┌────────────────────────┐
│     Project     ├────────────────►│      ProjectStage      │
│ - id (PK)       │                 │ - id (PK)              │
│ - name          │                 │ - project_id (FK)      │
│ - source_url    │                 │ - stage_name           │
│ - status        │                 │ - status, progress     │
│ - created_at    │                 │ - started/completed_at │
└────────┬────────┘                 └────────────────────────┘
         │
         │ 1:1                     1:N
         ├────────────────► ┌────────────────────────┐
         │                  │         Scene          │
         │                  │ - id (PK), scene_num   │
         │                  │ - start_time, end_time │
         │                  │ - prompt, camera, light│
         │                  │ - image_url            │
         │                  └────────────────────────┘
         │
         │ 1:N                     1:N
         ├────────────────► ┌────────────────────────┐
         │                  │      Translation       │
         │                  │ - id (PK), language    │
         │                  │ - srt_path, vtt_path   │
         │                  │ - voiceover_wav_path   │
         │                  │ - video_4k_path        │
         │                  │ - qa_status            │
         │                  └────────────────────────┘
         ▼ 1:N
┌─────────────────┐
│   PipelineLog   │
│ - id, timestamp │
│ - stage, level  │
│ - message       │
└─────────────────┘
```

---

## 5. API Specification Summary

- `POST /api/projects`: Initialize a localization project.
- `GET /api/projects`: List active and completed projects with disk usage.
- `GET /api/projects/{id}`: Detailed project state, scenes, translations, and asset paths.
- `POST /api/projects/{id}/run`: Launch the complete 17-stage asynchronous pipeline.
- `POST /api/projects/{id}/retry`: Retry specific failed stages without re-running completed work.
- `POST /api/projects/{id}/cancel`: Gracefully terminate running background worker tasks.
- `GET /api/projects/{id}/export`: Download comprehensive project ZIP.
- `GET /api/system/hardware`: CPU cores, RAM, GPU model, VRAM, and CUDA status.
- `GET /api/models`: Model inventory with license metadata, download state, and sizes.
- `WS /ws/projects/{id}`: Real-time stage progress updates and telemetry logs.

---

## 6. Pipeline State Machine

```text
[PENDING] ──► [QUEUED] ──► [RUNNING] ──► [COMPLETED]
                              │
                              ├──► [FAILED] (Retriable)
                              └──► [CANCELLED]
```

Stages execute in sequence:
1. `INGESTION` (yt-dlp metadata & audio fetch)
2. `AUDIO_NORM` (FFmpeg loudnorm & 16kHz conversion)
3. `TRANSCRIPTION` (faster-whisper)
4. `CLEANING` (Raw vs clean transcript separation)
5. `TRANSLATION` (Multi-language NLLB / LLM generation)
6. `TRANSLATION_QA` (Sub-second alignment & consistency verification)
7. `STORYBOARD` (Semantic scene extraction & prompt synthesis)
8. `VISUAL_GEN` (ComfyUI / SDXL asset creation)
9. `VOICEOVER` (Per-language Kokoro TTS synthesis)
10. `SUBTITLES` (SRT, VTT, ASS generation)
11. `RENDER` (Ken Burns cinematic FFmpeg composition)
12. `QUALITY_CHECK` (4K compliance & audio sync audit)
13. `PACKAGING` (Per-language folder structure & ZIP preparation)
