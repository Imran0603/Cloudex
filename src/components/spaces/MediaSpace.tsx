import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Search,
  Film,
  Image as ImageIcon,
  Play,
  Heart,
  Share2,
  MoreHorizontal,
  LayoutGrid,
  Grid3X3,
  X,
  ArrowUpDown,
  Check,
  Edit2,
  Info,
  Shield,
  Trash2,
  Download,
  Plus,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useCloud } from '../../context/CloudContext';
import { CloudFile, AlbumItem } from '../../types/cloud';
import { SafeImage } from '../SafeImage';
import { Glass } from '../Glass';
import {
  springRelaxed,
  springSquishy,
  springSnappy,
  springGlass,
  jellyScaleKeyframes,
  jellyScaleTransition,
  easeJelly,
  tapCard,
  tapPress,
} from '../../motion';

interface MediaSpaceProps {
  onBack: () => void;
}

export type MediaFilterType = 'all' | 'photos' | 'videos' | 'favorites' | '4k';

export const MediaSpace: React.FC<MediaSpaceProps> = ({ onBack }) => {
  const {
    files,
    albums,
    openViewer,
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

  const [activeFilter, setActiveFilter] = useState<MediaFilterType>('all');
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchActive, setIsSearchActive] = useState<boolean>(false);
  const [gridColumns, setGridColumns] = useState<2 | 3>(3);
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size' | 'duration'>('date');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState<boolean>(false);
  const [activeActionFile, setActiveActionFile] = useState<CloudFile | null>(null);

  // Multi-Selection State
  const [isSelectMode, setIsSelectMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Combined Media Files: Photos and Videos
  const mediaFiles = useMemo(() => {
    return files.filter(
      (f) =>
        !f.is_deleted &&
        !f.is_vault &&
        (f.mime_type.startsWith('image/') ||
          f.mime_type.startsWith('video/') ||
          ['jpg', 'jpeg', 'png', 'webp', 'heic', 'mp4', 'mov', 'webm'].includes(
            f.extension.toLowerCase()
          ))
    );
  }, [files]);

  // Photo / Video Counts
  const photoCount = useMemo(
    () => mediaFiles.filter((f) => f.mime_type.startsWith('image/')).length,
    [mediaFiles]
  );
  const videoCount = useMemo(
    () => mediaFiles.filter((f) => f.mime_type.startsWith('video/')).length,
    [mediaFiles]
  );
  const favoriteCount = useMemo(
    () => mediaFiles.filter((f) => f.is_favorite).length,
    [mediaFiles]
  );

  // Filtered & Searched Media
  const displayedMedia = useMemo(() => {
    let result = mediaFiles.filter((file) => {
      // Album filter
      if (selectedAlbumId) {
        const album = albums.find((a) => a.id === selectedAlbumId);
        if (album && !album.file_ids.includes(file.id)) {
          return false;
        }
      }

      // Search query
      if (
        searchQuery.trim() &&
        !file.filename.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      // Type Filters
      if (activeFilter === 'photos') return file.mime_type.startsWith('image/');
      if (activeFilter === 'videos') return file.mime_type.startsWith('video/');
      if (activeFilter === 'favorites') return file.is_favorite;
      if (activeFilter === '4k') return (file.dimensions?.width || 0) >= 3840;

      return true;
    });

    result.sort((a, b) => {
      if (sortBy === 'name') return a.filename.localeCompare(b.filename);
      if (sortBy === 'size') return b.size - a.size;
      if (sortBy === 'duration') return (b.duration || 0) - (a.duration || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return result;
  }, [mediaFiles, activeFilter, selectedAlbumId, searchQuery, sortBy, albums]);

  // Formatter helpers
  const formatDuration = (secs?: number) => {
    if (!secs) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  };

  // Selection handlers
  const toggleSelect = (id: string) => {
    triggerHaptic('light');
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    triggerHaptic('light');
    if (selectedIds.length === displayedMedia.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayedMedia.map((f) => f.id));
    }
  };

  const handleBatchFavorite = async () => {
    triggerHaptic('medium');
    for (const id of selectedIds) {
      await toggleFavorite(id);
    }
    showToast(`Updated ${selectedIds.length} items`, 'success');
    setSelectedIds([]);
    setIsSelectMode(false);
  };

  const handleBatchDelete = async () => {
    triggerHaptic('warning');
    for (const id of selectedIds) {
      await trashFile(id);
    }
    showToast(`Moved ${selectedIds.length} items to Trash`, 'info');
    setSelectedIds([]);
    setIsSelectMode(false);
  };

  const handleBatchVault = async () => {
    triggerHaptic('medium');
    for (const id of selectedIds) {
      await moveToVault(id);
    }
    showToast(`Secured ${selectedIds.length} items into Private Vault`, 'success');
    setSelectedIds([]);
    setIsSelectMode(false);
  };

  // Sample curated albums if user has none yet
  const displayAlbums = useMemo(() => {
    if (albums.length > 0) return albums;
    return [
      {
        id: 'album_travel',
        name: 'Travel & Expeditions',
        file_ids: mediaFiles.slice(0, 8).map((f) => f.id),
        created_at: new Date().toISOString(),
      },
      {
        id: 'album_projects',
        name: 'UniMAP & Projects',
        file_ids: mediaFiles.slice(4, 12).map((f) => f.id),
        created_at: new Date().toISOString(),
      },
      {
        id: 'album_cinema',
        name: '4K Cinema Vault',
        file_ids: mediaFiles.filter((f) => f.mime_type.startsWith('video/')).map((f) => f.id),
        created_at: new Date().toISOString(),
      },
    ] as AlbumItem[];
  }, [albums, mediaFiles]);

  return (
    <div className="min-h-screen bg-[#000000] text-white pb-32 select-none -mx-4 sm:mx-0">
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
                if (selectedAlbumId) {
                  setSelectedAlbumId(null);
                } else {
                  onBack();
                }
              }}
              className="w-9 h-9 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 flex items-center justify-center text-white/90 cursor-pointer shrink-0 transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </motion.button>

            <div className="min-w-0">
              <h1 className="text-[20px] font-bold tracking-tight text-white leading-tight truncate">
                {selectedAlbumId
                  ? displayAlbums.find((a) => a.id === selectedAlbumId)?.name || 'Album'
                  : 'Media'}
              </h1>
              <p className="text-[11px] text-neutral-400 font-medium leading-none truncate">
                {selectedAlbumId
                  ? `${displayedMedia.length} items in album`
                  : `${mediaFiles.length} Items · ${photoCount} Photos · ${videoCount} Videos`}
              </p>
            </div>
          </div>

          {/* Action Bar: Search, Density, Select, Add */}
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
              aria-label="Search media"
            >
              <Search className="w-3.5 h-3.5" />
            </motion.button>

            {/* Grid Density Toggle (2-col / 3-col) */}
            <motion.button
              type="button"
              whileTap={tapPress}
              transition={springSquishy}
              onClick={() => {
                triggerHaptic('light');
                setGridColumns((prev) => (prev === 3 ? 2 : 3));
              }}
              className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-neutral-300 flex items-center justify-center cursor-pointer transition-colors"
              aria-label="Toggle grid columns"
              title={gridColumns === 3 ? 'Switch to 2 columns' : 'Switch to 3 columns'}
            >
              {gridColumns === 3 ? (
                <Grid3X3 className="w-3.5 h-3.5" />
              ) : (
                <LayoutGrid className="w-3.5 h-3.5" />
              )}
            </motion.button>

            {/* Sort Options Button */}
            <motion.button
              type="button"
              whileTap={tapPress}
              transition={springSquishy}
              onClick={() => {
                triggerHaptic('light');
                setIsSortMenuOpen((prev) => !prev);
              }}
              className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-neutral-300 flex items-center justify-center cursor-pointer transition-colors"
              aria-label="Sort options"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </motion.button>

            {/* Select Mode Toggle */}
            <motion.button
              type="button"
              whileTap={tapPress}
              transition={springSquishy}
              onClick={() => {
                triggerHaptic('light');
                setIsSelectMode((prev) => !prev);
                setSelectedIds([]);
              }}
              className={`px-3 h-8 rounded-full text-xs font-semibold tracking-tight transition-colors cursor-pointer ${
                isSelectMode
                  ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                  : 'bg-white/[0.08] hover:bg-white/[0.14] text-neutral-200'
              }`}
            >
              {isSelectMode ? 'Done' : 'Select'}
            </motion.button>

            {/* Add / Upload Button */}
            <motion.button
              type="button"
              whileTap={tapPress}
              transition={springSquishy}
              onClick={() => {
                triggerHaptic('light');
                setIsUploadOpen(true);
              }}
              className="w-8 h-8 rounded-full bg-white text-black hover:bg-neutral-200 flex items-center justify-center font-bold cursor-pointer transition-colors shadow-sm ml-0.5"
              aria-label="Upload Media"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </motion.button>
          </div>
        </div>

        {/* Expandable Liquid Glass Search Bar */}
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
                  placeholder="Search photos, videos, dates..."
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

        {/* Filter Segmented Control (Apple Photos Style) */}
        {!selectedAlbumId && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2.5 -mx-1 px-1">
            {(
              [
                { id: 'all', label: 'All Media' },
                { id: 'photos', label: `Photos (${photoCount})` },
                { id: 'videos', label: `Videos (${videoCount})` },
                { id: 'favorites', label: `Favorites (${favoriteCount})` },
                { id: '4k', label: '4K Ultra HD' },
              ] as { id: MediaFilterType; label: string }[]
            ).map((filter) => {
              const isActive = activeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setActiveFilter(filter.id);
                  }}
                  className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-white text-black font-semibold shadow-sm'
                      : 'bg-white/[0.06] hover:bg-white/[0.12] text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* 2. PHOTO & VIDEO HERO GRID (EDGE-TO-EDGE, NO CLUNKY CARDS)               */}
      {/* ========================================================================= */}
      <main className="px-0.5 pt-1">
        {displayedMedia.length > 0 ? (
          <div
            className={`grid gap-[2px] sm:gap-[3px] ${
              gridColumns === 3 ? 'grid-cols-3' : 'grid-cols-2'
            }`}
          >
            {displayedMedia.map((file, idx) => {
              const isVideo = file.mime_type.startsWith('video/');
              const isSelected = selectedIds.includes(file.id);

              return (
                <motion.div
                  key={file.id}
                  whileTap={tapCard}
                  transition={springSquishy}
                  onClick={() => {
                    if (isSelectMode) {
                      toggleSelect(file.id);
                    } else {
                      triggerHaptic('light');
                      openViewer(file);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    triggerHaptic('medium');
                    setActiveActionFile(file);
                  }}
                  className="relative aspect-square w-full bg-[#141416] overflow-hidden cursor-pointer group rounded-[2px]"
                >
                  {/* Real Image / Video Thumbnail */}
                  <SafeImage
                    src={file.thumbnail_url || file.storage_path}
                    videoSrc={isVideo ? file.storage_path : undefined}
                    alt={file.filename}
                    className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                  />

                  {/* Video duration & badge indicator (Bottom Right - Apple Photos Style) */}
                  {isVideo && (
                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-[4px] bg-black/65 backdrop-blur-md flex items-center gap-1 text-[10px] font-mono font-medium text-white shadow-sm pointer-events-none">
                      <Play className="w-2 h-2 fill-white text-white" />
                      <span>{formatDuration(file.duration)}</span>
                    </div>
                  )}

                  {/* Favorite indicator (Top Left) */}
                  {file.is_favorite && !isSelectMode && (
                    <div className="absolute top-1.5 left-1.5 text-white/90 drop-shadow-md pointer-events-none">
                      <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" />
                    </div>
                  )}

                  {/* Multi-Select Circle / Checkmark (Top Right) */}
                  {isSelectMode && (
                    <div className="absolute top-1.5 right-1.5 z-10 pointer-events-none">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-blue-500 text-white shadow-md'
                            : 'bg-black/50 border border-white/60 backdrop-blur-sm'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="py-24 text-center px-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-white/[0.06] text-neutral-400 flex items-center justify-center mx-auto">
              <ImageIcon className="w-6 h-6 stroke-[1.5]" />
            </div>
            <p className="text-sm font-semibold text-neutral-300">No media found</p>
            <p className="text-xs text-neutral-500 max-w-xs mx-auto">
              Upload photos or videos to view your personal high-resolution library.
            </p>
            <button
              type="button"
              onClick={() => setIsUploadOpen(true)}
              className="mt-2 px-4 py-2 rounded-full bg-white text-black text-xs font-semibold shadow-sm hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              Upload Media
            </button>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* 3. MEDIA SECTIONS: ALBUMS (4-PHOTO COLLAGE) & MEDIA TYPES                 */}
      {/* ========================================================================= */}
      {!selectedAlbumId && !isSelectMode && (
        <section className="mt-8 px-4 space-y-6">
          {/* Albums Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold tracking-tight text-white">Albums</h2>
              <span className="text-xs text-neutral-400 font-medium">
                {displayAlbums.length} Collections
              </span>
            </div>

            {/* Horizontal Scrolling 4-Photo Collage Cards */}
            <div className="flex items-start gap-3.5 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
              {displayAlbums.map((album) => {
                const albumPhotos = mediaFiles.filter((f) =>
                  album.file_ids.includes(f.id)
                );
                const collageThumbs = albumPhotos.slice(0, 4);

                return (
                  <motion.div
                    key={album.id}
                    whileTap={tapCard}
                    transition={springSquishy}
                    onClick={() => {
                      triggerHaptic('light');
                      setSelectedAlbumId(album.id);
                    }}
                    className="flex-none w-36 sm:w-40 space-y-2 cursor-pointer group"
                  >
                    {/* 4-Photo Collage Thumbnail Container */}
                    <div className="aspect-square w-full rounded-2xl overflow-hidden bg-[#161618] border border-white/[0.08] shadow-md grid grid-cols-2 grid-rows-2 gap-[1.5px] p-[1.5px]">
                      {[0, 1, 2, 3].map((slotIdx) => {
                        const photo = collageThumbs[slotIdx] || mediaFiles[slotIdx];
                        return (
                          <div
                            key={slotIdx}
                            className="relative w-full h-full bg-[#202024] overflow-hidden"
                          >
                            {photo ? (
                              <SafeImage
                                src={photo.thumbnail_url || photo.storage_path}
                                alt={album.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white/10">
                                <ImageIcon className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Album Name & Count */}
                    <div className="px-0.5">
                      <p className="text-xs font-semibold text-white truncate leading-tight group-hover:text-blue-400 transition-colors">
                        {album.name}
                      </p>
                      <p className="text-[11px] text-neutral-400 font-medium">
                        {album.file_ids.length} items
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Media Types Section (Apple Photos Style Clean List Rows) */}
          <div className="space-y-2">
            <h2 className="text-base font-bold tracking-tight text-white mb-2">Media Types</h2>

            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] divide-y divide-white/[0.05] overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setActiveFilter('videos');
                }}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Film className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-medium text-white">Videos</span>
                </div>
                <div className="flex items-center gap-1.5 text-neutral-400">
                  <span className="text-xs tabular-nums">{videoCount}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setActiveFilter('favorites');
                }}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Heart className="w-4 h-4 text-red-400" />
                  <span className="text-xs font-medium text-white">Favorites</span>
                </div>
                <div className="flex items-center gap-1.5 text-neutral-400">
                  <span className="text-xs tabular-nums">{favoriteCount}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setActiveFilter('4k');
                }}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-medium text-white">4K Cinematic Media</span>
                </div>
                <div className="flex items-center gap-1.5 text-neutral-400">
                  <span className="text-xs tabular-nums">
                    {mediaFiles.filter((f) => (f.dimensions?.width || 0) >= 3840).length}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
                </div>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 4. MULTI-SELECT FLOATING LIQUID GLASS ACTION BAR                          */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isSelectMode && selectedIds.length > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 80, opacity: 0, scale: 0.95 }}
            transition={springGlass}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[min(380px,calc(100vw-32px))]"
          >
            <Glass className="p-2 rounded-full flex items-center justify-between shadow-2xl border border-white/20">
              <span className="text-xs font-bold text-white px-3">
                {selectedIds.length} Selected
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleBatchFavorite}
                  className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.16] text-red-400 flex items-center justify-center cursor-pointer transition-colors"
                  title="Favorite selected"
                >
                  <Heart className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleBatchVault}
                  className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.16] text-blue-400 flex items-center justify-center cursor-pointer transition-colors"
                  title="Move to Private Vault"
                >
                  <Shield className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleBatchDelete}
                  className="w-8 h-8 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-400 flex items-center justify-center cursor-pointer transition-colors"
                  title="Delete selected"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-2.5 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.16] text-[11px] font-medium text-neutral-200 cursor-pointer transition-colors"
                >
                  {selectedIds.length === displayedMedia.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </Glass>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 5. CONTEXT ACTION SHEET (LONG-PRESS / OPTIONS)                            */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {activeActionFile && (
          <div
            className="fixed inset-0 z-60 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setActiveActionFile(null)}
          >
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={springRelaxed}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-[#141416] border-t sm:border border-white/10 p-5 shadow-2xl space-y-4"
            >
              {/* Grabber handle */}
              <div className="w-10 h-1.5 rounded-full bg-white/20 mx-auto cursor-grab" />

              {/* File Info Header */}
              <div className="flex items-center gap-3 pb-3 border-b border-white/[0.08]">
                <div className="w-12 h-12 rounded-xl bg-neutral-900 overflow-hidden shrink-0">
                  <SafeImage
                    src={activeActionFile.thumbnail_url || activeActionFile.storage_path}
                    alt={activeActionFile.filename}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate">
                    {activeActionFile.filename}
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    {formatFileSize(activeActionFile.size)} · {formatDate(activeActionFile.created_at)}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setShareTargetFile(activeActionFile);
                    setActiveActionFile(null);
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-white/[0.06] flex items-center gap-3 text-neutral-200 transition-colors text-left"
                >
                  <Share2 className="w-4 h-4 text-blue-400" />
                  <span>Share File</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    toggleFavorite(activeActionFile.id);
                    setActiveActionFile(null);
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-white/[0.06] flex items-center gap-3 text-neutral-200 transition-colors text-left"
                >
                  <Heart
                    className={`w-4 h-4 ${
                      activeActionFile.is_favorite
                        ? 'fill-red-500 text-red-500'
                        : 'text-neutral-400'
                    }`}
                  />
                  <span>
                    {activeActionFile.is_favorite ? 'Remove from Favorites' : 'Add to Favorites'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setDetailsFile(activeActionFile);
                    setActiveActionFile(null);
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-white/[0.06] flex items-center gap-3 text-neutral-200 transition-colors text-left"
                >
                  <Info className="w-4 h-4 text-purple-400" />
                  <span>File Information</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setEditingFile(activeActionFile);
                    setActiveActionFile(null);
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-white/[0.06] flex items-center gap-3 text-neutral-200 transition-colors text-left"
                >
                  <Edit2 className="w-4 h-4 text-emerald-400" />
                  <span>Rename</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('medium');
                    moveToVault(activeActionFile.id);
                    setActiveActionFile(null);
                    showToast('Moved to Private Vault', 'success');
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-white/[0.06] flex items-center gap-3 text-neutral-200 transition-colors text-left"
                >
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>Move to Private Vault</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('warning');
                    trashFile(activeActionFile.id);
                    setActiveActionFile(null);
                    showToast('Moved to Trash', 'info');
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-red-500/10 flex items-center gap-3 text-red-400 transition-colors text-left"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 6. SORT OPTIONS MODAL                                                     */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isSortMenuOpen && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
            onClick={() => setIsSortMenuOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={springRelaxed}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xs rounded-2xl bg-[#141416] border border-white/10 p-4 shadow-2xl space-y-2 text-xs"
            >
              <h3 className="font-bold text-white px-1 pb-1 border-b border-white/[0.08]">
                Sort Media By
              </h3>

              {(
                [
                  { id: 'date', label: 'Date Added (Newest First)' },
                  { id: 'name', label: 'Name (A to Z)' },
                  { id: 'size', label: 'File Size (Largest First)' },
                  { id: 'duration', label: 'Video Duration' },
                ] as { id: 'date' | 'name' | 'size' | 'duration'; label: string }[]
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setSortBy(option.id);
                    setIsSortMenuOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer ${
                    sortBy === option.id
                      ? 'bg-blue-600/20 text-blue-400 font-semibold'
                      : 'hover:bg-white/[0.05] text-neutral-300'
                  }`}
                >
                  <span>{option.label}</span>
                  {sortBy === option.id && <Check className="w-4 h-4" />}
                </button>
              ))}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
