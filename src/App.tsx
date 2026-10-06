/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import { CloudProvider, useCloud } from './context/CloudContext';
import { ScrollProvider, useScrollContainer } from './context/ScrollContext';
import { ModalStackProvider, useModalStack } from './context/ModalStackContext';
import { TopHeader } from './components/TopHeader';
import { LiquidNavbar } from './components/LiquidNavbar';
import { HomeScreen } from './components/HomeScreen';
import { GalleryScreen } from './components/GalleryScreen';
import { LibraryScreen } from './components/LibraryScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { PhotoViewer } from './components/PhotoViewer';
import { VaultModal } from './components/VaultModal';
import { UploadModal } from './components/UploadModal';
import { UploadQueueSheet } from './components/UploadQueueSheet';
import { DuplicateResolverModal } from './components/DuplicateResolverModal';
import { ShareModal } from './components/ShareModal';
import { StorageManagerModal } from './components/StorageManagerModal';
import { TrashModal } from './components/TrashModal';
import { FileDetailsSheet } from './components/FileDetailsSheet';
import { FileEditModal } from './components/FileEditModal';
import { UniversalFileModal } from './components/UniversalFileModal';
import { ToastContainer } from './components/ToastContainer';
import {
  spring,
  fade,
  springJelly,
  jellyScaleKeyframes,
  jellyScaleTransition,
  easeJelly,
} from './motion';

