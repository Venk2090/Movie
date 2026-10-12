import React, { useState } from 'react';
import { Project, PipelineStage, KokoroProsodyConfig, LanguageCode } from '../types';
import { PipelineErrorCode, PIPELINE_ERROR_CODES } from '../utils/errorTracking';
import { SUPPORTED_LANGUAGES } from '../data/languages';
import {
  DEFAULT_KOKORO_PROSODY,
  KOKORO_EMOTIVE_PRESETS,
  speakLocalizedText,
  stopVoiceover
} from '../utils/voiceover';
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  RefreshCw,
  XCircle,
  ShieldAlert,
  Wrench,
  Bug,
  Sliders,
  Volume2,
  Sparkles
} from 'lucide-react';

interface PipelineProgressProps {
  project: Project;
  onRetry: () => void;
  onCancel: () => void;
  onSimulateError?: (errorCode: PipelineErrorCode) => void;
  kokoroProsody?: KokoroProsodyConfig;
  onUpdateKokoroProsody?: (prosody: KokoroProsodyConfig) => void;
  selectedLanguage?: LanguageCode;
}

export const PipelineProgress: React.FC<PipelineProgressProps> = ({
  project,
  onRetry,
  onCancel,
  onSimulateError,
  kokoroProsody = DEFAULT_KOKORO_PROSODY,
  onUpdateKokoroProsody,
  selectedLanguage = 'te'
}) => {
  const [logFilter, setLogFilter] = useState<'ALL' | 'ERROR' | 'WARNING' | 'INFO'>('ALL');
  const [isAuditioningProsody, setIsAuditioningProsody] = useState(false);

  const isRunning = project.status === 'RUNNING';
  const isFailed = project.status === 'FAILED';
  const isCompleted = project.status === 'COMPLETED';

  const errorCount = project.logs.filter(l => l.level === 'ERROR').length;
  const warningCount = project.logs.filter(l => l.level === 'WARNING').length;

  const filteredLogs = project.logs.filter(l => {
    if (logFilter === 'ALL') return true;
    return l.level === logFilter;
  });

  const handleProsodyChange = (patch: Partial<KokoroProsodyConfig>) => {
    if (!onUpdateKokoroProsody) return;
    onUpdateKokoroProsody({
      ...kokoroProsody,
      ...patch
    });
  };

  const handleAuditionKokoroVoice = () => {
    if (isAuditioningProsody) {
      stopVoiceover();
      setIsAuditioningProsody(false);
      return;
    }
    const langOut = project.localizedOutputs[selectedLanguage];
    const sampleText =
      langOut?.translationSegments?.[0]?.text ||
      project.scenes?.[0]?.dialogue ||
      project.name;

    speakLocalizedText({
      text: sampleText,
      langCode: selectedLanguage,
      prosody: kokoroProsody,
      latencyOffsetMs: langOut?.translationSegments?.[0]?.latencyOffsetMs || 0,
      onStart: () => setIsAuditioningProsody(true),
      onEnd: () => setIsAuditioningProsody(false)
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
      {/* Top Header with Status & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-base font-semibold text-white">
              Pipeline Execution &amp; Voiceover Synthesis Stage
            </h3>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-medium ${
                isCompleted
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : isRunning
                  ? 'bg-amber-400/10 text-amber-300 border border-amber-400/20 animate-pulse'
                  : isFailed
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {project.status} · {Math.round(project.progress)}%
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {project.scenes.length} Dynamic Scenes ({project.durationSeconds}s)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {project.name} · Project ID: <span className="font-mono text-slate-300">{project.id}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isRunning && (
            <button
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 bg-red-950/40 border border-red-800/40 rounded-lg hover:bg-red-900/40 transition-colors cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancel Run</span>
            </button>
          )}

          {isFailed && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Stage</span>
            </button>
          )}

          {isCompleted && (
            <div className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              <span>All 12 Language Streams Certified</span>
            </div>
          )}
        </div>
      </div>

      {/* High-level Overall Progress Bar */}
      <div className="mb-6">
        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
          <div
            className="bg-gradient-to-r from-amber-400 to-emerald-400 h-2 transition-all duration-300 rounded-full"
            style={{ width: `${Math.min(100, Math.max(0, project.progress))}%` }}
          />
        </div>
      </div>

      {/* Visual Pipeline Stages Infographic */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        {project.stages.map((stage: PipelineStage, index: number) => {
          const isStageCompleted = stage.status === 'COMPLETED';
          const isStageRunning = stage.status === 'RUNNING';
          const isStageFailed = stage.status === 'FAILED';
          const isVoiceoverStage = stage.name === 'VOICEOVER';

          return (
            <div
              key={stage.id}
              className={`p-3 rounded-xl border transition-all ${
                isVoiceoverStage
                  ? 'bg-amber-500/10 border-amber-400/50 ring-1 ring-amber-400/20'
                  : isStageCompleted
                  ? 'bg-slate-950/80 border-slate-800'
                  : isStageRunning
                  ? 'bg-slate-800/80 border-amber-400 shadow-sm shadow-amber-400/10'
                  : isStageFailed
                  ? 'bg-red-950/20 border-red-800'
                  : 'bg-slate-950/40 border-slate-800/60 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono text-slate-400">
                  {String(index + 1).padStart(2, '0')}
                </span>
                {isStageCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : isStageRunning ? (
                  <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                ) : isStageFailed ? (
                  <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-slate-700" />
                )}
              </div>
              <div className="text-xs font-medium text-slate-200 truncate">{stage.label}</div>
              <div className="text-[10px] text-slate-400 truncate mt-0.5">
                {isVoiceoverStage
                  ? `Kokoro-82M (α=${kokoroProsody.styleWeightAlpha.toFixed(2)})`
                  : stage.modelUsed || 'FOSS Core'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Stage 09 Upgrade: Kokoro-82M Prosody and Emotive Control Module */}
      <div className="mb-6 bg-slate-950/90 border border-amber-400/30 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3.5 mb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Sliders className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                Stage 09 Voiceover Synthesis · Kokoro-82M Prosody &amp; Emotive Control
              </h4>
              <span className="px-2 py-0.5 rounded bg-amber-400/15 text-amber-300 border border-amber-400/30 font-mono text-[10px] font-bold">
                NON-ENGLISH HUMAN INFLECTION ENGINE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Maps directly to <code className="text-amber-300 font-mono">Kokoro-82M v1.0</code> style vectors (
              <code className="text-cyan-300 font-mono">style_weight α</code>,{' '}
              <code className="text-cyan-300 font-mono">f0_scale</code>,{' '}
              <code className="text-cyan-300 font-mono">phoneme_speed</code>,{' '}
              <code className="text-cyan-300 font-mono">breath_pause_ms</code>) for natural, human-like speech inflections across all 12 languages.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={kokoroProsody.emotivePreset}
              onChange={e => {
                const presetId = e.target.value as KokoroProsodyConfig['emotivePreset'];
                const found = KOKORO_EMOTIVE_PRESETS.find(p => p.id === presetId);
                if (found) {
                  handleProsodyChange({
                    emotivePreset: presetId,
                    ...found.defaults
                  });
                }
              }}
              className="bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              {KOKORO_EMOTIVE_PRESETS.map(preset => (
                <option key={preset.id} value={preset.id}>
                  Preset: {preset.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleAuditionKokoroVoice}
              className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Volume2 className={`w-3.5 h-3.5 ${isAuditioningProsody ? 'animate-bounce' : ''}`} />
              <span>
                {isAuditioningProsody
                  ? `Auditioning ${SUPPORTED_LANGUAGES[selectedLanguage]?.name}...`
                  : `Audition ${SUPPORTED_LANGUAGES[selectedLanguage]?.name} Inflection`}
              </span>
            </button>
          </div>
        </div>

        {/* 4 Kokoro-82M Parameter Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Emotive Depth & Prosody Style Weight (style_weight alpha) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-200 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Prosody &amp; Emotive Depth
              </span>
              <span className="font-mono font-bold text-amber-400">
                α = {kokoroProsody.styleWeightAlpha.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min={0.1}
              max={1.0}
              step={0.02}
              value={kokoroProsody.styleWeightAlpha}
              onChange={e =>
                handleProsodyChange({ styleWeightAlpha: parseFloat(e.target.value) })
              }
              className="w-full accent-amber-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
              <span>0.10 (Neutral)</span>
              <span className="text-slate-400">style_weight</span>
              <span>1.00 (Expressive)</span>
            </div>
          </div>

          {/* 2. Pitch Contour & Intonation Scale (f0_scale) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-200">Intonation Contour (F0)</span>
              <span className="font-mono font-bold text-cyan-300">
                {kokoroProsody.pitchScaleF0.toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min={0.85}
              max={1.15}
              step={0.01}
              value={kokoroProsody.pitchScaleF0}
              onChange={e => handleProsodyChange({ pitchScaleF0: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
              <span>0.85x (Deep)</span>
              <span className="text-slate-400">f0_scale</span>
              <span>1.15x (Dynamic)</span>
            </div>
          </div>

          {/* 3. Phoneme Cadence & Articulation Speed */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-200">Phoneme Cadence</span>
              <span className="font-mono font-bold text-emerald-400">
                {kokoroProsody.phonemeSpeed.toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min={0.8}
              max={1.25}
              step={0.01}
              value={kokoroProsody.phonemeSpeed}
              onChange={e => handleProsodyChange({ phonemeSpeed: parseFloat(e.target.value) })}
              className="w-full accent-emerald-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
              <span>0.80x (Measured)</span>
              <span className="text-slate-400">duration_pred</span>
              <span>1.25x (Brisk)</span>
            </div>
          </div>

          {/* 4. Clause Breath & Micro-Pause */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-200">Clause Breath Pause</span>
              <span className="font-mono font-bold text-purple-300">
                {kokoroProsody.breathPauseMs}ms
              </span>
            </div>
            <input
              type="range"
              min={50}
              max={400}
              step={10}
              value={kokoroProsody.breathPauseMs}
              onChange={e =>
                handleProsodyChange({ breathPauseMs: parseInt(e.target.value, 10) })
              }
              className="w-full accent-purple-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
              <span>50ms (Tight)</span>
              <span className="text-slate-400">breath_pause</span>
              <span>400ms (Dramatic)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Global Error-Tracking Middleware & Project Logs */}
      <div className="space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Project Logs &amp; Error-Tracking Middleware</span>
            </span>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setLogFilter('ALL')}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  logFilter === 'ALL' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({project.logs.length})
              </button>
              <button
                type="button"
                onClick={() => setLogFilter('ERROR')}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  logFilter === 'ERROR'
                    ? 'bg-red-500/20 text-red-300 border border-red-500/30 font-bold'
                    : 'text-slate-400 hover:text-red-300'
                }`}
              >
                Errors ({errorCount})
              </button>
              <button
                type="button"
                onClick={() => setLogFilter('WARNING')}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  logFilter === 'WARNING'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold'
                    : 'text-slate-400 hover:text-amber-300'
                }`}
              >
                Warnings ({warningCount})
              </button>
              <button
                type="button"
                onClick={() => setLogFilter('INFO')}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  logFilter === 'INFO' ? 'bg-slate-800 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Info
              </button>
            </div>
          </div>

          {/* Diagnostic Failure Point Simulation Controls */}
          {onSimulateError && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                <Bug className="w-3.5 h-3.5 text-amber-400" />
                <span>Simulate Failure Point:</span>
              </span>
              <button
                type="button"
                onClick={() => onSimulateError('ERR_GEMINI_TIMEOUT')}
                className="text-[10px] font-mono px-2 py-1 rounded bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-800/50 transition-colors cursor-pointer"
                title={PIPELINE_ERROR_CODES.ERR_GEMINI_TIMEOUT.defaultDetail}
              >
                + Gemini Timeout
              </button>
              <button
                type="button"
                onClick={() => onSimulateError('ERR_FFMPEG_RENDER_CRASH')}
                className="text-[10px] font-mono px-2 py-1 rounded bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-800/50 transition-colors cursor-pointer"
                title={PIPELINE_ERROR_CODES.ERR_FFMPEG_RENDER_CRASH.defaultDetail}
              >
                + FFmpeg Crash
              </button>
              <button
                type="button"
                onClick={() => onSimulateError('ERR_STT_ACOUSTIC_ANOMALY')}
                className="text-[10px] font-mono px-2 py-1 rounded bg-amber-950/50 hover:bg-amber-900/60 text-amber-300 border border-amber-800/50 transition-colors cursor-pointer"
                title={PIPELINE_ERROR_CODES.ERR_STT_ACOUSTIC_ANOMALY.defaultDetail}
              >
                + STT Anomaly
              </button>
            </div>
          )}
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 font-mono text-[11px] text-slate-300 max-h-60 overflow-y-auto space-y-2">
          {filteredLogs.length === 0 ? (
            <div className="text-slate-500 py-2 text-center">No log entries matching filter ({logFilter}).</div>
          ) : (
            filteredLogs.slice(-15).map((log, idx) => {
              const isErr = log.level === 'ERROR';
              const isWarn = log.level === 'WARNING';

              return (
                <div
                  key={idx}
                  className={`p-2 rounded-lg border transition-colors ${
                    isErr
                      ? 'bg-red-950/25 border-red-800/50 text-red-200'
                      : isWarn
                      ? 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                      : 'bg-slate-900/40 border-slate-800/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-2 flex-wrap">
                    <span className="text-slate-500 shrink-0">{log.timestamp}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 ${
                        isErr
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : isWarn
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-800 text-cyan-300'
                      }`}
                    >
                      {log.level}
                    </span>
                    <span className="text-amber-400/90 font-semibold shrink-0">[{log.stage}]</span>
                    {log.errorCode && (
                      <span className="px-1.5 py-0.2 rounded bg-red-900/50 border border-red-700/50 text-red-300 text-[10px] font-bold shrink-0">
                        {log.errorCode}
                      </span>
                    )}
                    <span className="flex-1 break-words">{log.message}</span>
                  </div>

                  {(log.details || log.recoveryAction) && (
                    <div className="mt-1.5 pl-4 border-l-2 border-slate-700 space-y-1 text-[10px]">
                      {log.details && (
                        <div className="text-slate-400">
                          <span className="text-slate-500 uppercase">Diagnostic Trace: </span>
                          {log.details}
                        </div>
                      )}
                      {log.recoveryAction && (
                        <div className="text-emerald-400 flex items-center gap-1">
                          <Wrench className="w-3 h-3 shrink-0" />
                          <span>
                            <strong>Self-Healing Recovery:</strong> {log.recoveryAction}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
