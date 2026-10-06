import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Trash2, X, Maximize2, Minimize2, RotateCcw } from 'lucide-react';
import { useCloud } from '../context/CloudContext';
import { StackedModalWrapper } from '../context/ModalStackContext';
import {
  springJelly,
  jellyScaleKeyframes,
  jellyScaleTransition,
  easeJelly,
} from '../motion';

export const TrashModal: React.FC = () => {
  const {
    trashItems,
    isTrashOpen,
    setIsTrashOpen,
    restoreTrash,
    emptyTrash,
    trashFile,
    triggerHaptic,
  } = useCloud();

  const [windowMode, setWindowMode] = useState<'compact' | 'expanded'>('compact');

  if (!isTrashOpen) return null;

  const handleToggleExpand = () => {
    triggerHaptic('light');
    setWindowMode((prev) => (prev === 'compact' ? 'expanded' : 'compact'));
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <StackedModalWrapper
      id="trash-modal"
      isOpen={isTrashOpen}
      onClose={() => setIsTrashOpen(false)}
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
              setIsTrashOpen(false);
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
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-[#A1A1A1]" />
            <h3 className="text-base font-semibold text-white tracking-tight">Recently Deleted</h3>
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
                setIsTrashOpen(false);
              }}
              className="w-11 h-11 rounded-full liquid-glass-base flex items-center justify-center text-white cursor-pointer shadow-lg hover:border-white/35 active:scale-95 transition-transform touch-manipulation shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* 30-Day Retention Notice */}
        <p className="text-xs text-[#A1A1A1] leading-relaxed">
          Items in Trash are permanently deleted automatically after 30 days.
        </p>

        {trashItems.length > 0 && (
          <div className="flex justify-end">
            <button
              onClick={() => {
                if (confirm('Permanently delete all items in trash? This cannot be undone.')) {
                  emptyTrash();
                }
              }}
              className="text-xs text-red-400 hover:text-red-300 font-semibold cursor-pointer"
            >
              Empty Trash Now
            </button>
          </div>
        )}

        <div className="divide-y divide-white/[0.08] rounded-2xl bg-[#141414] overflow-hidden">
          {trashItems.length > 0 ? (
            trashItems.map((file) => (
              <div key={file.id} className="p-3.5 flex items-center justify-between text-xs">
                <div className="min-w-0 pr-3">
                  <p className="text-white font-medium truncate">{file.filename}</p>
                  <p className="text-[10px] text-neutral-400 tabular-numbers">
                    {formatBytes(file.size)} · {file.extension.toUpperCase()}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      restoreTrash(file.id);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-blue-400 text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore</span>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Permanently delete "${file.filename}"?`)) {
                        trashFile(file.id, true);
                      }
                    }}
                    className="p-1.5 text-neutral-500 hover:text-red-400 cursor-pointer"
                    title="Delete permanently"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-10 text-center text-xs text-neutral-500">
              Trash is empty.
            </div>
          )}
        </div>
      </motion.div>
    </StackedModalWrapper>
  );
};
