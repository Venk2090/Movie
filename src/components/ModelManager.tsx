import React from 'react';
import { ModelInfo } from '../types';
import { Check, Download, AlertTriangle, ShieldCheck, HardDrive, Cpu } from 'lucide-react';

interface ModelManagerProps {
  models: ModelInfo[];
  onToggleInstall: (modelId: string) => void;
}

export const ModelManager: React.FC<ModelManagerProps> = ({ models, onToggleInstall }) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-white">Model Registry &amp; Open Source Weights</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit weights, licenses, VRAM thresholds, and commercial permissiveness. Zero hidden cloud API dependencies.
          </p>
        </div>
        <div className="text-xs text-emerald-400 font-mono flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4" />
          <span>FOSS Compliance Verified</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {models.map(model => (
          <div
            key={model.id}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 hover:border-slate-700 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-mono text-amber-400 font-medium block">
                  {model.category}
                </span>
                <h3 className="text-sm font-semibold text-white mt-0.5">{model.name}</h3>
                <span className="text-xs text-slate-400">Provider: {model.provider}</span>
              </div>

              <span
                className={`text-[11px] px-2 py-0.5 rounded font-mono font-medium ${
                  model.installed
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {model.installed ? 'Installed' : 'Available'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-slate-950/70 border border-slate-800/80 rounded-lg text-[11px] font-mono">
              <div>
                <span className="text-slate-400 block">Disk Size</span>
                <span className="text-white font-medium">{model.sizeMb} MB</span>
              </div>
              <div>
                <span className="text-slate-400 block">Min VRAM</span>
                <span className="text-white font-medium">{model.vramReqGb} GB</span>
              </div>
              <div>
                <span className="text-slate-400 block">License</span>
                <span className="text-amber-300 font-medium">{model.license}</span>
              </div>
            </div>

            {model.restrictions && (
              <div className="text-[11px] text-slate-400 leading-relaxed bg-slate-950/40 p-2.5 rounded border border-slate-800 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>{model.restrictions}</span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
              <span
                className={`font-medium ${
                  model.commercial ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {model.commercial ? 'Commercial Use: Permitted' : 'Non-Commercial License'}
              </span>

              <button
                onClick={() => onToggleInstall(model.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                  model.installed
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    : 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold'
                }`}
              >
                {model.installed ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Configured</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Weights</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
