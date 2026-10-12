// Transcript-Grounded Scene Visual & Storyboard Artwork Generator
// Generates unique, deterministic 16:9 SVG storyboard frames directly from each scene's
// transcript dialogue, summary, camera, lighting, and seed without any hardcoded stock photos.

import {
  CinematicMotionPreset,
  CharacterConsistencyConfig,
  CharacterRegistryEntry,
  CharacterPresenceType,
  CharacterConfidenceState,
  SceneDepictionMode,
  SceneTransitionPreset
} from '../types';

export interface SceneArtInput {
  id?: number;
  sceneNumber?: number;
  segmentIds?: number[];
  summary?: string;
  dialogue?: string;
  visualDescription?: string;
  prompt?: string;
  camera?: string;
  lighting?: string;
  environment?: string;
  startTime?: number;
  endTime?: number;
  seed?: number;
  motionPreset?: CinematicMotionPreset;
  transitionPreset?: SceneTransitionPreset;
  characterPrompt?: string;
  characterConfig?: CharacterConsistencyConfig;
  characterIds?: string[];
  characterRegistry?: CharacterRegistryEntry[];
  depictionMode?: SceneDepictionMode;
}

export interface ExtractedCharacter {
  characterId: string;
  name: string;
  role: string;
  archetype: 'minister' | 'security' | 'scientist' | 'reporter' | 'commuter' | 'anchor' | 'leader' | 'environment';
  presenceType: CharacterPresenceType;
  confidence: CharacterConfidenceState;
  depictionMode: SceneDepictionMode;
  attire: string;
  hair: string;
  hairstyleLabel?: string;
  expression: string;
  skinTone: string;
  suitColor: string;
  accentColor: string;
  propType: 'podium' | 'radar' | 'rocket' | 'mic' | 'desk' | 'city';
  companionRole: string;
  companionName: string;
  isConsistentLock: boolean;
  compiledVisualPrompt: string;
  photorealisticImageUrl: string;
}

export const DEFAULT_CHARACTER_CONSISTENCY: CharacterConsistencyConfig = {
  enabled: false,
  presetId: 'investigative-anchor',
  characterId: 'char-user-presenter',
  characterName: 'Documentary Narrator',
  characterDescription: 'Neutral documentary narrator',
  description: 'Neutral documentary narrator',
  clothing: 'Studio attire',
  hairstyle: 'Natural groomed hair',
  accessories: 'Broadcast microphone',
  facialFeatures: 'Natural expression',
  lightingStyle: 'Balanced key light',
  compiledPrompt: ''
};

export interface CharacterPresetOption {
  id: string;
  label: string;
  badge: string;
  config: Omit<CharacterConsistencyConfig, 'enabled' | 'compiledPrompt'>;
}

export const CHARACTER_CONSISTENCY_PRESETS: CharacterPresetOption[] = [
  {
    id: 'investigative-anchor',
    label: 'Studio Host',
    badge: 'Presenter',
    config: {
      presetId: 'investigative-anchor',
      characterId: 'char-presenter-studio-host',
      characterName: 'Studio Host',
      characterDescription: 'Broadcast presenter',
      description: 'Broadcast presenter',
      clothing: 'Studio blazer',
      hairstyle: 'Groomed hair',
      accessories: 'Lapel microphone',
      facialFeatures: 'Natural expression',
      lightingStyle: 'Balanced studio key fill'
    }
  }
];

export interface MotionPresetMeta {
  id: CinematicMotionPreset;
  label: string;
  shortLabel: string;
  cssClass: string;
  cameraDescription: string;
  description?: string;
  cameraSpec?: string;
  lensSpec: string;
  badgeColor: string;
}

export const CINEMATIC_MOTION_PRESETS: MotionPresetMeta[] = [
  {
    id: 'pan',
    label: 'Horizontal Pan',
    shortLabel: 'PAN',
    cssClass: 'kb-motion-pan',
    cameraDescription: 'Wide Horizontal Pan (24mm Prime)',
    cameraSpec: 'Wide Horizontal Pan (24mm Prime)',
    lensSpec: '24mm f/1.4 Pan',
    badgeColor: 'text-amber-300 bg-amber-500/15 border-amber-500/30'
  },
  {
    id: 'dolly',
    label: 'Dolly Push-In',
    shortLabel: 'DOLLY',
    cssClass: 'kb-motion-dolly',
    cameraDescription: 'Slow Dolly Push-In (35mm Cine)',
    cameraSpec: 'Slow Dolly Push-In (35mm Cine)',
    lensSpec: '35mm f/1.8 Dolly',
    badgeColor: 'text-cyan-300 bg-cyan-500/15 border-cyan-500/30'
  },
  {
    id: 'crane',
    label: 'Vertical Crane Sweep',
    shortLabel: 'CRANE',
    cssClass: 'kb-motion-crane',
    cameraDescription: 'Elevated Crane Rise & Tilt (28mm Prime)',
    cameraSpec: 'Elevated Crane Rise & Tilt (28mm Prime)',
    lensSpec: '28mm f/2.0 Crane',
    badgeColor: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30'
  },
  {
    id: 'orbit',
    label: 'Parallax Orbit',
    shortLabel: 'ORBIT',
    cssClass: 'kb-motion-orbit',
    cameraDescription: 'Gimbal Orbit (50mm Prime)',
    cameraSpec: 'Gimbal Orbit (50mm Prime)',
    lensSpec: '50mm f/1.2 Orbit',
    badgeColor: 'text-purple-300 bg-purple-500/15 border-purple-500/30'
  }
];

