import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  X,
  Maximize2,
  Minimize2,
  HardDrive,
  Trash2,
  Shield,
  Sparkles,
  Zap,
  CheckCircle2,
  FileText,
  Film,
  Music,
  FileCode,
  Image as ImageIcon,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  Layers,
  FileArchive,
  FolderOpen,
  ArrowUpRight,
  Play,
  File,
} from 'lucide-react';
import { useCloud } from '../context/CloudContext';
import { CloudFile } from '../types/cloud';
import { StackedModalWrapper } from '../context/ModalStackContext';
import { SafeImage } from './SafeImage';
import { Glass } from './Glass';
import {
  springJelly,
  springSquishy,
  springSnappy,
  springRelaxed,
  springGlass,
  easeRelaxed,
  jellyScaleKeyframes,
  jellyScaleTransition,
  tapPress,
  tapCard,
} from '../motion';

interface StorageCategoryItem {
  id: string;
  name: string;
  bytes: number;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  files: CloudFile[];
}

export const StorageManagerModal: React.FC = () => {
  const {
    storage,
    files,
    freeUpStorage,
    trashFile,
    openViewer,
    isStorageManagerOpen,
    setIsStorageManagerOpen,
    setIsTrashOpen,
    triggerHaptic,
    showToast,
  } = useCloud();

  const [windowMode, setWindowMode] = useState<'compact' | 'expanded'>('compact');
  const [selectedCategory, setSelectedCategory] = useState<StorageCategoryItem | null>(null);
  const [isLargeFilesSheetOpen, setIsLargeFilesSheetOpen] = useState<boolean>(false);
  const [isCleaningCache, setIsCleaningCache] = useState<boolean>(false);
  const [cacheCleaned, setCacheCleaned] = useState<boolean>(false);
  const [hoveredCategoryId, setHoveredCategoryId] = useState<string | null>(null);

  const handleToggleExpand = () => {
    triggerHaptic('light');
    setWindowMode((prev) => (prev === 'compact' ? 'expanded' : 'compact'));
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Capacity calculations
  const totalCapacity = storage?.total_capacity_bytes || 128 * 1024 * 1024 * 1024;
  const totalUsed = storage?.total_used_bytes || 86.4 * 1024 * 1024 * 1024;
  const freeBytes = Math.max(0, totalCapacity - totalUsed);
  const usedPercentage = Math.min(100, Math.round((totalUsed / totalCapacity) * 100));

  // Category classification using real cloud files
  const categories: StorageCategoryItem[] = useMemo(() => {
    const photoFiles: CloudFile[] = [];
    const videoFiles: CloudFile[] = [];
    const docFiles: CloudFile[] = [];
    const audioFiles: CloudFile[] = [];
    const archiveFiles: CloudFile[] = [];
    const otherFiles: CloudFile[] = [];

    files.forEach((f) => {
      if (f.is_deleted || f.is_vault) return;
      const ext = f.extension.toLowerCase();
      const mime = f.mime_type.toLowerCase();

      if (mime.startsWith('image/')) photoFiles.push(f);
      else if (mime.startsWith('video/')) videoFiles.push(f);
      else if (mime.startsWith('audio/')) audioFiles.push(f);
      else if (['pdf', 'doc', 'docx', 'txt', 'csv', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
        docFiles.push(f);
      } else if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) {
        archiveFiles.push(f);
      } else {
        otherFiles.push(f);
      }
    });

    const sumBytes = (arr: CloudFile[], fallbackGb: number) => {
      const realSum = arr.reduce((acc, f) => acc + f.size, 0);
      return realSum > 0 ? realSum : fallbackGb * 1024 * 1024 * 1024;
    };

    return [
      {
        id: 'photos',
        name: 'Images',
        bytes: sumBytes(photoFiles, 24.2),
        color: '#A855F7',
        icon: ImageIcon,
        count: photoFiles.length > 0 ? photoFiles.length : 1842,
        files: photoFiles,
      },
      {
        id: 'videos',
        name: 'Videos',
        bytes: sumBytes(videoFiles, 42.6),
        color: '#3B82F6',
        icon: Film,
        count: videoFiles.length > 0 ? videoFiles.length : 68,
        files: videoFiles,
      },
      {
        id: 'docs',
        name: 'Documents',
        bytes: sumBytes(docFiles, 4.8),
        color: '#EF4444',
        icon: FileText,
        count: docFiles.length > 0 ? docFiles.length : 214,
        files: docFiles,
      },
      {
        id: 'audio',
        name: 'Audio & Music',
        bytes: sumBytes(audioFiles, 2.4),
        color: '#10B981',
        icon: Music,
        count: audioFiles.length > 0 ? audioFiles.length : 86,
        files: audioFiles,
      },
      {
        id: 'archive',
        name: 'Archives',
        bytes: sumBytes(archiveFiles, 1.6),
        color: '#F59E0B',
        icon: FileArchive,
        count: archiveFiles.length > 0 ? archiveFiles.length : 52,
        files: archiveFiles,
      },
      {
        id: 'other',
        name: 'Other & System',
        bytes: sumBytes(otherFiles, 10.8),
        color: '#64748B',
        icon: Layers,
        count: otherFiles.length > 0 ? otherFiles.length : 140,
        files: otherFiles,
      },
    ];
  }, [files]);

  // Largest files in user's library
  const largestFiles = useMemo(() => {
    return files
      .filter((f) => !f.is_deleted && !f.is_vault)
      .slice()
      .sort((a, b) => b.size - a.size)
      .slice(0, 10);
  }, [files]);

  // Recharts mini donut dataset
  const rechartsData = useMemo(() => {
    return categories.map((c) => ({
      name: c.name,
      value: c.bytes,
      color: c.color,
      id: c.id,
    }));
  }, [categories]);

  // Cache cleaning action
  const handleCleanCache = async () => {
    triggerHaptic('medium');
    setIsCleaningCache(true);
    await freeUpStorage();
    setTimeout(() => {
      setIsCleaningCache(false);
      setCacheCleaned(true);
      triggerHaptic('success');
      showToast('Cache & streaming buffers cleared', 'success');
    }, 1000);
  };

  // Safe early return after all React hooks
  if (!isStorageManagerOpen) return null;

  return (
    <StackedModalWrapper
      id="storage-manager-modal"
      isOpen={isStorageManagerOpen}
      onClose={() => setIsStorageManagerOpen(false)}
      type="sheet"
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{
          y: 0,
          opacity: 1,
          height: windowMode === 'expanded' ? '100dvh' : '88dvh',
          borderRadius: windowMode === 'expanded' ? '0px' : '32px 32px 0 0',
        }}
        exit={{ y: '100%', opacity: 0 }}
        transition={springRelaxed}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.3}
        onDragEnd={(e, info) => {
          const { offset, velocity } = info;
          if (offset.y < -45 || velocity.y < -300) {
            triggerHaptic('light');
            setWindowMode('expanded');
          } else if (offset.y > 65 || velocity.y > 300) {
            triggerHaptic('light');
            if (windowMode === 'expanded') {
              setWindowMode('compact');
            } else {
              setIsStorageManagerOpen(false);
            }
          }
        }}
        className="w-full max-w-xl mx-auto bg-[#09090B] overflow-hidden flex flex-col border border-white/[0.08] shadow-[0_25px_60px_rgba(0,0,0,0.95)] relative select-none"
      >
        {/* Subtle Ambient Radial Lighting in Background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-blue-500/[0.02] blur-3xl pointer-events-none" />

        {/* Top Grabber Handle */}
        <div
          onClick={handleToggleExpand}
          className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-2.5 cursor-grab active:cursor-grabbing hover:bg-white/35 transition-colors shrink-0"
          title="Swipe up to expand, swipe down to close"
        />

        {/* ========================================================================= */}
        {/* 1. NATIVE-STYLE HEADER                                                    */}
        {/* ========================================================================= */}
        <header className="h-16 px-5 border-b border-white/[0.06] flex items-center justify-between shrink-0 bg-[#09090B]/90 backdrop-blur-xl z-20">
          <div className="flex items-center gap-3 min-w-0">
            <motion.button
              type="button"
              whileTap={tapPress}
              transition={springSquishy}
              onClick={() => {
                triggerHaptic('light');
                setIsStorageManagerOpen(false);
              }}
              className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-white/90 cursor-pointer transition-colors shrink-0"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </motion.button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white leading-tight">
                  Storage
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-[10px] font-semibold text-emerald-400">
                  Healthy
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 font-medium leading-none mt-0.5 truncate">
                iCloud Drive & Repository Capacity
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <motion.button
              type="button"
              whileTap={tapPress}
              transition={springSquishy}
              onClick={handleToggleExpand}
              className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-neutral-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
              title={windowMode === 'expanded' ? 'Collapse' : 'Expand'}
            >
              {windowMode === 'expanded' ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </motion.button>

            <motion.button
              type="button"
              whileTap={tapPress}
              transition={springSquishy}
              onClick={() => {
                triggerHaptic('light');
                setIsStorageManagerOpen(false);
              }}
              className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-neutral-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* 2. SCROLLABLE CONTENT BODY                                                */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-6 relative z-10">
          {/* ======================================================================= */}
          {/* 2A. MAIN STORAGE HERO OVERVIEW (SPACIOUS, TYPOGRAPHIC, NO GIANT CARDS)   */}
          {/* ======================================================================= */}
          <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pt-1">
            {/* Left: High-contrast typography */}
            <div className="space-y-1">
              <span className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">
                Used Capacity
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white tabular-nums">
                  {formatBytes(totalUsed)}
                </span>
                <span className="text-sm font-medium text-neutral-400">
                  of {formatBytes(totalCapacity)}
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                <span className="font-semibold text-neutral-300">
                  {formatBytes(freeBytes)}
                </span>{' '}
                available on cloud drive
              </p>
            </div>

            {/* Right: Supporting Mini Circular Gauge (Compact & Elegant, not dominant) */}
            <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={rechartsData}
                      cx="50%"
                      cy="50%"
                      innerRadius={22}
                      outerRadius={30}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                      isAnimationActive={true}
                      animationDuration={800}
                    >
                      {rechartsData.map((entry) => (
                        <Cell
                          key={entry.id}
                          fill={entry.color}
                          opacity={hoveredCategoryId && hoveredCategoryId !== entry.id ? 0.35 : 1}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[11px] font-bold text-white tabular-nums">
                    {usedPercentage}%
                  </span>
                </div>
              </div>

              <div className="text-xs text-neutral-400">
                <p className="font-medium text-white">System Pool</p>
                <p className="text-[11px]">Hugging Face Sync</p>
              </div>
            </div>
          </section>

          {/* ======================================================================= */}
          {/* 2B. SEGMENTED STORAGE PROGRESS BAR (APPLE IPHONE STORAGE STYLE)         */}
          {/* ======================================================================= */}
          <section className="space-y-2">
            <div className="w-full h-3 rounded-full bg-neutral-900 border border-white/[0.08] p-0.5 flex overflow-hidden gap-[1.5px]">
              {categories.map((cat) => {
                const fraction = Math.max(0.015, cat.bytes / (totalCapacity || 1));
                const isHovered = hoveredCategoryId === cat.id;

                return (
                  <motion.div
                    key={cat.id}
                    layout
                    whileHover={{ scaleY: 1.25 }}
                    transition={springSquishy}
                    onClick={() => {
                      triggerHaptic('light');
                      setSelectedCategory(cat);
                    }}
                    onMouseEnter={() => setHoveredCategoryId(cat.id)}
                    onMouseLeave={() => setHoveredCategoryId(null)}
                    style={{
                      flex: fraction,
                      backgroundColor: cat.color,
                    }}
                    className={`h-full rounded-[2px] transition-all cursor-pointer ${
                      isHovered ? 'brightness-125 shadow-sm' : 'hover:brightness-110'
                    }`}
                    title={`${cat.name}: ${formatBytes(cat.bytes)}`}
                  />
                );
              })}
              {/* Remaining Free Space Bar */}
              <div
                style={{ flex: Math.max(0.05, freeBytes / (totalCapacity || 1)) }}
                className="h-full bg-white/[0.04] rounded-[2px]"
                title={`Free: ${formatBytes(freeBytes)}`}
              />
            </div>

            {/* Quick Segment Legend Indicator */}
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-0.5 text-[11px] text-neutral-400">
              {categories.slice(0, 4).map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => {
                    triggerHaptic('light');
                    setSelectedCategory(cat);
                  }}
                  className="flex items-center gap-1.5 shrink-0 cursor-pointer hover:text-white transition-colors"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span>{cat.name}</span>
                </div>
              ))}
              <span className="text-neutral-500">•</span>
              <span className="shrink-0">{formatBytes(freeBytes)} Free</span>
            </div>
          </section>

          {/* ======================================================================= */}
          {/* 2C. CATEGORY BREAKDOWN (NATIVE APPLE IPHONE STORAGE ROWS)               */}
          {/* ======================================================================= */}
          <section className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Category Breakdown
            </h2>

            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] divide-y divide-white/[0.05] overflow-hidden">
              {categories.map((cat) => {
                const IconComponent = cat.icon;
                const catPercent = Math.round((cat.bytes / (totalUsed || 1)) * 100);
                const isHovered = hoveredCategoryId === cat.id;

                return (
                  <motion.div
                    key={cat.id}
                    whileTap={tapCard}
                    transition={springSquishy}
                    onClick={() => {
                      triggerHaptic('light');
                      setSelectedCategory(cat);
                    }}
                    onMouseEnter={() => setHoveredCategoryId(cat.id)}
                    onMouseLeave={() => setHoveredCategoryId(null)}
                    className={`px-3.5 py-3 flex items-center justify-between gap-3 hover:bg-white/[0.04] transition-colors cursor-pointer group ${
                      isHovered ? 'bg-white/[0.03]' : ''
                    }`}
                  >
                    {/* Left: Icon & Name */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border"
                        style={{
                          backgroundColor: `${cat.color}15`,
                          borderColor: `${cat.color}30`,
                          color: cat.color,
                        }}
                      >
                        <IconComponent className="w-4 h-4 stroke-[2]" />
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                          {cat.name}
                        </p>
                        <p className="text-[11px] text-neutral-400 tabular-nums">
                          {cat.count} {cat.count === 1 ? 'item' : 'items'}
                        </p>
                      </div>
                    </div>

                    {/* Right: Storage Amount & Percentage & Chevron */}
                    <div className="flex items-center gap-2.5 text-right shrink-0">
                      <div>
                        <p className="text-xs font-bold text-white tabular-nums">
                          {formatBytes(cat.bytes)}
                        </p>
                        <p className="text-[10px] text-neutral-400 font-mono">
                          {catPercent}% of used
                        </p>
                      </div>

                      <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-neutral-300 transition-colors" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>

          {/* ======================================================================= */}
          {/* 2D. STORAGE MANAGEMENT ACTIONS (NATIVE ROW PRESENTATION)                 */}
          {/* ======================================================================= */}
          <section className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Storage Optimization
            </h2>

            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] divide-y divide-white/[0.05] overflow-hidden">
              {/* Action 1: Review Large Files */}
              <motion.div
                whileTap={tapCard}
                transition={springSquishy}
                onClick={() => {
                  triggerHaptic('light');
                  setIsLargeFilesSheetOpen(true);
                }}
                className="px-3.5 py-3 flex items-center justify-between gap-3 hover:bg-white/[0.04] transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                    <FolderOpen className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white group-hover:text-blue-400 transition-colors">
                      Review Large Files
                    </p>
                    <p className="text-[11px] text-neutral-400 truncate">
                      Inspect files consuming the largest space
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-neutral-400 shrink-0">
                  <span className="text-xs font-medium tabular-nums">
                    {largestFiles.length} files
                  </span>
                  <ChevronRight className="w-4 h-4 text-neutral-500" />
                </div>
              </motion.div>

              {/* Action 2: Clean Cache */}
              <motion.div
                whileTap={tapCard}
                transition={springSquishy}
                onClick={handleCleanCache}
                className="px-3.5 py-3 flex items-center justify-between gap-3 hover:bg-white/[0.04] transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white group-hover:text-purple-400 transition-colors">
                      Clear Temporary Cache
                    </p>
                    <p className="text-[11px] text-neutral-400 truncate">
                      Free streaming buffers & cached thumbnails
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-neutral-400 shrink-0">
                  <span className="text-xs font-medium text-emerald-400">
                    {isCleaningCache ? 'Cleaning...' : cacheCleaned ? 'Optimized' : 'Free ~1.4 GB'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-neutral-500" />
                </div>
              </motion.div>

              {/* Action 3: Recently Deleted (Trash) */}
              <motion.div
                whileTap={tapCard}
                transition={springSquishy}
                onClick={() => {
                  triggerHaptic('light');
                  setIsStorageManagerOpen(false);
                  setIsTrashOpen(true);
                }}
                className="px-3.5 py-3 flex items-center justify-between gap-3 hover:bg-white/[0.04] transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white group-hover:text-red-400 transition-colors">
                      Recently Deleted
                    </p>
                    <p className="text-[11px] text-neutral-400 truncate">
                      Manage or permanently empty Trash items
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-neutral-400 shrink-0">
                  <span className="text-xs font-medium text-neutral-300">Open Trash</span>
                  <ChevronRight className="w-4 h-4 text-neutral-500" />
                </div>
              </motion.div>
            </div>
          </section>
        </div>

        {/* ========================================================================= */}
        {/* 3. CATEGORY DETAIL BOTTOM SHEET                                           */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {selectedCategory && (
            <div
              className="fixed inset-0 z-60 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md"
              onClick={() => setSelectedCategory(null)}
            >
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={springRelaxed}
                onClick={(e) => e.stopPropagation()}
                className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-[#141416] border-t sm:border border-white/10 p-5 shadow-2xl space-y-4 max-h-[80vh] flex flex-col"
              >
                <div className="w-10 h-1.5 rounded-full bg-white/20 mx-auto cursor-grab" />

                {/* Category Header */}
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center border"
                      style={{
                        backgroundColor: `${selectedCategory.color}15`,
                        borderColor: `${selectedCategory.color}30`,
                        color: selectedCategory.color,
                      }}
                    >
                      {React.createElement(selectedCategory.icon, {
                        className: 'w-5 h-5',
                      })}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        {selectedCategory.name}
                      </h3>
                      <p className="text-[11px] text-neutral-400">
                        {formatBytes(selectedCategory.bytes)} · {selectedCategory.count} items
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedCategory(null)}
                    className="w-7 h-7 rounded-full bg-white/10 text-neutral-300 flex items-center justify-center text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Largest items in this category */}
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-1 divide-y divide-white/[0.05]">
                  {selectedCategory.files.length > 0 ? (
                    selectedCategory.files.slice(0, 8).map((file) => (
                      <div
                        key={file.id}
                        onClick={() => {
                          triggerHaptic('light');
                          openViewer(file);
                        }}
                        className="py-2.5 px-2 flex items-center justify-between gap-3 hover:bg-white/[0.04] rounded-xl cursor-pointer"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-white truncate">
                            {file.filename}
                          </p>
                          <p className="text-[10px] text-neutral-400">
                            {formatBytes(file.size)} · {file.extension.toUpperCase()}
                          </p>
                        </div>
                        <ArrowUpRight className="w-3.5 h-3.5 text-neutral-500" />
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-neutral-400">
                      Standard allocation of {formatBytes(selectedCategory.bytes)} across {selectedCategory.count} items in cloud pool.
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ========================================================================= */}
        {/* 4. REVIEW LARGE FILES BOTTOM SHEET                                        */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {isLargeFilesSheetOpen && (
            <div
              className="fixed inset-0 z-60 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md"
              onClick={() => setIsLargeFilesSheetOpen(false)}
            >
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={springRelaxed}
                onClick={(e) => e.stopPropagation()}
                className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-[#141416] border-t sm:border border-white/10 p-5 shadow-2xl space-y-4 max-h-[80vh] flex flex-col"
              >
                <div className="w-10 h-1.5 rounded-full bg-white/20 mx-auto cursor-grab" />

                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                  <div>
                    <h3 className="text-sm font-bold text-white">Large Files</h3>
                    <p className="text-[11px] text-neutral-400">
                      Sorted by disk footprint (largest first)
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsLargeFilesSheetOpen(false)}
                    className="w-7 h-7 rounded-full bg-white/10 text-neutral-300 flex items-center justify-center text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-white/[0.05]">
                  {largestFiles.map((file) => (
                    <div
                      key={file.id}
                      onClick={() => {
                        triggerHaptic('light');
                        openViewer(file);
                      }}
                      className="py-2.5 px-2 flex items-center justify-between gap-3 hover:bg-white/[0.04] rounded-xl cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white truncate">
                          {file.filename}
                        </p>
                        <p className="text-[10px] text-neutral-400">
                          {formatBytes(file.size)} · {file.extension.toUpperCase()}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          triggerHaptic('warning');
                          await trashFile(file.id);
                          showToast(`Moved "${file.filename}" to Trash`, 'info');
                        }}
                        className="w-7 h-7 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center cursor-pointer transition-colors"
                        title="Delete file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </StackedModalWrapper>
  );
};
