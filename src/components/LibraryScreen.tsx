import React, { useState } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import {
  Folder,
  FileText,
  FileArchive,
  Music,
  Download,
  Heart,
  Share2,
  Trash2,
  Lock,
  ChevronRight,
  ChevronLeft,
  MoreVertical,
  Plus,
  Upload,
  Info,
  Package,
  Edit2,
  FolderInput,
} from 'lucide-react';
import { useCloud } from '../context/CloudContext';
import { useScrollContainer } from '../context/ScrollContext';
import { CloudFile, FolderItem } from '../types/cloud';
import { spring, springSnappy } from '../motion';
import { Glass } from './Glass';

interface SmartFolderDef {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  filterFn: (file: CloudFile) => boolean;
}

export const LibraryScreen: React.FC = () => {
  const {
    files,
    folders,
    refreshData,
    openViewer,
    setDetailsFile,
    setShareTargetFile,
    toggleFavorite,
    trashFile,
    moveToVault,
    setIsUploadOpen,
    setIsTrashOpen,
    setIsVaultModalOpen,
    activeLibraryFolderId,
    setActiveLibraryFolderId,
    setEditingFile,
    triggerHaptic,
    showToast,
  } = useCloud();

  const activeFolderId = activeLibraryFolderId;
  const setActiveFolderId = setActiveLibraryFolderId;

  const { libraryScrollRef } = useScrollContainer();
  const { scrollY } = useScroll({ container: libraryScrollRef });
  const titleScale = useTransform(scrollY, [0, 50], [1, 0.94]);
  const titleOpacity = useTransform(scrollY, [0, 50], [1, 0.85]);

  const [contextMenuFile, setContextMenuFile] = useState<CloudFile | null>(null);
  const [folderActionTarget, setFolderActionTarget] = useState<FolderItem | null>(null);
  const [isMoveFileModalOpen, setIsMoveFileModalOpen] = useState<boolean>(false);
  const [moveTargetFile, setMoveTargetFile] = useState<CloudFile | null>(null);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatItems = (count: number) => (count === 1 ? '1 item' : `${count} items`);

  // Smart Folders definitions according to user spec
  const smartFolders: SmartFolderDef[] = [
    {
      id: 'smart-docs',
      name: 'Documents',
      icon: FileText,
      filterFn: (f) =>
        !f.is_vault &&
        !f.is_deleted &&
        (f.mime_type.includes('pdf') ||
          f.mime_type.includes('text') ||
          ['pdf', 'doc', 'docx', 'txt', 'md', 'xlsx'].includes(f.extension)),
    },
    {
      id: 'smart-archives',
      name: 'Archives',
      icon: FileArchive,
      filterFn: (f) =>
        !f.is_vault &&
        !f.is_deleted &&
        ['zip', 'rar', 'tar', 'gz', '7z'].includes(f.extension),
    },
    {
      id: 'smart-apk',
      name: 'APK Packages',
      icon: Package,
      filterFn: (f) => !f.is_vault && !f.is_deleted && f.extension === 'apk',
    },
    {
      id: 'smart-audio',
      name: 'Audio',
      icon: Music,
      filterFn: (f) => !f.is_vault && !f.is_deleted && f.mime_type.startsWith('audio/'),
    },
    {
      id: 'smart-downloads',
      name: 'Downloads',
      icon: Download,
      filterFn: (f) => !f.is_vault && !f.is_deleted && f.download_status === 'downloaded',
    },
    {
      id: 'smart-favorites',
      name: 'Favorites',
      icon: Heart,
      filterFn: (f) => !f.is_vault && !f.is_deleted && f.is_favorite,
    },
    {
      id: 'smart-shared',
      name: 'Shared Items',
      icon: Share2,
      filterFn: (f) => !f.is_vault && !f.is_deleted && f.is_shared,
    },
    {
      id: 'smart-trash',
      name: 'Trash',
      icon: Trash2,
      filterFn: (f) => f.is_deleted,
    },
  ];

  const getFileIcon = (file: CloudFile) => {
    if (file.mime_type.startsWith('video/')) return <FileText className="w-5 h-5 text-[#A1A1A1]" />;
    if (file.extension === 'zip' || file.extension === 'rar') return <FileArchive className="w-5 h-5 text-[#A1A1A1]" />;
    if (file.mime_type.startsWith('audio/')) return <Music className="w-5 h-5 text-[#A1A1A1]" />;
    return <FileText className="w-5 h-5 text-[#A1A1A1]" />;
  };

  // Folder CRUD handlers
  const handleCreateFolder = async () => {
    triggerHaptic('light');
    const folderName = prompt('Enter new folder name:');
    if (!folderName || !folderName.trim()) return;

    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: folderName.trim() }),
      });
      if (res.ok) {
        triggerHaptic('success');
        showToast(`Folder "${folderName.trim()}" created`, 'success');
        refreshData();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to create folder', 'error');
      }
    } catch {
      showToast('Network error creating folder', 'error');
    }
  };

  const handleRenameFolder = async (folder: FolderItem) => {
    triggerHaptic('light');
    const newName = prompt('Rename folder:', folder.name);
    if (!newName || !newName.trim() || newName.trim() === folder.name) return;

    try {
      const res = await fetch(`/api/folders/${folder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        triggerHaptic('success');
        showToast(`Renamed to "${newName.trim()}"`, 'success');
        refreshData();
      }
    } catch {
      showToast('Failed to rename folder', 'error');
    }
  };

  const handleDeleteFolder = async (folder: FolderItem) => {
    triggerHaptic('medium');
    if (!confirm(`Delete folder "${folder.name}"? Files inside will be moved to root.`)) return;

    try {
      const res = await fetch(`/api/folders/${folder.id}`, { method: 'DELETE' });
      if (res.ok) {
        triggerHaptic('success');
        showToast(`Folder "${folder.name}" deleted`, 'info');
        if (activeFolderId === folder.id) setActiveFolderId(null);
        refreshData();
      }
    } catch {
      showToast('Failed to delete folder', 'error');
    }
  };

  const handleMoveFile = async (fileId: string, targetFolderId: string | null) => {
    triggerHaptic('light');
    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_id: targetFolderId }),
      });
      if (res.ok) {
        showToast('Moved file successfully', 'success');
        setIsMoveFileModalOpen(false);
        setMoveTargetFile(null);
        refreshData();
      }
    } catch {
      showToast('Failed to move file', 'error');
    }
  };

  // Find active folder details
  const currentSmartFolder = smartFolders.find((sf) => sf.id === activeFolderId);
  const currentCustomFolder = folders.find((fld) => fld.id === activeFolderId);

  let folderTitle = 'Folder';
  let folderFiles: CloudFile[] = [];

  if (currentSmartFolder) {
    folderTitle = currentSmartFolder.name;
    folderFiles = files.filter(currentSmartFolder.filterFn);
  } else if (currentCustomFolder) {
    folderTitle = currentCustomFolder.name;
    folderFiles = files.filter((f) => !f.is_vault && !f.is_deleted && f.folder_id === currentCustomFolder.id);
  }

  return (
    <div className="space-y-5 pb-4">
      <AnimatePresence mode="wait">
        {!activeFolderId ? (
          /* ROOT FOLDERS VIEW (iOS Files Style) */
          <motion.div
            key="root-library"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={spring}
            className="space-y-6"
          >
            {/* Large Title */}
            <motion.section style={{ scale: titleScale, opacity: titleOpacity, transformOrigin: 'left top' }}>
              <h1 className="text-[34px] font-bold tracking-tight text-white leading-none">
                Library
              </h1>
            </motion.section>

            {/* Smart Folders Grouped Inset Card */}
            <section className="space-y-2">
              <span className="text-[13px] font-semibold text-[#666666] uppercase tracking-wider px-3 block">
                Locations &amp; Collections
              </span>
              <div className="rounded-[20px] bg-[#141414] overflow-hidden">
                {smartFolders.map((sf, idx) => {
                  const Icon = sf.icon;
                  const count = files.filter(sf.filterFn).length;

                  return (
                    <React.Fragment key={sf.id}>
                      <motion.div
                        onClick={() => {
                          triggerHaptic('light');
                          if (sf.id === 'smart-trash') {
                            setIsTrashOpen(true);
                          } else {
                            setActiveFolderId(sf.id);
                          }
                        }}
                        whileTap={{ scale: 0.98 }}
                        transition={springSnappy}
                        className="h-[60px] px-4 flex items-center justify-between hover:bg-[#1C1C1E] transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3.5">
                          <Icon className="w-7 h-7 text-[#3B82F6] stroke-[1.5]" />
                          <span className="text-[16px] font-medium text-white">{sf.name}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[14px] text-[#A1A1A1] tabular-nums">
                            {formatItems(count)}
                          </span>
                          <ChevronRight className="w-4 h-4 text-[#666666]" />
                        </div>
                      </motion.div>
                      {idx < smartFolders.length - 1 && (
                        <div className="h-[0.5px] bg-[rgba(255,255,255,0.08)] ml-16" />
                      )}
                    </React.Fragment>
                  );
                })}

                {/* Vault Row inside Locations */}
                <div className="h-[0.5px] bg-[rgba(255,255,255,0.08)] ml-16" />
                <motion.div
                  onClick={() => {
                    triggerHaptic('light');
                    setIsVaultModalOpen(true);
                  }}
                  whileTap={{ scale: 0.98 }}
                  transition={springSnappy}
                  className="h-[60px] px-4 flex items-center justify-between hover:bg-[#1C1C1E] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <Lock className="w-7 h-7 text-[#3B82F6] stroke-[1.5]" />
                    <span className="text-[16px] font-medium text-white">Private Vault</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#666666]" />
                </motion.div>
              </div>
            </section>

            {/* My Folders Section with New Folder Button */}
            <section className="space-y-2">
              <div className="flex items-center justify-between px-3">
                <span className="text-[13px] font-semibold text-[#666666] uppercase tracking-wider block">
                  My Folders
                </span>
                <button
                  onClick={handleCreateFolder}
                  className="text-xs font-semibold text-[#3B82F6] hover:opacity-80 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Folder</span>
                </button>
              </div>

              {folders.filter((fld) => !fld.is_vault).length > 0 ? (
                <div className="rounded-[20px] bg-[#141414] overflow-hidden">
                  {folders
                    .filter((fld) => !fld.is_vault)
                    .map((fld, idx, arr) => {
                      const count = files.filter(
                        (f) => !f.is_vault && !f.is_deleted && f.folder_id === fld.id
                      ).length;

                      return (
                        <React.Fragment key={fld.id}>
                          <motion.div
                            onClick={() => {
                              triggerHaptic('light');
                              setActiveFolderId(fld.id);
                            }}
                            whileTap={{ scale: 0.98 }}
                            transition={springSnappy}
                            className="h-[60px] px-4 flex items-center justify-between hover:bg-[#1C1C1E] transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-3.5">
                              <Folder className="w-7 h-7 text-[#3B82F6] stroke-[1.5]" />
                              <span className="text-[16px] font-medium text-white">{fld.name}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[14px] text-[#A1A1A1] tabular-nums">
                                {formatItems(count)}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  triggerHaptic('light');
                                  setFolderActionTarget(fld);
                                }}
                                className="w-8 h-8 flex items-center justify-center text-[#666666] hover:text-white"
                                title="Folder options"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </div>
                          </motion.div>
                          {idx < arr.length - 1 && (
                            <div className="h-[0.5px] bg-[rgba(255,255,255,0.08)] ml-16" />
                          )}
                        </React.Fragment>
                      );
                    })}
                </div>
              ) : (
                <div className="rounded-[20px] bg-[#141414] p-6 text-center text-sm text-[#A1A1A1]">
                  No custom folders. Tap <strong className="text-white">New Folder</strong> to create one.
                </div>
              )}
            </section>
          </motion.div>
        ) : (
          /* PUSH NAVIGATION: INSIDE FOLDER VIEW (Breadcrumb & List rows) */
          <motion.div
            key={`folder-view-${activeFolderId}`}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={spring}
            className="space-y-5"
          >
            {/* Header: Back Button & Breadcrumb */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setActiveFolderId(null);
                }}
                className="flex items-center gap-1 text-[16px] font-medium text-[#3B82F6] hover:opacity-80 cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5 -ml-1" />
                <span>Library</span>
              </button>

              <button
                onClick={() => {
                  triggerHaptic('light');
                  setIsUploadOpen(true);
                }}
                className="w-9 h-9 rounded-full liquid-glass-base flex items-center justify-center text-white"
                title="Upload here"
              >
                <Upload className="w-4 h-4" />
              </button>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs text-[#A1A1A1] mb-1">
                <span>Library</span>
                <span>/</span>
                <span className="text-[#3B82F6]">{folderTitle}</span>
              </div>
              <h2 className="text-[34px] font-bold tracking-tight text-white leading-none">
                {folderTitle}
              </h2>
              <p className="text-[13px] text-[#A1A1A1] tabular-nums mt-1">
                {formatItems(folderFiles.length)}
              </p>
            </div>

            {/* List Rows */}
            {folderFiles.length > 0 ? (
              <div className="rounded-[20px] bg-[#141414] overflow-hidden">
                {folderFiles.map((file, idx) => (
                  <React.Fragment key={file.id}>
                    <div
                      onClick={() => {
                        triggerHaptic('light');
                        openViewer(file);
                      }}
                      className="h-[60px] px-4 flex items-center justify-between hover:bg-[#1C1C1E] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-[10px] bg-[#1C1C1E] flex items-center justify-center shrink-0">
                          {getFileIcon(file)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[15px] font-medium text-white truncate leading-tight">
                            {file.filename}
                          </p>
                          <p className="text-[12px] text-[#A1A1A1] tabular-nums mt-0.5">
                            {formatBytes(file.size)} · {file.extension.toUpperCase()} · {new Date(file.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic('light');
                          setContextMenuFile(file);
                        }}
                        className="w-11 h-11 flex items-center justify-center text-[#666666] hover:text-white"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                    {idx < folderFiles.length - 1 && (
                      <div className="h-[0.5px] bg-[rgba(255,255,255,0.08)] ml-16" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            ) : (
              /* Empty Folder State */
              <div className="rounded-[20px] bg-[#141414] p-12 flex flex-col items-center justify-center text-center space-y-4">
                <Folder className="w-12 h-12 text-[#666666] stroke-[1.2]" />
                <div>
                  <p className="text-[16px] font-semibold text-white">No files yet</p>
                  <p className="text-[13px] text-[#A1A1A1] mt-0.5">
                    Upload documents, archives, or media to this folder.
                  </p>
                </div>
                <motion.button
                  onClick={() => {
                    triggerHaptic('light');
                    setIsUploadOpen(true);
                  }}
                  whileTap={{ scale: 0.97 }}
                  transition={springSnappy}
                  className="px-5 py-2.5 rounded-[14px] bg-[#3B82F6] text-white text-[14px] font-semibold cursor-pointer"
                >
                  Upload
                </motion.button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Folder Actions Menu (Rename / Delete) */}
      <AnimatePresence>
        {folderActionTarget && (
          <div
            onClick={() => setFolderActionTarget(null)}
            className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xl flex items-end sm:items-center justify-center p-4 pointer-events-auto"
          >
            <motion.div
              initial={{ y: 80, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 80, opacity: 0, scale: 0.96 }}
              transition={spring}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-[24px] liquid-glass-modal p-2 space-y-1 shadow-2xl border border-white/15"
            >
              <div className="px-4 py-2 border-b border-white/10">
                <p className="text-sm font-semibold text-white truncate">{folderActionTarget.name}</p>
                <p className="text-xs text-[#A1A1A1]">Folder options</p>
              </div>
              <button
                onClick={() => {
                  const target = folderActionTarget;
                  setFolderActionTarget(null);
                  handleRenameFolder(target);
                }}
                className="w-full px-4 py-3 rounded-[16px] flex items-center gap-3 text-sm text-white hover:bg-white/10 transition-colors"
              >
                <Edit2 className="w-4 h-4 text-[#3B82F6]" />
                <span>Rename Folder</span>
              </button>
              <button
                onClick={() => {
                  const target = folderActionTarget;
                  setFolderActionTarget(null);
                  handleDeleteFolder(target);
                }}
                className="w-full px-4 py-3 rounded-[16px] flex items-center gap-3 text-sm text-red-400 hover:bg-white/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Folder</span>
              </button>
              <button
                onClick={() => setFolderActionTarget(null)}
                className="w-full px-4 py-2.5 rounded-[16px] text-center text-xs font-semibold text-[#A1A1A1] hover:text-white"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Context Menu for File Rows */}
      <AnimatePresence>
        {contextMenuFile && (
          <div
            onClick={() => setContextMenuFile(null)}
            className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xl flex items-end sm:items-center justify-center p-4 pointer-events-auto"
          >
            <motion.div
              initial={{ y: 100, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 100, opacity: 0, scale: 0.96 }}
              transition={spring}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-[24px] liquid-glass-modal p-2 space-y-1 shadow-2xl border border-white/15"
            >
              <div className="px-4 py-2 border-b border-white/10">
                <p className="text-sm font-semibold text-white truncate">
                  {contextMenuFile.filename}
                </p>
                <p className="text-xs text-[#A1A1A1] tabular-nums">
                  {formatBytes(contextMenuFile.size)} · {contextMenuFile.extension.toUpperCase()}
                </p>
              </div>

              <button
                onClick={() => {
                  const f = contextMenuFile;
                  setContextMenuFile(null);
                  setMoveTargetFile(f);
                  setIsMoveFileModalOpen(true);
                }}
                className="w-full px-4 py-3 rounded-[16px] flex items-center gap-3 text-sm text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <FolderInput className="w-4 h-4 text-[#3B82F6]" />
                <span>Move to Folder...</span>
              </button>

              <button
                onClick={() => {
                  toggleFavorite(contextMenuFile.id);
                  setContextMenuFile(null);
                }}
                className="w-full px-4 py-3 rounded-[16px] flex items-center gap-3 text-sm text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Heart
                  className={`w-4 h-4 ${
                    contextMenuFile.is_favorite ? 'fill-red-500 text-red-500' : 'text-white'
                  }`}
                />
                <span>{contextMenuFile.is_favorite ? 'Remove Favorite' : 'Favorite'}</span>
              </button>

              <button
                onClick={() => {
                  setShareTargetFile(contextMenuFile);
                  setContextMenuFile(null);
                }}
                className="w-full px-4 py-3 rounded-[16px] flex items-center gap-3 text-sm text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-white" />
                <span>Share Link</span>
              </button>

              <button
                onClick={() => {
                  setDetailsFile(contextMenuFile);
                  setContextMenuFile(null);
                }}
                className="w-full px-4 py-3 rounded-[16px] flex items-center gap-3 text-sm text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Info className="w-4 h-4 text-white" />
                <span>Get Info</span>
              </button>

              <button
                onClick={() => {
                  moveToVault(contextMenuFile.id);
                  setContextMenuFile(null);
                }}
                className="w-full px-4 py-3 rounded-[16px] flex items-center gap-3 text-sm text-amber-400 hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>Move to Secret Vault</span>
              </button>

              <button
                onClick={() => {
                  trashFile(contextMenuFile.id);
                  setContextMenuFile(null);
                }}
                className="w-full px-4 py-3 rounded-[16px] flex items-center gap-3 text-sm text-red-400 hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Move to Trash</span>
              </button>

              <div className="pt-1">
                <button
                  onClick={() => setContextMenuFile(null)}
                  className="w-full py-2.5 text-center text-xs font-semibold text-[#A1A1A1] hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Move File to Folder Dialog */}
      <AnimatePresence>
        {isMoveFileModalOpen && moveTargetFile && (
          <div
            onClick={() => setIsMoveFileModalOpen(false)}
            className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xl flex items-end sm:items-center justify-center p-4 pointer-events-auto"
          >
            <motion.div
              initial={{ y: 100, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 100, opacity: 0, scale: 0.96 }}
              transition={spring}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-[24px] liquid-glass-modal p-4 space-y-3 shadow-2xl border border-white/15"
            >
              <div className="border-b border-white/10 pb-2">
                <h3 className="text-base font-semibold text-white">Move to Folder</h3>
                <p className="text-xs text-[#A1A1A1] truncate mt-0.5">{moveTargetFile.filename}</p>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1 divide-y divide-white/[0.06]">
                {/* Root option */}
                <button
                  onClick={() => handleMoveFile(moveTargetFile.id, null)}
                  className="w-full p-2.5 rounded-xl flex items-center justify-between text-sm text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <span className="font-medium">Main Library (Root)</span>
                  {moveTargetFile.folder_id === null && <span className="text-xs text-[#3B82F6]">Current</span>}
                </button>

                {folders.filter((fld) => !fld.is_vault).map((fld) => (
                  <button
                    key={fld.id}
                    onClick={() => handleMoveFile(moveTargetFile.id, fld.id)}
                    className="w-full p-2.5 rounded-xl flex items-center justify-between text-sm text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Folder className="w-4 h-4 text-[#3B82F6]" />
                      <span>{fld.name}</span>
                    </div>
                    {moveTargetFile.folder_id === fld.id && <span className="text-xs text-[#3B82F6]">Current</span>}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setIsMoveFileModalOpen(false)}
                className="w-full py-2.5 rounded-xl text-center text-xs font-semibold text-[#A1A1A1] hover:text-white"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
