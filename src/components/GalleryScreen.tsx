import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import {
  MoreHorizontal,
  Check,
  Film,
  Heart,
  Share2,
  Lock,
  Trash2,
  X,
  Download,
  FolderInput,
} from 'lucide-react';
import { useCloud } from '../context/CloudContext';
import { useScrollContainer } from '../context/ScrollContext';
import { CloudFile, FilterType, SortOption, GridZoomLevel } from '../types/cloud';
import {
  spring,
  springSnappy,
  springBouncy,
  jellyScaleKeyframes,
  jellyScaleTransition,
  easeJelly,
} from '../motion';
import { Glass } from './Glass';
import { PopoverMenu, PopoverMenuItem, PopoverDivider, PopoverSectionTitle } from './PopoverMenu';

export const GalleryScreen: React.FC = () => {
  const {
    files,
    activeAlbum,
    setActiveAlbum,
    activeFilter,
    setActiveFilter,
    sortOption,
    setSortOption,
    gridZoom,
    setGridZoom,
    openViewer,
    setShareTargetFile,
    isSelectMode,
    setIsSelectMode,
    selectedIds,
    toggleSelectId,
    selectAll,
    clearSelection,
    batchMoveToVault,
    batchDelete,
    triggerHaptic,
    showToast,
  } = useCloud();

  const { galleryScrollRef } = useScrollContainer();
  const { scrollY } = useScroll({ container: galleryScrollRef });
  const titleScale = useTransform(scrollY, [0, 50], [1, 0.94]);
  const titleOpacity = useTransform(scrollY, [0, 50], [1, 0.85]);

  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<boolean>(false);
  const [isBatchDeleteDialogOpen, setIsBatchDeleteDialogOpen] = useState<boolean>(false);
  const moreBtnRef = useRef<HTMLButtonElement>(null);

  // Pinch-to-zoom columns
  const pinchStartDistanceRef = useRef<number | null>(null);
  const pinchCurrentZoomRef = useRef<GridZoomLevel>(gridZoom);
  pinchCurrentZoomRef.current = gridZoom;

  // Drag-to-Select State Refs
  const isPointerDownRef = useRef<boolean>(false);
  const pointerStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const dragSelectionModeRef = useRef<'idle' | 'selecting' | 'scrolling'>('idle');
  const initialTouchSelectedStateRef = useRef<boolean>(true);
  const dragStartIndexRef = useRef<number>(-1);
  const lastHitIndexRef = useRef<number>(-1);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoScrollRafRef = useRef<number | null>(null);
  const pointerCurrentYRef = useRef<number>(0);

  // Gallery files filtering & sorting
  let galleryFiles = files.filter(
    (f) => !f.is_vault && (f.mime_type.startsWith('image/') || f.mime_type.startsWith('video/'))
  );

  if (activeAlbum) {
    galleryFiles = galleryFiles.filter((f) => activeAlbum.file_ids.includes(f.id));
  } else if (activeFilter === 'photos') {
    galleryFiles = galleryFiles.filter((f) => f.mime_type.startsWith('image/'));
  } else if (activeFilter === 'videos') {
    galleryFiles = galleryFiles.filter((f) => f.mime_type.startsWith('video/'));
  } else if (activeFilter === 'favorites') {
    galleryFiles = galleryFiles.filter((f) => f.is_favorite);
  }

  if (sortOption === 'oldest') {
    galleryFiles.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  } else if (sortOption === 'name-asc') {
    galleryFiles.sort((a, b) => a.filename.localeCompare(b.filename));
  } else if (sortOption === 'name-desc') {
    galleryFiles.sort((a, b) => b.filename.localeCompare(a.filename));
  } else if (sortOption === 'largest') {
    galleryFiles.sort((a, b) => b.size - a.size);
  } else {
    galleryFiles.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // Group by timeline
  const groupedTimeline = galleryFiles.reduce<Record<string, CloudFile[]>>((acc, file) => {
    const d = new Date(file.created_at);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const isYesterday =
      new Date(now.setDate(now.getDate() - 1)).toDateString() === d.toDateString();

    let title = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (isToday) title = 'Today';
    else if (isYesterday) title = 'Yesterday';

    if (!acc[title]) acc[title] = [];
    acc[title].push(file);
    return acc;
  }, {});

  // Two-pointer pinch column zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchStartDistanceRef.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDistanceRef.current !== null) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = currentDist / pinchStartDistanceRef.current;

      if (ratio > 1.25) {
        if (pinchCurrentZoomRef.current > 2) {
          triggerHaptic('light');
          setGridZoom((pinchCurrentZoomRef.current - 1) as GridZoomLevel);
          pinchStartDistanceRef.current = currentDist;
        }
      } else if (ratio < 0.8) {
        if (pinchCurrentZoomRef.current < 5) {
          triggerHaptic('light');
          setGridZoom((pinchCurrentZoomRef.current + 1) as GridZoomLevel);
          pinchStartDistanceRef.current = currentDist;
        }
      }
    }
  };

  const handleTouchEnd = () => {
    pinchStartDistanceRef.current = null;
  };

  // Helper for grid column classes
  const getGridColsClass = () => {
    switch (gridZoom) {
      case 2:
        return 'grid-cols-2';
      case 4:
        return 'grid-cols-4';
      case 5:
        return 'grid-cols-5';
      case 3:
      default:
        return 'grid-cols-3';
    }
  };

  // Drag-to-Select Logic
  const startAutoScroll = useCallback(() => {
    if (autoScrollRafRef.current) return;

    const scrollLoop = () => {
      const y = pointerCurrentYRef.current;
      const topThreshold = 90;
      const bottomThreshold = window.innerHeight - 90;

      const container = galleryScrollRef.current;
      if (y < topThreshold && y > 0) {
        const speed = Math.min(14, (topThreshold - y) / 4);
        if (container) container.scrollBy(0, -speed);
        else window.scrollBy(0, -speed);
      } else if (y > bottomThreshold && y < window.innerHeight) {
        const speed = Math.min(14, (y - bottomThreshold) / 4);
        if (container) container.scrollBy(0, speed);
        else window.scrollBy(0, speed);
      }

      autoScrollRafRef.current = requestAnimationFrame(scrollLoop);
    };

    autoScrollRafRef.current = requestAnimationFrame(scrollLoop);
  }, []);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollRafRef.current) {
      cancelAnimationFrame(autoScrollRafRef.current);
      autoScrollRafRef.current = null;
    }
  }, []);

  // Update selection range between startIndex and currIndex
  const applyRangeSelection = useCallback(
    (startIndex: number, endIndex: number, shouldSelect: boolean) => {
      const minIdx = Math.min(startIndex, endIndex);
      const maxIdx = Math.max(startIndex, endIndex);
      const rangeSlice = galleryFiles.slice(minIdx, maxIdx + 1);

      rangeSlice.forEach((file) => {
        const isCurrently = selectedIds.includes(file.id);
        if (shouldSelect && !isCurrently) {
          toggleSelectId(file.id);
        } else if (!shouldSelect && isCurrently) {
          toggleSelectId(file.id);
        }
      });
      triggerHaptic('light');
    },
    [galleryFiles, selectedIds, toggleSelectId, triggerHaptic]
  );

  // Pointer event handlers for grid cells
  const handleCellPointerDown = (index: number, file: CloudFile, e: React.PointerEvent) => {
    isPointerDownRef.current = true;
    pointerStartPosRef.current = { x: e.clientX, y: e.clientY };
    pointerCurrentYRef.current = e.clientY;
    dragStartIndexRef.current = index;
    lastHitIndexRef.current = index;
    dragSelectionModeRef.current = 'idle';

    const alreadySelected = selectedIds.includes(file.id);
    initialTouchSelectedStateRef.current = !alreadySelected;

    if (!isSelectMode) {
      // Long press 350ms to enter Select Mode
      longPressTimerRef.current = setTimeout(() => {
        triggerHaptic('medium');
        setIsSelectMode(true);
        toggleSelectId(file.id);
        dragSelectionModeRef.current = 'selecting';
        initialTouchSelectedStateRef.current = true;
        startAutoScroll();
      }, 350);
    } else {
      // Already in select mode, tap toggles or begins drag
      dragSelectionModeRef.current = 'selecting';
      startAutoScroll();
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    pointerCurrentYRef.current = e.clientY;

    if (!isPointerDownRef.current || !pointerStartPosRef.current) return;

    const dx = e.clientX - pointerStartPosRef.current.x;
    const dy = e.clientY - pointerStartPosRef.current.y;

    // Check direction rule on gesture initiation
    if (dragSelectionModeRef.current === 'idle') {
      if (Math.hypot(dx, dy) > 8) {
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

        if (isSelectMode && Math.abs(dx) > Math.abs(dy)) {
          // Horizontal drag: lock scrolling & activate selection
          dragSelectionModeRef.current = 'selecting';
          startAutoScroll();
        } else {
          dragSelectionModeRef.current = 'scrolling';
          return;
        }
      }
    }

    if (dragSelectionModeRef.current === 'selecting') {
      // Hit test target cell under pointer
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-file-index]');
      if (el) {
        const hitIdx = Number(el.getAttribute('data-file-index'));
        if (!isNaN(hitIdx) && hitIdx !== lastHitIndexRef.current) {
          lastHitIndexRef.current = hitIdx;
          applyRangeSelection(
            dragStartIndexRef.current,
            hitIdx,
            initialTouchSelectedStateRef.current
          );
        }
      }
    }
  };

  const handlePointerUp = () => {
    isPointerDownRef.current = false;
    pointerStartPosRef.current = null;
    dragSelectionModeRef.current = 'idle';
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    stopAutoScroll();
  };

  // Toggle selection for all items in a specific date group
  const handleToggleGroup = (groupFiles: CloudFile[]) => {
    triggerHaptic('light');
    const groupIds = groupFiles.map((f) => f.id);
    const allSelected = groupIds.every((id) => selectedIds.includes(id));

    if (allSelected) {
      groupIds.forEach((id) => {
        if (selectedIds.includes(id)) toggleSelectId(id);
      });
    } else {
      if (!isSelectMode) setIsSelectMode(true);
      groupIds.forEach((id) => {
        if (!selectedIds.includes(id)) toggleSelectId(id);
      });
    }
  };

  const filterChips: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'photos', label: 'Photos' },
    { id: 'videos', label: 'Videos' },
    { id: 'favorites', label: 'Favorites' },
  ];

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="space-y-4 pb-4 select-none"
    >
      {/* 1. Header (Normal mode vs Select Mode) */}
      <section className="flex items-center justify-between min-h-[44px]">
        {isSelectMode ? (
          <div className="w-full flex items-center justify-between">
            <button
              onClick={() => {
                triggerHaptic('light');
                clearSelection();
                setIsSelectMode(false);
              }}
              className="text-[16px] font-medium text-[#3B82F6] hover:opacity-80 cursor-pointer"
            >
              Cancel
            </button>

            <span className="text-[17px] font-semibold text-white tracking-tight">
              {selectedIds.length} Selected
            </span>

            <button
              onClick={() => {
                triggerHaptic('light');
                if (selectedIds.length === galleryFiles.length) {
                  clearSelection();
                } else {
                  selectAll();
                }
              }}
              className="text-[16px] font-medium text-[#3B82F6] hover:opacity-80 cursor-pointer"
            >
              {selectedIds.length === galleryFiles.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        ) : (
          <>
            <motion.div style={{ scale: titleScale, opacity: titleOpacity, transformOrigin: 'left top' }}>
              <h1 className="text-[34px] font-bold tracking-tight text-white leading-none">
                Gallery
              </h1>
              {activeAlbum && (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-xs text-[#3B82F6] font-medium">Album: {activeAlbum.name}</span>
                  <button
                    onClick={() => setActiveAlbum(null)}
                    className="text-xs text-[#A1A1A1] hover:text-white"
                  >
                    (Clear)
                  </button>
                </div>
              )}
            </motion.div>

            {/* Header Actions Menu ("...") - Fixed 44x44 Slot */}
            <div className="w-11 h-11 flex-none flex items-center justify-end">
              <motion.button
                ref={moreBtnRef}
                onClick={() => {
                  triggerHaptic('light');
                  setIsMoreMenuOpen((v) => !v);
                }}
                whileTap={{ scale: 0.94 }}
                transition={springSnappy}
                className="w-9 h-9 rounded-full liquid-glass-base flex items-center justify-center text-white cursor-pointer hover:border-white/25 transition-colors"
                aria-label="More options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </motion.button>
            </div>
          </>
        )}
      </section>

      {/* Gallery "..." Popover Menu via Portal (No layout shifts) */}
      <PopoverMenu
        isOpen={isMoreMenuOpen}
        onClose={() => setIsMoreMenuOpen(false)}
        triggerRef={moreBtnRef}
        width={260}
      >
        {/* 1. Select Section */}
        <PopoverMenuItem
          onClick={() => {
            triggerHaptic('light');
            setIsMoreMenuOpen(false);
            setIsSelectMode(true);
          }}
          icon={Check}
          label="Select"
        />

        <PopoverDivider />

        {/* 2. View Section: 2, 3, 4, 5 Segmented Control with spring thumb */}
        <PopoverSectionTitle>View Columns</PopoverSectionTitle>
        <div className="mx-3 my-1.5 p-1 rounded-xl bg-black/40 border border-white/10 grid grid-cols-4 gap-1 relative">
          {[2, 3, 4, 5].map((cols) => {
            const isActive = gridZoom === cols;
            return (
              <button
                key={cols}
                onClick={() => {
                  triggerHaptic('light');
                  setGridZoom(cols as GridZoomLevel);
                  setTimeout(() => setIsMoreMenuOpen(false), 150);
                }}
                className="relative h-8 rounded-lg flex items-center justify-center text-xs font-semibold text-white focus:outline-none cursor-pointer"
              >
                {isActive && (
                  <motion.div
                    layoutId="galleryGridColsThumb"
                    transition={spring}
                    className="absolute inset-0 bg-white/20 rounded-lg shadow-sm border border-white/20"
                  />
                )}
                <span className="relative z-10 tabular-nums">{cols}</span>
              </button>
            );
          })}
        </div>

        <PopoverDivider />

        {/* 3. Sort Section */}
        <PopoverSectionTitle>Sort By</PopoverSectionTitle>
        {[
          { id: 'newest', label: 'Newest' },
          { id: 'oldest', label: 'Oldest' },
          { id: 'name-asc', label: 'Name' },
          { id: 'largest', label: 'Largest' },
        ].map((opt) => (
          <PopoverMenuItem
            key={opt.id}
            onClick={() => {
              triggerHaptic('light');
              setSortOption(opt.id as SortOption);
              setTimeout(() => setIsMoreMenuOpen(false), 150);
            }}
            label={opt.label}
            rightElement={
              sortOption === opt.id ? (
                <Check className="w-4 h-4 text-white stroke-[2.5]" />
              ) : null
            }
          />
        ))}
      </PopoverMenu>

      {/* 2. Filter Pills */}
      {!isSelectMode && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {filterChips.map((chip) => {
            const isSelected = activeFilter === chip.id && !activeAlbum;
            return (
              <motion.button
                key={chip.id}
                onClick={() => {
                  triggerHaptic('light');
                  setActiveFilter(chip.id);
                  if (activeAlbum) setActiveAlbum(null);
                }}
                whileTap={{ scale: 0.94 }}
                transition={springSnappy}
                className="relative h-[34px] px-4 rounded-full text-[13px] font-medium tracking-tight whitespace-nowrap cursor-pointer shrink-0 flex items-center justify-center"
              >
                {isSelected ? (
                  <motion.div
                    layoutId="galleryFilterActive"
                    transition={springBouncy}
                    className="absolute inset-0 bg-white rounded-full shadow-md"
                  />
                ) : (
                  <div className="absolute inset-0 bg-[#1C1C1E] rounded-full" />
                )}
                <span
                  className={`relative z-10 transition-colors duration-150 ${
                    isSelected ? 'text-black font-semibold' : 'text-[#A1A1A1] hover:text-white'
                  }`}
                >
                  {chip.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* 3. Sticky Date Headers & Photos Grid */}
      {Object.keys(groupedTimeline).length > 0 ? (
        <div className="space-y-4">
          {Object.entries(groupedTimeline).map(([groupTitle, groupItems]) => {
            const isGroupFullySelected =
              groupItems.length > 0 &&
              groupItems.every((item) => selectedIds.includes(item.id));

            return (
              <div key={groupTitle} className="space-y-1">
                {/* Sticky Date Header with Select Day button */}
                <div className="sticky top-14 z-20 liquid-glass-lite h-10 px-2 flex items-center justify-between">
                  <span className="text-[16px] font-semibold text-white tracking-tight">
                    {groupTitle}
                  </span>

                  {isSelectMode && (
                    <button
                      onClick={() => handleToggleGroup(groupItems)}
                      className="text-xs font-semibold text-[#3B82F6] hover:opacity-80 cursor-pointer"
                    >
                      {isGroupFullySelected ? 'Deselect Day' : 'Select'}
                    </button>
                  )}
                </div>

                {/* Photo Wall (2px gap) */}
                <motion.div
                  layout
                  transition={spring}
                  className={`grid ${getGridColsClass()} gap-[2px] bg-black`}
                >
                  {groupItems.map((file) => {
                    const globalIndex = galleryFiles.findIndex((f) => f.id === file.id);
                    const isVideo = file.mime_type.startsWith('video/');
                    const isSelected = selectedIds.includes(file.id);

                    return (
                      <motion.div
                        key={file.id}
                        data-file-id={file.id}
                        data-file-index={globalIndex}
                        layout
                        layoutId={`media-${file.id}`}
                        transition={spring}
                        onPointerDown={(e) => handleCellPointerDown(globalIndex, file, e)}
                        onClick={() => {
                          if (isSelectMode) {
                            triggerHaptic('light');
                            toggleSelectId(file.id);
                          } else {
                            openViewer(file);
                          }
                        }}
                        whileTap={{ scale: 0.97 }}
                        className={`relative aspect-square overflow-hidden bg-[#141414] cursor-pointer ${
                          gridZoom === 2 ? 'rounded-[6px]' : 'rounded-none'
                        }`}
                      >
                        {/* Cell image / video thumbnail scales 1 -> 0.92 when selected */}
                        {isVideo && !file.thumbnail_url ? (
                          <motion.video
                            animate={{ scale: isSelected ? 0.92 : 1 }}
                            transition={springSnappy}
                            src={file.storage_path}
                            preload="metadata"
                            muted
                            playsInline
                            className="w-full h-full object-cover pointer-events-none"
                          />
                        ) : (
                          <motion.img
                            animate={{ scale: isSelected ? 0.92 : 1 }}
                            transition={springSnappy}
                            src={file.thumbnail_url || file.storage_path}
                            alt={file.filename}
                            className="w-full h-full object-cover pointer-events-none"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                          />
                        )}

                        {/* Video Duration (bottom-right glass chip 11px) */}
                        {isVideo && !isSelected && (
                          <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-[4px] liquid-glass-lite text-[11px] font-medium text-white flex items-center gap-1">
                            <Film className="w-2.5 h-2.5" />
                            <span className="tabular-nums">{file.duration ? `${file.duration}s` : '0:38'}</span>
                          </div>
                        )}

                        {/* Check Circle (22px, blue #3B82F6, pops in 0 -> 1 with springSnappy) */}
                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                              transition={springSnappy}
                              className="absolute top-2 right-2 w-[22px] h-[22px] rounded-full bg-[#3B82F6] flex items-center justify-center shadow-lg border border-white/40 z-10"
                            >
                              <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[20px] bg-[#141414] p-12 text-center text-sm text-[#A1A1A1]">
          No photos or videos found.
        </div>
      )}

      {/* 4. Selection Glass Action Bar (Rendered via Portal, Centered with Framer x: -50%) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isSelectMode && (
              <motion.div
                initial={{ y: 140, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 140, opacity: 0 }}
                transition={spring}
                style={{
                  position: 'fixed',
                  left: '50%',
                  bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
                  x: '-50%',
                  zIndex: 110,
                }}
                className="w-[min(360px,calc(100vw-40px))] h-16 rounded-[32px] liquid-glass-base flex items-center justify-around px-3 shadow-2xl pointer-events-auto"
              >
                {/* Download */}
                <motion.button
                  disabled={selectedIds.length === 0}
                  onClick={() => {
                    triggerHaptic('light');
                    showToast(`Downloading ${selectedIds.length} items`, 'info');
                  }}
                  whileTap={{ scale: 0.92 }}
                  transition={springSnappy}
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white disabled:opacity-40 cursor-pointer"
                  title="Download selected"
                >
                  <Download className="w-5 h-5" />
                </motion.button>

                {/* Share */}
                <motion.button
                  disabled={selectedIds.length === 0}
                  onClick={() => {
                    triggerHaptic('light');
                    const first = files.find((f) => f.id === selectedIds[0]);
                    if (first) setShareTargetFile(first);
                  }}
                  whileTap={{ scale: 0.92 }}
                  transition={springSnappy}
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white disabled:opacity-40 cursor-pointer"
                  title="Share selected"
                >
                  <Share2 className="w-5 h-5" />
                </motion.button>

                {/* Move to Vault */}
                <motion.button
                  disabled={selectedIds.length === 0}
                  onClick={() => {
                    triggerHaptic('light');
                    batchMoveToVault(selectedIds);
                  }}
                  whileTap={{ scale: 0.92 }}
                  transition={springSnappy}
                  className="w-11 h-11 rounded-full flex items-center justify-center text-amber-400 disabled:opacity-40 cursor-pointer"
                  title="Move to Private Vault"
                >
                  <Lock className="w-5 h-5" />
                </motion.button>

                {/* Delete (Opens Confirm Dialog) */}
                <motion.button
                  disabled={selectedIds.length === 0}
                  onClick={() => {
                    triggerHaptic('medium');
                    setIsBatchDeleteDialogOpen(true);
                  }}
                  whileTap={{ scale: 0.92 }}
                  transition={springSnappy}
                  className="w-11 h-11 rounded-full flex items-center justify-center text-[#EF4444] disabled:opacity-40 cursor-pointer"
                  title="Move to Trash"
                >
                  <Trash2 className="w-5 h-5" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* Delete Confirmation Glass Dialog */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isBatchDeleteDialogOpen && (
              <div
                onClick={() => setIsBatchDeleteDialogOpen(false)}
                className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: [...jellyScaleKeyframes], opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  transition={{
                    scale: jellyScaleTransition,
                    opacity: { duration: 0.35, ease: easeJelly },
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-sm rounded-[24px] liquid-glass-base p-5 space-y-4 text-center shadow-2xl"
                >
                  <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-500 mx-auto flex items-center justify-center">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      Delete {selectedIds.length} {selectedIds.length === 1 ? 'item' : 'items'}?
                    </h3>
                    <p className="text-xs text-[#A1A1A1] mt-1">
                      These items will be moved to Trash and can be restored anytime within 30 days.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => setIsBatchDeleteDialogOpen(false)}
                      className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white bg-white/10 hover:bg-white/15 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        setIsBatchDeleteDialogOpen(false);
                        batchDelete(selectedIds);
                      }}
                      className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#EF4444] hover:bg-red-600 cursor-pointer"
                    >
                      Move to Trash
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};
