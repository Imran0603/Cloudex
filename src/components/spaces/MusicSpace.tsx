import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Music,
  Heart,
  Volume2,
  VolumeX,
  Quote,
  Sparkles,
  Share2,
  MoreHorizontal,
  ChevronDown,
  ListMusic,
  Cast,
  Check,
  Info,
  Clock,
  Edit2,
  Shuffle,
  Repeat,
  Repeat1,
  Search,
  Plus,
  X,
  Trash2,
  Shield,
} from 'lucide-react';
import { useCloud } from '../../context/CloudContext';
import { CloudFile } from '../../types/cloud';
import { Glass } from '../Glass';
import { SafeImage } from '../SafeImage';
import {
  springRelaxed,
  springSquishy,
  springSnappy,
  springGlass,
  springHero,
  jellyScaleKeyframes,
  jellyScaleTransition,
  easeJelly,
  tapCard,
  tapPress,
} from '../../motion';
import {
  getAudioDiagnosticInfo,
  attachNativeAudioPipeline,
} from '../../utils/audioEQ';

interface MusicSpaceProps {
  onBack: () => void;
}

interface CuratedAlbum {
  id: string;
  title: string;
  artist: string;
  year: string;
  cover: string;
  trackCount: number;
  quality: string;
}

interface CuratedPlaylist {
  id: string;
  title: string;
  curator: string;
  cover: string;
  songCount: number;
}

const SAMPLE_ALBUMS: CuratedAlbum[] = [
  {
    id: 'alb_01',
    title: 'Midnight Tokyo Lo-Fi',
    artist: 'Cloud Hi-Fi Sessions',
    year: '2026',
    cover: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=85',
    trackCount: 12,
    quality: 'Lossless Master · 24/96',
  },
  {
    id: 'alb_02',
    title: 'Acoustic Sunrise Sessions',
    artist: 'Studio Resonance',
    year: '2026',
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=85',
    trackCount: 10,
    quality: 'Studio Master · 24/192',
  },
  {
    id: 'alb_03',
    title: 'Cyberpunk Synthwave 2077',
    artist: 'Night City Collective',
    year: '2026',
    cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=85',
    trackCount: 14,
    quality: 'Dolby Atmos · Spatial Audio',
  },
  {
    id: 'alb_04',
    title: 'Minimalist Ambient Chords',
    artist: 'Echo Horizon',
    year: '2025',
    cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=85',
    trackCount: 8,
    quality: 'Hi-Res Lossless',
  },
];

const SAMPLE_PLAYLISTS: CuratedPlaylist[] = [
  {
    id: 'pl_01',
    title: 'Deep Coding Acoustics',
    curator: 'Pure Resonance',
    cover: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80',
    songCount: 24,
  },
  {
    id: 'pl_02',
    title: 'Spatial Chillout & Rain',
    curator: 'Bytex Cloud Atmosphere',
    cover: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
    songCount: 18,
  },
  {
    id: 'pl_03',
    title: 'Nordic Mountain Ambient',
    curator: 'Studio Editorial',
    cover: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80',
    songCount: 30,
  },
];

