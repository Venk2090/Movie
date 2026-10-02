import React from 'react';
import { Project, HardwareInfo } from '../types';

interface DashboardMetricsProps {
  project: Project;
  hardware: HardwareInfo;
}

export const DashboardMetrics: React.FC<DashboardMetricsProps> = ({ project, hardware }) => {
  const targetCount = project.targetLanguages.length;
  const storageMb = Math.round(project.totalStorageBytes / (1024 * 1024));

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <span className="text-xs font-medium text-slate-400 block mb-1">Target Languages</span>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-white font-mono tabular-nums">
            {targetCount}
          </span>
          <span className="text-xs text-slate-400">active streams</span>
        </div>
        <div className="text-[11px] text-slate-500 mt-2 truncate">
          {project.targetLanguages.map(l => l.toUpperCase()).join(', ')}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <span className="text-xs font-medium text-slate-400 block mb-1">Output Resolution</span>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-amber-400 font-mono tabular-nums">
            3840×2160
          </span>
          <span className="text-xs text-slate-400">4K UHD</span>
        </div>
        <div className="text-[11px] text-slate-500 mt-2">
          Ken Burns procedural motion · 30 FPS
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <span className="text-xs font-medium text-slate-400 block mb-1">Hardware & Compute</span>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-emerald-400 font-mono tabular-nums">
            {hardware.cpu.cores} Cores
          </span>
          <span className="text-xs text-slate-400">{hardware.ramGb} GB RAM</span>
        </div>
        <div className="text-[11px] text-slate-500 mt-2 truncate">
          {hardware.gpu.available ? hardware.gpu.name : 'CPU INT8 Quantized CTranslate2'}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <span className="text-xs font-medium text-slate-400 block mb-1">Project Footprint</span>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-white font-mono tabular-nums">
            {storageMb} MB
          </span>
          <span className="text-xs text-slate-400">
            {Math.floor(project.durationSeconds / 60)}m {Math.floor(project.durationSeconds % 60)}s ({project.durationSeconds}s)
          </span>
        </div>
        <div className="text-[11px] text-slate-500 mt-2">
          100% FOSS · No cloud subscriptions
        </div>
      </div>
    </div>
  );
};
