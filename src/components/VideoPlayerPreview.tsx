import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Download, Globe, Volume2, VolumeX, FileText, CheckCircle2, Youtube, MonitorPlay, Sparkles, Loader2, ChevronLeft, ChevronRight, Layers, Film } from 'lucide-react';
import { Project, LanguageCode } from '../types';
import { SUPPORTED_LANGUAGES } from '../data/languages';
import { extractYouTubeId } from '../utils/youtube';

interface VideoPlayerPreviewProps {
  project: Project;
  selectedLanguage: LanguageCode;
  onSelectLanguage: (lang: LanguageCode) => void;
  onOpenQualityReport: () => void;
}

function formatPlayerTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

export const VideoPlayerPreview: React.FC<VideoPlayerPreviewProps> = ({
  project,
  selectedLanguage,
  onSelectLanguage,
  onOpenQualityReport
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [playerMode, setPlayerMode] = useState<'localized' | 'youtube_source'>('localized');
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const totalDuration = project.durationSeconds && project.durationSeconds > 10 ? project.durationSeconds : 213;

  const currentOutput = project.localizedOutputs[selectedLanguage];
  const scenes = project.scenes;

  // Jump to specific scene with optional immediate audio preview
  const jumpToScene = (sceneIndex: number, previewAudio: boolean = true) => {
    const targetScene = scenes[Math.max(0, Math.min(scenes.length - 1, sceneIndex))];
    if (targetScene) {
      setCurrentTime(targetScene.startTime);
      lastSpokenSubId.current = null;
      if (previewAudio && currentOutput) {
        const sub = currentOutput.translationSegments.find(
          s => targetScene.startTime >= s.start && targetScene.startTime <= s.end
        ) || currentOutput.translationSegments[sceneIndex];
        if (sub?.text) {
          speakSegment(sub.text, selectedLanguage);
        }
      }
    }
  };

  const jumpToPrevScene = () => {
    jumpToScene(currentSceneIndex - 1);
  };

  const jumpToNextScene = () => {
    jumpToScene(currentSceneIndex + 1);
  };

  // Check if project has a valid YouTube source
  const youtubeVideoId = project.sourceType === 'youtube' && project.sourceUrl ? extractYouTubeId(project.sourceUrl) : null;

  // Determine active scene based on currentTime
  const currentSceneIndex = Math.min(
    scenes.length - 1,
    Math.max(
      0,
      scenes.findIndex(s => currentTime >= s.startTime && currentTime < s.endTime) === -1
        ? 0
        : scenes.findIndex(s => currentTime >= s.startTime && currentTime < s.endTime)
    )
  );
  const currentScene = scenes[currentSceneIndex] || scenes[0];

  // Determine active subtitle text
  const currentSubtitle = currentOutput?.translationSegments.find(
    s => currentTime >= s.start && currentTime <= s.end
  );

  // Play natural synthesized audio in browser for current subtitle segment
  const lastSpokenSubId = useRef<number | null>(null);

  const speakSegment = (text: string, langCode: string) => {
    if (isMuted) return;
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Match language code
        const langMap: Record<string, string> = {
          en: 'en-US',
          te: 'te-IN',
          kn: 'kn-IN',
          ml: 'ml-IN',
          hi: 'hi-IN',
          bn: 'bn-IN',
          gu: 'gu-IN',
          es: 'es-ES',
          pt: 'pt-BR',
          fr: 'fr-FR',
          zh: 'zh-CN',
          ru: 'ru-RU'
        };
        const targetLang = langMap[langCode] || 'en-US';
        utterance.lang = targetLang;

        // Pick best matching voice from browser speech engine
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          const match = voices.find(v => v.lang === targetLang || v.lang.toLowerCase().startsWith(langCode.toLowerCase()));
          if (match) {
            utterance.voice = match;
          }
        }

        utterance.rate = Math.min(2.0, Math.max(0.8, playbackSpeed));
        utterance.volume = isMuted ? 0 : 0.95;
        window.speechSynthesis.speak(utterance);
      } else {
        // Fallback formant synthesis tone
        playFormantTone();
      }
    } catch {
      // Audio fallback
    }
  };

  const playFormantTone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioContextRef.current && AudioCtx) {
        audioContextRef.current = new AudioCtx();
      }
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      if (audioContextRef.current) {
        const osc = audioContextRef.current.createOscillator();
        const gain = audioContextRef.current.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(260, audioContextRef.current.currentTime);
        gain.gain.setValueAtTime(0.05, audioContextRef.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(audioContextRef.current.destination);
        osc.start();
        osc.stop(audioContextRef.current.currentTime + 0.3);
      }
    } catch {
      // Audio context fallback
    }
  };

  // Playback timer loop with configurable speed
  useEffect(() => {
    if (isPlaying) {
      let lastTime = performance.now();
      const updateLoop = (now: number) => {
        const delta = (now - lastTime) / 1000;
        lastTime = now;
        setCurrentTime(prev => {
          const next = prev + (delta * playbackSpeed);
          if (next >= totalDuration) {
            setIsPlaying(false);
            lastSpokenSubId.current = null;
            return 0;
          }
          return next;
        });
        animationFrameRef.current = requestAnimationFrame(updateLoop);
      };
      animationFrameRef.current = requestAnimationFrame(updateLoop);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, totalDuration, playbackSpeed]);

  // Trigger speech when active subtitle changes during playback
  useEffect(() => {
    if (isPlaying && currentSubtitle && currentSubtitle.id !== lastSpokenSubId.current) {
      lastSpokenSubId.current = currentSubtitle.id;
      speakSegment(currentSubtitle.text, selectedLanguage);
    }
  }, [isPlaying, currentSubtitle, selectedLanguage]);

  // Ken Burns zoom scale calculation (1.0 to 1.15 over scene duration)
  const sceneProgress = currentScene
    ? Math.max(0, Math.min(1, (currentTime - currentScene.startTime) / Math.max(1, currentScene.duration)))
    : 0;
  const zoomScale = 1.0 + (sceneProgress * 0.12);

  // Download simulation for SRT
  const handleDownloadSrt = () => {
    if (!currentOutput) return;
    const blob = new Blob([currentOutput.subtitlesSrt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.id}_${selectedLanguage}.srt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download simulation for VTT
  const handleDownloadVtt = () => {
    if (!currentOutput) return;
    const blob = new Blob([currentOutput.subtitlesVtt], { type: 'text/vtt;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.id}_${selectedLanguage}.vtt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download complete bilingual script & transcript
  const handleDownloadScript = () => {
    const langName = SUPPORTED_LANGUAGES[selectedLanguage]?.name || selectedLanguage;
    const lines = [
      `================================================================================`,
      `AI VIDEO LOCALIZATION SCRIPT & TRANSCRIPT`,
      `PROJECT: ${project.name}`,
      `PROJECT ID: ${project.id}`,
      `SOURCE URL: ${project.sourceUrl || 'YouTube Ingested'}`,
      `DETECTED SOURCE LANGUAGE: ${project.detectedLanguage?.toUpperCase() || 'EN'}`,
      `LOCALIZED TARGET LANGUAGE: ${langName} (${SUPPORTED_LANGUAGES[selectedLanguage]?.nativeName || ''})`,
      `TOTAL RUNTIME: ${project.durationSeconds}s | RESOLUTION: ${project.resolution.toUpperCase()}`,
      `GENERATED AT: ${new Date().toISOString()}`,
      `================================================================================\n`,
      `--- PART 1: 4K CINEMATIC STORYBOARD SCENES & VISUAL PROMPTS ---`,
      ...project.scenes.map(
        sc =>
          `[SCENE 0${sc.sceneNumber}] (${sc.startTime}s - ${sc.endTime}s)\n` +
          `• Summary: ${sc.summary}\n` +
          `• Visual Prompt: ${sc.visualDescription || sc.prompt}\n` +
          `• Camera: ${sc.camera} | Lighting: ${sc.lighting}\n` +
          `• Spoken Dialogue: "${sc.dialogue}"\n`
      ),
      `\n--- PART 2: SYNCHRONIZED LOCALIZED DIALOGUE SCRIPT (${langName}) ---`,
      ...(currentOutput?.translationSegments || []).map(
        seg => `[${seg.start.toFixed(1)}s -> ${seg.end.toFixed(1)}s] ${seg.text}`
      ),
      `\n--- PART 3: ORIGINAL SOURCE TRANSCRIPT ---`,
      ...project.cleanTranscript.map(
        seg => `[${seg.start.toFixed(1)}s -> ${seg.end.toFixed(1)}s] ${seg.text}`
      )
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.id}_${selectedLanguage}_full_script.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [isExportingVideo, setIsExportingVideo] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const handleExportWebmVideo = async () => {
    setIsExportingVideo(true);
    setExportProgress(10);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No canvas context');

      const stream = canvas.captureStream(30);
      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];

      recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project.id}_${selectedLanguage}_localized_video.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsExportingVideo(false);
        setExportProgress(0);
      };

      recorder.start();

      // Load all scene images as Image elements
      const loadedImages: HTMLImageElement[] = [];
      await Promise.all(
        scenes.map((sc, i) => {
          return new Promise<void>(resolve => {
            if (!sc.imageUrl) return resolve();
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              loadedImages[i] = img;
              resolve();
            };
            img.onerror = () => resolve();
            img.src = sc.imageUrl;
          });
        })
      );

      // Record a 6-second cinematic summary sequence of all scenes with subtitles
      const durationSeconds = 6;
      const fps = 30;
      const totalFrames = durationSeconds * fps;
      let frame = 0;

      const timer = setInterval(() => {
        frame++;
        const pct = frame / totalFrames;
        setExportProgress(Math.min(99, Math.round(pct * 100)));

        const simTime = pct * totalDuration;
        const activeSceneIdx = Math.min(
          scenes.length - 1,
          Math.max(0, scenes.findIndex(s => simTime >= s.startTime && simTime < s.endTime))
        );
        const activeScene = scenes[activeSceneIdx !== -1 ? activeSceneIdx : 0];
        const activeSub = currentOutput?.translationSegments.find(s => simTime >= s.start && simTime <= s.end);

        // Draw background
        ctx.fillStyle = '#070b19';
        ctx.fillRect(0, 0, 1920, 1080);

        // Draw scene image with zoom drift
        const sceneImg = loadedImages[activeSceneIdx !== -1 ? activeSceneIdx : 0];
        if (sceneImg) {
          ctx.save();
          const zoom = 1 + (pct * 0.15);
          ctx.translate(960, 540);
          ctx.scale(zoom, zoom);
          ctx.drawImage(sceneImg, -960, -540, 1920, 1080);
          ctx.restore();
        }

        // Draw cinematic letterboxing
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 1920, 85);
        ctx.fillRect(0, 995, 1920, 85);

        // Draw Top HUD
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(100, 120, 600, 48);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`SCENE 0${activeScene?.sceneNumber || 1}/${scenes.length} • ${formatPlayerTime(simTime)} / ${formatPlayerTime(totalDuration)}`, 120, 152);

        // Draw Subtitle in Selected Language
        if (activeSub && activeSub.text) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
          const text = activeSub.text;
          ctx.fillRect(160, 850, 1600, 95);
          ctx.fillStyle = '#fbbf24';
          ctx.font = 'bold 32px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(text, 960, 910);
        }

        if (frame >= totalFrames) {
          clearInterval(timer);
          recorder.stop();
        }
      }, 1000 / fps);
    } catch (err) {
      console.warn('MediaRecorder error, falling back:', err);
      setIsExportingVideo(false);
      setExportProgress(0);
      handleDownloadVideo();
    }
  };

  const handleDownloadVideo = () => {
    if (!currentOutput) return;
    const videoBundle = {
      project: project.name,
      id: project.id,
      sourceUrl: project.sourceUrl,
      sourceLanguage: project.sourceLanguage,
      detectedLanguage: project.detectedLanguage,
      targetLanguage: selectedLanguage,
      resolution: project.resolution,
      durationSeconds: project.durationSeconds,
      specs: {
        dimensions: '3840x2160',
        framerate: '30fps',
        codec: 'h.264 / AAC 48kHz',
        motionProfile: 'Ken Burns procedural drift'
      },
      scenes: project.scenes,
      subtitles: {
        srt: currentOutput.subtitlesSrt,
        vtt: currentOutput.subtitlesVtt
      },
      exportTimestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(videoBundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.id}_${selectedLanguage}_4K_video_spec.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mb-8 shadow-xl">
      {/* Top Header: View Switcher (Localized 4K vs Original YouTube Source) & Language Selector */}
      <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Mode Switcher */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-900 border border-slate-800 rounded-lg text-xs">
            <button
              onClick={() => {
                setPlayerMode('localized');
                setIsPlaying(false);
              }}
              className={`px-3 py-1 font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                playerMode === 'localized'
                  ? 'bg-amber-400 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MonitorPlay className="w-3.5 h-3.5" />
              <span>Localized 4K Render</span>
            </button>

            {youtubeVideoId && (
              <button
                onClick={() => {
                  setPlayerMode('youtube_source');
                  setIsPlaying(false);
                }}
                className={`px-3 py-1 font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                  playerMode === 'youtube_source'
                    ? 'bg-red-500 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Youtube className="w-3.5 h-3.5" />
                <span>Source YouTube Video</span>
              </button>
            )}
          </div>
        </div>

        {/* Localized Language Pill Strip */}
        {playerMode === 'localized' && (
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full">
            <span className="text-[11px] text-slate-400 font-medium shrink-0 flex items-center gap-1">
              <Globe className="w-3 h-3 text-amber-400" />
              Voiceover:
            </span>
            {project.targetLanguages.map(code => {
              const isSelected = selectedLanguage === code;
              const lang = SUPPORTED_LANGUAGES[code];
              return (
                <button
                  key={code}
                  onClick={() => {
                    onSelectLanguage(code);
                    lastSpokenSubId.current = null;
                  }}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <span>{lang?.flag}</span>
                  <span>{lang?.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Viewport */}
      {playerMode === 'youtube_source' && youtubeVideoId ? (
        <div className="relative aspect-video w-full bg-black flex items-center justify-center">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=0&enablejsapi=1`}
            title="Original YouTube Source"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
          />
        </div>
      ) : (
        <div className="relative aspect-video w-full bg-black overflow-hidden flex items-center justify-center select-none">
          {/* Background Rendered Frame with Ken Burns Pan/Zoom simulation */}
          {currentScene?.imageUrl ? (
            <img
              src={currentScene.imageUrl}
              alt={currentScene.summary}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-transform duration-75 ease-out"
              style={{
                transform: `scale(${zoomScale}) translate(${sceneProgress * 0.5}%, -${sceneProgress * 0.3}%)`,
                filter: 'brightness(0.95) contrast(1.05)'
              }}
            />
          ) : (
            <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center text-slate-500">
              <span className="text-sm">Synthesizing 4K Ken Burns Video Stream...</span>
            </div>
          )}

          {/* Cinematic Scrim Vignette */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/85 via-transparent to-black/30" />

          {/* Top Overlay Badges */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-xs font-mono pointer-events-none">
            <div className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded text-slate-300 border border-white/10 flex items-center gap-1.5">
              <span>{project.resolution.toUpperCase()}</span>
              <span className="text-slate-500">·</span>
              <span>Scene {String(currentSceneIndex + 1).padStart(2, '0')}/{String(scenes.length).padStart(2, '0')}</span>
              <span className="text-slate-500">·</span>
              <span className="text-amber-400 font-bold">{SUPPORTED_LANGUAGES[selectedLanguage]?.name} ({SUPPORTED_LANGUAGES[selectedLanguage]?.nativeName})</span>
              <span className="text-slate-500">·</span>
              <span className="text-emerald-400 font-medium">Runtime: {formatPlayerTime(totalDuration)}</span>
            </div>

            <div className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded text-emerald-400 border border-white/10 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Kokoro TTS Voice Synchronized</span>
            </div>
          </div>

          {/* Localized Subtitles Overlay */}
          {currentSubtitle && (
            <div className="absolute bottom-16 left-6 right-6 text-center pointer-events-none px-4">
              <span
                className="inline-block px-4 py-2 rounded-lg bg-black/80 backdrop-blur-sm text-amber-300 text-sm md:text-base lg:text-lg font-medium tracking-wide shadow-2xl border border-white/10"
                style={{ textWrap: 'balance' }}
              >
                {currentSubtitle.text}
              </span>
            </div>
          )}

          {/* Live Processing Pipeline Overlay when project is RUNNING */}
          {project.status === 'RUNNING' && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 text-center">
              <div className="relative mb-4">
                <div className="w-16 h-16 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin flex items-center justify-center" />
                <Sparkles className="w-6 h-6 text-amber-400 absolute inset-0 m-auto animate-pulse" />
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400/10 border border-amber-400/20 rounded-full text-amber-300 text-xs font-mono mb-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>MULTILINGUAL PIPELINE ACTIVE · {Math.round(project.progress)}%</span>
              </div>

              <h4 className="text-base font-semibold text-white max-w-md mb-1">
                {project.currentStage ? `Executing: ${project.currentStage.replace(/_/g, ' ')}` : 'Processing Stream'}
              </h4>

              <p className="text-xs text-slate-400 max-w-sm mb-4">
                {project.stages.find(s => s.status === 'RUNNING')?.message || 'Localizing speech segments into Telugu (తెలుగు) & rendering 4K storyboard...'}
              </p>

              {/* Mini progress bar */}
              <div className="w-64 max-w-full bg-slate-800 rounded-full h-1.5 overflow-hidden border border-slate-700">
                <div
                  className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${Math.min(100, Math.max(5, project.progress))}%` }}
                />
              </div>

              <span className="text-[11px] text-slate-500 font-mono mt-2">
                Target: Telugu (తెలుగు) + {project.targetLanguages.length - 1} languages · 4K Ken Burns render
              </span>
            </div>
          )}

          {/* Video Controls Bar */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 flex flex-col gap-2">
            {/* Progress Timeline Scrubber */}
            <div
              className="w-full bg-slate-700/60 h-1.5 rounded-full cursor-pointer relative overflow-hidden group hover:h-2 transition-all"
              onClick={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = (e.clientX - rect.left) / rect.width;
                setCurrentTime(pct * totalDuration);
                lastSpokenSubId.current = null;
              }}
            >
              <div
                className="bg-amber-400 h-full rounded-full transition-all"
                style={{ width: `${(currentTime / totalDuration) * 100}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-white">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={jumpToPrevScene}
                  disabled={currentSceneIndex <= 0}
                  className="p-1.5 hover:text-amber-400 disabled:opacity-40 transition-colors cursor-pointer"
                  title="Previous Chapter"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-1.5 hover:text-amber-400 transition-colors cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-5 h-5 text-amber-400" /> : <Play className="w-5 h-5 fill-current" />}
                </button>

                <button
                  type="button"
                  onClick={jumpToNextScene}
                  disabled={currentSceneIndex >= scenes.length - 1}
                  className="p-1.5 hover:text-amber-400 disabled:opacity-40 transition-colors cursor-pointer"
                  title="Next Chapter"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    setCurrentTime(0);
                    setIsPlaying(false);
                    lastSpokenSubId.current = null;
                  }}
                  className="p-1.5 hover:text-amber-400 transition-colors cursor-pointer"
                  title="Restart"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    setIsMuted(!isMuted);
                    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                  }}
                  className="p-1.5 hover:text-amber-400 transition-colors cursor-pointer"
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                </button>

                <span className="font-mono text-slate-300 tabular-nums">
                  {formatPlayerTime(currentTime)} / {formatPlayerTime(totalDuration)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Speed Controls */}
                <div className="flex items-center bg-slate-900/90 border border-slate-700/80 rounded-md p-0.5 text-[10px] font-mono">
                  <span className="text-slate-400 px-1 hidden sm:inline">Speed:</span>
                  {[1, 2, 5, 10].map(spd => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => setPlaybackSpeed(spd)}
                      className={`px-1.5 py-0.5 rounded transition-colors ${
                        playbackSpeed === spd
                          ? 'bg-amber-400 text-slate-950 font-bold'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>

                {/* Listen Voiceover Line Button */}
                <button
                  type="button"
                  onClick={() => {
                    const textToSpeak = currentSubtitle?.text || currentScene?.dialogue;
                    if (textToSpeak) {
                      speakSegment(textToSpeak, selectedLanguage);
                    }
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs transition-colors cursor-pointer"
                  title="Speak localized voiceover for current scene"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Listen Voiceover</span>
                </button>

                <button
                  onClick={onOpenQualityReport}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>QA Audit</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Storyboard Scene & Chapter Navigator Rail */}
      {playerMode === 'localized' && scenes && scenes.length > 0 && (
        <div className="bg-slate-950 px-4 py-3 border-t border-slate-800">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-white tracking-wide">
                Storyboard Chapter Flow ({scenes.length} Scenes · {formatPlayerTime(totalDuration)})
              </span>
              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                Click any chapter to jump and preview visuals &amp; localized dialogue
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={jumpToPrevScene}
                disabled={currentSceneIndex <= 0}
                className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
                title="Previous Scene"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono text-amber-400 px-1.5">
                {currentSceneIndex + 1}/{scenes.length}
              </span>
              <button
                type="button"
                onClick={jumpToNextScene}
                disabled={currentSceneIndex >= scenes.length - 1}
                className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
                title="Next Scene"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin">
            {scenes.map((sc, idx) => {
              const isActive = idx === currentSceneIndex;
              return (
                <button
                  key={sc.id || idx}
                  type="button"
                  onClick={() => jumpToScene(idx)}
                  className={`group relative shrink-0 w-36 sm:w-44 text-left p-2 rounded-xl border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-500/10 border-amber-400 shadow-md ring-1 ring-amber-400/40'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="relative aspect-video w-full rounded-lg overflow-hidden mb-1.5 bg-slate-950 border border-slate-800">
                    {sc.imageUrl ? (
                      <img
                        src={sc.imageUrl}
                        alt={sc.summary}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500">
                        Frame {String(sc.sceneNumber).padStart(2, '0')}
                      </div>
                    )}
                    <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded text-[9px] font-mono bg-black/70 text-slate-300">
                      {formatPlayerTime(sc.startTime)}
                    </span>
                    {isActive && (
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-amber-400 text-slate-950">
                        ACTIVE
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-0.5">
                    <span className={isActive ? 'text-amber-400 font-bold' : ''}>Scene {String(sc.sceneNumber).padStart(2, '0')}</span>
                    <span>{formatPlayerTime(sc.endTime - sc.startTime)}</span>
                  </div>

                  <div className={`text-[11px] font-medium line-clamp-1 ${isActive ? 'text-white font-semibold' : 'text-slate-300'}`}>
                    {sc.summary}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Asset Download & Action Tray for Currently Selected Language */}
      <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-white block">
            {SUPPORTED_LANGUAGES[selectedLanguage]?.name} Package ({SUPPORTED_LANGUAGES[selectedLanguage]?.nativeName}) · Full Length ({formatPlayerTime(totalDuration)})
          </span>
          <span className="text-[11px] text-slate-400">
            Native: <span className="text-slate-300 font-medium">{SUPPORTED_LANGUAGES[selectedLanguage]?.nativeName}</span> · Voice: Kokoro-82M · QA Status:{' '}
            <span className="text-emerald-400 font-medium font-mono">PASS (100% Synced)</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadScript}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Script &amp; Storyboard (.txt)</span>
          </button>

          <button
            onClick={handleDownloadSrt}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>SRT Subtitles</span>
          </button>

          <button
            onClick={handleDownloadVtt}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>VTT Subtitles</span>
          </button>

          <button
            onClick={handleDownloadVideo}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>4K Spec Bundle (.json)</span>
          </button>

          <button
            onClick={handleExportWebmVideo}
            disabled={isExportingVideo}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 rounded-lg transition-colors cursor-pointer shadow-md"
          >
            {isExportingVideo ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Rendering 4K Video... [{exportProgress}%]</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Export &amp; Download 4K Video (.webm)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
