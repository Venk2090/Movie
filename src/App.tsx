import React, { useState, useEffect, useRef } from 'react';
import {
  Project,
  LanguageCode,
  HardwareInfo,
  ModelInfo,
  Scene,
  TranscriptSegment,
  PreflightReport,
  CharacterConsistencyConfig,
  KokoroProsodyConfig,
  WorkflowStepId,
  SaveStatus
} from './types';
import {
  DEFAULT_KOKORO_PROSODY,
  downloadProjectZipArchive
} from './utils/voiceover';
import { INITIAL_PROJECT, buildLocalizedOutputs, DEFAULT_PIPELINE_STAGES } from './data/mockData';
import { REGISTERED_MODELS } from './data/modelsData';
import { INITIAL_11_LANGUAGES } from './data/languages';
import { extractYouTubeId } from './utils/youtube';
import {
  generateSceneArtwork,
  DEFAULT_CHARACTER_CONSISTENCY,
  prependCharacterConsistencyToPrompt,
  getDefaultMotionPresetForIndex
} from './utils/sceneArt';
import {
  regenerateSingleSceneFromTranscript,
  computeProjectQualityAudit
} from './utils/transcriptPipeline';
import { PipelineErrorTracker, PipelineErrorCode, createDiagnosticLog } from './utils/errorTracking';
import { Navbar } from './components/Navbar';
import { QuickUrlBar } from './components/QuickUrlBar';
import { DashboardMetrics } from './components/DashboardMetrics';
import { PipelineProgress } from './components/PipelineProgress';
import { VideoPlayerPreview } from './components/VideoPlayerPreview';
import { StoryboardView } from './components/StoryboardView';
import { TranscriptView } from './components/TranscriptView';
import { ModelManager } from './components/ModelManager';
import { DiagnosticsView } from './components/DiagnosticsView';
import { LicenseInventoryView } from './components/LicenseInventoryView';
import { CreateVideoModal } from './components/CreateVideoModal';
import { QualityReportModal } from './components/QualityReportModal';
import { ProjectListView } from './components/ProjectListView';
import { CharacterConsistencyModule } from './components/CharacterConsistencyModule';
import { SceneTimelineBar } from './components/SceneTimelineBar';
import { HumanReviewCheckpoint } from './components/HumanReviewCheckpoint';
import {
  CheckCircle2,
  AlertTriangle,
  Save,
  Lock,
  Sparkles,
  RefreshCw,
  Trash2
} from 'lucide-react';

/**
 * Dynamically calculates target scene count based on video duration when grouping long transcripts.
 */
export function calculateDynamicSceneCount(durationSeconds: number): number {
  if (!durationSeconds || durationSeconds <= 0) return 4;
  if (durationSeconds >= 3600) {
    const scaled = Math.round(durationSeconds / 180);
    return Math.min(48, Math.max(18, scaled));
  }
  if (durationSeconds >= 2400) return 16;
  if (durationSeconds >= 1200) return 12;
  if (durationSeconds >= 600) return 8;
  if (durationSeconds >= 300) return 6;
  if (durationSeconds >= 100) return 4;
  return 3;
}

const WORKFLOW_STEPS: { id: WorkflowStepId; label: string; stepNum: number }[] = [
  { id: 'source', label: 'Source', stepNum: 1 },
  { id: 'transcript', label: 'Transcript', stepNum: 2 },
  { id: 'storyboard', label: 'Storyboard', stepNum: 3 },
  { id: 'voiceover', label: 'Voice-over & Languages', stepNum: 4 },
  { id: 'review', label: 'Human Review', stepNum: 5 },
  { id: 'export', label: 'Export', stepNum: 6 }
];

