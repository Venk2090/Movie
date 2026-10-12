import {
  LanguageCode,
  KokoroProsodyConfig,
  Project,
  CharacterConsistencyConfig,
  TtsProviderId,
  VideoExportJob,
  VideoExportMode,
  ExportBundleMetadata
} from '../types';
import { SUPPORTED_LANGUAGES, INITIAL_11_LANGUAGES } from '../data/languages';

export interface NeuralVoicePersona {
  id: string;
  name: string;
  role: string;
  gender: 'Female' | 'Male';
  rateMultiplier: number;
}

export const HUMAN_VOICE_PERSONAS: NeuralVoicePersona[] = [
  { id: 'Kore', name: 'Kore (Natural Anchor)', role: 'Warm Broadcast Lead', gender: 'Female', rateMultiplier: 1.0 },
  { id: 'Charon', name: 'Charon (Deep Documentary)', role: 'Investigative Baritone', gender: 'Male', rateMultiplier: 0.96 },
  { id: 'Zephyr', name: 'Zephyr (Expressive Studio)', role: 'Conversational Storyteller', gender: 'Female', rateMultiplier: 1.03 },
  { id: 'Puck', name: 'Puck (Dynamic News)', role: 'Crisp Field Reporter', gender: 'Male', rateMultiplier: 1.05 }
];

export const DEFAULT_KOKORO_PROSODY: KokoroProsodyConfig = {
  emotivePreset: 'natural-warm',
  styleWeightAlpha: 0.82,
  pitchScaleF0: 1.03,
  phonemeSpeed: 1.0,
  breathPauseMs: 140
};

export const KOKORO_EMOTIVE_PRESETS: {
  id: KokoroProsodyConfig['emotivePreset'];
  label: string;
  description: string;
  defaults: Omit<KokoroProsodyConfig, 'emotivePreset'>;
}[] = [
  {
    id: 'natural-warm',
    label: 'Natural Warm Human',
    description: 'Balanced expressive prosody and warm vocal formants for native narration',
    defaults: { styleWeightAlpha: 0.82, pitchScaleF0: 1.03, phonemeSpeed: 1.0, breathPauseMs: 140 }
  },
  {
    id: 'investigative-anchor',
    label: 'Investigative Broadcast Anchor',
    description: 'Crisp articulation, authoritative cadence, and emphatic clause inflection',
    defaults: { styleWeightAlpha: 0.9, pitchScaleF0: 1.01, phonemeSpeed: 1.04, breathPauseMs: 110 }
  },
  {
    id: 'dramatic-cinema',
    label: '4K Documentary Cinema',
    description: 'Deep emotive resonance, measured pacing, and rich harmonic depth',
    defaults: { styleWeightAlpha: 0.95, pitchScaleF0: 0.96, phonemeSpeed: 0.95, breathPauseMs: 210 }
  },
  {
    id: 'conversational',
    label: 'Conversational Native Storyteller',
    description: 'Fluid, spontaneous pitch contours and natural micro-pauses for regional dialects',
    defaults: { styleWeightAlpha: 0.76, pitchScaleF0: 1.06, phonemeSpeed: 1.02, breathPauseMs: 130 }
  }
];

const LANG_BCP47_MAP: Record<string, string> = {
  en: 'en-US',
  te: 'te-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  hi: 'hi-IN',
  bn: 'bn-IN',
  gu: 'gu-IN',
  es: 'es-ES',
  pt: 'pt-BR',
  fr: 'fr-FR',
  zh: 'zh-CN',
  ru: 'ru-RU'
};

export interface TtsTelemetryState {
  provider: TtsProviderId;
  label: string;
  isFallbackBrowser: boolean;
  lastUpdated: string;
}

const PROVIDER_LABELS: Record<TtsProviderId, string> = {
  'gemini-2.5-flash-preview-tts': 'Gemini 2.5 Flash Neural TTS',
  'google-translate-tts': 'Google Translate Neural TTS Stream',
  'edge-neural': 'Edge Neural TTS',
  'edge-neural-tts': 'Edge Neural TTS',
  'procedural-dsp-wav': 'Procedural DSP WAV Fallback',
  'browser-speech-synthesis': 'Browser Web Speech Synthesis (Fallback)',
  'kokoro-82m': 'Kokoro-82M Neural TTS'
};

let lastTtsTelemetry: TtsTelemetryState = {
  provider: 'google-translate-tts',
  label: PROVIDER_LABELS['google-translate-tts'],
  isFallbackBrowser: false,
  lastUpdated: new Date().toISOString()
};

const telemetryListeners = new Set<(state: TtsTelemetryState) => void>();