const MainLayout: React.FC = () => {
  const {
    activeTab,
    activeSpace,
    isProfileOpen,
    setIsProfileOpen,
    universalViewerFile,
    setUniversalViewerFile,
    setDetailsFile,
    editingFile,
    setEditingFile,
    openViewer,
  } = useCloud();
  const { homeScrollRef, galleryScrollRef, libraryScrollRef } = useScrollContainer();
  const { registerModal, unregisterModal, getZIndex, getScrimOpacity, isTopModal, getDepthStyle } =
    useModalStack();

  const [profileWindowMode, setProfileWindowMode] = React.useState<'compact' | 'expanded'>('compact');
  const profileModalId = 'profile-settings-sheet';
  const closeProfile = React.useCallback(() => {
    setIsProfileOpen(false);
    setProfileWindowMode('compact');
  }, [setIsProfileOpen]);

  useEffect(() => {
    if (isProfileOpen) {
      registerModal(profileModalId, closeProfile, 'sheet');
      return () => unregisterModal(profileModalId);
    }
  }, [isProfileOpen, closeProfile, registerModal, unregisterModal]);

  const profileZIndex = getZIndex(profileModalId);
  const profileScrimOpacity = getScrimOpacity(profileModalId);
  const profileDepth = getDepthStyle(profileModalId);

  return (
    <div
      id="app-content-root"
      className="fixed inset-0 bg-black text-white selection:bg-blue-600/30"
    >
      {/* 1. Anchored Top Header Layer (Single Header Contract, Outside Scroll Containers) */}
      {activeSpace === 'none' && <TopHeader />}

      {/* 2. Scrollable Containers per Tab: Keep-Alive tabs (stay mounted, never display:none) */}
      {/* Home Tab */}
      <div
        ref={homeScrollRef}
        style={{
          visibility: activeTab === 'home' ? 'visible' : 'hidden',
          opacity: activeTab === 'home' ? 1 : 0,
          pointerEvents: activeTab === 'home' ? 'auto' : 'none',
          zIndex: activeTab === 'home' ? 10 : 0,
          paddingTop: activeSpace !== 'none' ? 'calc(env(safe-area-inset-top, 0px) + 12px)' : 'calc(env(safe-area-inset-top, 0px) + 64px)',
          paddingBottom: activeSpace !== 'none' ? 'calc(env(safe-area-inset-bottom, 0px) + 16px)' : 'calc(env(safe-area-inset-bottom, 0px) + 96px)',
        }}
        className="fixed inset-0 overflow-y-auto overscroll-contain no-scrollbar px-4 sm:px-6"
      >
        <div className="w-full max-w-4xl mx-auto">
          <HomeScreen />
        </div>
      </div>

      {/* Gallery Tab */}
      <div
        ref={galleryScrollRef}
        style={{
          visibility: activeTab === 'gallery' ? 'visible' : 'hidden',
          opacity: activeTab === 'gallery' ? 1 : 0,
          pointerEvents: activeTab === 'gallery' ? 'auto' : 'none',
          zIndex: activeTab === 'gallery' ? 10 : 0,
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 64px)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)',
        }}
        className="fixed inset-0 overflow-y-auto overscroll-contain no-scrollbar px-4 sm:px-6"
      >
        <div className="w-full max-w-4xl mx-auto">
          <GalleryScreen />
        </div>
      </div>

      {/* Library Tab */}
      <div
        ref={libraryScrollRef}
        style={{
          visibility: activeTab === 'library' ? 'visible' : 'hidden',
          opacity: activeTab === 'library' ? 1 : 0,
          pointerEvents: activeTab === 'library' ? 'auto' : 'none',
          zIndex: activeTab === 'library' ? 10 : 0,
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 64px)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)',
        }}
        className="fixed inset-0 overflow-y-auto overscroll-contain no-scrollbar px-4 sm:px-6"
      >
        <div className="w-full max-w-4xl mx-auto">
          <LibraryScreen />
        </div>
      </div>

      {/* 3. Floating Liquid Glass Bottom Navigation (Outside Scroll Containers) */}
      {activeSpace === 'none' && <LiquidNavbar />}

      {/* 4. Profile / Cloud Settings iOS Sheet (Stack managed with iOS depth) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isProfileOpen && (
              <div
                style={{ zIndex: profileZIndex }}
                className="fixed inset-0 flex flex-col justify-end sm:justify-center sm:items-center sm:p-4 pointer-events-auto"
                onClick={(e) => {
                  if (isTopModal(profileModalId)) {
                    e.stopPropagation();
                    setIsProfileOpen(false);
                  }
                }}
              >
                {/* Scrim with iOS frosted glass blur */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: profileScrimOpacity }}
                  exit={{ opacity: 0 }}
                  transition={fade}
                  className="fixed inset-0 bg-black/60 backdrop-blur-xl"
                />

                {/* Sheet Content with iOS Depth */}
                <motion.div
                  initial={{ y: '100%', opacity: 0, scale: 0.95 }}
                  animate={{
                    y: profileDepth.y,
                    scale: profileDepth.scale === 1 ? [...jellyScaleKeyframes] : profileDepth.scale,
                    filter: `brightness(${profileDepth.brightness})`,
                    opacity: 1,
                    height: profileWindowMode === 'expanded' ? '100dvh' : '90vh',
                    borderRadius: profileWindowMode === 'expanded' ? '0px' : '28px 28px 0 0',
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
                    if (offset.y < -45 || velocity.y < -300) {
                      setProfileWindowMode('expanded');
                    } else if (offset.y > 65 || velocity.y > 300) {
                      if (profileWindowMode === 'expanded') {
                        setProfileWindowMode('compact');
                      } else {
                        closeProfile();
                      }
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full sm:max-w-xl bg-[#000000] border-t sm:border border-white/10 overflow-hidden flex flex-col shadow-2xl relative z-10 select-none"
                >
                  {/* Sheet Grabber */}
                  <div
                    onClick={() => setProfileWindowMode((p) => (p === 'compact' ? 'expanded' : 'compact'))}
                    className="h-8 flex items-center justify-center shrink-0 bg-[#000000] pt-2 cursor-grab active:cursor-grabbing"
                  >
                    <div className="w-12 h-1.5 rounded-full bg-white/25 hover:bg-white/45 transition-colors" />
                  </div>

                  {/* Scrollable Profile Content */}
                  <div className="flex-1 overflow-y-auto px-5 py-2 no-scrollbar">
                    <ProfileScreen onClose={() => setIsProfileOpen(false)} />
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* 5. Fullscreen Photo Viewer (Layout Morph from Grid, Drag-to-Dismiss) */}
      <PhotoViewer />

      {/* 5b. Universal File Viewer for PDF, Audio, Code, Text, Spreadsheets, Archives */}
      <UniversalFileModal
        file={universalViewerFile}
        isOpen={Boolean(universalViewerFile)}
        onClose={() => setUniversalViewerFile(null)}
        onOpenDetails={() => {
          const f = universalViewerFile;
          setUniversalViewerFile(null);
          setDetailsFile(f);
        }}
      />

      {/* 6. Secret Vault / Biometric Auth Modal */}
      <VaultModal />

      {/* 7. Upload Modal */}
      <UploadModal />

      {/* 8. Upload Queue & Transfers Sheet */}
      <UploadQueueSheet />

      {/* 9. Duplicate SHA-256 Conflict Resolver */}
      <DuplicateResolverModal />

      {/* 10. Share Links Modal */}
      <ShareModal />

      {/* 11. Storage Manager Modal */}
      <StorageManagerModal />

      {/* 12. Trash & Deleted Items Modal */}
      <TrashModal />

      {/* 13. File Details Bottom Sheet */}
      <FileDetailsSheet />

      {/* 13b. Universal File Edit & Rename Modal */}
      <FileEditModal
        file={editingFile}
        isOpen={Boolean(editingFile)}
        onClose={() => setEditingFile(null)}
        onOpenPhotoEditor={() => {
          if (editingFile) openViewer(editingFile);
        }}
      />

      {/* 14. Liquid Glass Toasts */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <CloudProvider>
        <ScrollProvider>
          <ModalStackProvider>
            <MainLayout />
          </ModalStackProvider>
        </ScrollProvider>
      </CloudProvider>
    </MotionConfig>
  );
}
