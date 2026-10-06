import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useMotionValue } from 'motion/react';
import {
  X,
  Maximize2,
  Minimize2,
  FileText,
  Film,
  Music,
  FileCode,
  FileArchive,
  Table,
  Image as ImageIcon,
  Heart,
  Share2,
  Download,
  Info,
  ExternalLink,
  BookOpen,
  Edit2,
} from 'lucide-react';
import { CloudFile } from '../types/cloud';
import { useCloud } from '../context/CloudContext';
import { useModalStack } from '../context/ModalStackContext';
import {
  springJelly,
  jellyScaleKeyframes,
  jellyScaleTransition,
  easeJelly,
} from '../motion';
import { DocumentViewer } from './viewers/DocumentViewer';
import { AudioPlayerViewer } from './viewers/AudioPlayerViewer';
import { VideoPlayerViewer } from './viewers/VideoPlayerViewer';
import { CodeViewer } from './viewers/CodeViewer';
import { SpreadsheetViewer } from './viewers/SpreadsheetViewer';
import { ArchiveViewer } from './viewers/ArchiveViewer';

interface UniversalFileModalProps {
  file: CloudFile | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenDetails: () => void;
}

export const UniversalFileModal: React.FC<UniversalFileModalProps> = ({
  file,
  isOpen,
  onClose,
  onOpenDetails,
}) => {
  const {
    toggleFavorite,
    trashFile,
    setShareTargetFile,
    setEditingFile,
    triggerHaptic,
    showToast,
  } = useCloud();

  const { registerModal, unregisterModal, getZIndex } = useModalStack();

  // Window size mode: 'compact' (~74vh) vs 'expanded' (100dvh fullscreen)
  const [windowMode, setWindowMode] = useState<'compact' | 'expanded'>('compact');

  // PDF view mode toggle: 'iframe' vs 'reader'
  const [pdfViewMode, setPdfViewMode] = useState<'iframe' | 'reader'>('iframe');

  // Video playback ref
  const videoRef = useRef<HTMLVideoElement>(null);

  // Register in ModalStack for z-index order, Esc key, browser back button
  const modalId = file ? `universal-file-viewer-${file.id}` : '';
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (modalId && isOpen) {
      registerModal(modalId, () => onCloseRef.current(), 'viewer');
      return () => unregisterModal(modalId);
    }
  }, [modalId, isOpen, registerModal, unregisterModal]);

  // Reset window mode on file change or open
  useEffect(() => {
    if (isOpen) {
      setWindowMode('compact');
      setPdfViewMode('iframe');
    }
  }, [isOpen, file?.id]);

  if (!isOpen || !file) return null;

  const zIndex = Math.max(1000, getZIndex(modalId));
  const ext = file.extension.toLowerCase();
  const mime = file.mime_type.toLowerCase();

  // MIME type & format detection
  const isVideo = mime.startsWith('video/') || ['mp4', 'mov', 'webm', 'mkv', 'avi'].includes(ext);
  const isPdf = mime === 'application/pdf' || ext === 'pdf';
  const isAudio = mime.startsWith('audio/') || ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg'].includes(ext);
  const isCodeOrText =
    mime.startsWith('text/') ||
    mime === 'application/json' ||
    mime === 'application/javascript' ||
    ['txt', 'md', 'json', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'py', 'sql', 'sh', 'xml', 'log', 'yaml', 'yml'].includes(ext);
  const isSpreadsheet = mime.includes('spreadsheet') || mime.includes('excel') || ['csv', 'xls', 'xlsx', 'tsv'].includes(ext);
  const isArchive = mime.includes('zip') || mime.includes('compressed') || ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext);
  const isImage = mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'heic'].includes(ext);

  const handleToggleExpand = () => {
    triggerHaptic('light');
    setWindowMode((prev) => (prev === 'compact' ? 'expanded' : 'compact'));
  };

  const handleDownload = () => {
    triggerHaptic('light');
    const a = document.createElement('a');
    a.href = file.storage_path;
    a.download = file.filename;
    a.click();
    showToast(`Downloading "${file.filename}"`, 'info');
  };

  const handleShare = () => {
    triggerHaptic('light');
    setShareTargetFile(file);
  };

  const modalContent = (
    <AnimatePresence>
      <div
        style={{ zIndex }}
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-end justify-center pointer-events-auto select-none touch-none"
      >
        <motion.div
          initial={{ y: '100%', opacity: 0, scale: 0.95 }}
          animate={{
            y: 0,
            opacity: 1,
            scale: [...jellyScaleKeyframes],
            height: windowMode === 'expanded' ? '100dvh' : '78dvh',
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
            // SWIPE UP: Expand / Maximize to Fullscreen
            if (offset.y < -45 || velocity.y < -320) {
              triggerHaptic('light');
              setWindowMode('expanded');
            }
            // SWIPE DOWN: Collapse to compact or Close
            else if (offset.y > 65 || velocity.y > 320) {
              triggerHaptic('light');
              if (windowMode === 'expanded') {
                setWindowMode('compact');
              } else {
                onClose();
              }
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-5xl bg-[#121215] border-t border-white/20 shadow-2xl flex flex-col overflow-hidden relative select-none"
        >
          {/* =========================================================================
              1. TOP BAR: Drag Pill & Window Header
              - Drag Pill for smooth swipe up / down
              - File badge and title
              - Glass circle close button (w-11 h-11)
             ========================================================================= */}
          <div className="pt-2 px-4 pb-2.5 bg-[#16161B]/85 backdrop-blur-md border-b border-white/10 shrink-0">
            {/* Grab Pill Handle - Visual gesture indicator */}
            <div
              onClick={handleToggleExpand}
              className="w-12 h-1.5 bg-white/25 rounded-full mx-auto mb-2 cursor-grab active:cursor-grabbing hover:bg-white/45 transition-colors"
              title="Swipe up to expand, swipe down to close"
            />

            <div className="flex items-center justify-between gap-3">
              {/* Left: File Badge & Title */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  {isVideo ? (
                    <Film className="w-5 h-5 text-blue-400" />
                  ) : isPdf ? (
                    <FileText className="w-5 h-5 text-red-400" />
                  ) : isAudio ? (
                    <Music className="w-5 h-5 text-purple-400" />
                  ) : isCodeOrText ? (
                    <FileCode className="w-5 h-5 text-emerald-400" />
                  ) : isSpreadsheet ? (
                    <Table className="w-5 h-5 text-teal-400" />
                  ) : isArchive ? (
                    <FileArchive className="w-5 h-5 text-amber-400" />
                  ) : isImage ? (
                    <ImageIcon className="w-5 h-5 text-blue-400" />
                  ) : (
                    <FileText className="w-5 h-5 text-[#A1A1A1]" />
                  )}
                </div>

                <div className="min-w-0">
                  <h3 className="text-[15px] font-semibold text-white tracking-tight truncate leading-tight">
                    {file.filename}
                  </h3>
                  <p className="text-[12px] text-[#A1A1A1] mt-0.5 truncate tabular-nums">
                    {ext.toUpperCase()} · {(file.size / 1024).toFixed(1)} KB · {file.source_device || 'Personal Cloud'}
                  </p>
                </div>
              </div>

              {/* Right: Window Controls (Favorite, Details, Maximize/Minimize, Glass-Circle Close) */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Favorite */}
                <button
                  type="button"
                  onClick={() => toggleFavorite(file.id)}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-[#D0D0D0] hover:text-white flex items-center justify-center transition-all cursor-pointer"
                  title="Favorite"
                  aria-label="Toggle favorite"
                >
                  <Heart
                    className={`w-4 h-4 transition-colors ${
                      file.is_favorite ? 'fill-red-500 text-red-500' : 'text-white'
                    }`}
                  />
                </button>

                {/* Edit / Rename File Button */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setEditingFile(file);
                  }}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-[#D0D0D0] hover:text-white flex items-center justify-center transition-all cursor-pointer"
                  title="Rename / Edit File"
                  aria-label="Rename or edit file"
                >
                  <Edit2 className="w-4 h-4 text-blue-400" />
                </button>

                {/* Details Sheet Button */}
                <button
                  type="button"
                  onClick={onOpenDetails}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-[#D0D0D0] hover:text-white flex items-center justify-center transition-all cursor-pointer"
                  title="View Details"
                  aria-label="View file details"
                >
                  <Info className="w-4 h-4" />
                </button>

                {/* Maximize / Minimize Toggle */}
                <button
                  type="button"
                  onClick={handleToggleExpand}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-[#D0D0D0] hover:text-white flex items-center justify-center transition-all cursor-pointer"
                  title={windowMode === 'expanded' ? 'Collapse window' : 'Expand window'}
                  aria-label={windowMode === 'expanded' ? 'Collapse window' : 'Expand window'}
                >
                  {windowMode === 'expanded' ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </button>

                {/* Established Glass-Circle Close Button (Spec: 44x44, liquid-glass-base, X icon) */}
                <button
                  type="button"
                  data-testid="universal-viewer-close-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic('light');
                    onClose();
                  }}
                  className="w-11 h-11 rounded-full liquid-glass-base flex items-center justify-center text-white cursor-pointer shadow-lg hover:border-white/35 active:scale-95 transition-transform touch-manipulation flex-none"
                  aria-label="Close viewer"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>

          {/* =========================================================================
              2. DYNAMIC CONTENT VIEWERS BASED ON FILE MIME-TYPE
             ========================================================================= */}
          <div className="flex-1 overflow-hidden p-2 sm:p-4 bg-[#0A0A0C]">
            {/* A. VIDEO VIEWER: Robust HTML5 & Web Audio Video Controller */}
            {isVideo ? (
              <VideoPlayerViewer
                file={file}
                onShare={handleShare}
                onDownload={handleDownload}
                triggerHaptic={triggerHaptic}
              />
            ) : isPdf ? (
              /* B. PDF VIEWER: iframe-based viewer for PDFs with reader toggle */
              <div className="w-full h-full relative rounded-2xl overflow-hidden bg-[#151518] border border-white/10 flex flex-col shadow-2xl">
                {/* PDF Sub-Bar */}
                <div className="h-10 px-4 bg-black/50 border-b border-white/10 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white uppercase tracking-wider">
                      PDF Document
                    </span>
                    <span className="text-[11px] text-[#A1A1A1]">
                      {pdfViewMode === 'iframe' ? '(Native Frame)' : '(Interactive Reader)'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Toggle between iframe embed and custom reader */}
                    <button
                      onClick={() => setPdfViewMode((m) => (m === 'iframe' ? 'reader' : 'iframe'))}
                      className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-xs text-white transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                      <span>{pdfViewMode === 'iframe' ? 'Switch to Reader' : 'Switch to Browser Frame'}</span>
                    </button>

                    <button
                      onClick={() => window.open(file.storage_path, '_blank')}
                      className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
                      title="Open in new window"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* PDF Content Area */}
                <div className="flex-1 w-full h-full overflow-hidden bg-white/5">
                  {pdfViewMode === 'iframe' ? (
                    <iframe
                      src={`${file.storage_path}#toolbar=1&navpanes=0`}
                      title={file.filename}
                      className="w-full h-full border-0 bg-neutral-900"
                    />
                  ) : (
                    <DocumentViewer
                      file={file}
                      onShare={handleShare}
                      onDownload={handleDownload}
                    />
                  )}
                </div>
              </div>
            ) : isCodeOrText ? (
              /* C. CODE & PLAIN TEXT: Code-highlighted text block with line numbers & copy */
              <CodeViewer
                file={file}
                onShare={handleShare}
                onDownload={handleDownload}
              />
            ) : isAudio ? (
              /* D. AUDIO VIEWER: Real audio playback with vinyl record & waveform */
              <AudioPlayerViewer
                file={file}
                onShare={handleShare}
                onDownload={handleDownload}
              />
            ) : isSpreadsheet ? (
              /* E. SPREADSHEETS: Interactive data grid */
              <SpreadsheetViewer
                file={file}
                onShare={handleShare}
                onDownload={handleDownload}
              />
            ) : isArchive ? (
              /* F. ARCHIVES: ZIP / RAR Explorer */
              <ArchiveViewer
                file={file}
                onShare={handleShare}
                onDownload={handleDownload}
              />
            ) : isImage ? (
              /* G. IMAGE VIEWER */
              <div className="flex flex-col items-center justify-center h-full bg-black/80 rounded-2xl p-4 overflow-hidden border border-white/10">
                <img
                  src={file.thumbnail_url || file.storage_path}
                  alt={file.filename}
                  className="max-h-[82%] max-w-full object-contain rounded-lg shadow-2xl"
                />
                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Image</span>
                  </button>
                  <button
                    onClick={handleShare}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share</span>
                  </button>
                </div>
              </div>
            ) : (
              /* H. GENERIC BINARY / UNKNOWN FILE */
              <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4 bg-neutral-900/60 rounded-2xl border border-white/10">
                <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-blue-400" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-lg font-semibold text-white">{file.filename}</h4>
                  <p className="text-xs text-[#A1A1A1]">
                    {file.mime_type} · {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download File</span>
                  </button>
                  <button
                    onClick={() => window.open(file.storage_path, '_blank')}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Open Externally</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
