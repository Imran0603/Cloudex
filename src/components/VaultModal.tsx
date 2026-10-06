import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  Unlock,
  Fingerprint,
  KeyRound,
  Shield,
  ShieldCheck,
  X,
  Maximize2,
  Minimize2,
  Upload,
  ArrowLeft,
  FileText,
  FileSpreadsheet,
  FileArchive,
  FileCode,
  File,
  Film,
  LockKeyhole,
  MoreHorizontal,
  FolderInput,
  Trash2,
  Info,
  Edit2,
  Share2,
  ExternalLink,
  Play,
  LayoutGrid,
  List as ListIcon,
  Check,
  Plus,
  Sparkles,
} from 'lucide-react';
import { useCloud } from '../context/CloudContext';
import { CloudFile } from '../types/cloud';
import { StackedModalWrapper } from '../context/ModalStackContext';
import { SafeImage } from './SafeImage';
import { Glass } from './Glass';
import {
  springRelaxed,
  springSquishy,
  springSnappy,
  springGlass,
  springHero,
  jellyScaleKeyframes,
  jellyScaleTransition,
  easeJelly,
  shakeKeyframes,
  tapPress,
  tapCard,
} from '../motion';

export const VaultModal: React.FC = () => {
  const {
    isVaultModalOpen,
    setIsVaultModalOpen,
    isVaultUnlocked,
    unlockVault,
    lockVault,
    vaultFiles,
    openViewer,
    setDetailsFile,
    setShareTargetFile,
    setEditingFile,
    restoreFromVault,
    trashFile,
    setIsUploadOpen,
    triggerHaptic,
    showToast,
  } = useCloud();

  // Authentication State
  const [pinInput, setPinInput] = useState<string>('');
  const [isBiometricScanning, setIsBiometricScanning] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMethod, setAuthMethod] = useState<'biometric' | 'pin'>('biometric');
  const [isLockingTransition, setIsLockingTransition] = useState<boolean>(false);

  // Vault View & Filter State
  const [activeVaultTab, setActiveVaultTab] = useState<'all' | 'documents' | 'media'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [windowMode, setWindowMode] = useState<'compact' | 'expanded'>('compact');

  // Contextual sheets
  const [activeActionFile, setActiveActionFile] = useState<CloudFile | null>(null);
  const [showSecurityInfoSheet, setShowSecurityInfoSheet] = useState<boolean>(false);
  const [longPressedFileId, setLongPressedFileId] = useState<string | null>(null);

  const handleToggleExpand = () => {
    triggerHaptic('light');
    setWindowMode((prev) => (prev === 'compact' ? 'expanded' : 'compact'));
  };

  // Numerical Keypad for PIN
  const keypadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

  const handleKeypadPress = async (key: string) => {
    triggerHaptic('light');
    setAuthError(null);

    if (key === '⌫') {
      setPinInput((prev) => prev.slice(0, -1));
      return;
    }

    if (!key) return;

    if (pinInput.length < 6) {
      const nextPin = pinInput + key;
      setPinInput(nextPin);

      if (nextPin.length === 6) {
        const success = await unlockVault({ pin: nextPin });
        if (success) {
          triggerHaptic('success');
          setPinInput('');
        } else {
          triggerHaptic('warning');
          setPinInput('');
          setAuthError('Incorrect master PIN code');
        }
      }
    }
  };

  // Biometric Unlock Trigger
  const handleBiometricAuth = async () => {
    triggerHaptic('medium');
    setIsBiometricScanning(true);
    setAuthError(null);

    setTimeout(async () => {
      setIsBiometricScanning(false);
      const success = await unlockVault({ biometric_verified: true });
      if (success) {
        triggerHaptic('success');
      } else {
        triggerHaptic('warning');
        setAuthError('Biometric sensor rejected. Enter PIN code.');
        setAuthMethod('pin');
      }
    }, 750);
  };

  // Graceful physical lock sequence
  const handlePhysicalLock = async () => {
    triggerHaptic('heavy');
    setIsLockingTransition(true);
    setTimeout(async () => {
      await lockVault();
      setIsLockingTransition(false);
      setPinInput('');
      setAuthMethod('biometric');
    }, 450);
  };

  // Filtered vault content
  const filteredVaultFiles = useMemo(() => {
    return vaultFiles.filter((f) => {
      if (activeVaultTab === 'media') {
        return (
          f.mime_type.startsWith('image/') ||
          f.mime_type.startsWith('video/') ||
          ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov'].includes(f.extension.toLowerCase())
        );
      }
      if (activeVaultTab === 'documents') {
        return (
          !f.mime_type.startsWith('image/') &&
          !f.mime_type.startsWith('video/')
        );
      }
      return true;
    });
  }, [vaultFiles, activeVaultTab]);

  const mediaCount = useMemo(
    () =>
      vaultFiles.filter(
        (f) => f.mime_type.startsWith('image/') || f.mime_type.startsWith('video/')
      ).length,
    [vaultFiles]
  );
  const docCount = useMemo(
    () =>
      vaultFiles.filter(
        (f) => !f.mime_type.startsWith('image/') && !f.mime_type.startsWith('video/')
      ).length,
    [vaultFiles]
  );

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (secs?: number) => {
    if (!secs) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getDocIconConfig = (file: CloudFile) => {
    const ext = file.extension.toLowerCase();
    if (ext === 'pdf') {
      return { icon: FileText, color: 'text-red-400 bg-red-500/10 border-red-500/20' };
    }
    if (['xls', 'xlsx', 'csv'].includes(ext)) {
      return { icon: FileSpreadsheet, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    }
    if (['zip', 'rar', 'tar', '7z'].includes(ext)) {
      return { icon: FileArchive, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    }
    if (['json', 'js', 'ts', 'py', 'sh'].includes(ext)) {
      return { icon: FileCode, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' };
    }
    return { icon: File, color: 'text-neutral-400 bg-white/[0.05] border-white/10' };
  };

  if (!isVaultModalOpen) return null;

  return (
    <StackedModalWrapper
      id="vault-modal"
      isOpen={isVaultModalOpen}
      onClose={() => setIsVaultModalOpen(false)}
      type="sheet"
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{
          y: 0,
          opacity: 1,
          height: windowMode === 'expanded' ? '100dvh' : '88dvh',
          borderRadius: windowMode === 'expanded' ? '0px' : '32px 32px 0 0',
        }}
        exit={{ y: '100%', opacity: 0 }}
        transition={springRelaxed}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.3}
        onDragEnd={(e, info) => {
          const { offset, velocity } = info;
          if (offset.y < -45 || velocity.y < -300) {
            triggerHaptic('light');
            setWindowMode('expanded');
          } else if (offset.y > 65 || velocity.y > 300) {
            triggerHaptic('light');
            if (windowMode === 'expanded') {
              setWindowMode('compact');
            } else {
              setIsVaultModalOpen(false);
            }
          }
        }}
        className="w-full max-w-xl mx-auto bg-[#09090B] overflow-hidden flex flex-col border border-white/[0.08] shadow-[0_25px_60px_rgba(0,0,0,0.95)] relative select-none"
      >
        {/* Subtle Ambient Radial Lighting in Background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-blue-500/[0.03] blur-3xl pointer-events-none" />

        {/* Top Grabber Handle */}
        <div
          onClick={handleToggleExpand}
          className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-2.5 cursor-grab active:cursor-grabbing hover:bg-white/35 transition-colors shrink-0"
          title="Swipe up to expand, swipe down to close"
        />

        {/* ========================================================================= */}
        {/* 1. VAULT IMMERSIVE HEADER BAR                                             */}
        {/* ========================================================================= */}
        <header className="h-16 px-5 border-b border-white/[0.06] flex items-center justify-between shrink-0 bg-[#09090B]/90 backdrop-blur-xl z-20">
          {/* Left: Back / Dismiss + Title */}
          <div className="flex items-center gap-3 min-w-0">
            <motion.button
              type="button"
              whileTap={tapPress}
              transition={springSquishy}
              onClick={() => {
                triggerHaptic('light');
                setIsVaultModalOpen(false);
              }}
              className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-white/90 cursor-pointer transition-colors shrink-0"
              aria-label="Close Vault"
            >
              <ArrowLeft className="w-4 h-4" />
            </motion.button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight text-white leading-tight">
                  Private Vault
                </h2>
                {isVaultUnlocked && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </div>
              <p className="text-[11px] text-neutral-400 font-medium leading-none mt-0.5 truncate">
                {isVaultUnlocked ? 'Private Space · Isolated Storage' : 'Locked & Protected'}
              </p>
            </div>
          </div>

          {/* Right Controls: Lock, Security Info, Expand, Close */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isVaultUnlocked && (
              <>
                {/* Security Details Sheet Button */}
                <motion.button
                  type="button"
                  whileTap={tapPress}
                  transition={springSquishy}
                  onClick={() => {
                    triggerHaptic('light');
                    setShowSecurityInfoSheet(true);
                  }}
                  className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-blue-400 cursor-pointer transition-colors"
                  title="Security Architecture"
                >
                  <Shield className="w-3.5 h-3.5" />
                </motion.button>

                {/* Minimal Physical Lock Button */}
                <motion.button
                  type="button"
                  whileTap={tapPress}
                  transition={springSquishy}
                  onClick={handlePhysicalLock}
                  className="px-3 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.14] border border-white/10 text-[11px] font-semibold text-neutral-300 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Lock className="w-3 h-3 text-neutral-400" />
                  <span>Lock</span>
                </motion.button>
              </>
            )}

            {/* Window Expand Toggle */}
            <motion.button
              type="button"
              whileTap={tapPress}
              transition={springSquishy}
              onClick={handleToggleExpand}
              className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-neutral-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
              title={windowMode === 'expanded' ? 'Collapse' : 'Expand'}
            >
              {windowMode === 'expanded' ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </motion.button>

            {/* Close Button */}
            <motion.button
              type="button"
              whileTap={tapPress}
              transition={springSquishy}
              onClick={() => {
                triggerHaptic('light');
                setIsVaultModalOpen(false);
              }}
              className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-neutral-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* 2. BODY CONTENT: LOCKED ROOM vs UNLOCKED PRIVATE ROOM                     */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto no-scrollbar relative z-10 flex flex-col">
          <AnimatePresence mode="wait">
            {!isVaultUnlocked || isLockingTransition ? (
              /* =================================================================== */
              /* 2A. MINIMAL QUIET LOCKED STATE & BIOMETRIC AUTHENTICATION           */
              /* =================================================================== */
              <motion.div
                key="vault-locked"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={springRelaxed}
                className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center max-w-sm mx-auto w-full my-auto space-y-6"
              >
                {/* Soft Glowing Minimal Vault Lock Icon */}
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-2xl" />

                  <motion.div
                    animate={
                      isBiometricScanning
                        ? { scale: [1, 1.05, 1], filter: ['brightness(1)', 'brightness(1.4)', 'brightness(1)'] }
                        : {}
                    }
                    transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                    className="w-20 h-20 rounded-full bg-white/[0.04] border border-white/[0.1] shadow-2xl flex items-center justify-center relative z-10"
                  >
                    {isBiometricScanning ? (
                      <Fingerprint className="w-9 h-9 text-blue-400 transition-colors" />
                    ) : (
                      <LockKeyhole className="w-8 h-8 text-white/80" />
                    )}
                  </motion.div>
                </div>

                {/* Minimal Header Text */}
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white tracking-tight">Private Vault</h3>
                  <p className="text-xs text-neutral-400 max-w-xs leading-relaxed">
                    Locked and isolated. Authenticate with Touch ID or master PIN code to reveal.
                  </p>
                </div>

                {authMethod === 'biometric' ? (
                  /* Biometric Primary Flow */
                  <div className="w-full space-y-3 pt-2">
                    <motion.button
                      type="button"
                      whileTap={tapPress}
                      transition={springSquishy}
                      onClick={handleBiometricAuth}
                      disabled={isBiometricScanning}
                      className="w-full py-3.5 px-4 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-xs font-semibold text-white flex items-center justify-center gap-2.5 cursor-pointer transition-colors shadow-lg"
                    >
                      <Fingerprint className="w-4 h-4 text-blue-400" />
                      <span>{isBiometricScanning ? 'Verifying biometric signature...' : 'Unlock with Biometrics'}</span>
                    </motion.button>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setAuthMethod('pin');
                        setAuthError(null);
                      }}
                      className="text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer pt-1"
                    >
                      Enter Master PIN instead
                    </button>
                  </div>
                ) : (
                  /* Master PIN Numerical Keypad Flow */
                  <div className="w-full space-y-4 pt-1">
                    {/* PIN Dots with Shake on Error */}
                    <div className="space-y-2">
                      <motion.div
                        animate={authError ? { x: shakeKeyframes } : { x: 0 }}
                        transition={{ duration: 0.45, ease: 'easeInOut' }}
                        className="flex items-center justify-center gap-3.5 py-1"
                      >
                        {[0, 1, 2, 3, 4, 5].map((idx) => {
                          const filled = pinInput.length > idx;
                          return (
                            <motion.div
                              key={idx}
                              animate={{ scale: filled ? 1.2 : 1 }}
                              transition={springSnappy}
                              className={`w-3 h-3 rounded-full transition-all ${
                                filled
                                  ? 'bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.6)]'
                                  : 'bg-white/10 border border-white/15'
                              }`}
                            />
                          );
                        })}
                      </motion.div>

                      {authError && (
                        <p className="text-xs text-red-400 font-medium">{authError}</p>
                      )}
                    </div>

                    {/* Numeric Keypad */}
                    <div className="grid grid-cols-3 gap-2.5 w-full max-w-[260px] mx-auto">
                      {keypadKeys.map((key, i) => {
                        if (key === '') return <div key={i} />;
                        return (
                          <motion.button
                            key={i}
                            type="button"
                            onClick={() => handleKeypadPress(key)}
                            whileTap={tapPress}
                            transition={springSquishy}
                            className="h-12 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-lg font-medium text-white transition-colors flex items-center justify-center cursor-pointer tabular-nums"
                          >
                            {key}
                          </motion.button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setAuthMethod('biometric');
                        setAuthError(null);
                      }}
                      className="text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer pt-1"
                    >
                      ← Back to Biometric Unlock
                    </button>
                  </div>
                )}
              </motion.div>
            ) : (
              /* =================================================================== */
              /* 2B. UNLOCKED PRIVATE VAULT (CLEAN, MINIMAL, QUIET ROOM)             */
              /* =================================================================== */
              <motion.div
                key="vault-unlocked"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={springRelaxed}
                className="p-5 space-y-6 flex-1 flex flex-col"
              >
                {/* Minimal Vault Hero Identity Area */}
                <div className="flex items-center justify-between pb-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white tracking-tight">Isolated Repository</span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/25 text-[10px] font-semibold text-blue-400">
                        Zero-Knowledge
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400">
                      Files stored here never appear in public galleries, global searches, or recent feeds.
                    </p>
                  </div>
                </div>

                {/* Filter Selector & Actions Bar (Floating Liquid Glass) */}
                <div className="flex items-center justify-between gap-3">
                  {/* Category Pills (All, Documents, Media) */}
                  <div className="flex items-center p-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs">
                    {(
                      [
                        { id: 'all', label: `All (${vaultFiles.length})` },
                        { id: 'media', label: `Media (${mediaCount})` },
                        { id: 'documents', label: `Docs (${docCount})` },
                      ] as const
                    ).map((tab) => {
                      const isActive = activeVaultTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            triggerHaptic('light');
                            setActiveVaultTab(tab.id);
                          }}
                          className={`relative px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                            isActive ? 'text-black font-semibold' : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="vault-filter-pill"
                              transition={springGlass}
                              className="absolute inset-0 rounded-full bg-white shadow-sm"
                            />
                          )}
                          <span className="relative z-10">{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Right Actions: View Mode + Add Button */}
                  <div className="flex items-center gap-2">
                    <motion.button
                      type="button"
                      whileTap={tapPress}
                      transition={springSquishy}
                      onClick={() => {
                        triggerHaptic('light');
                        setViewMode((prev) => (prev === 'grid' ? 'list' : 'grid'));
                      }}
                      className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-neutral-300 flex items-center justify-center cursor-pointer transition-colors"
                      title={viewMode === 'grid' ? 'Switch to List' : 'Switch to Grid'}
                    >
                      {viewMode === 'grid' ? <ListIcon className="w-3.5 h-3.5" /> : <LayoutGrid className="w-3.5 h-3.5" />}
                    </motion.button>

                    <motion.button
                      type="button"
                      whileTap={tapPress}
                      transition={springSquishy}
                      onClick={() => {
                        triggerHaptic('light');
                        setIsUploadOpen(true);
                      }}
                      className="h-8 px-3 rounded-full bg-white text-black hover:bg-neutral-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Add</span>
                    </motion.button>
                  </div>
                </div>

                {/* =================================================================== */}
                {/* 2C. FILE PRESENTATION: GRID OR LIST                                 */}
                {/* =================================================================== */}
                {filteredVaultFiles.length > 0 ? (
                  viewMode === 'grid' ? (
                    /* Grid Layout (Edge-to-Edge Media & Compact Documents) */
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {filteredVaultFiles.map((file, idx) => {
                        const isMedia = file.mime_type.startsWith('image/') || file.mime_type.startsWith('video/');
                        const isVideo = file.mime_type.startsWith('video/');
                        const isLifted = longPressedFileId === file.id;

                        return (
                          <motion.div
                            key={file.id}
                            initial={{ opacity: 0, y: 8, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: isLifted ? 1.02 : 1 }}
                            transition={{
                              delay: Math.min(0.2, idx * 0.04),
                              ...springRelaxed,
                            }}
                            whileTap={tapCard}
                            onClick={() => {
                              triggerHaptic('light');
                              openViewer(file);
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              triggerHaptic('medium');
                              setLongPressedFileId(file.id);
                              setActiveActionFile(file);
                            }}
                            className={`rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] p-2 flex flex-col justify-between space-y-2 cursor-pointer transition-all group aspect-square ${
                              isLifted ? 'shadow-2xl border-white/20' : ''
                            }`}
                          >
                            {/* Preview Area */}
                            <div className="w-full flex-1 rounded-xl bg-neutral-900/80 overflow-hidden relative flex items-center justify-center">
                              {isMedia ? (
                                <SafeImage
                                  src={file.thumbnail_url || file.storage_path}
                                  videoSrc={isVideo ? file.storage_path : undefined}
                                  alt={file.filename}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="flex flex-col items-center justify-center p-2 text-center">
                                  {React.createElement(getDocIconConfig(file).icon, {
                                    className: 'w-7 h-7 text-neutral-400 stroke-[1.5]',
                                  })}
                                </div>
                              )}

                              {/* Video Duration Badge */}
                              {isVideo && (
                                <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-[4px] bg-black/60 backdrop-blur-md flex items-center gap-1 text-[10px] font-mono text-white pointer-events-none">
                                  <Play className="w-2 h-2 fill-white" />
                                  <span>{formatDuration(file.duration)}</span>
                                </div>
                              )}

                              {/* More Context Trigger */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  triggerHaptic('light');
                                  setActiveActionFile(file);
                                }}
                                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-sm text-neutral-300 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Metadata */}
                            <div className="px-0.5 min-w-0">
                              <p className="text-xs font-semibold text-white truncate leading-tight group-hover:text-blue-400 transition-colors">
                                {file.filename}
                              </p>
                              <p className="text-[10px] text-neutral-400 tabular-nums mt-0.5">
                                {formatFileSize(file.size)}
                              </p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Clean List Layout */
                    <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] divide-y divide-white/[0.05] overflow-hidden">
                      {filteredVaultFiles.map((file, idx) => {
                        const isMedia = file.mime_type.startsWith('image/') || file.mime_type.startsWith('video/');
                        const isVideo = file.mime_type.startsWith('video/');

                        return (
                          <motion.div
                            key={file.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              delay: Math.min(0.2, idx * 0.03),
                              ...springRelaxed,
                            }}
                            whileTap={tapCard}
                            onClick={() => {
                              triggerHaptic('light');
                              openViewer(file);
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              triggerHaptic('medium');
                              setActiveActionFile(file);
                            }}
                            className="px-3.5 py-3 flex items-center justify-between gap-3 hover:bg-white/[0.04] transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                                {isMedia ? (
                                  <SafeImage
                                    src={file.thumbnail_url || file.storage_path}
                                    videoSrc={isVideo ? file.storage_path : undefined}
                                    alt={file.filename}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  React.createElement(getDocIconConfig(file).icon, {
                                    className: 'w-5 h-5 text-neutral-400',
                                  })
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                                  {file.filename}
                                </p>
                                <p className="text-[11px] text-neutral-400 font-medium tabular-nums mt-0.5">
                                  {file.extension.toUpperCase()} · {formatFileSize(file.size)}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                triggerHaptic('light');
                                setActiveActionFile(file);
                              }}
                              className="w-8 h-8 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </motion.div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  /* Clean Minimal Empty State */
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 my-auto">
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-neutral-400">
                      <LockKeyhole className="w-6 h-6 stroke-[1.5]" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-white">Private Vault is empty</p>
                      <p className="text-xs text-neutral-400 max-w-xs">
                        Move sensitive files or photos here to shield them in isolated storage.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setIsUploadOpen(true);
                      }}
                      className="mt-2 px-4 py-2 rounded-full bg-white text-black text-xs font-semibold shadow-sm hover:bg-neutral-200 transition-colors cursor-pointer"
                    >
                      Add to Vault
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ========================================================================= */}
        {/* 3. CONTEXTUAL ACTION BOTTOM SHEET FOR SELECTED FILE                       */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {activeActionFile && (
            <div
              className="fixed inset-0 z-60 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md"
              onClick={() => {
                setActiveActionFile(null);
                setLongPressedFileId(null);
              }}
            >
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={springRelaxed}
                onClick={(e) => e.stopPropagation()}
                className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-[#141416] border-t sm:border border-white/10 p-5 shadow-2xl space-y-4"
              >
                <div className="w-10 h-1.5 rounded-full bg-white/20 mx-auto cursor-grab" />

                {/* File Header */}
                <div className="flex items-center gap-3 pb-3 border-b border-white/[0.08]">
                  <div className="w-11 h-11 rounded-xl bg-neutral-900 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                    {activeActionFile.mime_type.startsWith('image/') || activeActionFile.mime_type.startsWith('video/') ? (
                      <SafeImage
                        src={activeActionFile.thumbnail_url || activeActionFile.storage_path}
                        alt={activeActionFile.filename}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FileText className="w-5 h-5 text-neutral-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">{activeActionFile.filename}</p>
                    <p className="text-[11px] text-neutral-400">
                      {formatFileSize(activeActionFile.size)} · Isolated
                    </p>
                  </div>
                </div>

                {/* Action Items */}
                <div className="space-y-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      openViewer(activeActionFile);
                      setActiveActionFile(null);
                      setLongPressedFileId(null);
                    }}
                    className="w-full p-2.5 rounded-xl hover:bg-white/[0.06] flex items-center gap-3 text-neutral-200 transition-colors text-left cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4 text-blue-400" />
                    <span>Open / Preview</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      triggerHaptic('medium');
                      await restoreFromVault(activeActionFile.id);
                      showToast('Moved to Main Library', 'success');
                      setActiveActionFile(null);
                      setLongPressedFileId(null);
                    }}
                    className="w-full p-2.5 rounded-xl hover:bg-white/[0.06] flex items-center gap-3 text-neutral-200 transition-colors text-left cursor-pointer"
                  >
                    <FolderInput className="w-4 h-4 text-emerald-400" />
                    <span>Move to Main Library</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setDetailsFile(activeActionFile);
                      setActiveActionFile(null);
                      setLongPressedFileId(null);
                    }}
                    className="w-full p-2.5 rounded-xl hover:bg-white/[0.06] flex items-center gap-3 text-neutral-200 transition-colors text-left cursor-pointer"
                  >
                    <Info className="w-4 h-4 text-purple-400" />
                    <span>File Details & Metadata</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setEditingFile(activeActionFile);
                      setActiveActionFile(null);
                      setLongPressedFileId(null);
                    }}
                    className="w-full p-2.5 rounded-xl hover:bg-white/[0.06] flex items-center gap-3 text-neutral-200 transition-colors text-left cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4 text-amber-400" />
                    <span>Rename</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setShareTargetFile(activeActionFile);
                      setActiveActionFile(null);
                      setLongPressedFileId(null);
                    }}
                    className="w-full p-2.5 rounded-xl hover:bg-white/[0.06] flex items-center gap-3 text-neutral-200 transition-colors text-left cursor-pointer"
                  >
                    <Share2 className="w-4 h-4 text-sky-400" />
                    <span>Share Private Link</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      triggerHaptic('warning');
                      await trashFile(activeActionFile.id, true);
                      showToast('File permanently deleted', 'info');
                      setActiveActionFile(null);
                      setLongPressedFileId(null);
                    }}
                    className="w-full p-2.5 rounded-xl hover:bg-red-500/10 flex items-center gap-3 text-red-400 transition-colors text-left cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Permanently Delete</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ========================================================================= */}
        {/* 4. DEDICATED SECURITY DETAILS SHEET                                       */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {showSecurityInfoSheet && (
            <div
              className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
              onClick={() => setShowSecurityInfoSheet(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: [...jellyScaleKeyframes], y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                transition={{
                  y: springRelaxed,
                  scale: jellyScaleTransition,
                  opacity: { duration: 0.35, ease: easeJelly },
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm rounded-3xl bg-[#141418] border border-white/15 p-6 shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                    <h3 className="text-sm font-bold text-white">Security Architecture</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSecurityInfoSheet(false)}
                    className="w-7 h-7 rounded-full bg-white/10 text-neutral-300 flex items-center justify-center text-xs"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] space-y-1">
                    <p className="font-semibold text-white">Private Dataset Isolation</p>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Files are sequestered inside your isolated Hugging Face private repository with encrypted metadata.
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] space-y-1">
                    <p className="font-semibold text-white">Session Protection</p>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Unlocked tokens are held only in temporary secure memory. Locking the vault immediately purges access keys.
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] space-y-1">
                    <p className="font-semibold text-white">Gallery & Search Obfuscation</p>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Vault files are strictly excluded from global search indexing, photo albums, and recent activity streams.
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-neutral-500 text-center pt-1">
                  Bytex Cloud Zero-Knowledge Vault Standard
                </p>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </StackedModalWrapper>
  );
};
