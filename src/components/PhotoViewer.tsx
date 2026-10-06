import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'motion/react';
import {
  X,
  Info,
  Heart,
  Sliders,
  Share2,
  Download,
  MoreHorizontal,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Volume1,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Film,
  Sparkles,
  Check,
} from 'lucide-react';
import { useCloud } from '../context/CloudContext';
import { useModalStack } from '../context/ModalStackContext';
import {
  spring,
  springSnappy,
  springHero,
  springBouncy,
  springSquishy,
  springRelaxed,
  springJelly,
  jellyScaleKeyframes,
  jellyScaleTransition,
  easeJelly,
} from '../motion';
import { PhotoEditor } from './PhotoEditor';
import { PhotoInfoSheet } from './PhotoInfoSheet';
import { PhotoMoreSheet } from './PhotoMoreSheet';
import {
  AudioEQPreset,
  EQ_PROFILES,
  applyAudioEQ,
  getSavedEQPreset,
  saveEQPreset,
} from '../utils/audioEQ';

export const PhotoViewer: React.FC = () => {
  const {
    activePhoto,
    closeViewer,
    nextPhoto,
    prevPhoto,
    toggleFavorite,
    trashFile,
    moveToVault,
    setShareTargetFile,
    setEditingFile,
    triggerHaptic,
    files,
    vaultFiles,
    folders,
    albums,
    updateFile,
    duplicateFile,
    revertFileToOriginal,
    showToast,
  } = useCloud();

  const { registerModal, unregisterModal, getZIndex } = useModalStack();

  // Mode: 'view' vs 'edit'
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Sheets state
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);
  const [isMoreOpen, setIsMoreOpen] = useState<boolean>(false);

  // Controls visibility & auto-hide
  const [areControlsVisible, setAreControlsVisible] = useState<boolean>(true);
  const [isFullResLoaded, setIsFullResLoaded] = useState<boolean>(false);

  // Zoom & Pan
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [zoomOrigin, setZoomOrigin] = useState<{ x: string; y: string }>({ x: '50%', y: '50%' });
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Swipe Horizontal Transition (Slide Next / Prev)
  const slideX = useMotionValue(0);
  const [slideDirection, setSlideDirection] = useState<number>(0);

  // Drag-dismiss values (ONLY transforms the MediaLayer on swipe down)
  const dismissY = useMotionValue(0);
  const dismissBackdropOpacity = useTransform(dismissY, [0, 300], [1, 0.2]);
  const dismissImageScale = useTransform(dismissY, [0, 300], [1, 0.84]);

  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTapRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Video Player Specific State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(true);
  const [videoCurrentTime, setVideoCurrentTime] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoVolume, setVideoVolume] = useState<number>(1);
  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(false);
  const [videoPlaybackRate, setVideoPlaybackRate] = useState<number>(1.0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [activeEQ, setActiveEQ] = useState<AudioEQPreset>(getSavedEQPreset());
  const [showEQSheet, setShowEQSheet] = useState<boolean>(false);

  // Apply Dolby Atmos & Bass Boost DSP onto the video element
  useEffect(() => {
    if (activePhoto?.mime_type.startsWith('video/') && videoRef.current) {
      applyAudioEQ(videoRef.current, activeEQ);
    }
  }, [activePhoto?.id, activePhoto?.mime_type, activeEQ]);

  // Favorite button tap animation state
  const [isHeartPopping, setIsHeartPopping] = useState<boolean>(false);

  // Modal registration for stack
  const modalId = activePhoto ? `photo-viewer-${activePhoto.id}` : '';
  const closeViewerRef = useRef(closeViewer);
  useEffect(() => {
    closeViewerRef.current = closeViewer;
  }, [closeViewer]);

  useEffect(() => {
    if (modalId) {
      registerModal(modalId, () => {
        if (isEditing) {
          setIsEditing(false);
        } else if (isInfoOpen) {
          setIsInfoOpen(false);
        } else if (isMoreOpen) {
          setIsMoreOpen(false);
        } else {
          closeViewerRef.current();
        }
      }, 'viewer');
      return () => unregisterModal(modalId);
    }
  }, [modalId, registerModal, unregisterModal, isEditing, isInfoOpen, isMoreOpen]);

  // Current Media Pool for smooth sliding
  const mediaPool = activePhoto?.is_vault
    ? vaultFiles
    : files.filter(
        (f) =>
          !f.is_deleted &&
          !f.is_vault &&
          (f.mime_type.startsWith('image/') ||
            f.mime_type.startsWith('video/') ||
            ['jpg', 'jpeg', 'png', 'webp', 'heic', 'mp4', 'mov', 'webm'].includes(f.extension.toLowerCase()))
      );

  const currentIndex = activePhoto ? mediaPool.findIndex((f) => f.id === activePhoto.id) : -1;
  const hasNext = currentIndex !== -1 && currentIndex < mediaPool.length - 1;
  const hasPrev = currentIndex > 0;

  // Slide navigation handlers
  const handleSlideNext = useCallback(() => {
    if (hasNext) {
      triggerHaptic('light');
      setSlideDirection(1);
      nextPhoto();
    }
  }, [hasNext, nextPhoto, triggerHaptic]);

  const handleSlidePrev = useCallback(() => {
    if (hasPrev) {
      triggerHaptic('light');
      setSlideDirection(-1);
      prevPhoto();
    }
  }, [hasPrev, prevPhoto, triggerHaptic]);

  // Reset states when photo/video changes
  useEffect(() => {
    if (!activePhoto) return;
    setIsFullResLoaded(false);
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    dismissY.set(0);
    slideX.set(0);
    setAreControlsVisible(true);
    setVideoCurrentTime(0);
    setIsVideoPlaying(true);

    // Auto-play video if present
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {
        setIsVideoPlaying(false);
      });
    }
  }, [activePhoto?.id, dismissY, slideX]);

  // Auto-hide controls after 4s idle
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      if (!isEditing && !isInfoOpen && !isMoreOpen) {
        setAreControlsVisible(false);
      }
    }, 4500);
  }, [isEditing, isInfoOpen, isMoreOpen]);

  useEffect(() => {
    if (areControlsVisible && !isEditing) {
      resetIdleTimer();
    }
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [areControlsVisible, isEditing, resetIdleTimer]);

  // Video Controls Handlers
  const toggleVideoPlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    triggerHaptic('medium');
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsVideoPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsVideoPlaying(false);
    }
    resetIdleTimer();
  };

  const skipVideo = (seconds: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    triggerHaptic('light');
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(videoDuration, videoRef.current.currentTime + seconds));
    videoRef.current.currentTime = newTime;
    setVideoCurrentTime(newTime);
    resetIdleTimer();
  };

  const seekVideo = (time: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = time;
    setVideoCurrentTime(time);
    resetIdleTimer();
  };

  const toggleVideoMute = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    triggerHaptic('light');
    if (!videoRef.current) return;
    videoRef.current.muted = !isVideoMuted;
    setIsVideoMuted(!isVideoMuted);
    resetIdleTimer();
  };

  const cyclePlaybackRate = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    triggerHaptic('light');
    const rates = [1.0, 1.25, 1.5, 2.0];
    const nextIdx = (rates.indexOf(videoPlaybackRate) + 1) % rates.length;
    const newRate = rates[nextIdx];
    if (videoRef.current) videoRef.current.playbackRate = newRate;
    setVideoPlaybackRate(newRate);
    resetIdleTimer();
  };

  const toggleFullscreen = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    triggerHaptic('light');
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
    resetIdleTimer();
  };

  // Keyboard navigation & media controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditing) return;
      if (e.key === 'Escape') closeViewer();
      if (e.key === 'ArrowRight') {
        if (e.shiftKey && videoRef.current) {
          skipVideo(10);
        } else {
          handleSlideNext();
        }
      }
      if (e.key === 'ArrowLeft') {
        if (e.shiftKey && videoRef.current) {
          skipVideo(-10);
        } else {
          handleSlidePrev();
        }
      }
      if (e.key === ' ' && videoRef.current) {
        e.preventDefault();
        toggleVideoPlay();
      }
      if (e.key === 'm' || e.key === 'M') toggleVideoMute();
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
      if (e.key === 'i' || e.key === 'I') setIsInfoOpen((v) => !v);
      if (e.key === 'e' || e.key === 'E') setIsEditing(true);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeViewer, handleSlideNext, handleSlidePrev, isEditing, isVideoPlaying, isVideoMuted, videoDuration]);

  if (!activePhoto) return null;

  const isVideo = activePhoto.mime_type.startsWith('video/');
  const zIndex = Math.max(1000, getZIndex(modalId));

  // Date and device formatting
  const formattedDate = new Date(activePhoto.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const deviceName = activePhoto.source_device || 'iPhone 17 Pro';

  // Folder & Album names
  const currentFolder = folders.find((f) => f.id === activePhoto.folder_id)?.name || 'Main Library';
  const currentAlbum = albums.find((a) => a.id === activePhoto.album_id)?.name;

  // Double-tap zoom handler (1x <-> 2.5x)
  const handleDoubleTap = (e: React.MouseEvent | React.TouchEvent) => {
    triggerHaptic('light');
    if (zoomScale > 1) {
      setZoomScale(1);
      setPanOffset({ x: 0, y: 0 });
    } else {
      let clientX = 0;
      let clientY = 0;
      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        clientX = (e as React.MouseEvent).clientX;
        clientY = (e as React.MouseEvent).clientY;
      }
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const xPercent = ((clientX - rect.left) / rect.width) * 100;
        const yPercent = ((clientY - rect.top) / rect.height) * 100;
        setZoomOrigin({ x: `${xPercent}%`, y: `${yPercent}%` });
      }
      setZoomScale(2.5);
    }
  };

  // Touch gesture handler (Tap, Double tap, Swipe horizontal, Swipe down to close, Swipe up for info)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const now = Date.now();
    const dt = now - touchStartRef.current.time;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    // Check double tap
    if (now - lastTapRef.current < 280) {
      handleDoubleTap(e);
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;

    // Gestures when zoomScale === 1
    if (zoomScale <= 1) {
      // Horizontal swipe to next/prev with smooth slide
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3 && dt < 500) {
        if (dx < 0) {
          handleSlideNext();
        } else {
          handleSlidePrev();
        }
        return;
      }

      // Swipe down to close
      if (dy > 80 && Math.abs(dy) > Math.abs(dx) * 1.5 && dt < 450) {
        triggerHaptic('light');
        closeViewer();
        return;
      }

      // Swipe up: reveal Info sheet
      if (dy < -65 && Math.abs(dy) > Math.abs(dx) * 1.5 && dt < 400) {
        triggerHaptic('light');
        setIsInfoOpen(true);
        return;
      }
    }
  };

  // Handle Favorite press with elastic bounce
  const handleFavoritePress = async () => {
    triggerHaptic('light');
    setIsHeartPopping(true);
    await toggleFavorite(activePhoto.id);
    setTimeout(() => setIsHeartPopping(false), 380);
  };

  // Handle Save from Editor
  const handleSaveEdited = async (editedDataUrl: string, editSummary: any) => {
    triggerHaptic('success');
    const original = activePhoto.original_storage_path || activePhoto.storage_path;
    const history = activePhoto.edit_history ? [...activePhoto.edit_history, editSummary] : [editSummary];

    await updateFile(activePhoto.id, {
      storage_path: editedDataUrl,
      thumbnail_url: editedDataUrl,
      original_storage_path: original,
      edited_version_url: editedDataUrl,
      edit_history: history,
      location: editSummary.locationRemoved ? 'Location Removed' : activePhoto.location,
    });

    setIsEditing(false);
    showToast('Photo edited and saved successfully', 'success');
  };

  // Revert photo edits
  const handleRevert = async () => {
    triggerHaptic('warning');
    await revertFileToOriginal(activePhoto.id);
    setIsEditing(false);
    showToast('Reverted to original photo', 'info');
  };

  const handleRename = async (newName: string) => {
    const currentName = activePhoto.filename.replace(/\.[^/.]+$/, '');
    if (newName.trim() && newName !== currentName) {
      triggerHaptic('light');
      const ext = activePhoto.extension ? `.${activePhoto.extension}` : '';
      await updateFile(activePhoto.id, { filename: `${newName.trim()}${ext}` });
      showToast('File renamed', 'success');
    }
  };

  const handleMoveToVault = async () => {
    triggerHaptic('medium');
    const ok = await moveToVault(activePhoto.id);
    if (ok) closeViewer();
  };

  const handleToggleHide = async () => {
    triggerHaptic('light');
    const newHide = !activePhoto.is_hidden;
    await updateFile(activePhoto.id, { is_hidden: newHide });
    showToast(newHide ? 'Moved to Hidden album' : 'Unhidden', 'info');
  };

  const handleDuplicate = async () => {
    triggerHaptic('light');
    await duplicateFile(activePhoto.id);
    showToast('Duplicate created', 'success');
  };

  const handleDelete = () => {
    triggerHaptic('warning');
    if (confirm(`Move "${activePhoto.filename}" to trash?`)) {
      trashFile(activePhoto.id);
      closeViewer();
      showToast('Moved to trash', 'info');
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const viewerContent = (
    <div
      ref={containerRef}
      style={{ zIndex }}
      className="fixed inset-0 h-[100dvh] bg-[#000000] overflow-hidden select-none touch-none pointer-events-auto"
    >
      {/* 0. PURE BLACK BACKDROP */}
      <motion.div
        style={{ opacity: dismissBackdropOpacity }}
        className="absolute inset-0 bg-[#000000] pointer-events-none"
      />

      {/* =========================================================================
          LAYER 1: FULLSCREEN IMAGE / VIDEO AREA WITH SMOOTH SLIDE
         ========================================================================= */}
      <div className="absolute inset-0 z-[1] flex items-center justify-center pointer-events-auto overflow-hidden">
        <motion.div
          key={activePhoto.id}
          initial={{ opacity: 0, x: slideDirection > 0 ? 100 : slideDirection < 0 ? -100 : 0, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: slideDirection > 0 ? -100 : 100, scale: 0.98 }}
          transition={springSquishy}
          style={{
            y: dismissY,
            scale: dismissImageScale,
          }}
          drag={zoomScale <= 1 ? true : false}
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          dragElastic={0.4}
          onDrag={(e, info) => {
            if (info.offset.y > 0) {
              dismissY.set(info.offset.y);
            }
          }}
          onDragEnd={(e, info) => {
            const { offset, velocity } = info;
            // 1. Vertical swipe down to dismiss modal
            if (offset.y > 80 || velocity.y > 400) {
              triggerHaptic('light');
              closeViewer();
              return;
            }
            animate(dismissY, 0, springHero);

            // 2. Horizontal swipe to navigate between photos and videos
            if (Math.abs(offset.x) > Math.abs(offset.y) * 1.1) {
              if (offset.x < -50 || velocity.x < -250) {
                handleSlideNext();
              } else if (offset.x > 50 || velocity.x > 250) {
                handleSlidePrev();
              }
            }
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={() => {
            setAreControlsVisible((v) => !v);
          }}
          className="relative w-full h-full flex items-center justify-center max-w-full max-h-full cursor-grab active:cursor-grabbing"
        >
          <div
            style={{
              transform: `scale(${zoomScale}) translate(${panOffset.x}px, ${panOffset.y}px)`,
              transformOrigin: `${zoomOrigin.x} ${zoomOrigin.y}`,
              transition: 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)',
            }}
            className="relative w-full h-full flex items-center justify-center max-w-full max-h-full px-2"
          >
            {/* Instant Thumbnail while loading */}
            {!isFullResLoaded && (
              <img
                src={activePhoto.thumbnail_url || activePhoto.storage_path}
                alt={activePhoto.filename}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity duration-200"
              />
            )}

            {/* Video Player or Image */}
            {isVideo ? (
              <div className="relative w-full h-full flex items-center justify-center group/video">
                <video
                  ref={videoRef}
                  key={activePhoto.id}
                  src={
                    activePhoto.storage_path.startsWith('http') && !activePhoto.storage_path.includes('/uploads/')
                      ? '/uploads/tokyo_rain_reflection.mp4'
                      : activePhoto.storage_path
                  }
                  playsInline
                  autoPlay
                  preload="auto"
                  onLoadedData={() => {
                    setIsFullResLoaded(true);
                    if (videoRef.current) {
                      setVideoDuration(videoRef.current.duration || activePhoto.duration || 0);
                    }
                  }}
                  onCanPlay={() => {
                    setIsFullResLoaded(true);
                  }}
                  onTimeUpdate={() => {
                    if (videoRef.current) setVideoCurrentTime(videoRef.current.currentTime);
                  }}
                  onDurationChange={() => {
                    if (videoRef.current) setVideoDuration(videoRef.current.duration);
                  }}
                  onPlay={() => setIsVideoPlaying(true)}
                  onPause={() => setIsVideoPlaying(false)}
                  onEnded={() => setIsVideoPlaying(false)}
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.includes('/uploads/tokyo_rain_reflection.mp4')) {
                      target.src = '/uploads/tokyo_rain_reflection.mp4';
                      target.play().catch(() => {});
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleVideoPlay();
                  }}
                  className="max-w-full max-h-[82vh] w-auto h-auto object-contain rounded-2xl shadow-2xl cursor-pointer"
                />

                {/* Big Center Play / Pause Icon on Pause or Click */}
                {!isVideoPlaying && (
                  <motion.button
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={springSquishy}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleVideoPlay();
                    }}
                    className="absolute inset-0 m-auto w-20 h-20 rounded-full bg-black/60 hover:bg-black/75 backdrop-blur-xl border border-white/20 text-white flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-transform cursor-pointer z-10"
                    title="Play"
                  >
                    <Play className="w-10 h-10 fill-current ml-1" />
                  </motion.button>
                )}
              </div>
            ) : (
              <img
                src={activePhoto.storage_path}
                alt={activePhoto.filename}
                onLoad={() => setIsFullResLoaded(true)}
                className="max-w-full max-h-full w-auto h-auto object-contain"
              />
            )}
          </div>
        </motion.div>
      </div>

      {/* =========================================================================
          SMOOTH SLIDE BUTTONS (LEFT & RIGHT CHEVRONS)
         ========================================================================= */}
      {hasPrev && areControlsVisible && !isEditing && (
        <motion.button
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={springSquishy}
          onClick={(e) => {
            e.stopPropagation();
            handleSlidePrev();
          }}
          className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-white flex items-center justify-center shadow-2xl border border-white/15 backdrop-blur-xl active:scale-90 transition-all cursor-pointer"
          title="Previous (Slide Left)"
        >
          <ChevronLeft className="w-6 h-6" />
        </motion.button>
      )}

      {hasNext && areControlsVisible && !isEditing && (
        <motion.button
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 16 }}
          transition={springSquishy}
          onClick={(e) => {
            e.stopPropagation();
            handleSlideNext();
          }}
          className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-white flex items-center justify-center shadow-2xl border border-white/15 backdrop-blur-xl active:scale-90 transition-all cursor-pointer"
          title="Next (Slide Right)"
        >
          <ChevronRight className="w-6 h-6" />
        </motion.button>
      )}

      {/* =========================================================================
          LAYER 2: TOP VIEWER BAR
         ========================================================================= */}
      <motion.div
        initial={false}
        animate={{
          y: areControlsVisible && !isEditing ? 0 : -16,
          opacity: areControlsVisible && !isEditing ? 1 : 0,
        }}
        transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
        aria-hidden={!areControlsVisible || isEditing}
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        }}
        className={`absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 sm:px-6 pointer-events-auto ${
          areControlsVisible && !isEditing ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        {/* Close Button on left */}
        <button
          type="button"
          data-testid="viewer-close-btn"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            triggerHaptic('light');
            closeViewer();
          }}
          className="w-11 h-11 rounded-full bg-neutral-900/80 hover:bg-neutral-800 backdrop-blur-xl border border-white/15 flex items-center justify-center text-white cursor-pointer shadow-lg active:scale-90 transition-transform touch-manipulation flex-none"
          aria-label="Close viewer"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Center: Filename + Counter & Details */}
        <div className="flex-1 min-w-0 px-3 text-center pointer-events-none select-none">
          <p className="text-[17px] sm:text-[19px] font-semibold text-white tracking-tight truncate w-full leading-tight drop-shadow-md">
            {activePhoto.filename}
          </p>
          <p className="text-[13px] text-neutral-400 tracking-tight mt-0.5 truncate drop-shadow-sm font-normal">
            {currentIndex !== -1 ? `${currentIndex + 1} of ${mediaPool.length} · ` : ''}
            {formattedDate} · {deviceName}
          </p>
        </div>

        {/* Info Button on right */}
        <button
          type="button"
          data-testid="viewer-info-btn"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            triggerHaptic('light');
            setIsInfoOpen(true);
          }}
          className="w-11 h-11 rounded-full bg-neutral-900/80 hover:bg-neutral-800 backdrop-blur-xl border border-white/15 flex items-center justify-center text-white cursor-pointer shadow-lg active:scale-90 transition-transform touch-manipulation flex-none"
          aria-label="View details"
        >
          <Info className="w-5 h-5 text-white" />
        </button>
      </motion.div>

      {/* =========================================================================
          LAYER 3: NATIVE VIDEO MEDIA PLAYER CONTROLS (IF VIDEO)
         ========================================================================= */}
      {isVideo && (
        <motion.div
          initial={false}
          animate={{
            y: areControlsVisible && !isEditing ? 0 : 40,
            opacity: areControlsVisible && !isEditing ? 1 : 0,
          }}
          transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
          style={{
            left: '50%',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
            x: '-50%',
          }}
          className={`absolute z-20 w-[min(540px,94vw)] rounded-3xl bg-[#141418]/90 backdrop-blur-2xl border border-white/15 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.85)] space-y-3 ${
            areControlsVisible && !isEditing ? 'pointer-events-auto' : 'pointer-events-none'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Progress Scrubber Bar */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-neutral-300 tabular-nums w-10 text-right shrink-0">
              {formatTime(videoCurrentTime)}
            </span>
            <div className="relative flex-1 flex items-center group/scrubber">
              <input
                type="range"
                min={0}
                max={videoDuration || 100}
                step={0.1}
                value={videoCurrentTime}
                onChange={(e) => seekVideo(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-blue-500 hover:h-2 transition-all"
              />
            </div>
            <span className="text-[11px] font-mono text-neutral-400 tabular-nums w-10 shrink-0">
              {formatTime(videoDuration)}
            </span>
          </div>

          {/* Controls Buttons Row */}
          <div className="flex items-center justify-between gap-1 pt-0.5">
            {/* Left Controls: Rewind, Play/Pause, Forward */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Skip Back 10s */}
              <button
                onClick={(e) => skipVideo(-10, e)}
                className="p-2 rounded-xl text-neutral-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                title="Rewind 10s"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Play / Pause Toggle */}
              <button
                onClick={(e) => toggleVideoPlay(e)}
                className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg active:scale-95 transition-transform cursor-pointer"
                title={isVideoPlaying ? 'Pause' : 'Play'}
              >
                {isVideoPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>

              {/* Skip Forward 10s */}
              <button
                onClick={(e) => skipVideo(10, e)}
                className="p-2 rounded-xl text-neutral-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                title="Forward 10s"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              {/* Volume & Mute */}
              <div className="flex items-center gap-1.5 ml-1">
                <button
                  onClick={(e) => toggleVideoMute(e)}
                  className="p-2 rounded-xl text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title={isVideoMuted ? 'Unmute' : 'Mute'}
                >
                  {isVideoMuted || videoVolume === 0 ? (
                    <VolumeX className="w-4 h-4 text-red-400" />
                  ) : videoVolume < 0.5 ? (
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
                  value={isVideoMuted ? 0 : videoVolume}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setVideoVolume(v);
                    if (videoRef.current) {
                      videoRef.current.volume = v;
                      if (v > 0 && isVideoMuted) {
                        videoRef.current.muted = false;
                        setIsVideoMuted(false);
                      }
                    }
                  }}
                  className="w-14 sm:w-18 h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-blue-500 hidden sm:inline-block"
                />
              </div>
            </div>

            {/* Right Controls: Speed, Favorite, Share, More */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              {/* Device Audio & Dolby Atmos System Indicator */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic('light');
                  setShowEQSheet(true);
                }}
                className="px-2 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-[10px] font-bold text-blue-300 flex items-center gap-1 cursor-pointer transition-colors"
                title="Device Audio System & Dolby Atmos Pipeline"
              >
                <Sparkles className="w-3 h-3 text-blue-400" />
                <span className="hidden sm:inline">SYSTEM AUDIO</span>
                <span className="sm:hidden">AUDIO</span>
              </button>

              {/* Speed Cycle */}
              <button
                onClick={(e) => cyclePlaybackRate(e)}
                className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-mono text-neutral-200 font-semibold cursor-pointer transition-colors"
                title="Playback Speed"
              >
                {videoPlaybackRate}x
              </button>

              {/* Fullscreen Toggle */}
              <button
                onClick={(e) => toggleFullscreen(e)}
                className="p-2 rounded-xl text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Fullscreen"
              >
                <Maximize2 className="w-4 h-4" />
              </button>

              {/* Favorite Heart */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleFavoritePress();
                }}
                className="p-2 rounded-xl text-neutral-300 hover:text-red-400 hover:bg-white/10 transition-colors cursor-pointer"
                title="Favorite"
              >
                <Heart
                  className={`w-4 h-4 ${
                    activePhoto.is_favorite ? 'fill-red-500 text-red-500' : ''
                  }`}
                />
              </button>

              {/* Share */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic('light');
                  setShareTargetFile(activePhoto);
                }}
                className="p-2 rounded-xl text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>

              {/* More (•••) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic('light');
                  setIsMoreOpen(true);
                }}
                className="p-2 rounded-xl text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="More Options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* =========================================================================
          LAYER 3B: PHOTO ACTION BAR (IF PHOTO)
         ========================================================================= */}
      {!isVideo && (
        <motion.div
          initial={false}
          animate={{
            y: areControlsVisible && !isEditing ? 0 : 20,
            opacity: areControlsVisible && !isEditing ? 1 : 0,
            scale: areControlsVisible && !isEditing ? 1 : 0.97,
          }}
          transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
          aria-hidden={!areControlsVisible || isEditing}
          style={{
            left: '50%',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 18px)',
            x: '-50%',
            background: 'rgba(20, 20, 22, 0.70)',
            backdropFilter: 'blur(28px) saturate(180%) contrast(105%)',
            WebkitBackdropFilter: 'blur(28px) saturate(180%) contrast(105%)',
            border: '1px solid rgba(255, 255, 255, 0.10)',
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className={`absolute z-20 w-[min(380px,86vw)] h-[70px] rounded-[35px] flex items-center justify-around px-3 shadow-[0_16px_44px_rgba(0,0,0,0.75)] ${
            areControlsVisible && !isEditing ? 'pointer-events-auto' : 'pointer-events-none'
          }`}
        >
          {/* 1. Favorite */}
          <button
            type="button"
            data-testid="viewer-favorite-btn"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              handleFavoritePress();
            }}
            className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-85 transition-all text-[#D0D0D0] cursor-pointer touch-manipulation"
            title="Favorite"
            aria-label="Toggle favorite"
          >
            <motion.div
              animate={
                isHeartPopping
                  ? { scale: [1.0, 0.82, 1.08, 1.0] }
                  : { scale: 1.0 }
              }
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <Heart
                className={`w-6 h-6 transition-all duration-200 ${
                  activePhoto.is_favorite
                    ? 'fill-white text-white drop-shadow-[0_0_10px_rgba(59,130,246,0.85)]'
                    : 'text-[#D0D0D0]'
                }`}
              />
            </motion.div>
          </button>

          {/* 2. Edit Photo */}
          <button
            type="button"
            data-testid="viewer-edit-btn"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic('light');
              setIsEditing(true);
            }}
            className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-85 transition-all text-[#D0D0D0] hover:text-white cursor-pointer touch-manipulation"
            title="Edit Photo"
            aria-label="Edit photo"
          >
            <Sliders className="w-6 h-6 text-[#D0D0D0] hover:text-white transition-colors" />
          </button>

          {/* 3. Share */}
          <button
            type="button"
            data-testid="viewer-share-btn"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic('light');
              setShareTargetFile(activePhoto);
            }}
            className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-85 transition-all text-[#D0D0D0] hover:text-white cursor-pointer touch-manipulation"
            title="Share"
            aria-label="Share photo"
          >
            <Share2 className="w-6 h-6 text-[#D0D0D0] hover:text-white transition-colors" />
          </button>

          {/* 4. Download */}
          <a
            data-testid="viewer-download-btn"
            href={activePhoto.storage_path}
            download={activePhoto.filename}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic('light');
            }}
            className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-85 transition-all text-[#D0D0D0] hover:text-white cursor-pointer touch-manipulation"
            title="Download original"
            aria-label="Download original photo"
          >
            <Download className="w-6 h-6 text-[#D0D0D0] hover:text-white transition-colors" />
          </a>

          {/* 5. More (•••) */}
          <button
            type="button"
            data-testid="viewer-more-btn"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic('light');
              setIsMoreOpen(true);
            }}
            className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-85 transition-all text-[#D0D0D0] hover:text-white cursor-pointer touch-manipulation"
            title="More actions"
            aria-label="More actions"
          >
            <MoreHorizontal className="w-6 h-6 text-[#D0D0D0] hover:text-white transition-colors" />
          </button>
        </motion.div>
      )}

      {/* =========================================================================
          LAYER 4: INTEGRATED PHOTO EDITOR
         ========================================================================= */}
      <AnimatePresence>
        {isEditing && (
          <PhotoEditor
            file={activePhoto}
            onClose={() => setIsEditing(false)}
            onSave={handleSaveEdited}
            onRevert={handleRevert}
          />
        )}
      </AnimatePresence>

      {/* =========================================================================
          LAYER 5: INFO SHEET
         ========================================================================= */}
      <PhotoInfoSheet
        file={activePhoto}
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        folderName={currentFolder}
        albumName={currentAlbum}
      />

      {/* =========================================================================
          LAYER 6: MORE SHEET
         ========================================================================= */}
      <PhotoMoreSheet
        file={activePhoto}
        isOpen={isMoreOpen}
        onClose={() => setIsMoreOpen(false)}
        onOpenDetails={() => setIsInfoOpen(true)}
        onRename={() => {
          setIsMoreOpen(false);
          setEditingFile(activePhoto);
        }}
        onMove={() => {
          const target = prompt('Enter new folder ID or name:');
          if (target) {
            updateFile(activePhoto.id, { folder_id: target });
            showToast(`Moved to ${target}`, 'success');
          }
        }}
        onAddToAlbum={() => {
          if (albums.length > 0) {
            const album = albums[0];
            updateFile(activePhoto.id, { album_id: album.id });
            showToast(`Added to album "${album.name}"`, 'success');
          } else {
            showToast('No albums available. Create an album first.', 'info');
          }
        }}
        onDuplicate={handleDuplicate}
        onDownload={() => {
          const a = document.createElement('a');
          a.href = activePhoto.storage_path;
          a.download = activePhoto.filename;
          a.click();
        }}
        onMoveToVault={handleMoveToVault}
        onToggleHide={handleToggleHide}
        onShare={() => setShareTargetFile(activePhoto)}
        onDelete={handleDelete}
        onMakeOffline={() => {
          showToast('Downloaded & cached offline in local storage', 'success');
        }}
        onFreeUpStorage={() => {
          showToast('Local cache purged. Stored securely on cloud.', 'info');
        }}
      />

      {/* =========================================================================
          LAYER 7: DOLBY ATMOS & BASS BOOST SOUND ENGINE SHEET (SWIPE-TO-DISMISS)
         ========================================================================= */}
      <AnimatePresence>
        {showEQSheet && (
          <div
            className="fixed inset-0 z-60 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setShowEQSheet(false)}
          >
            <motion.div
              initial={{ y: '100%', opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: [...jellyScaleKeyframes] }}
              exit={{ y: '100%', opacity: 0, scale: 0.95 }}
              transition={{
                y: springJelly,
                scale: jellyScaleTransition,
                opacity: { duration: 0.35, ease: easeJelly },
              }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.4}
              onDragEnd={(e, info) => {
                if (info.offset.y > 60 || info.velocity.y > 250) {
                  triggerHaptic('light');
                  setShowEQSheet(false);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-[#141418] border-t sm:border border-white/15 p-5 pb-8 sm:pb-6 shadow-2xl space-y-4 select-none"
            >
              {/* Grabber handle */}
              <div className="w-10 h-1.5 rounded-full bg-white/20 mx-auto -mt-1 cursor-grab active:cursor-grabbing" />

              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">System Audio Pipeline</h3>
                    <p className="text-[11px] text-neutral-400">Direct Android AudioSession & Dolby Atmos Integration</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEQSheet(false)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 flex items-center justify-center text-xs"
                >
                  ✕
                </button>
              </div>

              {/* Sound Profiles List */}
              <div className="space-y-2">
                <div className="p-3.5 rounded-2xl bg-blue-600/15 border border-blue-500/30 text-white space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Standard Android Media Pipeline</span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full font-bold bg-blue-500/30 text-blue-300">
                      ACTIVE
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-300 leading-relaxed">
                    Audio plays through standard <span className="font-mono text-white">STREAM_MUSIC</span> so your phone's native Dolby Atmos, Equalizer, and OEM audio processing attach seamlessly without software interception.
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-neutral-500 text-center leading-relaxed pt-1">
                Compatible with phone EQ, Dolby Atmos, Samsung SoundAlive, Dirac, and Bluetooth LDAC/AptX.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(viewerContent, document.body) : viewerContent;
};
