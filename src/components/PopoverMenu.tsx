import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  springSnappy,
  jellyScaleKeyframes,
  jellyScaleTransition,
  easeJelly,
} from '../motion';

interface PopoverMenuProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  width?: number;
  className?: string;
}

interface MenuCoords {
  top?: number;
  bottom?: number;
  right: number;
  origin: string;
}

export const PopoverMenu: React.FC<PopoverMenuProps> = ({
  isOpen,
  onClose,
  triggerRef,
  children,
  width = 240,
  className = '',
}) => {
  const [coords, setCoords] = useState<MenuCoords | null>(null);
  const [mounted, setMounted] = useState(false);
  const savedScrollYRef = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Right-aligned to trigger with 16px viewport clamp
    const right = Math.max(16, Math.min(viewportWidth - 16 - width, viewportWidth - rect.right));

    // Vertical placement: estimate height ~260px
    const estimatedHeight = 260;
    const fitsBelow = rect.bottom + 8 + estimatedHeight <= viewportHeight - 16;

    if (fitsBelow) {
      setCoords({
        top: Math.round(rect.bottom + 8),
        right: Math.round(right),
        origin: 'top right',
      });
    } else {
      setCoords({
        bottom: Math.round(viewportHeight - rect.top + 8),
        right: Math.round(right),
        origin: 'bottom right',
      });
    }
  }, [triggerRef, width]);

  // Recalculate position on open, resize, or scroll
  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('resize', updatePosition, { passive: true });
      window.addEventListener('scroll', updatePosition, { passive: true });
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition);
      };
    }
  }, [isOpen, updatePosition]);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Lock body scroll and capture escape/popstate while open
  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
      }
    };

    const handlePopState = () => {
      onCloseRef.current();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen]);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && coords && (
        <div className="fixed inset-0 pointer-events-auto" style={{ zIndex: 1100 }}>
          {/* Fullscreen transparent tap scrim */}
          <div
            className="fixed inset-0 bg-transparent cursor-default"
            style={{ zIndex: 1100 }}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              onClose();
            }}
          />

          {/* Liquid Glass Popover Card */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: [...jellyScaleKeyframes], opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{
              scale: jellyScaleTransition,
              opacity: { duration: 0.28, ease: easeJelly },
            }}
            style={{
              position: 'fixed',
              top: coords.top !== undefined ? coords.top : undefined,
              bottom: coords.bottom !== undefined ? coords.bottom : undefined,
              right: coords.right,
              width,
              transformOrigin: coords.origin,
              zIndex: 1101,
              background: 'rgba(28, 28, 30, 0.75)',
              backdropFilter: 'blur(30px) saturate(180%)',
              WebkitBackdropFilter: 'blur(30px) saturate(180%)',
              border: '0.5px solid rgba(255, 255, 255, 0.14)',
              borderRadius: '22px',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
              isolation: 'isolate',
            }}
            onClick={(e) => e.stopPropagation()}
            className={`overflow-hidden select-none py-1.5 ${className}`}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export const PopoverMenuItem: React.FC<{
  onClick: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  rightElement?: React.ReactNode;
  isDestructive?: boolean;
}> = ({ onClick, icon: Icon, label, rightElement, isDestructive = false }) => {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`w-full h-12 px-4 flex items-center justify-between text-[14px] font-medium transition-colors hover:bg-white/10 cursor-pointer ${
        isDestructive ? 'text-[#EF4444]' : 'text-white'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <Icon
            className={`w-5 h-5 shrink-0 ${isDestructive ? 'text-[#EF4444]' : 'text-white'}`}
          />
        )}
        <span className="truncate">{label}</span>
      </div>
      {rightElement && <div className="shrink-0 ml-2">{rightElement}</div>}
    </button>
  );
};

export const PopoverDivider: React.FC = () => (
  <div className="h-[0.5px] bg-white/[0.08] mx-3 my-1" />
);

export const PopoverSectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="px-4 pt-1.5 pb-1 text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider">
    {children}
  </div>
);
