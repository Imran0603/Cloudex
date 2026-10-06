import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Edit3,
  Check,
  Film,
  Music,
  FileText,
  Sliders,
  Folder,
  Sparkles,
  Tag,
  Palette,
  Heart,
} from 'lucide-react';
import { CloudFile } from '../types/cloud';
import { useCloud } from '../context/CloudContext';
import { StackedModalWrapper } from '../context/ModalStackContext';
import {
  springRelaxed,
  springSquishy,
  springJelly,
  jellyScaleKeyframes,
  jellyScaleTransition,
  easeJelly,
} from '../motion';

interface FileEditModalProps {
  file: CloudFile | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenPhotoEditor?: () => void;
}

export const FileEditModal: React.FC<FileEditModalProps> = ({
  file,
  isOpen,
  onClose,
  onOpenPhotoEditor,
}) => {
  const { updateFile, folders, triggerHaptic, showToast } = useCloud();

  const [filename, setFilename] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [sourceDevice, setSourceDevice] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (file) {
      setFilename(file.filename);
      setDisplayName(file.filename.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
      setSourceDevice(file.source_device || '');
      setLocation(file.location || '');
      setFolderId(file.folder_id || null);
      setIsFavorite(file.is_favorite || false);
    }
  }, [file]);

  if (!file) return null;

  const isAudio = file.mime_type.startsWith('audio/') || ['mp3', 'wav', 'flac', 'm4a'].includes(file.extension.toLowerCase());
  const isVideo = file.mime_type.startsWith('video/') || ['mp4', 'mov', 'webm'].includes(file.extension.toLowerCase());
  const isImage = file.mime_type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].includes(file.extension.toLowerCase());

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filename.trim()) {
      triggerHaptic('warning');
      showToast('Filename cannot be empty', 'error');
      return;
    }

    setIsSaving(true);
    triggerHaptic('medium');

    try {
      // Ensure extension is retained
      let finalName = filename.trim();
      const currentExt = file.extension ? `.${file.extension}` : '';
      if (currentExt && !finalName.toLowerCase().endsWith(currentExt.toLowerCase())) {
        finalName = `${finalName}${currentExt}`;
      }

      const updates: Partial<CloudFile> = {
        filename: finalName,
        source_device: sourceDevice,
        location: location,
        folder_id: folderId,
        is_favorite: isFavorite,
      };

      const result = await updateFile(file.id, updates);
      if (result) {
        triggerHaptic('success');
        showToast('File updated successfully', 'success');
        onClose();
      } else {
        triggerHaptic('warning');
        showToast('Failed to save file changes', 'error');
      }
    } catch {
      triggerHaptic('warning');
      showToast('Failed to save changes', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <StackedModalWrapper
      id="file-edit-modal"
      isOpen={isOpen}
      onClose={onClose}
      type="dialog"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: [...jellyScaleKeyframes], y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{
          y: springJelly,
          scale: jellyScaleTransition,
          opacity: { duration: 0.35, ease: easeJelly },
        }}
        className="w-full max-w-lg bg-[#121216] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[88vh] overflow-y-auto no-scrollbar"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Edit & Rename File
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-neutral-300">
                  {file.extension.toUpperCase()}
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Update file name, tags, metadata, and location
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-neutral-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Thumbnail Preview Card */}
        <div className="flex items-center gap-4 p-3 rounded-2xl bg-white/[0.03] border border-white/10">
          <div className="w-14 h-14 rounded-xl bg-neutral-900 overflow-hidden shrink-0 flex items-center justify-center border border-white/10 relative">
            {file.thumbnail_url ? (
              <img
                src={file.thumbnail_url}
                alt={file.filename}
                className="w-full h-full object-cover"
              />
            ) : isVideo ? (
              <Film className="w-6 h-6 text-blue-400" />
            ) : isAudio ? (
              <Music className="w-6 h-6 text-purple-400" />
            ) : (
              <FileText className="w-6 h-6 text-neutral-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-mono text-neutral-400">Current Filename</p>
            <p className="text-sm font-semibold text-white truncate">{file.filename}</p>
            <p className="text-[11px] text-neutral-400">
              {(file.size / (1024 * 1024)).toFixed(2)} MB · {file.mime_type}
            </p>
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Filename Input */}
          <div className="space-y-1.5">
            <label className="text-neutral-300 font-semibold flex items-center justify-between">
              <span>File Name</span>
              <span className="text-[10px] text-neutral-500 font-normal">Extension will be preserved</span>
            </label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="e.g. Summer_Holiday_Video.mp4"
              className="w-full bg-white/5 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Audio & Video Specific Fields */}
          {(isAudio || isVideo) && (
            <div className="p-3.5 rounded-2xl bg-purple-500/5 border border-purple-500/20 space-y-3">
              <div className="flex items-center gap-1.5 text-purple-300 font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>{isAudio ? 'Audio Track Metadata' : 'Video Media Info'}</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-neutral-300 font-medium">Display Title</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Song or Video title"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder:text-neutral-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-neutral-400">Source / Artist</label>
                  <input
                    type="text"
                    value={sourceDevice}
                    onChange={(e) => setSourceDevice(e.target.value)}
                    placeholder="e.g. Sony A7 IV / Studio"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-white placeholder:text-neutral-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-400">Location / Album</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Tokyo, Japan"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-white placeholder:text-neutral-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Photo Specific: Button to launch full Image Editor */}
          {isImage && onOpenPhotoEditor && (
            <div className="p-3.5 rounded-2xl bg-blue-500/5 border border-blue-500/20 flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">Advanced Photo Editor</p>
                <p className="text-[11px] text-neutral-400">Adjust exposure, contrast, filters, crop, & rotation</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  onClose();
                  onOpenPhotoEditor();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Open Editor</span>
              </button>
            </div>
          )}

          {/* Folder Destination Selector */}
          <div className="space-y-1.5">
            <label className="text-neutral-300 font-semibold flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-neutral-400" />
              <span>Folder Destination</span>
            </label>
            <select
              value={folderId || ''}
              onChange={(e) => setFolderId(e.target.value ? e.target.value : null)}
              className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="">Root Library (No folder)</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  📁 {f.name} {f.is_vault ? '🔒 (Vault)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Favorite Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/10">
            <div className="flex items-center gap-2">
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-neutral-400'}`} />
              <span className="text-neutral-300 font-medium">Mark as Favorite</span>
            </div>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setIsFavorite(!isFavorite);
              }}
              className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                isFavorite ? 'bg-red-500' : 'bg-white/20'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  isFavorite ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <motion.button
              type="submit"
              disabled={isSaving}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={springSquishy}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1.5 shadow-lg shadow-blue-600/30 cursor-pointer transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </motion.button>
          </div>
        </form>
      </motion.div>
    </StackedModalWrapper>
  );
};
