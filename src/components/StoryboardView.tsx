import React, { useState } from 'react';
import { Scene } from '../types';
import { Camera, Sun, Sparkles, RefreshCw, Edit3, Image as ImageIcon, ZoomIn, X, Check } from 'lucide-react';
import { generateSceneArtwork } from '../utils/sceneArt';

interface StoryboardViewProps {
  scenes: Scene[];
  onUpdateScene: (updatedScene: Scene) => void;
}

export const StoryboardView: React.FC<StoryboardViewProps> = ({ scenes, onUpdateScene }) => {
  const [editingSceneId, setEditingSceneId] = useState<number | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [editCamera, setEditCamera] = useState('');
  const [editLighting, setEditLighting] = useState('');
  const [resynthesizingId, setResynthesizingId] = useState<number | null>(null);
  const [previewScene, setPreviewScene] = useState<Scene | null>(null);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);

  const handleStartEdit = (scene: Scene) => {
    setEditingSceneId(scene.id);
    setEditPrompt(scene.visualDescription || scene.prompt);
    setEditCamera(scene.camera);
    setEditLighting(scene.lighting);
  };

  const handleSaveEdit = (scene: Scene) => {
    // Generate fresh visual frame tailored to the updated prompt, camera, and lighting
    const updatedSeed = Math.floor(Math.random() * 900000) + 100000;
    const newArt = generateSceneArtwork({
      id: scene.id,
      sceneNumber: scene.sceneNumber,
      summary: scene.summary,
      visualDescription: editPrompt,
      prompt: editPrompt,
      camera: editCamera,
      lighting: editLighting,
      startTime: scene.startTime,
      endTime: scene.endTime
    });

    onUpdateScene({
      ...scene,
      visualDescription: editPrompt,
      camera: editCamera,
      lighting: editLighting,
      prompt: editPrompt,
      seed: updatedSeed,
      imageUrl: newArt
    });
    setEditingSceneId(null);
  };

  const handleResynthesizeFrame = (scene: Scene) => {
    setResynthesizingId(scene.id);
    setTimeout(() => {
      const updatedSeed = Math.floor(Math.random() * 900000) + 100000;
      const newArt = generateSceneArtwork({
        id: scene.id,
        sceneNumber: scene.sceneNumber,
        summary: scene.summary,
        visualDescription: scene.visualDescription || scene.prompt,
        prompt: scene.prompt,
        camera: scene.camera,
        lighting: scene.lighting,
        startTime: scene.startTime,
        endTime: scene.endTime
      });

      onUpdateScene({
        ...scene,
        seed: updatedSeed,
        imageUrl: newArt
      });
      setResynthesizingId(null);
    }, 400);
  };

  const handleBatchResynthesizeAll = () => {
    setIsBatchGenerating(true);
    setTimeout(() => {
      scenes.forEach(scene => {
        const updatedSeed = Math.floor(Math.random() * 900000) + 100000;
        const newArt = generateSceneArtwork({
          id: scene.id,
          sceneNumber: scene.sceneNumber,
          summary: scene.summary,
          visualDescription: scene.visualDescription || scene.prompt,
          prompt: scene.prompt,
          camera: scene.camera,
          lighting: scene.lighting,
          startTime: scene.startTime,
          endTime: scene.endTime
        });
        onUpdateScene({
          ...scene,
          seed: updatedSeed,
          imageUrl: newArt
        });
      });
      setIsBatchGenerating(false);
    }, 600);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <span>Scene Storyboard &amp; Visual Direction</span>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20">
              AI 4K Synthesis
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Full-duration semantic scene segmentation with camera angles, volumetric lighting, and SDXL ComfyUI prompt orchestration.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-400 font-mono hidden md:inline">
            <span>{scenes.length} Scenes</span> · <span>Deterministic 4K Baseline</span>
          </div>
          <button
            onClick={handleBatchResynthesizeAll}
            disabled={isBatchGenerating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isBatchGenerating ? 'animate-spin' : ''}`} />
            <span>{isBatchGenerating ? 'Synthesizing...' : 'Batch Resynthesize All'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {scenes.map(scene => {
          const isEditing = editingSceneId === scene.id;
          const isGenerating = resynthesizingId === scene.id;

          return (
            <div
              key={scene.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-colors flex flex-col group"
            >
              {/* Scene Visual Frame Thumbnail */}
              <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
                <img
                  src={scene.imageUrl}
                  alt={scene.summary}
                  referrerPolicy="no-referrer"
                  className={`w-full h-full object-cover transition-all duration-500 ${isGenerating ? 'opacity-40 scale-105 blur-xs' : 'group-hover:scale-102'}`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                {/* Top Timeline Badge */}
                <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded text-xs font-mono text-white border border-white/10 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                  <span>Scene {String(scene.sceneNumber).padStart(2, '0')} · {scene.startTime}s - {scene.endTime}s ({scene.duration}s)</span>
                </div>

                {/* Top Right Quick Actions */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  <button
                    onClick={() => setPreviewScene(scene)}
                    className="p-1.5 bg-black/70 hover:bg-black text-slate-200 hover:text-white rounded-md backdrop-blur-md border border-white/10 transition-colors cursor-pointer"
                    title="Enlarge 4K Visual Frame"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleResynthesizeFrame(scene)}
                    disabled={isGenerating}
                    className="p-1.5 bg-black/70 hover:bg-black text-amber-300 hover:text-amber-200 rounded-md backdrop-blur-md border border-white/10 transition-colors cursor-pointer"
                    title="Re-synthesize this Visual Frame"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* Bottom Dialogue Overlay */}
                <div className="absolute bottom-3 left-3 right-3 text-xs text-slate-200 line-clamp-1 pointer-events-none font-medium">
                  {scene.dialogue}
                </div>
              </div>

              {/* Scene Metadata & Prompts */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-medium text-slate-400 block mb-1">Visual Prompt</label>
                      <textarea
                        value={editPrompt}
                        onChange={e => setEditPrompt(e.target.value)}
                        rows={3}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                      />
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
                        onClick={() => handleSaveEdit(scene)}
                        className="px-3 py-1 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer"
                      >
                        Save &amp; Re-synthesize Frame
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <h4 className="text-xs font-semibold text-white mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <span>{scene.summary}</span>
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleResynthesizeFrame(scene)}
                            className="text-slate-400 hover:text-amber-400 transition-colors p-1"
                            title="Resynthesize Visual Frame"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                          </button>
                          <button
                            onClick={() => handleStartEdit(scene)}
                            className="text-slate-400 hover:text-amber-400 transition-colors p-1"
                            title="Edit prompt and camera attributes"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed font-mono text-[11px] bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                        {scene.visualDescription}
                      </p>
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

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>Seed: {scene.seed}</span>
                      <span>Timeline: {scene.startTime}s - {scene.endTime}s</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Frame Inspection Modal */}
      {previewScene && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Scene 0{previewScene.sceneNumber}: {previewScene.summary}
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {previewScene.startTime}s - {previewScene.endTime}s · 4K UHD 3840x2160 Synthesis
                </span>
              </div>
              <button
                onClick={() => setPreviewScene(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative aspect-video w-full bg-slate-950">
              <img
                src={previewScene.imageUrl}
                alt={previewScene.summary}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="p-4 bg-slate-950/60 border-t border-slate-800 space-y-2 text-xs">
              <div className="text-slate-300 font-mono">
                <span className="text-amber-400 font-semibold">Prompt: </span>
                {previewScene.visualDescription || previewScene.prompt}
              </div>
              <div className="flex flex-wrap gap-4 text-slate-400 text-[11px]">
                <span><strong className="text-slate-300">Camera:</strong> {previewScene.camera}</span>
                <span><strong className="text-slate-300">Lighting:</strong> {previewScene.lighting}</span>
                <span><strong className="text-slate-300">Seed:</strong> {previewScene.seed}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
