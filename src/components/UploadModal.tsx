import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload,
  X,
  Maximize2,
  Minimize2,
  File,
  CheckCircle2,
  Lock,
  HardDrive,
  FileText,
  FileArchive,
  Film,
} from 'lucide-react';
import { useCloud } from '../context/CloudContext';
import { StackedModalWrapper } from '../context/ModalStackContext';
import {
  springJelly,
  jellyScaleKeyframes,
  jellyScaleTransition,
  easeJelly,
} from '../motion';

export const UploadModal: React.FC = () => {
  const {
    isUploadOpen,
    setIsUploadOpen,
    uploadFiles,
    uploadQueue,
    isVaultUnlocked,
    triggerHaptic,
    prefersReducedMotion,
  } = useCloud();

  const [windowMode, setWindowMode] = useState<'compact' | 'expanded'>('compact');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [targetVault, setTargetVault] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isUploadOpen) return null;

  const handleToggleExpand = () => {
    triggerHaptic('light');
    setWindowMode((prev) => (prev === 'compact' ? 'expanded' : 'compact'));
  };

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    triggerHaptic('light');
    uploadFiles(files, targetVault);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  return (
    <StackedModalWrapper
      id="upload-modal"
      isOpen={isUploadOpen}
      onClose={() => setIsUploadOpen(false)}
      type="sheet"
    >
      <motion.div
        initial={{ y: '100%', opacity: 0, scale: 0.95 }}
        animate={{
          y: 0,
          opacity: 1,
          scale: [...jellyScaleKeyframes],
          height: windowMode === 'expanded' ? '100dvh' : '78dvh',
          borderRadius: windowMode === 'expanded' ? '0px' : '32px 32px 0 0',
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
            triggerHaptic('light');
            setWindowMode('expanded');
          }
          // Swipe Down to Collapse / Close
          else if (offset.y > 65 || velocity.y > 300) {
            triggerHaptic('light');
            if (windowMode === 'expanded') {
              setWindowMode('compact');
            } else {
              setIsUploadOpen(false);
            }
          }
        }}
        className="w-full max-w-md liquid-glass-sheet p-6 space-y-5 shadow-2xl relative select-none flex flex-col mx-auto overflow-y-auto no-scrollbar"
      >
        {/* Drag Pill */}
        <div
          onClick={handleToggleExpand}
          className="w-12 h-1.5 bg-white/25 rounded-full mx-auto -mt-2 mb-2 cursor-grab active:cursor-grabbing hover:bg-white/40 transition-colors"
          title="Swipe up to expand, swipe down to close"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Upload className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-semibold text-white">Upload to Cloud</h3>
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
              onClick={() => {
                triggerHaptic('light');
                setIsUploadOpen(false);
              }}
              className="w-11 h-11 rounded-full liquid-glass-base flex items-center justify-center text-white cursor-pointer shadow-lg hover:border-white/35 active:scale-95 transition-transform touch-manipulation shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Upload Destination Toggle */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-900 border border-neutral-800">
          <div className="flex items-center gap-2.5">
            {targetVault ? (
              <Lock className="w-4 h-4 text-blue-400" />
            ) : (
              <HardDrive className="w-4 h-4 text-neutral-400" />
            )}
            <div className="text-xs">
              <span className="font-medium text-white block">
                {targetVault ? 'Private Vault Destination' : 'Standard Cloud Library'}
              </span>
              <span className="text-[10px] text-neutral-500">
                {targetVault ? 'Stored behind vault security boundary' : 'Visible in media & documents'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              if (!isVaultUnlocked && !targetVault) {
                alert('Unlock Vault first to upload directly into the Secret Vault.');
                return;
              }
              setTargetVault(!targetVault);
            }}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors cursor-pointer ${
              targetVault ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-neutral-300'
            }`}
          >
            {targetVault ? 'Vault Active' : 'Switch to Vault'}
          </button>
        </div>

        {/* Drag & Drop Area */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 ${
            isDragging
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-neutral-800 hover:border-neutral-700 bg-neutral-900/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFilesSelected(e.target.files)}
          />
          <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 mb-1">
            <Upload className="w-6 h-6 text-blue-400" />
          </div>
          <p className="text-sm font-medium text-white">Tap or drop files here</p>
          <p className="text-xs text-neutral-500">Photos, 4K Videos, Documents, PDF, ZIP</p>
        </div>

        {/* Upload Progress Queue */}
        {uploadQueue.length > 0 && (
          <div className="space-y-2.5 pt-2">
            <span className="text-xs font-semibold text-neutral-400 block">Transfer Status</span>
            <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
              {uploadQueue.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-white truncate max-w-[200px]">
                      {item.name}
                    </span>
                    <span className="text-[10px] text-neutral-400 tabular-numbers">{item.speed}</span>
                  </div>

                  <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-blue-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${item.progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-neutral-500 tabular-numbers">
                    <span>{item.status}</span>
                    <span>{item.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </StackedModalWrapper>
  );
};
