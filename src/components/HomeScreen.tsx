import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import {
  Heart,
  Clock,
  Share2,
  Lock,
  ChevronRight,
  Film,
  FileText,
  FileArchive,
  MoreVertical,
  Music,
} from 'lucide-react';
import { useCloud } from '../context/CloudContext';
import { useScrollContainer } from '../context/ScrollContext';
import { CloudFile } from '../types/cloud';
import { spring, springSnappy, springBouncy, springInteractive } from '../motion';
import { Glass } from './Glass';
import { SafeImage } from './SafeImage';
import { MediaSpace } from './spaces/MediaSpace';
import { DocsSpace } from './spaces/DocsSpace';
import { MusicSpace } from './spaces/MusicSpace';

export const HomeScreen: React.FC = () => {
  const {
    files,
    albums,
    storage,
    huggingFace,
    setActiveTab,
    setActiveFilter,
    openViewer,
    setDetailsFile,
    setIsVaultModalOpen,
    setIsStorageManagerOpen,
    setActiveAlbum,
    activeSpace,
    setActiveSpace,
    triggerHaptic,
  } = useCloud();

  const { homeScrollRef } = useScrollContainer();
  const { scrollY } = useScroll({ container: homeScrollRef });
  const titleScale = useTransform(scrollY, [0, 60], [1, 0.94]);
  const titleOpacity = useTransform(scrollY, [0, 60], [1, 0.75]);

  const [displayBytes, setDisplayBytes] = useState<number>(0);

  useEffect(() => {
    const target = storage?.total_used_bytes || 0;
    const duration = 600;
    const startTime = performance.now();
    let frameId: number;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      setDisplayBytes(Math.round(progress * target));
      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [storage?.total_used_bytes]);

  // Greeting logic
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Selamat pagi';
    if (hour < 17) return 'Selamat tengah hari';
    if (hour < 20) return 'Selamat petang';
    return 'Selamat malam';
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatItems = (count: number) => (count === 1 ? '1 item' : `${count} items`);

  // Middle truncate dataset repo name
  const truncateMiddle = (str: string, maxLength: number = 32) => {
    if (str.length <= maxLength) return str;
    const mid = Math.floor(maxLength / 2);
    return `${str.slice(0, mid - 2)}...${str.slice(-mid + 2)}`;
  };

  const recentMedia = files
    .filter((f) => f.mime_type.startsWith('image/') || f.mime_type.startsWith('video/'))
    .slice(0, 6);

  const recentFiles = files
    .filter((f) => !f.mime_type.startsWith('image/') && !f.mime_type.startsWith('video/'))
    .slice(0, 4);

  const quickAccessItems = [
    {
      id: 'favorites',
      label: 'Favorites',
      icon: Heart,
      action: () => {
        triggerHaptic('medium');
        setActiveFilter('favorites');
        setActiveTab('gallery');
      },
    },
    {
      id: 'media',
      label: 'Media',
      icon: Film,
      action: () => {
        triggerHaptic('medium');
        setActiveSpace('media');
      },
    },
    {
      id: 'docs',
      label: 'Docs',
      icon: FileText,
      action: () => {
        triggerHaptic('medium');
        setActiveSpace('docs');
      },
    },
    {
      id: 'music',
      label: 'Music',
      icon: Music,
      action: () => {
        triggerHaptic('medium');
        setActiveSpace('music');
      },
    },
  ];

  const getFileIcon = (file: CloudFile) => {
    if (file.mime_type.startsWith('video/')) return <Film className="w-5 h-5 text-[#A1A1A1]" />;
    if (file.extension === 'zip' || file.extension === 'rar') return <FileArchive className="w-5 h-5 text-[#A1A1A1]" />;
    return <FileText className="w-5 h-5 text-[#A1A1A1]" />;
  };

  if (activeSpace === 'media') {
    return <MediaSpace onBack={() => setActiveSpace('none')} />;
  }

  if (activeSpace === 'docs') {
    return <DocsSpace onBack={() => setActiveSpace('none')} />;
  }

  if (activeSpace === 'music') {
    return <MusicSpace onBack={() => setActiveSpace('none')} />;
  }

  return (
    <div className="space-y-6 pb-4">
      {/* 1. Large Title & Greeting with Backup Pill */}
      <motion.section
        initial={false}
        style={{ scale: titleScale, opacity: titleOpacity, transformOrigin: 'left top' }}
        className="flex items-end justify-between"
      >
        <div>
          <p className="text-[15px] text-[#A1A1A1] font-normal leading-tight mb-1">
            {getGreeting()}
          </p>
          <h1 className="text-[34px] font-bold tracking-tight text-white leading-none">
            Imran
          </h1>
        </div>

        {/* Backup Pill (Glass, height 32, dot + Backed up) */}
        <Glass className="h-8 px-3 rounded-full flex items-center gap-1.5 text-xs font-medium text-white shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Backed up</span>
        </Glass>
      </motion.section>

      {/* 2. Storage Card */}
      <section aria-label="Storage Overview">
        <div className="rounded-[24px] bg-[#141414] p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-[34px] font-bold tracking-tight text-white tabular-nums leading-none">
                  {formatBytes(displayBytes)}
                </span>
                <span className="text-[15px] text-[#A1A1A1] tabular-nums font-normal">
                  of {formatBytes(storage?.total_capacity_bytes || 128 * 1024 * 1024 * 1024)}
                </span>
              </div>
              <p className="text-[12px] text-[#666666] tracking-tight mt-1 truncate">
                {truncateMiddle(huggingFace?.repo_id || 'imran-z/private-personal-cloud')}
              </p>
            </div>

            <button
              onClick={() => {
                triggerHaptic('light');
                setIsStorageManagerOpen(true);
              }}
              className="text-sm font-semibold text-[#3B82F6] hover:opacity-80 transition-opacity flex items-center gap-0.5 cursor-pointer pt-1"
            >
              <span>Manage</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Thin Progress Bar (height 6, radius 3, min width 4px) */}
          <div className="h-1.5 w-full bg-[#1C1C1E] rounded-[3px] overflow-hidden flex">
            {/* Photos (Blue) */}
            <motion.div
              initial={false}
              animate={{
                width: `max(4px, ${storage ? (storage.breakdown.photos_bytes / storage.total_capacity_bytes) * 100 : 25}%)`,
              }}
              transition={spring}
              className="bg-[#3B82F6] h-full"
            />
            {/* Videos (White) */}
            <motion.div
              initial={false}
              animate={{
                width: `max(4px, ${storage ? (storage.breakdown.videos_bytes / storage.total_capacity_bytes) * 100 : 35}%)`,
              }}
              transition={spring}
              className="bg-white h-full"
            />
            {/* Files (#8E8E93) */}
            <motion.div
              initial={false}
              animate={{
                width: `max(4px, ${storage ? (storage.breakdown.files_bytes / storage.total_capacity_bytes) * 100 : 12}%)`,
              }}
              transition={spring}
              className="bg-[#8E8E93] h-full"
            />
            {/* Vault (#3A3A3C) */}
            <motion.div
              initial={false}
              animate={{
                width: `max(4px, ${storage ? (storage.breakdown.vault_bytes / storage.total_capacity_bytes) * 100 : 8}%)`,
              }}
              transition={spring}
              className="bg-[#3A3A3C] h-full"
            />
          </div>

          {/* Legend 2x2 Grid with Sizes */}
          <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[13px] text-[#A1A1A1] pt-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#3B82F6] shrink-0" />
              <span>Photos <span className="text-white tabular-nums ml-1 font-medium">{formatBytes(storage?.breakdown.photos_bytes || 0)}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white shrink-0" />
              <span>Videos <span className="text-white tabular-nums ml-1 font-medium">{formatBytes(storage?.breakdown.videos_bytes || 0)}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#8E8E93] shrink-0" />
              <span>Files <span className="text-white tabular-nums ml-1 font-medium">{formatBytes(storage?.breakdown.files_bytes || 0)}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#3A3A3C] shrink-0" />
              <span>Vault <span className="text-white tabular-nums ml-1 font-medium">{formatBytes(storage?.breakdown.vault_bytes || 0)}</span></span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Quick Access (4 equal tiles, height 76, icon 22, label 12) */}
      <section aria-label="Quick Access">
        <div className="grid grid-cols-4 gap-3">
          {quickAccessItems.map((item) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.id}
                onClick={item.action}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.92 }}
                transition={springBouncy}
                className="flex flex-col items-center justify-center h-[76px] rounded-[20px] bg-[#141414] hover:bg-[#1C1C1E] border border-white/5 hover:border-white/15 transition-colors cursor-pointer p-2 shadow-sm"
              >
                <Icon className="w-[22px] h-[22px] text-white mb-1.5 transition-transform duration-200" />
                <span className="text-[12px] font-medium text-white text-center leading-none">
                  {item.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* 4. Albums Row (horizontal scroll, 120x120 card, radius 18, 2-line clamp) */}
      {albums.length > 0 && (
        <section aria-label="Albums" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[20px] font-semibold text-white tracking-tight">Albums</h2>
            <button
              onClick={() => {
                triggerHaptic('light');
                setActiveTab('gallery');
              }}
              className="text-[13px] font-semibold text-[#3B82F6] hover:opacity-80 cursor-pointer"
            >
              See All
            </button>
          </div>

          <div className="flex items-start gap-3.5 overflow-x-auto no-scrollbar snap-x snap-mandatory py-1">
            {albums.map((album) => (
              <motion.div
                key={album.id}
                onClick={() => {
                  triggerHaptic('light');
                  setActiveAlbum(album);
                  setActiveTab('gallery');
                }}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.94 }}
                transition={springBouncy}
                className="w-[120px] shrink-0 cursor-pointer snap-start group"
              >
                <div className="w-[120px] h-[120px] rounded-[18px] overflow-hidden bg-[#141414] mb-1.5 shadow-sm group-hover:shadow-md transition-shadow">
                  <SafeImage
                    src={album.cover_url}
                    alt={album.name}
                    eager={true}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <p className="text-[14px] font-medium text-white line-clamp-2 leading-tight">
                  {album.name}
                </p>
                <p className="text-[12px] text-[#A1A1A1] tabular-nums mt-0.5">
                  {formatItems(album.file_ids.length)}
                </p>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* 5. Recent Media (3 columns, 2px gap, fixed aspect-square cells) */}
      <section aria-label="Recent Media" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[20px] font-semibold text-white tracking-tight">Recent Media</h2>
          <button
            onClick={() => {
              triggerHaptic('light');
              setActiveFilter('photos');
              setActiveTab('gallery');
            }}
            className="text-[13px] font-semibold text-[#3B82F6] hover:opacity-80 cursor-pointer"
          >
            See All
          </button>
        </div>

        {recentMedia.length > 0 ? (
          <div className="grid grid-cols-3 gap-[2px] bg-black rounded-[18px] overflow-hidden">
            {recentMedia.map((file, idx) => {
              const isVideo = file.mime_type.startsWith('video/');
              return (
                <motion.div
                  key={file.id}
                  layoutId={`media-${file.id}`}
                  onClick={() => openViewer(file)}
                  whileHover={{ scale: 0.98 }}
                  whileTap={{ scale: 0.92 }}
                  transition={springSnappy}
                  className="relative aspect-square overflow-hidden bg-[#1C1C1E] cursor-pointer group"
                >
                  <SafeImage
                    src={file.thumbnail_url || file.storage_path}
                    alt={file.filename}
                    eager={idx < 6}
                    aspectRatio="1 / 1"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {isVideo && (
                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-[4px] liquid-glass-lite text-[11px] font-medium text-white flex items-center gap-1 z-10">
                      <Film className="w-2.5 h-2.5" />
                      <span className="tabular-nums">{file.duration ? `${file.duration}s` : '0:38'}</span>
                    </div>
                  )}
                  {file.is_favorite && (
                    <div className="absolute bottom-1 left-1 text-white z-10 drop-shadow-md">
                      <Heart className="w-3.5 h-3.5 fill-white text-white" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[20px] bg-[#141414] p-8 text-center text-sm text-[#A1A1A1]">
            No media yet.
          </div>
        )}
      </section>

      {/* 6. Recent Files (4 clean rows, dividers 0.5px hairline inset 16px) */}
      <section aria-label="Recent Files" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[20px] font-semibold text-white tracking-tight">Recent Files</h2>
          <button
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('library');
            }}
            className="text-[13px] font-semibold text-[#3B82F6] hover:opacity-80 cursor-pointer"
          >
            See All
          </button>
        </div>

        <div className="rounded-[20px] bg-[#141414] overflow-hidden border border-white/5">
          {recentFiles.length > 0 ? (
            recentFiles.map((file, idx) => (
              <React.Fragment key={file.id}>
                <motion.div
                  onClick={() => {
                    triggerHaptic('light');
                    openViewer(file);
                  }}
                  whileHover={{ x: 4, backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
                  whileTap={{ scale: 0.98 }}
                  transition={springSnappy}
                  className="h-[60px] px-4 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-[10px] bg-[#1C1C1E] flex items-center justify-center shrink-0">
                      {getFileIcon(file)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[16px] font-medium text-white truncate leading-tight">
                        {file.filename}
                      </p>
                      <p className="text-[13px] text-[#A1A1A1] tabular-nums">
                        {formatBytes(file.size)} · {file.extension.toUpperCase()} · {new Date(file.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic('light');
                      setDetailsFile(file);
                    }}
                    className="w-11 h-11 flex items-center justify-center text-[#666666] hover:text-white cursor-pointer"
                    aria-label="Options"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </motion.div>
                {idx < recentFiles.length - 1 && (
                  <div className="h-[0.5px] bg-[rgba(255,255,255,0.08)] ml-16" />
                )}
              </React.Fragment>
            ))
          ) : (
            <div className="p-8 text-center text-sm text-[#A1A1A1]">
              No files yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
