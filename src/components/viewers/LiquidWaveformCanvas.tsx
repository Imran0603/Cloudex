import React, { useRef, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';

interface LiquidWaveformCanvasProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onSeek: (seconds: number) => void;
  getByteFrequencyData?: () => Uint8Array | null;
  triggerHaptic?: (type?: 'light' | 'medium') => void;
  className?: string;
}

export const LiquidWaveformCanvas: React.FC<LiquidWaveformCanvasProps> = ({
  currentTime,
  duration,
  isPlaying,
  onSeek,
  getByteFrequencyData,
  triggerHaptic,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);

  // Canvas drawing loop
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Audio energy calculation from real Web Audio analyser node if available
    let audioEnergy = 0.35;
    if (getByteFrequencyData && isPlaying) {
      const freqData = getByteFrequencyData();
      if (freqData && freqData.length > 0) {
        let sum = 0;
        const sampleCount = Math.min(32, freqData.length);
        for (let i = 0; i < sampleCount; i++) {
          sum += freqData[i];
        }
        audioEnergy = Math.max(0.2, (sum / sampleCount) / 180);
      }
    } else if (isPlaying) {
      // Gentle pulsing lo-fi rhythm if synth
      audioEnergy = 0.4 + Math.sin(Date.now() / 320) * 0.2;
    } else {
      audioEnergy = 0.12;
    }

    // Advance phase
    if (isPlaying) {
      phaseRef.current += 0.045;
    } else {
      phaseRef.current += 0.008;
    }
    const phase = phaseRef.current;

    const midY = height * 0.52;
    const progressX = duration > 0 ? (currentTime / duration) * width : 0;

    // 1. LIQUID WAVE LAYER 1 (Deep Ambient Liquid Backdrop)
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 6) {
      const normalizedX = x / width;
      const wave1 = Math.sin(normalizedX * 6 + phase * 0.8) * 16 * audioEnergy;
      const wave2 = Math.cos(normalizedX * 11 - phase * 0.5) * 8 * audioEnergy;
      const y = midY + wave1 + wave2;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();

    const bgGradient = ctx.createLinearGradient(0, midY - 30, 0, height);
    bgGradient.addColorStop(0, 'rgba(168, 85, 247, 0.22)');
    bgGradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.12)');
    bgGradient.addColorStop(1, 'rgba(10, 10, 18, 0.0)');
    ctx.fillStyle = bgGradient;
    ctx.fill();

    // 2. LIQUID WAVE LAYER 2 (Organic Front Crest)
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 4) {
      const normalizedX = x / width;
      const waveMain = Math.sin(normalizedX * 8 + phase) * (24 * audioEnergy);
      const waveSub = Math.sin(normalizedX * 16 + phase * 1.4) * (10 * audioEnergy);
      const waveHarmonic = Math.cos(normalizedX * 24 - phase * 0.7) * (5 * audioEnergy);
      const y = midY + waveMain + waveSub + waveHarmonic;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();

    const crestGradient = ctx.createLinearGradient(0, midY - 40, width, height);
    crestGradient.addColorStop(0, 'rgba(236, 72, 153, 0.45)'); // pink neon
    crestGradient.addColorStop(0.45, 'rgba(168, 85, 247, 0.55)'); // purple
    crestGradient.addColorStop(0.85, 'rgba(59, 130, 246, 0.6)'); // cyan-blue
    ctx.fillStyle = crestGradient;
    ctx.fill();

    // 3. GLOWING CREST STROKE
    ctx.beginPath();
    for (let x = 0; x <= width; x += 4) {
      const normalizedX = x / width;
      const waveMain = Math.sin(normalizedX * 8 + phase) * (24 * audioEnergy);
      const waveSub = Math.sin(normalizedX * 16 + phase * 1.4) * (10 * audioEnergy);
      const waveHarmonic = Math.cos(normalizedX * 24 - phase * 0.7) * (5 * audioEnergy);
      const y = midY + waveMain + waveSub + waveHarmonic;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 2.2;
    ctx.shadowColor = '#60A5FA';
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 4. PLAYED REGION SHINE OVERLAY
    if (progressX > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, progressX, height);
      ctx.clip();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(0, 0, progressX, height);
      ctx.restore();
    }

    // 5. CURRENT PLAYBACK SCRUBBER LINE & LUMINOUS BEAD
    if (duration > 0) {
      ctx.beginPath();
      ctx.moveTo(progressX, 8);
      ctx.lineTo(progressX, height - 8);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#FFFFFF';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Luminous Liquid Bead
      ctx.beginPath();
      ctx.arc(progressX, midY, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = '#93C5FD';
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.arc(progressX, midY, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#3B82F6';
      ctx.fill();
    }

    animationFrameRef.current = requestAnimationFrame(render);
  }, [currentTime, duration, isPlaying, getByteFrequencyData]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Animation loop management
  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [render]);

  // Click & Drag-to-seek Handler
  const handlePointerSeek = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || duration <= 0) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const targetSeconds = ratio * duration;
    triggerHaptic?.('light');
    onSeek(targetSeconds);
  };

  return (
    <div className={`relative w-full h-24 sm:h-28 rounded-2xl overflow-hidden cursor-pointer select-none group ${className}`}>
      {/* Background container glow */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 group-hover:border-white/25 transition-colors" />

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onPointerDown={(e) => {
          isDraggingRef.current = true;
          handlePointerSeek(e);
        }}
        onPointerMove={(e) => {
          if (isDraggingRef.current) {
            handlePointerSeek(e);
          }
        }}
        onPointerUp={() => {
          isDraggingRef.current = false;
        }}
        onPointerLeave={() => {
          isDraggingRef.current = false;
        }}
        className="relative z-10 w-full h-full block touch-none"
      />

      {/* Floating Time indicator on hover */}
      <div className="absolute top-2 right-3 z-20 pointer-events-none text-[10px] font-mono font-medium text-white/70 bg-black/50 px-2 py-0.5 rounded-full border border-white/10">
        {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60) < 10 ? '0' : ''}{Math.floor(currentTime % 60)} / {Math.floor(duration / 60)}:{Math.floor(duration % 60) < 10 ? '0' : ''}{Math.floor(duration % 60)}
      </div>
    </div>
  );
};
