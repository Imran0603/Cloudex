import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  MapPin,
  Folder as FolderIcon,
  CheckCircle2,
  Calendar,
  Smartphone,
  HardDrive,
  Hash,
  FileText,
  Share2,
  Layers,
  Image as ImageIcon,
} from 'lucide-react';
import { CloudFile } from '../types/cloud';
import {
  springJelly,
  jellyScaleKeyframes,
  jellyScaleTransition,
  easeJelly,
  springSnappy,
} from '../motion';

interface PhotoInfoSheetProps {
  file: CloudFile;
  isOpen: boolean;
  onClose: () => void;
  folderName?: string;
  albumName?: string;
}

export const PhotoInfoSheet: React.FC<PhotoInfoSheetProps> = ({
  file,
  isOpen,
  onClose,
  folderName = 'Main Library',
  albumName,
}) => {
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [windowMode, setWindowMode] = useState<'compact' | 'expanded'>('compact');

  if (!isOpen) return null;

  const handleToggleExpand = () => {
    setWindowMode((prev) => (prev === 'compact' ? 'expanded' : 'compact'));
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const formattedDate = new Date(file.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedTime = new Date(file.created_at).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const device = file.source_device || 'iPhone 17 Pro';
  const location = file.location || 'Kuala Lumpur, Malaysia';
  const width = file.dimensions?.width || 1920;
  const height = file.dimensions?.height || 1080;

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
            height: windowMode === 'expanded' ? '100dvh' : '80dvh',
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
          {/* Drag Handle Indicator */}
          <div
            onClick={handleToggleExpand}
            className="w-12 h-1.5 bg-white/25 rounded-full mx-auto -mt-2 mb-3 cursor-grab active:cursor-grabbing hover:bg-white/40 transition-colors"
            title="Swipe up to expand, swipe down to close"
          />

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="text-xl font-semibold text-white tracking-tight truncate">
                {file.filename}
              </h3>
              <p className="text-[13px] text-[#A1A1A1] mt-0.5">
                {formatBytes(file.size)} · {file.extension.toUpperCase()}
              </p>
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
                aria-label="Close Info"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Core Info Grid */}
          <div className="grid grid-cols-2 gap-3.5 bg-black/30 rounded-[22px] p-4 border border-white/10 text-sm">
            {/* Date & Time */}
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-[#8E8E93] uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Date & Time
              </span>
              <p className="text-white font-medium text-[13px] leading-tight">
                {formattedDate}
              </p>
              <p className="text-[#A1A1A1] text-xs">{formattedTime}</p>
            </div>

            {/* Device */}
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-[#8E8E93] uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" /> Device
              </span>
              <p className="text-white font-medium text-[13px] leading-tight truncate">
                {device}
              </p>
              <p className="text-[#A1A1A1] text-xs">Apple Camera System</p>
            </div>

            {/* Resolution */}
            <div className="space-y-1 pt-1 border-t border-white/5">
              <span className="text-[11px] font-medium text-[#8E8E93] uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" /> Dimensions
              </span>
              <p className="text-white font-medium text-[13px] tabular-nums leading-tight">
                {width} × {height}
              </p>
              <p className="text-[#A1A1A1] text-xs">
                {((width * height) / 1000000).toFixed(1)} Megapixels
              </p>
            </div>

            {/* Cloud Status */}
            <div className="space-y-1 pt-1 border-t border-white/5">
              <span className="text-[11px] font-medium text-[#8E8E93] uppercase tracking-wider flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5" /> Cloud Storage
              </span>
              <p className="text-emerald-400 font-medium text-[13px] flex items-center gap-1 leading-tight">
                <CheckCircle2 className="w-3.5 h-3.5 inline" /> Backed Up
              </p>
              <p className="text-[#A1A1A1] text-xs">Encrypted & Synced</p>
            </div>
          </div>

          {/* Location & Organization */}
          <div className="space-y-2 bg-black/20 rounded-[20px] p-3.5 border border-white/5 text-sm">
            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-[#8E8E93] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-400" /> Location
              </span>
              <span className="text-white font-medium truncate max-w-[200px]">
                {location}
              </span>
            </div>
            <div className="h-[0.5px] bg-white/5" />
            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-[#8E8E93] flex items-center gap-2">
                <FolderIcon className="w-4 h-4 text-amber-400" /> Folder
              </span>
              <span className="text-white font-medium truncate max-w-[200px]">
                {folderName}
              </span>
            </div>
            {albumName && (
              <>
                <div className="h-[0.5px] bg-white/5" />
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-[#8E8E93] flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-400" /> Album
                  </span>
                  <span className="text-white font-medium truncate max-w-[200px]">
                    {albumName}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Advanced Details Collapsible Button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full py-3 px-4 rounded-[18px] bg-white/[0.06] hover:bg-white/10 active:scale-[0.99] transition-all flex items-center justify-between text-sm font-medium text-white cursor-pointer"
            >
              <span>{showAdvanced ? 'Hide Advanced Details' : 'Show More Details'}</span>
              {showAdvanced ? (
                <ChevronUp className="w-4 h-4 text-[#A1A1A1]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#A1A1A1]" />
              )}
            </button>

            {/* Advanced Metadata List */}
            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={springSnappy}
                  className="overflow-hidden space-y-2.5 pt-3 text-xs"
                >
                  <div className="p-3.5 bg-black/40 rounded-[18px] border border-white/5 space-y-2 divide-y divide-white/5">
                    <div className="flex items-center justify-between py-1">
                      <span className="text-[#8E8E93]">File ID</span>
                      <span className="text-white font-mono text-[11px] truncate max-w-[220px]">
                        {file.id}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-[#8E8E93]">MIME Type</span>
                      <span className="text-white font-mono text-[11px]">{file.mime_type}</span>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-[#8E8E93]">SHA-256 Checksum</span>
                      <span className="text-white font-mono text-[11px] truncate max-w-[200px]">
                        {file.hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-[#8E8E93]">Uploaded At</span>
                      <span className="text-white">
                        {new Date(file.uploaded_at || file.created_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-[#8E8E93]">Modified At</span>
                      <span className="text-white">
                        {new Date(file.modified_at || file.created_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-[#8E8E93]">Storage Path</span>
                      <span className="text-white font-mono text-[11px] truncate max-w-[220px]">
                        {file.storage_path}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-[#8E8E93]">Original Storage Path</span>
                      <span className="text-white font-mono text-[11px] truncate max-w-[220px]">
                        {file.original_storage_path || file.storage_path}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-[#8E8E93]">Sharing Status</span>
                      <span className="text-white">
                        {file.is_shared ? 'Public Link Active' : 'Private'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-[#8E8E93]">Vault Isolation</span>
                      <span className="text-white">
                        {file.is_vault ? 'Protected in Vault' : 'Standard Library'}
                      </span>
                    </div>

                    {file.edit_history && file.edit_history.length > 0 && (
                      <div className="flex items-center justify-between py-1">
                        <span className="text-[#8E8E93]">Edit History</span>
                        <span className="text-blue-400 font-medium">
                          {file.edit_history.length} revision(s) recorded
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
