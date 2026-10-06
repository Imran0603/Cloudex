import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, ShieldAlert } from 'lucide-react';
import { useCloud } from '../context/CloudContext';

export const ToastContainer: React.FC = () => {
  const { toasts, prefersReducedMotion } = useCloud();

  return (
    <div className="fixed top-20 left-0 right-0 z-50 flex flex-col items-center pointer-events-none px-4 space-y-2">
      <AnimatePresence>
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.94 }}
              transition={
                prefersReducedMotion
                  ? { duration: 0.15 }
                  : { type: 'spring', stiffness: 420, damping: 28 }
              }
              className="pointer-events-auto rounded-full liquid-glass px-4 py-2 flex items-center gap-2.5 shadow-2xl border border-white/15 backdrop-blur-2xl"
            >
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {isError && <ShieldAlert className="w-4 h-4 text-red-400" />}
              {isWarning && <AlertCircle className="w-4 h-4 text-amber-400" />}
              {!isSuccess && !isError && !isWarning && <Info className="w-4 h-4 text-blue-400" />}

              <span className="text-xs font-medium text-white">{toast.text}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