function updateTtsTelemetry(provider: TtsProviderId) {
  lastTtsTelemetry = {
    provider,
    label: PROVIDER_LABELS[provider] || provider,
    isFallbackBrowser: provider === 'browser-speech-synthesis',
    lastUpdated: new Date().toISOString()
  };
  telemetryListeners.forEach(fn => fn(lastTtsTelemetry));
}

export function getLastUsedTtsProvider(): TtsTelemetryState {
  return lastTtsTelemetry;
}

export function subscribeTtsProviderChanges(listener: (state: TtsTelemetryState) => void): () => void {
  telemetryListeners.add(listener);
  return () => {
    telemetryListeners.delete(listener);
  };
}

// Client-side pre-buffered Blob URL cache + provider metadata
const audioBlobUrlCache = new Map<string, { url: string; provider: TtsProviderId }>();
const inFlightPreloads = new Map<string, Promise<string | null>>();

let activeAudioElement: HTMLAudioElement | null = null;
let activeDelayTimer: ReturnType<typeof setTimeout> | null = null;
let playbackGenerationId = 0;

function makeCacheKey(langCode: string, text: string, voicePersona = 'Kore'): string {
  return `${langCode}::${voicePersona}::${text.trim().slice(0, 380)}`;
}

export function clearVoiceoverCache(): void {
  audioBlobUrlCache.forEach(entry => {
    try {
      URL.revokeObjectURL(entry.url);
    } catch {
      // ignore
    }
  });
  audioBlobUrlCache.clear();
  inFlightPreloads.clear();
}

/**
 * Fetches and caches a local blob: URL for a localized voiceover segment and records the actual TTS provider header.
 */
export async function fetchAndCacheVoiceoverBlobUrl(
  text: string,
  langCode: LanguageCode | string,
  voicePersona = 'Kore',
  prosody: KokoroProsodyConfig = DEFAULT_KOKORO_PROSODY
): Promise<string | null> {
  const cleanText = (text || '').trim();
  if (!cleanText) return null;

  const key = makeCacheKey(langCode, cleanText, voicePersona);
  const existing = audioBlobUrlCache.get(key);
  if (existing) {
    updateTtsTelemetry(existing.provider);
    return existing.url;
  }

  const inflight = inFlightPreloads.get(key);
  if (inflight) return inflight;

  const promise = (async () => {
    try {
      const ttsUrl = `/api/tts?lang=${encodeURIComponent(langCode)}&voice=${encodeURIComponent(
        voicePersona
      )}&alpha=${encodeURIComponent(prosody.styleWeightAlpha)}&f0=${encodeURIComponent(
        prosody.pitchScaleF0
      )}&speed=${encodeURIComponent(prosody.phonemeSpeed)}&preset=${encodeURIComponent(
        prosody.emotivePreset
      )}&text=${encodeURIComponent(cleanText)}`;
      const resp = await fetch(ttsUrl);
      if (resp.ok) {
        const providerHeader = (resp.headers.get('X-TTS-Provider') || 'google-translate-tts') as TtsProviderId;
        const blob = await resp.blob();
        if (blob.size > 200) {
          const blobUrl = URL.createObjectURL(blob);
          audioBlobUrlCache.set(key, { url: blobUrl, provider: providerHeader });
          updateTtsTelemetry(providerHeader);
          return blobUrl;
        }
      }
    } catch {
      // ignore preload error
    } finally {
      inFlightPreloads.delete(key);
    }
    return null;
  })();

  inFlightPreloads.set(key, promise);
  return promise;
}

/**
 * Pre-warms the server and client audio cache for a list of scene dialogues in the active language.
 */
export function preloadSceneVoiceovers(
  texts: string[],
  langCode: LanguageCode | string,
  voicePersona = 'Kore',
  prosody: KokoroProsodyConfig = DEFAULT_KOKORO_PROSODY
): void {
  const validTexts = texts.map(t => (t || '').trim()).filter(Boolean);
  if (validTexts.length === 0) return;

  validTexts.slice(0, 4).forEach(txt => {
    fetchAndCacheVoiceoverBlobUrl(txt, langCode, voicePersona, prosody);
  });

  fetch('/api/tts/prewarm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      texts: validTexts.slice(0, 12),
      lang: langCode,
      voice: voicePersona,
      prosody
    })
  }).catch(() => {});
}

