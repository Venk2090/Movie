import React, { useState } from 'react';
import {
  Project,
  Scene,
  TranscriptSegment,
  SceneDepictionMode,
  CharacterConsistencyConfig
} from '../types';
import {
  ShieldCheck,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Edit3,
  FileCheck,
  UserCheck,
  Clock,
  CheckSquare,
  Square
} from 'lucide-react';
import {
  generateSceneArtwork,
  getDefaultMotionPresetForIndex,
  getDefaultTransitionPresetForIndex,
  prependCharacterConsistencyToPrompt,
  DEFAULT_CHARACTER_CONSISTENCY,
  ALL_PHOTOREALISTIC_HUMAN_FRAMES
} from '../utils/sceneArt';

interface HumanReviewCheckpointProps {
  project: Project;
  onUpdateScene: (updatedScene: Scene) => void;
  onBatchUpdateScenes?: (updatedScenes: Scene[], actionLabel?: string) => void;
  onRegenerateSingleScene: (sceneId: number) => void;
  onRegenerateSelectedScenes?: (sceneIds: number[]) => void;
  onUpdateTranscriptSegment: (updatedSegment: TranscriptSegment) => void;
  onToggleReviewLock: (locked: boolean) => void;
  onApproveAllScenes: () => void;
  onSelectSceneInStoryboard?: (scene: Scene, index: number) => void;
  characterConsistency?: CharacterConsistencyConfig;
}

