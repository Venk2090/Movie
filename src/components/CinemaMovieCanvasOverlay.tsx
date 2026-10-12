import React, { useEffect, useRef } from 'react';
import { CinematicMotionPreset } from '../types';
import { ExtractedCharacter } from '../utils/sceneArt';

interface CinemaMovieCanvasOverlayProps {
  archetype: ExtractedCharacter['archetype'];
  motionPreset: CinematicMotionPreset;
  isSpeakingOrPlaying: boolean;
  sceneNumber: number;
  totalScenes: number;
  compact?: boolean;
  anamorphicScope?: boolean;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  hue: string;
}

export const CinemaMovieCanvasOverlay: React.FC<CinemaMovieCanvasOverlayProps> = ({
  archetype,
  motionPreset,
  isSpeakingOrPlaying,
  sceneNumber,
  compact = false,
  anamorphicScope = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = compact ? 640 : 1280;
    const height = compact ? 360 : 720;
    canvas.width = width;
    canvas.height = height;

    const count = compact ? 28 : 52;
    const particles: Particle[] = Array.from({ length: count }, (_, i) => {
      const isWarm = i % 2 === 0;
      const hue =
        archetype === 'security'
          ? isWarm
            ? '56, 189, 248'
            : '16, 185, 129'
          : archetype === 'scientist'
          ? isWarm
            ? '251, 191, 36'
            : '56, 189, 248'
          : isWarm
          ? '251, 191, 36'
          : '248, 250, 252';
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        z: 0.4 + Math.random() * 1.4,
        vx: (Math.random() - 0.5) * 0.9,
        vy: -0.25 - Math.random() * 0.55,
        radius: (compact ? 1.4 : 2.4) * (0.6 + Math.random() * 1.6),
        alpha: 0.18 + Math.random() * 0.48,
        hue
      };
    });

    let rafId = 0;
    let startTime = performance.now();

    const renderFrame = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      ctx.clearRect(0, 0, width, height);

      // 1. Dynamic Volumetric Cinema God-Rays / Stage Spotlight Sweep
      ctx.save();
      const raySweep = Math.sin(elapsed * 0.85) * (width * 0.14);
      const grad = ctx.createLinearGradient(
        width * 0.25 + raySweep,
        0,
        width * 0.65 - raySweep,
        height
      );
      if (archetype === 'security') {
        grad.addColorStop(0, 'rgba(56, 189, 248, 0.14)');
        grad.addColorStop(0.5, 'rgba(14, 165, 233, 0.04)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else if (archetype === 'scientist') {
        grad.addColorStop(0, 'rgba(59, 130, 246, 0.15)');
        grad.addColorStop(0.5, 'rgba(251, 191, 36, 0.06)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        grad.addColorStop(0, 'rgba(251, 191, 36, 0.15)');
        grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.05)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      // 2. Camera Motion Vector Parallax Bias
      const panBiasX =
        motionPreset === 'pan'
          ? Math.cos(elapsed * 0.7) * 1.35
          : motionPreset === 'orbit'
          ? Math.sin(elapsed * 0.9) * 1.6
          : 0.35;
      const panBiasY =
        motionPreset === 'crane'
          ? -Math.cos(elapsed * 0.75) * 1.25
          : motionPreset === 'dolly'
          ? Math.sin(elapsed * 0.8) * 0.65
          : -0.25;

      // 3. Multi-Plane 3D Atmospheric Bokeh & Dust Motes
      for (const p of particles) {
        p.x += (p.vx + panBiasX) * p.z * (isSpeakingOrPlaying ? 1.45 : 0.9);
        p.y += (p.vy + panBiasY) * p.z * (isSpeakingOrPlaying ? 1.45 : 0.9);

        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;

        const twinkle = 0.65 + 0.35 * Math.sin(elapsed * 2.5 + p.x * 0.02);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * p.z, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.hue}, ${(p.alpha * twinkle).toFixed(3)})`;
        ctx.fill();
      }

      // 4. Transcript-Driven Scene Archetype Live Motion FX
      if (archetype === 'security') {
        // Rotating Tactical Defense Command Radar & Target Reticle in Top-Right Quadrant
        const rx = width * 0.84;
        const ry = height * 0.28;
        const rRadius = compact ? 38 : 68;
        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.32)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(rx, ry, rRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(rx, ry, rRadius * 0.55, 0, Math.PI * 2);
        ctx.stroke();

        // Rotating radar sweep beam
        const angle = (elapsed * 1.9) % (Math.PI * 2);
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.arc(rx, ry, rRadius, angle - 0.45, angle);
        ctx.closePath();
        ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
        ctx.fill();

        // Pulsing target blip
        const blipAlpha = 0.4 + 0.6 * Math.abs(Math.sin(elapsed * 4));
        ctx.beginPath();
        ctx.arc(rx + rRadius * 0.35, ry - rRadius * 0.28, compact ? 2.5 : 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(248, 113, 113, ${blipAlpha.toFixed(2)})`;
        ctx.fill();
        ctx.restore();
      } else if (archetype === 'scientist') {
        // Live PSLV Orbital Trajectory Arc & Moving Rocket Stage Vector
        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.38)';
        ctx.lineWidth = compact ? 1.5 : 2.2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        const startX = width * 0.62;
        const startY = height * 0.68;
        const ctrlX = width * 0.74;
        const ctrlY = height * 0.18;
        const endX = width * 0.94;
        const endY = height * 0.14;
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
        ctx.stroke();

        // Animated rocket telemetry point along quadratic curve
        const t = (elapsed * 0.24) % 1;
        const invT = 1 - t;
        const px = invT * invT * startX + 2 * invT * t * ctrlX + t * t * endX;
        const py = invT * invT * startY + 2 * invT * t * ctrlY + t * t * endY;

        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(px, py, compact ? 3.5 : 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(251, 191, 36, 0.92)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px, py, (compact ? 7 : 13) * (0.7 + 0.4 * Math.sin(elapsed * 6)), 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.55)';
        ctx.stroke();
        ctx.restore();
      } else if (archetype === 'minister' || archetype === 'leader') {
        // Parliamentary Press Camera Flashbulbs & Golden Rim Shimmer
        const flashPhase = Math.sin(elapsed * 5.3 + sceneNumber) * Math.cos(elapsed * 3.7);
        if (flashPhase > 0.82) {
          const fx = width * (0.2 + ((Math.floor(elapsed * 7) * 37) % 60) / 100);
          const fy = height * 0.76;
          const fGrad = ctx.createRadialGradient(fx, fy, 2, fx, fy, compact ? 45 : 90);
          fGrad.addColorStop(0, 'rgba(255, 251, 235, 0.65)');
          fGrad.addColorStop(0.4, 'rgba(251, 191, 36, 0.22)');
          fGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
          ctx.fillStyle = fGrad;
          ctx.fillRect(0, 0, width, height);
        }
      } else {
        // Field Reporter / Studio Highway Bokeh Light Streaks
        ctx.save();
        for (let b = 0; b < 5; b++) {
          const bx = ((elapsed * (45 + b * 18) + b * 210) % (width + 160)) - 80;
          const by = height * (0.58 + (b % 3) * 0.08);
          const bGrad = ctx.createLinearGradient(bx - 45, by, bx + 45, by);
          bGrad.addColorStop(0, 'rgba(251, 191, 36, 0)');
          bGrad.addColorStop(0.5, b % 2 === 0 ? 'rgba(251, 191, 36, 0.22)' : 'rgba(56, 189, 248, 0.2)');
          bGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
          ctx.fillStyle = bGrad;
          ctx.fillRect(bx - 45, by - 4, 90, 8);
        }
        ctx.restore();
      }

      // 5. Voiceover-Synchronized Acoustic Lip/Speech Resonance Wave Along Bottom Gate
      if (isSpeakingOrPlaying) {
        ctx.save();
        const barCount = compact ? 24 : 44;
        const barAreaWidth = width * 0.36;
        const startBarX = (width - barAreaWidth) / 2;
        const baseY = anamorphicScope ? height * 0.91 : height * 0.94;

        for (let i = 0; i < barCount; i++) {
          const wave =
            Math.abs(Math.sin(elapsed * 9.5 + i * 0.45)) *
            Math.abs(Math.cos(elapsed * 5.2 - i * 0.25));
          const bh = Math.max(2, wave * (compact ? 12 : 22));
          const bx = startBarX + (i / barCount) * barAreaWidth;
          ctx.fillStyle =
            i % 3 === 0 ? 'rgba(251, 191, 36, 0.72)' : 'rgba(56, 189, 248, 0.62)';
          ctx.fillRect(bx, baseY - bh / 2, compact ? 2.5 : 3.5, bh);
        }
        ctx.restore();
      }

      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [archetype, motionPreset, isSpeakingOrPlaying, sceneNumber, compact, anamorphicScope]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
    />
  );
};