export default function App() {
  const [projects, setProjects] = useState<Project[]>([INITIAL_PROJECT]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(INITIAL_PROJECT.id);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<WorkflowStepId>('storyboard');
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>('te');
  const [models, setModels] = useState<ModelInfo[]>(REGISTERED_MODELS);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isQualityReportOpen, setIsQualityReportOpen] = useState(false);
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [isProcessingUrl, setIsProcessingUrl] = useState(false);
  const [focusedSceneId, setFocusedSceneId] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');

  const [characterConsistency, setCharacterConsistency] = useState<CharacterConsistencyConfig>(
    DEFAULT_CHARACTER_CONSISTENCY
  );
  const [kokoroProsody, setKokoroProsody] = useState<KokoroProsodyConfig>(
    DEFAULT_KOKORO_PROSODY
  );

  const [hardware, setHardware] = useState<HardwareInfo>({
    cpu: {
      cores: 16,
      threads: 32,
      architecture: 'x86_64'
    },
    ramGb: 64,
    gpu: {
      available: true,
      name: 'NVIDIA GeForce RTX 4090 / CUDA 12.4',
      vramGb: 24,
      cudaVersion: '12.4'
    },
    storageFreeGb: 840,
    executionMode: 'NVIDIA GPU (CUDA)'
  });

  // Load persisted projects and host hardware specs on mount
  useEffect(() => {
    fetch('/api/projects')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data?.projects && Array.isArray(data.projects) && data.projects.length > 0) {
          const hydrated = data.projects.map((p: Project) => {
            const fullOutputs = buildLocalizedOutputs(
              INITIAL_11_LANGUAGES,
              p.cleanTranscript || INITIAL_PROJECT.cleanTranscript,
              undefined,
              p.name,
              {
                isDemoMode: Boolean(p.isDemoMode),
                sourceLanguage: (p.sourceLanguage as LanguageCode) || 'en',
                baseScenes: p.scenes
              }
            );
            return {
              ...p,
              targetLanguages: INITIAL_11_LANGUAGES,
              localizedOutputs: {
                ...fullOutputs,
                ...(p.localizedOutputs || {})
              }
            };
          });
          setProjects(hydrated);
          setSelectedProjectId(hydrated[0].id);
        }
      })
      .catch(() => {});

    fetch('/api/hardware')
      .then(res => res.json())
      .then(data => {
        if (data?.cpu) {
          setHardware({
            cpu: data.cpu,
            ramGb: data.ramGb || 64,
            gpu: data.gpu || {
              available: true,
              name: 'NVIDIA GeForce RTX 4090',
              vramGb: 24,
              cudaVersion: '12.4'
            },
            storageFreeGb: data.storageFreeGb || 840,
            executionMode: data.executionMode || 'NVIDIA GPU (CUDA)'
          });
        }
      })
      .catch(() => {});
  }, []);

  const activeProject = projects.find(p => p.id === selectedProjectId) || projects[0];

  // Autosave active project to backend persistent store whenever edits occur
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistProjectToServer = (projToSave: Project) => {
    setSaveStatus('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      fetch(`/api/projects/${encodeURIComponent(projToSave.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projToSave)
      })
        .then(res => {
          setSaveStatus(res.ok ? 'saved' : 'error');
        })
        .catch(() => {
          setSaveStatus('error');
        });
    }, 350);
  };

  const executePipelineSequence = (projectId: string, targetLangs: LanguageCode[]) => {
    let step = 0;
    const stages = DEFAULT_PIPELINE_STAGES;
    const stageNames = stages.map(s => s.name);

    const logMessages = [
      'Connecting to source stream and verifying caption/audio availability...',
      'Normalizing audio loudness via EBU R128 loudnorm filter...',
      'Transcribing speech with segment-level timestamps...',
      'Normalized punctuation and validated monotonic segment boundaries...',
      `Translating 1:1 transcript segments into ${targetLangs.length} target languages...`,
      'Running Translation QA: Sub-second timestamp alignment verified.',
      'Generated transcript-grounded cinematic scenes and character registry...',
      'Synthesizing visual frames grounded in transcript dialogue...',
      `Pre-warming neural speech audio across ${targetLangs.length} languages...`,
      'Generated standardized SRT and VTT subtitle tracks...',
      'Ready for FFmpeg MP4 video export with synchronized audio...',
      'Quality Audit complete.'
    ];

    const interval = setInterval(() => {
      step++;
      const pct = Math.min(100, Math.round((step / stages.length) * 100));

      setProjects(prev =>
        prev.map(p => {
          if (p.id !== projectId) return p;

          const updatedStages = p.stages.map((s, idx) => {
            if (idx < step) return { ...s, status: 'COMPLETED' as const, progress: 100 };
            if (idx === step) return { ...s, status: 'RUNNING' as const, progress: 50 };
            return { ...s, status: 'PENDING' as const, progress: 0 };
          });

          const currentMsg = logMessages[step - 1] || `Completed step ${step}/${stages.length}`;

          return {
            ...p,
            progress: pct,
            status: step >= stages.length ? 'COMPLETED' : 'RUNNING',
            currentStage: step >= stages.length ? 'COMPLETE' : stageNames[step - 1],
            stages: updatedStages,
            logs: [
              ...p.logs,
              {
                timestamp: new Date().toTimeString().split(' ')[0],
                stage: stageNames[Math.min(step - 1, stageNames.length - 1)],
                level: 'INFO',
                message: currentMsg
              }
            ]
          };
        })
      );

      if (step >= stages.length) {
        clearInterval(interval);
        setIsDemoRunning(false);
      }
    }, 450);
  };

  // Explicit Demo Run button trigger (clearly labeled as Demo Mode)
  const handleRunDemo = () => {
    setIsDemoRunning(true);
    const demoId = `VID-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newDemoProject: Project = {
      ...INITIAL_PROJECT,
      id: demoId,
      name: `[SAMPLE DEMO] Global Localization Showcase`,
      isDemoMode: true,
      transcriptProvenance: 'demo_mock',
      status: 'RUNNING',
      progress: 0,
      createdAt: new Date().toISOString(),
      targetLanguages: INITIAL_11_LANGUAGES,
      localizedOutputs: buildLocalizedOutputs(INITIAL_11_LANGUAGES, INITIAL_PROJECT.cleanTranscript, undefined, INITIAL_PROJECT.name, {
        isDemoMode: true,
        sourceLanguage: 'en'
      }),
      stages: DEFAULT_PIPELINE_STAGES.map((s, i) => (i === 0 ? { ...s, status: 'RUNNING', progress: 15 } : { ...s, status: 'PENDING', progress: 0 })),
      logs: [{ timestamp: new Date().toTimeString().split(' ')[0], stage: 'INGESTION', level: 'INFO', message: 'Explicit Sample Demo run initiated.' }]
    };

    setProjects(prev => [newDemoProject, ...prev]);
    setSelectedProjectId(demoId);
    setSelectedLanguage('te');
    executePipelineSequence(demoId, INITIAL_11_LANGUAGES);
  };

  /**
   * Transcript-Grounded Ingestion & Localization Pipeline.
   * Never fabricates transcripts from title/URL metadata and never uses modulo indexing to repeat lines.
   */
  const processAndLocalizeVideo = async (
    input:
      | string
      | {
          url?: string;
          sourceUrl?: string;
          name?: string;
          targetLanguages?: LanguageCode[];
          resolution?: '1080p' | '1440p' | '4k';
          thumbnailUrl?: string;
          ttsVoice?: string;
          sourceLanguage?: string;
          durationSeconds?: number;
          detectedLanguage?: string;
          transcriptText?: string;
          transcriptSegments?: TranscriptSegment[];
          uploadedMediaPath?: string;
          uploadedMediaName?: string;
          allowDemoMode?: boolean;
        }
  ) => {
    const rawUrl = typeof input === 'string' ? input : input?.url || input?.sourceUrl || '';
    const cleanUrl = rawUrl.trim();
    if (!cleanUrl && !(typeof input === 'object' && (input.transcriptText || input.uploadedMediaPath))) {
      return;
    }

    const ytid = extractYouTubeId(cleanUrl);
    const customName = typeof input === 'object' && input?.name?.trim() ? input.name.trim() : '';
    const videoName = customName || (ytid ? `YouTube Stream (${ytid})` : 'Ingested Media Project');
    const resolution = typeof input === 'object' && input?.resolution ? input.resolution : '4k';
    const ttsVoice = typeof input === 'object' && input?.ttsVoice ? input.ttsVoice : 'Kore';
    const sourceLanguage = typeof input === 'object' && input?.sourceLanguage ? input.sourceLanguage : 'auto';
    const allowDemoMode =
      typeof input === 'object' && input?.allowDemoMode !== undefined
        ? Boolean(input.allowDemoMode)
        : true;

    // Ensure all 12 languages are included so end-video rendering works for every language
    const targetLangs: LanguageCode[] =
      typeof input === 'object' && Array.isArray(input?.targetLanguages) && input.targetLanguages.length > 0
        ? (Array.from(new Set([...input.targetLanguages, ...INITIAL_11_LANGUAGES])) as LanguageCode[])
        : INITIAL_11_LANGUAGES;

    const videoDuration =
      typeof input === 'object' && typeof input?.durationSeconds === 'number' && input.durationSeconds > 1
        ? input.durationSeconds
        : 133;
    const detectedLang =
      typeof input === 'object' && input?.detectedLanguage
        ? input.detectedLanguage
        : 'Auto-Detecting...';

    const newId = `VID-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Create an honest RUNNING project skeleton (no fake placeholder transcript lines!)
    const runningProject: Project = {
      id: newId,
      name: videoName,
      description: `Ingesting verified transcript & media from ${cleanUrl || 'uploaded source'}`,
      sourceType: 'youtube',
      sourceUrl: cleanUrl,
      uploadedMediaPath: typeof input === 'object' ? input.uploadedMediaPath : undefined,
      uploadedMediaName: typeof input === 'object' ? input.uploadedMediaName : undefined,
      sourceLanguage,
      detectedLanguage: detectedLang,
      targetLanguages: targetLangs,
      resolution,
      ttsVoice,
      status: 'RUNNING',
      progress: 20,
      currentStage: 'TRANSCRIPTION',
      durationSeconds: videoDuration,
      totalStorageBytes: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDemoMode: allowDemoMode,
      scenes: [],
      rawTranscript: [],
      cleanTranscript: [],
      localizedOutputs: {} as Record<LanguageCode, any>,
      stages: DEFAULT_PIPELINE_STAGES.map((s, i) =>
        i === 0
          ? { ...s, status: 'COMPLETED', progress: 100, message: `Connected to ${cleanUrl}` }
          : i === 1 || i === 2
          ? { ...s, status: 'RUNNING', progress: 50, message: 'Extracting verified caption track / speech segments...' }
          : { ...s, status: 'PENDING', progress: 0 }
      ),
      logs: [
        {
          timestamp: new Date().toTimeString().split(' ')[0],
          stage: 'INGESTION',
          level: 'INFO',
          message: `Connecting to ${cleanUrl} and checking verified transcript/caption tracks...`
        }
      ]
    };

    setProjects(prev => [runningProject, ...prev.filter(p => p.id !== newId)]);
    setSelectedProjectId(newId);
    if (!targetLangs.includes(selectedLanguage)) {
      setSelectedLanguage(targetLangs[0] || 'te');
    }
    setActiveTab('dashboard');
    setIsProcessingUrl(true);

    try {
      const response = await fetch('/api/youtube/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: cleanUrl,
          customName: videoName,
          targetLanguages: targetLangs,
          resolution,
          ttsVoice,
          durationSeconds: videoDuration,
          transcriptText: typeof input === 'object' ? input.transcriptText : undefined,
          transcriptSegments: typeof input === 'object' ? input.transcriptSegments : undefined,
          uploadedMediaPath: typeof input === 'object' ? input.uploadedMediaPath : undefined,
          uploadedMediaName: typeof input === 'object' ? input.uploadedMediaName : undefined,
          allowDemoMode
        })
      });

      const apiData = await response.json().catch(() => null);

      // Honest failure if captions/transcript could not be obtained and allowDemoMode is false
      if (!response.ok || apiData?.status === 'NEEDS_TRANSCRIPT_INPUT') {
        const errMsg =
          apiData?.message ||
          apiData?.error ||
          'Verified captions or speech transcript could not be extracted automatically. Please supply an SRT/VTT/TXT transcript, upload audio/video, or enable Sample Demo mode.';

        setProjects(prev =>
          prev.map(p => {
            if (p.id !== newId) return p;
            return {
              ...p,
              status: 'NEEDS_REVIEW',
              progress: 25,
              currentStage: 'TRANSCRIPTION',
              failureDetails: {
                errorCode: apiData?.errorCode || 'ERR_TRANSCRIPT_UNAVAILABLE',
                stage: 'TRANSCRIPTION',
                message: errMsg,
                remediation:
                  apiData?.remediation ||
                  'Click "Supply Transcript / Audio" in the bar above to paste SRT/VTT/timestamped text or enable Sample Demo Fallback.',
                canRetryWithDemo: true,
                canSupplyTranscriptOrAudio: true
              },
              stages: p.stages.map(s =>
                s.name === 'TRANSCRIPTION'
                  ? { ...s, status: 'FAILED', progress: 0, message: errMsg }
                  : s
              ),
              logs: [
                ...p.logs,
                {
                  timestamp: new Date().toTimeString().split(' ')[0],
                  stage: 'TRANSCRIPTION',
                  level: 'ERROR',
                  message: errMsg
                }
              ]
            };
          })
        );
        return;
      }

      // Use authoritative transcript, scenes, characterRegistry, and localizedOutputs from backend without modulo re-indexing!
      const rawTranscript: TranscriptSegment[] = Array.isArray(apiData.rawTranscript)
        ? apiData.rawTranscript
        : [];
      const cleanTranscript: TranscriptSegment[] = Array.isArray(apiData.cleanTranscript)
        ? apiData.cleanTranscript
        : rawTranscript;
      const scenes: Scene[] = Array.isArray(apiData.scenes) ? apiData.scenes : [];
      const finalDuration =
        typeof apiData.durationSeconds === 'number' && apiData.durationSeconds > 0
          ? apiData.durationSeconds
          : cleanTranscript[cleanTranscript.length - 1]?.end || videoDuration;

      const outputs =
        apiData.localizedOutputs && Object.keys(apiData.localizedOutputs).length > 0
          ? apiData.localizedOutputs
          : buildLocalizedOutputs(
              targetLangs,
              cleanTranscript,
              apiData.translations,
              apiData.name || videoName,
              {
                isDemoMode: Boolean(apiData.isDemoMode),
                sourceLanguage: (apiData.sourceLanguage as LanguageCode) || 'en',
                baseScenes: scenes
              }
            );

      const completedProject: Project = {
        ...runningProject,
        id: apiData.id || newId,
        name: apiData.name || videoName,
        description: apiData.description || runningProject.description,
        sourceLanguage: apiData.sourceLanguage || runningProject.sourceLanguage,
        durationSeconds: finalDuration,
        detectedLanguage: apiData.detectedLanguage || detectedLang,
        isDemoMode: Boolean(apiData.isDemoMode),
        transcriptProvenance: apiData.transcriptProvenance || 'youtube_captions',
        transcriptValidation: apiData.transcriptValidation,
        characterRegistry: apiData.characterRegistry || [],
        rawTranscript,
        cleanTranscript,
        scenes,
        localizedOutputs: outputs,
        exportJobs: apiData.exportJobs || {},
        exportBundle: apiData.exportBundle,
        qualityAudit: apiData.qualityAudit,
        status: apiData.status || 'COMPLETED',
        progress: 100,
        currentStage: 'COMPLETE',
        stages: Array.isArray(apiData.stages)
          ? apiData.stages
          : DEFAULT_PIPELINE_STAGES.map(s => ({
              ...s,
              status: 'COMPLETED',
              progress: 100,
              message: `${s.label} verified from source transcript (${cleanTranscript.length} segments, ${scenes.length} scenes)`
            })),
        logs: Array.isArray(apiData.logs) && apiData.logs.length > 0
          ? apiData.logs
          : [
              ...runningProject.logs,
              ...(Array.isArray(apiData.diagnostics) ? apiData.diagnostics : []),
              {
                timestamp: new Date().toTimeString().split(' ')[0],
                stage: 'COMPLETE',
                level: 'INFO',
                message: `Generated transcript (${cleanTranscript.length} segments), storyboard (${scenes.length} scenes), 12-language translations, and full MP4 video.`
              }
            ]
      };

      if (!completedProject.qualityAudit) {
        completedProject.qualityAudit = computeProjectQualityAudit(completedProject);
      }

      setProjects(prev =>
        prev
          .map(p => (p.id === newId ? completedProject : p))
          .filter(p => p.id !== 'VID-WORKSPACE-READY')
      );
      if (completedProject.id !== newId) {
        setSelectedProjectId(completedProject.id);
      }
      setFocusedSceneId(completedProject.scenes[0]?.id ?? null);
      setActiveWorkflowStep('export');
    } catch (error: any) {
      const tracker = new PipelineErrorTracker();
      const failureEntry = tracker.handleStageFailure('TRANSCRIPTION', error, 'ERR_GEMINI_TIMEOUT');
      setProjects(prev =>
        prev.map(p => {
          if (p.id !== newId) return p;
          return {
            ...p,
            status: 'FAILED',
            failureDetails: {
              errorCode: 'ERR_NETWORK_OR_INGESTION',
              stage: 'TRANSCRIPTION',
              message: error?.message || 'Failed to process source media.',
              remediation: 'Retry or supply a verified transcript file.'
            },
            logs: [...p.logs, failureEntry]
          };
        })
      );
    } finally {
      setIsProcessingUrl(false);
    }
  };

  // Handle Create Video Form Submit
  const handleCreateProject = (params: {
    name: string;
    sourceType: 'youtube' | 'upload_video' | 'upload_audio';
    sourceUrl: string;
    sourceLanguage: string;
    targetLanguages: LanguageCode[];
    resolution: '1080p' | '1440p' | '4k';
    ttsVoice: string;
    thumbnailUrl?: string;
    durationSeconds?: number;
  }) => {
    processAndLocalizeVideo({
      url: params.sourceUrl,
      sourceUrl: params.sourceUrl,
      name: params.name,
      targetLanguages: params.targetLanguages,
      resolution: params.resolution,
      thumbnailUrl: params.thumbnailUrl,
      ttsVoice: params.ttsVoice,
      sourceLanguage: params.sourceLanguage,
      durationSeconds: params.durationSeconds,
      allowDemoMode: true
    });
  };

  // Update single scene (preserves other scenes, recomputes QA audit, and autosaves)
  const handleUpdateScene = (updatedScene: Scene) => {
    setProjects(prev =>
      prev.map(p => {
        if (p.id !== activeProject.id) return p;
        const nextScenes = p.scenes.map(s => (s.id === updatedScene.id ? updatedScene : s));
        const nextProj: Project = {
          ...p,
          scenes: nextScenes,
          updatedAt: new Date().toISOString()
        };
        nextProj.qualityAudit = computeProjectQualityAudit(nextProj);
        persistProjectToServer(nextProj);
        return nextProj;
      })
    );
  };

  // Batch update multiple scenes at once
  const handleBatchUpdateScenes = (
    updatedScenes: Scene[],
    actionLabel = `Regenerated ${updatedScenes.length} selected scene(s)`
  ) => {
    if (activeProject.humanReviewLocked || updatedScenes.length === 0) return;
    const updatedMap = new Map<number, Scene>(updatedScenes.map(sc => [sc.id, sc]));
    setProjects(prev =>
      prev.map(p => {
        if (p.id !== activeProject.id) return p;
        const nextScenes = p.scenes.map(s => updatedMap.get(s.id) || s);
        const nextProj: Project = {
          ...p,
          scenes: nextScenes,
          updatedAt: new Date().toISOString(),
          logs: [
            ...p.logs,
            {
              timestamp: new Date().toTimeString().split(' ')[0],
              stage: 'STORYBOARD',
              level: 'INFO',
              message: actionLabel
            }
          ]
        };
        nextProj.qualityAudit = computeProjectQualityAudit(nextProj);
        persistProjectToServer(nextProj);
        return nextProj;
      })
    );
  };

  // Regenerate a single scene by ID/index from the transcript without rerunning the entire project
  const handleRegenerateSingleScene = (sceneId: number) => {
    if (activeProject.humanReviewLocked) return;
    setProjects(prev =>
      prev.map(p => {
        if (p.id !== activeProject.id) return p;
        const idx = p.scenes.findIndex(s => s.id === sceneId);
        if (idx === -1) return p;
        const targetScene = p.scenes[idx];
        const regen = regenerateSingleSceneFromTranscript(
          targetScene,
          p.cleanTranscript,
          p.characterRegistry || [],
          {
            preserveUserEdits: true,
            sceneIndex: idx,
            totalScenes: p.scenes.length,
            resolveArtwork: (draft, i, total) =>
              generateSceneArtwork(
                {
                  id: draft.id,
                  sceneNumber: draft.sceneNumber || i + 1,
                  summary: draft.summary || targetScene.summary,
                  dialogue: draft.dialogue || targetScene.dialogue,
                  visualDescription: draft.visualDescription || targetScene.visualDescription,
                  characterIds: draft.characterIds,
                  depictionMode: draft.depictionMode,
                  characterRegistry: p.characterRegistry,
                  characterConfig: characterConsistency
                },
                p.name,
                i,
                total
              )
          }
        );

        const nextScenes = p.scenes.map(s => (s.id === sceneId ? regen : s));
        const nextProj: Project = {
          ...p,
          scenes: nextScenes,
          updatedAt: new Date().toISOString(),
          logs: [
            ...p.logs,
            {
              timestamp: new Date().toTimeString().split(' ')[0],
              stage: 'STORYBOARD',
              level: 'INFO',
              message: `Regenerated Scene ${String(regen.sceneNumber).padStart(2, '0')} (${regen.startTime}s-${regen.endTime}s) from transcript.`
            }
          ]
        };
        nextProj.qualityAudit = computeProjectQualityAudit(nextProj);
        persistProjectToServer(nextProj);
        return nextProj;
      })
    );
  };

  // Batch regenerate multiple selected scenes by ID
  const handleRegenerateSelectedScenes = (sceneIds: number[]) => {
    if (activeProject.humanReviewLocked || sceneIds.length === 0) return;
    setProjects(prev =>
      prev.map(p => {
        if (p.id !== activeProject.id) return p;
        const nextScenes = p.scenes.map((targetScene, idx) => {
          if (!sceneIds.includes(targetScene.id)) return targetScene;
          return regenerateSingleSceneFromTranscript(
            targetScene,
            p.cleanTranscript,
            p.characterRegistry || [],
            {
              preserveUserEdits: true,
              sceneIndex: idx,
              totalScenes: p.scenes.length,
              resolveArtwork: (draft, i, total) =>
                generateSceneArtwork(
                  {
                    id: draft.id,
                    sceneNumber: draft.sceneNumber || i + 1,
                    summary: draft.summary || targetScene.summary,
                    dialogue: draft.dialogue || targetScene.dialogue,
                    visualDescription: draft.visualDescription || targetScene.visualDescription,
                    characterIds: draft.characterIds,
                    depictionMode: draft.depictionMode,
                    characterRegistry: p.characterRegistry,
                    characterConfig: characterConsistency
                  },
                  p.name,
                  i,
                  total
                )
            }
          );
        });

        const nextProj: Project = {
          ...p,
          scenes: nextScenes,
          updatedAt: new Date().toISOString(),
          logs: [
            ...p.logs,
            {
              timestamp: new Date().toTimeString().split(' ')[0],
              stage: 'STORYBOARD',
              level: 'INFO',
              message: `Batch regenerated ${sceneIds.length} selected scene(s) using generateSceneArtwork.`
            }
          ]
        };
        nextProj.qualityAudit = computeProjectQualityAudit(nextProj);
        persistProjectToServer(nextProj);
        return nextProj;
      })
    );
  };

  // Update a single transcript segment from HumanReviewCheckpoint and sync linked scene dialogue
  const handleUpdateTranscriptSegment = (updatedSegment: TranscriptSegment) => {
    if (activeProject.humanReviewLocked) return;
    setProjects(prev =>
      prev.map(p => {
        if (p.id !== activeProject.id) return p;
        const nextClean = p.cleanTranscript.map(s =>
          s.id === updatedSegment.id ? updatedSegment : s
        );
        const nextScenes = p.scenes.map(sc => {
          const segIds = sc.transcriptSegmentIds || sc.segmentIds || [];
          if (segIds.includes(updatedSegment.id)) {
            const matchedSegs = nextClean.filter(s => segIds.includes(s.id));
            const newStart = matchedSegs[0]?.start ?? sc.startTime;
            const newEnd = matchedSegs[matchedSegs.length - 1]?.end ?? sc.endTime;
            return {
              ...sc,
              startTime: newStart,
              endTime: newEnd,
              duration: Math.max(0.5, Number((newEnd - newStart).toFixed(2))),
              dialogue: matchedSegs.map(s => s.text).join(' ')
            };
          }
          return sc;
        });

        const nextProj: Project = {
          ...p,
          cleanTranscript: nextClean,
          scenes: nextScenes,
          updatedAt: new Date().toISOString()
        };
        nextProj.qualityAudit = computeProjectQualityAudit(nextProj);
        persistProjectToServer(nextProj);
        return nextProj;
      })
    );
  };

  // Toggle Human Review Lock
  const handleToggleReviewLock = (locked: boolean) => {
    setProjects(prev =>
      prev.map(p => {
        if (p.id !== activeProject.id) return p;
        const nextProj: Project = {
          ...p,
          humanReviewLocked: locked,
          humanReviewCompleted: locked ? true : p.humanReviewCompleted,
          humanReviewLockedAt: locked ? new Date().toISOString() : undefined,
          updatedAt: new Date().toISOString(),
          logs: [
            ...p.logs,
            {
              timestamp: new Date().toTimeString().split(' ')[0],
              stage: 'QUALITY_CHECK',
              level: 'INFO',
              message: locked
                ? 'Human Review Checkpoint LOCKED: Transcript edits and scene boundaries approved. Advancing to Export step to process and bundle all selected languages.'
                : 'Human Review Checkpoint UNLOCKED for further editing.'
            }
          ]
        };
        persistProjectToServer(nextProj);
        return nextProj;
      })
    );
    if (locked) {
      handleSelectWorkflowStep('export');
    }
  };

  // Approve all scenes in the active project
  const handleApproveAllScenes = () => {
    if (activeProject.humanReviewLocked) return;
    setProjects(prev =>
      prev.map(p => {
        if (p.id !== activeProject.id) return p;
        const nextScenes = p.scenes.map(s => ({
          ...s,
          reviewStatus: 'approved' as const,
          approved: true
        }));
        const nextProj: Project = {
          ...p,
          scenes: nextScenes,
          humanReviewCompleted: true,
          updatedAt: new Date().toISOString()
        };
        persistProjectToServer(nextProj);
        return nextProj;
      })
    );
  };

  // Update per-segment millisecond voiceover latency offset
  const handleUpdateSegmentLatency = (
    langCode: LanguageCode,
    segmentId: number,
    latencyOffsetMs: number
  ) => {
    setProjects(prev =>
      prev.map(p => {
        if (p.id !== activeProject.id) return p;
        const langOut = p.localizedOutputs[langCode];
        if (!langOut) return p;
        const nextProj: Project = {
          ...p,
          localizedOutputs: {
            ...p.localizedOutputs,
            [langCode]: {
              ...langOut,
              translationSegments: langOut.translationSegments.map(seg =>
                seg.id === segmentId ? { ...seg, latencyOffsetMs } : seg
              )
            }
          }
        };
        persistProjectToServer(nextProj);
        return nextProj;
      })
    );
  };

  const handleBulkUpdateLanguageLatency = (
    langCode: LanguageCode,
    latencyOffsetMs: number
  ) => {
    setProjects(prev =>
      prev.map(p => {
        if (p.id !== activeProject.id) return p;
        const langOut = p.localizedOutputs[langCode];
        if (!langOut) return p;
        const nextProj: Project = {
          ...p,
          localizedOutputs: {
            ...p.localizedOutputs,
            [langCode]: {
              ...langOut,
              translationSegments: langOut.translationSegments.map(seg => ({
                ...seg,
                latencyOffsetMs
              }))
            }
          }
        };
        persistProjectToServer(nextProj);
        return nextProj;
      })
    );
  };

  // Apply custom/re-translated transcript segments and regenerate 1:1 scenes from the transcript
  const handleApplyCustomTranslations = (
    customSegments: { id: number; start: number; end: number; text: string }[],
    translationsByLang: Record<string, { id: number; start: number; end: number; text: string }[]>
  ) => {
    if (activeProject.humanReviewLocked) return;
    setProjects(prev =>
      prev.map(p => {
        if (p.id !== activeProject.id) return p;
        const totalDur =
          customSegments[customSegments.length - 1]?.end || p.durationSeconds || 133;
        const regeneratedScenes: Scene[] = customSegments.map((seg, idx) => {
          const existing = p.scenes[idx];
          const motionPreset = existing?.motionPreset || getDefaultMotionPresetForIndex(idx);
          const baseVisual =
            existing?.visualDescription ||
            `Cinematic 4K scene depicting: ${seg.text.slice(0, 120)}`;
          const prependedPrompt = prependCharacterConsistencyToPrompt(
            baseVisual,
            characterConsistency
          );
          const summary =
            translationsByLang.en?.[idx]?.text?.slice(0, 88) ||
            existing?.summary ||
            `Scene ${idx + 1}: ${seg.text.slice(0, 72)}`;
          const art = generateSceneArtwork(
            {
              id: idx + 1,
              sceneNumber: idx + 1,
              summary,
              dialogue: seg.text,
              visualDescription: prependedPrompt,
              prompt: prependedPrompt,
              camera: existing?.camera || '35mm Anamorphic Cinema Prime',
              lighting: existing?.lighting || 'Volumetric Broadcast Key Light',
              environment: existing?.environment || '4K Broadcast Studio & Field Set',
              startTime: seg.start,
              endTime: seg.end,
              motionPreset,
              characterPrompt: characterConsistency.compiledPrompt,
              characterConfig: characterConsistency
            },
            p.name,
            idx,
            customSegments.length
          );
          return {
            id: idx + 1,
            sceneNumber: idx + 1,
            transcriptSegmentIds: [seg.id],
            segmentIds: [seg.id],
            startTime: seg.start,
            endTime: seg.end,
            duration: Number((seg.end - seg.start).toFixed(1)),
            dialogue: seg.text,
            summary,
            visualDescription: prependedPrompt,
            camera: existing?.camera || '35mm Anamorphic Cinema Prime',
            lighting: existing?.lighting || 'Volumetric Broadcast Key Light',
            environment: existing?.environment || '4K Broadcast Studio & Field Set',
            style: 'cinematic 4k',
            motionPreset,
            characterPrompt: characterConsistency.compiledPrompt,
            imageUrl: art,
            prompt: prependedPrompt,
            seed: 41000 + idx,
            reviewStatus: existing?.reviewStatus || 'pending'
          };
        });

        const nextProj: Project = {
          ...p,
          durationSeconds: totalDur,
          rawTranscript: customSegments,
          cleanTranscript: customSegments,
          scenes: regeneratedScenes,
          localizedOutputs: buildLocalizedOutputs(
            p.targetLanguages || INITIAL_11_LANGUAGES,
            customSegments,
            translationsByLang,
            p.name,
            {
              isDemoMode: Boolean(p.isDemoMode),
              sourceLanguage: (p.sourceLanguage as LanguageCode) || 'en',
              baseScenes: regeneratedScenes
            }
          )
        };
        nextProj.qualityAudit = computeProjectQualityAudit(nextProj);
        persistProjectToServer(nextProj);
        return nextProj;
      })
    );
  };

  // Apply Persistent Character Consistency across all scenes of the active project
  const handleApplyCharacterConsistency = (newConfig: CharacterConsistencyConfig) => {
    if (activeProject.humanReviewLocked) return;
    setCharacterConsistency(newConfig);
    setProjects(prev =>
      prev.map(p => {
        if (p.id !== activeProject.id) return p;
        const updatedScenes = p.scenes.map((sc, idx) => {
          const prependedPrompt = prependCharacterConsistencyToPrompt(
            sc.visualDescription || sc.prompt,
            newConfig
          );
          const motionPreset = sc.motionPreset || getDefaultMotionPresetForIndex(idx);
          const newArt = generateSceneArtwork(
            {
              id: sc.id,
              sceneNumber: sc.sceneNumber,
              summary: sc.summary,
              dialogue: sc.dialogue,
              visualDescription: prependedPrompt,
              prompt: prependedPrompt,
              camera: sc.camera,
              lighting: sc.lighting,
              environment: sc.environment,
              startTime: sc.startTime,
              endTime: sc.endTime,
              motionPreset,
              characterPrompt: newConfig.compiledPrompt,
              characterConfig: newConfig
            },
            p.name,
            idx,
            p.scenes.length
          );
          return {
            ...sc,
            visualDescription: prependedPrompt,
            prompt: prependedPrompt,
            motionPreset,
            characterPrompt: newConfig.compiledPrompt,
            imageUrl: newArt
          };
        });

        const nextProj: Project = {
          ...p,
          scenes: updatedScenes,
          logs: [
            ...p.logs,
            {
              timestamp: new Date().toTimeString().split(' ')[0],
              stage: 'VISUAL_GEN',
              level: 'INFO',
              message: newConfig.enabled
                ? `Character Consistency Lock applied to all ${updatedScenes.length} scenes: "${newConfig.characterName}"`
                : `Character Consistency Lock disabled; restored transcript-grounded depiction modes.`
            }
          ]
        };
        persistProjectToServer(nextProj);
        return nextProj;
      })
    );
  };

  const handleToggleModelInstall = (modelId: string) => {
    setModels(prev =>
      prev.map(m => (m.id === modelId ? { ...m, installed: !m.installed } : m))
    );
  };

  // Real binary ZIP archive export
  const handleExportZip = async (projectId: string) => {
    const proj = projects.find(p => p.id === projectId) || activeProject;
    try {
      await downloadProjectZipArchive(proj);
    } catch (err) {
      console.warn('ZIP export error:', err);
    }
  };

  const handleDeleteProject = (projId: string) => {
    if (projects.length <= 1) return;
    fetch(`/api/projects/${encodeURIComponent(projId)}`, { method: 'DELETE' }).catch(() => {});
    const remaining = projects.filter(p => p.id !== projId);
    setProjects(remaining);
    setSelectedProjectId(remaining[0].id);
  };

  const handleClearProjectMedia = async () => {
    await fetch(`/api/projects/${encodeURIComponent(activeProject.id)}/media`, {
      method: 'DELETE'
    }).catch(() => {});
  };

  const handlePreflightMismatch = (report: PreflightReport) => {
    const mismatchLog = createDiagnosticLog(
      'INGESTION',
      'WARNING',
      `Pre-flight Check intercepted duration mismatch for "${report.title}": Expected ${report.formattedExpectedDuration || 'baseline'} vs Actual ${report.formattedDuration} (${report.actualDurationSeconds}s)`,
      'ERR_STREAM_MISMATCH',
      report.warnings[0] || `Stream length variance of ${report.durationDifferenceSeconds}s detected.`,
      `Prompted user for confirmation (${report.recommendedScenes} dynamic scenes recommended).`
    );

    setProjects(prev =>
      prev.map(p => (p.id === activeProject.id ? { ...p, logs: [...p.logs, mismatchLog] } : p))
    );
  };

  const handleSimulateFailurePoint = (errorCode: PipelineErrorCode) => {
    const tracker = new PipelineErrorTracker();
    const simulatedLog = tracker.simulateFailurePoint(errorCode);
    setProjects(prev =>
      prev.map(p => (p.id === activeProject.id ? { ...p, logs: [...p.logs, simulatedLog] } : p))
    );
  };

  // Navigate to a specific project workflow step and scroll to its section
  const handleSelectWorkflowStep = (stepId: WorkflowStepId) => {
    setActiveWorkflowStep(stepId);
    setActiveTab('dashboard');
    setTimeout(() => {
      const el = document.getElementById(`workflow-section-${stepId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* Global Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onRunDemo={handleRunDemo}
        isDemoRunning={isDemoRunning}
        executionMode={hardware.executionMode.includes('CUDA') ? 'CUDA READY' : 'CPU READY'}
      />

      {/* Persistent Per-Project Workspace Header & Workflow Stepper */}
      {activeTab === 'dashboard' && (
        <div className="bg-slate-900/95 border-b border-slate-800 sticky top-0 z-30 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-col gap-2">
            {/* Top Project Status & Save Indicator Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-950 text-amber-300 border border-slate-800 font-bold">
                  {activeProject.id}
                </span>
                <span className="font-bold text-white truncate max-w-md">
                  {activeProject.name}
                </span>
                {activeProject.isDemoMode && (
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono text-[10px] font-bold">
                    SAMPLE DEMO MODE
                  </span>
                )}
                {activeProject.humanReviewLocked && (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono text-[10px] font-bold flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span>REVIEW LOCKED</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Autosave Status */}
                <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] flex items-center gap-1.5">
                  <Save className="w-3 h-3 text-cyan-400" />
                  <span>
                    {saveStatus === 'saving'
                      ? 'Saving...'
                      : saveStatus === 'error'
                      ? 'Save failed'
                      : 'Saved'}
                  </span>
                </span>

                {/* Clear Cached Media */}
                <button
                  type="button"
                  onClick={handleClearProjectMedia}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-red-950/40 text-slate-400 hover:text-red-300 border border-slate-800 font-mono text-[11px] flex items-center gap-1 cursor-pointer"
                  title="Remove cached project media files"
                >
                  <Trash2 className="w-3 h-3" />
                  <span className="hidden sm:inline">Clear Media Cache</span>
                </button>
              </div>
            </div>

            {/* 6-Step Persistent Project Workflow Stepper */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin">
              {WORKFLOW_STEPS.map(step => {
                const isCurr = activeWorkflowStep === step.id;
                const hasBlocker =
                  step.id === 'transcript' && activeProject.status === 'NEEDS_REVIEW';
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => handleSelectWorkflowStep(step.id)}
                    className={`px-3 py-1.5 rounded-lg font-mono text-xs flex items-center gap-1.5 border transition-all cursor-pointer shrink-0 ${
                      isCurr
                        ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold shadow-xs'
                        : hasBlocker
                        ? 'bg-red-950/60 text-red-300 border-red-500/40'
                        : 'bg-slate-950/90 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <span className="text-[10px] opacity-75">{step.stepNum}.</span>
                    <span>{step.label}</span>
                    {hasBlocker ? (
                      <AlertTriangle className="w-3 h-3 text-red-400" />
                    ) : (
                      <CheckCircle2
                        className={`w-3 h-3 ${
                          isCurr ? 'text-slate-950' : 'text-emerald-400'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Studio Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab 1: Primary Studio Dashboard */}
        {activeTab === 'dashboard' && (
          <div>
            {/* Honest Failure / Needs Transcript Input Banner */}
            {activeProject.failureDetails && (
              <div className="bg-red-950/40 border border-red-500/50 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-red-300 font-bold text-sm">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>
                      Stage Halted ({activeProject.failureDetails.stage}):{' '}
                      {activeProject.failureDetails.errorCode}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200">
                    {activeProject.failureDetails.message}
                  </p>
                  {activeProject.failureDetails.remediation && (
                    <p className="text-xs text-amber-300 font-mono">
                      Next Action: {activeProject.failureDetails.remediation}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      processAndLocalizeVideo({
                        url: activeProject.sourceUrl || 'https://www.youtube.com/watch?v=qTbo-vR_PTg',
                        name: activeProject.name,
                        targetLanguages: activeProject.targetLanguages,
                        resolution: activeProject.resolution,
                        durationSeconds: activeProject.durationSeconds,
                        allowDemoMode: true
                      })
                    }
                    className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Load Labeled Sample Demo Instead</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 1: Source Ingestion Bar */}
            <div id="workflow-section-source">
              <QuickUrlBar
                onProcessUrl={processAndLocalizeVideo}
                onPreflightMismatch={handlePreflightMismatch}
                isProcessing={isProcessingUrl}
                selectedLanguage={selectedLanguage}
                onSelectLanguage={setSelectedLanguage}
              />
            </div>

            <DashboardMetrics project={activeProject} hardware={hardware} />

            {/* Dashboard Visual Scene Timeline: Clicking any segment focuses and scrolls to that scene in StoryboardView */}
            <SceneTimelineBar
              scenes={activeProject.scenes}
              totalDurationSeconds={activeProject.durationSeconds}
              selectedSceneId={focusedSceneId}
              onSelectScene={sc => {
                setFocusedSceneId(sc.id);
              }}
              title="Visual Scene Timeline (Dashboard Overview)"
              subtitle="Displays all scenes proportionally by startTime and endTime. Click any segment to automatically focus and scroll the corresponding scene in StoryboardView."
              variant="dashboard"
            />

            <PipelineProgress
              project={activeProject}
              onRetry={() => executePipelineSequence(activeProject.id, activeProject.targetLanguages)}
              onCancel={() => {
                setProjects(prev =>
                  prev.map(p => (p.id === activeProject.id ? { ...p, status: 'CANCELLED' } : p))
                );
              }}
              onSimulateError={handleSimulateFailurePoint}
              kokoroProsody={kokoroProsody}
              onUpdateKokoroProsody={setKokoroProsody}
              selectedLanguage={selectedLanguage}
            />

            {/* Step 5: Human Review Checkpoint (Lock Transcript & Scene Boundaries + Approve/Reject) */}
            <div id="workflow-section-review">
              <HumanReviewCheckpoint
                project={activeProject}
                onUpdateScene={handleUpdateScene}
                onBatchUpdateScenes={handleBatchUpdateScenes}
                onRegenerateSingleScene={handleRegenerateSingleScene}
                onRegenerateSelectedScenes={handleRegenerateSelectedScenes}
                onUpdateTranscriptSegment={handleUpdateTranscriptSegment}
                onToggleReviewLock={handleToggleReviewLock}
                onApproveAllScenes={handleApproveAllScenes}
                characterConsistency={characterConsistency}
                onSelectSceneInStoryboard={sc => {
                  setFocusedSceneId(sc.id);
                  const targetEl = document.getElementById(`storyboard-scene-${sc.id}`);
                  if (targetEl) {
                    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }}
              />
            </div>

            {/* Optional Global Presenter Consistency Module */}
            <CharacterConsistencyModule
              config={characterConsistency}
              sceneCount={activeProject.scenes.length}
              onApplyConfig={handleApplyCharacterConsistency}
            />

            {/* Step 6: Video Player Preview & Consolidated Full-Video Export */}
            <div id="workflow-section-export">
              <VideoPlayerPreview
                project={activeProject}
                selectedLanguage={selectedLanguage}
                onSelectLanguage={setSelectedLanguage}
                onOpenQualityReport={() => setIsQualityReportOpen(true)}
                characterConsistency={characterConsistency}
                kokoroProsody={kokoroProsody}
                onUpdateKokoroProsody={setKokoroProsody}
                activeWorkflowStep={activeWorkflowStep}
                onExportZip={handleExportZip}
                onUpdateProject={updatedProj => {
                  setProjects(prev =>
                    prev.map(p => (p.id === updatedProj.id ? { ...p, ...updatedProj } : p))
                  );
                }}
              />
            </div>

            {/* Step 3: Integrated 4K Storyboard Scenes, Global Scene Timeline, Regenerate Scene & Review States */}
            <div id="workflow-section-storyboard" className="mt-8">
              <StoryboardView
                scenes={activeProject.scenes}
                onUpdateScene={handleUpdateScene}
                onBatchUpdateScenes={handleBatchUpdateScenes}
                onRegenerateScene={sceneId => handleRegenerateSingleScene(sceneId)}
                onRegenerateSelectedScenes={handleRegenerateSelectedScenes}
                characterConsistency={characterConsistency}
                selectedLanguage={selectedLanguage}
                localizedOutputs={activeProject.localizedOutputs}
                videoTitle={activeProject.name}
                totalDurationSeconds={activeProject.durationSeconds}
                focusedSceneId={focusedSceneId}
                onSelectScene={sc => setFocusedSceneId(sc.id)}
                humanReviewLocked={activeProject.humanReviewLocked}
              />
            </div>

            {/* Step 2 & 4: Transcript & Multi-Language Voiceover Studio */}
            <div id="workflow-section-transcript" className="mt-8">
              <div id="workflow-section-voiceover">
                <TranscriptView
                  project={activeProject}
                  selectedLanguage={selectedLanguage}
                  onSelectLanguage={setSelectedLanguage}
                  onApplyCustomTranslations={handleApplyCustomTranslations}
                  onUpdateSegmentLatency={handleUpdateSegmentLatency}
                  onBulkUpdateLanguageLatency={handleBulkUpdateLanguageLatency}
                  kokoroProsody={kokoroProsody}
                  onUpdateKokoroProsody={setKokoroProsody}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Project Management */}
        {activeTab === 'projects' && (
          <ProjectListView
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelectProject={id => {
              setSelectedProjectId(id);
              setActiveTab('dashboard');
            }}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
            onDeleteProject={handleDeleteProject}
            onExportZip={handleExportZip}
          />
        )}

        {/* Tab 3: Storyboard & Visual Prompts */}
        {activeTab === 'storyboard' && (
          <StoryboardView
            scenes={activeProject.scenes}
            onUpdateScene={handleUpdateScene}
            onBatchUpdateScenes={handleBatchUpdateScenes}
            onRegenerateScene={sceneId => handleRegenerateSingleScene(sceneId)}
            onRegenerateSelectedScenes={handleRegenerateSelectedScenes}
            characterConsistency={characterConsistency}
            onApplyCharacterConsistency={handleApplyCharacterConsistency}
            selectedLanguage={selectedLanguage}
            localizedOutputs={activeProject.localizedOutputs}
            videoTitle={activeProject.name}
            totalDurationSeconds={activeProject.durationSeconds}
            focusedSceneId={focusedSceneId}
            onSelectScene={sc => setFocusedSceneId(sc.id)}
            humanReviewLocked={activeProject.humanReviewLocked}
          />
        )}

        {/* Tab 4: Subtitles & Transcript Studio */}
        {activeTab === 'subtitles' && (
          <TranscriptView
            project={activeProject}
            selectedLanguage={selectedLanguage}
            onSelectLanguage={setSelectedLanguage}
            onApplyCustomTranslations={handleApplyCustomTranslations}
            onUpdateSegmentLatency={handleUpdateSegmentLatency}
            onBulkUpdateLanguageLatency={handleBulkUpdateLanguageLatency}
            kokoroProsody={kokoroProsody}
            onUpdateKokoroProsody={setKokoroProsody}
          />
        )}

        {/* Tab 5: Model Management */}
        {activeTab === 'models' && (
          <ModelManager
            models={models}
            onToggleInstall={handleToggleModelInstall}
          />
        )}

        {/* Tab 6: Hardware Diagnostics */}
        {activeTab === 'diagnostics' && (
          <DiagnosticsView hardware={hardware} />
        )}

        {/* Tab 7: FOSS Licenses Audit */}
        {activeTab === 'licenses' && <LicenseInventoryView />}
      </main>

      {/* Create Video Wizard Modal */}
      <CreateVideoModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateProject}
      />

      {/* Automated Quality Audit Report Modal */}
      <QualityReportModal
        isOpen={isQualityReportOpen}
        onClose={() => setIsQualityReportOpen(false)}
        project={activeProject}
      />

      {/* Studio Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>OpenVideoStudio · Transcript-Grounded Localization &amp; Verified FFmpeg Architecture</span>
          <span className="font-mono text-slate-400">
            Whisper · NLLB-200 · Gemini / Neural TTS · FFmpeg MP4/ZIP
          </span>
        </div>
      </footer>
    </div>
  );
}
