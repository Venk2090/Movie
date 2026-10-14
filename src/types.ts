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

export type StageStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'PARTIAL'
  | 'NEEDS_REVIEW'
  | 'FAILED'
  | 'CANCELLED'
  | 'SKIPPED';

export type WorkflowStepId =
  | 'source'
  | 'transcript'
  | 'storyboard'
  | 'voiceover'
  | 'review'
  | 'export';

export type SaveStatus = 'saved' | 'saving' | 'error' | 'unsaved';

export type TtsProviderId =
  | 'gemini-2.5-flash-preview-tts'
  | 'edge-neural-tts'
  | 'edge-neural'
  | 'google-translate-tts'
  | 'procedural-dsp-wav'
  | 'browser-speech-synthesis'
  | 'kokoro-82m';

export type VideoExportMode =
  | 'storyboard_render'
  | 'source_video_dub'
  | 'storyboard-video'
  | 'dubbed-source';

export type AspectRatioPreset = '16:9' | '9:16' | '1:1' | '2.39:1';

export type VisualStylePreset =
  | 'cinematic-documentary'
  | 'broadcast-news'
  | 'archival-film'
  | 'minimalist-editorial';

export interface GlossaryTerm {
  id: string;
  sourceTerm: string;
  pronunciationHint?: string;
  doNotTranslate?: boolean;
  notes?: string;
  translations?: Partial<Record<LanguageCode, string>>;
}

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
  verified?: boolean;
  errorDetails?: string;
}

export interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  speaker?: string;
  speakerId?: string;
  speakerLabel?: string;
  confidence?: number;
  latencyOffsetMs?: number;
  isCleaned?: boolean;
  translationStatus?: 'source' | 'translated' | 'missing' | 'needs_review';
  userReviewed?: boolean;
  needsReview?: boolean;
  reviewReason?: string;
  words?: { word: string; start: number; end: number; confidence?: number }[];
}

export interface TranscriptIntervalIssue {
  type: 'gap' | 'overlap' | 'invalid_bounds' | 'non_monotonic' | 'empty_text' | 'exceeds_duration';
  start?: number;
  end?: number;
  duration?: number;
  segmentId?: number;
  nextSegmentId?: number;
  segmentIds?: number[];
  startSec?: number;
  endSec?: number;
  durationSec?: number;
  message: string;
}

export interface TranscriptValidationReport {
  valid: boolean;
  segmentCount: number;
  coverageStart?: number;
  coverageEnd?: number;
  totalSpokenSeconds?: number;
  totalSpokenDuration?: number;
  mediaDurationSeconds: number;
  coverageRatio?: number;
  silentGapCount?: number;
  overlapCount?: number;
  invalidBoundsCount?: number;
  gaps?: TranscriptIntervalIssue[];
  overlaps?: TranscriptIntervalIssue[];
  issues: TranscriptIntervalIssue[];
}

export type TranscriptProvenance =
  | 'youtube_captions'
  | 'gemini_audio_stt'
  | 'faster_whisper_stt'
  | 'user_supplied_transcript'
  | 'demo_mock';

export type CharacterPresenceType =
  | 'confirmed_speaker'
  | 'speaking_on_camera'
  | 'visible_subject'
  | 'mentioned_entity'
  | 'mentioned_only'
  | 'unidentified_narrator'
  | 'illustrative_non_human'
  | 'user_presenter';

export type CharacterConfidenceState =
  | 'high'
  | 'medium'
  | 'low'
  | 'verified'
  | 'inferred_speaker'
  | 'mentioned_entity'
  | 'user_configured'
  | 'unknown';

export interface CharacterVisualAttributes {
  description: string;
  clothing: string;
  hairstyle: string;
  accessories: string;
  facialFeatures?: string;
  lightingStyle?: string;
}

export interface CharacterRegistryEntry {
  id: string;
  name: string;
  role: string;
  evidenceSegmentIds: number[];
  evidenceQuotes?: string[];
  presenceType: CharacterPresenceType;
  confidence: CharacterConfidenceState;
  visualDescription?: string;
  wardrobeTraits?: string;
  clothing?: string;
  hairstyle?: string;
  identityKnown?: boolean;
  visualAttributes?: CharacterVisualAttributes;
  compiledPrompt?: string;
  avatarUrl?: string;
}

export type SceneDepictionMode =
  | 'verified_speaker'
  | 'visible_speaker'
  | 'mentioned_subject_context'
  | 'environment_broll'
  | 'illustrative_metaphor'
  | 'illustrative_non_human'
  | 'environment_only'
  | 'user_global_presenter'
  | 'user_presenter';

export interface KokoroProsodyConfig {
  emotivePreset: 'natural-warm' | 'investigative-anchor' | 'dramatic-cinema' | 'conversational';
  styleWeightAlpha: number;
  pitchScaleF0: number;
  phonemeSpeed: number;
  breathPauseMs: number;
}

export type CinematicMotionPreset = 'pan' | 'dolly' | 'crane' | 'orbit' | 'drift';

export type VisualFilterPreset =
  | 'cinematic-blue'
  | 'warm-gold'
  | 'noir'
  | 'teal-orange'
  | 'vintage-cinema'
  | 'vivid-investigative'
  | 'default';

export type SceneTransitionPreset =
  | 'cross-fade'
  | 'slide-left'
  | 'slide-up'
  | 'anamorphic-wipe'
  | 'wipe-anamorphic';

export interface CharacterConsistencyConfig {
  enabled: boolean;
  presetId?: string;
  characterId?: string;
  characterName: string;
  characterDescription?: string;
  description?: string;
  clothing: string;
  hairstyle: string;
  accessories: string;
  facialFeatures?: string;
  lightingStyle?: string;
  compiledPrompt: string;
}

