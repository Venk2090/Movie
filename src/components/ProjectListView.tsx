import React from 'react';
import { Project } from '../types';
import { Play, Download, Trash2, Clock, Globe, HardDrive, CheckCircle2, AlertCircle, Plus } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../data/languages';

interface ProjectListViewProps {
  projects: Project[];
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;
  onOpenCreateModal: () => void;
  onDeleteProject: (projectId: string) => void;
  onExportZip: (projectId: string) => void;
}

export const ProjectListView: React.FC<ProjectListViewProps> = ({
  projects,
  selectedProjectId,
  onSelectProject,
  onOpenCreateModal,
  onDeleteProject,
  onExportZip
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-white">Project Workspaces &amp; Media Archives</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage multilingual video workflows, inspect intermediate transcripts, and download complete language archives.
          </p>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {projects.map(proj => {
          const isSelected = proj.id === selectedProjectId;
          const storageMb = Math.round(proj.totalStorageBytes / (1024 * 1024));

          return (
            <div
              key={proj.id}
              className={`p-5 rounded-2xl border transition-all ${
                isSelected
                  ? 'bg-slate-900 border-amber-400/60 shadow-lg'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2 cursor-pointer flex-1" onClick={() => onSelectProject(proj.id)}>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white hover:text-amber-400 transition-colors">
                      {proj.name}
                    </h3>
                    <span className="text-[11px] font-mono text-slate-400">({proj.id})</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium ${
                        proj.status === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : proj.status === 'RUNNING'
                          ? 'bg-amber-400/10 text-amber-300 border border-amber-400/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {proj.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-1">
                    {proj.description || 'Multilingual localization project'}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-amber-400" />
                      <span>{proj.targetLanguages.length} Languages</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{Math.floor(proj.durationSeconds / 60)}m {Math.floor(proj.durationSeconds % 60)}s ({proj.durationSeconds}s)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                      <span>{storageMb} MB allocated</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Resolution: {proj.resolution.toUpperCase()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onSelectProject(proj.id)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 cursor-pointer"
                  >
                    Open Studio
                  </button>

                  <button
                    onClick={() => onExportZip(proj.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer"
                    title="Download complete ZIP with all 11 languages, videos, and SRT files"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download ZIP</span>
                  </button>

                  {projects.length > 1 && (
                    <button
                      onClick={() => onDeleteProject(proj.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors"
                      title="Delete project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
