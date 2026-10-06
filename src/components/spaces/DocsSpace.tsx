import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Search,
  FileText,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  File,
  Presentation,
  Folder as FolderIcon,
  FolderPlus,
  Share2,
  MoreHorizontal,
  LayoutGrid,
  List as ListIcon,
  X,
  ChevronRight,
  Download,
  Heart,
  Edit2,
  Info,
  Trash2,
  Shield,
  ArrowUpDown,
  Check,
  Plus,
  Film,
  Music,
  Image as ImageIcon,
  ExternalLink,
} from 'lucide-react';
import { useCloud } from '../../context/CloudContext';
import { CloudFile, FolderItem } from '../../types/cloud';
import { Glass } from '../Glass';
import { SafeImage } from '../SafeImage';
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

interface DocsSpaceProps {
  onBack: () => void;
}

export type DocCategoryFilter =
  | 'all'
  | 'documents'
  | 'spreadsheets'
  | 'presentations'
  | 'archives'
  | 'code'
  | 'media';

export const DocsSpace: React.FC<DocsSpaceProps> = ({ onBack }) => {
  const {
    files,
    folders,
    openViewer,
    setShareTargetFile,
    setDetailsFile,
    setEditingFile,
    toggleFavorite,
    moveToVault,
    trashFile,
    setIsUploadOpen,
    triggerHaptic,
    showToast,
  } = useCloud();

  const [activeCategory, setActiveCategory] = useState<DocCategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchActive, setIsSearchActive] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'type'>('date');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState<boolean>(false);
  const [activeActionFile, setActiveActionFile] = useState<CloudFile | null>(null);
  const [previewFile, setPreviewFile] = useState<CloudFile | null>(null);

  // Filter all non-deleted, non-vault files
  const allDriveFiles = useMemo(() => {
    return files.filter((f) => !f.is_deleted && !f.is_vault);
  }, [files]);

  // Current folder object if drilled down
  const currentFolder = useMemo(() => {
    if (!selectedFolderId) return null;
    return folders.find((f) => f.id === selectedFolderId) || null;
  }, [folders, selectedFolderId]);

  // Filtered Files in Current View
  const displayedFiles = useMemo(() => {
    let result = allDriveFiles.filter((file) => {
      // Folder filter
      if (selectedFolderId) {
        if (file.folder_id !== selectedFolderId) return false;
      }

      // Search query
      if (
        searchQuery.trim() &&
        !file.filename.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      // Category Filter
      const ext = file.extension.toLowerCase();
      const mime = file.mime_type.toLowerCase();

      if (activeCategory === 'documents') {
        return ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'pages', 'md'].includes(ext);
      }
      if (activeCategory === 'spreadsheets') {
        return ['xls', 'xlsx', 'csv', 'tsv', 'numbers'].includes(ext);
      }
      if (activeCategory === 'presentations') {
        return ['ppt', 'pptx', 'key'].includes(ext);
      }
      if (activeCategory === 'archives') {
        return ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext);
      }
      if (activeCategory === 'code') {
        return [
          'json',
          'ts',
          'tsx',
          'js',
          'jsx',
          'html',
          'css',
          'py',
          'sh',
          'sql',
          'yaml',
          'yml',
          'xml',
        ].includes(ext);
      }
      if (activeCategory === 'media') {
        return mime.startsWith('image/') || mime.startsWith('video/') || mime.startsWith('audio/');
      }

      return true;
    });

    result.sort((a, b) => {
      if (sortBy === 'name') return a.filename.localeCompare(b.filename);
      if (sortBy === 'size') return b.size - a.size;
      if (sortBy === 'type') return a.extension.localeCompare(b.extension);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return result;
  }, [allDriveFiles, selectedFolderId, searchQuery, activeCategory, sortBy]);

  // Helper formatters
  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  };

  // Restrained, premium system file icons (iOS Files style)
  const getFileIconConfig = (file: CloudFile) => {
    const ext = file.extension.toLowerCase();
    const mime = file.mime_type.toLowerCase();

    if (ext === 'pdf' || mime.includes('pdf')) {
      return {
        icon: FileText,
        bg: 'bg-red-500/10 border-red-500/20 text-red-400',
        badge: 'PDF',
      };
    }
    if (['xls', 'xlsx', 'csv', 'tsv', 'numbers'].includes(ext)) {
      return {
        icon: FileSpreadsheet,
        bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
        badge: 'SHEET',
      };
    }
    if (['ppt', 'pptx', 'key'].includes(ext)) {
      return {
        icon: Presentation,
        bg: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
        badge: 'SLIDES',
      };
    }
    if (['doc', 'docx', 'pages', 'rtf', 'odt', 'txt', 'md'].includes(ext)) {
      return {
        icon: FileText,
        bg: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
        badge: ext.toUpperCase(),
      };
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return {
        icon: FileArchive,
        bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
        badge: 'ZIP',
      };
    }
    if (mime.startsWith('video/')) {
      return {
        icon: Film,
        bg: 'bg-sky-500/10 border-sky-500/20 text-sky-400',
        badge: 'VIDEO',
      };
    }
    if (mime.startsWith('audio/')) {
      return {
        icon: Music,
        bg: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
        badge: 'AUDIO',
      };
    }
    if (mime.startsWith('image/')) {
      return {
        icon: ImageIcon,
        bg: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
        badge: 'IMG',
      };
    }
    if (
      [
        'json',
        'ts',
        'tsx',
        'js',
        'jsx',
        'html',
        'css',
        'py',
        'sh',
        'sql',
        'yaml',
        'yml',
      ].includes(ext)
    ) {
      return {
        icon: FileCode,
        bg: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
        badge: ext.toUpperCase(),
      };
    }

    return {
      icon: File,
      bg: 'bg-neutral-500/10 border-neutral-500/20 text-neutral-300',
      badge: ext.toUpperCase() || 'FILE',
    };
  };

  // Intelligent file tap routing
  const handleFileClick = (file: CloudFile) => {
    triggerHaptic('light');
    const mime = file.mime_type.toLowerCase();

    // If image or video -> open Media Viewer directly
    if (mime.startsWith('image/') || mime.startsWith('video/')) {
      openViewer(file);
      return;
    }

    // Otherwise open native document preview modal
    setPreviewFile(file);
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white pb-32 select-none -mx-4 sm:mx-0">
      {/* ========================================================================= */}
      {/* 1. TOP COMPACT LIQUID GLASS HEADER & CONTROLS                             */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-black/75 backdrop-blur-2xl border-b border-white/[0.08] px-4 pt-3 pb-3 transition-colors">
        <div className="flex items-center justify-between gap-3">
          {/* Back & Breadcrumb Title */}
          <div className="flex items-center gap-3 min-w-0">
            <motion.button
              type="button"
              whileTap={tapPress}
              transition={springSquishy}
              onClick={() => {
                triggerHaptic('light');
                if (selectedFolderId) {
                  setSelectedFolderId(null);
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
              <div className="flex items-center gap-1.5 text-[20px] font-bold tracking-tight text-white leading-tight truncate">
                <span>Docs</span>
                {currentFolder && (
                  <>
                    <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" />
                    <span className="text-blue-400 truncate">{currentFolder.name}</span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 font-medium leading-none truncate">
                {displayedFiles.length} items · Personal Cloud Drive
              </p>
            </div>
          </div>

          {/* Action Bar: Search, List/Grid View, Sort, Upload */}
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
              aria-label="Search files"
            >
              <Search className="w-3.5 h-3.5" />
            </motion.button>

            {/* List / Grid View Switcher */}
            <motion.button
              type="button"
              whileTap={tapPress}
              transition={springSquishy}
              onClick={() => {
                triggerHaptic('light');
                setViewMode((prev) => (prev === 'list' ? 'grid' : 'list'));
              }}
              className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-neutral-300 flex items-center justify-center cursor-pointer transition-colors"
              aria-label="Toggle view mode"
              title={viewMode === 'list' ? 'Switch to Grid View' : 'Switch to List View'}
            >
              {viewMode === 'list' ? (
                <LayoutGrid className="w-3.5 h-3.5" />
              ) : (
                <ListIcon className="w-3.5 h-3.5" />
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
              aria-label="Add file"
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
                  placeholder="Search documents, PDFs, sheets, files..."
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

        {/* Category Filter Pills (iOS Files Style) */}
        {!selectedFolderId && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2.5 -mx-1 px-1">
            {(
              [
                { id: 'all', label: 'All Files' },
                { id: 'documents', label: 'Documents & PDFs' },
                { id: 'spreadsheets', label: 'Spreadsheets' },
                { id: 'presentations', label: 'Presentations' },
                { id: 'archives', label: 'Archives (ZIP)' },
                { id: 'code', label: 'Developer & Code' },
                { id: 'media', label: 'Media Files' },
              ] as { id: DocCategoryFilter; label: string }[]
            ).map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setActiveCategory(cat.id);
                  }}
                  className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-white text-black font-semibold shadow-sm'
                      : 'bg-white/[0.06] hover:bg-white/[0.12] text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* 2. NATIVE CLOUD FOLDERS (CLEAN & MINIMAL, NOT GIANT CARDS)                */}
      {/* ========================================================================= */}
      {!selectedFolderId && folders.length > 0 && (
        <section className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Folders
            </h2>
            <span className="text-[11px] text-neutral-500 font-medium">
              {folders.length} items
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {folders.map((folder) => {
              const folderFileCount = allDriveFiles.filter(
                (f) => f.folder_id === folder.id
              ).length;

              return (
                <motion.div
                  key={folder.id}
                  whileTap={tapCard}
                  transition={springSquishy}
                  onClick={() => {
                    triggerHaptic('light');
                    setSelectedFolderId(folder.id);
                  }}
                  className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] flex items-center gap-3 cursor-pointer transition-colors group"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/25 text-blue-400 flex items-center justify-center shrink-0">
                    <FolderIcon className="w-5 h-5 fill-current" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                      {folder.name}
                    </p>
                    <p className="text-[11px] text-neutral-400 tabular-nums">
                      {folderFileCount} {folderFileCount === 1 ? 'file' : 'files'}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 3. FILE SYSTEM (DEFAULT CLEAN NATIVE LIST OR ANIMATED GRID)               */}
      {/* ========================================================================= */}
      <main className="px-4 pt-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            {selectedFolderId ? `${currentFolder?.name} Files` : 'Files'}
          </h2>
          <span className="text-[11px] text-neutral-500 tabular-nums">
            {displayedFiles.length} items
          </span>
        </div>

        {displayedFiles.length > 0 ? (
          viewMode === 'list' ? (
            /* =================================================================== */
            /* 3A. NATIVE FILE LIST (CLEAN ROWS, SUBTLE SEPARATORS, NO GIANT CARDS)*/
            /* =================================================================== */
            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] divide-y divide-white/[0.05] overflow-hidden">
              {displayedFiles.map((file) => {
                const config = getFileIconConfig(file);
                const IconComponent = config.icon;

                return (
                  <motion.div
                    key={file.id}
                    whileTap={tapCard}
                    transition={springSquishy}
                    onClick={() => handleFileClick(file)}
                    className="px-3.5 py-3 flex items-center justify-between gap-3 hover:bg-white/[0.04] transition-colors cursor-pointer group"
                  >
                    {/* Left: Icon or Thumbnail + Metadata */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* File Icon / Real Thumbnail */}
                      <div
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 overflow-hidden ${config.bg}`}
                      >
                        {file.thumbnail_url ? (
                          <SafeImage
                            src={file.thumbnail_url}
                            alt={file.filename}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <IconComponent className="w-5 h-5 stroke-[1.8]" />
                        )}
                      </div>

                      {/* Name & Metadata */}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white truncate leading-tight group-hover:text-blue-400 transition-colors">
                          {file.filename}
                        </p>
                        <p className="text-[11px] text-neutral-400 font-medium tabular-nums mt-0.5">
                          <span className="font-mono text-neutral-300 font-semibold">
                            {config.badge}
                          </span>{' '}
                          · {formatBytes(file.size)} · {formatDate(file.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* Right: Actions (Share, More) */}
                    <div className="flex items-center gap-1 shrink-0">
                      {file.is_favorite && (
                        <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500 mr-1" />
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic('light');
                          setShareTargetFile(file);
                        }}
                        className="w-8 h-8 rounded-full hover:bg-white/[0.1] text-neutral-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                        title="Share File"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic('light');
                          setActiveActionFile(file);
                        }}
                        className="w-8 h-8 rounded-full hover:bg-white/[0.1] text-neutral-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                        title="Options"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            /* =================================================================== */
            /* 3B. ANIMATED GRID VIEW                                              */
            /* =================================================================== */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {displayedFiles.map((file) => {
                const config = getFileIconConfig(file);
                const IconComponent = config.icon;

                return (
                  <motion.div
                    key={file.id}
                    whileTap={tapCard}
                    transition={springSquishy}
                    onClick={() => handleFileClick(file)}
                    className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] flex flex-col justify-between space-y-2 cursor-pointer transition-colors group aspect-square"
                  >
                    {/* Top Thumbnail or Centered Icon */}
                    <div className="w-full flex-1 rounded-xl bg-neutral-900/60 overflow-hidden flex items-center justify-center relative">
                      {file.thumbnail_url ? (
                        <SafeImage
                          src={file.thumbnail_url}
                          alt={file.filename}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className={`w-12 h-12 rounded-xl border flex items-center justify-center ${config.bg}`}
                        >
                          <IconComponent className="w-6 h-6 stroke-[1.8]" />
                        </div>
                      )}

                      {/* Type Badge */}
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-[4px] bg-black/70 backdrop-blur-md text-[9px] font-mono font-bold text-white">
                        {config.badge}
                      </span>
                    </div>

                    {/* Bottom Metadata */}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate leading-tight group-hover:text-blue-400 transition-colors">
                        {file.filename}
                      </p>
                      <p className="text-[10px] text-neutral-400 tabular-nums">
                        {formatBytes(file.size)}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )
        ) : (
          <div className="py-20 text-center px-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-white/[0.06] text-neutral-400 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6 stroke-[1.5]" />
            </div>
            <p className="text-sm font-semibold text-neutral-300">No documents found</p>
            <p className="text-xs text-neutral-500 max-w-xs mx-auto">
              Upload documents, PDFs, sheets, or code to organize your personal drive.
            </p>
            <button
              type="button"
              onClick={() => setIsUploadOpen(true)}
              className="mt-2 px-4 py-2 rounded-full bg-white text-black text-xs font-semibold shadow-sm hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              Upload Files
            </button>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* 4. FILE PREVIEW MODAL (NATIVE IOS FILES STYLE)                            */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {previewFile && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl"
            onClick={() => setPreviewFile(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 16 }}
              transition={springRelaxed}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl bg-[#141416] border border-white/10 p-6 shadow-2xl space-y-5"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                      getFileIconConfig(previewFile).bg
                    }`}
                  >
                    {React.createElement(getFileIconConfig(previewFile).icon, {
                      className: 'w-5 h-5',
                    })}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-white truncate max-w-[200px]">
                      {previewFile.filename}
                    </h3>
                    <p className="text-[11px] text-neutral-400">
                      {formatBytes(previewFile.size)} · {previewFile.extension.toUpperCase()}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 flex items-center justify-center cursor-pointer text-xs"
                >
                  ✕
                </button>
              </div>

              {/* Preview Content Area */}
              <div className="aspect-[4/3] w-full rounded-2xl bg-neutral-900/80 border border-white/[0.06] overflow-hidden flex flex-col items-center justify-center p-6 text-center space-y-2">
                {previewFile.thumbnail_url ? (
                  <SafeImage
                    src={previewFile.thumbnail_url}
                    alt={previewFile.filename}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <>
                    <div
                      className={`w-14 h-14 rounded-2xl border flex items-center justify-center ${
                        getFileIconConfig(previewFile).bg
                      }`}
                    >
                      {React.createElement(getFileIconConfig(previewFile).icon, {
                        className: 'w-7 h-7',
                      })}
                    </div>
                    <p className="text-xs font-semibold text-white pt-1">
                      {previewFile.filename}
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      Ready to view, share or export
                    </p>
                  </>
                )}
              </div>

              {/* Action Toolbar */}
              <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                <a
                  href={previewFile.storage_path}
                  download={previewFile.filename}
                  className="p-3 rounded-xl bg-white text-black hover:bg-neutral-200 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download File</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setShareTargetFile(previewFile);
                    setPreviewFile(null);
                  }}
                  className="p-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white flex items-center justify-center gap-2 transition-colors cursor-pointer border border-white/10"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share Link</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 5. CONTEXT ACTION SHEET (OPTIONS)                                         */}
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
              <div className="w-10 h-1.5 rounded-full bg-white/20 mx-auto cursor-grab" />

              <div className="flex items-center gap-3 pb-3 border-b border-white/[0.08]">
                <div
                  className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${
                    getFileIconConfig(activeActionFile).bg
                  }`}
                >
                  {React.createElement(getFileIconConfig(activeActionFile).icon, {
                    className: 'w-5 h-5',
                  })}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate">
                    {activeActionFile.filename}
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    {formatBytes(activeActionFile.size)} · {formatDate(activeActionFile.created_at)}
                  </p>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setShareTargetFile(activeActionFile);
                    setActiveActionFile(null);
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-white/[0.06] flex items-center gap-3 text-neutral-200 transition-colors text-left cursor-pointer"
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
                  className="w-full p-2.5 rounded-xl hover:bg-white/[0.06] flex items-center gap-3 text-neutral-200 transition-colors text-left cursor-pointer"
                >
                  <Heart
                    className={`w-4 h-4 ${
                      activeActionFile.is_favorite
                        ? 'fill-red-500 text-red-500'
                        : 'text-neutral-400'
                    }`}
                  />
                  <span>
                    {activeActionFile.is_favorite
                      ? 'Remove from Favorites'
                      : 'Add to Favorites'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setDetailsFile(activeActionFile);
                    setActiveActionFile(null);
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-white/[0.06] flex items-center gap-3 text-neutral-200 transition-colors text-left cursor-pointer"
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
                  className="w-full p-2.5 rounded-xl hover:bg-white/[0.06] flex items-center gap-3 text-neutral-200 transition-colors text-left cursor-pointer"
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
                  className="w-full p-2.5 rounded-xl hover:bg-white/[0.06] flex items-center gap-3 text-neutral-200 transition-colors text-left cursor-pointer"
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
                  className="w-full p-2.5 rounded-xl hover:bg-red-500/10 flex items-center gap-3 text-red-400 transition-colors text-left cursor-pointer"
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
                Sort Files By
              </h3>

              {(
                [
                  { id: 'date', label: 'Date Modified (Newest First)' },
                  { id: 'name', label: 'File Name (A to Z)' },
                  { id: 'size', label: 'File Size (Largest First)' },
                  { id: 'type', label: 'Kind / File Extension' },
                ] as { id: 'date' | 'name' | 'size' | 'type'; label: string }[]
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
