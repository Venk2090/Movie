# Security Policy & Architecture

Security is built into OpenVideoStudio by design.

---

## 1. Zero Shell Injection & Subprocess Hardening
- **Rule**: `os.system` and shell string concatenation (`shell=True`) are strictly prohibited across the codebase.
- **Implementation**: All invocations of `ffmpeg`, `ffprobe`, `yt-dlp`, and internal tools use sanitized parameter lists:
  ```python
  # SAFE:
  subprocess.run(["ffmpeg", "-y", "-i", validated_input, "-c:v", "libx264", output_path], check=True)
  ```

---

## 2. Path Traversal & File Upload Validation
- Uploaded media filenames are sanitized using regex filtering and assigned UUIDs.
- Directory traversal sequences (`../`, `..\`) are stripped and checked with `os.path.commonpath`.
- MIME types and file signatures are validated via magic bytes (not just extensions).

---

## 3. Data Privacy & Local Isolation
- By default, media, transcripts, and voice clips are never transmitted to third-party clouds.
- Ingestion warning is prominently displayed in the UI:
  > *"Only process media that you have the right or permission to download, modify, translate, reproduce or distribute."*
- Voice cloning requires explicit UI consent confirmation stored in audit records.
