import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Volume1,
  Repeat,
  Shuffle,
  Download,
  Share2,
  Music,
  Quote,
  Heart,
  Sliders,
  Sparkles,
  Cast,
  Check,
  Disc3,
  Radio,
  AudioWaveform,
  Edit2,
} from 'lucide-react';
import { CloudFile } from '../../types/cloud';
import { useCloud } from '../../context/CloudContext';
import { springRelaxed, springSquishy, easeRelaxed } from '../../motion';
import { LyricsView } from './LyricsView';
import { LiquidWaveformCanvas } from './LiquidWaveformCanvas';
import { useMediaEngine } from '../../hooks/useMediaEngine';

interface AudioPlayerViewerProps {
  file: CloudFile;
  onShare: () => void;
  onDownload: () => void;
}

export const AudioPlayerViewer: React.FC<AudioPlayerViewerProps> = ({
  file,
  onShare,
  onDownload,
}) => {
  const { toggleFavorite, triggerHaptic, setEditingFile } = useCloud();

  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [showLyrics, setShowLyrics] = useState<boolean>(false);

  // Robust HTML5 Audio & Web Audio API Engine
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    mediaMetadata,
    isSynthesizerActive,
    getByteFrequencyData,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    setPlaybackRate,
    mediaRef,
  } = useMediaEngine(file, {
    loop: isLooping,
    triggerHaptic,
  });

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const trackTitle = file.filename.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
  const artistName = 'Personal Cloud Hi-Fi Studio';

  return (
    <div className="relative flex flex-col h-full rounded-2xl overflow-hidden select-none bg-[#09090C] border border-white/10">
      {/* Hidden HTML5 Audio Element connected to useMediaEngine */}
      <audio
        ref={mediaRef as React.RefObject<HTMLAudioElement>}
        src={file.storage_path}
        preload="auto"
      />

      {/* 1. DYNAMIC AMBIENT MESH BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{
            scale: isPlaying ? [1, 1.25, 1] : 1,
            x: isPlaying ? [0, 40, -30, 0] : 0,
            y: isPlaying ? [0, -40, 20, 0] : 0,
          }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-gradient-to-tr from-purple-600/35 via-pink-600/30 to-blue-600/25 blur-3xl"
        />
        <motion.div
          animate={{
            scale: isPlaying ? [1.2, 1, 1.2] : 1,
            x: isPlaying ? [0, -50, 30, 0] : 0,
            y: isPlaying ? [0, 30, -35, 0] : 0,
          }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-gradient-to-tr from-blue-600/35 via-teal-500/25 to-indigo-600/30 blur-3xl"
        />
        <div className="absolute inset-0 bg-[#09090C]/65 backdrop-blur-2xl" />
      </div>

      {/* 2. TOP SUB-HEADER: CODEC BADGES & VIEW TOGGLE */}
      <div className="relative z-10 px-5 py-3 border-b border-white/10 flex items-center justify-between shrink-0 bg-black/20">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/40 text-amber-300 flex items-center gap-1 shadow-sm">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>LOSSLESS HI-RES</span>
          </span>
          <span className="text-[11px] font-mono text-neutral-400 hidden sm:inline-block">
            {mediaMetadata.bitrate} · {mediaMetadata.codec}
          </span>
          {isSynthesizerActive && (
            <span className="text-[10px] font-semibold text-purple-400 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30">
              Web Audio Synthesizer Active
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              triggerHaptic('light');
              setShowLyrics(!showLyrics);
            }}
            className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              showLyrics
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-white/10 text-neutral-300 hover:text-white hover:bg-white/15'
            }`}
          >
            <Quote className="w-3.5 h-3.5" />
            <span>{showLyrics ? 'Artwork' : 'Lyrics'}</span>
          </button>
        </div>
      </div>

      {/* 3. MAIN CENTER VIEW: ARTWORK OR SYNCHRONIZED LYRICS */}
      <div className="relative z-10 flex-1 flex flex-col p-6 min-h-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {!showLyrics ? (
            <motion.div
              key="artwork-view"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={springRelaxed}
              className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full gap-5"
            >
              {/* Spinning Vinyl Album Card */}
              <div className="relative group">
                <motion.div
                  animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
                  transition={
                    isPlaying
                      ? { duration: 18, repeat: Infinity, ease: 'linear' }
                      : { duration: 0.5, ease: 'easeOut' }
                  }
                  className="w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-gradient-to-tr from-neutral-900 via-neutral-800 to-black p-2 border-2 border-white/15 shadow-2xl flex items-center justify-center relative overflow-hidden"
                >
                  <div className="w-full h-full rounded-full border border-white/10 flex items-center justify-center bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${file.thumbnail_url || 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80'})`
                    }}
                  >
                    <div className="w-14 h-14 rounded-full bg-[#0A0A0E] border-2 border-white/20 flex items-center justify-center shadow-inner">
                      <div className="w-4 h-4 rounded-full bg-white/40" />
                    </div>
                  </div>
                </motion.div>

                {/* Floating Hi-Fi Badge */}
                <div className="absolute -bottom-2 right-2 px-2.5 py-1 rounded-xl bg-black/80 backdrop-blur-md border border-white/15 text-[10px] font-bold text-white shadow-xl flex items-center gap-1">
                  <Disc3 className="w-3.5 h-3.5 text-purple-400" />
                  <span>24-bit / 96kHz</span>
                </div>
              </div>

              {/* Track Title & Artist */}
              <div className="text-center w-full space-y-1">
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate drop-shadow-sm">
                  {trackTitle}
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 font-medium truncate">
                  {artistName}
                </p>
                <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-neutral-500 font-mono">
                  <span>{mediaMetadata.fileSizeFormatted}</span>
                  <span>•</span>
                  <span>{mediaMetadata.sampleRate}</span>
                  <span>•</span>
                  <span>{mediaMetadata.channels}</span>
                </div>
              </div>
            </motion.div>
          ) : (
            /* CINEMATIC BLURRED LIQUID-GLASS LYRICS VIEW */
            <motion.div
              key="lyrics-view"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={springRelaxed}
              className="flex-1 flex flex-col h-full max-w-xl mx-auto w-full overflow-hidden"
            >
              <LyricsView
                file={file}
                currentTime={currentTime}
                duration={duration}
                isPlaying={isPlaying}
                onSeek={seek}
                triggerHaptic={triggerHaptic}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 4. CANVAS DYNAMIC LIQUID WAVEFORM VISUALIZER */}
      <div className="relative z-10 px-6 pt-2 shrink-0">
        <LiquidWaveformCanvas
          currentTime={currentTime}
          duration={duration}
          isPlaying={isPlaying}
          onSeek={seek}
          getByteFrequencyData={getByteFrequencyData}
          triggerHaptic={triggerHaptic}
        />
      </div>

      {/* 5. PLAYBACK CONTROLS & VOLUME CONTROLLER */}
      <div className="relative z-10 px-6 pb-6 pt-3 space-y-4 shrink-0 bg-black/40 backdrop-blur-xl border-t border-white/5">
        {/* Scrubber & Duration */}
        <div className="space-y-1.5">
          <div className="relative flex items-center group">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-white hover:h-2 transition-all"
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-[#A1A1A1] tabular-nums">
            <span>{formatTime(currentTime)}</span>
            <span>-{formatTime(Math.max(0, duration - currentTime))}</span>
          </div>
        </div>

        {/* Buttons Row (Shuffle, Prev, Play/Pause, Next, Loop, Favorite) */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                triggerHaptic('light');
                setIsShuffle(!isShuffle);
              }}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isShuffle ? 'text-purple-400 bg-purple-500/15' : 'text-white/60 hover:text-white'
              }`}
              title="Shuffle"
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              onClick={() => seek(Math.max(0, currentTime - 15))}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all active:scale-95 cursor-pointer"
              title="Rewind 15s"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>

          {/* Master Play/Pause Button */}
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            transition={springSquishy}
            onClick={togglePlay}
            className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-xl shadow-white/20 hover:bg-neutral-100 transition-transform cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 fill-current text-black" />
            ) : (
              <Play className="w-6 h-6 fill-current text-black ml-0.5" />
            )}
          </motion.button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => seek(Math.min(duration, currentTime + 15))}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all active:scale-95 cursor-pointer"
              title="Forward 15s"
            >
              <RotateCw className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                triggerHaptic('light');
                setIsLooping(!isLooping);
              }}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isLooping ? 'text-purple-400 bg-purple-500/15' : 'text-white/60 hover:text-white'
              }`}
              title="Repeat"
            >
              <Repeat className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Volume & Playback Rate Bar */}
        <div className="flex items-center justify-between gap-4 pt-1">
          {/* Volume Control */}
          <div className="flex items-center gap-2 flex-1 max-w-[200px]">
            <button
              onClick={toggleMute}
              className="text-white/60 hover:text-white transition-colors cursor-pointer"
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
              className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-white"
            />
          </div>

          {/* Speed & Share Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                triggerHaptic('light');
                const rates = [1.0, 1.25, 1.5, 2.0];
                const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
                setPlaybackRate(rates[nextIdx]);
              }}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-mono text-white font-medium cursor-pointer transition-colors"
            >
              {playbackRate}x
            </button>
            <button
              onClick={() => {
                triggerHaptic('light');
                setEditingFile(file);
              }}
              className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title="Edit / Rename Track"
            >
              <Edit2 className="w-4 h-4 text-blue-400" />
            </button>
            <button
              onClick={async () => {
                triggerHaptic('light');
                await toggleFavorite(file.id);
              }}
              className="p-1.5 text-white/60 hover:text-red-400 transition-colors cursor-pointer"
            >
              <Heart
                className={`w-4 h-4 ${file.is_favorite ? 'fill-red-500 text-red-500' : ''}`}
              />
            </button>
            <button
              onClick={onDownload}
              className="p-1.5 text-white/60 hover:text-white transition-colors cursor-pointer"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onShare}
              className="p-1.5 text-white/60 hover:text-white transition-colors cursor-pointer"
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
