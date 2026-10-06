import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Maximize2,
  Minimize2,
  Info,
  Edit2,
  FolderInput,
  Copy,
  Layers,
  Files,
  Download,
  WifiOff,
  HardDrive,
  Shield,
  EyeOff,
  Share2,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { CloudFile } from '../types/cloud';
import {
  springJelly,
  jellyScaleKeyframes,
  jellyScaleTransition,
  easeJelly,
} from '../motion';

interface PhotoMoreSheetProps {
  file: CloudFile;
  isOpen: boolean;
  onClose: () => void;
  onOpenDetails: () => void;
  onRename: () => void;
  onMove: () => void;
  onAddToAlbum: () => void;
  onDuplicate: () => void;
  onDownload: () => void;
  onMoveToVault: () => void;
  onToggleHide: () => void;
  onShare: () => void;
  onDelete: () => void;
  onMakeOffline: () => void;
  onFreeUpStorage: () => void;
}

export const PhotoMoreSheet: React.FC<PhotoMoreSheetProps> = ({
  file,
  isOpen,
  onClose,
  onOpenDetails,
  onRename,
  onMove,
  onAddToAlbum,
  onDuplicate,
  onDownload,
  onMoveToVault,
  onToggleHide,
  onShare,
  onDelete,
  onMakeOffline,
  onFreeUpStorage,
}) => {
  const [windowMode, setWindowMode] = useState<'compact' | 'expanded'>('compact');

  if (!isOpen) return null;

  const handleToggleExpand = () => {
    setWindowMode((prev) => (prev === 'compact' ? 'expanded' : 'compact'));
  };

  return (
    <AnimatePresence>
      <div
        onClick={onClose}
        className="fixed inset-0 z-[1200] bg-black/60 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-auto"
      >
        <motion.div
          initial={{ y: '100%', opacity: 0, scale: 0.95 }}
          animate={{
            y: 0,
            opacity: 1,
            scale: [...jellyScaleKeyframes],
            height: windowMode === 'expanded' ? '100dvh' : '82dvh',
            borderRadius: windowMode === 'expanded' ? '0px' : '36px 36px 0 0',
          }}
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
            const { offset, velocity } = info;
            // Swipe Up to Expand / Maximize
            if (offset.y < -45 || velocity.y < -300) {
              setWindowMode('expanded');
            }
            // Swipe Down to Collapse / Close
            else if (offset.y > 65 || velocity.y > 300) {
              if (windowMode === 'expanded') {
                setWindowMode('compact');
              } else {
                onClose();
              }
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg liquid-glass-sheet p-6 space-y-5 overflow-y-auto no-scrollbar shadow-2xl relative border-t sm:border border-white/20 select-none flex flex-col"
        >
          {/* Handle */}
          <div
            onClick={handleToggleExpand}
            className="w-12 h-1.5 bg-white/25 rounded-full mx-auto -mt-2 mb-3 cursor-grab active:cursor-grabbing hover:bg-white/40 transition-colors"
            title="Swipe up to expand, swipe down to close"
          />

          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div>
              <h3 className="text-lg font-semibold text-white tracking-tight truncate max-w-[280px]">
                {file.filename}
              </h3>
              <p className="text-xs text-[#A1A1A1]">Photo Actions & Controls</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleExpand}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-[#D0D0D0] hover:text-white flex items-center justify-center cursor-pointer shrink-0"
                title={windowMode === 'expanded' ? 'Collapse sheet' : 'Expand sheet'}
              >
                {windowMode === 'expanded' ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-11 h-11 rounded-full liquid-glass-base flex items-center justify-center text-white cursor-pointer shadow-lg hover:border-white/35 active:scale-95 transition-transform touch-manipulation shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Group 1: FILE */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider px-2">
              File
            </span>
            <div className="rounded-[20px] bg-black/40 border border-white/5 overflow-hidden divide-y divide-white/5">
              <button
                onClick={() => {
                  onClose();
                  onOpenDetails();
                }}
                className="w-full px-4 py-3 flex items-center gap-3 text-sm text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Info className="w-4 h-4 text-blue-400" />
                <span>Details & Metadata</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onRename();
                }}
                className="w-full px-4 py-3 flex items-center gap-3 text-sm text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Edit2 className="w-4 h-4 text-blue-400" />
                <span>Rename File</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onMove();
                }}
                className="w-full px-4 py-3 flex items-center gap-3 text-sm text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <FolderInput className="w-4 h-4 text-amber-400" />
                <span>Move to Folder...</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  navigator.clipboard.writeText(window.location.origin + file.storage_path);
                }}
                className="w-full px-4 py-3 flex items-center gap-3 text-sm text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Copy className="w-4 h-4 text-neutral-300" />
                <span>Copy Path / Link</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onAddToAlbum();
                }}
                className="w-full px-4 py-3 flex items-center gap-3 text-sm text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Layers className="w-4 h-4 text-purple-400" />
                <span>Add to Album...</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onDuplicate();
                }}
                className="w-full px-4 py-3 flex items-center gap-3 text-sm text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Files className="w-4 h-4 text-emerald-400" />
                <span>Duplicate Photo</span>
              </button>
            </div>
          </div>

          {/* Group 2: STORAGE */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider px-2">
              Storage
            </span>
            <div className="rounded-[20px] bg-black/40 border border-white/5 overflow-hidden divide-y divide-white/5">
              <button
                onClick={() => {
                  onClose();
                  onDownload();
                }}
                className="w-full px-4 py-3 flex items-center gap-3 text-sm text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-blue-400" />
                <span>Download High-Res Original</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onMakeOffline();
                }}
                className="w-full px-4 py-3 flex items-center gap-3 text-sm text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <WifiOff className="w-4 h-4 text-teal-400" />
                <span>Make Available Offline</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onFreeUpStorage();
                }}
                className="w-full px-4 py-3 flex items-center gap-3 text-sm text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <HardDrive className="w-4 h-4 text-orange-400" />
                <span>Free Up Device Storage</span>
              </button>
            </div>
          </div>

          {/* Group 3: PRIVACY */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider px-2">
              Privacy
            </span>
            <div className="rounded-[20px] bg-black/40 border border-white/5 overflow-hidden divide-y divide-white/5">
              <button
                onClick={() => {
                  onClose();
                  onMoveToVault();
                }}
                className="w-full px-4 py-3 flex items-center gap-3 text-sm text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Shield className="w-4 h-4 text-blue-400" />
                <span>Move to Private Vault</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onToggleHide();
                }}
                className="w-full px-4 py-3 flex items-center gap-3 text-sm text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <EyeOff className="w-4 h-4 text-neutral-300" />
                <span>{file.is_hidden ? 'Unhide Photo' : 'Hide from Main Grid'}</span>
              </button>
            </div>
          </div>

          {/* Group 4: SHARING */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider px-2">
              Sharing
            </span>
            <div className="rounded-[20px] bg-black/40 border border-white/5 overflow-hidden divide-y divide-white/5">
              <button
                onClick={() => {
                  onClose();
                  onShare();
                }}
                className="w-full px-4 py-3 flex items-center gap-3 text-sm text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-blue-400" />
                <span>Create Share Link</span>
              </button>
            </div>
          </div>

          {/* Group 5: OTHER & DESTRUCTIVE (Delete at bottom, red) */}
          <div className="space-y-1 pt-1">
            <span className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider px-2">
              Other
            </span>
            <div className="rounded-[20px] bg-black/40 border border-white/5 overflow-hidden divide-y divide-white/5">
              <button
                onClick={() => {
                  onClose();
                  window.open(file.storage_path, '_blank');
                }}
                className="w-full px-4 py-3 flex items-center gap-3 text-sm text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 text-neutral-300" />
                <span>Open in New Tab</span>
              </button>

              {/* Destructive Delete Button */}
              <button
                onClick={() => {
                  onClose();
                  onDelete();
                }}
                className="w-full px-4 py-3.5 flex items-center gap-3 text-sm font-semibold text-[#EF4444] hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-[#EF4444]" />
                <span>Delete Photo</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
