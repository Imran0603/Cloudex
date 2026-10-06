import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { spring, springSnappy } from '../motion';

interface ModalEntry {
  id: string;
  onClose: () => void;
  type?: 'sheet' | 'dialog' | 'viewer' | 'menu';
}

interface ModalStackContextType {
  registerModal: (id: string, onClose: () => void, type?: 'sheet' | 'dialog' | 'viewer' | 'menu') => void;
  unregisterModal: (id: string) => void;
  closeTopModal: () => void;
  getModalLayer: (id: string) => number; // index in stack
  getZIndex: (id: string) => number;
  getScrimOpacity: (id: string) => number;
  isTopModal: (id: string) => boolean;
  getDepthStyle: (id: string) => { scale: number; y: number; brightness: number; borderRadius: number };
  stackLength: number;
}

const ModalStackContext = createContext<ModalStackContextType | null>(null);

export const ModalStackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stack, setStack] = useState<ModalEntry[]>([]);
  const savedScrollYRef = useRef<number>(0);
  const isPopStateTriggeredRef = useRef<boolean>(false);

  const registerModal = useCallback(
    (id: string, onClose: () => void, type: 'sheet' | 'dialog' | 'viewer' | 'menu' = 'sheet') => {
      setStack((prev) => {
        if (prev.some((m) => m.id === id)) return prev;
        // Push state for Android / Browser Back button
        if (typeof window !== 'undefined') {
          window.history.pushState({ modalId: id }, '');
        }
        return [...prev, { id, onClose, type }];
      });
    },
    []
  );

  const unregisterModal = useCallback((id: string) => {
    setStack((prev) => {
      if (!prev.some((m) => m.id === id)) return prev;
      return prev.filter((m) => m.id !== id);
    });
  }, []);

  const closeTopModal = useCallback(() => {
    setStack((prev) => {
      if (prev.length === 0) return prev;
      const top = prev[prev.length - 1];
      try {
        top.onClose();
      } catch (e) {
        console.error('Error closing top modal', e);
      }
      return prev.slice(0, -1);
    });
  }, []);

  // Handle browser back button (popstate)
  useEffect(() => {
    const handlePopState = () => {
      if (stack.length > 0) {
        isPopStateTriggeredRef.current = true;
        closeTopModal();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [stack.length, closeTopModal]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stack.length > 0) {
        e.preventDefault();
        closeTopModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stack.length, closeTopModal]);

  // Strict page scroll lock without marking appRoot inert (which disabled all modals & app buttons)
  useEffect(() => {
    if (stack.length > 0) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      const appRoot = document.getElementById('app-content-root');
      if (appRoot) {
        appRoot.removeAttribute('inert');
        appRoot.removeAttribute('aria-hidden');
      }
    }
  }, [stack.length]);

  const getModalLayer = useCallback(
    (id: string) => stack.findIndex((m) => m.id === id),
    [stack]
  );

  const getZIndex = useCallback(
    (id: string) => {
      const idx = stack.findIndex((m) => m.id === id);
      return idx >= 0 ? 1000 + idx * 20 : 1000;
    },
    [stack]
  );

  const getScrimOpacity = useCallback(
    (id: string) => {
      const idx = stack.findIndex((m) => m.id === id);
      return 0.35 + Math.min(0.25, idx * 0.12);
    },
    [stack]
  );

  const isTopModal = useCallback(
    (id: string) => {
      return stack.length > 0 && stack[stack.length - 1].id === id;
    },
    [stack]
  );

  const getDepthStyle = useCallback(
    (id: string) => {
      const idx = stack.findIndex((m) => m.id === id);
      const isUnder = idx >= 0 && idx < stack.length - 1;
      return {
        scale: isUnder ? 0.96 : 1,
        y: isUnder ? 8 : 0,
        brightness: isUnder ? 0.7 : 1,
        borderRadius: isUnder ? 28 : 0,
      };
    },
    [stack]
  );

  const contextValue = useMemo(
    () => ({
      registerModal,
      unregisterModal,
      closeTopModal,
      getModalLayer,
      getZIndex,
      getScrimOpacity,
      isTopModal,
      getDepthStyle,
      stackLength: stack.length,
    }),
    [
      registerModal,
      unregisterModal,
      closeTopModal,
      getModalLayer,
      getZIndex,
      getScrimOpacity,
      isTopModal,
      getDepthStyle,
      stack.length,
    ]
  );

  return (
    <ModalStackContext.Provider value={contextValue}>
      {children}
    </ModalStackContext.Provider>
  );
};

export const useModalStack = () => {
  const ctx = useContext(ModalStackContext);
  if (!ctx) {
    throw new Error('useModalStack must be used within ModalStackProvider');
  }
  return ctx;
};

/**
 * Standard Stacked Modal Container for Sheets & Dialogs
 * Captures pointer events, enforces scrim, stops event propagation, applies depth effect
 */
export const StackedModalWrapper: React.FC<{
  id: string;
  isOpen: boolean;
  onClose: () => void;
  type?: 'sheet' | 'dialog' | 'viewer' | 'menu';
  children: React.ReactNode;
  className?: string;
}> = ({ id, isOpen, onClose, type = 'sheet', children, className = '' }) => {
  const { registerModal, unregisterModal, getZIndex, getScrimOpacity, isTopModal, getDepthStyle } =
    useModalStack();

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      registerModal(id, () => onCloseRef.current(), type);
      return () => unregisterModal(id);
    }
  }, [id, isOpen, type, registerModal, unregisterModal]);

  if (!isOpen) return null;

  const zIndex = getZIndex(id);
  const scrimOpacity = getScrimOpacity(id);
  const depth = getDepthStyle(id);

  const modalNode = (
    <div
      style={{ zIndex }}
      className={`fixed inset-0 flex pointer-events-auto ${
        type === 'sheet' ? 'items-end' : 'items-center justify-center p-4'
      } ${className}`}
      onClick={(e) => {
        // Scrim click closes ONLY top-most modal
        if (isTopModal(id)) {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      {/* Scrim layer with iOS frosted glass blur */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: scrimOpacity }}
        exit={{ opacity: 0 }}
        transition={spring}
        className="fixed inset-0 bg-black/60 backdrop-blur-xl"
      />

      {/* Modal Content with Depth Effect when another modal sits on top */}
      <motion.div
        animate={{
          scale: depth.scale,
          y: depth.y,
          filter: `brightness(${depth.brightness})`,
          borderRadius: depth.borderRadius,
        }}
        transition={spring}
        onClick={(e) => e.stopPropagation()}
        className="w-full relative z-10"
      >
        {children}
      </motion.div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
};
