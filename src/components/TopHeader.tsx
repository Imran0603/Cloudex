import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  motion,
  useScroll,
  useTransform,
  AnimatePresence,
} from 'motion/react';
import { Search, Plus, X, Upload, FolderPlus, RefreshCw, Layers } from 'lucide-react';
import { useCloud } from '../context/CloudContext';
import { useScrollContainer } from '../context/ScrollContext';
import { springSnappy, springBouncy } from '../motion';
import { AppLogo } from './AppLogo';
import { PopoverMenu, PopoverMenuItem, PopoverDivider } from './PopoverMenu';

export const TopHeader: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    isActionMenuOpen,
    setIsActionMenuOpen,
    setIsUploadOpen,
    syncHuggingFace,
    createAlbum,
    setIsProfileOpen,
    triggerHaptic,
    refreshData,
    showToast,
  } = useCloud();

  const { activeScrollRef } = useScrollContainer();
  const { scrollY } = useScroll({ container: activeScrollRef });

  const [isSearchInputOpen, setIsSearchInputOpen] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const searchBtnRef = useRef<HTMLButtonElement>(null);

  // Real-time backdrop blur without opacity-degrading layers
  const headerBg = useTransform(
    scrollY,
    [0, 36],
    ['rgba(15, 15, 17, 0)', 'rgba(26, 26, 30, 0.75)']
  );
  const headerBorderColor = useTransform(
    scrollY,
    [0, 36],
    ['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.12)']
  );
  const headerBackdropBlur = useTransform(
    scrollY,
    [0, 36],
    ['blur(0px) saturate(100%)', 'blur(30px) saturate(180%)']
  );

  // Small nav title: reveals as large title collapses past 26-48px
  const navTitleOpacity = useTransform(scrollY, [26, 48], [0, 1]);
  const navTitleY = useTransform(scrollY, [26, 48], [4, 0]);

  const getNavTitle = () => {
    if (activeTab === 'home') return 'Home';
    if (activeTab === 'gallery') return 'Gallery';
    return 'Library';
  };

  const headerContent = (
    <>
      <header
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          zIndex: 100,
        }}
        className="fixed top-0 left-0 right-0 z-[100] h-14 flex items-center justify-between px-4 sm:px-6 pointer-events-none"
      >
        {/* Dynamic Liquid Glass Backdrop (Direct GPU transform) */}
        <motion.div
          style={{
            backgroundColor: headerBg,
            borderBottomColor: headerBorderColor,
            backdropFilter: headerBackdropBlur,
            WebkitBackdropFilter: headerBackdropBlur,
          }}
          className="absolute inset-0 pointer-events-none border-b-[0.5px] border-transparent"
        />

        {/* Left: App Logo + Title right next to logo with scroll-only reveal animation */}
        <div className="flex items-center gap-2.5 pointer-events-auto z-20">
          <motion.button
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('home');
              const container = activeScrollRef.current;
              if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.88 }}
            transition={springBouncy}
            className="w-10 h-10 rounded-full liquid-glass-base flex items-center justify-center cursor-pointer overflow-hidden p-1 shadow-lg border-[0.5px] border-white/20 hover:border-white/40 transition-colors shrink-0"
            title="Bytex Cloud — Home"
            aria-label="Bytex Cloud Logo"
          >
            <AppLogo size={32} />
          </motion.button>

          {/* Title right next to logo: reveals when scrolling down, hides when at top */}
          <motion.div
            style={{ opacity: navTitleOpacity, y: navTitleY }}
            className="flex items-center pointer-events-none select-none"
          >
            <span className="text-[17px] font-semibold text-white tracking-tight">
              {getNavTitle()}
            </span>
          </motion.div>
        </div>

        {/* Right Action Icons: Search 40px, + 40px, Avatar 40px, Gap 8px (Same vertical centerline) */}
        <div className="flex items-center gap-2 pointer-events-auto z-20">
          {/* Search Button (Fixed 40px slot) */}
          <div className="w-10 h-10 flex-none flex items-center justify-center">
            <motion.button
              ref={searchBtnRef}
              onClick={() => {
                triggerHaptic('light');
                setIsSearchInputOpen((v) => !v);
              }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.88 }}
              transition={springBouncy}
              className="w-10 h-10 rounded-full liquid-glass-base flex items-center justify-center text-white cursor-pointer hover:border-white/35 transition-colors"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </motion.button>
          </div>

          {/* + Button (Fixed 40px slot) */}
          <div className="w-10 h-10 flex-none flex items-center justify-center">
            <motion.button
              ref={addBtnRef}
              onClick={() => {
                triggerHaptic('light');
                setIsActionMenuOpen(!isActionMenuOpen);
              }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.88, rotate: isActionMenuOpen ? 0 : 45 }}
              transition={springBouncy}
              className="w-10 h-10 rounded-full liquid-glass-base flex items-center justify-center text-white cursor-pointer hover:border-white/35 transition-colors"
              aria-label="Add options"
            >
              <Plus className={`w-4 h-4 transition-transform duration-200 ${isActionMenuOpen ? 'rotate-45' : ''}`} />
            </motion.button>
          </div>

          {/* Avatar (Fixed 40px slot) */}
          <div className="w-10 h-10 flex-none flex items-center justify-center">
            <motion.button
              onClick={() => {
                triggerHaptic('light');
                setIsProfileOpen(true);
              }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.88 }}
              transition={springBouncy}
              className="w-10 h-10 rounded-full overflow-hidden bg-neutral-900 border-[0.5px] border-white/25 cursor-pointer shadow-md hover:border-white/50 transition-colors"
              aria-label="Profile and Settings"
            >
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
                alt="Avatar"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </motion.button>
          </div>

          {/* Search Input Overlay: Overlays cleanly without displacing any button */}
          <AnimatePresence>
            {isSearchInputOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={springSnappy}
                className="absolute inset-x-3 sm:inset-x-6 top-2 h-10 rounded-full liquid-glass-base flex items-center px-3 shadow-2xl z-30 pointer-events-auto"
              >
                <Search className="w-4 h-4 text-[#A1A1A1] mr-2 shrink-0" />
                <input
                  ref={searchInputRef}
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search photos, files, tags..."
                  className="w-full bg-transparent text-xs text-white placeholder-[#A1A1A1] focus:outline-none"
                />
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    setSearchQuery('');
                    setIsSearchInputOpen(false);
                  }}
                  className="p-1 text-[#A1A1A1] hover:text-white cursor-pointer ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Reusable PopoverMenu via Portal (Never affects header flex flow) */}
      <PopoverMenu
        isOpen={isActionMenuOpen}
        onClose={() => setIsActionMenuOpen(false)}
        triggerRef={addBtnRef}
        width={240}
      >
        <PopoverMenuItem
          onClick={() => {
            triggerHaptic('light');
            setIsActionMenuOpen(false);
            setIsUploadOpen(true);
          }}
          icon={Upload}
          label="Upload File"
        />
        <PopoverMenuItem
          onClick={async () => {
            triggerHaptic('light');
            setIsActionMenuOpen(false);
            const name = prompt('Enter new folder name:');
            if (name && name.trim()) {
              try {
                const res = await fetch('/api/folders', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: name.trim() }),
                });
                if (res.ok) {
                  showToast(`Folder "${name.trim()}" created`, 'success');
                  refreshData();
                }
              } catch {
                showToast('Failed to create folder', 'error');
              }
            }
          }}
          icon={FolderPlus}
          label="New Folder"
        />
        <PopoverMenuItem
          onClick={() => {
            triggerHaptic('light');
            setIsActionMenuOpen(false);
            const albumName = prompt('Enter new album name:');
            if (albumName && albumName.trim()) {
              createAlbum(albumName.trim());
            }
          }}
          icon={Layers}
          label="New Album"
        />
        <PopoverDivider />
        <PopoverMenuItem
          onClick={() => {
            triggerHaptic('light');
            setIsActionMenuOpen(false);
            syncHuggingFace();
          }}
          icon={RefreshCw}
          label="Sync Hugging Face"
        />
      </PopoverMenu>
    </>
  );

  return typeof document !== 'undefined' ? createPortal(headerContent, document.body) : headerContent;
};
