import React, { useState, useEffect } from 'react';
import { X, Youtube, Upload, AlertCircle, Sparkles, Check, Loader2 } from 'lucide-react';
import { LanguageCode } from '../types';
import { SUPPORTED_LANGUAGES, INITIAL_11_LANGUAGES } from '../data/languages';
import { extractYouTubeId, fetchYouTubeMetadata } from '../utils/youtube';

interface CreateVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (params: {
    name: string;
    sourceType: 'youtube' | 'upload_video' | 'upload_audio';
    sourceUrl: string;
    sourceLanguage: string;
    targetLanguages: LanguageCode[];
    resolution: '1080p' | '1440p' | '4k';
    ttsVoice: string;
    thumbnailUrl?: string;
    durationSeconds?: number;
  }) => void;
}

export const CreateVideoModal: React.FC<CreateVideoModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [sourceType, setSourceType] = useState<'youtube' | 'upload_video' | 'upload_audio'>('youtube');
  const [name, setName] = useState('Global Technology Outlook 2026');
  const [sourceUrl, setSourceUrl] = useState('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [selectedLangs, setSelectedLangs] = useState<LanguageCode[]>(INITIAL_11_LANGUAGES);
  const [resolution, setResolution] = useState<'1080p' | '1440p' | '4k'>('4k');
  const [ttsVoice, setTtsVoice] = useState('default');
  const [durationSeconds, setDurationSeconds] = useState<number>(133);
  const [consentConfirmed, setConsentConfirmed] = useState(true);

  // YouTube live inspection states
  const [isInspecting, setIsInspecting] = useState(false);
  const [detectedTitle, setDetectedTitle] = useState<string | null>(null);
  const [detectedThumbnail, setDetectedThumbnail] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState<string | null>(null);

  // Inspect YouTube URL whenever user enters/changes it
  useEffect(() => {
    if (sourceType !== 'youtube') return;
    const ytid = extractYouTubeId(sourceUrl);
    if (!ytid) {
      setDetectedThumbnail(null);
      setDetectedTitle(null);
      setAuthorName(null);
      return;
    }

    setDetectedThumbnail(`https://img.youtube.com/vi/${ytid}/hqdefault.jpg`);

    let active = true;
    setIsInspecting(true);
    fetchYouTubeMetadata(sourceUrl).then(data => {
      if (!active) return;
      setIsInspecting(false);
      if (data?.title) {
        setDetectedTitle(data.title);
        setName(data.title);
        if (data.author_name) setAuthorName(data.author_name);
      }
      if (data?.durationSeconds && data.durationSeconds > 10) {
        setDurationSeconds(data.durationSeconds);
      }
    });

    return () => {
      active = false;
    };
  }, [sourceUrl, sourceType]);

  if (!isOpen) return null;

  const toggleLanguage = (code: LanguageCode) => {
    if (selectedLangs.includes(code)) {
      if (selectedLangs.length > 1) {
        setSelectedLangs(selectedLangs.filter(l => l !== code));
      }
    } else {
      setSelectedLangs([...selectedLangs, code]);
    }
  };

  const selectAllLanguages = () => {
    setSelectedLangs(INITIAL_11_LANGUAGES);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentConfirmed) return;
    onSubmit({
      name: name.trim() || 'New Localization Project',
      sourceType,
      sourceUrl,
      sourceLanguage,
      targetLanguages: selectedLangs,
      resolution,
      ttsVoice,
      thumbnailUrl: detectedThumbnail || undefined,
      durationSeconds
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl my-8 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Create New Localized Video</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              100% FOSS pipeline: Ingestion, Transcription, Translation, Storyboard, TTS, &amp; 4K Render
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="p-6 space-y-5">
          {/* Source Input Mode Switcher */}
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-2">Input Source</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSourceType('youtube')}
                className={`flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                  sourceType === 'youtube'
                    ? 'bg-amber-400/10 border-amber-400 text-amber-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Youtube className="w-4 h-4" />
                <span>YouTube URL</span>
              </button>
              <button
                type="button"
                onClick={() => setSourceType('upload_video')}
                className={`flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                  sourceType === 'upload_video'
                    ? 'bg-amber-400/10 border-amber-400 text-amber-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Local Video (MP4)</span>
              </button>
              <button
                type="button"
                onClick={() => setSourceType('upload_audio')}
                className={`flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                  sourceType === 'upload_audio'
                    ? 'bg-amber-400/10 border-amber-400 text-amber-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Local Audio (WAV)</span>
              </button>
            </div>
          </div>

          {/* YouTube URL or File Path */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-300">
                {sourceType === 'youtube' ? 'YouTube Media URL' : 'File Name / Local Path'}
              </label>
              {isInspecting && (
                <span className="text-[11px] text-amber-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Inspecting stream metadata...
                </span>
              )}
            </div>
            <input
              type="text"
              value={sourceUrl}
              onChange={e => setSourceUrl(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono text-xs"
              placeholder={sourceType === 'youtube' ? 'https://www.youtube.com/watch?v=...' : '/storage/uploads/briefing.mp4'}
            />
          </div>

          {/* YouTube Preview Card if detected */}
          {sourceType === 'youtube' && detectedThumbnail && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex gap-3 items-center">
              <img
                src={detectedThumbnail}
                alt="YouTube thumbnail"
                referrerPolicy="no-referrer"
                className="w-24 h-14 object-cover rounded-lg shrink-0 border border-slate-800"
              />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-mono text-emerald-400 block">Valid YouTube Source Detected</span>
                <h4 className="text-xs font-semibold text-white truncate">
                  {detectedTitle || 'Inspecting source title...'}
                </h4>
                {authorName && <span className="text-[11px] text-slate-400">Channel: {authorName}</span>}
              </div>
            </div>
          )}

          {/* Project Name */}
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              placeholder="e.g. Sustainable Infrastructure 2026"
            />
          </div>

          {/* Legal / Rights Warning as mandated by Section 45 */}
          <div className="bg-slate-950/70 border border-amber-400/20 rounded-lg p-3 flex gap-2.5 items-start">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-300 leading-relaxed">
              <strong>Notice on Source Rights:</strong> Only process media that you have the right or permission to download, modify, translate, reproduce or distribute.
            </p>
          </div>

          {/* Source Language & Resolution */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">Source Audio Language</label>
              <select
                value={sourceLanguage}
                onChange={e => setSourceLanguage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              >
                <option value="auto">Auto Detect (faster-whisper VAD)</option>
                <option value="en">English</option>
                <option value="te">Telugu (తెలుగు)</option>
                <option value="es">Spanish (Español)</option>
                <option value="fr">French (Français)</option>
                <option value="hi">Hindi (हिन्दी)</option>
                <option value="zh">Chinese (简体中文)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">Resolution</label>
              <div className="grid grid-cols-3 gap-2">
                {(['1080p', '1440p', '4k'] as const).map(res => (
                  <button
                    key={res}
                    type="button"
                    onClick={() => setResolution(res)}
                    className={`py-2 text-xs font-mono font-medium rounded-lg border transition-colors cursor-pointer ${
                      resolution === res
                        ? 'bg-amber-400 border-amber-400 text-slate-950 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {res.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Target Languages Grid (Now includes Telugu prominently!) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-300">
                Target Localization Languages ({selectedLangs.length}/{INITIAL_11_LANGUAGES.length} selected)
              </label>
              <button
                type="button"
                onClick={selectAllLanguages}
                className="text-[11px] text-amber-400 hover:underline cursor-pointer"
              >
                Select All ({INITIAL_11_LANGUAGES.length})
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {INITIAL_11_LANGUAGES.map(code => {
                const lang = SUPPORTED_LANGUAGES[code];
                const isSelected = selectedLangs.includes(code);
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => toggleLanguage(code)}
                    className={`flex items-center justify-between p-2 rounded-lg border text-xs text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 border-amber-400/50 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <span className="truncate">
                      {lang?.flag} {lang?.name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 ml-1 shrink-0">
                      {code.toUpperCase()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Voice Engine & Consent */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">TTS Engine &amp; Voice</label>
              <select
                value={ttsVoice}
                onChange={e => setTtsVoice(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              >
                <option value="default">Kokoro-82M (Apache 2.0 Permissive) - Default</option>
                <option value="kokoro_narrator">Kokoro-82M - Documentary Narrator</option>
                <option value="xtts_clone">XTTS-v2 - Consent-Based Voice Profile</option>
              </select>
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentConfirmed}
                  onChange={e => setConsentConfirmed(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-amber-400 focus:ring-0"
                />
                <span className="text-xs text-slate-300">
                  Confirm voice authorization &amp; FOSS license compliance
                </span>
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!consentConfirmed || selectedLangs.length === 0}
              className="px-5 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Launch Localized Pipeline ({selectedLangs.length} Streams)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
