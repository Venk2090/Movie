# Development Guide

This guide describes development workflows, testing, and mock mode operation.

---

## 1. Mock Mode for Instant Development
OpenVideoStudio includes a comprehensive Mock AI Pipeline (`MOCK_PIPELINE=true`).
- Generates realistic multi-language transcripts (English, Spanish, Portuguese, French, Kannada, Malayalam, Hindi, Bengali, Gujarati, Chinese, Russian).
- Generates valid SRT/VTT subtitles, audio synthesis waveforms, storyboard scenes, and sample video previews without needing gigabytes of model downloads or GPU hardware.
- Allows immediate frontend and backend UI/UX development on any machine in seconds.

---

## 2. Running Automated Tests
```bash
# Python Backend Tests
pytest backend/tests -v

# Code Quality & Linting
ruff check backend/
mypy backend/app
npm run lint
```
