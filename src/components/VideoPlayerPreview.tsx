import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Download,
  Globe,
  Volume2,
  VolumeX,
  FileText,
  CheckCircle2,
  Youtube,
  MonitorPlay,
  Sparkles,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Film
} from 'lucide-react';
import {
  Project,
  LanguageCode,
  CharacterConsistencyConfig,
  KokoroProsodyConfig,
  VideoExportJob,
  WorkflowStepId
} from '../types';
import { SUPPORTED_LANGUAGES, INITIAL_11_LANGUAGES } from '../data/languages';
import { extractYouTubeId } from '../utils/youtube';
import {
  extractCharacterFromTranscript,
  getMotionPresetCssClass,
  CINEMATIC_MOTION_PRESETS,
  getDefaultMotionPresetForIndex,
  SCENE_TRANSITION_PRESETS,
  getSceneTransitionCssClass,
  getSceneTransitionOutCssClass,
  getDefaultTransitionPresetForIndex,
  getSceneCinematicFilter,
  VISUAL_FILTER_PRESETS,
  mapEmotionToVisualFilter
} from '../utils/sceneArt';
import {
  speakLocalizedText,
  stopVoiceover,
  downloadNeuralVoiceoverAudio,
  HUMAN_VOICE_PERSONAS,
  DEFAULT_KOKORO_PROSODY,
  preloadSceneVoiceovers,
  fetchAndCacheVoiceoverBlobUrl,
  exportFullLanguageWebmVideo,
  processAndBundleAllLanguageVideos,
  downloadProjectZipArchive,
  getLastUsedTtsProvider,
  subscribeTtsProviderChanges,
  TtsTelemetryState
} from '../utils/voiceover';
import { CinemaMovieCanvasOverlay } from './CinemaMovieCanvasOverlay';

interface VideoPlayerPreviewProps {
  project: Project;
  selectedLanguage: LanguageCode;
  onSelectLanguage: (lang: LanguageCode) => void;
  onOpenQualityReport: () => void;
  characterConsistency?: CharacterConsistencyConfig;
  kokoroProsody?: KokoroProsodyConfig;
  onUpdateKokoroProsody?: (prosody: KokoroProsodyConfig) => void;
  activeWorkflowStep?: WorkflowStepId;
  onUpdateProject?: (updatedProject: Project) => void;
  onExportZip?: (projectId: string) => void;
}

function formatPlayerTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