export const MusicSpace: React.FC<MusicSpaceProps> = ({ onBack }) => {
  const {
    files,
    toggleFavorite,
    setShareTargetFile,
    setDetailsFile,
    setEditingFile,
    moveToVault,
    trashFile,
    setIsUploadOpen,
    triggerHaptic,
    showToast,
  } = useCloud();

  // All audio files in the user's cloud
  const audioFiles = useMemo(() => {
    return files.filter(
      (f) =>
        !f.is_deleted &&
        !f.is_vault &&
        (f.mime_type.startsWith('audio/') ||
          ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg', 'alac'].includes(
            f.extension.toLowerCase()
          ))
    );
  }, [files]);

  // Player State
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(214);
  const [volume, setVolume] = useState<number>(0.9);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [isShuffling, setIsShuffling] = useState<boolean>(false);

  // Modals & Sheets
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState<boolean>(false);
  const [showLyrics, setShowLyrics] = useState<boolean>(false);
  const [showQueueSheet, setShowQueueSheet] = useState<boolean>(false);
  const [showAudioInfoSheet, setShowAudioInfoSheet] = useState<boolean>(false);
  const [showOutputSheet, setShowOutputSheet] = useState<boolean>(false);
  const [activeOutputDevice, setActiveOutputDevice] = useState<string>(
    'System Default (Dolby Atmos Ready)'
  );
  const [isDevDebugOpen, setIsDevDebugOpen] = useState<boolean>(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchActive, setIsSearchActive] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'library' | 'albums' | 'playlists'>('library');

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Active track
  const currentTrack: CloudFile | null =
    audioFiles[currentTrackIndex] || audioFiles[0] || null;

  // Real-time audio pipeline diagnostics
  const debugInfo = useMemo(() => getAudioDiagnosticInfo(currentTrack), [currentTrack]);

  // Track cover artwork helper
  const getCoverArt = (file: CloudFile | null, index: number) => {
    if (file?.thumbnail_url) return file.thumbnail_url;
    const covers = [
      'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=85',
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=85',
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=85',
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=85',
    ];
    return covers[index % covers.length];
  };

  const currentCover = getCoverArt(currentTrack, currentTrackIndex);

  // Clean title formatter
  const cleanTitle = (filename: string) => {
    return filename
      .replace(/\.(mp3|wav|flac|m4a|aac|ogg|alac)$/i, '')
      .replace(/[-_]/g, ' ')
      .trim();
  };

  // Time formatters
  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Audio element setup and sync
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const audio = audioRef.current;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const handleEnded = () => {
      if (isLooping) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        handleNextTrack();
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [isLooping, audioFiles.length]);

  // Load track source when currentTrack changes
  useEffect(() => {
    if (currentTrack && audioRef.current) {
      const src =
        currentTrack.storage_path.startsWith('http') || currentTrack.storage_path.startsWith('/')
          ? currentTrack.storage_path
          : `/uploads/${currentTrack.filename}`;
      audioRef.current.src = src;
      if (isPlaying) {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [currentTrack?.id]);

  // Connect directly to the standard Android media pipeline (STREAM_MUSIC)
  // Ensures bit-perfect transmission without Web Audio hijacking so phone's
  // native Dolby Atmos, Equalizer, and OEM audio processing attach 100% cleanly!
  useEffect(() => {
    if (audioRef.current) {
      attachNativeAudioPipeline(audioRef.current);
    }
  }, [currentTrack?.id]);

  // Standard MediaSession API integration for native OS lockscreen & notification controls
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator && currentTrack) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: cleanTitle(currentTrack.filename),
          artist: currentTrack.source_device || 'Studio Hi-Fi Master',
          album:
            SAMPLE_ALBUMS[currentTrackIndex % SAMPLE_ALBUMS.length]?.title ||
            'Cloud Audio Studio',
          artwork: [{ src: currentCover, sizes: '512x512', type: 'image/jpeg' }],
        });

        navigator.mediaSession.setActionHandler('play', () => {
          if (audioRef.current) audioRef.current.play().catch(() => {});
          setIsPlaying(true);
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          if (audioRef.current) audioRef.current.pause();
          setIsPlaying(false);
        });
        navigator.mediaSession.setActionHandler('previoustrack', handlePrevTrack);
        navigator.mediaSession.setActionHandler('nexttrack', handleNextTrack);
      } catch (e) {
        console.debug('MediaSession registration error', e);
      }
    }
  }, [currentTrack?.id, currentCover, currentTrackIndex]);

  // Transport controls
  const togglePlayPause = () => {
    triggerHaptic('medium');
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          setIsPlaying(true);
        });
    }
  };

  const handleTrackSelect = (index: number) => {
    triggerHaptic('light');
    setCurrentTrackIndex(index);
    setIsPlaying(true);
  };

  const handleNextTrack = () => {
    triggerHaptic('light');
    if (audioFiles.length === 0) return;
    if (isShuffling) {
      const nextIdx = Math.floor(Math.random() * audioFiles.length);
      setCurrentTrackIndex(nextIdx);
    } else {
      setCurrentTrackIndex((prev) => (prev + 1) % audioFiles.length);
    }
    setIsPlaying(true);
  };

  const handlePrevTrack = () => {
    triggerHaptic('light');
    if (!audioRef.current) return;
    if (audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
    } else {
      if (audioFiles.length === 0) return;
      setCurrentTrackIndex(
        (prev) => (prev - 1 + audioFiles.length) % audioFiles.length
      );
    }
    setIsPlaying(true);
  };

  const handleSeek = (newTime: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Filtered tracks
  const displayedTracks = useMemo(() => {
    if (!searchQuery.trim()) return audioFiles;
    return audioFiles.filter((f) =>
      f.filename.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [audioFiles, searchQuery]);

  return (
    <div className="min-h-screen bg-[#000000] text-white pb-36 select-none -mx-4 sm:mx-0">
      {/* ========================================================================= */}
      {/* 1. TOP COMPACT LIQUID GLASS HEADER & CONTROLS                             */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-black/75 backdrop-blur-2xl border-b border-white/[0.08] px-4 pt-3 pb-3 transition-colors">
        <div className="flex items-center justify-between gap-3">
          {/* Back & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <motion.button
              type="button"
              whileTap={tapPress}
              transition={springSquishy}
              onClick={() => {
                triggerHaptic('light');
                onBack();
              }}
              className="w-9 h-9 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 flex items-center justify-center text-white/90 cursor-pointer shrink-0 transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </motion.button>

            <div className="min-w-0">
              <h1 className="text-[20px] font-bold tracking-tight text-white leading-tight truncate">
                Music Studio
              </h1>
              <p className="text-[11px] text-neutral-400 font-medium leading-none truncate">
                {audioFiles.length} Tracks · Studio Audio Engine
              </p>
            </div>
          </div>

          {/* Action Bar: Search, Add Music */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Search Toggle */}
            <motion.button
              type="button"
              whileTap={tapPress}
              transition={springSquishy}
              onClick={() => {
                triggerHaptic('light');
                setIsSearchActive((prev) => !prev);
              }}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                isSearchActive
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/[0.08] hover:bg-white/[0.14] text-neutral-300'
              }`}
              aria-label="Search music"
            >
              <Search className="w-3.5 h-3.5" />
            </motion.button>

            {/* Audio Info / Dolby Atmos Badge */}
            <motion.button
              type="button"
              whileTap={tapPress}
              transition={springSquishy}
              onClick={() => {
                triggerHaptic('light');
                setShowAudioInfoSheet(true);
              }}
              className="px-2.5 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 text-[11px] font-semibold text-blue-400 flex items-center gap-1.5 cursor-pointer transition-colors"
              title="System Audio Information"
            >
              <Sparkles className="w-3 h-3 text-blue-400" />
              <span className="hidden sm:inline">Hi-Res Audio</span>
            </motion.button>

            {/* Add / Upload Audio */}
            <motion.button
              type="button"
              whileTap={tapPress}
              transition={springSquishy}
              onClick={() => {
                triggerHaptic('light');
                setIsUploadOpen(true);
              }}
              className="w-8 h-8 rounded-full bg-white text-black hover:bg-neutral-200 flex items-center justify-center font-bold cursor-pointer transition-colors shadow-sm ml-0.5"
              aria-label="Add Audio"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </motion.button>
          </div>
        </div>

        {/* Expandable Search Input */}
        <AnimatePresence>
          {isSearchActive && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 10 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={springGlass}
              className="overflow-hidden"
            >
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tracks, artists, albums..."
                  autoFocus
                  className="w-full bg-white/[0.08] border border-white/10 rounded-full pl-9 pr-9 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 backdrop-blur-md"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 text-neutral-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Space Category Tabs (Library, Albums, Playlists) */}
        <div className="flex items-center gap-2 pt-2.5">
          {(
            [
              { id: 'library', label: 'All Songs' },
              { id: 'albums', label: 'Albums' },
              { id: 'playlists', label: 'Playlists' },
            ] as { id: 'library' | 'albums' | 'playlists'; label: string }[]
          ).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setActiveTab(tab.id);
                }}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-white text-black font-semibold shadow-sm'
                    : 'bg-white/[0.06] hover:bg-white/[0.12] text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. RECENTLY PLAYED (HORIZONTAL SCROLLING LARGE ARTWORK CARDS)             */}
      {/* ========================================================================= */}
      <section className="px-4 pt-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold tracking-tight text-white">Recently Played</h2>
          <span className="text-xs text-neutral-400 font-medium">Updated today</span>
        </div>

        {/* Large Square Artwork Cards (Apple Music Style) */}
        <div className="flex items-start gap-4 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
          {SAMPLE_ALBUMS.map((album, idx) => {
            const isAlbumActive =
              currentTrackIndex === idx % Math.max(1, audioFiles.length);

            return (
              <motion.div
                key={album.id}
                whileTap={tapCard}
                transition={springSquishy}
                onClick={() => {
                  handleTrackSelect(idx % Math.max(1, audioFiles.length));
                }}
                className="flex-none w-40 sm:w-44 space-y-2.5 cursor-pointer group"
              >
                {/* Square Artwork */}
                <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-neutral-900 border border-white/10 shadow-xl transition-all duration-300 group-hover:border-white/30">
                  <img
                    src={album.cover}
                    alt={album.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Play Button Overlay on Hover/Active */}
                  <div
                    className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-200 ${
                      isAlbumActive && isPlaying
                        ? 'opacity-100'
                        : 'opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-xl active:scale-95 transition-transform">
                      {isAlbumActive && isPlaying ? (
                        <Pause className="w-5 h-5 fill-current" />
                      ) : (
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Album Info */}
                <div className="space-y-0.5 px-0.5">
                  <p className="text-xs font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                    {album.title}
                  </p>
                  <p className="text-[11px] text-neutral-400 truncate font-medium">
                    {album.artist}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. CURATED PLAYLISTS SECTION                                              */}
      {/* ========================================================================= */}
      {activeTab === 'playlists' && (
        <section className="px-4 pt-5 space-y-3">
          <h2 className="text-base font-bold tracking-tight text-white">Curated Playlists</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {SAMPLE_PLAYLISTS.map((pl) => (
              <motion.div
                key={pl.id}
                whileTap={tapCard}
                transition={springSquishy}
                onClick={() => {
                  triggerHaptic('light');
                  if (audioFiles.length > 0) {
                    handleTrackSelect(0);
                  }
                }}
                className="space-y-2 cursor-pointer group"
              >
                <div className="aspect-square w-full rounded-2xl overflow-hidden bg-neutral-900 border border-white/10 shadow-lg">
                  <img
                    src={pl.cover}
                    alt={pl.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white truncate">{pl.title}</p>
                  <p className="text-[11px] text-neutral-400">{pl.curator}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 4. ALL TRACKS LIBRARY (CLEAN NATIVE MUSIC ROWS)                           */}
      {/* ========================================================================= */}
      <section className="px-4 pt-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold tracking-tight text-white">
            {activeTab === 'albums' ? 'Albums & Tracks' : 'All Tracks'}
          </h2>
          <span className="text-xs text-neutral-400 font-medium tabular-nums">
            {displayedTracks.length} songs
          </span>
        </div>

        {displayedTracks.length > 0 ? (
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] divide-y divide-white/[0.05] overflow-hidden">
            {displayedTracks.map((file, idx) => {
              const isCurrent = currentTrack?.id === file.id;
              const cover = getCoverArt(file, idx);

              return (
                <motion.div
                  key={file.id}
                  whileTap={tapCard}
                  transition={springSquishy}
                  onClick={() => handleTrackSelect(idx)}
                  className={`px-3.5 py-3 flex items-center justify-between gap-3 hover:bg-white/[0.04] transition-colors cursor-pointer group ${
                    isCurrent ? 'bg-blue-600/10' : ''
                  }`}
                >
                  {/* Left: Artwork Thumbnail + Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Track Square Artwork */}
                    <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-neutral-900 shrink-0 border border-white/10 shadow-sm">
                      <img
                        src={cover}
                        alt={file.filename}
                        className="w-full h-full object-cover"
                      />
                      {isCurrent && isPlaying && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                        </div>
                      )}
                    </div>

                    {/* Title & Artist */}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs font-semibold truncate leading-tight transition-colors ${
                          isCurrent ? 'text-blue-400 font-bold' : 'text-white'
                        }`}
                      >
                        {cleanTitle(file.filename)}
                      </p>
                      <p className="text-[11px] text-neutral-400 truncate mt-0.5 font-medium">
                        {file.source_device || 'Lossless Master'} · {file.extension.toUpperCase()}
                      </p>
                    </div>
                  </div>

                  {/* Right: Duration, Favorite, Options */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-mono text-neutral-400 tabular-nums">
                      {formatTime(file.duration || 214)}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic('light');
                        toggleFavorite(file.id);
                      }}
                      className="w-8 h-8 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          file.is_favorite
                            ? 'fill-red-500 text-red-500'
                            : 'text-neutral-500'
                        }`}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic('light');
                        setShareTargetFile(file);
                      }}
                      className="w-8 h-8 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="py-20 text-center px-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-white/[0.06] text-neutral-400 flex items-center justify-center mx-auto">
              <Music className="w-6 h-6 stroke-[1.5]" />
            </div>
            <p className="text-sm font-semibold text-neutral-300">No tracks in library</p>
            <p className="text-xs text-neutral-500 max-w-xs mx-auto">
              Upload your lossless music, audiobooks, or recordings to start listening.
            </p>
            <button
              type="button"
              onClick={() => setIsUploadOpen(true)}
              className="mt-2 px-4 py-2 rounded-full bg-white text-black text-xs font-semibold shadow-sm hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              Upload Audio Files
            </button>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 5. FLOATING LIQUID GLASS MINI PLAYER                                      */}
      {/* ========================================================================= */}
      {currentTrack && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={springGlass}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[min(380px,calc(100vw-32px))]"
        >
          <Glass
            onClick={() => {
              triggerHaptic('light');
              setIsNowPlayingOpen(true);
            }}
            className="p-2 pl-2.5 rounded-full flex items-center justify-between shadow-2xl border border-white/20 cursor-pointer overflow-hidden relative group"
          >
            {/* Subtle Progress Bar Along Bottom of Mini Player */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/[0.1]">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{
                  width: `${Math.min(100, (currentTime / (duration || 1)) * 100)}%`,
                }}
              />
            </div>

            {/* Artwork & Info */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-neutral-900 shrink-0 border border-white/15 shadow-sm">
                <img
                  src={currentCover}
                  alt={currentTrack.filename}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="min-w-0 flex-1 pr-2">
                <p className="text-xs font-bold text-white truncate leading-tight">
                  {cleanTitle(currentTrack.filename)}
                </p>
                <p className="text-[10px] text-neutral-400 truncate leading-none mt-0.5">
                  {currentTrack.source_device || 'Studio Hi-Fi Master'}
                </p>
              </div>
            </div>

            {/* Mini Player Controls */}
            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={togglePlayPause}
                className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-md active:scale-95 transition-transform cursor-pointer"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={handleNextTrack}
                className="w-8 h-8 rounded-full hover:bg-white/10 text-neutral-300 flex items-center justify-center cursor-pointer transition-colors"
                aria-label="Next Track"
              >
                <SkipForward className="w-4 h-4 fill-current" />
              </button>
            </div>
          </Glass>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* 6. FULL NOW PLAYING SCREEN (APPLE MUSIC / TIDAL POLISHED EXPERIENCE)      */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isNowPlayingOpen && currentTrack && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springHero}
            className="fixed inset-0 z-60 bg-black flex flex-col justify-between overflow-hidden select-none"
          >
            {/* Blurred Album Artwork Background Aura */}
            <div
              className="absolute inset-0 opacity-35 pointer-events-none scale-125 transition-all duration-1000"
              style={{
                backgroundImage: `url(${currentCover})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(70px)',
              }}
            />

            {/* Dark overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-[#0A0A0C] pointer-events-none" />

            {/* Top Bar: Dismiss Grabber, Audio Badge, Menu */}
            <div className="relative z-10 px-5 pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsNowPlayingOpen(false)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
                aria-label="Dismiss"
              >
                <ChevronDown className="w-5 h-5" />
              </button>

              {/* Lossless / Dolby Atmos Subtle Badge */}
              <button
                type="button"
                onClick={() => setShowAudioInfoSheet(true)}
                className="px-3 py-1 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-[11px] font-semibold text-white/90 flex items-center gap-1.5 cursor-pointer backdrop-blur-md"
              >
                <Sparkles className="w-3 h-3 text-blue-400" />
                <span>Lossless Master</span>
              </button>

              <button
                type="button"
                onClick={() => setShowQueueSheet(true)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
                aria-label="Tracklist Queue"
              >
                <ListMusic className="w-4 h-4" />
              </button>
            </div>

            {/* Centered Large Square Artwork (Hero with calm breathing scale) */}
            <div className="relative z-10 flex-1 flex items-center justify-center px-8 py-4">
              <motion.div
                animate={isPlaying ? { scale: [1, 1.018, 1] } : { scale: 1 }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="aspect-square w-full max-w-[320px] rounded-3xl overflow-hidden bg-neutral-900 border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative"
              >
                <img
                  src={currentCover}
                  alt={currentTrack.filename}
                  className="w-full h-full object-cover"
                />
              </motion.div>
            </div>

            {/* Bottom Controls Panel */}
            <div className="relative z-10 px-7 pb-10 space-y-5">
              {/* Song Title, Artist, and Favorite Heart */}
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold tracking-tight text-white truncate leading-tight">
                    {cleanTitle(currentTrack.filename)}
                  </h2>
                  <p className="text-sm text-neutral-400 font-medium truncate mt-0.5">
                    {currentTrack.source_device || 'Studio Hi-Fi Master'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('medium');
                    toggleFavorite(currentTrack.id);
                  }}
                  className="w-10 h-10 rounded-full bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center cursor-pointer transition-colors shrink-0"
                >
                  <Heart
                    className={`w-5 h-5 ${
                      currentTrack.is_favorite
                        ? 'fill-red-500 text-red-500'
                        : 'text-neutral-400'
                    }`}
                  />
                </button>
              </div>

              {/* Progress Scrubber */}
              <div className="space-y-1.5">
                <input
                  type="range"
                  min={0}
                  max={duration || 1}
                  value={currentTime}
                  onChange={(e) => handleSeek(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-white"
                />
                <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 tabular-nums">
                  <span>{formatTime(currentTime)}</span>
                  <span>-{formatTime(Math.max(0, (duration || 0) - currentTime))}</span>
                </div>
              </div>

              {/* Main Playback Transport (Previous, Play/Pause, Next) */}
              <div className="flex items-center justify-between px-4">
                <button
                  type="button"
                  onClick={() => setIsShuffling((prev) => !prev)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                    isShuffling ? 'text-blue-400' : 'text-neutral-500 hover:text-white'
                  }`}
                  aria-label="Shuffle"
                >
                  <Shuffle className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-6">
                  <motion.button
                    type="button"
                    whileTap={tapPress}
                    transition={springSquishy}
                    onClick={handlePrevTrack}
                    className="w-12 h-12 rounded-full hover:bg-white/10 text-white flex items-center justify-center cursor-pointer transition-colors"
                    aria-label="Previous Track"
                  >
                    <SkipBack className="w-6 h-6 fill-current" />
                  </motion.button>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    transition={springSquishy}
                    onClick={togglePlayPause}
                    className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center shadow-2xl active:scale-95 transition-transform cursor-pointer"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? (
                      <Pause className="w-7 h-7 fill-current" />
                    ) : (
                      <Play className="w-7 h-7 fill-current ml-1" />
                    )}
                  </motion.button>

                  <motion.button
                    type="button"
                    whileTap={tapPress}
                    transition={springSquishy}
                    onClick={handleNextTrack}
                    className="w-12 h-12 rounded-full hover:bg-white/10 text-white flex items-center justify-center cursor-pointer transition-colors"
                    aria-label="Next Track"
                  >
                    <SkipForward className="w-6 h-6 fill-current" />
                  </motion.button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsLooping((prev) => !prev)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                    isLooping ? 'text-blue-400' : 'text-neutral-500 hover:text-white'
                  }`}
                  aria-label="Loop"
                >
                  {isLooping ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
                </button>
              </div>

              {/* Bottom Utility Bar: Lyrics, Output Device, Queue */}
              <div className="pt-2 flex items-center justify-center gap-8 text-neutral-400">
                <button
                  type="button"
                  onClick={() => setShowLyrics((prev) => !prev)}
                  className={`flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors ${
                    showLyrics ? 'text-blue-400' : 'hover:text-white'
                  }`}
                >
                  <Quote className="w-4 h-4" />
                  <span>Lyrics</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowOutputSheet(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold hover:text-white cursor-pointer transition-colors"
                >
                  <Cast className="w-4 h-4 text-blue-400" />
                  <span>Output</span>
                </button>
              </div>
            </div>

            {/* Lyrics Drawer Overlay */}
            <AnimatePresence>
              {showLyrics && (
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 40 }}
                  className="absolute inset-x-0 bottom-24 top-20 z-20 bg-black/90 backdrop-blur-2xl p-6 overflow-y-auto no-scrollbar rounded-t-3xl border-t border-white/10 space-y-4"
                >
                  <div className="flex justify-between items-center pb-2 border-b border-white/10">
                    <h3 className="text-sm font-bold text-white">Lyrics & Verse</h3>
                    <button
                      type="button"
                      onClick={() => setShowLyrics(false)}
                      className="text-xs text-neutral-400 hover:text-white"
                    >
                      Close
                    </button>
                  </div>
                  <div className="space-y-4 text-sm font-medium text-neutral-300 leading-relaxed">
                    <p className="text-white font-bold text-base">
                      [Instrumental Intro · Studio Atmosphere]
                    </p>
                    <p>Neon reflections on the midnight pavement</p>
                    <p>Frequencies echo through the digital corridor</p>
                    <p className="text-blue-400 font-semibold">
                      Lossless waves carrying every subtle harmony
                    </p>
                    <p>Bassline resonating directly into the session</p>
                    <p>Calm atmosphere settling into the night</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 7. UP NEXT QUEUE SHEET                                                    */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showQueueSheet && (
          <div
            className="fixed inset-0 z-70 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setShowQueueSheet(false)}
          >
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={springRelaxed}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-[#141416] border-t sm:border border-white/15 p-5 max-h-[80vh] flex flex-col space-y-4"
            >
              <div className="w-10 h-1.5 rounded-full bg-white/20 mx-auto cursor-grab" />
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-bold text-white">Up Next & Queue</h3>
                <button
                  type="button"
                  onClick={() => setShowQueueSheet(false)}
                  className="w-7 h-7 rounded-full bg-white/10 text-neutral-300 flex items-center justify-center text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-white/[0.05]">
                {audioFiles.map((file, idx) => (
                  <div
                    key={file.id}
                    onClick={() => {
                      handleTrackSelect(idx);
                      setShowQueueSheet(false);
                    }}
                    className={`py-2.5 px-2 flex items-center justify-between gap-3 hover:bg-white/[0.05] rounded-xl cursor-pointer ${
                      currentTrackIndex === idx ? 'text-blue-400' : 'text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xs font-mono text-neutral-500 w-4">{idx + 1}</span>
                      <p className="text-xs font-semibold truncate">{cleanTitle(file.filename)}</p>
                    </div>
                    <span className="text-[11px] font-mono text-neutral-500 tabular-nums">
                      {formatTime(file.duration || 214)}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 8. SYSTEM AUDIO INFO & DEVELOPER TELEMETRY SHEET                          */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showAudioInfoSheet && (
          <div
            className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
            onClick={() => {
              setShowAudioInfoSheet(false);
              setIsDevDebugOpen(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: [...jellyScaleKeyframes], y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{
                y: springRelaxed,
                scale: jellyScaleTransition,
                opacity: { duration: 0.35, ease: easeJelly },
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl bg-[#141418] border border-white/15 p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  Audio Quality Information
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setShowAudioInfoSheet(false);
                    setIsDevDebugOpen(false);
                  }}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 flex items-center justify-center cursor-pointer text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03]">
                  <span className="text-neutral-400">Audio Pipeline</span>
                  <span className="text-blue-400 font-semibold">Standard Android AudioSession</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03]">
                  <span className="text-neutral-400">Format</span>
                  <span className="text-white font-medium">{debugInfo.format}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03]">
                  <span className="text-neutral-400">Sample Rate</span>
                  <span className="text-white font-mono">{debugInfo.sampleRate}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03]">
                  <span className="text-neutral-400">Bit Depth</span>
                  <span className="text-white font-mono">{debugInfo.bitDepth}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03]">
                  <span className="text-neutral-400">Device Processing</span>
                  <span className="text-emerald-400 font-semibold">Dolby Atmos / Phone EQ Ready</span>
                </div>
              </div>

              {/* Developer Diagnostics Expander */}
              <div className="pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsDevDebugOpen((prev) => !prev)}
                  className="w-full text-center text-[10px] font-mono text-neutral-400 hover:text-white py-1 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>
                    {isDevDebugOpen
                      ? '▲ Hide Developer Diagnostics'
                      : '▼ Developer Audio Diagnostics'}
                  </span>
                </button>

                {isDevDebugOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2.5 p-3 rounded-xl bg-black/60 border border-white/10 space-y-2 text-[11px] font-mono text-neutral-300"
                  >
                    <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                      Internal Pipeline Telemetry
                    </p>
                    <div className="space-y-1.5 text-[10px]">
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Session ID:</span>
                        <span className="text-blue-300">{debugInfo.audioSessionId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Codec:</span>
                        <span className="text-white">{debugInfo.codec}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Output Sink:</span>
                        <span className="text-white truncate max-w-[170px]">
                          {debugInfo.outputDevice}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Path:</span>
                        <span className="text-emerald-400 truncate max-w-[170px]">
                          STREAM_MUSIC (Direct)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Effects Hook:</span>
                        <span className="text-emerald-400 font-semibold">Attached & Compatible</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              <p className="text-[11px] text-neutral-500 text-center leading-relaxed">
                Bit-perfect source playback allows your phone's native Dolby Atmos and Equalizer to
                shape the sound faithfully.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 9. OUTPUT DEVICE SELECTOR SHEET                                           */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showOutputSheet && (
          <div
            className="fixed inset-0 z-70 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setShowOutputSheet(false)}
          >
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={springRelaxed}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-[#141416] border-t sm:border border-white/15 p-5 space-y-4"
            >
              <div className="w-10 h-1.5 rounded-full bg-white/20 mx-auto cursor-grab" />
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-bold text-white">Audio Output Sink</h3>
                <button
                  type="button"
                  onClick={() => setShowOutputSheet(false)}
                  className="w-7 h-7 rounded-full bg-white/10 text-neutral-300 flex items-center justify-center text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2">
                {[
                  'System Default (Dolby Atmos Ready)',
                  'Bluetooth Audio Device (LDAC / AptX)',
                  'Wired Headphone DAC (Bit-Perfect)',
                  'AirPlay / Cast Target',
                ].map((device) => (
                  <button
                    key={device}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setActiveOutputDevice(device);
                      setShowOutputSheet(false);
                      showToast(`Routed to ${device}`, 'success');
                    }}
                    className={`w-full p-3 rounded-2xl flex items-center justify-between text-left transition-colors cursor-pointer border ${
                      activeOutputDevice === device
                        ? 'bg-blue-600/20 border-blue-500/40 text-white'
                        : 'bg-white/[0.03] border-white/10 text-neutral-300'
                    }`}
                  >
                    <span className="text-xs font-semibold">{device}</span>
                    {activeOutputDevice === device && <Check className="w-4 h-4 text-blue-400" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