export interface Scene {
  id: number;
  sceneNumber: number;
  segmentIds?: number[];
  transcriptSegmentIds?: number[];
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
  motionPreset?: CinematicMotionPreset;
  transitionPreset?: SceneTransitionPreset;
  transitionDurationMs?: number;
  characterPrompt?: string;
  characterIds?: string[];
  depictionMode?: SceneDepictionMode;
  spokenSpeakerName?: string;
  visibleCharacterNames?: string[];
  visualDirection?: string;
  visibleCharacterNote?: string;
  emotion?: string;
  emotionalTone?: string;
  lensSpec?: string;
  framingNotes?: string;
  isSilentInterval?: boolean;
  userEdited?: boolean;
  approved?: boolean;
  reviewStatus?: 'pending' | 'approved' | 'rejected';
  visualFilterPreset?: VisualFilterPreset;
  motionIntensity?: number;
  motionDurationSec?: number;
}

export interface LocalizedOutput {
  languageCode: LanguageCode;
  languageName: string;
  translationSegments: TranscriptSegment[];
  scenes?: Scene[];
  subtitlesSrt: string;
  subtitlesVtt: string;
  audioWavUrl: string;
  video4kUrl: string;
  ttsProviderUsed?: string;
  qaReport: {
    language: string;
    segments: number;
    missing: number;
    untranslatedCount?: number;
    timestampErrors: number;
    readingSpeedWpm: number;
    properNounsPreserved: boolean;
    status: 'PASS' | 'WARN' | 'WARNING' | 'FAIL' | 'UNTRANSLATED' | 'NEEDS_REVIEW';
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
  audioStreamStatus: 'verified' | 'unverified' | 'captions_available' | 'captions_unavailable';
  captionTracksAvailable?: number;
  warnings: string[];
  passedChecks: string[];
}

export interface PipelineFailureDetails {
  errorCode: string;
  stage: StageName;
  message: string;
  details?: string;
  remediation?: string;
  canRetryWithDemo?: boolean;
  canSupplyTranscriptOrAudio?: boolean;
}

export interface FfprobeValidationReport {
  verified: boolean;
  durationSeconds: number;
  expectedDurationSeconds: number;
  durationDeltaSeconds: number;
  width: number;
  height: number;
  fps: number;
  videoCodec: string;
  audioCodec: string;
  hasVideoStream: boolean;
  hasAudioStream: boolean;
  containerFormat: string;
  fileExtension: string;
  fileSizeBytes: number;
  qaStatus: 'PASS' | 'WARN' | 'FAIL';
  issues: string[];
}

export interface VideoExportJob {
  jobId: string;
  projectId: string;
  languageCode: LanguageCode;
  exportMode: VideoExportMode;
  requestedResolution: '720p' | '1080p' | '1440p' | '4k';
  resolution?: string;
  aspectRatio?: AspectRatioPreset;
  width: number;
  height: number;
  fps: number;
  container: 'mp4' | 'webm';
  videoCodec: string;
  audioCodec: string;
  status: 'QUEUED' | 'RENDERING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress: number;
  message: string;
  error?: string;
  downloadUrl?: string;
  createdAt: string;
  completedAt?: string;
  ttsProviderUsed?: string;
  ffprobeValidation?: FfprobeValidationReport;
}

export interface ExportBundleMetadata {
  status: 'IDLE' | 'PROCESSING' | 'READY' | 'FAILED';
  bundledAt?: string;
  downloadUrl?: string;
  bundledLanguages: LanguageCode[];
  videoCount: number;
  fileSizeBytes?: number;
  message?: string;
}

export interface QualityCheckItem {
  id: string;
  category: 'transcript' | 'storyboard' | 'character' | 'translation' | 'voiceover' | 'export';
  label: string;
  status: 'PASS' | 'NEEDS_REVIEW' | 'WARN' | 'FAIL';
  summary: string;
  details?: string;
  affectedStep: WorkflowStepId;
  affectedItemIds?: (string | number)[];
}

export interface ProjectQualityAudit {
  overallStatus: 'PASS' | 'NEEDS_REVIEW' | 'PARTIAL' | 'FAILED';
  checkedAt: string;
  missingTranscriptCoveragePct: number;
  duplicatedSceneDialogueCount: number;
  sceneGapCount: number;
  sceneOverlapCount: number;
  voiceoverDurationMismatchCount: number;
  reusedImageCount: number;
  unverifiedTranslationLanguageCount: number;
  lowConfidenceSegmentCount: number;
  checks: QualityCheckItem[];
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  sourceType: 'youtube' | 'upload_video' | 'upload_audio';
  sourceUrl?: string;
  uploadedMediaName?: string;
  uploadedMediaPath?: string;
  sourceLanguage: string;
  detectedLanguage?: string;
  targetLanguages: LanguageCode[];
  resolution: '1080p' | '1440p' | '4k';
  aspectRatio?: AspectRatioPreset;
  visualStylePreset?: VisualStylePreset;
  ttsVoice: string;
  lastTtsProvider?: string;
  status: StageStatus;
  progress: number;
  currentStage?: StageName;
  durationSeconds: number;
  totalStorageBytes: number;
  createdAt: string;
  updatedAt: string;
  isDemoMode?: boolean;
  humanReviewCompleted?: boolean;
  humanReviewLocked?: boolean;
  humanReviewLockedAt?: string;
  glossary?: GlossaryTerm[];
  transcriptProvenance?: TranscriptProvenance;
  transcriptValidation?: TranscriptValidationReport;
  characterRegistry?: CharacterRegistryEntry[];
  failureDetails?: PipelineFailureDetails;
  qualityAudit?: ProjectQualityAudit;
  exportJobs?: Record<string, VideoExportJob>;
  exportBundle?: ExportBundleMetadata;
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
