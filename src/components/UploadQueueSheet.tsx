import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Maximize2, Minimize2, Play, Pause, RotateCw } from 'lucide-react';
import { useCloud } from '../context/CloudContext';
import { StackedModalWrapper } from '../context/ModalStackContext';
import {
  spring,
  springJelly,
  jellyScaleKeyframes,
  jellyScaleTransition,
  easeJelly,
} from '../motion';

export const UploadQueueSheet: React.FC = () => {
  const {
    isUploadQueueOpen,
    setIsUploadQueueOpen,
    uploadQueue,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    triggerHaptic,
  } = useCloud();

  const [windowMode, setWindowMode] = useState<'compact' | 'expanded'>('compact');

  if (!isUploadQueueOpen || uploadQueue.length === 0) return null;

  const handleToggleExpand = () => {
    triggerHaptic('light');
    setWindowMode((prev) => (prev === 'compact' ? 'expanded' : 'compact'));
  };

  return (
    <StackedModalWrapper
      id="upload-queue-sheet"
      isOpen={isUploadQueueOpen}
      onClose={() => setIsUploadQueueOpen(false)}
      type="sheet"
    >
      <motion.div
        initial={{ y: '100%', opacity: 0, scale: 0.95 }}
        animate={{
          y: 0,
          opacity: 1,
          scale: [...jellyScaleKeyframes],
          height: windowMode === 'expanded' ? '100dvh' : '80dvh',
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
              setIsUploadQueueOpen(false);
            }
          }
        }}
        className="w-full max-w-lg mx-auto liquid-glass-sheet p-6 space-y-4 overflow-y-auto no-scrollbar shadow-2xl relative select-none flex flex-col"
      >
        {/* Drag Pill */}
        <div
          onClick={handleToggleExpand}
          className="w-12 h-1.5 bg-white/25 rounded-full mx-auto -mt-2 mb-2 cursor-grab active:cursor-grabbing hover:bg-white/40 transition-colors"
          title="Swipe up to expand, swipe down to close"
        />

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white tracking-tight">Upload Transfers</h3>
            <p className="text-xs text-[#A1A1A1]">
              {uploadQueue.filter((q) => q.status === 'uploading').length} active · Resumable Chunked Pipeline
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
              onClick={() => {
                triggerHaptic('light');
                setIsUploadQueueOpen(false);
              }}
              className="w-11 h-11 rounded-full liquid-glass-base flex items-center justify-center text-white cursor-pointer shadow-lg hover:border-white/35 active:scale-95 transition-transform touch-manipulation shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="divide-y divide-white/[0.08] rounded-2xl bg-neutral-900/60 overflow-hidden">
          <AnimatePresence>
            {uploadQueue.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={spring}
                className="p-3.5 flex items-center justify-between gap-3"
              >
                {/* SVG Progress Ring */}
                <div className="relative w-8 h-8 shrink-0 flex items-center justify-center">
                  <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="3"
                    />
                    <motion.circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      stroke={
                        item.status === 'completed'
                          ? '#10B981'
                          : item.status === 'failed'
                          ? '#EF4444'
                          : '#3B82F6'
                      }
                      strokeWidth="3"
                      strokeDasharray="88"
                      animate={{
                        strokeDashoffset: 88 - (88 * item.progress) / 100,
                      }}
                      transition={spring}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-[9px] font-semibold text-white tabular-nums">
                    {item.progress}%
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-white truncate max-w-[200px]">
                      {item.name}
                    </span>
                    <span className="text-[11px] text-[#A1A1A1] tabular-numbers">
                      {item.speed}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-neutral-500 mt-0.5 capitalize">
                    <span>{item.status}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {item.status === 'uploading' ? (
                    <button
                      onClick={() => pauseUpload(item.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-white"
                      title="Pause"
                    >
                      <Pause className="w-3.5 h-3.5" />
                    </button>
                  ) : item.status === 'paused' ? (
                    <button
                      onClick={() => resumeUpload(item.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-blue-400 hover:text-blue-300"
                      title="Resume"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                  ) : item.status === 'failed' ? (
                    <button
                      onClick={() => resumeUpload(item.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-white"
                      title="Retry"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                  ) : null}

                  <button
                    onClick={() => cancelUpload(item.id)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-500 hover:text-white"
                    title="Remove"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    </StackedModalWrapper>
  );
};
