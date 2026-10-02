import pytest

def test_qa_validation_metrics():
    # Simulation of Translation QA metric checks
    segments_source = 145
    segments_target = 145
    timestamp_errors = 0
    empty_segments = 0
    reading_speed_wpm = 150
    
    assert segments_source == segments_target
    assert timestamp_errors == 0
    assert empty_segments == 0
    assert 80 <= reading_speed_wpm <= 220
