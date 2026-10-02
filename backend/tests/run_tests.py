import unittest
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.pipelines.mock_pipeline import get_mock_translation, MOCK_LOCALIZED_CORPUS

class TestLocalizationPipeline(unittest.TestCase):
    def test_all_11_languages_available(self):
        required = ["en", "es", "pt", "fr", "te", "kn", "ml", "hi", "bn", "gu", "zh", "ru"]
        for lang in required:
            self.assertIn(lang, MOCK_LOCALIZED_CORPUS)
            self.assertGreaterEqual(len(MOCK_LOCALIZED_CORPUS[lang]), 5)
            text = get_mock_translation("Hello test", lang)
            self.assertTrue(len(text) > 0)

    def test_indic_unicode_scripts(self):
        te = MOCK_LOCALIZED_CORPUS["te"][0]
        kn = MOCK_LOCALIZED_CORPUS["kn"][0]
        ml = MOCK_LOCALIZED_CORPUS["ml"][0]
        hi = MOCK_LOCALIZED_CORPUS["hi"][0]
        bn = MOCK_LOCALIZED_CORPUS["bn"][0]
        gu = MOCK_LOCALIZED_CORPUS["gu"][0]

        # Verify Telugu unicode (\u0c00-\u0c7f)
        self.assertTrue(any('\u0c00' <= c <= '\u0c7f' for c in te))
        # Verify Kannada unicode
        self.assertTrue(any('\u0c80' <= c <= '\u0cff' for c in kn))
        # Verify Malayalam unicode
        self.assertTrue(any('\u0d00' <= c <= '\u0d7f' for c in ml))
        # Verify Devanagari unicode
        self.assertTrue(any('\u0900' <= c <= '\u097f' for c in hi))
        # Verify Bengali unicode
        self.assertTrue(any('\u0980' <= c <= '\u09ff' for c in bn))
        # Verify Gujarati unicode
        self.assertTrue(any('\u0a80' <= c <= '\u0aff' for c in gu))

    def test_srt_formatting(self):
        from app.pipelines.runner import PipelineRunner
        runner = PipelineRunner("test-srt")
        segments = [
            {"start": 0.0, "end": 4.5, "text": "First subtitle line."},
            {"start": 4.5, "end": 9.25, "text": "Second subtitle line."}
        ]
        srt = runner._generate_srt(segments)
        self.assertIn("00:00:00,000 --> 00:00:04,500", srt)
        self.assertIn("00:00:04,500 --> 00:00:09,250", srt)
        self.assertIn("First subtitle line.", srt)

if __name__ == "__main__":
    unittest.main()
