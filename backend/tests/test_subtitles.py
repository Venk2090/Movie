import pytest
from app.pipelines.runner import PipelineRunner

def test_srt_formatting():
    runner = PipelineRunner("test-srt-proj")
    segments = [
        {"start": 0.0, "end": 4.5, "text": "First subtitle line."},
        {"start": 4.5, "end": 9.25, "text": "Second subtitle line with decimals."}
    ]
    srt = runner._generate_srt(segments)
    
    assert "00:00:00,000 --> 00:00:04,500" in srt
    assert "00:00:04,500 --> 00:00:09,250" in srt
    assert "First subtitle line." in srt
    assert "Second subtitle line with decimals." in srt

def test_vtt_formatting():
    runner = PipelineRunner("test-vtt-proj")
    segments = [
        {"start": 1.2, "end": 3.8, "text": "VTT test line."}
    ]
    vtt = runner._generate_vtt(segments)
    
    assert "WEBVTT" in vtt
    assert "00:00:01.200 --> 00:00:03.800" in vtt
    assert "VTT test line." in vtt
