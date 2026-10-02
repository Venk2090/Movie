import React from 'react';
import { ShieldCheck, AlertTriangle, FileCode } from 'lucide-react';

export const LicenseInventoryView: React.FC = () => {
  const licenseRows = [
    {
      capability: 'Speech-to-Text (STT)',
      model: 'faster-whisper (Whisper-large-v3)',
      version: 'v3 / base',
      license: 'MIT License',
      commercial: 'Yes',
      redistribution: 'Yes',
      sourceUrl: 'https://github.com/SYSTRAN/faster-whisper',
      restrictions: 'Permissive MIT. Zero operational restrictions.'
    },
    {
      capability: 'Translation (Commercial)',
      model: 'OPUS-MT / MarianMT',
      version: 'v1.0',
      license: 'Apache 2.0 / CC-BY-4.0',
      commercial: 'Yes',
      redistribution: 'Yes',
      sourceUrl: 'https://github.com/Helsinki-NLP/Opus-MT',
      restrictions: 'Unrestricted open-source license for commercial deployments.'
    },
    {
      capability: 'Translation (Local LLM)',
      model: 'Qwen 2.5 7B (Ollama)',
      version: '7B-Instruct',
      license: 'Apache 2.0',
      commercial: 'Yes',
      redistribution: 'Yes',
      sourceUrl: 'https://github.com/QwenLM/Qwen2.5',
      restrictions: 'Permissive Apache 2.0. Multilingual Indic + European coverage.'
    },
    {
      capability: 'Translation (Research/Baseline)',
      model: 'Meta NLLB-200',
      version: 'distilled-600M',
      license: 'CC-BY-NC 4.0 (Base)',
      commercial: 'Non-Commercial',
      redistribution: 'Attribution',
      sourceUrl: 'https://huggingface.co/facebook/nllb-200-distilled-600M',
      restrictions: 'RESTRICTION: Base weights require non-commercial use. Use OPUS-MT for commercial monetization.'
    },
    {
      capability: 'Text-to-Speech (TTS)',
      model: 'Kokoro-82M',
      version: 'v0.19 / v1.0',
      license: 'Apache 2.0',
      commercial: 'Yes',
      redistribution: 'Yes',
      sourceUrl: 'https://huggingface.co/hexgrad/Kokoro-82M',
      restrictions: 'Permissive Apache 2.0. Ultra-lightweight 82M parameters.'
    },
    {
      capability: 'Text-to-Speech (Voice Cloning)',
      model: 'Coqui XTTS-v2',
      version: 'v2.0.3',
      license: 'CPML (Coqui Public)',
      commercial: 'Non-Commercial',
      redistribution: 'Restricted',
      sourceUrl: 'https://github.com/coqui-ai/TTS',
      restrictions: 'RESTRICTION: Non-commercial CPML. Disabled by default; consent confirmation required.'
    },
    {
      capability: 'Image Generation Engine',
      model: 'ComfyUI Node Engine',
      version: 'v0.3+',
      license: 'GPL-3.0',
      commercial: 'Yes',
      redistribution: 'GPL Copyleft',
      sourceUrl: 'https://github.com/comfyanonymous/ComfyUI',
      restrictions: 'Self-hosted modular workflow execution engine.'
    },
    {
      capability: 'Image Diffusion Weights',
      model: 'SDXL Base 1.0',
      version: '1.0',
      license: 'CreativeML OpenRAIL++-M',
      commercial: 'Yes (With limits)',
      redistribution: 'OpenRAIL terms',
      sourceUrl: 'https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0',
      restrictions: 'Open weights. Standard behavioral restrictions against illegal content.'
    },
    {
      capability: 'Deterministic Video Engine',
      model: 'FFmpeg Core Engine',
      version: '7.0+',
      license: 'LGPL v2.1+ / GPL v2+',
      commercial: 'Yes',
      redistribution: 'Dynamic Linking',
      sourceUrl: 'https://ffmpeg.org',
      restrictions: 'Deterministic Ken Burns pan/zoom, audio muxing, and 4K output.'
    },
    {
      capability: 'Media Downloader',
      model: 'yt-dlp',
      version: 'Latest',
      license: 'The Unlicense',
      commercial: 'Yes',
      redistribution: 'Public Domain',
      sourceUrl: 'https://github.com/yt-dlp/yt-dlp',
      restrictions: 'Permitted source media extraction.'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-white">Third-Party Software &amp; Model License Inventory</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Strict audit from <code className="text-amber-300">/docs/THIRD_PARTY_LICENSES.md</code>. No hidden closed-source APIs.
          </p>
        </div>
        <div className="text-xs text-emerald-400 font-mono flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4" />
          <span>FOSS Compliance Matrix</span>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase">
              <tr>
                <th className="py-3 px-4">Capability</th>
                <th className="py-3 px-4">Model / Dependency</th>
                <th className="py-3 px-4">License</th>
                <th className="py-3 px-4">Commercial?</th>
                <th className="py-3 px-4">Known Restrictions / Compliant Alternative</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {licenseRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-medium text-slate-300 whitespace-nowrap">
                    {row.capability}
                  </td>
                  <td className="py-3 px-4 text-white font-mono whitespace-nowrap">
                    {row.model}
                  </td>
                  <td className="py-3 px-4 text-amber-300 font-mono whitespace-nowrap">
                    {row.license}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-medium ${
                        row.commercial === 'Yes'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : row.commercial === 'Yes (With limits)'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-amber-400/10 text-amber-300 border border-amber-400/20'
                      }`}
                    >
                      {row.commercial}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-[11px] leading-relaxed max-w-md">
                    {row.restrictions}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