export const VideoPlayerPreview: React.FC<VideoPlayerPreviewProps> = ({
  project,
  selectedLanguage,
  onSelectLanguage,
  onOpenQualityReport,
  characterConsistency,
  kokoroProsody = DEFAULT_KOKORO_PROSODY,
  onUpdateKokoroProsody,
  activeWorkflowStep,
  onUpdateProject,
  onExportZip
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [playerMode, setPlayerMode] = useState<'localized' | 'rendered_mp4' | 'youtube_source'>('localized');
  const [isSpeakingVoiceover, setIsSpeakingVoiceover] = useState(false);
  const [selectedVoicePersona, setSelectedVoicePersona] = useState<string>('Kore');
  const [exportingLangCode, setExportingLangCode] = useState<LanguageCode | null>(null);
  const [exportLangPct, setExportLangPct] = useState<number>(0);
  const [renderedJobsByLang, setRenderedJobsByLang] = useState<
    Partial<Record<LanguageCode, VideoExportJob>>
  >({});
  const [isBatchRenderingAllLangs, setIsBatchRenderingAllLangs] = useState<boolean>(false);
  const [batchCompletedLangCount, setBatchCompletedLangCount] = useState<number>(0);
  const [isBundlingArchive, setIsBundlingArchive] = useState<boolean>(false);
  const [bundleReady, setBundleReady] = useState<boolean>(
    project.exportBundle?.status === 'READY'
  );
  const [ttsTelemetry, setTtsTelemetry] = useState<TtsTelemetryState>(getLastUsedTtsProvider());
  const [lastExportSummary, setLastExportSummary] = useState<string | null>(null);
  const [exportErrorMsg, setExportErrorMsg] = useState<string | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const autoExportStepSignatureRef = useRef<string | null>(null);

  const selectedLanguages: LanguageCode[] =
    Array.isArray(project.targetLanguages) && project.targetLanguages.length > 0
      ? project.targetLanguages
      : INITIAL_11_LANGUAGES;

  useEffect(() => {
    return subscribeTtsProviderChanges(state => setTtsTelemetry(state));
  }, []);

  // Hydrate renderedJobsByLang from project.exportJobs whenever project updates
  useEffect(() => {
    if (!project.exportJobs) return;
    const byLang: Partial<Record<LanguageCode, VideoExportJob>> = {};
    Object.values(project.exportJobs).forEach(j => {
      if (j && j.languageCode && j.status === 'COMPLETED') {
        byLang[j.languageCode] = j;
      }
    });
    if (Object.keys(byLang).length > 0) {
      setRenderedJobsByLang(prev => ({ ...prev, ...byLang }));
    }
    if (project.exportBundle?.status === 'READY') {
      setBundleReady(true);
    }
  }, [project.id, project.exportJobs, project.exportBundle]);
  const totalDuration = project.durationSeconds && project.durationSeconds > 10 ? project.durationSeconds : 213;

  const currentOutput = project.localizedOutputs[selectedLanguage];
  const englishOutput = project.localizedOutputs.en;
  const scenes =
    currentOutput?.scenes && currentOutput.scenes.length > 0
      ? currentOutput.scenes
      : project.scenes;

  // Determine active scene based on currentTime
  const matchedSceneIdx = scenes.findIndex(
    s => currentTime >= s.startTime && currentTime < s.endTime
  );
  const currentSceneIndex = Math.min(
    scenes.length - 1,
    Math.max(0, matchedSceneIdx === -1 ? 0 : matchedSceneIdx)
  );
  const currentScene = scenes[currentSceneIndex] || scenes[0];

  const activeMotionPreset =
    currentScene?.motionPreset || getDefaultMotionPresetForIndex(currentSceneIndex);
  const activeMotionCssClass = getMotionPresetCssClass(activeMotionPreset, currentSceneIndex);
  const activeMotionMeta =
    CINEMATIC_MOTION_PRESETS.find(m => m.id === activeMotionPreset) ||
    CINEMATIC_MOTION_PRESETS[0];

  const activeTransitionPreset =
    currentScene?.transitionPreset || getDefaultTransitionPresetForIndex(currentSceneIndex);
  const activeTransitionCssClass = getSceneTransitionCssClass(
    activeTransitionPreset,
    currentSceneIndex
  );
  const activeTransitionOutCssClass = getSceneTransitionOutCssClass(
    activeTransitionPreset,
    currentSceneIndex
  );
  const activeTransitionMeta =
    SCENE_TRANSITION_PRESETS.find(t => t.id === activeTransitionPreset) ||
    SCENE_TRANSITION_PRESETS[0];

  const playerVisualFilterId =
    currentScene?.visualFilterPreset && currentScene.visualFilterPreset !== 'default'
      ? currentScene.visualFilterPreset
      : mapEmotionToVisualFilter(currentScene?.emotion, currentScene?.emotionalTone);
  const playerFilterMeta =
    VISUAL_FILTER_PRESETS.find(f => f.id === playerVisualFilterId) || VISUAL_FILTER_PRESETS[0];

  const playerMotionIntensity = currentScene?.motionIntensity ?? 1.0;
  const playerSceneDuration =
    currentScene?.duration ||
    (currentScene ? Math.max(2, Math.round(currentScene.endTime - currentScene.startTime)) : 8) ||
    8;
  const playerMotionDuration = currentScene?.motionDurationSec ?? playerSceneDuration;
  const playerEffectiveMotionDuration = Math.max(
    1.5,
    Math.min(25, playerMotionDuration / playerMotionIntensity)
  );

  const prevSceneIndexRef = useRef<number>(currentSceneIndex);
  const [outgoingScene, setOutgoingScene] = useState<typeof currentScene | null>(null);

  useEffect(() => {
    if (prevSceneIndexRef.current !== currentSceneIndex) {
      const prevSc = scenes[prevSceneIndexRef.current];
      if (prevSc) {
        setOutgoingScene(prevSc);
        const dur = currentScene?.transitionDurationMs || 850;
        const timer = setTimeout(() => setOutgoingScene(null), dur);
        prevSceneIndexRef.current = currentSceneIndex;
        return () => clearTimeout(timer);
      }
      prevSceneIndexRef.current = currentSceneIndex;
    }
  }, [currentSceneIndex, scenes, currentScene]);

  const activeCharacter = extractCharacterFromTranscript(
    currentScene?.dialogue,
    currentScene?.summary,
    currentSceneIndex,
    characterConsistency?.enabled
      ? characterConsistency
      : currentScene?.characterPrompt || currentScene?.visualDescription
  );

  // Determine active localized subtitle text (always falls back to current scene's segment so translation is never blank)
  const currentSubtitle =
    currentOutput?.translationSegments.find(
      s => currentTime >= s.start && currentTime <= s.end
    ) ||
    currentOutput?.translationSegments[
      currentSceneIndex % Math.max(1, currentOutput?.translationSegments.length || 1)
    ];

  const englishFallbackSeg =
    englishOutput?.translationSegments[
      currentSceneIndex % Math.max(1, englishOutput?.translationSegments.length || 1)
    ];

  const lastSpokenSubId = useRef<number | null>(null);
  const isPlayingRef = useRef<boolean>(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Preload & cache human voiceovers for current and upcoming scenes so playback has 0ms delay
  useEffect(() => {
    const segs = currentOutput?.translationSegments || [];
    if (segs.length === 0) return;

    const upcomingTexts: string[] = [];
    for (let offset = 0; offset < Math.min(6, segs.length); offset++) {
      const idx = (currentSceneIndex + offset) % segs.length;
      if (segs[idx]?.text) {
        upcomingTexts.push(segs[idx].text);
      }
    }
    preloadSceneVoiceovers(upcomingTexts, selectedLanguage, selectedVoicePersona);
  }, [project.id, selectedLanguage, selectedVoicePersona, currentSceneIndex, currentOutput]);

  const triggerSceneVoiceover = (
    text: string,
    langCode: LanguageCode,
    englishFallback?: string,
    personaOverride?: string,
    autoAdvanceSceneIdx?: number
  ) => {
    if (isMuted || !text) return;

    // Immediately pre-buffer the next scene in the background while speaking current scene
    const segs = project.localizedOutputs[langCode]?.translationSegments || [];
    const nextIdx = (typeof autoAdvanceSceneIdx === 'number' ? autoAdvanceSceneIdx : currentSceneIndex) + 1;
    if (nextIdx < scenes.length && segs[nextIdx]?.text) {
      fetchAndCacheVoiceoverBlobUrl(
        segs[nextIdx].text,
        langCode,
        personaOverride || selectedVoicePersona
      );
    }

    const activeSeg =
      segs[typeof autoAdvanceSceneIdx === 'number' ? autoAdvanceSceneIdx : currentSceneIndex] ||
      currentSubtitle;

    speakLocalizedText({
      text,
      langCode,
      rate: playbackSpeed,
      muted: isMuted,
      voicePersona: personaOverride || selectedVoicePersona,
      latencyOffsetMs: activeSeg?.latencyOffsetMs || 0,
      prosody: kokoroProsody,
      fallbackEnglishText: englishFallback,
      onStart: () => setIsSpeakingVoiceover(true),
      onEnd: () => {
        setIsSpeakingVoiceover(false);
        // If playing full video, automatically advance to the next scene as soon as human speech finishes
        if (isPlayingRef.current && typeof autoAdvanceSceneIdx === 'number') {
          const nextSceneIndex = autoAdvanceSceneIdx + 1;
          if (nextSceneIndex < scenes.length) {
            setTimeout(() => {
              if (!isPlayingRef.current) return;
              const nextScene = scenes[nextSceneIndex];
              if (nextScene) {
                setCurrentTime(nextScene.startTime + 0.05);
              }
            }, 250);
          } else {
            setIsPlaying(false);
            lastSpokenSubId.current = null;
            setCurrentTime(0);
          }
        }
      }
    });
  };

  // Jump to specific scene with immediate localized voiceover preview
  const jumpToScene = (sceneIndex: number, previewAudio: boolean = true) => {
    const clampedIdx = Math.max(0, Math.min(scenes.length - 1, sceneIndex));
    const targetScene = scenes[clampedIdx];
    if (targetScene) {
      setCurrentTime(targetScene.startTime);
      lastSpokenSubId.current = null;
      if (previewAudio && currentOutput) {
        const sub =
          currentOutput.translationSegments.find(
            s => targetScene.startTime >= s.start && targetScene.startTime <= s.end
          ) || currentOutput.translationSegments[clampedIdx];
        const enSub = englishOutput?.translationSegments[clampedIdx];
        const textToSpeak = sub?.text || targetScene.dialogue;
        if (textToSpeak) {
          triggerSceneVoiceover(textToSpeak, selectedLanguage, enSub?.text || targetScene.summary);
        }
      }
    }
  };

  const jumpToPrevScene = () => {
    jumpToScene(currentSceneIndex - 1);
  };

  const jumpToNextScene = () => {
    jumpToScene(currentSceneIndex + 1);
  };

  // Check if project has a valid YouTube source
  const youtubeVideoId =
    project.sourceType === 'youtube' && project.sourceUrl
      ? extractYouTubeId(project.sourceUrl)
      : null;

  // Playback timer loop with configurable speed
  useEffect(() => {
    if (isPlaying) {
      let lastTime = performance.now();
      const updateLoop = (now: number) => {
        const delta = (now - lastTime) / 1000;
        lastTime = now;
        setCurrentTime(prev => {
          const next = prev + delta * playbackSpeed;
          if (next >= totalDuration) {
            setIsPlaying(false);
            lastSpokenSubId.current = null;
            return 0;
          }
          return next;
        });
        animationFrameRef.current = requestAnimationFrame(updateLoop);
      };
      animationFrameRef.current = requestAnimationFrame(updateLoop);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      stopVoiceover();
      setIsSpeakingVoiceover(false);
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, totalDuration, playbackSpeed]);

  // Trigger localized speech when active scene/subtitle or language changes during full-video playback
  useEffect(() => {
    if (isPlaying && currentSubtitle && currentSubtitle.id !== lastSpokenSubId.current) {
      lastSpokenSubId.current = currentSubtitle.id;
      triggerSceneVoiceover(
        currentSubtitle.text,
        selectedLanguage,
        englishFallbackSeg?.text || currentScene?.summary,
        selectedVoicePersona,
        currentSceneIndex
      );
    }
  }, [isPlaying, currentSubtitle, selectedLanguage, currentSceneIndex]);

  // Download SRT
  const handleDownloadSrt = () => {
    if (!currentOutput) return;
    const blob = new Blob([currentOutput.subtitlesSrt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.id}_${selectedLanguage}.srt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download VTT
  const handleDownloadVtt = () => {
    if (!currentOutput) return;
    const blob = new Blob([currentOutput.subtitlesVtt], { type: 'text/vtt;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.id}_${selectedLanguage}.vtt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download synthesized human neural voiceover audio
  const handleDownloadVoiceoverWav = async () => {
    const fullText =
      currentSubtitle?.text ||
      (currentOutput?.translationSegments || []).map(s => s.text).join(' ') ||
      project.name;
    await downloadNeuralVoiceoverAudio(
      fullText,
      selectedLanguage,
      `${project.id}_${selectedLanguage}_human_voiceover.mp3`,
      selectedVoicePersona
    );
  };

  // Download complete bilingual script & transcript
  const handleDownloadScript = () => {
    const langName = SUPPORTED_LANGUAGES[selectedLanguage]?.name || selectedLanguage;
    const lines = [
      `================================================================================`,
      `AI VIDEO LOCALIZATION SCRIPT & TRANSCRIPT`,
      `PROJECT: ${project.name}`,
      `PROJECT ID: ${project.id}`,
      `SOURCE URL: ${project.sourceUrl || 'YouTube Ingested'}`,
      `DETECTED SOURCE LANGUAGE: ${project.detectedLanguage?.toUpperCase() || 'EN'}`,
      `LOCALIZED TARGET LANGUAGE: ${langName} (${SUPPORTED_LANGUAGES[selectedLanguage]?.nativeName || ''})`,
      `TOTAL RUNTIME: ${project.durationSeconds}s | RESOLUTION: ${project.resolution.toUpperCase()}`,
      `CHARACTER CONSISTENCY PROMPT: ${characterConsistency?.compiledPrompt || 'Auto-Transcript'}`,
      `GENERATED AT: ${new Date().toISOString()}`,
      `================================================================================\n`,
      `--- PART 1: 4K CINEMATIC STORYBOARD SCENES, MOTION PRESETS & VISUAL PROMPTS ---`,
      ...project.scenes.map(
        sc =>
          `[SCENE 0${sc.sceneNumber}] (${sc.startTime}s - ${sc.endTime}s) | Motion Preset: ${(sc.motionPreset || 'pan').toUpperCase()}\n` +
          `• Summary: ${sc.summary}\n` +
          `• Prepended Visual Prompt: ${sc.visualDescription || sc.prompt}\n` +
          `• Camera: ${sc.camera} | Lighting: ${sc.lighting}\n` +
          `• Spoken Dialogue: "${sc.dialogue}"\n`
      ),
      `\n--- PART 2: SYNCHRONIZED LOCALIZED DIALOGUE SCRIPT (${langName}) ---`,
      ...(currentOutput?.translationSegments || []).map(
        seg => `[${seg.start.toFixed(1)}s -> ${seg.end.toFixed(1)}s] ${seg.text}`
      ),
      `\n--- PART 3: ORIGINAL SOURCE TRANSCRIPT ---`,
      ...project.cleanTranscript.map(
        seg => `[${seg.start.toFixed(1)}s -> ${seg.end.toFixed(1)}s] ${seg.text}`
      )
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.id}_${selectedLanguage}_full_script.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [isExportingVideo, setIsExportingVideo] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Consolidated, truthful FFmpeg + ffprobe verified MP4 video export
  const handleExportWebmVideo = async () => {
    setIsExportingVideo(true);
    setExportProgress(10);
    setExportErrorMsg(null);
    setLastExportSummary(null);
    try {
      const job = await exportFullLanguageWebmVideo({
        project,
        langCode: selectedLanguage,
        mode: 'storyboard_render',
        resolution: project.resolution || '1080p',
        burnInSubtitles: true,
        voicePersona: selectedVoicePersona,
        prosody: kokoroProsody,
        characterConsistency,
        autoDownload: true,
        onProgress: pct => setExportProgress(pct)
      });
      setRenderedJobsByLang(prev => ({ ...prev, [selectedLanguage]: job }));
      if (job.ffprobeValidation) {
        const v = job.ffprobeValidation;
        setLastExportSummary(
          `Verified ${SUPPORTED_LANGUAGES[selectedLanguage]?.name} ${v.width}x${v.height} MP4 (${v.durationSeconds}s · ${v.videoCodec}/${v.audioCodec} · ${Math.round(
            v.fileSizeBytes / 1024
          )} KB)`
        );
      }
    } catch (err: any) {
      setExportErrorMsg(err?.message || 'FFmpeg video export failed.');
    } finally {
      setIsExportingVideo(false);
      setExportProgress(0);
    }
  };

  // Process and bundle end videos (.MP4) across all selected languages so every language is ready & bundled in .ZIP
  const handleRenderAll12LanguageVideos = async (autoDownloadZip = false) => {
    if (isBatchRenderingAllLangs || isExportingVideo || project.scenes.length === 0) return;
    setIsBatchRenderingAllLangs(true);
    setIsBundlingArchive(true);
    setBatchCompletedLangCount(0);
    setExportErrorMsg(null);

    try {
      const result = await processAndBundleAllLanguageVideos({
        project,
        languages: selectedLanguages,
        resolution: '720p',
        voicePersona: selectedVoicePersona,
        autoDownloadBundle: autoDownloadZip,
        onLanguageStart: code => {
          setExportingLangCode(code);
          setExportLangPct(15);
        },
        onLanguageProgress: (_code, pct) => {
          setExportLangPct(pct);
        },
        onLanguageComplete: (code, job, completedCount) => {
          setRenderedJobsByLang(prev => ({ ...prev, [code]: job }));
          setBatchCompletedLangCount(completedCount);
        }
      });

      setRenderedJobsByLang(prev => ({ ...prev, ...result.jobs }));
      setBundleReady(true);
      if (result.project) {
        onUpdateProject?.(result.project);
      }
      setLastExportSummary(
        result.exportBundle?.message ||
          `Processed & bundled end videos (.MP4 + .ZIP) for all ${selectedLanguages.length} selected languages! Click any language below to watch or download.`
      );
    } catch (err: any) {
      setExportErrorMsg(
        err?.message || 'Failed processing and bundling all selected language video outputs.'
      );
    } finally {
      setExportingLangCode(null);
      setExportLangPct(0);
      setIsBatchRenderingAllLangs(false);
      setIsBundlingArchive(false);
    }
  };

  // Automatically process and bundle all generated video outputs for every selected language when the 'Export' workflow step is reached
  useEffect(() => {
    if (activeWorkflowStep !== 'export') return;
    if (!project.scenes || project.scenes.length === 0 || project.status === 'RUNNING') return;

    const signature = `${project.id}::${selectedLanguages.join(',')}::${project.scenes.length}`;
    if (autoExportStepSignatureRef.current === signature) return;
    autoExportStepSignatureRef.current = signature;

    handleRenderAll12LanguageVideos(false);
  }, [activeWorkflowStep, project.id, project.scenes.length, project.status, selectedLanguages.join(',')]);

  const handleDownloadVideo = () => {
    if (!currentOutput) return;
    const videoBundle = {
      project: project.name,
      id: project.id,
      sourceUrl: project.sourceUrl,
      sourceLanguage: project.sourceLanguage,
      detectedLanguage: project.detectedLanguage,
      targetLanguage: selectedLanguage,
      resolution: project.resolution,
      durationSeconds: project.durationSeconds,
      characterConsistency: characterConsistency,
      specs: {
        dimensions: '3840x2160',
        framerate: '30fps',
        codec: 'h.264 / AAC 48kHz',
        motionProfile: 'Ken Burns procedural drift'
      },
      scenes: project.scenes,
      subtitles: {
        srt: currentOutput.subtitlesSrt,
        vtt: currentOutput.subtitlesVtt
      },
      exportTimestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(videoBundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.id}_${selectedLanguage}_4K_video_spec.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mb-8 shadow-xl">
      {/* Top Header: View Switcher (Localized 4K vs Original YouTube Source) & Language Selector */}
      <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Mode Switcher */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-900 border border-slate-800 rounded-lg text-xs">
            <button
              onClick={() => {
                setPlayerMode('localized');
                setIsPlaying(false);
              }}
              className={`px-3 py-1 font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                playerMode === 'localized'
                  ? 'bg-amber-400 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MonitorPlay className="w-3.5 h-3.5" />
              <span>Localized 4K Render</span>
            </button>

            {renderedJobsByLang[selectedLanguage]?.downloadUrl && (
              <button
                onClick={() => {
                  setPlayerMode('rendered_mp4');
                  setIsPlaying(false);
                }}
                className={`px-3 py-1 font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                  playerMode === 'rendered_mp4'
                    ? 'bg-emerald-400 text-slate-950 font-bold'
                    : 'text-emerald-300 hover:text-white'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>
                  Watch Rendered {SUPPORTED_LANGUAGES[selectedLanguage]?.name} .MP4
                </span>
              </button>
            )}

            {youtubeVideoId && (
              <button
                onClick={() => {
                  setPlayerMode('youtube_source');
                  setIsPlaying(false);
                }}
                className={`px-3 py-1 font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                  playerMode === 'youtube_source'
                    ? 'bg-red-500 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Youtube className="w-3.5 h-3.5" />
                <span>Source YouTube Video</span>
              </button>
            )}
          </div>
        </div>

        {/* Localized Language Pill Strip (All 12 Languages with Instant Pre-Buffered Voiceover) */}
        {playerMode === 'localized' && (
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full">
            <span className="text-[11px] text-slate-400 font-medium shrink-0 flex items-center gap-1">
              <Globe className="w-3 h-3 text-amber-400" />
              12-Language Instant Human Voiceover:
            </span>
            {INITIAL_11_LANGUAGES.map(code => {
              const isSelected = selectedLanguage === code;
              const lang = SUPPORTED_LANGUAGES[code];
              return (
                <button
                  key={code}
                  onMouseEnter={() => {
                    // Pre-buffer hovered language segment so clicking it has 0ms latency
                    const hoverOutput = project.localizedOutputs[code];
                    const hoverSeg =
                      hoverOutput?.translationSegments[
                        currentSceneIndex % Math.max(1, hoverOutput?.translationSegments.length || 1)
                      ];
                    if (hoverSeg?.text) {
                      fetchAndCacheVoiceoverBlobUrl(hoverSeg.text, code, selectedVoicePersona);
                    }
                  }}
                  onClick={() => {
                    onSelectLanguage(code);
                    lastSpokenSubId.current = null;
                    const newLangOutput = project.localizedOutputs[code];
                    const seg =
                      newLangOutput?.translationSegments[
                        currentSceneIndex % Math.max(1, newLangOutput?.translationSegments.length || 1)
                      ];
                    if (seg?.text) {
                      triggerSceneVoiceover(
                        seg.text,
                        code,
                        englishFallbackSeg?.text || currentScene?.summary,
                        selectedVoicePersona,
                        currentSceneIndex
                      );
                    }
                  }}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <span>{lang?.flag}</span>
                  <span>{lang?.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Transcript -> Persistent Character -> 4K Motion -> Voiceover Live Bar */}
      {playerMode === 'localized' && currentScene && (
        <div className="bg-slate-900/95 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono font-bold text-[11px]">
              1. CHARACTER: {activeCharacter.name} ({activeCharacter.isConsistentLock ? 'Consistency Lock' : 'Auto'})
            </span>
            <span className="text-slate-600">➔</span>
            <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono text-[11px]">
              2. MOTION &amp; TRANSITION: {activeMotionMeta.shortLabel} + {activeTransitionMeta.shortLabel}
            </span>
            <span className="text-slate-600">➔</span>
            <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono text-[11px]">
              3. HUMAN VOICEOVER: {SUPPORTED_LANGUAGES[selectedLanguage]?.name} ({SUPPORTED_LANGUAGES[selectedLanguage]?.nativeName})
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Inline Kokoro-82M Emotive Prosody Slider */}
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] font-mono">
              <span className="text-amber-300 font-semibold">Kokoro Emotive α:</span>
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
                className="w-16 accent-amber-400 cursor-pointer"
                title="Kokoro-82M Prosody & Emotive Depth (style_weight alpha)"
              />
              <span className="text-amber-400 font-bold">
                {kokoroProsody.styleWeightAlpha.toFixed(2)}
              </span>
            </div>

            <select
              value={selectedVoicePersona}
              onChange={e => {
                const nextPersona = e.target.value;
                setSelectedVoicePersona(nextPersona);
                const textToSpeak =
                  currentSubtitle?.text || currentScene.dialogue || currentScene.summary;
                if (textToSpeak) {
                  triggerSceneVoiceover(
                    textToSpeak,
                    selectedLanguage,
                    englishFallbackSeg?.text || currentScene.summary,
                    nextPersona
                  );
                }
              }}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-[11px] rounded-lg px-2 py-1 font-mono focus:outline-none focus:border-amber-400 cursor-pointer"
              title="Select Human Neural Voice Persona"
            >
              {HUMAN_VOICE_PERSONAS.map(p => (
                <option key={p.id} value={p.id}>
                  Voice: {p.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                setIsPlaying(true);
                const textToSpeak =
                  currentSubtitle?.text || currentScene.dialogue || currentScene.summary;
                if (textToSpeak) {
                  triggerSceneVoiceover(
                    textToSpeak,
                    selectedLanguage,
                    englishFallbackSeg?.text || currentScene.summary
                  );
                }
              }}
              className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <Volume2 className={`w-3.5 h-3.5 ${isSpeakingVoiceover ? 'animate-bounce' : ''}`} />
              <span>
                {isSpeakingVoiceover
                  ? `Speaking ${SUPPORTED_LANGUAGES[selectedLanguage]?.name}...`
                  : 'Play Character Motion & Human Voiceover'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Main Viewport */}
      {playerMode === 'rendered_mp4' && renderedJobsByLang[selectedLanguage]?.downloadUrl ? (
        <div className="relative aspect-video w-full bg-black flex flex-col items-center justify-center">
          <video
            key={renderedJobsByLang[selectedLanguage]?.downloadUrl}
            src={renderedJobsByLang[selectedLanguage]?.downloadUrl}
            controls
            autoPlay
            className="w-full h-full object-contain bg-black"
          />
          <div className="absolute top-3 left-4 bg-black/80 backdrop-blur-md px-3 py-1 rounded-lg border border-emerald-400/40 text-xs font-mono text-emerald-300 flex items-center gap-2 pointer-events-none">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              Playing Rendered {SUPPORTED_LANGUAGES[selectedLanguage]?.name} (
              {SUPPORTED_LANGUAGES[selectedLanguage]?.nativeName}) End Video (.MP4)
            </span>
          </div>
        </div>
      ) : playerMode === 'youtube_source' && youtubeVideoId ? (
        <div className="relative aspect-video w-full bg-black flex items-center justify-center">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=0&enablejsapi=1`}
            title="Original YouTube Source"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
          />
        </div>
      ) : (
        <div className="relative aspect-video w-full bg-black overflow-hidden flex items-center justify-center select-none">
          {/* Background Rendered Frame with Mapped 4K Camera Motion Preset & Scene Transition */}
          {currentScene?.imageUrl ? (
            <div
              className="relative w-full h-full overflow-hidden"
              style={
                {
                  '--scene-transition-duration': `${currentScene.transitionDurationMs || 850}ms`
                } as React.CSSProperties
              }
            >
              {outgoingScene?.imageUrl && (
                <div
                  key={`scene-out-${outgoingScene.id}`}
                  className={`absolute inset-0 w-full h-full overflow-hidden ${activeTransitionOutCssClass}`}
                >
                  <img
                    src={outgoingScene.imageUrl}
                    alt={outgoingScene.summary}
                    referrerPolicy="no-referrer"
                    className={`w-full h-full object-cover ${activeMotionCssClass}`}
                  />
                </div>
              )}

              {/* Outer div handles Scene Transition; inner div + img handle Continuous 60fps 3D Camera Motion + Character Speaking Articulation */}
              <div
                key={`scene-transition-wrap-${currentScene.id || currentSceneIndex}-${activeTransitionPreset}`}
                className={`relative w-full h-full overflow-hidden ${activeTransitionCssClass}`}
              >
                <div
                  className={`w-full h-full ${
                    isSpeakingVoiceover || isPlaying ? 'character-speaking-active' : ''
                  }`}
                >
                  <img
                    key={`scene-motion-${currentScene.id || currentSceneIndex}-${activeMotionPreset}-${playerVisualFilterId}-${playerMotionIntensity}`}
                    src={currentScene.imageUrl}
                    alt={currentScene.summary}
                    referrerPolicy="no-referrer"
                    className={`w-full h-full object-cover ${activeMotionCssClass}`}
                    style={
                      {
                        filter: playerFilterMeta.cssFilter,
                        objectPosition: 'center center',
                        '--scene-motion-duration': `${playerEffectiveMotionDuration}s`,
                        '--scene-motion-intensity': `${playerMotionIntensity}`
                      } as React.CSSProperties
                    }
                  />
                </div>
              </div>

              {/* Real-Time 60fps Transcript-Driven Cinema Movie FX & Parallax Canvas */}
              <CinemaMovieCanvasOverlay
                archetype={activeCharacter.archetype}
                motionPreset={activeMotionPreset}
                isSpeakingOrPlaying={isSpeakingVoiceover || isPlaying}
                sceneNumber={currentScene.sceneNumber || currentSceneIndex + 1}
                totalScenes={scenes.length}
                anamorphicScope={true}
              />

              {/* Animated 4K Anamorphic Lens Flare Sweep */}
              <div className="absolute inset-y-0 w-1/3 pointer-events-none bg-gradient-to-r from-transparent via-amber-300/15 to-transparent anamorphic-flare-pass z-10" />

              {/* 2.39:1 Anamorphic Widescreen Cinema Scope Letterbox Bars */}
              <div className="absolute top-0 inset-x-0 h-5 sm:h-7 bg-black/95 border-b border-amber-400/20 pointer-events-none z-10 flex items-center justify-between px-4 text-[10px] font-mono text-slate-400">
                <span className="text-amber-400 font-bold flex items-center gap-1.5 flex-wrap">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span>4K ANAMORPHIC 2.39:1 MOVIE STREAM · {activeMotionMeta.lensSpec}</span>
                  {currentScene?.emotion && (
                    <span className="ml-1.5 px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[9px] font-mono font-bold uppercase flex items-center gap-1">
                      <span>🎭</span>
                      <span>{currentScene.emotion}</span>
                    </span>
                  )}
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border ${playerFilterMeta.badgeBg}`}>
                    {playerFilterMeta.label.toUpperCase()}
                  </span>
                </span>
                <span className="hidden sm:inline text-cyan-300">
                  CAMERA RIG: {activeMotionMeta.label.toUpperCase()} ({playerMotionIntensity.toFixed(1)}x) · TRANSITION: {activeTransitionMeta.shortLabel}
                </span>
                <span className="text-emerald-400 tabular-nums">
                  TC {formatPlayerTime(currentTime)}:{String(Math.floor((currentTime % 1) * 24)).padStart(2, '0')} / 24FPS
                </span>
              </div>

              {/* Live Scrolling Transcript & Storyboard News/Cinema Ticker Bar */}
              <div className="absolute bottom-11 inset-x-0 h-6 bg-slate-950/90 backdrop-blur-md border-y border-amber-400/30 pointer-events-none z-10 flex items-center overflow-hidden">
                <span className="px-2.5 h-full bg-amber-400 text-slate-950 font-mono font-extrabold text-[10px] flex items-center shrink-0 uppercase tracking-wider z-20">
                  SCENE {String(currentSceneIndex + 1).padStart(2, '0')} LIVE SCRIPT
                </span>
                <div className="cinema-ticker-track text-[11px] font-mono text-amber-200 pl-4">
                  <span className="mx-6">
                    [{SUPPORTED_LANGUAGES[selectedLanguage]?.name.toUpperCase()} · {activeCharacter.name}]: {currentSubtitle?.text || currentScene.dialogue}
                  </span>
                  <span className="mx-6 text-cyan-300">
                    [STORYBOARD CAMERA]: {currentScene.summary} — {activeMotionMeta.cameraDescription}
                  </span>
                  <span className="mx-6">
                    [{SUPPORTED_LANGUAGES[selectedLanguage]?.name.toUpperCase()} · {activeCharacter.name}]: {currentSubtitle?.text || currentScene.dialogue}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center text-slate-500">
              <span className="text-sm">Synthesizing 4K Ken Burns Video Stream...</span>
            </div>
          )}

          {/* Cinematic Scrim Vignette */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/85 via-transparent to-black/30" />

          {/* Photorealistic 4K Human Character Cast & Live Voiceover Waveform HUD */}
          {currentScene && (
            <div className="absolute bottom-28 left-6 pointer-events-none hidden sm:flex items-center gap-3 px-3.5 py-2 rounded-xl bg-slate-950/85 backdrop-blur-md border border-amber-400/30 shadow-2xl">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-[10px] font-mono font-bold text-emerald-300 uppercase tracking-wider">
                    4K PHOTOREALISTIC HUMAN CAST · {activeCharacter.isConsistentLock ? 'CONSISTENCY LOCKED' : 'TRANSCRIPT MATCHED'}
                  </span>
                </div>
                <span className="text-xs font-bold text-white mt-0.5">
                  {activeCharacter.name}
                </span>
                <span className="text-[10px] text-slate-300 font-mono">
                  {activeCharacter.role} · {activeCharacter.attire}
                </span>
              </div>

              {/* Acoustic Lip-Sync Waveform Bars */}
              <div className="flex items-end gap-0.5 h-6 pl-2 border-l border-slate-700/80">
                {[0.5, 0.9, 0.65, 1.0, 0.75, 0.45, 0.85].map((h, i) => (
                  <span
                    key={i}
                    className={`w-1 rounded-full bg-amber-400 transition-all duration-150 ${
                      isSpeakingVoiceover || isPlaying ? 'animate-pulse' : 'opacity-40'
                    }`}
                    style={{
                      height: isSpeakingVoiceover || isPlaying ? `${Math.round(h * 22)}px` : '6px',
                      animationDelay: `${i * 90}ms`
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Top Overlay Badges */}
          <div className="absolute top-8 left-4 right-4 flex items-center justify-between text-xs font-mono pointer-events-none z-20">
            <div className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded text-slate-300 border border-white/10 flex items-center gap-1.5">
              <span>{project.resolution.toUpperCase()}</span>
              <span className="text-slate-500">·</span>
              <span>
                Scene {String(currentSceneIndex + 1).padStart(2, '0')}/
                {String(scenes.length).padStart(2, '0')}
              </span>
              <span className="text-slate-500">·</span>
              <span className="text-cyan-300 font-bold">{activeMotionMeta.shortLabel}</span>
              <span className="text-slate-500">·</span>
              <span className="text-amber-400 font-bold">
                {SUPPORTED_LANGUAGES[selectedLanguage]?.name} (
                {SUPPORTED_LANGUAGES[selectedLanguage]?.nativeName})
              </span>
              <span className="text-slate-500">·</span>
              <span className="text-emerald-400 font-medium">
                Runtime: {formatPlayerTime(totalDuration)}
              </span>
            </div>

            <div className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded text-emerald-400 border border-white/10 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {isSpeakingVoiceover
                  ? `Speaking (${ttsTelemetry.label})`
                  : `TTS Provider: ${ttsTelemetry.label}`}
              </span>
            </div>
          </div>

          {/* Localized Subtitles Overlay */}
          {currentSubtitle && (
            <div className="absolute bottom-20 left-6 right-6 text-center pointer-events-none px-4 z-20">
              <span
                className="inline-block px-4 py-2 rounded-lg bg-black/85 backdrop-blur-sm text-amber-300 text-sm md:text-base lg:text-lg font-medium tracking-wide shadow-2xl border border-amber-400/25"
                style={{ textWrap: 'balance' }}
              >
                {currentSubtitle.text}
              </span>
            </div>
          )}

          {/* Non-blocking Live Processing Pipeline Banner when project is RUNNING (never hides the 4K scenes) */}
          {project.status === 'RUNNING' && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex items-center gap-3 px-4 py-2 rounded-full bg-slate-950/90 backdrop-blur-md border border-amber-400/40 shadow-2xl">
              <Sparkles className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
              <span className="text-xs font-mono text-amber-300 font-semibold">
                {project.currentStage
                  ? `${project.currentStage.replace(/_/g, ' ')} (${Math.round(project.progress)}%)`
                  : `Synchronizing 12-Language Neural Stream (${Math.round(project.progress)}%)`}
              </span>
            </div>
          )}

          {/* Video Controls Bar */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 flex flex-col gap-2">
            {/* Progress Timeline Scrubber */}
            <div
              className="w-full bg-slate-700/60 h-1.5 rounded-full cursor-pointer relative overflow-hidden group hover:h-2 transition-all"
              onClick={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = (e.clientX - rect.left) / rect.width;
                setCurrentTime(pct * totalDuration);
                lastSpokenSubId.current = null;
              }}
            >
              <div
                className="bg-amber-400 h-full rounded-full transition-all"
                style={{ width: `${(currentTime / totalDuration) * 100}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-white">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={jumpToPrevScene}
                  disabled={currentSceneIndex <= 0}
                  className="p-1.5 hover:text-amber-400 disabled:opacity-40 transition-colors cursor-pointer"
                  title="Previous Chapter"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-1.5 hover:text-amber-400 transition-colors cursor-pointer"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 text-amber-400" />
                  ) : (
                    <Play className="w-5 h-5 fill-current" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={jumpToNextScene}
                  disabled={currentSceneIndex >= scenes.length - 1}
                  className="p-1.5 hover:text-amber-400 disabled:opacity-40 transition-colors cursor-pointer"
                  title="Next Chapter"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    setCurrentTime(0);
                    setIsPlaying(false);
                    lastSpokenSubId.current = null;
                  }}
                  className="p-1.5 hover:text-amber-400 transition-colors cursor-pointer"
                  title="Restart"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    const nextMuted = !isMuted;
                    setIsMuted(nextMuted);
                    if (nextMuted) {
                      stopVoiceover();
                      setIsSpeakingVoiceover(false);
                    }
                  }}
                  className="p-1.5 hover:text-amber-400 transition-colors cursor-pointer"
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 text-red-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                  )}
                </button>

                <span className="font-mono text-slate-300 tabular-nums">
                  {formatPlayerTime(currentTime)} / {formatPlayerTime(totalDuration)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Speed Controls */}
                <div className="flex items-center bg-slate-900/90 border border-slate-700/80 rounded-md p-0.5 text-[10px] font-mono">
                  <span className="text-slate-400 px-1 hidden sm:inline">Speed:</span>
                  {[1, 2, 5, 10].map(spd => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => setPlaybackSpeed(spd)}
                      className={`px-1.5 py-0.5 rounded transition-colors ${
                        playbackSpeed === spd
                          ? 'bg-amber-400 text-slate-950 font-bold'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>

                {/* Listen Voiceover Line Button */}
                <button
                  type="button"
                  onClick={() => {
                    const textToSpeak = currentSubtitle?.text || currentScene?.dialogue;
                    if (textToSpeak) {
                      triggerSceneVoiceover(
                        textToSpeak,
                        selectedLanguage,
                        englishFallbackSeg?.text || currentScene?.summary
                      );
                    }
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs transition-colors cursor-pointer"
                  title="Speak localized voiceover for current scene"
                >
                  <Volume2 className={`w-3.5 h-3.5 ${isSpeakingVoiceover ? 'animate-bounce' : ''}`} />
                  <span>{isSpeakingVoiceover ? 'Speaking...' : 'Listen Voiceover'}</span>
                </button>

                <button
                  onClick={onOpenQualityReport}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>QA Audit</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Storyboard Scene & Chapter Navigator Rail */}
      {playerMode === 'localized' && scenes && scenes.length > 0 && (
        <div className="bg-slate-950 px-4 py-3 border-t border-slate-800">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-white tracking-wide">
                Storyboard Chapter Flow ({scenes.length} Scenes · {formatPlayerTime(totalDuration)})
              </span>
              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                Click any chapter to jump and preview visuals &amp; localized voiceover
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={jumpToPrevScene}
                disabled={currentSceneIndex <= 0}
                className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
                title="Previous Scene"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono text-amber-400 px-1.5">
                {currentSceneIndex + 1}/{scenes.length}
              </span>
              <button
                type="button"
                onClick={jumpToNextScene}
                disabled={currentSceneIndex >= scenes.length - 1}
                className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
                title="Next Scene"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin">
            {scenes.map((sc, idx) => {
              const isActive = idx === currentSceneIndex;
              const scMotionClass = getMotionPresetCssClass(sc.motionPreset, idx);
              const scChar = extractCharacterFromTranscript(
                sc.dialogue,
                sc.summary,
                idx,
                characterConsistency?.enabled
                  ? characterConsistency
                  : sc.characterPrompt || sc.visualDescription
              );
              return (
                <button
                  key={sc.id || idx}
                  type="button"
                  onClick={() => jumpToScene(idx)}
                  className={`group relative shrink-0 w-36 sm:w-44 text-left p-2 rounded-xl border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-500/10 border-amber-400 shadow-md ring-1 ring-amber-400/40'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="relative aspect-video w-full rounded-lg overflow-hidden mb-1.5 bg-slate-950 border border-slate-800">
                    {sc.imageUrl ? (
                      <img
                        src={sc.imageUrl}
                        alt={sc.summary}
                        className={`w-full h-full object-cover ${scMotionClass}`}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500">
                        Frame {String(sc.sceneNumber).padStart(2, '0')}
                      </div>
                    )}
                    <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded text-[9px] font-mono bg-black/70 text-slate-300">
                      {formatPlayerTime(sc.startTime)}
                    </span>
                    {isActive && (
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-amber-400 text-slate-950">
                        ACTIVE
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-0.5">
                    <span className={isActive ? 'text-amber-400 font-bold' : ''}>
                      Scene {String(sc.sceneNumber).padStart(2, '0')}
                    </span>
                    <span className="text-cyan-300 uppercase">
                      {sc.motionPreset || getDefaultMotionPresetForIndex(idx)}
                    </span>
                  </div>

                  <div
                    className={`text-[11px] font-medium line-clamp-1 ${
                      isActive ? 'text-white font-semibold' : 'text-slate-300'
                    }`}
                  >
                    {sc.summary}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-mono truncate mt-0.5">
                    Cast: {scChar.name}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Asset Download & Action Tray for Currently Selected Language */}
      <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-white block">
            {SUPPORTED_LANGUAGES[selectedLanguage]?.name} Package (
            {SUPPORTED_LANGUAGES[selectedLanguage]?.nativeName}) · Full Length (
            {formatPlayerTime(totalDuration)})
          </span>
          <span className="text-[11px] text-slate-400">
            Native:{' '}
            <span className="text-slate-300 font-medium">
              {SUPPORTED_LANGUAGES[selectedLanguage]?.nativeName}
            </span>{' '}
            · Active TTS Provider:{' '}
            <span className="text-cyan-300 font-mono">{ttsTelemetry.label}</span> · QA Status:{' '}
            <span
              className={`font-medium font-mono ${
                currentOutput?.qaReport?.status === 'PASS'
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }`}
            >
              {currentOutput?.qaReport?.status || 'PASS'}
            </span>
          </span>
          {lastExportSummary && (
            <span className="text-[11px] font-mono text-emerald-300 block mt-0.5">
              {lastExportSummary}
            </span>
          )}
          {exportErrorMsg && (
            <span className="text-[11px] font-mono text-red-400 block mt-0.5">
              Export Error: {exportErrorMsg}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadVoiceoverWav}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors border border-emerald-500/30 cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Voiceover Audio (.wav)</span>
          </button>

          <button
            onClick={handleDownloadScript}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Script &amp; Storyboard (.txt)</span>
          </button>

          <button
            onClick={handleDownloadSrt}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>SRT Subtitles</span>
          </button>

          <button
            onClick={handleDownloadVtt}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>VTT Subtitles</span>
          </button>

          <button
            onClick={handleDownloadVideo}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>4K Spec Bundle (.json)</span>
          </button>

          <button
            onClick={handleExportWebmVideo}
            disabled={isExportingVideo}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 rounded-lg transition-colors cursor-pointer shadow-md"
          >
            {isExportingVideo ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>FFmpeg Rendering MP4... [{exportProgress}%]</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>
                  Download Full {SUPPORTED_LANGUAGES[selectedLanguage]?.name} Video (.MP4)
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Per-Language Full End Video & Synchronized Voiceover Studio (All Selected Languages) */}
      <div className="px-4 py-4 bg-slate-950 border-t border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-amber-400" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-white">
                  End Video &amp; Multi-Language Bundle Studio — {selectedLanguages.length} Selected Languages (.MP4 + .ZIP)
                </span>
                {bundleReady && (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold">
                    ALL {selectedLanguages.length} LANGUAGES PROCESSED &amp; BUNDLED
                  </span>
                )}
              </div>
              <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                Automatically processes and bundles all generated video outputs, SRT/VTT subtitles, and voiceovers for every selected language when the Export step is reached.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={isBatchRenderingAllLangs || exportingLangCode !== null || isExportingVideo || project.scenes.length === 0}
              onClick={() => handleRenderAll12LanguageVideos(false)}
              className="px-3.5 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-slate-950 font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
            >
              {isBatchRenderingAllLangs ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>
                    Processing &amp; Bundling ({batchCompletedLangCount}/
                    {selectedLanguages.length})...
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {bundleReady
                      ? `Re-Process & Bundle All ${selectedLanguages.length} Languages`
                      : `Process & Bundle All ${selectedLanguages.length} Language Videos (.MP4)`}
                  </span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isBundlingArchive || isBatchRenderingAllLangs || project.scenes.length === 0}
              onClick={async () => {
                if (onExportZip) {
                  onExportZip(project.id);
                  return;
                }
                setIsBundlingArchive(true);
                try {
                  await downloadProjectZipArchive(project);
                } catch (err: any) {
                  setExportErrorMsg(err?.message || 'Failed downloading multi-language ZIP bundle.');
                } finally {
                  setIsBundlingArchive(false);
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
              title="Download unified ZIP bundle containing all processed language MP4 videos, SRT/VTT subtitles, and voiceover audio"
            >
              <Download className="w-3.5 h-3.5" />
              <span>
                Download Multi-Language Video Bundle (.ZIP)
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {selectedLanguages.map(code => {
            const lang = SUPPORTED_LANGUAGES[code];
            const isExportingThisLang = exportingLangCode === code;
            const isCurr = selectedLanguage === code;
            const renderedJob = renderedJobsByLang[code];

            return (
              <div
                key={`dl-full-video-${code}`}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                  renderedJob
                    ? 'bg-emerald-950/25 border-emerald-500/40 text-white'
                    : isCurr
                    ? 'bg-amber-500/15 border-amber-400 text-white shadow-sm'
                    : 'bg-slate-900/90 border-slate-800 hover:border-amber-400/50 text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => onSelectLanguage(code)}
                    className="text-xs font-bold truncate hover:text-amber-300 cursor-pointer text-left"
                  >
                    {lang?.flag} {lang?.name}
                  </button>
                  {renderedJob ? (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-mono font-bold shrink-0">
                      {bundleReady ? 'BUNDLED' : 'READY'}
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                      {lang?.nativeName}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={exportingLangCode !== null || isExportingVideo || isBatchRenderingAllLangs}
                    onClick={async () => {
                      onSelectLanguage(code);
                      if (renderedJob?.downloadUrl) {
                        const a = document.createElement('a');
                        a.href = renderedJob.downloadUrl;
                        a.download = `${project.id}_${code}_end_video.mp4`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        return;
                      }
                      setExportingLangCode(code);
                      setExportLangPct(6);
                      setExportErrorMsg(null);
                      try {
                        const job = await exportFullLanguageWebmVideo({
                          project,
                          langCode: code,
                          mode: 'storyboard_render',
                          resolution: project.resolution || '1080p',
                          voicePersona: selectedVoicePersona,
                          prosody: kokoroProsody,
                          characterConsistency,
                          autoDownload: true,
                          onProgress: pct => setExportLangPct(pct)
                        });
                        setRenderedJobsByLang(prev => ({ ...prev, [code]: job }));
                      } catch (err: any) {
                        setExportErrorMsg(err?.message || `Failed exporting ${code} video`);
                      } finally {
                        setExportingLangCode(null);
                        setExportLangPct(0);
                      }
                    }}
                    className="flex-1 px-2 py-1 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/30 text-[10px] font-mono font-bold text-amber-300 flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {isExportingThisLang ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>{exportLangPct}%</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3 h-3" />
                        <span>{renderedJob ? 'Download .MP4' : 'Render .MP4'}</span>
                      </>
                    )}
                  </button>

                  {renderedJob?.downloadUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectLanguage(code);
                        setPlayerMode('rendered_mp4');
                        setIsPlaying(false);
                      }}
                      className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-[10px] font-mono font-bold text-emerald-300 flex items-center gap-1 cursor-pointer"
                      title="Watch rendered MP4 video in player"
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>Watch</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
