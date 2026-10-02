// Generates unique, cinematic 16:9 visual artwork for video scenes
// Eliminates repetitive stock photos by synthesizing custom scene visuals tailored to video theme

export interface SceneVisualParams {
  sceneNumber: number;
  title: string;
  summary: string;
  visualDescription?: string;
  theme?: 'tech' | 'cinematic' | 'documentary' | 'music' | 'nature' | 'urban';
  timecode?: string;
  resolution?: string;
}

const PALETTES = [
  {
    bg1: '#090d16',
    bg2: '#111a2e',
    accent1: '#38bdf8',
    accent2: '#818cf8',
    glow: '#0284c7',
    tag: 'ANAMORPHIC 35MM · CYBER BLUE'
  },
  {
    bg1: '#140c06',
    bg2: '#281708',
    accent1: '#f59e0b',
    accent2: '#ef4444',
    glow: '#d97706',
    tag: 'GOLDEN HOUR · VOLUMETRIC TUNGSTEN'
  },
  {
    bg1: '#071611',
    bg2: '#0e2b22',
    accent1: '#10b981',
    accent2: '#06b6d4',
    glow: '#059669',
    tag: 'EMERALD SPECTRUM · CINEMATIC DUAL'
  },
  {
    bg1: '#130919',
    bg2: '#240d33',
    accent1: '#c084fc',
    accent2: '#f43f5e',
    glow: '#9333ea',
    tag: 'TWILIGHT NEON · ANAMORPHIC WIDE'
  }
];

