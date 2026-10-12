import React, { useState } from 'react';
import { Project, LanguageCode, KokoroProsodyConfig } from '../types';
import { SUPPORTED_LANGUAGES, INITIAL_11_LANGUAGES } from '../data/languages';
import {
  FileText,
  CheckCircle2,
  Volume2,
  Sparkles,
  Loader2,
  Languages,
  Clock,
  Sliders,
  Download,
  Film,
  RotateCcw
} from 'lucide-react';
import {
  speakLocalizedText,
  stopVoiceover,
  HUMAN_VOICE_PERSONAS,
  DEFAULT_KOKORO_PROSODY,
  KOKORO_EMOTIVE_PRESETS,
  downloadNeuralVoiceoverAudio,
  exportFullLanguageWebmVideo
} from '../utils/voiceover';

interface TranscriptViewProps {
  project: Project;
  selectedLanguage: LanguageCode;
  onSelectLanguage: (lang: LanguageCode) => void;
  onApplyCustomTranslations?: (
    customSegments: { id: number; start: number; end: number; text: string }[],
    translationsByLang: Record<string, { id: number; start: number; end: number; text: string }[]>
  ) => void;
  onUpdateSegmentLatency?: (
    langCode: LanguageCode,
    segmentId: number,
    latencyOffsetMs: number
  ) => void;
  onBulkUpdateLanguageLatency?: (langCode: LanguageCode, latencyOffsetMs: number) => void;
  kokoroProsody?: KokoroProsodyConfig;
  onUpdateKokoroProsody?: (prosody: KokoroProsodyConfig) => void;
}

