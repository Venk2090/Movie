from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional

class TranscriptionProvider(ABC):
    @abstractmethod
    def transcribe(self, audio_path: str, model_size: str = "base", language: Optional[str] = None) -> Dict[str, Any]:
        """Transcribe audio returning language, probability, and timestamped segments."""
        pass

class TranslationProvider(ABC):
    @abstractmethod
    def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        """Translate text while preserving entities, numbers, and structural meaning."""
        pass

class ImageGenerationProvider(ABC):
    @abstractmethod
    def generate(self, prompt: str, negative_prompt: str, seed: int = 42, width: int = 1920, height: int = 1080) -> str:
        """Generate high-resolution image asset from prompt and return saved file path."""
        pass

class TTSProvider(ABC):
    @abstractmethod
    def synthesize(self, text: str, language: str, voice: str = "default", speed: float = 1.0) -> str:
        """Synthesize speech audio WAV returning saved file path."""
        pass

class VideoGenerationProvider(ABC):
    @abstractmethod
    def render_timeline(self, scenes: List[Dict[str, Any]], audio_path: str, output_path: str, resolution: str = "4k") -> str:
        """Render final video combining images with Ken Burns movement, transitions, and audio."""
        pass
