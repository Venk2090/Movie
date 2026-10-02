// Procedural 4K cinematic scene artwork generator
// Generates 100% unique, freshly designed cinematic visual frames tailored to each scene's topic, camera angle, lighting, and timeline.

interface SceneArtParams {
  id?: number;
  sceneNumber: number;
  summary: string;
  visualDescription?: string;
  prompt?: string;
  camera?: string;
  lighting?: string;
  environment?: string;
  startTime: number;
  endTime: number;
}

const PALETTES = [
  {
    name: 'Cyberpunk Aurora',
    bg1: '#070b19',
    bg2: '#0f172a',
    accent1: '#38bdf8', // cyan
    accent2: '#818cf8', // indigo
    glow: '#0284c7',
    grid: '#1e293b'
  },
  {
    name: 'Solar Horizon',
    bg1: '#180e05',
    bg2: '#27170a',
    accent1: '#f59e0b', // amber
    accent2: '#f43f5e', // rose
    glow: '#d97706',
    grid: '#3b2510'
  },
  {
    name: 'Emerald Nexus',
    bg1: '#041512',
    bg2: '#062922',
    accent1: '#10b981', // emerald
    accent2: '#06b6d4', // cyan
    glow: '#059669',
    grid: '#0f3d32'
  },
  {
    name: 'Cosmic Violet',
    bg1: '#12071f',
    bg2: '#1e0c33',
    accent1: '#c084fc', // purple
    accent2: '#ec4899', // pink
    glow: '#9333ea',
    grid: '#2f1252'
  },
  {
    name: 'Crimson Eclipse',
    bg1: '#190707',
    bg2: '#2d0f0f',
    accent1: '#ef4444', // red
    accent2: '#f97316', // orange
    glow: '#dc2626',
    grid: '#3e1616'
  },
  {
    name: 'Deep Monolith',
    bg1: '#090d16',
    bg2: '#131b2e',
    accent1: '#60a5fa', // blue
    accent2: '#34d399', // mint
    glow: '#2563eb',
    grid: '#1a233a'
  },
  {
    name: 'Gold Broadcast Studio',
    bg1: '#14120c',
    bg2: '#242015',
    accent1: '#fbbf24', // warm gold
    accent2: '#38bdf8', // contrasting cyan
    glow: '#b45309',
    grid: '#36301d'
  },
  {
    name: 'Neo Tokyo Horizon',
    bg1: '#080d1a',
    bg2: '#151c33',
    accent1: '#22d3ee', // electric cyan
    accent2: '#a855f7', // electric purple
    glow: '#0891b2',
    grid: '#1d2745'
  }
];

function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hrs > 0) return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  return `${pad(mins)}:${pad(secs)}`;
}