export function getDefaultMotionPresetForIndex(index: number): CinematicMotionPreset {
  const order: CinematicMotionPreset[] = ['pan', 'dolly', 'crane', 'orbit'];
  return order[index % order.length];
}

export function getMotionPresetCssClass(
  preset?: CinematicMotionPreset,
  fallbackIndex = 0
): string {
  const resolved = preset || getDefaultMotionPresetForIndex(fallbackIndex);
  const found = CINEMATIC_MOTION_PRESETS.find(p => p.id === resolved);
  return found ? found.cssClass : 'kb-motion-pan';
}

export interface SceneTransitionMeta {
  id: SceneTransitionPreset;
  label: string;
  shortLabel: string;
  cssClass: string;
  outCssClass: string;
  defaultDurationMs?: number;
  description: string;
  badgeColor: string;
}

export const SCENE_TRANSITION_PRESETS: SceneTransitionMeta[] = [
  {
    id: 'cross-fade',
    label: 'Cross-Fade Dissolve',
    shortLabel: 'CROSS-FADE',
    cssClass: 'scene-transition-cross-fade',
    outCssClass: 'scene-transition-out-cross-fade',
    defaultDurationMs: 850,
    description: 'Smooth optical dissolve between scenes',
    badgeColor: 'text-amber-300 bg-amber-500/15 border-amber-500/30'
  },
  {
    id: 'slide-left',
    label: 'Horizontal Slide',
    shortLabel: 'SLIDE LEFT',
    cssClass: 'scene-transition-slide-left',
    outCssClass: 'scene-transition-out-slide-left',
    defaultDurationMs: 850,
    description: 'Horizontal slide transition',
    badgeColor: 'text-cyan-300 bg-cyan-500/15 border-cyan-500/30'
  },
  {
    id: 'slide-up',
    label: 'Vertical Slide',
    shortLabel: 'SLIDE UP',
    cssClass: 'scene-transition-slide-up',
    outCssClass: 'scene-transition-out-slide-up',
    defaultDurationMs: 850,
    description: 'Vertical frame transition',
    badgeColor: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30'
  },
  {
    id: 'anamorphic-wipe',
    label: 'Iris Wipe',
    shortLabel: 'IRIS WIPE',
    cssClass: 'scene-transition-anamorphic-wipe',
    outCssClass: 'scene-transition-out-cross-fade',
    defaultDurationMs: 850,
    description: 'Horizontal shutter reveal',
    badgeColor: 'text-purple-300 bg-purple-500/15 border-purple-500/30'
  }
];

export function getDefaultTransitionPresetForIndex(index: number): SceneTransitionPreset {
  const order: SceneTransitionPreset[] = ['cross-fade', 'slide-left', 'cross-fade', 'slide-up'];
  return order[index % order.length];
}

export function getSceneTransitionCssClass(
  preset?: SceneTransitionPreset,
  fallbackIndex = 0
): string {
  const resolved = preset || getDefaultTransitionPresetForIndex(fallbackIndex);
  const found = SCENE_TRANSITION_PRESETS.find(p => p.id === resolved);
  return found ? found.cssClass : 'scene-transition-cross-fade';
}

export function getSceneTransitionOutCssClass(
  preset?: SceneTransitionPreset,
  fallbackIndex = 0
): string {
  const resolved = preset || getDefaultTransitionPresetForIndex(fallbackIndex);
  const found = SCENE_TRANSITION_PRESETS.find(p => p.id === resolved);
  return found ? found.outCssClass : 'scene-transition-out-cross-fade';
}

export function compileCharacterConsistencyPrompt(
  config: Omit<CharacterConsistencyConfig, 'compiledPrompt'>
): string {
  if (!config.characterName) return '';
  return `[Presenter: ${config.characterName}]`;
}

