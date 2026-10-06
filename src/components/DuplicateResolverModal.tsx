import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle, Copy, RefreshCw, XCircle } from 'lucide-react';
import { useCloud } from '../context/CloudContext';
import { StackedModalWrapper } from '../context/ModalStackContext';
import {
  springJelly,
  jellyScaleKeyframes,
  jellyScaleTransition,
  easeJelly,
} from '../motion';

export const DuplicateResolverModal: React.FC = () => {
  const { duplicateConflict, resolveDuplicate, triggerHaptic } = useCloud();

  if (!duplicateConflict) return null;

  const { file, existingFile } = duplicateConflict;

  return (
    <StackedModalWrapper
      id="duplicate-resolver"
      isOpen={Boolean(duplicateConflict)}
      onClose={() => resolveDuplicate('skip')}
      type="dialog"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: [...jellyScaleKeyframes], opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{
          scale: jellyScaleTransition,
          opacity: { duration: 0.35, ease: easeJelly },
        }}
        className="w-full max-w-sm rounded-[26px] liquid-glass-modal p-6 space-y-5 border border-white/15 shadow-2xl mx-auto"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">File Already Exists</h3>
            <p className="text-[11px] text-[#A1A1A1]">SHA-256 Checksum Match</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1 text-xs">
          <p className="text-white font-medium truncate">{file.name}</p>
          <p className="text-[11px] text-neutral-500 tabular-numbers">
            Size: {(file.size / (1024 * 1024)).toFixed(2)} MB
          </p>
          <p className="text-[10px] text-neutral-500">
            Existing uploaded on: {new Date(existingFile.created_at).toLocaleDateString()}
          </p>
        </div>

        <p className="text-xs text-[#A1A1A1]">
          How would you like to handle this duplicate upload?
        </p>

        {/* 3 User Actions: Skip, Replace, Keep Both */}
        <div className="space-y-2 pt-1">
          <button
            onClick={() => {
              triggerHaptic('light');
              resolveDuplicate('replace');
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-white border border-neutral-700/80 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
            <span>Replace Existing File</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic('light');
              resolveDuplicate('keep');
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-white border border-neutral-700/80 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-emerald-400" />
            <span>Keep Both (Add Suffix)</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic('light');
              resolveDuplicate('skip');
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-neutral-900/60 hover:bg-neutral-800 text-xs font-semibold text-neutral-400 hover:text-white transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <XCircle className="w-3.5 h-3.5 text-neutral-500" />
            <span>Skip Upload</span>
          </button>
        </div>
      </motion.div>
    </StackedModalWrapper>
  );
};
