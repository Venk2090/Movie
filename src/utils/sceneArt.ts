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
  SceneTransitionPreset,
  VisualFilterPreset
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
  emotion?: string;
  emotionalTone?: string;
  languageCode?: string;
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

export interface SceneEmotionMeta {
  emotion: string;
  emotionalTone: string;
  emoji: string;
  badgeClass: string;
  accentColor: string;
  theme: 'aerospace' | 'strategic' | 'civic' | 'urban' | 'investigative' | 'cinematic';
}

/**
 * Derives emotional valence, dramatic tone, and visual motif strictly from transcript dialogue.
 */
export function deriveEmotionFromTranscript(text = ''): SceneEmotionMeta {
  const norm = text.toLowerCase();
  if (
    /\b(?:traffic|jam|commute|cost|rent|suffer|hardship|patience|deficit|decay|trouble|severe|crisis|bottleneck|ట్రాఫిక్|దుర్భరం|ఖర్చులు|సమస్యల|ఇబ్బందులు|बढ़ते|जाम|कठिन|रोड)\b/i.test(
      norm
    )
  ) {
    return {
      emotion: 'Dramatic Urgency',
      emotionalTone: 'Urgent Civil Hardship & Commuter Bottleneck',
      emoji: '🔥',
      badgeClass: 'bg-red-500/20 text-red-300 border-red-500/40',
      accentColor: '#f43f5e',
      theme: 'urban'
    };
  }
  if (
    /\b(?:security|defense|nsa|threat|intelligence|border|cyber|surveillance|doval|conclave|agency|forces|sabotage|భద్రతా|నిఘా|సైబర్|సరిహద్దు|దోవల్|రక్షణ|सुरक्षा|खुफिया)\b/i.test(
      norm
    )
  ) {
    return {
      emotion: 'Strategic Command',
      emotionalTone: 'High-Level Defense Sovereignty & Strategic Resolve',
      emoji: '🛡️',
      badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      accentColor: '#06b6d4',
      theme: 'strategic'
    };
  }
  if (
    /\b(?:rocket|satellite|isro|pslv|space|orbit|launch|telemetry|propulsion|anomaly|stage|రాకెట్|శాటిలైట్|అంతరిక్ష|ఇస్రో|పీఎస్‌ఎల్‌వీ|కక్ష్య|रॉकेट|इसरो|अंतरिक्ष)\b/i.test(
      norm
    )
  ) {
    return {
      emotion: 'Aerospace Discovery',
      emotionalTone: 'Scientific Breakthrough & Critical Space Telemetry',
      emoji: '🚀',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      accentColor: '#f59e0b',
      theme: 'aerospace'
    };
  }
  if (
    /\b(?:ucc|uniform civil code|law|parliament|bill|constitution|rights|equality|shah|court|statute|women|gender|యూనిఫాం సివిల్ కోడ్|యుసిసి|చట్ట|పార్లమెంట్|హక్కుల|అమిత్ షా|సమాన|समान नागरिक|संहिता|संसद)\b/i.test(
      norm
    )
  ) {
    return {
      emotion: 'Civic Reform',
      emotionalTone: 'Constitutional Civil Equality & Legislative Momentum',
      emoji: '⚖️',
      badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      accentColor: '#a855f7',
      theme: 'civic'
    };
  }
  if (
    /\b(?:journalist|sai|report|petition|appeal|demand|welcome|ground report|takeaway|citizens|residents|సాయి|రిపోర్ట్|కోరుతున్నారు|పరిష్కారాలు|ప్రజలు|पत्रकार|रिपोर्ट|नागरिक)\b/i.test(
      norm
    )
  ) {
    return {
      emotion: 'Investigative Appeal',
      emotionalTone: 'Authoritative Field Journalism & Citizen Accountability',
      emoji: '🎙️',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      accentColor: '#10b981',
      theme: 'investigative'
    };
  }
  return {
    emotion: 'Cinematic Narrative',
    emotionalTone: 'Measured Documentary Narrative & High-Fidelity Focus',
    emoji: '🎬',
    badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    accentColor: '#6366f1',
    theme: 'cinematic'
  };
}

