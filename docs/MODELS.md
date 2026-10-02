# AI Model Management Guide

OpenVideoStudio decouples business pipelines from specific AI model weights via clean provider interfaces (`TranscriptionProvider`, `TranslationProvider`, `TTSProvider`, `ImageGenerationProvider`).

---

## 1. Speech-to-Text (STT) Models
- **Engine**: `faster-whisper`
- **Supported Weights**:
  - `tiny`: ~75 MB, ultra-fast CPU inference.
  - `base`: ~145 MB, ideal balance for development laptops.
  - `small`: ~480 MB, strong baseline for clean speech.
  - `medium`: ~1.5 GB, high accuracy multilingual.
  - `large-v3`: ~3.1 GB, state-of-the-art accuracy with word timestamps.

---

## 2. Machine Translation Models
- **FOSS Engine 1**: Meta NLLB-200 (`nllb-200-distilled-600M` ~1.2 GB, `nllb-200-3.3B` ~6.5 GB).
  - Native support for 200 languages including Indic languages: Kannada (`kan_Knda`), Malayalam (`mal_Mlym`), Hindi (`hin_Deva`), Bengali (`ben_Beng`), Gujarati (`guj_Gujr`).
- **Commercial Permissive FOSS**: OPUS-MT (MarianMT) ~300 MB per language pair (Apache 2.0).
- **Local LLM Engine**: Ollama with `qwen2.5:7b` (Apache 2.0) or `llama3.2:3b`.

---

## 3. Text-to-Speech (TTS)
- **Kokoro-82M**: Apache 2.0 license, 82 million parameters (~320 MB). Generates natural speech across multiple languages in real-time on CPU.
- **XTTS-v2**: Coqui CPML license, high fidelity voice cloning requiring explicit consent.

---

## 4. Visual Generation & ComfyUI
- **Engine**: ComfyUI API runner via WebSocket / REST `/prompt`.
- **Checkpoint Models**: SDXL Base 1.0 (6.9 GB) or SDXL Turbo (quantized FP8 for low VRAM).
- **Deterministic Baseline**: FFmpeg Ken Burns procedural movement engine (zero GPU requirement).