export function prependCharacterConsistencyToPrompt(
  baseScenePrompt: string,
  config?: CharacterConsistencyConfig
): string {
  const cleanBase = (baseScenePrompt || '')
    .replace(/\[CHARACTER CONSISTENCY LOCK:[^\]]*\]\s*/g, '')
    .replace(/\[USER PRESENTER OVERRIDE:[^\]]*\]\s*/g, '')
    .trim();

  if (!config || !config.enabled) {
    return cleanBase;
  }
  const prefix = config.compiledPrompt || compileCharacterConsistencyPrompt(config);
  return `${prefix} ${cleanBase}`.trim();
}

function escapeXml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapTextLines(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (!current) {
      current = word;
    } else if ((current + ' ' + word).length <= maxCharsPerLine) {
      current += ' ' + word;
    } else {
      lines.push(current);
      current = word;
      if (lines.length >= maxLines - 1) break;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  return lines;
}

const SCENE_COLOR_PALETTES = [
  { bg1: '#090d16', bg2: '#1e293b', accent: '#f59e0b', glow: '#38bdf8' },
  { bg1: '#0a192f', bg2: '#112240', accent: '#2dd4bf', glow: '#f59e0b' },
  { bg1: '#1a1025', bg2: '#2d1b4e', accent: '#a855f7', glow: '#38bdf8' },
  { bg1: '#0f172a', bg2: '#064e3b', accent: '#10b981', glow: '#fbbf24' },
  { bg1: '#1e1b4b', bg2: '#31102f', accent: '#f43f5e', glow: '#38bdf8' },
  { bg1: '#172554', bg2: '#0f172a', accent: '#60a5fa', glow: '#34d399' }
];

function encodeSvgDataUri(svgString: string): string {
  if (typeof Buffer !== 'undefined') {
    return `data:image/svg+xml;base64,${Buffer.from(svgString, 'utf-8').toString('base64')}`;
  }
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
}

/**
 * Generates a unique, transcript-grounded 1280x720 SVG storyboard frame for each scene.
 */
export function generateSceneArtwork(
  scene: SceneArtInput,
  videoTitle = '',
  index = 0,
  totalScenes = 4
): string {
  const sceneNum = scene.sceneNumber || index + 1;
  const total = Math.max(totalScenes, sceneNum);
  const seedVal = typeof scene.seed === 'number' ? scene.seed : index * 137 + sceneNum * 31;
  const palette = SCENE_COLOR_PALETTES[Math.abs(index + seedVal) % SCENE_COLOR_PALETTES.length];

  const startSec = typeof scene.startTime === 'number' ? scene.startTime.toFixed(1) : (index * 10).toFixed(1);
  const endSec = typeof scene.endTime === 'number' ? scene.endTime.toFixed(1) : ((index + 1) * 10).toFixed(1);
  const summaryText = scene.summary || `Scene ${sceneNum}`;
  const dialogueText = scene.dialogue || scene.visualDescription || summaryText;
  const cameraText = scene.camera || '24mm Cinema Prime';
  const lightingText = scene.lighting || 'Natural Studio Key';
  const envText = scene.environment || 'Documentary Frame';

  const summaryLines = wrapTextLines(summaryText, 56, 2);
  const dialogueLines = wrapTextLines(dialogueText, 68, 3);
  const cleanTitle = (videoTitle || 'Generated Storyboard').slice(0, 65);

  const circleX = 240 + ((seedVal * 53) % 800);
  const circleY = 160 + ((seedVal * 29) % 260);
  const progressWidth = Math.max(60, Math.round((sceneNum / total) * 1120));

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.bg1}" />
      <stop offset="100%" stop-color="${palette.bg2}" />
    </linearGradient>
    <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${palette.glow}" stop-opacity="0.24" />
      <stop offset="100%" stop-color="${palette.bg1}" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#bgGrad)" />
  <circle cx="${circleX}" cy="${circleY}" r="360" fill="url(#glowGrad)" />
  <g stroke="#ffffff" stroke-opacity="0.06" stroke-width="1">
    <line x1="0" y1="180" x2="1280" y2="180" />
    <line x1="0" y1="360" x2="1280" y2="360" />
    <line x1="0" y1="540" x2="1280" y2="540" />
    <line x1="320" y1="0" x2="320" y2="720" />
    <line x1="640" y1="0" x2="640" y2="720" />
    <line x1="960" y1="0" x2="960" y2="720" />
  </g>
  <rect x="80" y="64" width="1120" height="580" rx="20" fill="#020617" fill-opacity="0.55" stroke="${palette.accent}" stroke-opacity="0.35" stroke-width="2" />
  <rect x="112" y="96" width="220" height="38" rx="8" fill="${palette.accent}" />
  <text x="222" y="121" font-family="monospace, sans-serif" font-size="16" font-weight="bold" fill="#020617" text-anchor="middle">SCENE ${String(sceneNum).padStart(2, '0')} / ${String(total).padStart(2, '0')}</text>
  <text x="352" y="121" font-family="monospace, sans-serif" font-size="16" fill="#94a3b8">${escapeXml(startSec)}s - ${escapeXml(endSec)}s · ${escapeXml(cleanTitle)}</text>
  <text x="112" y="200" font-family="sans-serif" font-size="28" font-weight="bold" fill="#f8fafc">${escapeXml(summaryLines[0] || '')}</text>
  ${summaryLines[1] ? `<text x="112" y="238" font-family="sans-serif" font-size="24" font-weight="bold" fill="#e2e8f0">${escapeXml(summaryLines[1])}</text>` : ''}
  <rect x="112" y="275" width="1056" height="180" rx="14" fill="#0f172a" fill-opacity="0.85" stroke="#334155" stroke-width="1.5" />
  <text x="140" y="315" font-family="monospace, sans-serif" font-size="14" font-weight="bold" fill="${palette.accent}">TRANSCRIPT SEGMENT DIALOGUE</text>
  ${dialogueLines
    .map(
      (line, idx) =>
        `<text x="140" y="${355 + idx * 34}" font-family="sans-serif" font-size="21" fill="#f1f5f9">${escapeXml(line)}</text>`
    )
    .join('\n  ')}
  <text x="112" y="520" font-family="monospace, sans-serif" font-size="15" fill="#38bdf8">CAMERA: ${escapeXml(cameraText.slice(0, 48))}   |   LIGHTING: ${escapeXml(lightingText.slice(0, 48))}</text>
  <text x="112" y="552" font-family="monospace, sans-serif" font-size="15" fill="#94a3b8">SETTING: ${escapeXml(envText.slice(0, 80))}</text>
  <rect x="80" y="620" width="1120" height="8" rx="4" fill="#1e293b" />
  <rect x="80" y="620" width="${progressWidth}" height="8" rx="4" fill="${palette.accent}" />
</svg>`;

  return encodeSvgDataUri(svg);
}

export const ALL_PHOTOREALISTIC_HUMAN_FRAMES: string[] = [];
export const ALL_ENVIRONMENT_FRAMES: string[] = [];

export function extractCharacterFromTranscript(
  dialogue = '',
  summary = '',
  index = 0,
  consistencyOverride?: CharacterConsistencyConfig | string,
  sceneContext?: {
    characterIds?: string[];
    characterRegistry?: CharacterRegistryEntry[];
    depictionMode?: SceneDepictionMode;
  }
): ExtractedCharacter {
  const speakerPrefixMatch = dialogue.match(
    /^(?:\[([A-Za-z0-9\s._-]{2,30})\]|([A-Z][A-Za-z0-9\s._-]{1,24})):\s+/
  );
  const speakerName = speakerPrefixMatch
    ? (speakerPrefixMatch[1] || speakerPrefixMatch[2]).trim()
    : sceneContext?.characterRegistry?.[0]?.name || 'Narrator';

  const img = generateSceneArtwork(
    {
      sceneNumber: index + 1,
      summary,
      dialogue
    },
    summary,
    index,
    4
  );

  return {
    characterId: `char-${index + 1}`,
    name: speakerName,
    role: speakerPrefixMatch ? 'Verified Speaker' : 'Transcript Narrator',
    archetype: 'environment',
    presenceType: speakerPrefixMatch ? 'speaking_on_camera' : 'illustrative_non_human',
    confidence: speakerPrefixMatch ? 'verified' : 'unknown',
    depictionMode: sceneContext?.depictionMode || 'environment_broll',
    attire: 'Documentary Visual',
    hair: 'N/A',
    expression: 'Natural Delivery',
    skinTone: '#64748b',
    suitColor: '#0f172a',
    accentColor: '#38bdf8',
    propType: 'city',
    companionRole: 'Transcript Segment',
    companionName: `Scene ${index + 1}`,
    isConsistentLock: Boolean(
      typeof consistencyOverride === 'object' && consistencyOverride?.enabled
    ),
    compiledVisualPrompt: summary || dialogue,
    photorealisticImageUrl: img
  };
}

export function getSceneCinematicFilter(index = 0, _archetype?: ExtractedCharacter['archetype']): {
  filter: string;
  objectPosition: string;
} {
  const grades = [
    { filter: 'brightness(1.02) contrast(1.05)', objectPosition: 'center center' },
    { filter: 'brightness(1.0) contrast(1.06)', objectPosition: 'center center' }
  ];
  return grades[index % grades.length];
}
