import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Maximize2,
  Minimize2,
  FileText,
  FileArchive,
  Film,
  Image as ImageIcon,
  Heart,
  Shield,
  Download,
  Trash2,
  Share2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Copy,
  Edit2,
} from 'lucide-react';
import { useCloud } from '../context/CloudContext';
import { CloudFile } from '../types/cloud';
import { StackedModalWrapper } from '../context/ModalStackContext';
import {
  springJelly,
  jellyScaleKeyframes,
  jellyScaleTransition,
  easeJelly,
} from '../motion';

export const FileDetailsSheet: React.FC = () => {
  const {
    detailsFile,
    setDetailsFile,
    setEditingFile,
    toggleFavorite,
    trashFile,
    moveToVault,
    triggerHaptic,
    showToast,
    prefersReducedMotion,
  } = useCloud();

  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState<boolean>(false);
  const [windowMode, setWindowMode] = useState<'compact' | 'expanded'>('compact');

  if (!detailsFile) return null;

  const handleToggleExpand = () => {
    triggerHaptic('light');
    setWindowMode((prev) => (prev === 'compact' ? 'expanded' : 'compact'));
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const copyToClipboard = (text: string, label: string) => {
    triggerHaptic('light');
    navigator.clipboard?.writeText(text);
    showToast(`${label} copied to clipboard`, 'info');
  };

  return (
    <StackedModalWrapper
      id="file-details-sheet"
      isOpen={Boolean(detailsFile)}
      onClose={() => setDetailsFile(null)}
      type="sheet"
    >
      <motion.div
        initial={{ y: '100%', opacity: 0, scale: 0.95 }}
        animate={{
          y: 0,
          opacity: 1,
          scale: [...jellyScaleKeyframes],
          height: windowMode === 'expanded' ? '100dvh' : '82dvh',
          borderRadius: windowMode === 'expanded' ? '0px' : '32px 32px 0 0',
        }}
        exit={{ y: '100%', opacity: 0, scale: 0.95 }}
        transition={
          prefersReducedMotion
            ? { duration: 0.15 }
            : {
                y: springJelly,
                scale: jellyScaleTransition,
                opacity: { duration: 0.35, ease: easeJelly },
              }
        }
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.4}
        onDragEnd={(e, info) => {
          const { offset, velocity } = info;
          // Swipe Up to Expand
          if (offset.y < -50 || velocity.y < -350) {
            triggerHaptic('light');
            setWindowMode('expanded');
          }
          // Swipe Down to Collapse / Close
          else if (offset.y > 70 || velocity.y > 350) {
            triggerHaptic('light');
            if (windowMode === 'expanded') {
              setWindowMode('compact');
            } else {
              setDetailsFile(null);
            }
          }
        }}
        className="w-full max-w-lg liquid-glass-sheet p-6 space-y-5 overflow-y-auto no-scrollbar mx-auto shadow-2xl relative select-none"
      >
        {/* Grab bar */}
        <div
          onClick={handleToggleExpand}
          className="w-12 h-1.5 bg-neutral-600 rounded-full mx-auto cursor-grab active:cursor-grabbing hover:bg-neutral-500 transition-colors"
          title="Swipe up to expand, swipe down to close"
        />

        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">File Information</h3>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleToggleExpand}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-neutral-300 hover:text-white transition-colors cursor-pointer"
              title={windowMode === 'expanded' ? 'Collapse sheet' : 'Expand sheet'}
            >
              {windowMode === 'expanded' ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => setDetailsFile(null)}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-neutral-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* File Preview Header */}
        <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800">
          <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center shrink-0 overflow-hidden">
            {detailsFile.thumbnail_url ? (
              <img
                src={detailsFile.thumbnail_url}
                alt={detailsFile.filename}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : detailsFile.mime_type.startsWith('video/') ? (
              <Film className="w-6 h-6 text-neutral-400" />
            ) : detailsFile.extension === 'zip' ? (
              <FileArchive className="w-6 h-6 text-neutral-400" />
            ) : (
              <FileText className="w-6 h-6 text-neutral-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-white truncate">{detailsFile.filename}</p>
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setEditingFile(detailsFile);
                }}
                className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-xs text-white font-medium flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                title="Edit / Rename"
              >
                <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Rename / Edit</span>
              </button>
            </div>
            <p className="text-xs text-neutral-400 tabular-numbers">
              {formatBytes(detailsFile.size)} · {detailsFile.extension.toUpperCase()}
            </p>
          </div>
        </div>

        {/* Clean Standard Details */}
        <div className="rounded-2xl bg-neutral-900/80 border border-neutral-800 divide-y divide-neutral-800/80 text-xs">
          <div className="p-3 flex items-center justify-between">
            <span className="text-neutral-400">Created</span>
            <span className="text-white tabular-numbers">{new Date(detailsFile.created_at).toLocaleString()}</span>
          </div>

          <div className="p-3 flex items-center justify-between">
            <span className="text-neutral-400">Source Device</span>
            <span className="text-white">{detailsFile.source_device}</span>
          </div>

          <div className="p-3 flex items-center justify-between">
            <span className="text-neutral-400">Backup Status</span>
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Synced to Hugging Face Cloud
            </span>
          </div>

          <div className="p-3 flex items-center justify-between">
            <span className="text-neutral-400">Vault Isolation</span>
            <span className={detailsFile.is_vault ? 'text-blue-400 font-medium' : 'text-neutral-400'}>
              {detailsFile.is_vault ? 'Protected in Vault' : 'Standard Library'}
            </span>
          </div>
        </div>

        {/* Advanced Technical Details Accordion */}
        <div className="rounded-2xl bg-neutral-900/40 border border-neutral-800/80 overflow-hidden">
          <button
            onClick={() => setIsAdvancedExpanded(!isAdvancedExpanded)}
            className="w-full p-3.5 flex items-center justify-between text-xs font-medium text-neutral-400 hover:text-white cursor-pointer"
          >
            <span>Advanced Cryptographic &amp; Storage Details</span>
            {isAdvancedExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {isAdvancedExpanded && (
            <div className="p-3.5 pt-0 space-y-2.5 text-[11px] border-t border-neutral-800/60">
              <div>
                <span className="text-neutral-500 block mb-0.5">SHA-256 Checksum</span>
                <div className="flex items-center justify-between bg-black/60 p-2 rounded-lg">
                  <span className="text-neutral-300 break-all mr-2">{detailsFile.hash}</span>
                  <button
                    onClick={() => copyToClipboard(detailsFile.hash, 'Checksum')}
                    className="text-neutral-400 hover:text-white shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-neutral-500">MIME Type</span>
                <span className="text-neutral-300">{detailsFile.mime_type}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Internal Storage ID</span>
                <span className="text-neutral-300">{detailsFile.id}</span>
              </div>

              {detailsFile.dimensions && (
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Resolution</span>
                  <span className="text-neutral-300 tabular-numbers">
                    {detailsFile.dimensions.width} × {detailsFile.dimensions.height}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Actions Row */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          <button
            onClick={() => toggleFavorite(detailsFile.id)}
            className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white cursor-pointer"
          >
            <Heart className={`w-4 h-4 mb-1 ${detailsFile.is_favorite ? 'fill-red-400 text-red-400' : ''}`} />
            <span className="text-[10px]">Favorite</span>
          </button>

          <button
            onClick={() => moveToVault(detailsFile.id)}
            className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white cursor-pointer"
          >
            <Shield className="w-4 h-4 mb-1 text-blue-400" />
            <span className="text-[10px]">{detailsFile.is_vault ? 'In Vault' : 'To Vault'}</span>
          </button>

          <a
            href={detailsFile.storage_path}
            download={detailsFile.filename}
            className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white cursor-pointer"
          >
            <Download className="w-4 h-4 mb-1" />
            <span className="text-[10px]">Download</span>
          </a>

          <button
            onClick={() => {
              trashFile(detailsFile.id);
              setDetailsFile(null);
            }}
            className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-red-400 hover:text-red-300 cursor-pointer"
          >
            <Trash2 className="w-4 h-4 mb-1" />
            <span className="text-[10px]">Delete</span>
          </button>
        </div>
      </motion.div>
    </StackedModalWrapper>
  );
};
