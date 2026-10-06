import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Share2, X, Maximize2, Minimize2, Lock, Link, Check, Trash2, Calendar, ShieldAlert } from 'lucide-react';
import { useCloud } from '../context/CloudContext';
import { StackedModalWrapper } from '../context/ModalStackContext';
import {
  springJelly,
  jellyScaleKeyframes,
  jellyScaleTransition,
  easeJelly,
} from '../motion';

export const ShareModal: React.FC = () => {
  const {
    shareTargetFile,
    setShareTargetFile,
    shares,
    createShareLink,
    revokeShareLink,
    triggerHaptic,
    showToast,
  } = useCloud();

  const [windowMode, setWindowMode] = useState<'compact' | 'expanded'>('compact');
  const [expiresInDays, setExpiresInDays] = useState<number>(7);
  const [allowDownload, setAllowDownload] = useState<boolean>(true);
  const [password, setPassword] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  if (!shareTargetFile) return null;

  const handleToggleExpand = () => {
    triggerHaptic('light');
    setWindowMode((prev) => (prev === 'compact' ? 'expanded' : 'compact'));
  };

  if (shareTargetFile.is_vault) {
    return (
      <StackedModalWrapper
        id="share-modal-vault-alert"
        isOpen={Boolean(shareTargetFile)}
        onClose={() => setShareTargetFile(null)}
        type="dialog"
      >
        <div className="w-full max-w-sm rounded-[24px] liquid-glass-modal p-6 text-center space-y-3 mx-auto shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-white">Vault Security Policy</h3>
          <p className="text-xs text-[#A1A1A1]">
            Files stored inside Private Vault cannot be shared publicly by default. Please move the file to your Library first if sharing is required.
          </p>
          <button
            onClick={() => setShareTargetFile(null)}
            className="w-full py-2.5 rounded-xl bg-neutral-900 text-xs font-semibold text-white hover:bg-neutral-800 cursor-pointer"
          >
            Close
          </button>
        </div>
      </StackedModalWrapper>
    );
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    triggerHaptic('light');

    const result = await createShareLink({
      fileId: shareTargetFile.id,
      expiresInDays: expiresInDays === 0 ? undefined : expiresInDays,
      allowDownload,
      password: password.trim() ? password.trim() : undefined,
    });

    setIsSubmitting(false);
    if (result) {
      setGeneratedUrl(result.file_url || `${window.location.origin}/share/${result.id}`);
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    triggerHaptic('success');
    showToast('Copied share link to clipboard', 'success');
  };

  const fileShares = shares.filter((s) => s.file_id === shareTargetFile.id);

  return (
    <StackedModalWrapper
      id="share-modal"
      isOpen={Boolean(shareTargetFile)}
      onClose={() => setShareTargetFile(null)}
      type="sheet"
    >
      <motion.div
        initial={{ y: '100%', opacity: 0, scale: 0.95 }}
        animate={{
          y: 0,
          opacity: 1,
          scale: [...jellyScaleKeyframes],
          height: windowMode === 'expanded' ? '100dvh' : '82dvh',
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
              setShareTargetFile(null);
            }
          }
        }}
        className="w-full max-w-md liquid-glass-sheet p-6 space-y-5 shadow-2xl mx-auto overflow-y-auto no-scrollbar relative select-none flex flex-col"
      >
        {/* Drag Pill */}
        <div
          onClick={handleToggleExpand}
          className="w-12 h-1.5 bg-white/25 rounded-full mx-auto -mt-2 mb-2 cursor-grab active:cursor-grabbing hover:bg-white/40 transition-colors"
          title="Swipe up to expand, swipe down to close"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Share Secure Link</h3>
              <p className="text-[11px] text-[#A1A1A1] truncate max-w-[220px]">
                {shareTargetFile.filename}
              </p>
            </div>
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
                setShareTargetFile(null);
              }}
              className="w-11 h-11 rounded-full liquid-glass-base flex items-center justify-center text-white cursor-pointer shadow-lg hover:border-white/35 active:scale-95 transition-transform touch-manipulation shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {generatedUrl ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-neutral-900 border border-emerald-500/30 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium">
                <Check className="w-4 h-4" />
                <span>Link Ready to Share</span>
              </div>
              <input
                readOnly
                value={generatedUrl}
                className="w-full bg-black/40 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => copyToClipboard(generatedUrl)}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-colors"
              >
                Copy Link
              </button>
              <button
                onClick={() => setGeneratedUrl(null)}
                className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-neutral-300"
              >
                Create Another
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-neutral-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Link Expiry</span>
              </label>
              <select
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white focus:outline-none"
              >
                <option value={1}>1 Day</option>
                <option value={7}>7 Days</option>
                <option value={30}>30 Days</option>
                <option value={0}>Never Expire</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-neutral-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Optional Password Protection</span>
              </label>
              <input
                type="password"
                placeholder="Leave blank for no password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-900/60 border border-neutral-800">
              <span className="text-xs text-neutral-300">Allow Direct Download</span>
              <input
                type="checkbox"
                checked={allowDownload}
                onChange={(e) => setAllowDownload(e.target.checked)}
                className="accent-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-semibold text-white transition-colors"
            >
              {isSubmitting ? 'Generating...' : 'Generate Share Link'}
            </button>
          </form>
        )}

        {fileShares.length > 0 && (
          <div className="pt-2 border-t border-neutral-800 space-y-2">
            <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
              Active Links for this File
            </span>
            <div className="divide-y divide-neutral-800 rounded-xl bg-neutral-900 overflow-hidden">
              {fileShares.map((s) => (
                <div key={s.id} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-white text-[11px]">...{s.id.slice(-8)}</p>
                    <p className="text-[10px] text-neutral-500">
                      {s.expires_at ? `Expires ${new Date(s.expires_at).toLocaleDateString()}` : 'No expiry'}
                    </p>
                  </div>
                  <button
                    onClick={() => revokeShareLink(s.id)}
                    className="p-1.5 text-red-400 hover:text-red-300"
                    title="Revoke Link"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </StackedModalWrapper>
  );
};
