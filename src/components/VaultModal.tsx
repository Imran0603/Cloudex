import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  Unlock,
  Fingerprint,
  KeyRound,
  ShieldCheck,
  X,
  Maximize2,
  Minimize2,
  Upload,
  FolderPlus,
  Eye,
  ArrowLeft,
  FileText,
  FileArchive,
  Film,
  LockKeyhole,
} from 'lucide-react';
import { useCloud } from '../context/CloudContext';
import { CloudFile } from '../types/cloud';
import { StackedModalWrapper } from '../context/ModalStackContext';
import {
  springBouncy,
  shakeKeyframes,
  springJelly,
  jellyScaleKeyframes,
  jellyScaleTransition,
  easeJelly,
} from '../motion';

export const VaultModal: React.FC = () => {
  const {
    isVaultModalOpen,
    setIsVaultModalOpen,
    isVaultUnlocked,
    unlockVault,
    lockVault,
    vaultFiles,
    vaultFolders,
    openViewer,
    setDetailsFile,
    restoreFromVault,
    setIsUploadOpen,
    triggerHaptic,
    prefersReducedMotion,
  } = useCloud();

  const [pinInput, setPinInput] = useState<string>('');
  const [isBiometricScanning, setIsBiometricScanning] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeVaultTab, setActiveVaultTab] = useState<'all' | 'documents' | 'media'>('all');
  const [windowMode, setWindowMode] = useState<'compact' | 'expanded'>('compact');

  const handleToggleExpand = () => {
    triggerHaptic('light');
    setWindowMode((prev) => (prev === 'compact' ? 'expanded' : 'compact'));
  };

  if (!isVaultModalOpen) return null;

  // Keypad numbers
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

      // If full 6 digits entered, attempt auto-submit
      if (nextPin.length === 6) {
        const success = await unlockVault({ pin: nextPin });
        if (success) {
          triggerHaptic('success');
        } else {
          triggerHaptic('warning');
          setPinInput('');
          setAuthError('Incorrect PIN code');
        }
      }
    }
  };

  // Simulate Biometric Device Scanning (Touch ID / Face ID)
  const handleBiometricAuth = async () => {
    triggerHaptic('medium');
    setIsBiometricScanning(true);
    setAuthError(null);

    // Realistic biometric scan duration
    setTimeout(async () => {
      setIsBiometricScanning(false);
      const success = await unlockVault({ biometric_verified: true });
      if (!success) {
        setAuthError('Biometric sensor rejected. Please enter PIN.');
      }
    }, 900);
  };

  const filteredVaultFiles = vaultFiles.filter((f) => {
    if (activeVaultTab === 'media') return f.mime_type.startsWith('image/') || f.mime_type.startsWith('video/');
    if (activeVaultTab === 'documents') return !f.mime_type.startsWith('image/') && !f.mime_type.startsWith('video/');
    return true;
  });

  return (
    <StackedModalWrapper
      id="vault-modal"
      isOpen={isVaultModalOpen}
      onClose={() => setIsVaultModalOpen(false)}
      type="sheet"
    >
      <motion.div
        initial={{ y: '100%', opacity: 0, scale: 0.95 }}
        animate={{
          y: 0,
          opacity: 1,
          scale: [...jellyScaleKeyframes],
          height: windowMode === 'expanded' ? '100dvh' : '85dvh',
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
        className="w-full max-w-xl mx-auto liquid-glass-modal overflow-hidden flex flex-col border border-white/15 shadow-2xl relative select-none"
      >
        {/* Drag Pill */}
        <div
          onClick={handleToggleExpand}
          className="w-12 h-1.5 bg-white/25 rounded-full mx-auto mt-2 cursor-grab active:cursor-grabbing hover:bg-white/40 transition-colors"
          title="Swipe up to expand, swipe down to close"
        />

        {/* Header Bar */}
        <div className="h-16 px-6 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                isVaultUnlocked ? 'bg-blue-500/20 text-blue-400' : 'bg-neutral-800 text-neutral-400'
              }`}
            >
              {isVaultUnlocked ? <Unlock className="w-4 h-4" /> : <LockKeyhole className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-white">Private Vault</h2>
              <span className="text-[10px] text-neutral-400">
                {isVaultUnlocked ? 'Authenticated Session · HF Private Dataset' : 'Encrypted Security Boundary'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isVaultUnlocked && (
              <button
                onClick={() => {
                  triggerHaptic('heavy');
                  lockVault();
                }}
                className="px-3 py-1.5 rounded-full text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Lock Now
              </button>
            )}

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
                setIsVaultModalOpen(false);
              }}
              className="w-11 h-11 rounded-full liquid-glass-base flex items-center justify-center text-white cursor-pointer shadow-lg hover:border-white/35 active:scale-95 transition-transform touch-manipulation shrink-0"
              aria-label="Close vault modal"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Content Area: Authentication Screen vs Unlocked Vault */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-6">
          {!isVaultUnlocked ? (
            /* 1. VAULT AUTHENTICATION FLOW */
            <div className="max-w-sm mx-auto flex flex-col items-center text-center space-y-6 py-4">
              <motion.div
                animate={
                  isBiometricScanning
                    ? { scale: [1, 1.08, 1], filter: ['brightness(1)', 'brightness(1.5)', 'brightness(1)'] }
                    : {}
                }
                transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }}
                className="relative"
              >
                {/* Glowing Concentric Pulse Rings when scanning */}
                {isBiometricScanning && (
                  <>
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0.8 }}
                      animate={{ scale: 1.6, opacity: 0 }}
                      transition={{ repeat: Infinity, duration: 1.4, ease: 'easeOut' }}
                      className="absolute inset-0 rounded-full border-2 border-blue-400 pointer-events-none"
                    />
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0.8 }}
                      animate={{ scale: 1.9, opacity: 0 }}
                      transition={{ repeat: Infinity, duration: 1.4, delay: 0.3, ease: 'easeOut' }}
                      className="absolute inset-0 rounded-full border border-blue-500/60 pointer-events-none"
                    />
                  </>
                )}
                <div className="w-20 h-20 rounded-full liquid-glass-modal flex items-center justify-center border border-white/20 shadow-xl relative z-10">
                  <Fingerprint className={`w-10 h-10 transition-colors duration-300 ${isBiometricScanning ? 'text-blue-300' : 'text-blue-400'}`} />
                </div>
              </motion.div>

              <div>
                <h3 className="text-lg font-semibold text-white">Biometric Authorization</h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Touch ID or 6-digit master PIN required to access isolated vault files.
                </p>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  (Default demo PIN: <span className="tabular-numbers text-neutral-300">112233</span>)
                </p>
              </div>

              {/* Biometric trigger button */}
              <motion.button
                type="button"
                onClick={handleBiometricAuth}
                disabled={isBiometricScanning}
                whileTap={{ scale: 0.95 }}
                transition={springBouncy}
                className="w-full py-3 rounded-2xl liquid-glass-modal border border-white/20 text-xs font-semibold text-white hover:bg-white/10 flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-lg touch-manipulation"
              >
                <Fingerprint className="w-4 h-4 text-blue-400" />
                <span>{isBiometricScanning ? 'Verifying biometric signature...' : 'Authenticate with Biometrics'}</span>
              </motion.button>

              {/* PIN Code Dots Indicator with Shake Effect */}
              <div className="space-y-3 w-full">
                <motion.div
                  animate={authError ? { x: shakeKeyframes } : { x: 0 }}
                  transition={{ duration: 0.45, ease: 'easeInOut' }}
                  className="flex items-center justify-center gap-3.5 py-2"
                >
                  {[0, 1, 2, 3, 4, 5].map((idx) => {
                    const filled = pinInput.length > idx;
                    return (
                      <motion.div
                        key={idx}
                        animate={{ scale: filled ? 1.25 : 1 }}
                        transition={springBouncy}
                        className={`w-3.5 h-3.5 rounded-full transition-colors ${
                          filled ? 'bg-blue-500 shadow-md shadow-blue-500/60' : 'bg-neutral-800 border border-neutral-700'
                        }`}
                      />
                    );
                  })}
                </motion.div>

                {authError && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-red-400 font-medium"
                  >
                    {authError}
                  </motion.p>
                )}
              </div>

              {/* 6-Digit Numerical Keypad with Tactile Feedback */}
              <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
                {keypadKeys.map((key, i) => {
                  if (key === '') return <div key={i} />;
                  return (
                    <motion.button
                      key={i}
                      type="button"
                      onClick={() => handleKeypadPress(key)}
                      whileTap={{ scale: 0.88 }}
                      transition={springBouncy}
                      className="h-14 rounded-2xl bg-neutral-900 border-[0.5px] border-white/10 text-xl font-medium text-white hover:bg-neutral-800 transition-colors flex items-center justify-center cursor-pointer tabular-numbers touch-manipulation select-none active:bg-white/15"
                    >
                      {key}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* 2. UNLOCKED VAULT CONTENT */
            <div className="space-y-6">
              {/* Vault Security Notice */}
              <div className="p-3.5 rounded-2xl bg-blue-950/20 border border-blue-500/20 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-blue-300">Vault Security Boundary Active</p>
                  <p className="text-neutral-400 mt-0.5 leading-relaxed">
                    These files are stored in your private Hugging Face dataset and isolated by backend authorization. They will not appear in normal photo galleries, global searches, or recent tabs.
                  </p>
                </div>
              </div>

              {/* Sub-Filters */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 p-1 rounded-full bg-neutral-900 border border-neutral-800">
                  {(['all', 'documents', 'media'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => {
                        triggerHaptic('light');
                        setActiveVaultTab(tab);
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors cursor-pointer ${
                        activeVaultTab === tab ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    triggerHaptic('light');
                    setIsUploadOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload to Vault</span>
                </button>
              </div>

              {/* Secret Files Grid / List */}
              {filteredVaultFiles.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {filteredVaultFiles.map((file) => {
                    const isMedia = file.mime_type.startsWith('image/') || file.mime_type.startsWith('video/');
                    return (
                      <div
                        key={file.id}
                        className="rounded-2xl bg-[#141414] border border-neutral-800 p-3 space-y-2 group relative overflow-hidden"
                      >
                        {isMedia ? (
                          <div
                            onClick={() => openViewer(file)}
                            className="aspect-video rounded-xl overflow-hidden bg-neutral-900 cursor-pointer"
                          >
                            <img
                              src={file.thumbnail_url || file.storage_path}
                              alt={file.filename}
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        ) : (
                          <div
                            onClick={() => openViewer(file)}
                            className="aspect-video rounded-xl bg-neutral-900 flex items-center justify-center cursor-pointer hover:bg-neutral-850 transition-colors"
                          >
                            <FileText className="w-7 h-7 text-neutral-400" />
                          </div>
                        )}

                        <div className="space-y-0.5">
                          <p className="text-xs font-medium text-white truncate">{file.filename}</p>
                          <p className="text-[10px] text-neutral-500 tabular-numbers">
                            {(file.size / (1024 * 1024)).toFixed(1)} MB · Secret
                          </p>
                        </div>

                        {/* Move out of vault button */}
                        <div className="pt-1 flex items-center justify-between border-t border-neutral-800">
                          <button
                            onClick={() => restoreFromVault(file.id)}
                            className="text-[11px] text-neutral-400 hover:text-white transition-colors cursor-pointer"
                          >
                            Move to Library
                          </button>
                          <button
                            onClick={() => setDetailsFile(file)}
                            className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                          >
                            Details
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-12 text-center text-xs text-neutral-500">
                  No secret files in this category. Tap "Upload to Vault" or select items from Library to protect them.
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </StackedModalWrapper>
  );
};
