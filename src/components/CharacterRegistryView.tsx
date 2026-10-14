import React, { useState } from 'react';
import {
  CharacterRegistryEntry,
  CharacterConsistencyConfig,
  TranscriptSegment,
  Scene
} from '../types';
import {
  compileCharacterConsistencyPrompt
} from '../utils/sceneArt';
import {
  UserCheck,
  Sparkles,
  Shirt,
  Scissors,
  Lock,
  CheckCircle2,
  Quote,
  Clock,
  Film,
  Camera,
  Layers,
  Edit2,
  Check
} from 'lucide-react';

interface CharacterRegistryViewProps {
  characterRegistry: CharacterRegistryEntry[];
  transcript?: TranscriptSegment[];
  scenes?: Scene[];
  characterConsistency?: CharacterConsistencyConfig;
  onApplyConsistency?: (config: CharacterConsistencyConfig) => void;
  onUpdateCharacter?: (updated: CharacterRegistryEntry) => void;
  humanReviewLocked?: boolean;
}

export const CharacterRegistryView: React.FC<CharacterRegistryViewProps> = ({
  characterRegistry,
  transcript = [],
  scenes = [],
  characterConsistency,
  onApplyConsistency,
  onUpdateCharacter,
  humanReviewLocked = false
}) => {
  const [editingCharId, setEditingCharId] = useState<string | null>(null);
  const [editWardrobe, setEditWardrobe] = useState<string>('');
  const [editHairstyle, setEditHairstyle] = useState<string>('');
  const [justLockedId, setJustLockedId] = useState<string | null>(null);

  const handleStartEdit = (char: CharacterRegistryEntry) => {
    if (humanReviewLocked) return;
    setEditingCharId(char.id);
    setEditWardrobe(char.wardrobeTraits || char.clothing || '');
    setEditHairstyle(char.hairstyle || '');
  };

  const handleSaveEdit = (char: CharacterRegistryEntry) => {
    if (onUpdateCharacter) {
      onUpdateCharacter({
        ...char,
        wardrobeTraits: editWardrobe,
        clothing: editWardrobe,
        hairstyle: editHairstyle
      });
    }
    setEditingCharId(null);
  };

  const handleSetConsistencyLock = (char: CharacterRegistryEntry) => {
    if (humanReviewLocked || !onApplyConsistency) return;
    const wardrobe = char.wardrobeTraits || char.clothing || 'Studio broadcast blazer';
    const hair = char.hairstyle || 'Natural groomed hair';
    const config: CharacterConsistencyConfig = {
      enabled: true,
      characterId: char.id,
      characterName: char.name,
      characterDescription: `${char.role}. Transcript subject.`,
      description: `${char.role}. Transcript subject.`,
      clothing: wardrobe,
      hairstyle: hair,
      accessories: 'Broadcast microphone / lapel pin',
      facialFeatures: 'Natural authentic facial expression',
      lightingStyle: 'Balanced studio key fill and anamorphic back rim',
      compiledPrompt: compileCharacterConsistencyPrompt({
        enabled: true,
        characterName: char.name,
        clothing: wardrobe,
        hairstyle: hair,
        accessories: 'Broadcast microphone / lapel pin',
        facialFeatures: 'Natural authentic facial expression',
        lightingStyle: 'Balanced studio key fill and anamorphic back rim'
      })
    };
    onApplyConsistency(config);
    setJustLockedId(char.id);
    setTimeout(() => setJustLockedId(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2 flex-wrap">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>Character Registry &amp; Subject Evidence</span>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              {characterRegistry.length} Verified Subject{characterRegistry.length === 1 ? '' : 's'}
            </span>
            {characterConsistency?.enabled && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>CONSISTENCY ACTIVE: {characterConsistency.characterName}</span>
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real subjects, on-camera speakers, and mentioned public figures derived strictly from transcript evidence. No fabricated personas.
          </p>
        </div>
      </div>

      {characterRegistry.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center space-y-2">
          <UserCheck className="w-8 h-8 text-slate-500 mx-auto" />
          <h3 className="text-sm font-bold text-white">No Characters Identified in Transcript Yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Characters are automatically extracted when a YouTube URL or transcript with speaker introductions is ingested.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {characterRegistry.map(char => {
            const isEditing = editingCharId === char.id;
            const isLockedConsistency =
              characterConsistency?.enabled &&
              (characterConsistency.characterId === char.id ||
                characterConsistency.characterName?.toLowerCase() === char.name.toLowerCase());
            const evidenceCount = (char.evidenceSegmentIds || []).length;
            const matchedScenes = scenes.filter(s =>
              (s.characterIds || []).includes(char.id) ||
              s.dialogue?.toLowerCase().includes(char.name.toLowerCase()) ||
              s.summary?.toLowerCase().includes(char.name.toLowerCase())
            );

            const isSpeakingOnCamera =
              char.presenceType === 'speaking_on_camera' || (char.presenceType as string) === 'visible_speaker';

            const presenceLabel = isSpeakingOnCamera
              ? 'VERIFIED ON-CAMERA SPEAKER'
              : char.presenceType === 'user_presenter'
              ? 'USER PRESENTER'
              : 'MENTIONED IN TRANSCRIPT (B-ROLL)';

            const presenceBadgeClass = isSpeakingOnCamera
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : char.presenceType === 'user_presenter'
              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
              : 'bg-amber-400/15 text-amber-300 border-amber-400/30';

            return (
              <div
                key={char.id}
                className={`bg-slate-900 border rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-all ${
                  isLockedConsistency
                    ? 'border-cyan-400 ring-2 ring-cyan-400/30 shadow-xl'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Character Header with Avatar */}
                <div className="flex items-start gap-3.5">
                  <div className="relative shrink-0">
                    <img
                      src={char.avatarUrl}
                      alt={char.name}
                      className="w-16 h-16 rounded-xl object-cover border border-slate-700 bg-slate-950 shadow-md"
                    />
                    {isLockedConsistency && (
                      <span className="absolute -top-1.5 -right-1.5 bg-cyan-400 text-slate-950 p-1 rounded-full shadow-md">
                        <Lock className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-sm font-bold text-white truncate leading-snug">
                        {char.name}
                      </h4>
                      {!isEditing && (
                        <button
                          type="button"
                          disabled={humanReviewLocked}
                          onClick={() => handleStartEdit(char)}
                          className="p-1 text-slate-400 hover:text-amber-400 disabled:opacity-40 transition-colors cursor-pointer"
                          title="Edit Wardrobe & Hairstyle Traits"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-amber-300 font-medium truncate mt-0.5">
                      {char.role}
                    </p>
                    <span
                      className={`inline-block mt-1.5 px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${presenceBadgeClass}`}
                    >
                      {presenceLabel}
                    </span>
                  </div>
                </div>

                {/* Evidence & Quotes */}
                <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span className="flex items-center gap-1.5 text-cyan-300">
                      <Clock className="w-3.5 h-3.5" />
                      <span>EVIDENCE: {evidenceCount} Segment{evidenceCount === 1 ? '' : 's'}</span>
                    </span>
                    <span className="text-emerald-400">
                      Mapped to {matchedScenes.length} Scene{matchedScenes.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {char.evidenceQuotes && char.evidenceQuotes.length > 0 ? (
                    <div className="text-[11px] text-slate-300 italic line-clamp-2 pl-2 border-l-2 border-amber-400/50">
                      &ldquo;{char.evidenceQuotes[0]}&rdquo;
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 line-clamp-2">
                      Referenced in transcript segments #{char.evidenceSegmentIds?.join(', #') || 'N/A'}.
                    </div>
                  )}
                </div>

                {/* Wardrobe & Hairstyle traits */}
                {isEditing ? (
                  <div className="space-y-2 pt-1 border-t border-slate-800">
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Wardrobe Traits</label>
                      <input
                        type="text"
                        value={editWardrobe}
                        onChange={e => setEditWardrobe(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                        placeholder="e.g. Navy blue blazer, cream shirt"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Hairstyle</label>
                      <input
                        type="text"
                        value={editHairstyle}
                        onChange={e => setEditHairstyle(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                        placeholder="e.g. Natural groomed side-part"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingCharId(null)}
                        className="px-2.5 py-1 text-xs text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(char)}
                        className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                        <span>Save</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 text-[11px] text-slate-400 font-mono">
                    <div className="flex items-center gap-1.5 truncate">
                      <Shirt className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">
                        <strong className="text-slate-300">Attire:</strong>{' '}
                        {char.wardrobeTraits || char.clothing || 'Documentary attire'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <Scissors className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">
                        <strong className="text-slate-300">Hair:</strong>{' '}
                        {char.hairstyle || 'Natural groomed'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Action button */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={humanReviewLocked || isLockedConsistency}
                    onClick={() => handleSetConsistencyLock(char)}
                    className={`w-full py-2 px-3 rounded-xl font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 ${
                      isLockedConsistency
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 cursor-default'
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-cyan-400 hover:text-cyan-300'
                    }`}
                  >
                    {isLockedConsistency ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Anchor Locked Across All Scenes</span>
                      </>
                    ) : justLockedId === char.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Locked to All Scenes!</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Set as Global Anchor Character</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