const SCENE_COLOR_PALETTES = [
  { bg1: '#050811', bg2: '#0f172a', accent: '#f59e0b', glow: '#38bdf8', rim: '#fbbf24' },
  { bg1: '#04101e', bg2: '#0b1e36', accent: '#06b6d4', glow: '#3b82f6', rim: '#22d3ee' },
  { bg1: '#11091f', bg2: '#24123b', accent: '#a855f7', glow: '#ec4899', rim: '#c084fc' },
  { bg1: '#061314', bg2: '#092d2b', accent: '#10b981', glow: '#14b8a6', rim: '#34d399' },
  { bg1: '#18070e', bg2: '#310d1c', accent: '#f43f5e', glow: '#fb7185', rim: '#fda4af' },
  { bg1: '#0b1120', bg2: '#1e293b', accent: '#60a5fa', glow: '#38bdf8', rim: '#93c5fd' }
];

function encodeSvgDataUri(svgString: string): string {
  if (typeof Buffer !== 'undefined') {
    return `data:image/svg+xml;base64,${Buffer.from(svgString, 'utf-8').toString('base64')}`;
  }
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
}

/**
 * Generates an evocative, transcript-grounded 16:9 cinematic storyboard frame.
 * Renders topic-aware architectural and atmospheric silhouettes, cinematic lighting,
 * professional camera viewfinder HUD, emotion badge, and localized dialogue script.
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
  const cameraText = scene.camera || '24mm Anamorphic Prime f/1.4';
  const lightingText = scene.lighting || 'Volumetric Golden Key Light';
  const envText = scene.environment || 'Cinematic Documentary Setting';
  const langCode = (scene.languageCode || 'en').toUpperCase();

  const emotionMeta = deriveEmotionFromTranscript(
    `${summaryText} ${dialogueText} ${scene.visualDescription || ''}`
  );
  const emotionLabel = scene.emotion || emotionMeta.emotion;
  const emotionalTone = scene.emotionalTone || emotionMeta.emotionalTone;
  const motionRig = (scene.motionPreset || 'pan').toUpperCase();

  const summaryLines = wrapTextLines(summaryText, 62, 2);
  const dialogueLines = wrapTextLines(dialogueText, 76, 3);
  const cleanTitle = (videoTitle || 'Cinematic Master Video').slice(0, 55);

  // Thematic Silhouette Artwork Layer
  let thematicGraphic = '';
  if (emotionMeta.theme === 'aerospace') {
    thematicGraphic = `
      <!-- Aerospace Launch Gantry, PSLV Rocket & Orbit Geometry -->
      <g opacity="0.88">
        <!-- Stars & Nebula -->
        <circle cx="210" cy="140" r="1.8" fill="#ffffff" opacity="0.9"/>
        <circle cx="340" cy="90" r="1.2" fill="#ffffff" opacity="0.7"/>
        <circle cx="490" cy="180" r="1.5" fill="#fde047" opacity="0.85"/>
        <circle cx="780" cy="120" r="2.2" fill="#ffffff" opacity="0.9"/>
        <circle cx="950" cy="80" r="1.4" fill="#ffffff" opacity="0.6"/>
        <circle cx="1120" cy="160" r="2.0" fill="#38bdf8" opacity="0.8"/>
        <!-- Orbital Trajectory Arc -->
        <path d="M 120 480 Q 640 120 1180 240" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-dasharray="8 6" opacity="0.55"/>
        <!-- Orbiting Satellite -->
        <rect x="1080" y="215" width="28" height="14" rx="2" fill="#e2e8f0" stroke="#f59e0b" stroke-width="1.5"/>
        <line x1="1062" y1="222" x2="1080" y2="222" stroke="#38bdf8" stroke-width="3"/>
        <line x1="1108" y1="222" x2="1126" y2="222" stroke="#38bdf8" stroke-width="3"/>
        <!-- Launch Gantry Tower Scaffolding -->
        <path d="M 380 520 L 420 220 L 440 220 L 480 520 Z" fill="#0f172a" stroke="#475569" stroke-width="1.5"/>
        <line x1="390" y1="460" x2="470" y2="460" stroke="#334155" stroke-width="1.5"/>
        <line x1="400" y1="380" x2="460" y2="380" stroke="#334155" stroke-width="1.5"/>
        <line x1="410" y1="300" x2="450" y2="300" stroke="#334155" stroke-width="1.5"/>
        <!-- Ascending PSLV Rocket Fuselage -->
        <path d="M 620 520 L 632 230 Q 640 180 648 230 L 660 520 Z" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.5"/>
        <path d="M 632 230 Q 640 170 648 230 Z" fill="#f59e0b"/>
        <!-- Rocket Flame Jet & Exhaust Plume -->
        <path d="M 622 520 Q 640 680 658 520 Z" fill="url(#flameGrad)"/>
        <ellipse cx="640" cy="560" rx="90" ry="24" fill="#f59e0b" opacity="0.25" filter="blur(8px)"/>
      </g>`;
  } else if (emotionMeta.theme === 'strategic') {
    thematicGraphic = `
      <!-- Strategic Intelligence Command & Tactical Radar Reticle -->
      <g opacity="0.85">
        <!-- Tactical Grid Coordinate Lines -->
        <path d="M 240 180 L 1040 180 M 240 320 L 1040 320 M 240 460 L 1040 460" stroke="#06b6d4" stroke-width="1" stroke-dasharray="4 8" opacity="0.25"/>
        <!-- Tactical Radar Rings -->
        <circle cx="820" cy="280" r="130" fill="none" stroke="#06b6d4" stroke-width="1.5" opacity="0.4"/>
        <circle cx="820" cy="280" r="75" fill="none" stroke="#06b6d4" stroke-width="1.5" opacity="0.5"/>
        <circle cx="820" cy="280" r="25" fill="#0891b2" opacity="0.3"/>
        <line x1="680" y1="280" x2="960" y2="280" stroke="#06b6d4" stroke-width="1" opacity="0.5"/>
        <line x1="820" y1="140" x2="820" y2="420" stroke="#06b6d4" stroke-width="1" opacity="0.5"/>
        <!-- Radar Target Blips -->
        <circle cx="870" cy="240" r="5" fill="#ef4444" opacity="0.9"/>
        <circle cx="760" cy="330" r="4" fill="#22c55e" opacity="0.85"/>
        <circle cx="890" cy="310" r="4.5" fill="#f59e0b" opacity="0.9"/>
        <!-- Silhouetted Defense Operations Console & Commander Profile -->
        <path d="M 280 520 L 340 380 Q 380 340 420 380 L 460 520 Z" fill="#0b1329" stroke="#1e293b" stroke-width="2"/>
        <circle cx="380" cy="320" r="38" fill="#0b1329" stroke="#38bdf8" stroke-width="1.5"/>
        <rect x="470" y="400" width="130" height="75" rx="6" fill="#020617" stroke="#06b6d4" stroke-width="1.5" opacity="0.8"/>
        <line x1="485" y1="425" x2="585" y2="425" stroke="#22d3ee" stroke-width="2"/>
        <line x1="485" y1="445" x2="555" y2="445" stroke="#0891b2" stroke-width="2"/>
      </g>`;
  } else if (emotionMeta.theme === 'civic') {
    thematicGraphic = `
      <!-- Neoclassical Parliamentary Architecture & Scales of Justice -->
      <g opacity="0.85">
        <!-- Central Rotunda Dome -->
        <path d="M 520 280 Q 640 140 760 280 Z" fill="#1e1b4b" stroke="#c084fc" stroke-width="2" opacity="0.7"/>
        <rect x="630" y="110" width="20" height="30" fill="#a855f7"/>
        <!-- Classical Colonist Pillars -->
        <rect x="420" y="280" width="440" height="24" fill="#312e81" stroke="#a855f7" stroke-width="1.5"/>
        <rect x="440" y="304" width="24" height="216" fill="#1e1b4b" stroke="#6b21a8" stroke-width="1.5"/>
        <rect x="520" y="304" width="24" height="216" fill="#1e1b4b" stroke="#6b21a8" stroke-width="1.5"/>
        <rect x="600" y="304" width="24" height="216" fill="#1e1b4b" stroke="#6b21a8" stroke-width="1.5"/>
        <rect x="680" y="304" width="24" height="216" fill="#1e1b4b" stroke="#6b21a8" stroke-width="1.5"/>
        <rect x="760" y="304" width="24" height="216" fill="#1e1b4b" stroke="#6b21a8" stroke-width="1.5"/>
        <rect x="840" y="304" width="24" height="216" fill="#1e1b4b" stroke="#6b21a8" stroke-width="1.5"/>
        <!-- Scales of Justice Emblem Silhouette -->
        <g transform="translate(640, 240)">
          <line x1="0" y1="-45" x2="0" y2="45" stroke="#fef08a" stroke-width="3"/>
          <line x1="-50" y1="-25" x2="50" y2="-25" stroke="#fef08a" stroke-width="2.5"/>
          <path d="M -65 10 Q -50 -10 -35 10 Z" fill="#f59e0b" stroke="#fef08a" stroke-width="1.5"/>
          <path d="M 35 10 Q 50 -10 65 10 Z" fill="#f59e0b" stroke="#fef08a" stroke-width="1.5"/>
        </g>
      </g>`;
  } else if (emotionMeta.theme === 'urban') {
    thematicGraphic = `
      <!-- Bengaluru Metro Corridor, Glowing Skyline & Flyover Traffic Streaks -->
      <g opacity="0.88">
        <!-- Skyscraper Cityscape Silhouette -->
        <rect x="180" y="240" width="70" height="280" fill="#090d16" stroke="#334155" stroke-width="1"/>
        <rect x="260" y="180" width="85" height="340" fill="#0f172a" stroke="#334155" stroke-width="1"/>
        <rect x="360" y="220" width="60" height="300" fill="#090d16" stroke="#334155" stroke-width="1"/>
        <rect x="840" y="200" width="90" height="320" fill="#0f172a" stroke="#334155" stroke-width="1"/>
        <rect x="940" y="160" width="110" height="360" fill="#090d16" stroke="#334155" stroke-width="1"/>
        <!-- Window Light Grid Array -->
        <circle cx="280" cy="220" r="2.5" fill="#fef08a" opacity="0.8"/>
        <circle cx="310" cy="220" r="2.5" fill="#fef08a" opacity="0.8"/>
        <circle cx="280" cy="250" r="2.5" fill="#fef08a" opacity="0.8"/>
        <circle cx="970" cy="200" r="2.5" fill="#38bdf8" opacity="0.9"/>
        <circle cx="1000" cy="200" r="2.5" fill="#38bdf8" opacity="0.9"/>
        <!-- Curved Elevated Metro Viaduct & Express Flyover -->
        <path d="M 100 440 Q 640 330 1180 430" fill="none" stroke="#1e293b" stroke-width="26"/>
        <path d="M 100 440 Q 640 330 1180 430" fill="none" stroke="#475569" stroke-width="4"/>
        <!-- Red Taillight Streaks (Traffic Jam Bokeh) -->
        <path d="M 280 430 Q 640 365 920 422" fill="none" stroke="#f43f5e" stroke-width="4.5" opacity="0.9" filter="blur(1px)"/>
        <path d="M 320 442 Q 640 375 880 434" fill="none" stroke="#fb7185" stroke-width="3" opacity="0.85"/>
        <!-- Golden Headlight Light Trail -->
        <path d="M 380 422 Q 640 355 1020 415" fill="none" stroke="#fef08a" stroke-width="4" opacity="0.8" filter="blur(1px)"/>
      </g>`;
  } else {
    thematicGraphic = `
      <!-- Documentary Broadcast Studio, Camera Crane Rig & Soundwave Geometry -->
      <g opacity="0.85">
        <!-- Studio Ceiling Floodlight Truss -->
        <line x1="160" y1="120" x2="1120" y2="120" stroke="#475569" stroke-width="4"/>
        <rect x="320" y="120" width="30" height="24" fill="#334155"/>
        <polygon points="305,144 365,144 420,380 250,380" fill="url(#studioSpotGrad)" opacity="0.22"/>
        <rect x="740" y="120" width="30" height="24" fill="#334155"/>
        <polygon points="725,144 785,144 860,380 650,380" fill="url(#studioSpotGrad)" opacity="0.22"/>
        <!-- News Camera Rig Silhouette with Teleprompter on Tripod -->
        <rect x="940" y="320" width="90" height="55" rx="6" fill="#090d16" stroke="#475569" stroke-width="2"/>
        <circle cx="930" cy="347" r="16" fill="#020617" stroke="#38bdf8" stroke-width="2"/>
        <line x1="985" y1="375" x2="940" y2="520" stroke="#0f172a" stroke-width="4"/>
        <line x1="985" y1="375" x2="1030" y2="520" stroke="#0f172a" stroke-width="4"/>
        <!-- Reporter with Microphone Silhouette -->
        <circle cx="440" cy="320" r="32" fill="#090d16" stroke="#10b981" stroke-width="1.5"/>
        <path d="M 380 520 L 410 390 Q 440 360 470 390 L 500 520 Z" fill="#090d16"/>
        <line x1="475" y1="380" x2="505" y2="350" stroke="#f59e0b" stroke-width="3"/>
        <circle cx="510" cy="345" r="7" fill="#f59e0b"/>
      </g>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.bg1}"/>
      <stop offset="60%" stop-color="${palette.bg2}"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <!-- Volumetric Ambient Light -->
    <radialGradient id="ambientGlow" cx="50%" cy="35%" r="60%">
      <stop offset="0%" stop-color="${palette.glow}" stop-opacity="0.28"/>
      <stop offset="50%" stop-color="${palette.accent}" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#020617" stop-opacity="0"/>
    </radialGradient>
    <!-- Rocket Flame Gradient -->
    <linearGradient id="flameGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="35%" stop-color="#fef08a"/>
      <stop offset="70%" stop-color="#f97316"/>
      <stop offset="100%" stop-color="#dc2626" stop-opacity="0"/>
    </linearGradient>
    <!-- Studio Spotlight Beam -->
    <linearGradient id="studioSpotGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#38bdf8" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Deep Atmospheric Background -->
  <rect width="1280" height="720" fill="url(#bgGrad)"/>
  <rect width="1280" height="720" fill="url(#ambientGlow)"/>

  <!-- Thematic Silhouette Illustration Layer -->
  ${thematicGraphic}

  <!-- 2.39:1 Anamorphic Cinema Scope Matte Bars -->
  <!-- Top Matte Bar -->
  <rect x="0" y="0" width="1280" height="42" fill="#000000"/>
  <line x1="0" y1="42" x2="1280" y2="42" stroke="#f59e0b" stroke-opacity="0.35" stroke-width="1.5"/>

  <!-- Bottom Matte Bar -->
  <rect x="0" y="678" width="1280" height="42" fill="#000000"/>
  <line x1="0" y1="678" x2="1280" y2="678" stroke="#f59e0b" stroke-opacity="0.35" stroke-width="1.5"/>

  <!-- Professional Viewfinder Camera HUD (Top Bar) -->
  <circle cx="28" cy="21" r="5.5" fill="#ef4444"/>
  <text x="42" y="26" font-family="monospace, 'Courier New', sans-serif" font-size="12" font-weight="bold" fill="#ffffff" letter-spacing="1">● REC 4K UHD</text>
  <text x="180" y="26" font-family="monospace, 'Courier New', sans-serif" font-size="11" fill="#94a3b8">3840×2160 · 24.00 FPS · 2.39:1 SCOPE</text>
  <text x="640" y="26" font-family="monospace, 'Courier New', sans-serif" font-size="12" font-weight="bold" fill="#f59e0b" text-anchor="middle">SCENE ${String(sceneNum).padStart(2, '0')} / ${String(total).padStart(2, '0')} · TC ${escapeXml(startSec)}s – ${escapeXml(endSec)}s</text>
  <text x="1252" y="26" font-family="monospace, 'Courier New', sans-serif" font-size="11" font-weight="bold" fill="#38bdf8" text-anchor="end">[${langCode}] LOCALIZED STORYBOARD</text>

  <!-- Framing Crosshairs and Rule-of-Thirds Grid Markers -->
  <g stroke="#ffffff" stroke-opacity="0.08" stroke-width="1">
    <line x1="426" y1="42" x2="426" y2="678"/>
    <line x1="854" y1="42" x2="854" y2="678"/>
    <line x1="0" y1="254" x2="1280" y2="254"/>
    <line x1="0" y1="466" x2="1280" y2="466"/>
  </g>
  <!-- Center Viewfinder Reticle -->
  <circle cx="640" cy="360" r="18" fill="none" stroke="#f59e0b" stroke-opacity="0.45" stroke-width="1.2"/>
  <line x1="630" y1="360" x2="650" y2="360" stroke="#f59e0b" stroke-opacity="0.6" stroke-width="1.2"/>
  <line x1="640" y1="350" x2="640" y2="370" stroke="#f59e0b" stroke-opacity="0.6" stroke-width="1.2"/>

  <!-- Top Badges Row: Emotion & Motion Rig -->
  <g transform="translate(48, 62)">
    <!-- Emotion Badge -->
    <rect x="0" y="0" width="230" height="28" rx="6" fill="#020617" fill-opacity="0.85" stroke="${emotionMeta.accentColor}" stroke-width="1.5"/>
    <text x="12" y="19" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff">${emotionMeta.emoji} ${escapeXml(emotionLabel.toUpperCase())}</text>

    <!-- Motion Rig Badge -->
    <rect x="242" y="0" width="180" height="28" rx="6" fill="#020617" fill-opacity="0.85" stroke="#38bdf8" stroke-width="1.5"/>
    <text x="254" y="19" font-family="monospace, sans-serif" font-size="12" font-weight="bold" fill="#38bdf8">RIG: ${motionRig} · ${escapeXml(cameraText.slice(0, 14))}</text>

    <!-- Lens Spec Badge -->
    <rect x="434" y="0" width="220" height="28" rx="6" fill="#020617" fill-opacity="0.85" stroke="#a855f7" stroke-width="1.5"/>
    <text x="446" y="19" font-family="monospace, sans-serif" font-size="11" fill="#e9d5ff">LENS: ${escapeXml(cameraText.slice(0, 26))}</text>
  </g>

  <!-- Lower-Third Glassmorphic Storyboard Dialogue Plate -->
  <rect x="48" y="445" width="1184" height="215" rx="14" fill="#020617" fill-opacity="0.88" stroke="${palette.accent}" stroke-opacity="0.4" stroke-width="1.5"/>
  <rect x="48" y="445" width="1184" height="6" fill="${palette.accent}"/>

  <!-- Scene Title & Spoken Language Banner -->
  <text x="74" y="478" font-family="sans-serif" font-size="20" font-weight="bold" fill="#ffffff">${escapeXml(summaryLines[0] || cleanTitle)}</text>
  ${summaryLines[1] ? `<text x="74" y="502" font-family="sans-serif" font-size="16" fill="#cbd5e1">${escapeXml(summaryLines[1])}</text>` : ''}
  <text x="1210" y="478" font-family="monospace, sans-serif" font-size="12" font-weight="bold" fill="${palette.accent}" text-anchor="end">EMOTIVE BEAT: ${escapeXml(emotionalTone.slice(0, 42))}</text>

  <!-- Localized Spoken Transcript Box -->
  <rect x="74" y="515" width="1132" height="96" rx="8" fill="#090d16" fill-opacity="0.9" stroke="#334155" stroke-width="1"/>
  <text x="94" y="536" font-family="monospace, sans-serif" font-size="11" font-weight="bold" fill="${palette.accent}">LOCALIZED SPOKEN TRANSCRIPT [${langCode}] · TIME: ${escapeXml(startSec)}s – ${escapeXml(endSec)}s</text>
  ${dialogueLines
    .map(
      (line, idx) =>
        `<text x="94" y="${562 + idx * 24}" font-family="sans-serif" font-size="17" fill="#f8fafc" font-weight="500">${escapeXml(line)}</text>`
    )
    .join('\n  ')}

  <!-- Technical Director Specs (Bottom of Plate) -->
  <text x="74" y="638" font-family="monospace, sans-serif" font-size="11" fill="#38bdf8">CAMERA: ${escapeXml(cameraText.slice(0, 40))}   |   LIGHTING: ${escapeXml(lightingText.slice(0, 42))}</text>
  <text x="1210" y="638" font-family="monospace, sans-serif" font-size="11" fill="#94a3b8" text-anchor="end">SETTING: ${escapeXml(envText.slice(0, 52))}</text>

  <!-- Timeline Progress Bar in Bottom Matte -->
  <rect x="0" y="714" width="1280" height="6" fill="#0f172a"/>
  <rect x="0" y="714" width="${Math.max(40, Math.round((sceneNum / total) * 1280))}" height="6" fill="${palette.accent}"/>
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

export interface VisualFilterPresetMeta {
  id: VisualFilterPreset;
  label: string;
  tag: string;
  description: string;
  cssFilter: string;
  ffmpegFilter: string;
  badgeBg: string;
  accentColor: string;
}

export const VISUAL_FILTER_PRESETS: VisualFilterPresetMeta[] = [
  {
    id: 'cinematic-blue',
    label: 'Cinematic Blue',
    tag: 'COOL / SCI-FI TENSION',
    description: 'Anamorphic steel-blue palette with deep cyan shadows and crisp analytical highlights',
    cssFilter: 'contrast(1.15) hue-rotate(190deg) saturate(1.2) brightness(0.96)',
    ffmpegFilter: 'eq=contrast=1.15:brightness=-0.02:saturation=1.1,colorbalance=rs=-0.1:gs=-0.05:bs=0.25',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40',
    accentColor: '#06b6d4'
  },
  {
    id: 'warm-gold',
    label: 'Warm Gold',
    tag: 'GOLDEN HOUR NOSTALGIA',
    description: 'Amber golden hour radiance, warm documentary illumination, and human appeal',
    cssFilter: 'sepia(0.5) contrast(1.1) brightness(1.02) saturate(1.25)',
    ffmpegFilter: 'eq=contrast=1.12:brightness=0.03:saturation=1.25,colorbalance=rs=0.2:gs=0.1:bs=-0.15',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
    accentColor: '#f59e0b'
  },
  {
    id: 'noir',
    label: 'High-Contrast Noir',
    tag: 'MONOCHROME DRAMA',
    description: 'Striking black & white contrast, deep shadows, and intense investigative gravity',
    cssFilter: 'grayscale(1) contrast(1.2)',
    ffmpegFilter: 'hue=s=0,eq=contrast=1.2:brightness=-0.02',
    badgeBg: 'bg-slate-400/20 text-slate-200 border-slate-300/40',
    accentColor: '#94a3b8'
  },
  {
    id: 'teal-orange',
    label: 'Teal & Orange',
    tag: 'HOLLYWOOD BLOCKBUSTER',
    description: 'Complementary color grade with punchy teal shadows and vibrant warm skin tones',
    cssFilter: 'contrast(1.22) saturate(1.4) hue-rotate(18deg)',
    ffmpegFilter: 'eq=contrast=1.2:saturation=1.35,colorbalance=rs=0.15:gs=0.0:bs=0.15',
    badgeBg: 'bg-orange-500/20 text-orange-300 border-orange-400/40',
    accentColor: '#f97316'
  },
  {
    id: 'vintage-cinema',
    label: 'Vintage 35mm',
    tag: 'CLASSIC ARCHIVAL',
    description: 'Soft sepia organic film tones, muted saturation, and timeless documentary atmosphere',
    cssFilter: 'sepia(0.35) contrast(1.08) brightness(0.98) saturate(0.92)',
    ffmpegFilter: 'eq=contrast=1.06:brightness=-0.01:saturation=0.92,colorbalance=rs=0.08:gs=0.04:bs=-0.06',
    badgeBg: 'bg-yellow-600/20 text-yellow-300 border-yellow-500/40',
    accentColor: '#ca8a04'
  },
  {
    id: 'vivid-investigative',
    label: 'Vivid Documentary',
    tag: 'ULTRA REALISM',
    description: 'High-contrast photojournalistic clarity, maximum sharpness, and authentic field colors',
    cssFilter: 'contrast(1.18) saturate(1.25) brightness(1.02)',
    ffmpegFilter: 'eq=contrast=1.16:brightness=0.01:saturation=1.22',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
    accentColor: '#10b981'
  }
];

export const EMOTION_FILTER_PRESET_MAP: Record<VisualFilterPreset, VisualFilterPresetMeta> = {
  'warm-gold': VISUAL_FILTER_PRESETS[1],
  'noir': VISUAL_FILTER_PRESETS[2],
  'cinematic-blue': VISUAL_FILTER_PRESETS[0],
  'teal-orange': VISUAL_FILTER_PRESETS[3],
  'vintage-cinema': VISUAL_FILTER_PRESETS[4],
  'vivid-investigative': VISUAL_FILTER_PRESETS[5],
  'default': VISUAL_FILTER_PRESETS[0]
};

export function mapEmotionToVisualFilter(emotion?: string, tone?: string): VisualFilterPreset {
  const combined = `${emotion || ''} ${tone || ''}`.toLowerCase();
  if (
    combined.includes('space') ||
    combined.includes('telemetry') ||
    combined.includes('science') ||
    combined.includes('tech') ||
    combined.includes('cyber') ||
    combined.includes('satellite') ||
    combined.includes('future') ||
    combined.includes('cold')
  ) {
    return 'cinematic-blue';
  }
  if (
    combined.includes('pride') ||
    combined.includes('triumph') ||
    combined.includes('resilience') ||
    combined.includes('national') ||
    combined.includes('dawn') ||
    combined.includes('gold') ||
    combined.includes('hope') ||
    combined.includes('awakening')
  ) {
    return 'warm-gold';
  }
  if (
    combined.includes('noir') ||
    combined.includes('dark') ||
    combined.includes('shadow') ||
    combined.includes('conspiracy') ||
    combined.includes('threat') ||
    combined.includes('surveillance')
  ) {
    return 'noir';
  }
  if (
    combined.includes('crisis') ||
    combined.includes('traffic') ||
    combined.includes('urgency') ||
    combined.includes('bottleneck') ||
    combined.includes('congest') ||
    combined.includes('drama')
  ) {
    return 'teal-orange';
  }
  if (
    combined.includes('investigative') ||
    combined.includes('journalism') ||
    combined.includes('report') ||
    combined.includes('citizen') ||
    combined.includes('accountability')
  ) {
    return 'vivid-investigative';
  }
  if (
    combined.includes('archive') ||
    combined.includes('history') ||
    combined.includes('heritage') ||
    combined.includes('statute') ||
    combined.includes('constitution')
  ) {
    return 'vintage-cinema';
  }
  return 'cinematic-blue';
}

export function getSceneCinematicFilter(
  index = 0,
  presetId?: VisualFilterPreset,
  emotion?: string,
  tone?: string
): {
  filter: string;
  objectPosition: string;
  preset: VisualFilterPresetMeta;
} {
  const resolvedId = (presetId && presetId !== 'default')
    ? presetId
    : mapEmotionToVisualFilter(emotion, tone);
  const meta =
    VISUAL_FILTER_PRESETS.find(p => p.id === resolvedId) || VISUAL_FILTER_PRESETS[index % VISUAL_FILTER_PRESETS.length];
  return {
    filter: meta.cssFilter,
    objectPosition: 'center center',
    preset: meta
  };
}

export function generateCharacterAvatar(char: Partial<CharacterRegistryEntry>): string {
  const name = char.name || 'Speaker';
  const role = char.role || 'Documentary Subject';
  const initials = name
    .split(/\s+/)
    .map(p => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'CH';

  const isPresenter = /journalist|reporter|anchor|host|presenter|sai/i.test(`${name} ${role}`);
  const isLeader = /minister|leader|official|shah|doval|director|chief/i.test(`${name} ${role}`);
  const isScientist = /isro|scientist|engineer|propulsion|space|telemetry/i.test(`${name} ${role}`);

  const bgGrad = isPresenter
    ? ['#0f766e', '#042f2e']
    : isLeader
    ? ['#b45309', '#451a03']
    : isScientist
    ? ['#0369a1', '#082f49']
    : ['#475569', '#0f172a'];

  const accentColor = isPresenter ? '#2dd4bf' : isLeader ? '#fbbf24' : isScientist ? '#38bdf8' : '#94a3b8';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgGrad[0]}" />
        <stop offset="100%" stop-color="${bgGrad[1]}" />
      </linearGradient>
      <radialGradient id="halo" cx="50%" cy="40%" r="55%">
        <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.35" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0" />
      </radialGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000000" flood-opacity="0.6"/>
      </filter>
    </defs>
    <rect width="200" height="200" fill="url(#bg)" />
    <circle cx="100" cy="80" r="75" fill="url(#halo)" />
    <circle cx="100" cy="72" r="38" fill="#e2e8f0" opacity="0.95" />
    <path d="M 45 185 C 45 130, 155 130, 155 185 Z" fill="#cbd5e1" opacity="0.95" />
    <path d="M 85 138 L 100 165 L 115 138 Z" fill="${accentColor}" />
    <circle cx="100" cy="72" r="30" fill="${bgGrad[1]}" opacity="0.85" filter="url(#shadow)" />
    <text x="100" y="80" text-anchor="middle" font-family="monospace, sans-serif" font-size="22" font-weight="900" fill="${accentColor}">${initials}</text>
    <rect x="10" y="162" width="180" height="26" rx="6" fill="#020617" opacity="0.85" stroke="${accentColor}" stroke-opacity="0.4" stroke-width="1.5" />
    <text x="100" y="179" text-anchor="middle" font-family="sans-serif" font-size="10" font-weight="700" fill="#f8fafc" letter-spacing="0.5">${name.slice(0, 18).toUpperCase()}</text>
  </svg>`;

  if (typeof btoa !== 'undefined') {
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
  }
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

