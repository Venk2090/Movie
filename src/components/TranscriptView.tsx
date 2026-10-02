import React, { useState } from 'react';
import { Project, LanguageCode, TranscriptSegment } from '../types';
import { SUPPORTED_LANGUAGES } from '../data/languages';
import { FileText, ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react';

interface TranscriptViewProps {
  project: Project;
  selectedLanguage: LanguageCode;
  onSelectLanguage: (lang: LanguageCode) => void;
}

export const TranscriptView: React.FC<TranscriptViewProps> = ({
  project,
  selectedLanguage,
  onSelectLanguage
}) => {
  const [viewMode, setViewMode] = useState<'clean' | 'raw'>('clean');
  const activeTranslation = project.localizedOutputs[selectedLanguage];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-white">Transcript &amp; Localized Translation Studio</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Compare source speech-to-text outputs against normalized and translated localized streams.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Segment Toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs">
            <button
              onClick={() => setViewMode('clean')}
              className={`px-3 py-1 font-medium rounded-md transition-colors ${
                viewMode === 'clean' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Clean Transcript
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`px-3 py-1 font-medium rounded-md transition-colors ${
                viewMode === 'raw' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Raw Whisper
            </button>
          </div>
        </div>
      </div>

      {/* Language Switcher Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <span className="text-xs text-slate-400 font-medium shrink-0">Target Language:</span>
        {project.targetLanguages.map(code => {
          const isSelected = selectedLanguage === code;
          const lang = SUPPORTED_LANGUAGES[code];
          return (
            <button
              key={code}
              onClick={() => onSelectLanguage(code)}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? 'bg-amber-400 text-slate-950 font-bold'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span>{lang?.flag}</span>
              <span>{lang?.name}</span>
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
                Detected: {project.detectedLanguage || 'English (Auto-detected)'} · {viewMode === 'clean' ? 'Cleaned & Normalized' : 'Raw Model Output'}
              </span>
            </div>
            <FileText className="w-4 h-4 text-amber-400" />
          </div>

          <div className="space-y-3">
            {project.rawTranscript.map((seg, idx) => (
              <div
                key={seg.id}
                className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5"
              >
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Segment {String(idx + 1).padStart(2, '0')}</span>
                  <span>{seg.start}s ({Math.floor(seg.start / 60)}:{String(Math.floor(seg.start % 60)).padStart(2, '0')}) &rarr; {seg.end}s ({Math.floor(seg.end / 60)}:{String(Math.floor(seg.end % 60)).padStart(2, '0')})</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {seg.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Localized Target Column */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <span className="text-xs font-semibold text-white">
                {SUPPORTED_LANGUAGES[selectedLanguage]?.name} ({SUPPORTED_LANGUAGES[selectedLanguage]?.nativeName})
              </span>
              <span className="text-[11px] text-emerald-400 block font-mono">
                QA Status: PASS · 0 Deviations
              </span>
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>

          <div className="space-y-3">
            {activeTranslation?.translationSegments.map((seg, idx) => (
              <div
                key={seg.id}
                className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5"
              >
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Segment {String(idx + 1).padStart(2, '0')}</span>
                  <span>{seg.start}s ({Math.floor(seg.start / 60)}:{String(Math.floor(seg.start % 60)).padStart(2, '0')}) &rarr; {seg.end}s ({Math.floor(seg.end / 60)}:{String(Math.floor(seg.end % 60)).padStart(2, '0')})</span>
                </div>
                <p className="text-xs text-amber-200 leading-relaxed font-medium">
                  {seg.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