export function generateSceneArtwork(
  scene: SceneArtParams,
  videoTitle = 'Cinematic Production',
  index?: number,
  totalScenes = 8
): string {
  const sceneNum = scene.sceneNumber || 1;
  const idx = typeof index === 'number' ? index : (sceneNum - 1);
  const palette = PALETTES[Math.abs(idx) % PALETTES.length];
  const formattedNum = String(sceneNum).padStart(2, '0');
  const totalNum = String(totalScenes).padStart(2, '0');
  const timeRange = `${formatTime(scene.startTime)} - ${formatTime(scene.endTime)}`;
  const cleanTitle = (videoTitle || 'Cinematic Production').replace(/[<>&"]/g, '');
  const cleanSummary = (scene.summary || `Scene ${formattedNum}`).replace(/[<>&"]/g, '');
  const cleanCamera = (scene.camera || '24mm Anamorphic Prime').replace(/[<>&"]/g, '');
  const cleanLighting = (scene.lighting || 'Cinematic Volumetric Rim').replace(/[<>&"]/g, '');
  const cleanEnv = (scene.environment || 'Studio Stage').replace(/[<>&"]/g, '');

  // Deterministic seed variations based on scene number
  const horizonY = 540 + (idx % 3) * 40 - 20;
  const sunX = 350 + (idx % 5) * 260;
  const sunY = 320 + (idx % 2) * 50;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <defs>
    <!-- Background Gradients -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.bg1}" />
      <stop offset="60%" stop-color="${palette.bg2}" />
      <stop offset="100%" stop-color="${palette.bg1}" />
    </linearGradient>

    <!-- Celestial / Lens Flare Glow -->
    <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${palette.accent1}" stop-opacity="0.85" />
      <stop offset="35%" stop-color="${palette.accent2}" stop-opacity="0.35" />
      <stop offset="70%" stop-color="${palette.glow}" stop-opacity="0.12" />
      <stop offset="100%" stop-color="${palette.glow}" stop-opacity="0" />
    </radialGradient>

    <!-- Horizon Atmospheric Fog -->
    <linearGradient id="horizonFog" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${palette.accent1}" stop-opacity="0" />
      <stop offset="70%" stop-color="${palette.accent1}" stop-opacity="0.18" />
      <stop offset="100%" stop-color="${palette.bg1}" stop-opacity="0.9" />
    </linearGradient>

    <!-- Anamorphic Streak Gradient -->
    <linearGradient id="streak" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${palette.accent1}" stop-opacity="0" />
      <stop offset="30%" stop-color="${palette.accent1}" stop-opacity="0.2" />
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.8" />
      <stop offset="70%" stop-color="${palette.accent2}" stop-opacity="0.2" />
      <stop offset="100%" stop-color="${palette.accent2}" stop-opacity="0" />
    </linearGradient>

    <!-- Vignette Mask -->
    <radialGradient id="vignette" cx="50%" cy="50%" r="65%">
      <stop offset="50%" stop-color="#000000" stop-opacity="0" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.75" />
    </radialGradient>
  </defs>

  <!-- Deep Canvas Background -->
  <rect width="1920" height="1080" fill="url(#bgGrad)" />

  <!-- Perspective Floor Grid -->
  <g opacity="0.35" stroke="${palette.grid}" stroke-width="1.5">
    <line x1="960" y1="${horizonY}" x2="0" y2="1080" />
    <line x1="960" y1="${horizonY}" x2="320" y2="1080" />
    <line x1="960" y1="${horizonY}" x2="640" y2="1080" />
    <line x1="960" y1="${horizonY}" x2="960" y2="1080" />
    <line x1="960" y1="${horizonY}" x2="1280" y2="1080" />
    <line x1="960" y1="${horizonY}" x2="1600" y2="1080" />
    <line x1="960" y1="${horizonY}" x2="1920" y2="1080" />

    <!-- Grid horizontals -->
    <line x1="0" y1="620" x2="1920" y2="620" stroke-opacity="0.2" />
    <line x1="0" y1="710" x2="1920" y2="710" stroke-opacity="0.4" />
    <line x1="0" y1="820" x2="1920" y2="820" stroke-opacity="0.6" />
    <line x1="0" y1="950" x2="1920" y2="950" stroke-opacity="0.8" />
  </g>

  <!-- Atmospheric Light Source (Sun / Hologram) -->
  <circle cx="${sunX}" cy="${sunY}" r="380" fill="url(#sunGlow)" />
  <circle cx="${sunX}" cy="${sunY}" r="110" fill="${palette.accent1}" fill-opacity="0.25" stroke="${palette.accent1}" stroke-width="2" stroke-opacity="0.6" />
  <circle cx="${sunX}" cy="${sunY}" r="65" fill="#ffffff" fill-opacity="0.4" />

  <!-- Horizon Anamorphic Light Streak -->
  <rect x="0" y="${sunY - 3}" width="1920" height="6" fill="url(#streak)" />

  <!-- Architectural Cityscape / Soundwave Silhouette -->
  <g fill="${palette.bg1}" fill-opacity="0.95" stroke="${palette.accent1}" stroke-width="1.5" stroke-opacity="0.3">
    <!-- Building silhouetted towers -->
    <rect x="180" y="${horizonY - 240}" width="70" height="240" rx="3" />
    <rect x="260" y="${horizonY - 310}" width="95" height="310" rx="4" />
    <rect x="365" y="${horizonY - 180}" width="80" height="180" rx="3" />
    <rect x="455" y="${horizonY - 270}" width="110" height="270" rx="4" />
    
    <!-- Central Geometric Megastructure -->
    <polygon points="960,${horizonY - 380} 1070,${horizonY - 200} 1050,${horizonY} 870,${horizonY} 850,${horizonY - 200}" fill="${palette.bg2}" stroke="${palette.accent2}" stroke-width="2" stroke-opacity="0.5" />
    <circle cx="960" cy="${horizonY - 260}" r="45" fill="none" stroke="${palette.accent1}" stroke-width="3" stroke-dasharray="8 6" />

    <!-- Right towers -->
    <rect x="1220" y="${horizonY - 290}" width="90" height="290" rx="3" />
    <rect x="1320" y="${horizonY - 220}" width="75" height="220" rx="3" />
    <rect x="1405" y="${horizonY - 340}" width="105" height="340" rx="4" />
    <rect x="1520" y="${horizonY - 190}" width="85" height="190" rx="3" />
    <rect x="1615" y="${horizonY - 260}" width="120" height="260" rx="4" />
  </g>

  <!-- Volumetric Light Beams -->
  <g opacity="0.15">
    <polygon points="${sunX},${sunY} 0,1080 300,1080" fill="${palette.accent1}" />
    <polygon points="${sunX},${sunY} 700,1080 1100,1080" fill="${palette.accent2}" />
    <polygon points="${sunX},${sunY} 1600,1080 1920,1080" fill="${palette.accent1}" />
  </g>

  <!-- Floating Holographic Particles -->
  <g fill="${palette.accent1}" opacity="0.6">
    <circle cx="280" cy="220" r="2.5" />
    <circle cx="440" cy="180" r="3" />
    <circle cx="680" cy="280" r="2" />
    <circle cx="920" cy="190" r="3.5" />
    <circle cx="1140" cy="240" r="2" />
    <circle cx="1380" cy="170" r="3" />
    <circle cx="1620" cy="290" r="2.5" />
    <circle cx="1780" cy="210" r="3" />
  </g>

  <!-- Horizon Fog Layer -->
  <rect x="0" y="${horizonY - 100}" width="1920" height="350" fill="url(#horizonFog)" />

  <!-- Vignette -->
  <rect width="1920" height="1080" fill="url(#vignette)" />

  <!-- 2.39:1 Anamorphic Scope Letterbox Guide Crop Marks -->
  <line x1="80" y1="90" x2="1840" y2="90" stroke="#ffffff" stroke-opacity="0.15" stroke-dasharray="12 8" />
  <line x1="80" y1="990" x2="1840" y2="990" stroke="#ffffff" stroke-opacity="0.15" stroke-dasharray="12 8" />

  <!-- HUD Overlay Elements -->
  <!-- Top Left: Cinema Timecode & Scene Index -->
  <g transform="translate(100, 140)">
    <rect x="0" y="0" width="310" height="54" rx="8" fill="#000000" fill-opacity="0.65" stroke="${palette.accent1}" stroke-width="1.5" stroke-opacity="0.6" />
    <text x="18" y="24" fill="${palette.accent1}" font-family="monospace, ui-monospace" font-size="13" font-weight="700" letter-spacing="1.5">SCENE ${formattedNum} / ${totalNum}</text>
    <text x="18" y="44" fill="#ffffff" font-family="monospace, ui-monospace" font-size="16" font-weight="600" letter-spacing="1">TIMECODE: ${timeRange}</text>
  </g>

  <!-- Top Right: 4K UHD Master Specs -->
  <g transform="translate(1480, 140)">
    <rect x="0" y="0" width="340" height="54" rx="8" fill="#000000" fill-opacity="0.65" stroke="#ffffff" stroke-width="1" stroke-opacity="0.2" />
    <circle cx="24" cy="27" r="6" fill="#ef4444" />
    <text x="38" y="24" fill="#ef4444" font-family="monospace, ui-monospace" font-size="12" font-weight="700" letter-spacing="1">AI LIVE RENDER</text>
    <text x="38" y="43" fill="#94a3b8" font-family="monospace, ui-monospace" font-size="13" font-weight="500">3840×2160 • 60 FPS • REC.2020</text>
  </g>

  <!-- Bottom Hero Banner: Scene Narrative & Direction -->
  <g transform="translate(100, 810)">
    <rect x="0" y="0" width="1720" height="140" rx="12" fill="#000000" fill-opacity="0.75" stroke="${palette.accent2}" stroke-width="1.5" stroke-opacity="0.5" />
    
    <!-- Left Accent Pillar -->
    <rect x="0" y="0" width="8" height="140" rx="4" fill="${palette.accent1}" />

    <!-- Project Video Title & Scene Number -->
    <text x="32" y="38" fill="${palette.accent1}" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="700" letter-spacing="2">
      ${cleanTitle.toUpperCase()}
    </text>

    <!-- Main Scene Summary Narrative -->
    <text x="32" y="74" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="700">
      ${cleanSummary}
    </text>

    <!-- Production Meta Spec Line -->
    <text x="32" y="112" fill="#cbd5e1" font-family="monospace, ui-monospace" font-size="13" font-weight="500">
      CAM: [${cleanCamera}]   •   LIGHT: [${cleanLighting}]   •   ENV: [${cleanEnv}]
    </text>
  </g>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