export function generateSceneArtwork(params: SceneVisualParams): string {
  const { sceneNumber, title, summary, visualDescription, timecode = '00:00 - 02:45', resolution = '4K UHD' } = params;
  const palette = PALETTES[(sceneNumber - 1) % PALETTES.length];
  const cleanTitle = (title || 'Cinematic Production').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const cleanSummary = (summary || `Scene 0${sceneNumber} Narrative`).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const cleanDesc = (visualDescription || 'Dynamic visual synthesis with synchronized audio').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').slice(0, 110);

  // Generate dynamic geometric elements based on sceneNumber
  const seed = (sceneNumber * 9301 + 49297) % 233280;
  const isAlt = sceneNumber % 2 === 0;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.bg1}" />
      <stop offset="50%" stop-color="${palette.bg2}" />
      <stop offset="100%" stop-color="#020408" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${palette.accent1}" />
      <stop offset="100%" stop-color="${palette.accent2}" />
    </linearGradient>
    <radialGradient id="lensGlow" cx="${isAlt ? '65%' : '35%'}" cy="45%" r="60%">
      <stop offset="0%" stop-color="${palette.glow}" stop-opacity="0.45" />
      <stop offset="50%" stop-color="${palette.glow}" stop-opacity="0.12" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>
    <filter id="blurFilter" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="60" />
    </filter>
  </defs>

  <!-- Background Base -->
  <rect width="1920" height="1080" fill="url(#bgGrad)" />

  <!-- Volumetric Lighting and Ambient Glow -->
  <circle cx="${isAlt ? '1350' : '570'}" cy="420" r="540" fill="url(#lensGlow)" />
  <circle cx="${isAlt ? '450' : '1400'}" cy="700" r="420" fill="${palette.accent1}" opacity="0.08" filter="url(#blurFilter)" />

  <!-- Perspective Floor Grid (Studio Depth) -->
  <g opacity="0.15" stroke="${palette.accent1}" stroke-width="1.5">
    <line x1="0" y1="1080" x2="960" y2="540" />
    <line x1="384" y1="1080" x2="960" y2="540" />
    <line x1="768" y1="1080" x2="960" y2="540" />
    <line x1="1152" y1="1080" x2="960" y2="540" />
    <line x1="1536" y1="1080" x2="960" y2="540" />
    <line x1="1920" y1="1080" x2="960" y2="540" />
    <line x1="200" y1="900" x2="1720" y2="900" />
    <line x1="400" y1="780" x2="1520" y2="780" />
    <line x1="600" y1="680" x2="1320" y2="680" />
    <line x1="780" y1="600" x2="1140" y2="600" />
  </g>

  <!-- Central Dynamic Cinematic Artwork: Abstract Architecture & Linguistic Waveform -->
  <g opacity="0.85">
    <!-- Waveform sound bars -->
    <g fill="${palette.accent1}" opacity="0.25">
      <rect x="700" y="440" width="8" height="120" rx="4" />
      <rect x="740" y="400" width="8" height="180" rx="4" />
      <rect x="780" y="360" width="8" height="240" rx="4" />
      <rect x="820" y="320" width="8" height="300" rx="4" fill="${palette.accent2}" />
      <rect x="860" y="280" width="8" height="360" rx="4" fill="${palette.accent2}" />
      <rect x="900" y="250" width="8" height="420" rx="4" fill="url(#accentGrad)" />
      <rect x="940" y="230" width="8" height="450" rx="4" fill="#ffffff" />
      <rect x="980" y="250" width="8" height="420" rx="4" fill="url(#accentGrad)" />
      <rect x="1020" y="280" width="8" height="360" rx="4" fill="${palette.accent2}" />
      <rect x="1060" y="320" width="8" height="300" rx="4" fill="${palette.accent2}" />
      <rect x="1100" y="360" width="8" height="240" rx="4" />
      <rect x="1140" y="400" width="8" height="180" rx="4" />
      <rect x="1180" y="440" width="8" height="120" rx="4" />
    </g>

    <!-- Focal Anamorphic Light Streak -->
    <ellipse cx="960" cy="510" rx="720" ry="3" fill="#ffffff" opacity="0.8" />
    <ellipse cx="960" cy="510" rx="900" ry="12" fill="${palette.accent1}" opacity="0.4" />
    <ellipse cx="960" cy="510" rx="400" ry="24" fill="${palette.glow}" opacity="0.3" filter="url(#blurFilter)" />

    <!-- Orbital Focus Rings -->
    <circle cx="960" cy="510" r="180" fill="none" stroke="${palette.accent1}" stroke-width="2" opacity="0.4" stroke-dasharray="8 6" />
    <circle cx="960" cy="510" r="260" fill="none" stroke="${palette.accent2}" stroke-width="1.5" opacity="0.25" stroke-dasharray="14 10" />
    <circle cx="960" cy="510" r="45" fill="${palette.accent1}" opacity="0.9" />
    <circle cx="960" cy="510" r="20" fill="#ffffff" />
  </g>

  <!-- Cinema HUD / Viewfinder Overlay -->
  <g font-family="system-ui, -apple-system, sans-serif">
    <!-- Camera Bracket Corners -->
    <path d="M 80 120 L 80 80 L 120 80" fill="none" stroke="#ffffff" stroke-width="3" opacity="0.7" />
    <path d="M 1840 120 L 1840 80 L 1800 80" fill="none" stroke="#ffffff" stroke-width="3" opacity="0.7" />
    <path d="M 80 960 L 80 1000 L 120 1000" fill="none" stroke="#ffffff" stroke-width="3" opacity="0.7" />
    <path d="M 1840 960 L 1840 1000 L 1800 1000" fill="none" stroke="#ffffff" stroke-width="3" opacity="0.7" />

    <!-- Top Status Bar -->
    <rect x="80" y="50" width="340" height="34" rx="8" fill="#000000" fill-opacity="0.65" />
    <circle cx="104" cy="67" r="6" fill="#ef4444" />
    <text x="122" y="73" fill="#ffffff" font-size="14" font-weight="700" letter-spacing="1.5">REC ● ${resolution} 60FPS</text>
    <text x="310" y="73" fill="${palette.accent1}" font-size="13" font-weight="600">35MM ANAMORPHIC</text>

    <!-- Center Top Scene Badge -->
    <rect x="820" y="50" width="280" height="34" rx="8" fill="#000000" fill-opacity="0.65" />
    <text x="960" y="73" text-anchor="middle" fill="#f59e0b" font-size="14" font-weight="700" letter-spacing="2">SCENE 0${sceneNumber} OF 04</text>

    <!-- Top Right Timecode -->
    <rect x="1560" y="50" width="280" height="34" rx="8" fill="#000000" fill-opacity="0.65" />
    <text x="1700" y="73" text-anchor="middle" fill="#ffffff" font-size="14" font-family="monospace" letter-spacing="1">TC: ${timecode}</text>

    <!-- Bottom Narrative Slate Box -->
    <rect x="80" y="860" width="1760" height="120" rx="16" fill="#000000" fill-opacity="0.75" stroke="#ffffff" stroke-opacity="0.12" stroke-width="1.5" />
    
    <text x="115" y="905" fill="${palette.accent1}" font-size="14" font-weight="700" letter-spacing="2">SCENE ${sceneNumber} · ${cleanTitle.toUpperCase()}</text>
    <text x="115" y="938" fill="#ffffff" font-size="22" font-weight="700">${cleanSummary}</text>
    <text x="115" y="964" fill="#94a3b8" font-size="15" font-weight="400">${cleanDesc}...</text>

    <!-- Bottom Right Color Grading Tag -->
    <text x="1800" y="940" text-anchor="end" fill="#64748b" font-size="12" font-family="monospace">${palette.tag}</text>
    <text x="1800" y="964" text-anchor="end" fill="${palette.accent1}" font-size="13" font-family="monospace" font-weight="600">AI VISUAL FRAME SYNTHESIZED</text>
  </g>

  <!-- Cinematic Letterbox Borders -->
  <rect x="0" y="0" width="1920" height="30" fill="#000000" />
  <rect x="0" y="1050" width="1920" height="30" fill="#000000" />
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
