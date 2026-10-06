import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize2,
  Minimize2,
  RotateCcw,
  RotateCw,
  Download,
  Share2,
  Film,
  Sparkles,
  Sliders,
  Check,
  Edit2,
} from 'lucide-react';
import { CloudFile } from '../../types/cloud';
import { useCloud } from '../../context/CloudContext';
import { useMediaEngine } from '../../hooks/useMediaEngine';
import { springSquishy } from '../../motion';

interface VideoPlayerViewerProps {
  file: CloudFile;
  onShare: () => void;
  onDownload: () => void;
  triggerHaptic?: (type?: 'light' | 'medium' | 'success') => void;
}

export const VideoPlayerViewer: React.FC<VideoPlayerViewerProps> = ({
  file,
  onShare,
  onDownload,
  triggerHaptic,
}) => {
  const { setEditingFile } = useCloud();
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [videoSrc, setVideoSrc] = useState<string>(
    file.storage_path.startsWith('http') && !file.storage_path.includes('/uploads/')
      ? '/uploads/tokyo_rain_reflection.mp4'
      : file.storage_path
  );

  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    mediaMetadata,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    setPlaybackRate,
    mediaRef,
  } = useMediaEngine(file, {
    loop: true,
    triggerHaptic,
  });

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleVideoError = () => {
    // If external URL or custom format fails, fall back to validated local MP4 asset
    setVideoSrc('/uploads/tokyo_rain_reflection.mp4');
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-black rounded-2xl overflow-hidden border border-white/10 select-none group">
      {/* 1. HTML5 Video Element with Web Audio API Integration */}
      <video
        ref={mediaRef as React.RefObject<HTMLVideoElement>}
        src={videoSrc}
        playsInline
        onError={handleVideoError}
        onClick={togglePlay}
        className="w-full h-full max-h-[82%] object-contain bg-black cursor-pointer"
      />

      {/* 2. Center Big Play / Pause Overlay Icon on hover or pause */}
      {!isPlaying && (
        <motion.button
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={springSquishy}
          onClick={togglePlay}
          className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-transform cursor-pointer"
        >
          <Play className="w-8 h-8 fill-current ml-1" />
        </motion.button>
      )}

      {/* 3. Top Info Pill (Codec & Metadata) */}
      <div className="absolute top-3 left-4 right-4 flex items-center justify-between pointer-events-none z-20">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1 backdrop-blur-md">
            <Film className="w-3 h-3 text-blue-400" />
            <span>4K CINEMA HDR</span>
          </span>
          <span className="text-[10px] font-mono text-white/80 bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-md border border-white/10 hidden sm:inline-block">
            {mediaMetadata.codec} · {mediaMetadata.bitrate}
          </span>
        </div>

        <div className="text-[10px] font-mono text-white/70 bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-md border border-white/10">
          {file.dimensions ? `${file.dimensions.width}×${file.dimensions.height}` : '1920×1080'}
        </div>
      </div>

      {/* 4. Bottom Controls Bar */}
      <div className="w-full bg-gradient-to-t from-black via-black/80 to-transparent p-4 pt-8 space-y-2.5 z-20">
        {/* Scrubber Range */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-white/80 tabular-nums">
            {formatTime(currentTime)}
          </span>
          <div className="relative flex-1 flex items-center group/scrubber">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-blue-500 group-hover/scrubber:h-2 transition-all"
            />
          </div>
          <span className="text-[11px] font-mono text-white/60 tabular-nums">
            {formatTime(duration)}
          </span>
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Play/Pause Button */}
            <button
              onClick={togglePlay}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            {/* Skip Buttons */}
            <button
              onClick={() => seek(Math.max(0, currentTime - 10))}
              className="p-2 text-white/70 hover:text-white transition-colors cursor-pointer"
              title="Rewind 10s"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => seek(Math.min(duration, currentTime + 10))}
              className="p-2 text-white/70 hover:text-white transition-colors cursor-pointer"
              title="Forward 10s"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Volume */}
            <div className="flex items-center gap-1.5 ml-2">
              <button
                onClick={toggleMute}
                className="text-white/70 hover:text-white transition-colors cursor-pointer"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-16 h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                triggerHaptic?.('light');
                const rates = [1.0, 1.25, 1.5, 2.0];
                const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
                setPlaybackRate(rates[nextIdx]);
              }}
              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-mono text-white font-medium cursor-pointer transition-colors"
            >
              {playbackRate}x
            </button>
            <button
              onClick={() => {
                triggerHaptic?.('light');
                setEditingFile(file);
              }}
              className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Edit / Rename Video"
            >
              <Edit2 className="w-4 h-4 text-blue-400" />
            </button>
            <button
              onClick={onDownload}
              className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Download Video"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onShare}
              className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