export const HumanReviewCheckpoint: React.FC<HumanReviewCheckpointProps> = ({
  project,
  onUpdateScene,
  onBatchUpdateScenes,
  onRegenerateSingleScene,
  onRegenerateSelectedScenes,
  onUpdateTranscriptSegment,
  onToggleReviewLock,
  onApproveAllScenes,
  onSelectSceneInStoryboard,
  characterConsistency = DEFAULT_CHARACTER_CONSISTENCY
}) => {
  const [editingSegId, setEditingSegId] = useState<number | null>(null);
  const [segDraftText, setSegDraftText] = useState<string>('');
  const [segDraftStart, setSegDraftStart] = useState<number>(0);
  const [segDraftEnd, setSegDraftEnd] = useState<number>(0);
  const [segDraftSpeaker, setSegDraftSpeaker] = useState<string>('');
  const [selectedSceneIds, setSelectedSceneIds] = useState<number[]>([]);
  const [isBatchRegenerating, setIsBatchRegenerating] = useState<boolean>(false);

  const isLocked = Boolean(project.humanReviewLocked);
  const scenes = project.scenes || [];
  const segments = project.cleanTranscript || [];

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

  const handleRegenerateSelectedBatch = () => {
    if (isLocked || selectedSceneIds.length === 0) return;
    setIsBatchRegenerating(true);

    if (onRegenerateSelectedScenes) {
      onRegenerateSelectedScenes(selectedSceneIds);
      setTimeout(() => setIsBatchRegenerating(false), 300);
      return;
    }

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
        project.name || scene.summary,
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
        `Regenerated ${updatedBatch.length} selected scene(s) from Human Review Checkpoint`
      );
    } else {
      updatedBatch.forEach(sc => onUpdateScene(sc));
    }

    setTimeout(() => setIsBatchRegenerating(false), 300);
  };

  const approvedScenes = scenes.filter(
    s => s.reviewStatus === 'approved' || (s.reviewStatus === undefined && s.approved === true)
  );
  const rejectedScenes = scenes.filter(s => s.reviewStatus === 'rejected');
  const pendingScenes = scenes.filter(
    s => s.reviewStatus !== 'approved' && s.reviewStatus !== 'rejected' && !s.approved
  );

  const handleSetSceneReviewStatus = (
    scene: Scene,
    status: 'approved' | 'rejected' | 'pending'
  ) => {
    if (isLocked) return;
    onUpdateScene({
      ...scene,
      reviewStatus: status,
      approved: status === 'approved',
      userEdited: true
    });
  };

  const handleStartEditSegment = (seg: TranscriptSegment) => {
    if (isLocked) return;
    setEditingSegId(seg.id);
    setSegDraftText(seg.text);
    setSegDraftStart(seg.start);
    setSegDraftEnd(seg.end);
    setSegDraftSpeaker(seg.speakerLabel || seg.speaker || '');
  };

  const handleSaveSegment = (seg: TranscriptSegment) => {
    if (isLocked) return;
    const validStart = Math.max(0, Number(segDraftStart) || 0);
    const validEnd = Math.max(validStart + 0.5, Number(segDraftEnd) || validStart + 2);
    onUpdateTranscriptSegment({
      ...seg,
      text: segDraftText.trim() || seg.text,
      start: validStart,
      end: validEnd,
      speakerLabel: segDraftSpeaker.trim() || undefined,
      userReviewed: true,
      needsReview: false
    });
    setEditingSegId(null);
  };

  return (
    <div
      className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 mb-8 shadow-xl"
      data-testid="human-review-checkpoint"
    >
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 mb-5 border-b border-slate-800">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${
              isLocked
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : 'bg-amber-400/15 border-amber-400/40 text-amber-300'
            }`}
          >
            {isLocked ? <Lock className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-white">
                Human Review Checkpoint — Transcript, Scene Boundaries &amp; Approval Gate
              </h2>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold border ${
                  isLocked
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : rejectedScenes.length > 0
                    ? 'bg-red-500/20 text-red-300 border-red-500/40'
                    : 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                }`}
              >
                {isLocked
                  ? 'LOCKED FOR FINAL GENERATIVE RENDER'
                  : rejectedScenes.length > 0
                  ? `${rejectedScenes.length} SCENE(S) REJECTED — NEEDS REVISION`
                  : 'OPEN FOR HUMAN REVIEW & EDITS'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Verify transcript accuracy, adjust scene timestamps or speaker depiction modes, approve/reject individual scenes, and lock edits before launching final generative rendering.
            </p>
          </div>
        </div>

        {/* Primary Checkpoint Actions */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {!isLocked && (
            <button
              type="button"
              onClick={onApproveAllScenes}
              className="px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Approve All ({scenes.length}) Scenes</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onToggleReviewLock(!isLocked)}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-md ${
              isLocked
                ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/40'
                : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
            }`}
          >
            {isLocked ? (
              <>
                <Unlock className="w-3.5 h-3.5" />
                <span>Unlock Edits &amp; Boundaries</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>Lock Edits &amp; Ready Final Render</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Summary Telemetry Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] font-mono text-slate-400 uppercase block">
            Transcript Segments
          </span>
          <div className="text-sm font-bold text-white mt-0.5 flex items-center gap-1.5">
            <FileCheck className="w-4 h-4 text-cyan-400" />
            <span>{segments.length} Verified Lines</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            Provenance: {project.transcriptProvenance || 'source_verified'}
          </span>
        </div>

        <div className="bg-slate-950/90 border border-emerald-500/25 rounded-xl p-3">
          <span className="text-[10px] font-mono text-emerald-400 uppercase block">
            Approved Scenes
          </span>
          <div className="text-sm font-bold text-emerald-300 mt-0.5 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {approvedScenes.length} / {scenes.length} Approved
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            Ready for final render
          </span>
        </div>

        <div className="bg-slate-950/90 border border-red-500/25 rounded-xl p-3">
          <span className="text-[10px] font-mono text-red-400 uppercase block">
            Rejected Scenes
          </span>
          <div className="text-sm font-bold text-red-300 mt-0.5 flex items-center gap-1.5">
            <XCircle className="w-4 h-4" />
            <span>{rejectedScenes.length} Rejected</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            {rejectedScenes.length > 0 ? 'Regenerate or edit below' : '0 blockers'}
          </span>
        </div>

        <div className="bg-slate-950/90 border border-amber-500/25 rounded-xl p-3">
          <span className="text-[10px] font-mono text-amber-400 uppercase block">
            Pending Review
          </span>
          <div className="text-sm font-bold text-amber-300 mt-0.5 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            <span>{pendingScenes.length} Pending</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            {isLocked ? 'Boundaries Locked' : 'Editable'}
          </span>
        </div>
      </div>

      {/* Two-Column Checkpoint Grid: Transcript Segments (Left) + Scene Boundary & Approval Matrix (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Column 1: Source Transcript & Timestamp Editor */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col">
          <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-800">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>1. Source Transcript &amp; Timestamp Boundaries</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {isLocked ? 'Locked' : 'Click Edit on any segment'}
            </span>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1 scrollbar-thin">
            {segments.map((seg, idx) => {
              const isEditingThis = editingSegId === seg.id;
              return (
                <div
                  key={`review-seg-${seg.id}-${idx}`}
                  className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs space-y-1.5"
                >
                  {isEditingThis ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] font-mono text-slate-400 block">
                            Start (s)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={segDraftStart}
                            onChange={e => setSegDraftStart(parseFloat(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-mono text-slate-400 block">
                            End (s)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={segDraftEnd}
                            onChange={e => setSegDraftEnd(parseFloat(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-mono text-slate-400 block">
                            Speaker Label
                          </label>
                          <input
                            type="text"
                            value={segDraftSpeaker}
                            onChange={e => setSegDraftSpeaker(e.target.value)}
                            placeholder="e.g. Narrator"
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                          />
                        </div>
                      </div>
                      <textarea
                        rows={2}
                        value={segDraftText}
                        onChange={e => setSegDraftText(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingSegId(null)}
                          className="px-2.5 py-1 text-[11px] text-slate-400 hover:text-white cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveSegment(seg)}
                          className="px-3 py-1 rounded bg-amber-400 text-slate-950 font-bold text-[11px] cursor-pointer"
                        >
                          Save Segment
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <div className="flex items-center gap-2">
                          <span className="text-cyan-300 font-bold">Seg #{seg.id}</span>
                          <span className="text-slate-400">
                            {seg.start}s &rarr; {seg.end}s
                          </span>
                          {(seg.speakerLabel || seg.speaker) && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px]">
                              {seg.speakerLabel || seg.speaker}
                            </span>
                          )}
                        </div>
                        {!isLocked && (
                          <button
                            type="button"
                            onClick={() => handleStartEditSegment(seg)}
                            className="text-slate-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        )}
                      </div>
                      <p className="text-slate-200 leading-relaxed">{seg.text}</p>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 2: Scene Approval, Depiction Mode & Batch / Single-Scene Regeneration */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col">
          <div className="flex items-center justify-between gap-2 flex-wrap pb-2.5 mb-3 border-b border-slate-800">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>2. Scene Review State (Approve / Reject / Regenerate)</span>
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                disabled={isLocked || scenes.length === 0}
                onClick={handleToggleSelectAllScenes}
                className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-mono flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {selectedSceneIds.length === scenes.length && scenes.length > 0 ? (
                  <CheckSquare className="w-3 h-3 text-amber-400" />
                ) : (
                  <Square className="w-3 h-3 text-slate-400" />
                )}
                <span>
                  {selectedSceneIds.length === scenes.length && scenes.length > 0
                    ? 'Deselect All'
                    : 'Select All'}
                </span>
              </button>

              <button
                type="button"
                disabled={isLocked || selectedSceneIds.length === 0 || isBatchRegenerating}
                onClick={handleRegenerateSelectedBatch}
                className="px-2.5 py-1 rounded bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-mono font-bold text-[10px] flex items-center gap-1 cursor-pointer shadow-xs transition-colors"
                title="Trigger generateSceneArtwork utility for all selected scenes in a single batch"
              >
                <RefreshCw className={`w-3 h-3 ${isBatchRegenerating ? 'animate-spin' : ''}`} />
                <span>
                  {isBatchRegenerating
                    ? 'Regenerating...'
                    : `Regenerate Selected${selectedSceneIds.length > 0 ? ` (${selectedSceneIds.length})` : ''}`}
                </span>
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1 scrollbar-thin">
            {scenes.map((sc, idx) => {
              const status =
                sc.reviewStatus || (sc.approved ? 'approved' : 'pending');
              const segIds = sc.transcriptSegmentIds || sc.segmentIds || [idx + 1];
              const isChecked = selectedSceneIds.includes(sc.id);

              return (
                <div
                  key={`review-scene-${sc.id}-${idx}`}
                  className={`p-2.5 rounded-lg border text-xs space-y-2 transition-colors ${
                    isChecked
                      ? 'bg-amber-500/10 border-amber-400/50'
                      : status === 'approved'
                      ? 'bg-emerald-950/20 border-emerald-500/35'
                      : status === 'rejected'
                      ? 'bg-red-950/25 border-red-500/40'
                      : 'bg-slate-900/90 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        disabled={isLocked}
                        checked={isChecked}
                        onChange={() => toggleSceneSelection(sc.id)}
                        aria-label={`Select Scene ${sc.sceneNumber}`}
                        className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-950 text-amber-400 focus:ring-amber-400 cursor-pointer accent-amber-400"
                      />
                      <button
                        type="button"
                        onClick={() => onSelectSceneInStoryboard?.(sc, idx)}
                        className="font-mono font-bold text-amber-300 hover:underline cursor-pointer"
                      >
                        Scene {String(sc.sceneNumber).padStart(2, '0')}
                      </button>
                      <span className="text-[11px] font-mono text-slate-400">
                        ({sc.startTime}s - {sc.endTime}s · Seg #{segIds.join(',#')})
                      </span>
                    </div>

                    {/* Approve / Reject / Regenerate Controls */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={isLocked}
                        onClick={() => handleSetSceneReviewStatus(sc, 'approved')}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border flex items-center gap-1 cursor-pointer disabled:opacity-50 ${
                          status === 'approved'
                            ? 'bg-emerald-400 text-slate-950 border-emerald-300'
                            : 'bg-slate-950 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Approve</span>
                      </button>

                      <button
                        type="button"
                        disabled={isLocked}
                        onClick={() => handleSetSceneReviewStatus(sc, 'rejected')}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border flex items-center gap-1 cursor-pointer disabled:opacity-50 ${
                          status === 'rejected'
                            ? 'bg-red-400 text-slate-950 border-red-300'
                            : 'bg-slate-950 text-red-300 border-red-500/30 hover:bg-red-500/20'
                        }`}
                      >
                        <XCircle className="w-3 h-3" />
                        <span>Reject</span>
                      </button>

                      <button
                        type="button"
                        disabled={isLocked}
                        onClick={() => onRegenerateSingleScene(sc.id)}
                        className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/30 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title="Regenerate only this scene from transcript without rerunning the entire project"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Regenerate</span>
                      </button>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-200 font-medium line-clamp-1">
                    {sc.summary}
                  </div>

                  {/* Depiction Mode Selector (Separates Spoken Narrator from Visuals) */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80 text-[10px] font-mono">
                    <span className="text-slate-400">Visual Depiction Mode:</span>
                    <select
                      disabled={isLocked}
                      value={sc.depictionMode || 'environment_broll'}
                      onChange={e =>
                        onUpdateScene({
                          ...sc,
                          depictionMode: e.target.value as SceneDepictionMode,
                          userEdited: true
                        })
                      }
                      className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-[10px] text-cyan-300 focus:outline-none focus:border-amber-400"
                    >
                      <option value="environment_broll">
                        Narrator Over B-Roll / Environment (No Fake Speaker)
                      </option>
                      <option value="mentioned_subject_context">
                        Mentioned Subject / Institutional Context
                      </option>
                      <option value="verified_speaker">
                        Verified On-Camera Speaker
                      </option>
                      <option value="illustrative_metaphor">
                        Cinematic Visual Metaphor
                      </option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
