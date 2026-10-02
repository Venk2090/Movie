# Troubleshooting & Diagnostics

---

## 1. yt-dlp Ingestion Issues
- **Error**: `Sign in to confirm you're not a bot` or rate limits.
- **Solution**: Pass cookie file or use direct local video upload mode (`.mp4`, `.wav`, `.mkv`). The platform supports direct file drag-and-drop.

---

## 2. FFmpeg Video Render Failures
- **Error**: `Encoder not found: libx264`.
- **Solution**: Install full `ffmpeg` package with `sudo apt install ffmpeg` or use the official Docker image which includes all standard codecs (`libx264`, `libx265`, `libsvtav1`, `aac`).

---

## 3. CUDA Out of Memory (OOM)
- **Error**: `torch.cuda.OutOfMemoryError`.
- **Solution**:
  1. Switch STT model from `large-v3` to `base` or `small` in Settings or `configs/pipeline.yaml`.
  2. Enable sequential stage execution in worker queue to prevent overlapping VRAM usage.

---

## 4. Subtitle Synchronization Mismatch
- **Check**: Look at `quality_report.json` under `timestamp_errors` and `reading_speed_wpm`.
- **Solution**: Re-run the translation QA step via the UI "Retry QA" button.
