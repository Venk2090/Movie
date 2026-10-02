import pytest
from app.pipelines.mock_pipeline import get_mock_translation, MOCK_LOCALIZED_CORPUS

def test_translation_coverage_all_11_languages():
    required_languages = ["en", "es", "pt", "fr", "te", "kn", "ml", "hi", "bn", "gu", "zh", "ru"]
    for lang in required_languages:
        assert lang in MOCK_LOCALIZED_CORPUS
        assert len(MOCK_LOCALIZED_CORPUS[lang]) >= 5
        translated = get_mock_translation("Welcome to our briefing", lang)
        assert len(translated) > 0

def test_indic_script_integrity():
    te_text = MOCK_LOCALIZED_CORPUS["te"][0]
    kn_text = MOCK_LOCALIZED_CORPUS["kn"][0]
    ml_text = MOCK_LOCALIZED_CORPUS["ml"][0]
    
    # Verify Indic unicode range (Telugu: 0C00-0C7F, Kannada: 0C80-0CFF, Malayalam: 0D00-0D7F)
    assert any('\u0c00' <= char <= '\u0c7f' for char in te_text)
    assert any('\u0c80' <= char <= '\u0cff' for char in kn_text)
    assert any('\u0d00' <= char <= '\u0d7f' for char in ml_text)
