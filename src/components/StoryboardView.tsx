import React, { useState, useEffect } from 'react';
import {
  Scene,
  CinematicMotionPreset,
  SceneTransitionPreset,
  VisualFilterPreset,
  CharacterConsistencyConfig,
  LanguageCode,
  LocalizedOutput
} from '../types';
import {
  Camera,
  Sun,
  Sparkles,
  RefreshCw,
  Edit3,
  Image as ImageIcon,
  ZoomIn,
  X,
  UserCheck,
  Volume2,
  Film,
  Move,
  Globe,
  Layers,
  Play,
  ArrowRightLeft,
  CheckCircle2,
  XCircle,
  Lock,
  CheckSquare,
  Square,
  Sliders,
  Clock,
  Palette,
  RotateCcw
} from 'lucide-react';
import {
  generateSceneArtwork,
  extractCharacterFromTranscript,
  CINEMATIC_MOTION_PRESETS,
  getMotionPresetCssClass,
  getDefaultMotionPresetForIndex,
  SCENE_TRANSITION_PRESETS,
  getSceneTransitionCssClass,
  getSceneTransitionOutCssClass,
  getDefaultTransitionPresetForIndex,
  prependCharacterConsistencyToPrompt,
  DEFAULT_CHARACTER_CONSISTENCY,
  getSceneCinematicFilter,
  VISUAL_FILTER_PRESETS,
  mapEmotionToVisualFilter,
  ALL_PHOTOREALISTIC_HUMAN_FRAMES
} from '../utils/sceneArt';
import { speakLocalizedText, stopVoiceover } from '../utils/voiceover';
import { SUPPORTED_LANGUAGES } from '../data/languages';
import { CharacterConsistencyModule } from './CharacterConsistencyModule';
import { CinemaMovieCanvasOverlay } from './CinemaMovieCanvasOverlay';
import { SceneTimelineBar } from './SceneTimelineBar';

interface StoryboardViewProps {
  scenes: Scene[];
  onUpdateScene: (updatedScene: Scene) => void;
  onBatchUpdateScenes?: (updatedScenes: Scene[], actionLabel?: string) => void;
  onRegenerateScene?: (sceneId: number, index: number) => void;
  onRegenerateSelectedScenes?: (sceneIds: number[]) => void;
  characterConsistency?: CharacterConsistencyConfig;
  onApplyCharacterConsistency?: (config: CharacterConsistencyConfig) => void;
  selectedLanguage?: LanguageCode;
  localizedOutputs?: Record<LanguageCode, LocalizedOutput>;
  videoTitle?: string;
  totalDurationSeconds?: number;
  focusedSceneId?: number | null;
  onSelectScene?: (scene: Scene, index: number) => void;
  humanReviewLocked?: boolean;
}