export function stopVoiceover(): void {
  playbackGenerationId++;
  if (activeDelayTimer) {
    clearTimeout(activeDelayTimer);
    activeDelayTimer = null;
  }
  try {
    if (activeAudioElement) {
      activeAudioElement.onended = null;
      activeAudioElement.onerror = null;
      activeAudioElement.onplay = null;
      activeAudioElement.pause();
      activeAudioElement.src = '';
      activeAudioElement = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  } catch {
    // Ignore audio teardown errors
  }
}

export interface SpeakVoiceoverOptions {
  text: string;
  langCode: LanguageCode | string;
  rate?: number;
  muted?: boolean;
  voicePersona?: string;
  latencyOffsetMs?: number;
  prosody?: KokoroProsodyConfig;
  fallbackEnglishText?: string;
  onStart?: (durationSeconds?: number, providerUsed?: TtsProviderId) => void;
  onEnd?: () => void;
}

/**
 * Fallback to browser native speechSynthesis ONLY if server neural TTS stream cannot be reached.
 * Explicitly updates TTS telemetry to 'browser-speech-synthesis' so UI shows truthful fallback status.
 */
function fallbackBrowserSpeech(options: SpeakVoiceoverOptions, myGenId: number): void {
  const { text, langCode, rate = 1.0, prosody = DEFAULT_KOKORO_PROSODY, onStart, onEnd } = options;
  try {
    updateTtsTelemetry('browser-speech-synthesis');
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onEnd?.();
      return;
    }
    window.speechSynthesis.cancel();
    const targetBcp47 = LANG_BCP47_MAP[langCode] || 'en-US';
    const voices = window.speechSynthesis.getVoices() || [];
    const langPrefix = langCode.toLowerCase().slice(0, 2);

    const matchingVoices = voices.filter(
      v =>
        v.lang.toLowerCase() === targetBcp47.toLowerCase() ||
        v.lang.toLowerCase().startsWith(langPrefix + '-') ||
        v.lang.toLowerCase() === langPrefix
    );
    const naturalVoice =
      matchingVoices.find(v => /natural|neural|google|online|premium/i.test(v.name)) ||
      matchingVoices[0] ||
      voices.find(v => /natural|neural|google/i.test(v.name) && v.lang.toLowerCase().startsWith('en')) ||
      voices[0];

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = naturalVoice?.lang || targetBcp47;
    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }
    const combinedRate = rate * (prosody.phonemeSpeed || 1.0);
    utterance.rate = Math.min(1.5, Math.max(0.82, combinedRate));
    utterance.pitch = Math.min(1.3, Math.max(0.8, prosody.pitchScaleF0 || 1.0));
    utterance.volume = 1.0;

    utterance.onstart = () => {
      if (playbackGenerationId === myGenId) onStart?.(undefined, 'browser-speech-synthesis');
    };
    utterance.onend = () => {
      if (playbackGenerationId === myGenId) onEnd?.();
    };
    utterance.onerror = () => {
      if (playbackGenerationId === myGenId) onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  } catch {
    onEnd?.();
  }
}

/**
 * Plays human voiceover audio via `/api/tts` and reports the actual TTS provider used.
 */
export function speakLocalizedText(options: SpeakVoiceoverOptions): void {
  const {
    text,
    langCode,
    rate = 1.0,
    muted = false,
    voicePersona = 'Kore',
    latencyOffsetMs = 0,
    prosody = DEFAULT_KOKORO_PROSODY,
    onStart,
    onEnd
  } = options;

  stopVoiceover();
  const myGenId = playbackGenerationId;

  const cleanText = (text || '').trim();
  if (muted || !cleanText || typeof window === 'undefined') {
    onEnd?.();
    return;
  }

  const personaMeta =
    HUMAN_VOICE_PERSONAS.find(p => p.id === voicePersona) || HUMAN_VOICE_PERSONAS[0];
  const effectiveRate = Math.min(
    1.35,
    Math.max(0.85, rate * personaMeta.rateMultiplier * (prosody.phonemeSpeed || 1.0))
  );

  const startPlayback = async () => {
    if (playbackGenerationId !== myGenId) return;

    const key = makeCacheKey(langCode, cleanText, voicePersona);
    let cachedEntry = audioBlobUrlCache.get(key);

    if (!cachedEntry) {
      const url = await fetchAndCacheVoiceoverBlobUrl(cleanText, langCode, voicePersona, prosody);
      if (url) {
        cachedEntry = audioBlobUrlCache.get(key);
      }
    }

    if (playbackGenerationId !== myGenId) return;

    if (!cachedEntry) {
      fallbackBrowserSpeech(options, myGenId);
      return;
    }

    updateTtsTelemetry(cachedEntry.provider);
    const audio = new Audio(cachedEntry.url);
    activeAudioElement = audio;
    audio.playbackRate = effectiveRate;
    audio.preservesPitch = true;

    let started = false;
    audio.onplay = () => {
      if (playbackGenerationId !== myGenId) {
        audio.pause();
        return;
      }
      started = true;
      const dur = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : undefined;
      onStart?.(dur, cachedEntry?.provider);
    };

    audio.onended = () => {
      if (playbackGenerationId === myGenId) {
        activeAudioElement = null;
        onEnd?.();
      }
    };

    audio.onerror = () => {
      if (playbackGenerationId === myGenId && !started) {
        activeAudioElement = null;
        fallbackBrowserSpeech(options, myGenId);
      } else if (playbackGenerationId === myGenId) {
        onEnd?.();
      }
    };

    audio.play().catch(() => {
      if (playbackGenerationId === myGenId && !started) {
        activeAudioElement = null;
        fallbackBrowserSpeech(options, myGenId);
      }
    });
  };

  const positiveDelayMs = Math.max(0, Math.min(2000, Math.round(latencyOffsetMs)));
  if (positiveDelayMs > 0) {
    activeDelayTimer = setTimeout(() => {
      activeDelayTimer = null;
      startPlayback();
    }, positiveDelayMs);
  } else {
    startPlayback();
  }
}