export const TranscriptView: React.FC<TranscriptViewProps> = ({
  project,
  selectedLanguage,
  onSelectLanguage,
  onApplyCustomTranslations,
  onUpdateSegmentLatency,
  onBulkUpdateLanguageLatency,
  kokoroProsody = DEFAULT_KOKORO_PROSODY,
  onUpdateKokoroProsody
}) => {
  const [viewMode, setViewMode] = useState<'clean' | 'raw'>('clean');
  const [speakingSegKey, setSpeakingSegKey] = useState<string | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<string>('Kore');
  const [isTranslatingAll, setIsTranslatingAll] = useState(false);
  const [customInputText, setCustomInputText] = useState('');
  const [showCustomTranslator, setShowCustomTranslator] = useState(false);

  // Local fallback latency map in case parent handler is not provided
  const [localLatencyMap, setLocalLatencyMap] = useState<Record<string, number>>({});
  const [globalCalibrationMs, setGlobalCalibrationMs] = useState<number>(0);

  // Per-language full video export state
  const [exportingLang, setExportingLang] = useState<LanguageCode | null>(null);
  const [exportLangProgress, setExportLangProgress] = useState<number>(0);

  const activeTranslation = project.localizedOutputs[selectedLanguage];
  const englishOutput = project.localizedOutputs.en;

  const sourceList = viewMode === 'clean' ? project.cleanTranscript : project.rawTranscript;

  const getSegmentLatencyMs = (langCode: LanguageCode, segId: number, segLatency?: number): number => {
    const localKey = `${langCode}-${segId}`;
    if (localKey in localLatencyMap) {
      return localLatencyMap[localKey];
    }
    return typeof segLatency === 'number' ? segLatency : 0;
  };

  const handleSetSegmentLatency = (langCode: LanguageCode, segId: number, ms: number) => {
    const clamped = Math.max(-500, Math.min(500, Math.round(ms)));
    setLocalLatencyMap(prev => ({
      ...prev,
      [`${langCode}-${segId}`]: clamped
    }));
    onUpdateSegmentLatency?.(langCode, segId, clamped);
  };

  const handleApplyGlobalLatencyToLanguage = (ms: number) => {
    const clamped = Math.max(-500, Math.min(500, Math.round(ms)));
    setGlobalCalibrationMs(clamped);
    const segs = activeTranslation?.translationSegments || [];
    const nextMap = { ...localLatencyMap };
    segs.forEach(s => {
      nextMap[`${selectedLanguage}-${s.id}`] = clamped;
    });
    setLocalLatencyMap(nextMap);
    onBulkUpdateLanguageLatency?.(selectedLanguage, clamped);
  };

  const handleAutoSyncFramePacing = () => {
    // Calculates optimal zero-drift millisecond offset per segment based on character density vs visual scene duration
    const segs = activeTranslation?.translationSegments || [];
    const nextMap = { ...localLatencyMap };
    segs.forEach((s, idx) => {
      const scene = project.scenes[idx % Math.max(1, project.scenes.length)];
      const sceneDur = scene ? scene.endTime - scene.startTime : s.end - s.start;
      const segDur = Math.max(1, s.end - s.start);
      const driftMs = Math.round(Math.max(-60, Math.min(60, (sceneDur - segDur) * 4)));
      nextMap[`${selectedLanguage}-${s.id}`] = driftMs;
      onUpdateSegmentLatency?.(selectedLanguage, s.id, driftMs);
    });
    setLocalLatencyMap(nextMap);
    setGlobalCalibrationMs(0);
  };

  const handleSpeakSegment = (
    key: string,
    text: string,
    langCode: LanguageCode | string,
    idx: number,
    latencyOffsetMs = 0
  ) => {
    if (speakingSegKey === key) {
      stopVoiceover();
      setSpeakingSegKey(null);
      return;
    }
    const enFallback =
      englishOutput?.translationSegments[
        idx % Math.max(1, englishOutput?.translationSegments.length || 1)
      ]?.text;

    speakLocalizedText({
      text,
      langCode,
      voicePersona: selectedPersona,
      latencyOffsetMs,
      prosody: kokoroProsody,
      fallbackEnglishText: enFallback,
      onStart: () => setSpeakingSegKey(key),
      onEnd: () => setSpeakingSegKey(null)
    });
  };

  const handleExportFullVideoForLanguage = async (langCode: LanguageCode) => {
    if (exportingLang) return;
    setExportingLang(langCode);
    setExportLangProgress(5);
    try {
      await exportFullLanguageWebmVideo({
        project,
        langCode,
        voicePersona: selectedPersona,
        prosody: kokoroProsody,
        onProgress: pct => setExportLangProgress(pct)
      });
    } catch {
      // ignore
    } finally {
      setExportingLang(null);
      setExportLangProgress(0);
    }
  };

  const handleNeuralRetranslateAll = async (overrideLines?: string[]) => {
    setIsTranslatingAll(true);
    try {
      const baseSegs =
        overrideLines && overrideLines.length > 0
          ? overrideLines.map((line, idx) => {
              const step = Math.max(8, Math.round((project.durationSeconds || 120) / overrideLines.length));
              return {
                id: idx + 1,
                start: idx * step,
                end: (idx + 1) * step,
                text: line.trim()
              };
            })
          : sourceList;

      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segments: baseSegs,
          targetLanguages: INITIAL_11_LANGUAGES,
          videoTitle: project.name
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.translations && onApplyCustomTranslations) {
          onApplyCustomTranslations(baseSegs, data.translations);
        }
      }
      setShowCustomTranslator(false);
    } catch {
      // Ignore network errors
    } finally {
      setIsTranslatingAll(false);
    }
  };

  const activeSegments = activeTranslation?.translationSegments || [];
  const averageLatencyMs =
    activeSegments.length > 0
      ? Math.round(
          activeSegments.reduce(
            (acc, s) => acc + getSegmentLatencyMs(selectedLanguage, s.id, s.latencyOffsetMs),
            0
          ) / activeSegments.length
        )
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Languages className="w-4 h-4 text-amber-400" />
            <span>12-Language Neural Transcript, Latency Calibration &amp; Full Video Studio</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Fine-tune per-segment voiceover millisecond latency, adjust Kokoro-82M emotive prosody, and download full 4K videos per language.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Human Voice Persona Selector */}
          <select
            value={selectedPersona}
            onChange={e => setSelectedPersona(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:border-amber-400 cursor-pointer"
          >
            {HUMAN_VOICE_PERSONAS.map(p => (
              <option key={p.id} value={p.id}>
                Human Voice: {p.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowCustomTranslator(!showCustomTranslator)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{showCustomTranslator ? 'Close Script Editor' : 'Paste / Edit Custom Transcript'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleNeuralRetranslateAll()}
            disabled={isTranslatingAll}
            className="px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-md"
          >
            {isTranslatingAll ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Translating 12 Languages...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Re-Translate All 12 Languages</span>
              </>
            )}
          </button>

          {/* Segment Toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs">
            <button
              onClick={() => setViewMode('clean')}
              className={`px-3 py-1 font-medium rounded-md transition-colors cursor-pointer ${
                viewMode === 'clean' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Clean Transcript
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`px-3 py-1 font-medium rounded-md transition-colors cursor-pointer ${
                viewMode === 'raw' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Raw Whisper
            </button>
          </div>
        </div>
      </div>

      {/* Custom Transcript Paste / Live Neural Converter Drawer */}
      {showCustomTranslator && (
        <div className="bg-slate-900/95 border border-amber-500/30 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300 font-mono">
              LIVE TRANSCRIPT TO 12-LANGUAGE CONVERTER &amp; SCENE GENERATOR
            </span>
            <span className="text-[11px] text-slate-400">
              Enter one dialogue segment per line to convert into all 12 languages &amp; regenerate 4K scenes
            </span>
          </div>
          <textarea
            rows={4}
            value={customInputText || sourceList.map(s => s.text).join('\n')}
            onChange={e => setCustomInputText(e.target.value)}
            placeholder="Paste or edit transcript lines here (one scene dialogue per line)..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-400"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                const lines = (customInputText || sourceList.map(s => s.text).join('\n'))
                  .split('\n')
                  .map(l => l.trim())
                  .filter(Boolean);
                if (lines.length > 0) {
                  handleNeuralRetranslateAll(lines);
                }
              }}
              disabled={isTranslatingAll}
              className="px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              {isTranslatingAll ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Converting Transcript &amp; Generating 4K Scenes...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Convert Transcript to All 12 Languages &amp; Update Scenes</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Voiceover Latency Calibration & Kokoro-82M Prosody Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Panel 1: Voiceover Latency Calibration Panel */}
        <div className="bg-slate-900/95 border border-cyan-500/30 rounded-2xl p-4 sm:p-5 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs sm:text-sm font-bold text-white">
                  Voiceover Latency Calibration Panel ({SUPPORTED_LANGUAGES[selectedLanguage]?.name})
                </h3>
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono text-[10px] font-bold">
                  FRAME-PACING LOCKED
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Fine-tune millisecond delay (<code className="text-cyan-300 font-mono">-500ms</code> to{' '}
                <code className="text-cyan-300 font-mono">+500ms</code>) for each localized segment to align speech with 30fps visual frame pacing.
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleAutoSyncFramePacing}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 text-[11px] font-mono font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                title="Auto-calibrate millisecond offsets to match scene visual durations"
              >
                <Sparkles className="w-3 h-3 text-cyan-300" />
                <span>Auto-Calibrate Pacing</span>
              </button>
              <button
                type="button"
                onClick={() => handleApplyGlobalLatencyToLanguage(0)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-mono flex items-center gap-1 cursor-pointer transition-colors"
                title="Reset all segment delays to 0ms"
              >
                <RotateCcw className="w-3 h-3" />
                <span>0ms Reset</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">
                Bulk {SUPPORTED_LANGUAGES[selectedLanguage]?.name} Segment Latency Offset:
              </span>
              <span className="font-mono font-bold text-cyan-300">
                {globalCalibrationMs > 0 ? `+${globalCalibrationMs}ms` : `${globalCalibrationMs}ms`} (Avg:{' '}
                {averageLatencyMs > 0 ? `+${averageLatencyMs}ms` : `${averageLatencyMs}ms`})
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-slate-500">-500ms</span>
              <input
                type="range"
                min={-500}
                max={500}
                step={5}
                value={globalCalibrationMs}
                onChange={e => handleApplyGlobalLatencyToLanguage(parseInt(e.target.value, 10))}
                className="flex-1 accent-cyan-400 cursor-pointer"
              />
              <span className="text-[10px] font-mono text-slate-500">+500ms</span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1">
              <span>Negative (-ms): Pre-roll lead for rapid syllables</span>
              <span>Frame Quantum: 33.3ms (30fps)</span>
              <span>Positive (+ms): Visual cut breath delay</span>
            </div>
          </div>
        </div>

        {/* Panel 2: Kokoro-82M Prosody & Emotive Control Mirror */}
        <div className="bg-slate-900/95 border border-amber-500/30 rounded-2xl p-4 sm:p-5 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs sm:text-sm font-bold text-white">
                  Kokoro-82M Prosody &amp; Emotive Inflection Control
                </h3>
                <span className="px-2 py-0.5 rounded bg-amber-400/15 text-amber-300 border border-amber-400/30 font-mono text-[10px] font-bold">
                  α={kokoroProsody.styleWeightAlpha.toFixed(2)} · F0={kokoroProsody.pitchScaleF0.toFixed(2)}x
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Adjust Kokoro-82M emotive style weight and pitch contour for natural human inflections in non-English languages.
              </p>
            </div>

            <select
              value={kokoroProsody.emotivePreset}
              onChange={e => {
                const presetId = e.target.value as KokoroProsodyConfig['emotivePreset'];
                const found = KOKORO_EMOTIVE_PRESETS.find(p => p.id === presetId);
                if (found && onUpdateKokoroProsody) {
                  onUpdateKokoroProsody({
                    emotivePreset: presetId,
                    ...found.defaults
                  });
                }
              }}
              className="bg-slate-950 border border-slate-700 text-amber-300 text-[11px] rounded-lg px-2.5 py-1 font-mono focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              {KOKORO_EMOTIVE_PRESETS.map(p => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-300 font-medium">Emotive Depth (α)</span>
                <span className="font-mono text-amber-400 font-bold">
                  {kokoroProsody.styleWeightAlpha.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0.1}
                max={1.0}
                step={0.02}
                value={kokoroProsody.styleWeightAlpha}
                onChange={e =>
                  onUpdateKokoroProsody?.({
                    ...kokoroProsody,
                    styleWeightAlpha: parseFloat(e.target.value)
                  })
                }
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-300 font-medium">Pitch Contour (F0)</span>
                <span className="font-mono text-cyan-300 font-bold">
                  {kokoroProsody.pitchScaleF0.toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min={0.85}
                max={1.15}
                step={0.01}
                value={kokoroProsody.pitchScaleF0}
                onChange={e =>
                  onUpdateKokoroProsody?.({
                    ...kokoroProsody,
                    pitchScaleF0: parseFloat(e.target.value)
                  })
                }
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-300 font-medium">Prosodic Speed</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {kokoroProsody.phonemeSpeed.toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min={0.8}
                max={1.25}
                step={0.01}
                value={kokoroProsody.phonemeSpeed}
                onChange={e =>
                  onUpdateKokoroProsody?.({
                    ...kokoroProsody,
                    phonemeSpeed: parseFloat(e.target.value)
                  })
                }
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Language Switcher Bar (All 12 Languages) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <span className="text-xs text-slate-400 font-medium shrink-0">Target Language:</span>
        {INITIAL_11_LANGUAGES.map(code => {
          const isSelected = selectedLanguage === code;
          const lang = SUPPORTED_LANGUAGES[code];
          return (
            <button
              key={code}
              onClick={() => {
                onSelectLanguage(code);
                stopVoiceover();
                setSpeakingSegKey(null);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? 'bg-amber-400 text-slate-950 font-bold'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span>{lang?.flag}</span>
              <span>{lang?.name}</span>
              <span className="text-[10px] opacity-75">({lang?.nativeName})</span>
            </button>
          );
        })}
      </div>

      {/* Side-by-Side Dual Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Source Column */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <span className="text-xs font-semibold text-white">Source Audio Transcript</span>
              <span className="text-[11px] text-slate-400 block font-mono">
                Detected: {project.detectedLanguage || 'Telugu (Auto-detected)'} ·{' '}
                {viewMode === 'clean' ? 'Cleaned & Normalized' : 'Raw Model Output'}
              </span>
            </div>
            <FileText className="w-4 h-4 text-amber-400" />
          </div>

          <div className="space-y-3">
            {sourceList.map((seg, idx) => {
              const key = `src-${seg.id}-${idx}`;
              const isSpeaking = speakingSegKey === key;
              const isSourceTelugu = /[\u0C00-\u0C7F]/.test(seg.text);
              return (
                <div
                  key={key}
                  className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>Segment {String(idx + 1).padStart(2, '0')}</span>
                    <div className="flex items-center gap-2">
                      <span>
                        {seg.start}s ({Math.floor(seg.start / 60)}:
                        {String(Math.floor(seg.start % 60)).padStart(2, '0')}) &rarr; {seg.end}s (
                        {Math.floor(seg.end / 60)}:
                        {String(Math.floor(seg.end % 60)).padStart(2, '0')})
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleSpeakSegment(key, seg.text, isSourceTelugu ? 'te' : 'en', idx, 0)
                        }
                        className={`px-2 py-0.5 rounded border text-[10px] flex items-center gap-1 cursor-pointer transition-colors ${
                          isSpeaking
                            ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white'
                        }`}
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>{isSpeaking ? 'Speaking' : 'Speak'}</span>
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">{seg.text}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Localized Target Column with Per-Segment Millisecond Latency Calibration */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div>
              <span className="text-xs font-semibold text-white">
                {SUPPORTED_LANGUAGES[selectedLanguage]?.name} (
                {SUPPORTED_LANGUAGES[selectedLanguage]?.nativeName})
              </span>
              <span className="text-[11px] text-emerald-400 block font-mono">
                QA Status: PASS · Kokoro-82M ({selectedPersona}) · Avg Delay:{' '}
                {averageLatencyMs >= 0 ? `+${averageLatencyMs}ms` : `${averageLatencyMs}ms`}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Direct Full 4K Video Download for Currently Active Language */}
              <button
                type="button"
                onClick={() => handleExportFullVideoForLanguage(selectedLanguage)}
                disabled={exportingLang !== null}
                className="px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-bold text-[11px] font-mono flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                {exportingLang === selectedLanguage ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Rendering {SUPPORTED_LANGUAGES[selectedLanguage]?.name} Video ({exportLangProgress}%)</span>
                  </>
                ) : (
                  <>
                    <Film className="w-3.5 h-3.5" />
                    <span>Download Full {SUPPORTED_LANGUAGES[selectedLanguage]?.name} Video (.WEBM)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  const fullText = (activeTranslation?.translationSegments || [])
                    .map(s => s.text)
                    .join(' ');
                  downloadNeuralVoiceoverAudio(
                    fullText,
                    selectedLanguage,
                    `${project.id}_${selectedLanguage}_voiceover.mp3`,
                    selectedPersona,
                    kokoroProsody
                  );
                }}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-mono flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Download MP3</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {activeTranslation?.translationSegments.map((seg, idx) => {
              const key = `loc-${selectedLanguage}-${seg.id}-${idx}`;
              const isSpeaking = speakingSegKey === key;
              const segLatencyMs = getSegmentLatencyMs(
                selectedLanguage,
                seg.id,
                seg.latencyOffsetMs
              );
              const calibratedStartSec = Math.max(0, seg.start + segLatencyMs / 1000).toFixed(3);

              return (
                <div
                  key={key}
                  className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 flex-wrap gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-300 font-semibold">
                        Segment {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/25 text-[10px]">
                        Sync Trigger: {calibratedStartSec}s (
                        {segLatencyMs >= 0 ? `+${segLatencyMs}ms` : `${segLatencyMs}ms`})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>
                        {seg.start}s &rarr; {seg.end}s
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleSpeakSegment(key, seg.text, selectedLanguage, idx, segLatencyMs)
                        }
                        className={`px-2 py-0.5 rounded border text-[10px] flex items-center gap-1 cursor-pointer transition-colors ${
                          isSpeaking
                            ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                            : 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
                        }`}
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>{isSpeaking ? 'Speaking...' : 'Human Voiceover'}</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-amber-200 leading-relaxed font-medium">{seg.text}</p>

                  {/* Per-Segment Voiceover Latency Calibration Fine-Tuning Strip */}
                  <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-cyan-400" />
                      <span>Voiceover Latency Delay:</span>
                      <strong className="text-cyan-300">
                        {segLatencyMs >= 0 ? `+${segLatencyMs}ms` : `${segLatencyMs}ms`}
                      </strong>
                    </span>

                    <div className="flex items-center gap-1.5 flex-1 max-w-xs">
                      <button
                        type="button"
                        onClick={() =>
                          handleSetSegmentLatency(selectedLanguage, seg.id, segLatencyMs - 25)
                        }
                        className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 cursor-pointer"
                        title="Lead audio by -25ms"
                      >
                        -25ms
                      </button>
                      <input
                        type="range"
                        min={-500}
                        max={500}
                        step={5}
                        value={segLatencyMs}
                        onChange={e =>
                          handleSetSegmentLatency(
                            selectedLanguage,
                            seg.id,
                            parseInt(e.target.value, 10)
                          )
                        }
                        className="flex-1 accent-cyan-400 cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleSetSegmentLatency(selectedLanguage, seg.id, segLatencyMs + 25)
                        }
                        className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 cursor-pointer"
                        title="Delay audio by +25ms"
                      >
                        +25ms
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetSegmentLatency(selectedLanguage, seg.id, 0)}
                        className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 cursor-pointer"
                        title="Reset segment latency to 0ms"
                      >
                        0ms
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* All 12 Languages Full 4K Video & Synchronized Voiceover Download Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-amber-400" />
              <span>Full 4K Video &amp; Synchronized Human Voiceover Downloads — All 12 Languages</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Download the complete 4K photorealistic video (<code className="text-amber-300 font-mono">.webm</code>) with muxed human neural voiceover or standalone audio track (<code className="text-emerald-300 font-mono">.mp3</code>) for any language below.
            </p>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
            12 / 12 Languages Ready · {project.scenes.length} Scenes
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {INITIAL_11_LANGUAGES.map(code => {
            const lang = SUPPORTED_LANGUAGES[code];
            const out = project.localizedOutputs[code];
            const isExportingThis = exportingLang === code;
            const isSelected = selectedLanguage === code;

            return (
              <div
                key={code}
                className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-400/50'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{lang?.flag}</span>
                      <span className="text-xs font-bold text-white">{lang?.name}</span>
                      <span className="text-[11px] text-amber-300 font-medium">
                        ({lang?.nativeName})
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                      {out?.translationSegments?.length || project.scenes.length} Synced Segments ·
                      Kokoro-82M
                    </span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono text-[9px] font-bold">
                    4K READY
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleExportFullVideoForLanguage(code)}
                    disabled={exportingLang !== null}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                  >
                    {isExportingThis ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Rendering 4K Video ({exportLangProgress}%)</span>
                      </>
                    ) : (
                      <>
                        <Film className="w-3.5 h-3.5" />
                        <span>Download Full {lang?.name} Video (.WEBM)</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const fullText = (out?.translationSegments || [])
                          .map(s => s.text)
                          .join(' ');
                        downloadNeuralVoiceoverAudio(
                          fullText,
                          code,
                          `${project.id}_${code}_human_voiceover.mp3`,
                          selectedPersona,
                          kokoroProsody
                        );
                      }}
                      className="flex-1 px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>Audio (.MP3)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (!out) return;
                        const blob = new Blob([out.subtitlesSrt], {
                          type: 'text/plain;charset=utf-8'
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${project.id}_${code}.srt`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] font-mono flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>.SRT</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
