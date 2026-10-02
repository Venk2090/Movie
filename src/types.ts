export type LanguageCode =
  | 'en'
  | 'es'
  | 'pt'
  | 'fr'
  | 'te'
  | 'kn'
  | 'ml'
  | 'hi'
  | 'bn'
  | 'gu'
  | 'zh'
  | 'ru';

export interface LanguageInfo {
  code: LanguageCode;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  defaultVoice: string;
  flag: string;
}

export type StageName =
  | 'INGESTION'
  | 'AUDIO_NORM'
  | 'TRANSCRIPTION'
  | 'CLEANING'
  | 'TRANSLATION'
  | 'TRANSLATION_QA'
  | 'STORYBOARD'
  | 'VISUAL_GEN'
  | 'VOICEOVER'
  | 'SUBTITLES'
  | 'RENDER'
  | 'QUALITY_CHECK'
  | 'COMPLETE';

export type StageStatus = 'PENDING' | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface PipelineStage {
  id: string;
  name: StageName;
  label: string;
  status: StageStatus;
  progress: number;
  message?: string;
  durationSeconds?: number;
  modelUsed?: string;
  worker?: string;
}

export interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  confidence?: number;
  words?: { word: string; start: number; end: number }[];
}

export interface Scene {
  id: number;
  sceneNumber: number;
  startTime: number;
  endTime: number;
  duration: number;
  dialogue: string;
  summary: string;
  visualDescription: string;
  camera: string;
  lighting: string;
  environment: string;
  style: string;
  imageUrl: string;
  prompt: string;
  seed: number;
}

export interface LocalizedOutput {
  languageCode: LanguageCode;
  languageName: string;
  translationSegments: TranscriptSegment[];
  subtitlesSrt: string;
  subtitlesVtt: string;
  audioWavUrl: string;
  video4kUrl: string;
  qaReport: {
    language: string;
    segments: number;
    missing: number;
    timestampErrors: number;
    readingSpeedWpm: number;
    properNounsPreserved: boolean;
    status: 'PASS' | 'WARNING' | 'FAIL';
  };
}

export interface ProjectLogEntry {
  timestamp: string;
  stage: string;
  level: 'INFO' | 'WARNING' | 'ERROR';
  message: string;
  errorCode?: string;
  details?: string;
  recoveryAction?: string;
}

export interface PreflightReport {
  status: 'passed' | 'warning' | 'mismatch' | 'inspecting' | 'failed';
  url: string;
  videoId?: string;
  title: string;
  channel?: string;
  actualDurationSeconds: number;
  formattedDuration: string;
  expectedDurationSeconds?: number;
  formattedExpectedDuration?: string;
  durationMismatch: boolean;
  durationDifferenceSeconds: number;
  detectedLanguage: string;
  detectedCode: string;
  recommendedScenes: number;
  audioStreamStatus: 'verified' | 'unverified';
  warnings: string[];
  passedChecks: string[];
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  sourceType: 'youtube' | 'upload_video' | 'upload_audio';
  sourceUrl?: string;
  sourceLanguage: string;
  detectedLanguage?: string;
  targetLanguages: LanguageCode[];
  resolution: '1080p' | '1440p' | '4k';
  ttsVoice: string;
  status: StageStatus;
  progress: number;
  currentStage?: StageName;
  durationSeconds: number;
  totalStorageBytes: number;
  createdAt: string;
  updatedAt: string;
  scenes: Scene[];
  rawTranscript: TranscriptSegment[];
  cleanTranscript: TranscriptSegment[];
  localizedOutputs: Record<LanguageCode, LocalizedOutput>;
  stages: PipelineStage[];
  logs: ProjectLogEntry[];
}

export interface HardwareInfo {
  cpu: {
    cores: number;
    threads: number;
    architecture: string;
  };
  ramGb: number;
  gpu: {
    available: boolean;
    name: string;
    vramGb: number;
    cudaVersion: string;
  };
  storageFreeGb: number;
  executionMode: 'CPU (High Efficiency)' | 'NVIDIA GPU (CUDA)';
}

export interface ModelInfo {
  id: string;
  category: 'Speech-to-Text' | 'Translation' | 'Text-to-Speech' | 'Storyboard & Diffusion';
  name: string;
  provider: string;
  version: string;
  sizeMb: number;
  vramReqGb: number;
  license: string;
  commercial: boolean;
  installed: boolean;
  sourceUrl: string;
  restrictions?: string;
}