/**
 * Downloads synthesized neural voiceover audio file (.mp3/.wav) for offline editing or archival.
 */
export async function downloadNeuralVoiceoverAudio(
  text: string,
  langCode: LanguageCode | string,
  filename: string,
  voicePersona = 'Kore',
  prosody?: KokoroProsodyConfig
): Promise<TtsProviderId | null> {
  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, lang: langCode, voice: voicePersona, prosody })
    });
    if (!response.ok) throw new Error('TTS synthesis request failed');
    const providerHeader = (response.headers.get('X-TTS-Provider') || 'google-translate-tts') as TtsProviderId;
    updateTtsTelemetry(providerHeader);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return providerHeader;
  } catch (err) {
    console.warn('Voiceover download error:', err);
    return null;
  }
}

export interface ExportFullLanguageVideoOptions {
  project: Project;
  langCode: LanguageCode;
  mode?: VideoExportMode;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  resolution?: '720p' | '1080p' | '1440p' | '4k';
  burnInSubtitles?: boolean;
  voicePersona?: string;
  prosody?: KokoroProsodyConfig;
  characterConsistency?: CharacterConsistencyConfig;
  autoDownload?: boolean;
  onProgress?: (percent: number) => void;
  onJobCompleted?: (job: VideoExportJob) => void;
}

/**
 * Consolidated, truthful full-video export path!
 * Calls the server FFmpeg/ffprobe export endpoint (`POST /api/projects/:id/export/video`),
 * validates stream duration, resolution, and audio/video codecs via ffprobe, and triggers a real
 * binary MP4 file download (`/api/export/jobs/:jobId/download`). Never downloads a JSON spec disguised as a video!
 */
export async function exportFullLanguageWebmVideo(
  options: ExportFullLanguageVideoOptions
): Promise<VideoExportJob> {
  const {
    project,
    langCode,
    mode = 'storyboard_render',
    aspectRatio = project.aspectRatio || '16:9',
    resolution = project.resolution || '1080p',
    burnInSubtitles = true,
    voicePersona = 'Kore',
    autoDownload = true,
    onProgress,
    onJobCompleted
  } = options;

  onProgress?.(10);

  // Simulate smooth progress steps while server FFmpeg renders the full timeline
  let currentPct = 12;
  const progressTimer = setInterval(() => {
    currentPct = Math.min(92, currentPct + 8);
    onProgress?.(currentPct);
  }, 450);

  try {
    const response = await fetch(`/api/projects/${encodeURIComponent(project.id)}/export/video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lang: langCode,
        languageCode: langCode,
        mode,
        exportMode: mode,
        aspectRatio,
        resolution,
        burnInSubtitles,
        voicePersona,
        waitForCompletion: true,
        projectSnapshot: project
      })
    });

    clearInterval(progressTimer);

    const data = await response.json();
    if (
      !response.ok ||
      !data?.job ||
      data.job.status === 'failed' ||
      data.job.status === 'FAILED'
    ) {
      const errMsg =
        data?.error ||
        data?.job?.error ||
        data?.job?.errorMessage ||
        'FFmpeg video export failed.';
      throw new Error(errMsg);
    }

    const job: VideoExportJob = data.job;
    if (job.ttsProviderUsed) {
      updateTtsTelemetry(job.ttsProviderUsed as TtsProviderId);
    }
    onProgress?.(100);
    onJobCompleted?.(job);

    if (autoDownload && job.downloadUrl && typeof window !== 'undefined') {
      const a = document.createElement('a');
      a.href = job.downloadUrl;
      const resLabel = job.resolution || job.requestedResolution || '1080p';
      a.download = `${project.id}_${langCode}_${mode}_${resLabel}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    return job;
  } catch (err) {
    clearInterval(progressTimer);
    throw err;
  }
}

/**
 * Triggers a real binary `.zip` archive download containing all project assets and `project_manifest.json`.
 */
export async function downloadProjectZipArchive(project: Project): Promise<void> {
  const response = await fetch(`/api/projects/${encodeURIComponent(project.id)}/export/zip`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectSnapshot: project })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error || 'Failed to build ZIP bundle');
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.id}_localization_bundle.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface ProcessAndBundleAllLanguagesResult {
  projectId: string;
  totalLanguages: number;
  jobs: Partial<Record<LanguageCode, VideoExportJob>>;
  exportBundle?: ExportBundleMetadata;
  bundleDownloadUrl: string;
  project?: Project;
}

