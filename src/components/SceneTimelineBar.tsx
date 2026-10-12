import React from 'react';
import { Scene } from '../types';
import {
  Clock,
  Film,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Crosshair
} from 'lucide-react';

interface SceneTimelineBarProps {
  scenes: Scene[];
  totalDurationSeconds: number;
  selectedSceneId?: number | null;
  onSelectScene: (scene: Scene, index: number) => void;
  title?: string;
  subtitle?: string;
  variant?: 'dashboard' | 'storyboard';
}

function formatTimecode(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hrs > 0) return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  return `${pad(mins)}:${pad(secs)}`;
}

export const SceneTimelineBar: React.FC<SceneTimelineBarProps> = ({
  scenes,
  totalDurationSeconds,
  selectedSceneId,
  onSelectScene,
  title = 'Global Scene Timeline',
  subtitle = 'Click any time-proportional segment to focus and scroll directly to the corresponding transcript-aligned scene in StoryboardView',
  variant = 'storyboard'
}) => {
  if (!scenes || scenes.length === 0) return null;

  const lastSceneEnd = scenes.reduce((max, s) => Math.max(max, s.endTime || 0), 0);
  const effectiveTotalDuration = Math.max(totalDurationSeconds || 0, lastSceneEnd, 1);

  const approvedCount = scenes.filter(
    s => s.reviewStatus === 'approved' || (s.reviewStatus === undefined && s.approved === true)
  ).length;
  const rejectedCount = scenes.filter(s => s.reviewStatus === 'rejected').length;
  const pendingCount = scenes.length - approvedCount - rejectedCount;

  const handleSegmentClick = (scene: Scene, idx: number) => {
    onSelectScene(scene, idx);
    // Smoothly scroll and focus the target scene card in StoryboardView if mounted in DOM
    if (typeof document !== 'undefined') {
      const targetEl = document.getElementById(`storyboard-scene-${scene.id}`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetEl.focus({ preventScroll: true });
      }
    }
  };

  return (
    <div
      className={`bg-slate-900/95 border rounded-2xl p-4 sm:p-5 shadow-xl ${
        variant === 'dashboard'
          ? 'border-cyan-500/30 mb-6'
          : 'border-amber-400/30 mb-6'
      }`}
      data-testid={`scene-timeline-${variant}`}
    >
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3.5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`p-1.5 rounded-lg border ${
                variant === 'dashboard'
                  ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                  : 'bg-amber-400/15 text-amber-300 border-amber-400/30'
              }`}
            >
              <Film className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-white tracking-wide">{title}</h3>
            <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800 text-[11px] font-mono">
              {scenes.length} Scenes · 00:00 &rarr; {formatTimecode(effectiveTotalDuration)} ({Math.round(effectiveTotalDuration)}s)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
        </div>

        {/* Review Status Legend */}
        <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono shrink-0">
          <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>{approvedCount} Approved</span>
          </span>
          {rejectedCount > 0 && (
            <span className="px-2 py-0.5 rounded bg-red-500/15 text-red-300 border border-red-500/30 flex items-center gap-1">
              <XCircle className="w-3 h-3" />
              <span>{rejectedCount} Rejected</span>
            </span>
          )}
          <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            <span>{pendingCount} Pending</span>
          </span>
        </div>
      </div>

      {/* Time-Proportional Interactive Track */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-0.5">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>00:00 (0.0s)</span>
          </span>
          <span>{formatTimecode(effectiveTotalDuration * 0.25)}</span>
          <span>{formatTimecode(effectiveTotalDuration * 0.5)}</span>
          <span>{formatTimecode(effectiveTotalDuration * 0.75)}</span>
          <span className="text-amber-300 font-semibold">
            {formatTimecode(effectiveTotalDuration)} ({effectiveTotalDuration.toFixed(1)}s)
          </span>
        </div>

        <div className="relative w-full h-14 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex p-1 gap-1">
          {scenes.map((scene, idx) => {
            const rawSpan = Math.max(0.5, (scene.endTime || 0) - (scene.startTime || 0));
            const widthPct = Math.max(2.5, (rawSpan / effectiveTotalDuration) * 100);
            const isSelected = selectedSceneId === scene.id;
            const status =
              scene.reviewStatus || (scene.approved ? 'approved' : 'pending');

            const statusColorClass =
              status === 'approved'
                ? 'bg-emerald-500/20 hover:bg-emerald-500/35 border-emerald-500/50 text-emerald-200'
                : status === 'rejected'
                ? 'bg-red-500/20 hover:bg-red-500/35 border-red-500/50 text-red-200'
                : 'bg-cyan-500/15 hover:bg-amber-400/25 border-slate-700 hover:border-amber-400/60 text-slate-200';

            return (
              <button
                key={`timeline-seg-${scene.id}-${idx}`}
                type="button"
                onClick={() => handleSegmentClick(scene, idx)}
                style={{ width: `${widthPct}%` }}
                className={`group relative h-full rounded-lg border transition-all flex flex-col justify-between p-1.5 text-left overflow-hidden cursor-pointer focus:outline-none ${statusColorClass} ${
                  isSelected
                    ? 'ring-2 ring-amber-400 bg-amber-400/25 border-amber-300 z-10'
                    : ''
                }`}
                title={`Scene ${String(scene.sceneNumber).padStart(2, '0')} (${scene.startTime}s - ${scene.endTime}s): ${scene.summary}`}
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <span className="text-[10px] font-mono font-bold truncate">
                    S{String(scene.sceneNumber).padStart(2, '0')}
                  </span>
                  {isSelected && (
                    <Crosshair className="w-2.5 h-2.5 text-amber-300 shrink-0 animate-pulse" />
                  )}
                </div>
                <div className="text-[9px] font-mono opacity-85 truncate w-full">
                  {scene.startTime}s-{scene.endTime}s
                </div>
              </button>
            );
          })}
        </div>

        {/* Compact Scrollable Scene Pill Strip for Long Timelines */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 scrollbar-thin">
          {scenes.map((scene, idx) => {
            const isSelected = selectedSceneId === scene.id;
            const status =
              scene.reviewStatus || (scene.approved ? 'approved' : 'pending');
            const segIds = scene.transcriptSegmentIds || scene.segmentIds || [idx + 1];

            return (
              <button
                key={`timeline-pill-${scene.id}-${idx}`}
                type="button"
                onClick={() => handleSegmentClick(scene, idx)}
                className={`shrink-0 px-2.5 py-1 rounded-lg border text-[11px] font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold shadow-sm'
                    : status === 'approved'
                    ? 'bg-emerald-950/50 text-emerald-300 border-emerald-500/30 hover:border-emerald-400'
                    : status === 'rejected'
                    ? 'bg-red-950/50 text-red-300 border-red-500/30 hover:border-red-400'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-amber-400/50 hover:text-white'
                }`}
              >
                <span>Scene {String(scene.sceneNumber).padStart(2, '0')}</span>
                <span className="opacity-75">
                  ({formatTimecode(scene.startTime)}-{formatTimecode(scene.endTime)})
                </span>
                <span className="text-[9px] px-1 rounded bg-black/30">
                  Seg #{segIds.join(',#')}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
