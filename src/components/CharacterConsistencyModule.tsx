import React, { useState, useEffect } from 'react';
import { CharacterConsistencyConfig } from '../types';
import {
  CHARACTER_CONSISTENCY_PRESETS,
  compileCharacterConsistencyPrompt
} from '../utils/sceneArt';
import {
  UserCheck,
  Sparkles,
  Shirt,
  Scissors,
  Eye,
  Lock,
  Unlock,
  CheckCircle2,
  Sliders
} from 'lucide-react';

interface CharacterConsistencyModuleProps {
  config: CharacterConsistencyConfig;
  sceneCount: number;
  onApplyConfig: (updatedConfig: CharacterConsistencyConfig) => void;
}

export const CharacterConsistencyModule: React.FC<CharacterConsistencyModuleProps> = ({
  config,
  sceneCount,
  onApplyConfig
}) => {
  const [localConfig, setLocalConfig] = useState<CharacterConsistencyConfig>(config);
  const [customPromptOverride, setCustomPromptOverride] = useState<boolean>(false);
  const [justApplied, setJustApplied] = useState<boolean>(false);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleFieldChange = (
    field: keyof Omit<CharacterConsistencyConfig, 'enabled' | 'compiledPrompt'>,
    value: string
  ) => {
    setLocalConfig(prev => {
      const next = { ...prev, [field]: value };
      if (!customPromptOverride) {
        next.compiledPrompt = compileCharacterConsistencyPrompt(next);
      }
      return next;
    });
  };

  const handleSelectPreset = (presetId: string) => {
    const found = CHARACTER_CONSISTENCY_PRESETS.find(p => p.id === presetId);
    if (!found) return;
    const compiledPrompt = compileCharacterConsistencyPrompt({
      ...found.config,
      enabled: true
    });
    const updated: CharacterConsistencyConfig = {
      ...found.config,
      enabled: true,
      compiledPrompt
    };
    setCustomPromptOverride(false);
    setLocalConfig(updated);
    onApplyConfig(updated);
    setJustApplied(true);
    setTimeout(() => setJustApplied(false), 1800);
  };

  const handleToggleEnabled = () => {
    const updated: CharacterConsistencyConfig = {
      ...localConfig,
      enabled: !localConfig.enabled,
      compiledPrompt:
        localConfig.compiledPrompt || compileCharacterConsistencyPrompt(localConfig)
    };
    setLocalConfig(updated);
    onApplyConfig(updated);
  };

  const handleApplyToAllScenes = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCompiled =
      customPromptOverride && localConfig.compiledPrompt.trim()
        ? localConfig.compiledPrompt.trim()
        : compileCharacterConsistencyPrompt(localConfig);
    const updated: CharacterConsistencyConfig = {
      ...localConfig,
      enabled: true,
      compiledPrompt: finalCompiled
    };
    setLocalConfig(updated);
    onApplyConfig(updated);
    setJustApplied(true);
    setTimeout(() => setJustApplied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6 shadow-xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
            <UserCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-white tracking-wide">
                Character Consistency Module (Persistent Visual Prompt Lock)
              </h3>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                  localConfig.enabled
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {localConfig.enabled ? (
                  <>
                    <Lock className="w-3 h-3" />
                    <span>PERSISTENT CHARACTER LOCK ACTIVE ({sceneCount} SCENES)</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-3 h-3" />
                    <span>AUTO-TRANSCRIPT CHARACTER MODE</span>
                  </>
                )}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Define persistent character description, clothing, and hairstyle to prepend to all scene artwork generation prompts across the full-length video.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleToggleEnabled}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer ${
              localConfig.enabled
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {localConfig.enabled ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            <span>{localConfig.enabled ? 'Consistency Enabled' : 'Enable Consistency Lock'}</span>
          </button>
        </div>
      </div>

      {/* Quick Character Persona Presets */}
      <div className="mt-3 mb-4 flex items-center gap-2 overflow-x-auto pb-1.5">
        <span className="text-[11px] font-mono text-slate-400 shrink-0 flex items-center gap-1">
          <Sliders className="w-3 h-3 text-amber-400" />
          <span>Persona Presets:</span>
        </span>
        {CHARACTER_CONSISTENCY_PRESETS.map(preset => {
          const isCurrent = localConfig.characterName === preset.config.characterName;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap border transition-colors cursor-pointer ${
                isCurrent
                  ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Persistent Character Attributes Form */}
      <form onSubmit={handleApplyToAllScenes} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Character Identity & Description */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2">
            <label className="text-[11px] font-mono font-semibold text-amber-400 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5" />
              <span>1. CHARACTER NAME &amp; PERSONA</span>
            </label>
            <input
              type="text"
              value={localConfig.characterName}
              onChange={e => handleFieldChange('characterName', e.target.value)}
              placeholder="e.g., Lead Broadcast Anchor"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
            />
            <label className="text-[10px] font-mono text-slate-400 block pt-1">
              Facial Description &amp; Expression:
            </label>
            <textarea
              rows={2}
              value={localConfig.description}
              onChange={e => handleFieldChange('description', e.target.value)}
              placeholder="e.g., Authoritative South Asian presenter, warm complexion..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400 resize-none"
            />
          </div>

          {/* 2. Clothing / Attire */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2">
            <label className="text-[11px] font-mono font-semibold text-cyan-400 flex items-center gap-1.5">
              <Shirt className="w-3.5 h-3.5" />
              <span>2. PERSISTENT CLOTHING / ATTIRE</span>
            </label>
            <textarea
              rows={4}
              value={localConfig.clothing}
              onChange={e => handleFieldChange('clothing', e.target.value)}
              placeholder="e.g., Charcoal Bandhgala Waistcoat over Crisp White Kurta Collar with Saffron Pocket Square"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 resize-none"
            />
            <span className="text-[10px] text-slate-500 font-mono block">
              Supports: Charcoal Bandhgala, Navy Suit, Ivory Lab Coat, Royal Blazer, Black Robe
            </span>
          </div>

          {/* 3. Hairstyle & Facial Hair */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2">
            <label className="text-[11px] font-mono font-semibold text-purple-400 flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5" />
              <span>3. HAIRSTYLE &amp; FACIAL HAIR</span>
            </label>
            <textarea
              rows={4}
              value={localConfig.hairstyle}
              onChange={e => handleFieldChange('hairstyle', e.target.value)}
              placeholder="e.g., Silver-streaked parted dark hair with neatly groomed beard"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-400 resize-none"
            />
            <span className="text-[10px] text-slate-500 font-mono block">
              Supports: Silver-streaked, Silver-white crown, Wavy dark, Long bun, Beard / Clean-shaven
            </span>
          </div>

          {/* 4. Accessories & Studio Props */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2">
            <label className="text-[11px] font-mono font-semibold text-emerald-400 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              <span>4. ACCESSORIES &amp; PROPS</span>
            </label>
            <textarea
              rows={4}
              value={localConfig.accessories}
              onChange={e => handleFieldChange('accessories', e.target.value)}
              placeholder="e.g., Rimless broadcast glasses, wireless ear-monitor, dual podium mics"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-400 resize-none"
            />
            <span className="text-[10px] text-slate-500 font-mono block">
              Supports: Glasses / No glasses, Headset mic, Podium microphones
            </span>
          </div>
        </div>

        {/* Compiled Persistent Visual Prompt Preview + Apply Action */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[11px] font-mono font-semibold text-amber-300">
                PERSISTENT VISUAL PROMPT (PREPENDED TO ALL SCENE ARTWORK PROMPTS IN APP.TSX):
              </span>
              <button
                type="button"
                onClick={() => setCustomPromptOverride(!customPromptOverride)}
                className="text-[10px] font-mono text-slate-400 hover:text-white underline cursor-pointer"
              >
                {customPromptOverride ? 'Auto-Compile from Fields' : 'Edit Raw Prompt'}
              </button>
            </div>
            <input
              type="text"
              value={localConfig.compiledPrompt}
              readOnly={!customPromptOverride}
              onChange={e =>
                setLocalConfig(prev => ({ ...prev, compiledPrompt: e.target.value }))
              }
              className={`w-full bg-slate-900 border rounded-lg px-3 py-1.5 text-xs font-mono text-emerald-300 focus:outline-none ${
                customPromptOverride
                  ? 'border-amber-400'
                  : 'border-slate-800 cursor-default'
              }`}
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0 shadow-md"
          >
            {justApplied ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-slate-950" />
                <span>Applied to All {sceneCount} Scenes!</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Apply Character Consistency to All {sceneCount} Scenes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