export const StoryboardView: React.FC<StoryboardViewProps> = ({
  scenes,
  onUpdateScene,
  onBatchUpdateScenes,
  onRegenerateScene,
  onRegenerateSelectedScenes,
  characterConsistency = DEFAULT_CHARACTER_CONSISTENCY,
  onApplyCharacterConsistency,
  selectedLanguage = 'te',
  localizedOutputs,
  videoTitle = 'Cinematic Production',
  totalDurationSeconds,
  focusedSceneId,
  onSelectScene,
  humanReviewLocked = false
}) => {
  const [editingSceneId, setEditingSceneId] = useState<number | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [editCamera, setEditCamera] = useState('');
  const [editLighting, setEditLighting] = useState('');
  const [editMotionPreset, setEditMotionPreset] = useState<CinematicMotionPreset>('pan');
  const [editTransitionPreset, setEditTransitionPreset] = useState<SceneTransitionPreset>('cross-fade');
  const [editFilterPreset, setEditFilterPreset] = useState<VisualFilterPreset>('default');
  const [editMotionIntensity, setEditMotionIntensity] = useState<number>(1.0);
  const [editMotionDurationSec, setEditMotionDurationSec] = useState<number>(8.0);
  const [resynthesizingId, setResynthesizingId] = useState<number | null>(null);
  const [previewScene, setPreviewScene] = useState<Scene | null>(null);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [selectedSceneIds, setSelectedSceneIds] = useState<number[]>([]);
  const [isRegeneratingSelected, setIsRegeneratingSelected] = useState(false);
  const [speakingSceneId, setSpeakingSceneId] = useState<number | null>(null);
  const [internalSelectedSceneId, setInternalSelectedSceneId] = useState<number | null>(
    focusedSceneId || (scenes[0]?.id ?? null)
  );

  useEffect(() => {
    if (focusedSceneId !== undefined && focusedSceneId !== null) {
      setInternalSelectedSceneId(focusedSceneId);
      const targetEl = document.getElementById(`storyboard-scene-${focusedSceneId}`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [focusedSceneId]);

  // Scene Transition Module State
  const [globalTransitionPreset, setGlobalTransitionPreset] = useState<SceneTransitionPreset>('cross-fade');
  const [globalTransitionDurationMs, setGlobalTransitionDurationMs] = useState<number>(850);
  const [batchTransitionApplied, setBatchTransitionApplied] = useState<boolean>(false);

  // Live Transition Preview State (both in the Scene Transition Module and per-card)
  const [activeCardTransitionId, setActiveCardTransitionId] = useState<number | null>(null);
  const [cardTransitionTick, setCardTransitionTick] = useState<number>(0);
  const [studioPreviewPairIdx, setStudioPreviewPairIdx] = useState<number>(0);
  const [studioTransitionTick, setStudioTransitionTick] = useState<number>(1);
  const [isStudioTransitionPlaying, setIsStudioTransitionPlaying] = useState<boolean>(false);

  // Strict 1:1 / time-range matching for localized scene dialogue (no arbitrary modulo wrapping)
  const getLocalizedSceneText = (scene: Scene, idx: number): string => {
    const langOutput = localizedOutputs?.[selectedLanguage];
    if (langOutput && langOutput.translationSegments.length > 0) {
      const segIds = scene.transcriptSegmentIds || scene.segmentIds || [];
      if (segIds.length > 0) {
        const matchedByIds = langOutput.translationSegments
          .filter(s => segIds.includes(s.id))
          .map(s => s.text)
          .filter(Boolean);
        if (matchedByIds.length > 0) return matchedByIds.join(' ');
      }
      const byTime = langOutput.translationSegments.find(
        s => Math.abs(s.start - scene.startTime) < 2 || (scene.startTime >= s.start && scene.startTime < s.end)
      );
      if (byTime?.text) return byTime.text;
      const byExactIdx = langOutput.translationSegments[idx];
      if (byExactIdx?.text) return byExactIdx.text;
    }
    return scene.dialogue || scene.summary;
  };

  const getEnglishFallbackText = (scene: Scene, idx: number): string => {
    const enOutput = localizedOutputs?.en;
    if (enOutput && enOutput.translationSegments.length > 0) {
      const seg = enOutput.translationSegments[idx];
      if (seg?.text) return seg.text;
    }
    return scene.summary;
  };

  const speakCharacterDialogue = (scene: Scene, idx: number) => {
    if (speakingSceneId === scene.id) {
      stopVoiceover();
      setSpeakingSceneId(null);
      return;
    }
    const localizedText = getLocalizedSceneText(scene, idx);
    const englishFallback = getEnglishFallbackText(scene, idx);
    speakLocalizedText({
      text: localizedText,
      langCode: selectedLanguage,
      fallbackEnglishText: englishFallback,
      onStart: () => setSpeakingSceneId(scene.id),
      onEnd: () => setSpeakingSceneId(null)
    });
  };

  const triggerCardTransitionPreview = (sceneId: number) => {
    setActiveCardTransitionId(sceneId);
    setCardTransitionTick(prev => prev + 1);
    setTimeout(() => {
      setActiveCardTransitionId(current => (current === sceneId ? null : current));
    }, globalTransitionDurationMs + 350);
  };

  const triggerStudioTransitionPreview = (pairIdx = studioPreviewPairIdx) => {
    setStudioPreviewPairIdx(pairIdx);
    setIsStudioTransitionPlaying(true);
    setStudioTransitionTick(prev => prev + 1);
    setTimeout(() => {
      setIsStudioTransitionPlaying(false);
    }, globalTransitionDurationMs + 200);
  };

  const handleSelectSceneTransitionPreset = (
    scene: Scene,
    transitionId: SceneTransitionPreset
  ) => {
    if (humanReviewLocked) return;
    const presetMeta = SCENE_TRANSITION_PRESETS.find(t => t.id === transitionId);
    const updated: Scene = {
      ...scene,
      transitionPreset: transitionId,
      transitionDurationMs: globalTransitionDurationMs || presetMeta?.defaultDurationMs || 850,
      userEdited: true
    };
    onUpdateScene(updated);
    if (previewScene?.id === scene.id) {
      setPreviewScene(updated);
    }
    triggerCardTransitionPreview(scene.id);
  };

  const handleApplyBatchTransitionToAllScenes = (
    presetToApply: SceneTransitionPreset = globalTransitionPreset,
    durationMs: number = globalTransitionDurationMs
  ) => {
    if (humanReviewLocked) return;
    setGlobalTransitionPreset(presetToApply);
    setGlobalTransitionDurationMs(durationMs);
    scenes.forEach(scene => {
      onUpdateScene({
        ...scene,
        transitionPreset: presetToApply,
        transitionDurationMs: durationMs
      });
    });
    setBatchTransitionApplied(true);
    triggerStudioTransitionPreview(studioPreviewPairIdx);
    setTimeout(() => setBatchTransitionApplied(false), 1800);
  };

  const handleSelectSceneMotionPreset = (
    scene: Scene,
    presetId: CinematicMotionPreset,
    idx: number
  ) => {
    if (humanReviewLocked) return;
    const presetMeta = CINEMATIC_MOTION_PRESETS.find(p => p.id === presetId);
    const updatedCamera =
      presetMeta?.cameraSpec || presetMeta?.cameraDescription || scene.camera;
    const prependedPrompt = prependCharacterConsistencyToPrompt(
      scene.visualDescription || scene.prompt,
      characterConsistency
    );

    const newArt = generateSceneArtwork(
      {
        id: scene.id,
        sceneNumber: scene.sceneNumber,
        summary: scene.summary,
        dialogue: scene.dialogue,
        visualDescription: prependedPrompt,
        prompt: prependedPrompt,
        camera: updatedCamera,
        lighting: scene.lighting,
        environment: scene.environment,
        startTime: scene.startTime,
        endTime: scene.endTime,
        motionPreset: presetId,
        transitionPreset: scene.transitionPreset || getDefaultTransitionPresetForIndex(idx),
        characterPrompt: characterConsistency.compiledPrompt,
        characterConfig: characterConsistency
      },
      videoTitle || scene.summary,
      idx,
      scenes.length
    );

    const updated: Scene = {
      ...scene,
      motionPreset: presetId,
      camera: updatedCamera,
      visualDescription: prependedPrompt,
      prompt: prependedPrompt,
      characterPrompt: characterConsistency.compiledPrompt,
      imageUrl: newArt,
      userEdited: true
    };

    onUpdateScene(updated);
    if (previewScene?.id === scene.id) {
      setPreviewScene(updated);
    }
  };

  const handleSelectSceneFilterPreset = (
    scene: Scene,
    filterId: VisualFilterPreset
  ) => {
    if (humanReviewLocked) return;
    const updated: Scene = {
      ...scene,
      visualFilterPreset: filterId,
      userEdited: true
    };
    onUpdateScene(updated);
    if (previewScene?.id === scene.id) {
      setPreviewScene(updated);
    }
  };

  const handleResetSceneFilterToEmotionAuto = (scene: Scene) => {
    if (humanReviewLocked) return;
    const updated: Scene = {
      ...scene,
      visualFilterPreset: 'default',
      userEdited: true
    };
    onUpdateScene(updated);
    if (previewScene?.id === scene.id) {
      setPreviewScene(updated);
    }
  };

  const handleChangeMotionIntensity = (scene: Scene, intensity: number) => {
    if (humanReviewLocked) return;
    const updated: Scene = {
      ...scene,
      motionIntensity: intensity,
      userEdited: true
    };
    onUpdateScene(updated);
    if (previewScene?.id === scene.id) {
      setPreviewScene(updated);
    }
  };

  const handleChangeMotionDuration = (scene: Scene, durationSec: number) => {
    if (humanReviewLocked) return;
    const updated: Scene = {
      ...scene,
      motionDurationSec: durationSec,
      userEdited: true
    };
    onUpdateScene(updated);
    if (previewScene?.id === scene.id) {
      setPreviewScene(updated);
    }
  };

  const handleStartEdit = (scene: Scene, idx: number) => {
    if (humanReviewLocked) return;
    setEditingSceneId(scene.id);
    setEditPrompt(scene.visualDescription || scene.prompt);
    setEditCamera(scene.camera);
    setEditLighting(scene.lighting);
    setEditMotionPreset(scene.motionPreset || getDefaultMotionPresetForIndex(idx));
    setEditTransitionPreset(scene.transitionPreset || getDefaultTransitionPresetForIndex(idx));
    setEditFilterPreset(scene.visualFilterPreset || 'default');
    setEditMotionIntensity(scene.motionIntensity ?? 1.0);
    setEditMotionDurationSec(
      scene.motionDurationSec ??
        scene.duration ??
        Math.max(2, Math.round(scene.endTime - scene.startTime)) ??
        8
    );
  };

  const handleSaveEdit = (scene: Scene, idx: number) => {
    if (humanReviewLocked) return;
    const updatedSeed = Math.floor(Math.random() * 900000) + 100000;
    const prependedPrompt = prependCharacterConsistencyToPrompt(editPrompt, characterConsistency);
    const newArt = generateSceneArtwork(
      {
        id: scene.id,
        sceneNumber: scene.sceneNumber,
        summary: scene.summary,
        dialogue: scene.dialogue,
        visualDescription: prependedPrompt,
        prompt: prependedPrompt,
        camera: editCamera,
        lighting: editLighting,
        environment: scene.environment,
        startTime: scene.startTime,
        endTime: scene.endTime,
        motionPreset: editMotionPreset,
        transitionPreset: editTransitionPreset,
        characterPrompt: characterConsistency.compiledPrompt,
        characterConfig: characterConsistency
      },
      videoTitle || scene.summary,
      idx,
      scenes.length
    );

    onUpdateScene({
      ...scene,
      visualDescription: prependedPrompt,
      camera: editCamera,
      lighting: editLighting,
      prompt: prependedPrompt,
      motionPreset: editMotionPreset,
      transitionPreset: editTransitionPreset,
      transitionDurationMs: scene.transitionDurationMs || globalTransitionDurationMs,
      characterPrompt: characterConsistency.compiledPrompt,
      seed: updatedSeed,
      imageUrl: newArt,
      visualFilterPreset: editFilterPreset,
      motionIntensity: editMotionIntensity,
      motionDurationSec: editMotionDurationSec,
      userEdited: true
    });
    setEditingSceneId(null);
  };

  /**
   * Regenerates ONLY the targeted scene index using `generateSceneArtwork` (and optional parent handler),
   * updating that specific scene object in state while preserving all other scenes and user edits.
   */
  const handleRegenerateSingleScene = async (scene: Scene, idx: number) => {
    if (humanReviewLocked) return;
    setResynthesizingId(scene.id);
    const updatedSeed = Math.floor(Math.random() * 900000) + 100000;
    const activePreset = scene.motionPreset || getDefaultMotionPresetForIndex(idx);
    const activeTransition = scene.transitionPreset || getDefaultTransitionPresetForIndex(idx);
    const prependedPrompt = prependCharacterConsistencyToPrompt(
      scene.visualDescription || scene.prompt,
      characterConsistency
    );

    // 1. Trigger deterministic generateSceneArtwork utility for this specific scene index
    let newArt = generateSceneArtwork(
      {
        id: scene.id,
        sceneNumber: scene.sceneNumber,
        summary: scene.summary,
        dialogue: scene.dialogue,
        visualDescription: prependedPrompt,
        prompt: prependedPrompt,
        camera: scene.camera,
        lighting: scene.lighting,
        environment: scene.environment,
        startTime: scene.startTime,
        endTime: scene.endTime,
        motionPreset: activePreset,
        transitionPreset: activeTransition,
        characterPrompt: characterConsistency.compiledPrompt,
        characterConfig: characterConsistency,
        characterIds: scene.characterIds,
        depictionMode: scene.depictionMode
      },
      videoTitle || scene.summary,
      idx,
      scenes.length
    );

    // If the generated art matches the existing static path, cycle to the next photorealistic frame so visual change is immediate
    if (newArt === scene.imageUrl) {
      const currentIdx = ALL_PHOTOREALISTIC_HUMAN_FRAMES.indexOf(scene.imageUrl || '');
      if (currentIdx !== -1) {
        newArt =
          ALL_PHOTOREALISTIC_HUMAN_FRAMES[
            (currentIdx + 1) % ALL_PHOTOREALISTIC_HUMAN_FRAMES.length
          ];
      }
    }

    try {
      const resp = await fetch('/api/generate-scene-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prependedPrompt,
          summary: scene.summary,
          dialogue: scene.dialogue,
          sceneNumber: scene.sceneNumber,
          characterIds: scene.characterIds,
          depictionMode: scene.depictionMode
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data?.imageUrl && data.source === 'gemini-2.5-flash-image') {
          newArt = data.imageUrl;
        }
      }
    } catch {
      // Keep newArt from generateSceneArtwork
    }

    const updatedScene: Scene = {
      ...scene,
      visualDescription: prependedPrompt,
      prompt: prependedPrompt,
      motionPreset: activePreset,
      transitionPreset: activeTransition,
      characterPrompt: characterConsistency.compiledPrompt,
      seed: updatedSeed,
      imageUrl: newArt
    };

    onUpdateScene(updatedScene);
    if (previewScene?.id === scene.id) {
      setPreviewScene(updatedScene);
    }
    setResynthesizingId(null);
  };

  const handleSetReviewStatus = (
    scene: Scene,
    status: 'approved' | 'rejected' | 'pending'
  ) => {
    if (humanReviewLocked) return;
    onUpdateScene({
      ...scene,
      reviewStatus: status,
      approved: status === 'approved',
      userEdited: true
    });
  };

  const toggleSceneSelection = (sceneId: number) => {
    setSelectedSceneIds(prev =>
      prev.includes(sceneId) ? prev.filter(id => id !== sceneId) : [...prev, sceneId]
    );
  };

  const handleToggleSelectAllScenes = () => {
    if (selectedSceneIds.length === scenes.length) {
      setSelectedSceneIds([]);
    } else {
      setSelectedSceneIds(scenes.map(s => s.id));
    }
  };

  /**
   * Batch regenerates all checkbox-selected scenes using `generateSceneArtwork` utility,
   * preserving unselected scenes and user edits in state.
   */
  const handleRegenerateSelectedBatch = () => {
    if (humanReviewLocked || selectedSceneIds.length === 0) return;
    setIsRegeneratingSelected(true);

    setTimeout(() => {
      const updatedBatch: Scene[] = [];
      scenes.forEach((scene, idx) => {
        if (!selectedSceneIds.includes(scene.id)) return;
        const updatedSeed = Math.floor(Math.random() * 900000) + 100000;
        const activePreset = scene.motionPreset || getDefaultMotionPresetForIndex(idx);
        const activeTransition = scene.transitionPreset || getDefaultTransitionPresetForIndex(idx);
        const prependedPrompt = prependCharacterConsistencyToPrompt(
          scene.visualDescription || scene.prompt,
          characterConsistency
        );

        let newArt = generateSceneArtwork(
          {
            id: scene.id,
            sceneNumber: scene.sceneNumber,
            summary: scene.summary,
            dialogue: scene.dialogue,
            visualDescription: prependedPrompt,
            prompt: prependedPrompt,
            camera: scene.camera,
            lighting: scene.lighting,
            environment: scene.environment,
            startTime: scene.startTime,
            endTime: scene.endTime,
            motionPreset: activePreset,
            transitionPreset: activeTransition,
            characterPrompt: characterConsistency.compiledPrompt,
            characterConfig: characterConsistency,
            characterIds: scene.characterIds,
            depictionMode: scene.depictionMode
          },
          videoTitle || scene.summary,
          idx,
          scenes.length
        );

        if (newArt === scene.imageUrl) {
          const currentIdx = ALL_PHOTOREALISTIC_HUMAN_FRAMES.indexOf(scene.imageUrl || '');
          if (currentIdx !== -1) {
            newArt =
              ALL_PHOTOREALISTIC_HUMAN_FRAMES[
                (currentIdx + 1) % ALL_PHOTOREALISTIC_HUMAN_FRAMES.length
              ];
          }
        }

        updatedBatch.push({
          ...scene,
          visualDescription: prependedPrompt,
          prompt: prependedPrompt,
          motionPreset: activePreset,
          transitionPreset: activeTransition,
          characterPrompt: characterConsistency.compiledPrompt,
          seed: updatedSeed,
          imageUrl: newArt
        });
      });

      if (onBatchUpdateScenes && updatedBatch.length > 0) {
        onBatchUpdateScenes(
          updatedBatch,
          `Regenerated ${updatedBatch.length} selected scene(s) in StoryboardView`
        );
      } else if (onRegenerateSelectedScenes) {
        onRegenerateSelectedScenes(selectedSceneIds);
      } else {
        updatedBatch.forEach(sc => onUpdateScene(sc));
      }

      setIsRegeneratingSelected(false);
    }, 300);
  };

  const handleBatchResynthesizeAll = () => {
    if (humanReviewLocked) return;
    setIsBatchGenerating(true);
    setTimeout(() => {
      const updatedBatch: Scene[] = scenes.map((scene, idx) => {
        const updatedSeed = Math.floor(Math.random() * 900000) + 100000;
        const activePreset = scene.motionPreset || getDefaultMotionPresetForIndex(idx);
        const activeTransition = scene.transitionPreset || getDefaultTransitionPresetForIndex(idx);
        const prependedPrompt = prependCharacterConsistencyToPrompt(
          scene.visualDescription || scene.prompt,
          characterConsistency
        );
        let newArt = generateSceneArtwork(
          {
            id: scene.id,
            sceneNumber: scene.sceneNumber,
            summary: scene.summary,
            dialogue: scene.dialogue,
            visualDescription: prependedPrompt,
            prompt: prependedPrompt,
            camera: scene.camera,
            lighting: scene.lighting,
            environment: scene.environment,
            startTime: scene.startTime,
            endTime: scene.endTime,
            motionPreset: activePreset,
            transitionPreset: activeTransition,
            characterPrompt: characterConsistency.compiledPrompt,
            characterConfig: characterConsistency
          },
          videoTitle || scene.summary,
          idx,
          scenes.length
        );
        if (newArt === scene.imageUrl) {
          const currentIdx = ALL_PHOTOREALISTIC_HUMAN_FRAMES.indexOf(scene.imageUrl || '');
          if (currentIdx !== -1) {
            newArt =
              ALL_PHOTOREALISTIC_HUMAN_FRAMES[
                (currentIdx + 1) % ALL_PHOTOREALISTIC_HUMAN_FRAMES.length
              ];
          }
        }
        return {
          ...scene,
          visualDescription: prependedPrompt,
          prompt: prependedPrompt,
          motionPreset: activePreset,
          transitionPreset: activeTransition,
          characterPrompt: characterConsistency.compiledPrompt,
          seed: updatedSeed,
          imageUrl: newArt
        };
      });

      if (onBatchUpdateScenes) {
        onBatchUpdateScenes(updatedBatch, `Resynthesized all ${updatedBatch.length} scenes`);
      } else {
        updatedBatch.forEach(sc => onUpdateScene(sc));
      }
      setIsBatchGenerating(false);
    }, 350);
  };

  const activeLocalizedScenes = localizedOutputs?.[selectedLanguage]?.scenes;
  const currentDisplayScenes =
    activeLocalizedScenes && activeLocalizedScenes.length > 0
      ? activeLocalizedScenes
      : scenes;

  const studioFromScene = currentDisplayScenes[studioPreviewPairIdx % Math.max(1, currentDisplayScenes.length)] || currentDisplayScenes[0];
  const studioToScene =
    currentDisplayScenes[(studioPreviewPairIdx + 1) % Math.max(1, currentDisplayScenes.length)] || currentDisplayScenes[0];
  const activeGlobalTransitionMeta =
    SCENE_TRANSITION_PRESETS.find(t => t.id === globalTransitionPreset) ||
    SCENE_TRANSITION_PRESETS[0];

  const computedTotalDuration =
    totalDurationSeconds ||
    currentDisplayScenes.reduce((max, s) => Math.max(max, s.endTime || 0), 0) ||
    133;

  return (
    <div className="space-y-6">
      {/* Global Scene Timeline at the top of StoryboardView */}
      {currentDisplayScenes.length > 0 && (
        <SceneTimelineBar
          scenes={currentDisplayScenes}
          totalDurationSeconds={computedTotalDuration}
          selectedSceneId={internalSelectedSceneId}
          onSelectScene={(sc, idx) => {
            setInternalSelectedSceneId(sc.id);
            onSelectScene?.(sc, idx);
          }}
          title="Global Scene Timeline — Transcript-Aligned Storyboard Sequencer"
          subtitle="Click any scene segment below to jump directly to its transcript-aligned card, inspect timestamps, or approve/regenerate that scene."
          variant="storyboard"
        />
      )}

      {/* Storyboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2 flex-wrap">
            <span>Storyboard &amp; Scenes</span>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              {currentDisplayScenes.length} Transcript-Aligned Scene{currentDisplayScenes.length === 1 ? '' : 's'}
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              {SUPPORTED_LANGUAGES[selectedLanguage]?.name || selectedLanguage.toUpperCase()} STORYBOARD
            </span>
            {humanReviewLocked && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>HUMAN REVIEW LOCKED</span>
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Generated directly from your video transcript. Approve or reject scenes, regenerate selected scenes, and preview {SUPPORTED_LANGUAGES[selectedLanguage]?.name || 'localized'} voiceover.
          </p>
        </div>
        {scenes.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={humanReviewLocked || scenes.length === 0}
              onClick={handleToggleSelectAllScenes}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {selectedSceneIds.length === scenes.length && scenes.length > 0 ? (
                <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Square className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>
                {selectedSceneIds.length === scenes.length && scenes.length > 0
                  ? 'Deselect All'
                  : 'Select All'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleRegenerateSelectedBatch}
              disabled={
                isRegeneratingSelected ||
                selectedSceneIds.length === 0 ||
                humanReviewLocked
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer disabled:opacity-40 shadow-sm"
              title="Checkbox multiple scenes and trigger generateSceneArtwork for the selected batch"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRegeneratingSelected ? 'animate-spin' : ''}`}
              />
              <span>
                {isRegeneratingSelected
                  ? 'Regenerating Batch...'
                  : `Regenerate Selected${
                      selectedSceneIds.length > 0 ? ` (${selectedSceneIds.length})` : ''
                    }`}
              </span>
            </button>

            <button
              onClick={handleBatchResynthesizeAll}
              disabled={isBatchGenerating || humanReviewLocked}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isBatchGenerating ? 'animate-spin' : ''}`} />
              <span>{isBatchGenerating ? 'Synthesizing Scenes...' : 'Resynthesize All Scenes'}</span>
            </button>
          </div>
        )}
      </div>

      {currentDisplayScenes.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center space-y-2">
          <Film className="w-8 h-8 text-amber-400 mx-auto" />
          <h3 className="text-sm font-bold text-white">No Storyboard Scenes Generated Yet</h3>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">
            Paste a YouTube URL in the bar above and click <span className="text-amber-300 font-semibold">Generate Full Video</span> to extract the transcript, build storyboard scenes, translate into all languages, and render the complete video.
          </p>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {currentDisplayScenes.map((scene, idx) => {
          const isEditing = editingSceneId === scene.id;
          const isGenerating = resynthesizingId === scene.id;
          const isSpeaking = speakingSceneId === scene.id;
          const isTransitioningCard = activeCardTransitionId === scene.id;
          const isFocusedCard = internalSelectedSceneId === scene.id;
          const nextScene = currentDisplayScenes[(idx + 1) % Math.max(1, currentDisplayScenes.length)] || scene;
          const reviewStatus =
            scene.reviewStatus || (scene.approved ? 'approved' : 'pending');
          const segIds = scene.transcriptSegmentIds || scene.segmentIds || [idx + 1];

          const activeMotionPreset: CinematicMotionPreset =
            scene.motionPreset || getDefaultMotionPresetForIndex(idx);
          const motionCssClass = getMotionPresetCssClass(activeMotionPreset, idx);
          const activeMotionMeta =
            CINEMATIC_MOTION_PRESETS.find(m => m.id === activeMotionPreset) ||
            CINEMATIC_MOTION_PRESETS[0];

          const activeTransitionPreset: SceneTransitionPreset =
            scene.transitionPreset || getDefaultTransitionPresetForIndex(idx);
          const transitionCssClass = getSceneTransitionCssClass(activeTransitionPreset, idx);
          const transitionOutCssClass = getSceneTransitionOutCssClass(activeTransitionPreset, idx);
          const activeTransitionMeta =
            SCENE_TRANSITION_PRESETS.find(t => t.id === activeTransitionPreset) ||
            SCENE_TRANSITION_PRESETS[0];
          const transitionDuration = scene.transitionDurationMs || globalTransitionDurationMs || 850;

          const character = extractCharacterFromTranscript(
            scene.dialogue,
            scene.summary,
            idx,
            characterConsistency.enabled
              ? characterConsistency
              : scene.characterPrompt || scene.visualDescription,
            {
              characterIds: scene.characterIds,
              depictionMode: scene.depictionMode
            }
          );
          const localizedDialogue = getLocalizedSceneText(scene, idx);

          const activeVisualFilterId: VisualFilterPreset =
            scene.visualFilterPreset && scene.visualFilterPreset !== 'default'
              ? scene.visualFilterPreset
              : mapEmotionToVisualFilter(scene.emotion, scene.emotionalTone);
          const activeFilterMeta =
            VISUAL_FILTER_PRESETS.find(f => f.id === activeVisualFilterId) ||
            VISUAL_FILTER_PRESETS[0];
          const autoMappedFilterId = mapEmotionToVisualFilter(scene.emotion, scene.emotionalTone);
          const autoMappedFilterMeta =
            VISUAL_FILTER_PRESETS.find(f => f.id === autoMappedFilterId) ||
            VISUAL_FILTER_PRESETS[0];
          const isCustomFilterOverride = Boolean(
            scene.visualFilterPreset && scene.visualFilterPreset !== 'default'
          );

          const motionIntensity = scene.motionIntensity ?? 1.0;
          const defaultSceneDuration =
            scene.duration || Math.max(2, Math.round(scene.endTime - scene.startTime)) || 8;
          const motionDurationSec = scene.motionDurationSec ?? defaultSceneDuration;
          const effectiveMotionAnimDuration = Math.max(
            1.5,
            Math.min(25, motionDurationSec / motionIntensity)
          );

          return (
            <div
              key={scene.id}
              id={`storyboard-scene-${scene.id}`}
              tabIndex={-1}
              onClick={() => setInternalSelectedSceneId(scene.id)}
              className={`bg-slate-900 border rounded-2xl overflow-hidden transition-all flex flex-col group focus:outline-none ${
                isFocusedCard
                  ? 'border-amber-400 ring-2 ring-amber-400/40 shadow-2xl'
                  : reviewStatus === 'approved'
                  ? 'border-emerald-500/40 hover:border-emerald-400/60'
                  : reviewStatus === 'rejected'
                  ? 'border-red-500/40 hover:border-red-400/60'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Scene Visual Frame */}
              <div
                className="relative aspect-video w-full bg-slate-950 overflow-hidden"
                style={
                  {
                    '--scene-transition-duration': `${transitionDuration}ms`
                  } as React.CSSProperties
                }
              >
                {isTransitioningCard ? (
                  <>
                    <div
                      key={`card-out-${scene.id}-${cardTransitionTick}`}
                      className={`absolute inset-0 w-full h-full overflow-hidden ${transitionOutCssClass}`}
                    >
                      <img
                        src={scene.imageUrl}
                        alt={scene.summary}
                        referrerPolicy="no-referrer"
                        style={
                          {
                            filter: activeFilterMeta.cssFilter,
                            objectPosition: 'center center',
                            '--scene-motion-duration': `${effectiveMotionAnimDuration}s`,
                            '--scene-motion-intensity': `${motionIntensity}`
                          } as React.CSSProperties
                        }
                        className={`w-full h-full object-cover ${motionCssClass}`}
                      />
                    </div>
                    <div
                      key={`card-in-${scene.id}-${cardTransitionTick}`}
                      className={`absolute inset-0 w-full h-full overflow-hidden ${transitionCssClass}`}
                    >
                      <img
                        src={nextScene.imageUrl}
                        alt={nextScene.summary}
                        referrerPolicy="no-referrer"
                        style={
                          {
                            filter: activeFilterMeta.cssFilter,
                            objectPosition: 'center center',
                            '--scene-motion-duration': `${effectiveMotionAnimDuration}s`,
                            '--scene-motion-intensity': `${motionIntensity}`
                          } as React.CSSProperties
                        }
                        className={`w-full h-full object-cover ${motionCssClass}`}
                      />
                    </div>
                  </>
                ) : (
                  <div
                    key={`sb-wrap-${scene.id}-${activeTransitionPreset}`}
                    className={`relative w-full h-full overflow-hidden ${transitionCssClass}`}
                  >
                    <div className={`w-full h-full ${isSpeaking ? 'character-speaking-active' : ''}`}>
                      <img
                        key={`sb-img-${scene.id}-${activeMotionPreset}-${scene.seed}-${activeVisualFilterId}-${motionIntensity}-${motionDurationSec}`}
                        src={scene.imageUrl}
                        alt={scene.summary}
                        referrerPolicy="no-referrer"
                        style={
                          {
                            filter: activeFilterMeta.cssFilter,
                            objectPosition: 'center center',
                            '--scene-motion-duration': `${effectiveMotionAnimDuration}s`,
                            '--scene-motion-intensity': `${motionIntensity}`
                          } as React.CSSProperties
                        }
                        className={`w-full h-full object-cover ${motionCssClass} ${
                          isGenerating ? 'opacity-40 blur-xs' : ''
                        }`}
                      />
                    </div>
                  </div>
                )}

                <CinemaMovieCanvasOverlay
                  archetype={character.archetype}
                  motionPreset={activeMotionPreset}
                  isSpeakingOrPlaying={isSpeaking || isTransitioningCard}
                  sceneNumber={scene.sceneNumber || idx + 1}
                  totalScenes={scenes.length}
                  compact={true}
                />

                <div className="absolute inset-y-0 w-1/3 pointer-events-none bg-gradient-to-r from-transparent via-amber-300/15 to-transparent anamorphic-flare-pass z-10" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30 pointer-events-none" />

                {/* Cast & Evidence Badge */}
                <div className="absolute bottom-11 left-3 right-3 pointer-events-none flex items-center justify-between gap-2 bg-slate-950/85 backdrop-blur-md px-3 py-1 rounded-lg border border-amber-400/25 z-20">
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono text-emerald-300 font-bold block truncate">
                      4K SCENE · SUBJECT: {character.name} (Seg #{segIds.join(',#')})
                    </span>
                    <span className="text-[10px] text-slate-300 block truncate">
                      {character.role} · {activeMotionMeta.lensSpec}
                    </span>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border shrink-0 ${
                      reviewStatus === 'approved'
                        ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400/40'
                        : reviewStatus === 'rejected'
                        ? 'bg-red-500/25 text-red-300 border-red-400/40'
                        : 'bg-amber-400/20 text-amber-300 border-amber-400/30'
                    }`}
                  >
                    {reviewStatus.toUpperCase()}
                  </span>
                </div>

                {/* Top Timeline, Checkbox, Motion & Transition Badge */}
                <div
                  onClick={e => e.stopPropagation()}
                  className="absolute top-3 left-3 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded text-xs font-mono text-white border border-white/10 flex items-center gap-1.5 flex-wrap z-20"
                >
                  <input
                    type="checkbox"
                    disabled={humanReviewLocked}
                    checked={selectedSceneIds.includes(scene.id)}
                    onChange={() => toggleSceneSelection(scene.id)}
                    aria-label={`Select Scene ${scene.sceneNumber} for batch regeneration`}
                    className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-950 text-amber-400 focus:ring-amber-400 cursor-pointer accent-amber-400"
                  />
                  <span
                    className={`w-2 h-2 rounded-full inline-block ${
                      reviewStatus === 'approved'
                        ? 'bg-emerald-400'
                        : reviewStatus === 'rejected'
                        ? 'bg-red-400'
                        : 'bg-amber-400 animate-pulse'
                    }`}
                  />
                  <span>
                    Scene {String(scene.sceneNumber).padStart(2, '0')} · {scene.startTime}s - {scene.endTime}s
                  </span>
                  <span className="text-amber-300 border-l border-white/20 pl-1.5 font-bold uppercase flex items-center gap-1">
                    <span>🎭</span>
                    <span>{scene.emotion || 'Dramatic'}</span>
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border ${activeFilterMeta.badgeBg}`}
                    title={`Visual Style Filter: ${activeFilterMeta.label} (${activeFilterMeta.tag})`}
                  >
                    {activeFilterMeta.label}
                  </span>
                  <span className="text-cyan-300 border-l border-white/20 pl-1.5 font-bold uppercase">
                    {activeMotionMeta.shortLabel} @ {motionIntensity.toFixed(1)}x
                  </span>
                  <span className="text-purple-300 border-l border-white/20 pl-1.5 font-bold uppercase">
                    {activeTransitionMeta.shortLabel}
                  </span>
                </div>

                {/* Top Right Quick Actions */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      speakCharacterDialogue(scene, idx);
                    }}
                    className={`px-2.5 py-1 rounded-md backdrop-blur-md border text-[11px] font-mono font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                      isSpeaking
                        ? 'bg-amber-400 text-slate-950 border-amber-300'
                        : 'bg-black/75 hover:bg-black text-amber-300 border-amber-400/30'
                    }`}
                    title="Play Localized Character Voiceover"
                  >
                    <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'animate-bounce' : ''}`} />
                    <span>
                      {isSpeaking
                        ? 'Speaking...'
                        : `Voiceover (${SUPPORTED_LANGUAGES[selectedLanguage]?.flag || ''} ${selectedLanguage.toUpperCase()})`}
                    </span>
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setPreviewScene(scene);
                    }}
                    className="p-1.5 bg-black/70 hover:bg-black text-slate-200 hover:text-white rounded-md backdrop-blur-md border border-white/10 transition-colors cursor-pointer"
                    title="Enlarge 4K Frame"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Bottom Localized Dialogue Overlay */}
                <div className="absolute bottom-2.5 left-3 right-3 text-xs text-amber-200 line-clamp-1 pointer-events-none font-medium bg-black/80 backdrop-blur-xs px-2.5 py-1 rounded border border-white/10 z-20">
                  {isTransitioningCard
                    ? `Transitioning (${activeTransitionMeta.shortLabel}): Scene ${String(scene.sceneNumber).padStart(2, '0')} ➔ Scene ${String(nextScene.sceneNumber).padStart(2, '0')}`
                    : `“${localizedDialogue}”`}
                </div>
              </div>

              {/* Scene Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-medium text-slate-400 block mb-1">
                        Visual Prompt (Prepended with Character Consistency when enabled)
                      </label>
                      <textarea
                        value={editPrompt}
                        onChange={e => setEditPrompt(e.target.value)}
                        rows={3}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-slate-400 block mb-1">
                        Cinematic Motion Preset
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {CINEMATIC_MOTION_PRESETS.map(preset => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              setEditMotionPreset(preset.id);
                              setEditCamera(preset.cameraSpec || preset.cameraDescription);
                            }}
                            className={`px-2 py-1.5 rounded-lg text-[11px] font-mono border transition-colors cursor-pointer ${
                              editMotionPreset === preset.id
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 font-bold'
                                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                            }`}
                          >
                            {preset.shortLabel} ({preset.cssClass})
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-slate-400 block mb-1">
                        Scene Transition Animation (Cross-Fade / Slide)
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {SCENE_TRANSITION_PRESETS.map(tPreset => (
                          <button
                            key={tPreset.id}
                            type="button"
                            onClick={() => setEditTransitionPreset(tPreset.id)}
                            className={`px-2 py-1.5 rounded-lg text-[11px] font-mono border transition-colors cursor-pointer ${
                              editTransitionPreset === tPreset.id
                                ? 'bg-purple-500/20 text-purple-300 border-purple-400 font-bold'
                                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                            }`}
                          >
                            {tPreset.shortLabel}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-slate-400 block mb-1">
                        Visual Style Filter Preset (Transcript Emotion Mapped or Custom)
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditFilterPreset('default')}
                          className={`px-2 py-1.5 rounded-lg text-[11px] font-mono border transition-colors cursor-pointer ${
                            editFilterPreset === 'default'
                              ? 'bg-amber-400/20 text-amber-300 border-amber-400 font-bold'
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                          }`}
                        >
                          Auto (Sentiment)
                        </button>
                        {VISUAL_FILTER_PRESETS.map(fPreset => (
                          <button
                            key={fPreset.id}
                            type="button"
                            onClick={() => setEditFilterPreset(fPreset.id)}
                            className={`px-2 py-1.5 rounded-lg text-[11px] font-mono border transition-colors cursor-pointer ${
                              editFilterPreset === fPreset.id
                                ? `${fPreset.badgeBg} font-bold ring-1 ring-amber-400/40`
                                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                            }`}
                          >
                            {fPreset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                          <span>Motion Intensity (Pan/Orbit):</span>
                          <span className="text-cyan-300 font-bold">{editMotionIntensity.toFixed(1)}x</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="2.5"
                          step="0.1"
                          value={editMotionIntensity}
                          onChange={e => setEditMotionIntensity(parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                          <span>Motion Cycle Duration:</span>
                          <span className="text-amber-400 font-bold">{editMotionDurationSec.toFixed(1)}s</span>
                        </div>
                        <input
                          type="range"
                          min="2.0"
                          max="15.0"
                          step="0.5"
                          value={editMotionDurationSec}
                          onChange={e => setEditMotionDurationSec(parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-medium text-slate-400 block mb-1">Camera Spec</label>
                        <input
                          type="text"
                          value={editCamera}
                          onChange={e => setEditCamera(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-slate-400 block mb-1">Lighting</label>
                        <input
                          type="text"
                          value={editLighting}
                          onChange={e => setEditLighting(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => setEditingSceneId(null)}
                        className="px-3 py-1 text-xs text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(scene, idx)}
                        className="px-3 py-1 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer"
                      >
                        Save &amp; Regenerate Scene
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-semibold text-white leading-snug">
                          {scene.summary}
                        </h4>
                        <button
                          onClick={() => handleStartEdit(scene, idx)}
                          disabled={humanReviewLocked}
                          className="text-slate-400 hover:text-amber-400 disabled:opacity-40 transition-colors p-1 shrink-0 cursor-pointer"
                          title="Edit prompt, motion preset, and transition attributes"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {scene.emotionalTone && (
                        <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[11px] font-mono">
                          <span className="text-amber-300 font-semibold flex items-center gap-1.5 truncate">
                            <span>🎭 DRAMATIC TONE:</span>
                            <span className="text-slate-200 truncate">{scene.emotionalTone}</span>
                          </span>
                          <span className="text-[10px] text-amber-400 font-bold uppercase shrink-0">
                            [{selectedLanguage.toUpperCase()}]
                          </span>
                        </div>
                      )}

                      {/* Human Review & Single-Scene Regenerate Action Bar */}
                      <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={humanReviewLocked}
                            onClick={() => handleSetReviewStatus(scene, 'approved')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 ${
                              reviewStatus === 'approved'
                                ? 'bg-emerald-400 text-slate-950 border-emerald-300 shadow-xs'
                                : 'bg-slate-900 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>

                          <button
                            type="button"
                            disabled={humanReviewLocked}
                            onClick={() => handleSetReviewStatus(scene, 'rejected')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 ${
                              reviewStatus === 'rejected'
                                ? 'bg-red-400 text-slate-950 border-red-300 shadow-xs'
                                : 'bg-slate-900 text-red-300 border-red-500/30 hover:bg-red-500/20'
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          disabled={isGenerating || humanReviewLocked}
                          onClick={() => handleRegenerateSingleScene(scene, idx)}
                          className="px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-mono font-bold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                          title="Regenerate artwork and visual frame only for this specific scene index while preserving other edits"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                          <span>{isGenerating ? 'Regenerating...' : 'Regenerate Scene'}</span>
                        </button>
                      </div>

                      {/* Cinematic Motion Preset Selector Strip */}
                      <div className="bg-slate-950/90 border border-cyan-500/25 rounded-xl p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-cyan-300 font-semibold flex items-center gap-1.5">
                            <Move className="w-3.5 h-3.5" />
                            <span>CINEMATIC MOTION PRESET:</span>
                          </span>
                          <span className="text-[10px] text-slate-400">
                            CSS: <code className="text-amber-300">.{motionCssClass}</code>
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {CINEMATIC_MOTION_PRESETS.map(preset => {
                            const isSelected = activeMotionPreset === preset.id;
                            return (
                              <button
                                key={preset.id}
                                type="button"
                                disabled={humanReviewLocked}
                                onClick={() => handleSelectSceneMotionPreset(scene, preset.id, idx)}
                                className={`px-2 py-1 rounded-lg text-[11px] font-mono font-semibold border transition-all cursor-pointer disabled:opacity-50 ${
                                  isSelected
                                    ? 'bg-cyan-400 text-slate-950 border-cyan-300 shadow-xs'
                                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                                }`}
                                title={preset.description || preset.cameraDescription}
                              >
                                {preset.shortLabel}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Cinematic Motion Pacing & Intensity Sliders */}
                      <div className="bg-slate-950/90 border border-cyan-500/25 rounded-xl p-3 space-y-3">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                            <Sliders className="w-3.5 h-3.5" />
                            <span>CINEMATIC MOTION CONTROLS:</span>
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Speed: <span className="text-cyan-300 font-bold">{motionIntensity.toFixed(1)}x</span> · Cycle: <span className="text-amber-300 font-bold">{motionDurationSec.toFixed(1)}s</span>
                          </span>
                        </div>

                        {/* Intensity Slider (Pan Speed / Orbit Radius) */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <label className="text-slate-300 flex items-center gap-1">
                              <span>Pan Speed &amp; Orbit Radius Intensity:</span>
                              <span className="text-cyan-400 font-bold">{motionIntensity.toFixed(1)}x</span>
                            </label>
                            <span className="text-slate-400 text-[9px]">
                              {motionIntensity <= 0.8
                                ? 'Subtle & Gentle Drift'
                                : motionIntensity <= 1.2
                                ? 'Cinematic Standard'
                                : motionIntensity <= 1.8
                                ? 'Dynamic Anamorphic Sweep'
                                : 'High-Velocity Cinematic'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-mono text-slate-500 shrink-0">0.5x</span>
                            <input
                              type="range"
                              min="0.5"
                              max="2.5"
                              step="0.1"
                              disabled={humanReviewLocked}
                              value={motionIntensity}
                              onChange={e => handleChangeMotionIntensity(scene, parseFloat(e.target.value))}
                              aria-label={`Scene ${scene.sceneNumber} Motion Intensity (Pan Speed / Orbit Radius)`}
                              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 disabled:opacity-40"
                            />
                            <span className="text-[9px] font-mono text-slate-500 shrink-0">2.5x</span>
                          </div>
                        </div>

                        {/* Motion Cycle Duration Slider */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <label className="text-slate-300 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-400/80 inline" />
                              <span>Motion Preset Duration:</span>
                              <span className="text-amber-400 font-bold">{motionDurationSec.toFixed(1)}s</span>
                            </label>
                            <span className="text-slate-400 text-[9px]">
                              Effective Cycle: {effectiveMotionAnimDuration.toFixed(1)}s
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-mono text-slate-500 shrink-0">2.0s</span>
                            <input
                              type="range"
                              min="2.0"
                              max="15.0"
                              step="0.5"
                              disabled={humanReviewLocked}
                              value={motionDurationSec}
                              onChange={e => handleChangeMotionDuration(scene, parseFloat(e.target.value))}
                              aria-label={`Scene ${scene.sceneNumber} Motion Duration`}
                              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400 disabled:opacity-40"
                            />
                            <span className="text-[9px] font-mono text-slate-500 shrink-0">15.0s</span>
                          </div>
                        </div>

                        {/* Quick Pacing Presets */}
                        <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-900 text-[10px] font-mono">
                          <span className="text-slate-500 text-[9px]">Pacing Presets:</span>
                          <div className="flex items-center gap-1 flex-wrap">
                            {[
                              { label: 'Subtle', intensity: 0.7, dur: 10.0 },
                              { label: 'Standard', intensity: 1.0, dur: defaultSceneDuration },
                              { label: 'Cinematic', intensity: 1.4, dur: 7.5 },
                              { label: 'High-Impact', intensity: 2.0, dur: 5.0 }
                            ].map(p => (
                              <button
                                key={p.label}
                                type="button"
                                disabled={humanReviewLocked}
                                onClick={() => {
                                  if (humanReviewLocked) return;
                                  const updated: Scene = {
                                    ...scene,
                                    motionIntensity: p.intensity,
                                    motionDurationSec: p.dur,
                                    userEdited: true
                                  };
                                  onUpdateScene(updated);
                                  if (previewScene?.id === scene.id) setPreviewScene(updated);
                                }}
                                className={`px-1.5 py-0.5 rounded text-[9px] border transition-colors cursor-pointer ${
                                  Math.abs(motionIntensity - p.intensity) < 0.05
                                    ? 'bg-cyan-500/25 text-cyan-200 border-cyan-400 font-bold'
                                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                                }`}
                              >
                                {p.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Emotion Tag & Visual Style Filter Presets */}
                      <div className="bg-slate-950/90 border border-amber-500/25 rounded-xl p-3 space-y-2.5">
                        <div className="flex items-center justify-between text-[11px] font-mono flex-wrap gap-1">
                          <span className="text-amber-300 font-bold flex items-center gap-1.5">
                            <Palette className="w-3.5 h-3.5" />
                            <span>EMOTION TAG &amp; VISUAL FILTER:</span>
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20 uppercase flex items-center gap-1">
                              <span>🎭</span>
                              <span>{scene.emotion || 'Intense Drama'}</span>
                            </span>
                            {isCustomFilterOverride && (
                              <button
                                type="button"
                                disabled={humanReviewLocked}
                                onClick={() => handleResetSceneFilterToEmotionAuto(scene)}
                                className="text-[9px] text-cyan-300 hover:text-cyan-200 underline cursor-pointer"
                                title="Reset to transcript sentiment auto-mapped preset"
                              >
                                Reset to Auto
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Transcript Sentiment Mapping Explanation Banner */}
                        <div className="text-[10px] font-mono bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800 flex items-center justify-between gap-2">
                          <div className="text-slate-300 truncate">
                            <span className="text-slate-500">Transcript Sentiment:</span>{' '}
                            <span className="text-amber-300 font-semibold">{scene.emotion || 'Documentary Narrative'}</span>
                            {scene.emotionalTone && (
                              <span className="text-slate-400"> ({scene.emotionalTone})</span>
                            )}
                          </div>
                          <span className="text-slate-400 shrink-0 text-[9px]">
                            ➔ Auto: <span className="text-amber-400 font-bold">{autoMappedFilterMeta.label}</span>
                          </span>
                        </div>

                        {/* Visual Filter Preset Toggles per scene */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {VISUAL_FILTER_PRESETS.map(filterPreset => {
                            const isSelected = activeVisualFilterId === filterPreset.id;
                            return (
                              <button
                                key={filterPreset.id}
                                type="button"
                                disabled={humanReviewLocked}
                                onClick={() => handleSelectSceneFilterPreset(scene, filterPreset.id)}
                                className={`px-2 py-1.5 rounded-lg text-[10px] font-mono text-left border transition-all cursor-pointer disabled:opacity-50 flex flex-col justify-between ${
                                  isSelected
                                    ? `${filterPreset.badgeBg} font-bold shadow-xs ring-1 ring-amber-400/40`
                                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                                }`}
                                title={filterPreset.description}
                              >
                                <div className="flex items-center justify-between gap-1 w-full">
                                  <span className="truncate">{filterPreset.label}</span>
                                  {isSelected && <span className="text-amber-400 text-xs">✓</span>}
                                </div>
                                <span className="text-[8px] opacity-75 truncate block mt-0.5">
                                  {filterPreset.tag}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Active Filter Description Note */}
                        <div className="text-[10px] text-slate-400 font-mono italic px-1">
                          <span className="text-amber-400/80 not-italic font-semibold">{activeFilterMeta.label}:</span>{' '}
                          {activeFilterMeta.description}
                        </div>
                      </div>

                      {/* Scene Transition Selector Strip */}
                      <div className="bg-slate-950/90 border border-purple-500/25 rounded-xl p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-purple-300 font-semibold flex items-center gap-1.5">
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            <span>
                              SCENE TRANSITION (➔ SCENE {String(nextScene.sceneNumber).padStart(2, '0')}):
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => triggerCardTransitionPreview(scene.id)}
                            className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-400/30 font-bold flex items-center gap-1 cursor-pointer"
                            title="Preview transition from this scene to the next scene"
                          >
                            <Play className="w-2.5 h-2.5 fill-current" />
                            <span>{isTransitioningCard ? 'Transitioning...' : 'Preview Transition'}</span>
                          </button>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {SCENE_TRANSITION_PRESETS.map(tPreset => {
                            const isSelected = activeTransitionPreset === tPreset.id;
                            return (
                              <button
                                key={tPreset.id}
                                type="button"
                                disabled={humanReviewLocked}
                                onClick={() =>
                                  handleSelectSceneTransitionPreset(scene, tPreset.id)
                                }
                                className={`px-2 py-1 rounded-lg text-[11px] font-mono font-semibold border transition-all cursor-pointer disabled:opacity-50 ${
                                  isSelected
                                    ? 'bg-purple-400 text-slate-950 border-purple-300 shadow-xs'
                                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                                }`}
                                title={`${tPreset.label}: ${tPreset.description}`}
                              >
                                {tPreset.shortLabel}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Persistent Character & Depiction Mode Profile Card */}
                      <div className="bg-slate-950/90 border border-emerald-500/30 rounded-xl p-3 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>SUBJECT: {character.name}</span>
                          </span>
                          <span className="text-amber-300 text-[10px] px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">
                            {character.isConsistentLock
                              ? 'Consistency Lock'
                              : character.presenceType === 'speaking_on_camera'
                              ? 'Verified Speaker'
                              : 'B-Roll / Context'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300 font-mono truncate">
                          <span className="text-slate-400">Depiction:</span> {character.attire}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono truncate">
                          <span className="text-slate-500">Evidence:</span> Segments #{segIds.join(', #')} ({scene.startTime}s - {scene.endTime}s)
                        </div>
                      </div>

                      {/* Localized Translation + Original Transcript */}
                      <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-mono text-amber-400">
                          <span className="flex items-center gap-1 font-semibold">
                            <Globe className="w-3 h-3" />
                            <span>
                              LOCALIZED VOICEOVER ({SUPPORTED_LANGUAGES[selectedLanguage]?.name || selectedLanguage}):
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => speakCharacterDialogue(scene, idx)}
                            className="text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <Volume2 className="w-3 h-3" />
                            <span>{isSpeaking ? 'Stop Audio' : 'Listen'}</span>
                          </button>
                        </div>
                        <p className="text-xs text-amber-200 leading-relaxed font-medium">
                          &ldquo;{localizedDialogue}&rdquo;
                        </p>
                        {localizedDialogue !== scene.dialogue && (
                          <p className="text-[11px] text-slate-400 font-mono line-clamp-1 pt-1 border-t border-slate-800/80">
                            <span className="text-slate-500">Source: </span>
                            &ldquo;{scene.dialogue}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5 truncate">
                        <Camera className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                        <span className="truncate">{scene.camera}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <Sun className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                        <span className="truncate">{scene.lighting}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span className="flex items-center gap-1 text-cyan-300">
                        <Film className="w-3 h-3" />
                        <span>
                          {activeMotionMeta.shortLabel} · {activeTransitionMeta.shortLabel} (.{transitionCssClass})
                        </span>
                      </span>
                      <span className="flex items-center gap-1 text-emerald-400">
                        <ImageIcon className="w-3 h-3" />
                        <span>3840x2160 Animated</span>
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Frame Inspection Modal */}
      {previewScene && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Scene {String(previewScene.sceneNumber).padStart(2, '0')}: {previewScene.summary}
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {previewScene.startTime}s - {previewScene.endTime}s · Motion:{' '}
                  {(previewScene.motionPreset || 'pan').toUpperCase()} · Transition:{' '}
                  {(previewScene.transitionPreset || 'cross-fade').toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    speakCharacterDialogue(previewScene, previewScene.sceneNumber - 1)
                  }
                  className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Speak Localized Dialogue</span>
                </button>
                <button
                  onClick={() => setPreviewScene(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {(() => {
              const prevFilterId =
                previewScene.visualFilterPreset && previewScene.visualFilterPreset !== 'default'
                  ? previewScene.visualFilterPreset
                  : mapEmotionToVisualFilter(previewScene.emotion, previewScene.emotionalTone);
              const prevFilterMeta =
                VISUAL_FILTER_PRESETS.find(f => f.id === prevFilterId) || VISUAL_FILTER_PRESETS[0];
              const prevIntensity = previewScene.motionIntensity ?? 1.0;
              const prevDuration =
                previewScene.motionDurationSec ??
                previewScene.duration ??
                Math.max(2, Math.round(previewScene.endTime - previewScene.startTime)) ??
                8;
              const prevEffectiveDuration = Math.max(1.5, Math.min(25, prevDuration / prevIntensity));

              return (
                <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
                  <img
                    src={previewScene.imageUrl}
                    alt={previewScene.summary}
                    style={
                      {
                        filter: prevFilterMeta.cssFilter,
                        objectPosition: 'center center',
                        '--scene-motion-duration': `${prevEffectiveDuration}s`,
                        '--scene-motion-intensity': `${prevIntensity}`
                      } as React.CSSProperties
                    }
                    className={`w-full h-full object-cover ${getMotionPresetCssClass(
                      previewScene.motionPreset,
                      previewScene.sceneNumber - 1
                    )} ${getSceneTransitionCssClass(
                      previewScene.transitionPreset,
                      previewScene.sceneNumber - 1
                    )}`}
                  />
                  <div className="absolute inset-y-0 w-1/3 pointer-events-none bg-gradient-to-r from-transparent via-amber-300/20 to-transparent anamorphic-flare-pass" />
                </div>
              );
            })()}

            <div className="p-4 bg-slate-950/60 border-t border-slate-800 space-y-2 text-xs">
              <div className="text-amber-200 font-mono">
                <span className="text-amber-400 font-semibold">
                  Localized Voiceover ({SUPPORTED_LANGUAGES[selectedLanguage]?.name}):{' '}
                </span>
                &ldquo;{getLocalizedSceneText(previewScene, previewScene.sceneNumber - 1)}&rdquo;
              </div>
              <div className="text-slate-400 font-mono text-[11px] truncate">
                <span className="text-emerald-400 font-semibold">Prepended Visual Prompt: </span>
                {previewScene.visualDescription || previewScene.prompt}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
