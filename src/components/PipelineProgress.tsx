import React from 'react';
import { Project, PipelineStage } from '../types';
import { CheckCircle2, Loader2, AlertCircle, RefreshCw, XCircle, ArrowRight } from 'lucide-react';

interface PipelineProgressProps {
  project: Project;
  onRetry: () => void;
  onCancel: () => void;
}

export const PipelineProgress: React.FC<PipelineProgressProps> = ({ project, onRetry, onCancel }) => {
  const isRunning = project.status === 'RUNNING';
  const isFailed = project.status === 'FAILED';
  const isCompleted = project.status === 'COMPLETED';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
      {/* Top Header with Status & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-white">Pipeline Execution Status</h3>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-medium ${
                isCompleted
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : isRunning
                  ? 'bg-amber-400/10 text-amber-300 border border-amber-400/20 animate-pulse'
                  : isFailed
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {project.status} · {Math.round(project.progress)}%
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {project.name} · Project ID: <span className="font-mono text-slate-300">{project.id}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isRunning && (
            <button
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 bg-red-950/40 border border-red-800/40 rounded-lg hover:bg-red-900/40 transition-colors cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancel Run</span>
            </button>
          )}

          {isFailed && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Stage</span>
            </button>
          )}

          {isCompleted && (
            <div className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              <span>All 11 Streams Ready</span>
            </div>
          )}
        </div>
      </div>

      {/* High-level Overall Progress Bar */}
      <div className="mb-6">
        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
          <div
            className="bg-gradient-to-r from-amber-400 to-emerald-400 h-2 transition-all duration-300 rounded-full"
            style={{ width: `${Math.min(100, Math.max(0, project.progress))}%` }}
          />
        </div>
      </div>

      {/* Visual Pipeline Stages Infographic */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        {project.stages.map((stage: PipelineStage, index: number) => {
          const isStageCompleted = stage.status === 'COMPLETED';
          const isStageRunning = stage.status === 'RUNNING';
          const isStageFailed = stage.status === 'FAILED';

          return (
            <div
              key={stage.id}
              className={`p-3 rounded-xl border transition-all ${
                isStageCompleted
                  ? 'bg-slate-950/80 border-slate-800'
                  : isStageRunning
                  ? 'bg-slate-800/80 border-amber-400 shadow-sm shadow-amber-400/10'
                  : isStageFailed
                  ? 'bg-red-950/20 border-red-800'
                  : 'bg-slate-950/40 border-slate-800/60 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono text-slate-400">0{index + 1}</span>
                {isStageCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : isStageRunning ? (
                  <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                ) : isStageFailed ? (
                  <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-slate-700" />
                )}
              </div>
              <div className="text-xs font-medium text-slate-200 truncate">{stage.label}</div>
              <div className="text-[10px] text-slate-400 truncate mt-0.5">
                {stage.modelUsed || 'FOSS Core'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Real-time Activity Logs */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-300">Live Stage Activity Logs</span>
          <span className="text-[10px] text-slate-400 font-mono">UTF-8 Local Log Stream</span>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-[11px] text-slate-300 max-h-36 overflow-y-auto space-y-1.5">
          {project.logs.length === 0 ? (
            <div className="text-slate-600">No active log entries recorded yet.</div>
          ) : (
            project.logs.slice(-8).map((log, idx) => (
              <div key={idx} className="flex items-start gap-2.5">
                <span className="text-slate-400 shrink-0">{log.timestamp}</span>
                <span className="text-amber-400/80 shrink-0">[{log.stage}]</span>
                <span className="text-slate-300 truncate">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
