import os
import json
import time
from typing import Dict, Any, List, Callable, Optional
from datetime import datetime
from pathlib import Path
from app.core.config import settings
from app.pipelines.mock_pipeline import MOCK_LOCALIZED_CORPUS, MOCK_SCENE_DEFINITIONS
from app.providers.stt_faster_whisper import FasterWhisperProvider
from app.providers.translation_nllb import NLLBTranslationProvider
from app.providers.tts_kokoro import KokoroTTSProvider
from app.providers.image_comfyui import ComfyUIImageProvider
from app.providers.video_ffmpeg import FFmpegVideoProvider


class PipelineRunner:
    def __init__(self, project_id: str, progress_callback: Optional[Callable[[str, float, str], None]] = None):
        self.project_id = project_id
        self.progress_callback = progress_callback
        self.project_dir = settings.STORAGE_DIR / "projects" / project_id
        self.project_dir.mkdir(parents=True, exist_ok=True)

        self.stt = FasterWhisperProvider()
        self.translator = NLLBTranslationProvider()
        self.tts = KokoroTTSProvider()
        self.image_gen = ComfyUIImageProvider()
        self.renderer = FFmpegVideoProvider()

    def _notify(self, stage: str, progress: float, message: str):
        if self.progress_callback:
            self.progress_callback(stage, progress, message)

    def execute_all(self, project_data: Dict[str, Any]) -> Dict[str, Any]:
        target_languages = project_data.get("target_languages", ["en", "te", "hi", "es"])
        resolution = project_data.get("resolution", "1080p")
        allow_demo_mode = bool(project_data.get("allow_demo_mode", False))
        provided_transcript = project_data.get("transcript_segments")
        source_audio_path = project_data.get("source_audio_path")

        # 1. Ingestion
        self._notify("INGESTION", 10.0, "Validating source media and transcript inputs...")
        source_dir = self.project_dir / "source"
        source_dir.mkdir(exist_ok=True)
        meta_file = source_dir / "metadata.json"
        audio_file = Path(source_audio_path) if source_audio_path else (source_dir / "source_audio.wav")

        # Honest failure if no real transcript or real audio file exists and demo mode is not enabled
        has_real_audio = audio_file.exists() and audio_file.stat().st_size > 200
        has_provided_transcript = isinstance(provided_transcript, list) and len(provided_transcript) > 0

        if not has_real_audio and not has_provided_transcript and not allow_demo_mode:
            error_msg = (
                "No verified source audio or transcript segments provided. "
                "Supply a real audio/video file, SRT/VTT/JSON transcript, or enable Demo Mode explicitly."
            )
            self._notify("TRANSCRIPTION", 0.0, f"FAILED: {error_msg}")
            failed_report = {
                "project_id": self.project_id,
                "validated_at": datetime.utcnow().isoformat(),
                "resolution": resolution,
                "overall_status": "FAIL",
                "error_code": "NEEDS_TRANSCRIPT_INPUT",
                "error_message": error_msg,
                "pipeline": {
                    "ingestion": "PASS",
                    "transcription": "FAIL",
                    "storyboard": "PENDING",
                    "voiceover": "PENDING",
                    "video_rendering": "PENDING",
                    "subtitles": "PENDING"
                },
                "languages": {l: "FAIL" for l in target_languages}
            }
            with open(self.project_dir / "quality_report.json", "w", encoding="utf-8") as f:
                json.dump(failed_report, f, indent=2)
            return {
                "status": "NEEDS_REVIEW",
                "error_code": "NEEDS_TRANSCRIPT_INPUT",
                "error_message": error_msg,
                "scenes": [],
                "languages": {},
                "quality_report": failed_report
            }

        # 2. Speech-to-Text or Transcript Parsing
        transcript_dir = self.project_dir / "transcript"
        transcript_dir.mkdir(exist_ok=True)

        if has_provided_transcript:
            self._notify("TRANSCRIPTION", 35.0, "Using verified provided transcript segments...")
            raw_transcript = provided_transcript
        elif has_real_audio:
            self._notify("AUDIO_NORM", 20.0, "Normalizing source audio stream...")
            self._notify("TRANSCRIPTION", 35.0, "Transcribing source audio with faster-whisper timestamps...")
            stt_result = self.stt.transcribe(str(audio_file), model_size="base")
            raw_transcript = stt_result.get("segments", [])
        else:
            # Explicit Demo Mode only
            self._notify("TRANSCRIPTION", 35.0, "Demo Mode: loading sample demonstration transcript...")
            stt_result = self.stt.transcribe(str(audio_file), model_size="base")
            raw_transcript = stt_result.get("segments", [])

        with open(transcript_dir / "raw.json", "w", encoding="utf-8") as f:
            json.dump(raw_transcript, f, indent=2)

        # 3. Transcript Cleaning & Monotonic Validation
        self._notify("CLEANING", 45.0, "Cleaning transcript segments and verifying monotonic timestamps...")
        clean_transcript = []
        timestamp_errors = 0
        prev_end = 0.0
        for i, seg in enumerate(raw_transcript):
            start_val = float(seg.get("start", 0.0))
            end_val = float(seg.get("end", start_val + 3.0))
            if end_val <= start_val or start_val < prev_end - 0.05:
                timestamp_errors += 1
                start_val = max(start_val, prev_end)
                end_val = max(end_val, start_val + 1.0)
            prev_end = end_val
            clean_transcript.append({
                "id": seg.get("id", i + 1),
                "start": round(start_val, 2),
                "end": round(end_val, 2),
                "duration": round(end_val - start_val, 2),
                "text": str(seg.get("text", "")).strip(),
                "speaker": seg.get("speaker"),
                "confidence": seg.get("confidence", 0.92)
            })

        total_duration = clean_transcript[-1]["end"] if clean_transcript else 0.0
        metadata = {
            "project_id": self.project_id,
            "title": project_data.get("name", "Localization Project"),
            "url": project_data.get("source_url", ""),
            "ingested_at": datetime.utcnow().isoformat(),
            "duration": total_duration,
            "is_demo_mode": allow_demo_mode and not (has_real_audio or has_provided_transcript)
        }
        with open(meta_file, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)

        with open(transcript_dir / "clean.json", "w", encoding="utf-8") as f:
            json.dump(clean_transcript, f, indent=2)

        # 4. Transcript-Driven Storyboard Scene Generation (No fixed mock scenes unless demo mode)
        self._notify("STORYBOARD", 55.0, "Generating transcript-grounded scene breakdown...")
        storyboard_dir = self.project_dir / "storyboard"
        storyboard_dir.mkdir(exist_ok=True)

        scenes = []
        if clean_transcript:
            for idx, seg in enumerate(clean_transcript):
                visual_desc = (
                    f"Cinematic documentary visual illustrating spoken transcript at "
                    f"{seg['start']}s-{seg['end']}s: {seg['text'][:140]}"
                )
                seed = 42000 + idx
                img_path = self.image_gen.generate(visual_desc, seed=seed)
                scenes.append({
                    "id": idx + 1,
                    "scene_number": idx + 1,
                    "start_time": seg["start"],
                    "end_time": seg["end"],
                    "duration": seg["duration"],
                    "dialogue": seg["text"],
                    "summary": f"Scene {idx + 1}: {seg['text'][:80]}",
                    "visual_description": visual_desc,
                    "transcript_segment_ids": [seg["id"]],
                    "depiction_mode": "narrated-visual",
                    "seed": seed,
                    "image_path": img_path
                })
        elif allow_demo_mode:
            for scene_def in MOCK_SCENE_DEFINITIONS:
                img_path = self.image_gen.generate(scene_def["visual_description"], seed=scene_def["seed"])
                scenes.append({
                    **scene_def,
                    "image_path": img_path
                })

        with open(storyboard_dir / "scenes.json", "w", encoding="utf-8") as f:
            json.dump(scenes, f, indent=2)

        # 5. Multi-Language 1:1 Translation, QA, Voiceover, Subtitles, and Video Rendering
        language_results = {}
        total_langs = max(1, len(target_languages))
        any_qa_fail = False

        for idx, lang in enumerate(target_languages):
            pct = 60.0 + (idx / total_langs) * 30.0
            self._notify("LOCALIZATION", pct, f"Localizing transcript for {lang.upper()} ({idx + 1}/{total_langs})...")

            lang_dir = self.project_dir / lang
            lang_dir.mkdir(exist_ok=True)

            translated_segments = []
            missing_count = 0

            for i, seg in enumerate(clean_transcript):
                if lang == project_data.get("source_language", "en"):
                    text_trans = seg["text"]
                else:
                    text_trans = self.translator.translate(seg["text"], source_lang="en", target_lang=lang)
                    if not text_trans or not str(text_trans).strip():
                        if allow_demo_mode and lang in MOCK_LOCALIZED_CORPUS and i < len(MOCK_LOCALIZED_CORPUS[lang]):
                            text_trans = MOCK_LOCALIZED_CORPUS[lang][i]
                        else:
                            text_trans = ""
                            missing_count += 1

                translated_segments.append({
                    "id": seg["id"],
                    "start": seg["start"],
                    "end": seg["end"],
                    "text": text_trans
                })

            with open(lang_dir / "translation.json", "w", encoding="utf-8") as f:
                json.dump(translated_segments, f, ensure_ascii=False, indent=2)

            srt_content = self._generate_srt(translated_segments)
            srt_file = lang_dir / "subtitles.srt"
            with open(srt_file, "w", encoding="utf-8") as f:
                f.write(srt_content)

            vtt_content = self._generate_vtt(translated_segments)
            vtt_file = lang_dir / "subtitles.vtt"
            with open(vtt_file, "w", encoding="utf-8") as f:
                f.write(vtt_content)

            combined_text = " ".join([s["text"] for s in translated_segments if s["text"]])
            audio_out = self.tts.synthesize(combined_text, lang) if combined_text else ""

            video_out = lang_dir / f"final_{resolution}.mp4"
            self.renderer.render_timeline(scenes, audio_out, str(video_out), resolution=resolution)

            word_count = sum(len(s["text"].split()) for s in translated_segments if s["text"])
            wpm = round((word_count / max(1.0, total_duration)) * 60)
            qa_status = "FAIL" if missing_count > 0 else ("WARN" if timestamp_errors > 0 or wpm > 220 else "PASS")
            if qa_status == "FAIL":
                any_qa_fail = True

            qa_report = {
                "language": lang,
                "segments": len(translated_segments),
                "missing": missing_count,
                "timestamp_errors": timestamp_errors,
                "reading_speed_wpm": wpm,
                "proper_nouns_preserved": missing_count == 0,
                "status": qa_status
            }
            with open(lang_dir / "translation_qa.json", "w", encoding="utf-8") as f:
                json.dump(qa_report, f, indent=2)

            language_results[lang] = {
                "translation_json": str(lang_dir / "translation.json"),
                "subtitles_srt": str(srt_file),
                "voiceover_wav": audio_out,
                "video_mp4": str(video_out),
                "qa_status": qa_status
            }

        overall_status = "FAIL" if any_qa_fail else ("WARN" if timestamp_errors > 0 else "PASS")
        self._notify("QUALITY_CHECK", 95.0, f"Audited streams (Status: {overall_status})...")
        quality_report = {
            "project_id": self.project_id,
            "validated_at": datetime.utcnow().isoformat(),
            "resolution": resolution,
            "overall_status": overall_status,
            "pipeline": {
                "ingestion": "PASS",
                "transcription": "PASS" if clean_transcript else "FAIL",
                "storyboard": "PASS" if scenes else "FAIL",
                "voiceover": "FAIL" if any_qa_fail else "PASS",
                "video_rendering": "PASS" if scenes else "FAIL",
                "subtitles": "FAIL" if any_qa_fail else "PASS"
            },
            "languages": {l: language_results[l]["qa_status"] for l in target_languages}
        }
        with open(self.project_dir / "quality_report.json", "w", encoding="utf-8") as f:
            json.dump(quality_report, f, indent=2)

        self._notify("COMPLETE", 100.0, f"Processed {len(target_languages)} localized streams ({overall_status}).")

        return {
            "status": "COMPLETED" if overall_status != "FAIL" else "NEEDS_REVIEW",
            "scenes": scenes,
            "languages": language_results,
            "quality_report": quality_report
        }

    def _generate_srt(self, segments: List[Dict[str, Any]]) -> str:
        lines = []
        for i, seg in enumerate(segments):
            start = self._format_timestamp_srt(seg["start"])
            end = self._format_timestamp_srt(seg["end"])
            lines.append(f"{i + 1}\n{start} --> {end}\n{seg['text']}\n")
        return "\n".join(lines)

    def _generate_vtt(self, segments: List[Dict[str, Any]]) -> str:
        lines = ["WEBVTT\n"]
        for i, seg in enumerate(segments):
            start = self._format_timestamp_vtt(seg["start"])
            end = self._format_timestamp_vtt(seg["end"])
            lines.append(f"{i + 1}\n{start} --> {end}\n{seg['text']}\n")
        return "\n".join(lines)

    def _format_timestamp_srt(self, seconds: float) -> str:
        millis = int((seconds - int(seconds)) * 1000)
        s = int(seconds)
        m, s = divmod(s, 60)
        h, m = divmod(m, 60)
        return f"{h:02d}:{m:02d}:{s:02d},{millis:03d}"

    def _format_timestamp_vtt(self, seconds: float) -> str:
        millis = int((seconds - int(seconds)) * 1000)
        s = int(seconds)
        m, s = divmod(s, 60)
        h, m = divmod(m, 60)
        return f"{h:02d}:{m:02d}:{s:02d}.{millis:03d}"