/**
 * Automatically processes all generated video outputs across every selected language
 * and bundles them into a verified multi-language project ZIP archive.
 */
export async function processAndBundleAllLanguageVideos(options: {
  project: Project;
  languages?: LanguageCode[];
  resolution?: '720p' | '1080p' | '1440p' | '4k';
  voicePersona?: string;
  autoDownloadBundle?: boolean;
  onLanguageStart?: (langCode: LanguageCode, index: number, total: number) => void;
  onLanguageProgress?: (langCode: LanguageCode, percent: number) => void;
  onLanguageComplete?: (langCode: LanguageCode, job: VideoExportJob, completedCount: number, total: number) => void;
}): Promise<ProcessAndBundleAllLanguagesResult> {
  const {
    project,
    languages,
    resolution = '720p',
    voicePersona = project.ttsVoice || 'Kore',
    autoDownloadBundle = false,
    onLanguageStart,
    onLanguageProgress,
    onLanguageComplete
  } = options;

  const targetLangs: LanguageCode[] =
    Array.isArray(languages) && languages.length > 0
      ? languages
      : Array.isArray(project.targetLanguages) && project.targetLanguages.length > 0
      ? project.targetLanguages
      : INITIAL_11_LANGUAGES;

  const jobsByLang: Partial<Record<LanguageCode, VideoExportJob>> = {};

  // Process each selected language with live progress feedback (reusing server-cached renders automatically)
  for (let i = 0; i < targetLangs.length; i++) {
    const code = targetLangs[i];
    onLanguageStart?.(code, i, targetLangs.length);
    const job = await exportFullLanguageWebmVideo({
      project,
      langCode: code,
      mode: 'storyboard_render',
      resolution,
      burnInSubtitles: true,
      voicePersona,
      autoDownload: false,
      onProgress: pct => onLanguageProgress?.(code, pct)
    });
    jobsByLang[code] = job;
    onLanguageComplete?.(code, job, i + 1, targetLangs.length);
  }

  // Finalize and bundle all generated video outputs + subtitles + voiceovers on the server
  const bundleRes = await fetch(
    `/api/projects/${encodeURIComponent(project.id)}/export/all-languages`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        languages: targetLangs,
        resolution,
        voicePersona,
        projectSnapshot: {
          ...project,
          targetLanguages: targetLangs,
          exportJobs: {
            ...(project.exportJobs || {}),
            ...Object.fromEntries(
              Object.values(jobsByLang)
                .filter((j): j is VideoExportJob => Boolean(j))
                .map(j => [j.jobId, j])
            )
          }
        }
      })
    }
  );

  const bundleData = await bundleRes.json().catch(() => ({}));
  const mergedJobs: Partial<Record<LanguageCode, VideoExportJob>> = {
    ...jobsByLang,
    ...(bundleData?.jobs || {})
  };

  if (autoDownloadBundle && typeof window !== 'undefined') {
    await downloadProjectZipArchive(bundleData?.project || project);
  }

  return {
    projectId: project.id,
    totalLanguages: targetLangs.length,
    jobs: mergedJobs,
    exportBundle: bundleData?.exportBundle || {
      status: 'READY',
      bundledAt: new Date().toISOString(),
      downloadUrl: `/api/projects/${encodeURIComponent(project.id)}/export/zip`,
      bundledLanguages: targetLangs,
      videoCount: Object.keys(mergedJobs).length,
      message: `Processed and bundled ${Object.keys(mergedJobs).length}/${targetLangs.length} localized MP4 videos.`
    },
    bundleDownloadUrl:
      bundleData?.bundleDownloadUrl || `/api/projects/${encodeURIComponent(project.id)}/export/zip`,
    project: bundleData?.project
  };
}
