# REST API Reference

The backend exposes an OpenAPI 3.1 compliant REST API.

---

## Projects

### `POST /api/projects`
Create a new localization project.
**Payload:**
```json
{
  "name": "African Economic Outlook",
  "source_type": "youtube",
  "source_url": "https://www.youtube.com/watch?v=example",
  "source_language": "auto",
  "target_languages": ["en", "es", "pt", "fr", "kn", "ml", "hi", "bn", "gu", "zh", "ru"],
  "resolution": "4k",
  "tts_voice": "default"
}
```

### `GET /api/projects`
List all projects, statuses, created dates, and outputs.

### `GET /api/projects/{id}`
Retrieve complete project details including scenes, transcripts, translations, and artifacts.

### `POST /api/projects/{id}/run`
Trigger the pipeline for a project.

### `POST /api/projects/{id}/cancel`
Cancel the currently running pipeline stage.

### `POST /api/projects/{id}/retry`
Retry failed or pending stages.

### `GET /api/projects/{id}/export`
Stream a `.zip` archive containing all localized videos, audio tracks, subtitles, transcripts, and quality reports.

---

## System & Diagnostics

### `GET /api/system/hardware`
Returns hardware detection information:
```json
{
  "cpu": { "cores": 16, "threads": 32, "model": "AMD Ryzen 9" },
  "ram_gb": 64.0,
  "gpu": { "available": true, "name": "NVIDIA RTX 4090", "vram_gb": 24.0, "cuda_version": "12.4" },
  "storage_free_gb": 850.0
}
```

### `GET /api/models`
Returns list of installed and available models with license tags and storage footprints.
