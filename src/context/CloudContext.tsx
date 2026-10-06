import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  CloudFile,
  FolderItem,
  AlbumItem,
  ShareLink,
  AutoBackupConfig,
  UploadQueueItem,
  StorageOverview,
  HuggingFaceStatus,
  TabType,
  FilterType,
  SortOption,
  GridZoomLevel,
} from '../types/cloud';

interface DuplicateConflict {
  file: File;
  hash: string;
  existingFile: {
    id: string;
    filename: string;
    size: number;
    created_at: string;
    is_vault: boolean;
  };
  targetVault: boolean;
}

interface ToastMessage {
  id: string;
  text: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface CloudContextType {
  // Navigation & View
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isNavbarVisible: boolean;
  setIsNavbarVisible: (visible: boolean) => void;

  // Files & Data
  files: CloudFile[];
  folders: FolderItem[];
  albums: AlbumItem[];
  shares: ShareLink[];
  trashItems: CloudFile[];
  storage: StorageOverview | null;
  huggingFace: HuggingFaceStatus | null;
  isLoading: boolean;
  refreshData: () => Promise<void>;

  // Filters & Sorting
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeFilter: FilterType;
  setActiveFilter: (filter: FilterType) => void;
  sortOption: SortOption;
  setSortOption: (sort: SortOption) => void;
  gridZoom: GridZoomLevel;
  setGridZoom: (zoom: GridZoomLevel) => void;

  // Vault Security Boundary
  isVaultUnlocked: boolean;
  vaultToken: string | null;
  vaultFiles: CloudFile[];
  vaultFolders: FolderItem[];
  isVaultModalOpen: boolean;
  setIsVaultModalOpen: (open: boolean) => void;
  unlockVault: (params: { pin?: string; biometric_verified?: boolean }) => Promise<boolean>;
  lockVault: () => Promise<void>;
  updateVaultConfig: (config: any) => Promise<boolean>;

  // Photo Viewer & Morphing
  activePhoto: CloudFile | null;
  universalViewerFile: CloudFile | null;
  setUniversalViewerFile: (file: CloudFile | null) => void;
  openViewer: (file: CloudFile) => void;
  closeViewer: () => void;
  nextPhoto: () => void;
  prevPhoto: () => void;

  // File Operations
  toggleFavorite: (fileId: string) => Promise<void>;
  trashFile: (fileId: string, permanent?: boolean) => Promise<void>;
  restoreTrash: (fileId: string) => Promise<void>;
  emptyTrash: () => Promise<void>;
  moveToVault: (fileId: string) => Promise<boolean>;
  restoreFromVault: (fileId: string) => Promise<boolean>;
  batchMoveToVault: (fileIds: string[]) => Promise<boolean>;
  batchDelete: (fileIds: string[]) => Promise<void>;
  updateFile: (fileId: string, updates: Partial<CloudFile>) => Promise<CloudFile | null>;
  duplicateFile: (fileId: string) => Promise<CloudFile | null>;
  revertFileToOriginal: (fileId: string) => Promise<CloudFile | null>;

  // Multi-Selection
  isSelectMode: boolean;
  setIsSelectMode: (mode: boolean) => void;
  selectedIds: string[];
  toggleSelectId: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;

  // File Details Sheet
  detailsFile: CloudFile | null;
  setDetailsFile: (file: CloudFile | null) => void;

  // Albums
  createAlbum: (name: string, fileIds?: string[]) => Promise<AlbumItem | null>;
  addToAlbum: (albumId: string, fileIds: string[]) => Promise<void>;
  deleteAlbum: (albumId: string) => Promise<void>;
  activeAlbum: AlbumItem | null;
  setActiveAlbum: (album: AlbumItem | null) => void;

  // Share
  shareTargetFile: CloudFile | null;
  setShareTargetFile: (file: CloudFile | null) => void;
  createShareLink: (params: { fileId: string; expiresInDays?: number; allowDownload?: boolean; password?: string }) => Promise<ShareLink | null>;
  revokeShareLink: (shareId: string) => Promise<void>;

  // Upload System & Queue
  isUploadOpen: boolean;
  setIsUploadOpen: (open: boolean) => void;
  isUploadQueueOpen: boolean;
  setIsUploadQueueOpen: (open: boolean) => void;
  uploadQueue: UploadQueueItem[];
  uploadFiles: (fileList: FileList | File[], targetVault?: boolean) => Promise<void>;
  pauseUpload: (id: string) => void;
  resumeUpload: (id: string) => void;
  cancelUpload: (id: string) => void;
  duplicateConflict: DuplicateConflict | null;
  resolveDuplicate: (action: 'skip' | 'replace' | 'keep') => Promise<void>;

  // Auto Backup Settings
  autoBackupConfig: AutoBackupConfig;
  updateAutoBackupConfig: (config: Partial<AutoBackupConfig>) => void;

  // Storage Manager & Trash Views
  isStorageManagerOpen: boolean;
  setIsStorageManagerOpen: (open: boolean) => void;
  isTrashOpen: boolean;
  setIsTrashOpen: (open: boolean) => void;
  isProfileOpen: boolean;
  setIsProfileOpen: (open: boolean) => void;

  // Quick Action Menu (+)
  isActionMenuOpen: boolean;
  setIsActionMenuOpen: (open: boolean) => void;

  // Hugging Face Operations
  connectHuggingFace: (repoId: string, token: string, isPrivate: boolean) => Promise<boolean>;
  syncHuggingFace: () => Promise<void>;
  disconnectHuggingFace: () => Promise<void>;
  freeUpStorage: () => Promise<void>;

  // Navigation Spaces & Auto-Back
  activeSpace: 'none' | 'media' | 'docs' | 'music';
  setActiveSpace: (space: 'none' | 'media' | 'docs' | 'music') => void;
  activeLibraryFolderId: string | null;
  setActiveLibraryFolderId: (id: string | null) => void;
  editingFile: CloudFile | null;
  setEditingFile: (file: CloudFile | null) => void;
  resetActiveTabToRoot: (tab: TabType) => void;

  // Utilities
  triggerHaptic: (type?: 'light' | 'medium' | 'heavy' | 'success' | 'warning') => void;
  toasts: ToastMessage[];
  showToast: (text: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  prefersReducedMotion: boolean;
}

const CloudContext = createContext<CloudContextType | null>(null);

export const CloudProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isNavbarVisible, setIsNavbarVisible] = useState<boolean>(true);

  const [files, setFiles] = useState<CloudFile[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [shares, setShares] = useState<ShareLink[]>([]);
  const [trashItems, setTrashItems] = useState<CloudFile[]>([]);
  const [storage, setStorage] = useState<StorageOverview | null>(null);
  const [huggingFace, setHuggingFace] = useState<HuggingFaceStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [gridZoom, setGridZoom] = useState<GridZoomLevel>(3);
  const [activeAlbum, setActiveAlbum] = useState<AlbumItem | null>(null);

  // Vault Security
  const [isVaultUnlocked, setIsVaultUnlocked] = useState<boolean>(false);
  const [vaultToken, setVaultToken] = useState<string | null>(null);
  const [vaultFiles, setVaultFiles] = useState<CloudFile[]>([]);
  const [vaultFolders, setVaultFolders] = useState<FolderItem[]>([]);
  const [isVaultModalOpen, setIsVaultModalOpen] = useState<boolean>(false);

  // Viewer, Details, Share, Storage Manager, Trash
  const [activePhoto, setActivePhoto] = useState<CloudFile | null>(null);
  const [universalViewerFile, setUniversalViewerFile] = useState<CloudFile | null>(null);
  const [detailsFile, setDetailsFile] = useState<CloudFile | null>(null);
  const [shareTargetFile, setShareTargetFile] = useState<CloudFile | null>(null);
  const [isStorageManagerOpen, setIsStorageManagerOpen] = useState<boolean>(false);
  const [isTrashOpen, setIsTrashOpen] = useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState<boolean>(false);

  // Selection
  const [isSelectMode, setIsSelectMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Uploads & Duplicates
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isUploadQueueOpen, setIsUploadQueueOpen] = useState<boolean>(false);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [duplicateConflict, setDuplicateConflict] = useState<DuplicateConflict | null>(null);

  // Auto Backup Config
  const [autoBackupConfig, setAutoBackupConfig] = useState<AutoBackupConfig>({
    enabled: true,
    wifi_only: true,
    charging_only: false,
    quality: 'original',
    selected_albums: ['all'],
  });

  const updateAutoBackupConfig = (patch: Partial<AutoBackupConfig>) => {
    setAutoBackupConfig((prev) => ({ ...prev, ...patch }));
  };

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Accessibility
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);

  // Navigation Spaces & Auto-Back
  const [activeSpace, setActiveSpace] = useState<'none' | 'media' | 'docs' | 'music'>('none');
  const [activeLibraryFolderId, setActiveLibraryFolderId] = useState<string | null>(null);
  const [editingFile, setEditingFile] = useState<CloudFile | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' = 'light') => {
    // 1. Physical Vibration API
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        if (type === 'light') navigator.vibrate(15);
        else if (type === 'medium') navigator.vibrate(30);
        else if (type === 'heavy') navigator.vibrate(50);
        else if (type === 'success') navigator.vibrate([18, 45, 25]);
        else if (type === 'warning') navigator.vibrate([40, 50, 40, 50, 30]);
      } catch {
        // Fallback silently if vibration blocked by user permission
      }
    }

    // 2. Tactile Audio Click Fallback for desktop & browsers without physical vibrator
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const freq = type === 'success' ? 880 : type === 'warning' ? 180 : type === 'heavy' ? 220 : 440;
        const dur = type === 'warning' ? 0.08 : 0.03;

        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.015, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
        osc.start();
        osc.stop(ctx.currentTime + dur);
      }
    } catch {
      // AudioCtx fallback
    }
  }, []);

  const showToast = useCallback((text: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3400);
  }, []);

  const resetActiveTabToRoot = useCallback((tab: TabType) => {
    triggerHaptic('medium');
    if (tab === 'home') {
      setActiveSpace('none');
      setUniversalViewerFile(null);
      setActivePhoto(null);
      setDetailsFile(null);
      setEditingFile(null);
      showToast('Kembali ke menu awal', 'info');
    } else if (tab === 'library') {
      setActiveLibraryFolderId(null);
      setActiveAlbum(null);
      setUniversalViewerFile(null);
      setActivePhoto(null);
      setDetailsFile(null);
      setEditingFile(null);
      showToast('Kembali ke menu awal Library', 'info');
    } else if (tab === 'gallery') {
      setActiveFilter('all');
      setActiveAlbum(null);
      setUniversalViewerFile(null);
      setActivePhoto(null);
      setDetailsFile(null);
      setEditingFile(null);
      showToast('Kembali ke galeri awal', 'info');
    }
  }, [triggerHaptic, showToast]);

  // Fetch Files & Storage Data
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [filesRes, storageRes, meRes, albumsRes, trashRes, sharesRes] = await Promise.all([
        fetch(`/api/files?sort=${sortOption}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`),
        fetch('/api/storage/overview'),
        fetch('/api/auth/me'),
        fetch('/api/albums'),
        fetch('/api/trash'),
        fetch('/api/shares'),
      ]);

      if (filesRes.ok) {
        const data = await filesRes.json();
        setFiles(data.files || []);
        setFolders(data.folders || []);
      }

      if (storageRes.ok) {
        const sData = await storageRes.json();
        setStorage(sData);
      }

      if (meRes.ok) {
        const mData = await meRes.json();
        setHuggingFace(mData.huggingface);
      }

      if (albumsRes.ok) {
        const aData = await albumsRes.json();
        setAlbums(aData.albums || []);
      }

      if (trashRes.ok) {
        const tData = await trashRes.json();
        setTrashItems(tData.items || []);
      }

      if (sharesRes.ok) {
        const shData = await sharesRes.json();
        setShares(shData.shares || []);
      }

      // If vault is currently unlocked, refresh vault files too
      if (vaultToken) {
        const vRes = await fetch('/api/vault/files', {
          headers: { 'x-vault-token': vaultToken },
        });
        if (vRes.ok) {
          const vData = await vRes.json();
          setVaultFiles(vData.files || []);
          setVaultFolders(vData.folders || []);
        } else if (vRes.status === 403) {
          setIsVaultUnlocked(false);
          setVaultToken(null);
          setVaultFiles([]);
        }
      }
    } catch (err) {
      console.error('Failed to load cloud data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [sortOption, searchQuery, vaultToken]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Vault Unlock Flow
  const unlockVault = async (params: { pin?: string; biometric_verified?: boolean }): Promise<boolean> => {
    try {
      const res = await fetch('/api/vault/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || 'Vault authorization failed', 'error');
        triggerHaptic('warning');
        return false;
      }

      const data = await res.json();
      setVaultToken(data.vault_token);
      setIsVaultUnlocked(true);

      const vRes = await fetch('/api/vault/files', {
        headers: { 'x-vault-token': data.vault_token },
      });
      if (vRes.ok) {
        const vData = await vRes.json();
        setVaultFiles(vData.files || []);
        setVaultFolders(vData.folders || []);
      }

      triggerHaptic('success');
      showToast('Private Vault Unlocked', 'success');
      return true;
    } catch (err) {
      showToast('Network error verifying vault credentials', 'error');
      return false;
    }
  };

  const lockVault = async () => {
    if (vaultToken) {
      try {
        await fetch('/api/vault/lock', {
          method: 'POST',
          headers: { 'x-vault-token': vaultToken },
        });
      } catch (err) {
        // silent
      }
    }
    setVaultToken(null);
    setIsVaultUnlocked(false);
    setVaultFiles([]);
    setIsVaultModalOpen(false);
    triggerHaptic('medium');
    showToast('Vault Secured & Locked', 'info');
  };

  const updateVaultConfig = async (config: any): Promise<boolean> => {
    try {
      const res = await fetch('/api/vault/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        showToast('Vault security settings updated', 'success');
        return true;
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to update settings', 'error');
        return false;
      }
    } catch {
      return false;
    }
  };

  // Auto-lock when tab is hidden or window blurred
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isVaultUnlocked) {
        lockVault();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isVaultUnlocked]);

  // Photo Viewer Navigation
  const allCurrentMedia = files.filter((f) => f.mime_type.startsWith('image/') || f.mime_type.startsWith('video/'));

  const openViewer = (file: CloudFile) => {
    triggerHaptic('light');
    if (file.mime_type.startsWith('image/') || file.mime_type.startsWith('video/')) {
      setActivePhoto(file);
      setUniversalViewerFile(null);
    } else {
      setUniversalViewerFile(file);
      setActivePhoto(null);
    }
  };

  const closeViewer = () => {
    triggerHaptic('light');
    setActivePhoto(null);
    setUniversalViewerFile(null);
  };

  const nextPhoto = () => {
    if (!activePhoto) return;
    const mediaPool = activePhoto.is_vault ? vaultFiles : allCurrentMedia;
    const index = mediaPool.findIndex((f) => f.id === activePhoto.id);
    if (index !== -1 && index < mediaPool.length - 1) {
      triggerHaptic('light');
      setActivePhoto(mediaPool[index + 1]);
    }
  };

  const prevPhoto = () => {
    if (!activePhoto) return;
    const mediaPool = activePhoto.is_vault ? vaultFiles : allCurrentMedia;
    const index = mediaPool.findIndex((f) => f.id === activePhoto.id);
    if (index > 0) {
      triggerHaptic('light');
      setActivePhoto(mediaPool[index - 1]);
    }
  };

  // File Operations
  const toggleFavorite = async (fileId: string) => {
    const targetFile = files.find((f) => f.id === fileId) || vaultFiles.find((f) => f.id === fileId);
    if (!targetFile) return;

    const newFav = !targetFile.is_favorite;
    triggerHaptic('light');

    setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, is_favorite: newFav } : f)));
    if (targetFile.is_vault) {
      setVaultFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, is_favorite: newFav } : f)));
    }
    if (activePhoto?.id === fileId) {
      setActivePhoto({ ...activePhoto, is_favorite: newFav });
    }
    if (universalViewerFile?.id === fileId) {
      setUniversalViewerFile({ ...universalViewerFile, is_favorite: newFav });
    }

    try {
      await fetch(`/api/files/${fileId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(vaultToken ? { 'x-vault-token': vaultToken } : {}),
        },
        body: JSON.stringify({ is_favorite: newFav }),
      });
    } catch {
      refreshData();
    }
  };

  const trashFile = async (fileId: string, permanent: boolean = false) => {
    triggerHaptic('medium');
    const removedFile = files.find((f) => f.id === fileId);
    if (removedFile) {
      setTrashItems((prev) => [{ ...removedFile, is_deleted: true }, ...prev]);
    }
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    setVaultFiles((prev) => prev.filter((f) => f.id !== fileId));
    if (activePhoto?.id === fileId) setActivePhoto(null);
    if (universalViewerFile?.id === fileId) setUniversalViewerFile(null);
    if (detailsFile?.id === fileId) setDetailsFile(null);

    try {
      await fetch(`/api/files/${fileId}${permanent ? '?permanent=true' : ''}`, {
        method: 'DELETE',
        headers: vaultToken ? { 'x-vault-token': vaultToken } : {},
      });
      showToast(permanent ? 'Permanently deleted' : 'Moved to Trash', 'info');
      refreshData();
    } catch {
      showToast('Error deleting file', 'error');
      refreshData();
    }
  };

  const restoreTrash = async (fileId: string) => {
    triggerHaptic('light');
    try {
      const res = await fetch(`/api/trash/${fileId}/restore`, { method: 'POST' });
      if (res.ok) {
        showToast('Restored file to Library', 'success');
        refreshData();
      }
    } catch {
      showToast('Failed to restore file', 'error');
    }
  };

  const emptyTrash = async () => {
    triggerHaptic('warning');
    try {
      const res = await fetch('/api/trash/empty', { method: 'POST' });
      if (res.ok) {
        showToast('Trash permanently emptied', 'info');
        setTrashItems([]);
        refreshData();
      }
    } catch {
      showToast('Failed to empty trash', 'error');
    }
  };

  const moveToVault = async (fileId: string): Promise<boolean> => {
    if (!vaultToken) {
      setIsVaultModalOpen(true);
      showToast('Please authenticate Vault first', 'warning');
      return false;
    }

    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-vault-token': vaultToken,
        },
        body: JSON.stringify({ is_vault: true }),
      });

      if (res.ok) {
        showToast('Moved to Private Vault', 'success');
        triggerHaptic('success');
        refreshData();
        return true;
      } else {
        showToast('Failed to move to vault', 'error');
        return false;
      }
    } catch {
      return false;
    }
  };

  const restoreFromVault = async (fileId: string): Promise<boolean> => {
    if (!vaultToken) return false;
    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-vault-token': vaultToken,
        },
        body: JSON.stringify({ is_vault: false }),
      });

      if (res.ok) {
        showToast('Moved back to Library', 'info');
        triggerHaptic('light');
        refreshData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const batchMoveToVault = async (fileIds: string[]): Promise<boolean> => {
    if (!vaultToken) {
      setIsVaultModalOpen(true);
      showToast('Unlock Vault to move items', 'warning');
      return false;
    }

    try {
      const res = await fetch('/api/files/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vault-token': vaultToken,
        },
        body: JSON.stringify({ action: 'move_to_vault', file_ids: fileIds }),
      });

      if (res.ok) {
        showToast(`${fileIds.length} items moved to Private Vault`, 'success');
        clearSelection();
        refreshData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const batchDelete = async (fileIds: string[]) => {
    try {
      await fetch('/api/files/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(vaultToken ? { 'x-vault-token': vaultToken } : {}),
        },
        body: JSON.stringify({ action: 'delete', file_ids: fileIds }),
      });
      showToast(`${fileIds.length} items moved to Trash`, 'info');
      clearSelection();
      refreshData();
    } catch {
      showToast('Failed to delete selected items', 'error');
    }
  };

  const updateFile = async (fileId: string, updates: Partial<CloudFile>): Promise<CloudFile | null> => {
    triggerHaptic('light');
    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(vaultToken ? { 'x-vault-token': vaultToken } : {}),
        },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        const data = await res.json();
        const updated = data.file as CloudFile;
        setFiles((prev) => prev.map((f) => (f.id === fileId ? updated : f)));
        setVaultFiles((prev) => prev.map((f) => (f.id === fileId ? updated : f)));
        if (activePhoto?.id === fileId) {
          setActivePhoto(updated);
        }
        if (detailsFile?.id === fileId) {
          setDetailsFile(updated);
        }
        return updated;
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to update file', 'error');
        return null;
      }
    } catch {
      showToast('Network error while updating file', 'error');
      return null;
    }
  };

  const duplicateFile = async (fileId: string): Promise<CloudFile | null> => {
    triggerHaptic('light');
    try {
      const res = await fetch(`/api/files/${fileId}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(vaultToken ? { 'x-vault-token': vaultToken } : {}),
        },
      });

      if (res.ok) {
        const data = await res.json();
        const dup = data.file as CloudFile;
        setFiles((prev) => [dup, ...prev]);
        showToast(`Created copy "${dup.filename}"`, 'success');
        refreshData();
        return dup;
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to duplicate file', 'error');
        return null;
      }
    } catch {
      showToast('Error duplicating file', 'error');
      return null;
    }
  };

  const revertFileToOriginal = async (fileId: string): Promise<CloudFile | null> => {
    const targetFile = files.find((f) => f.id === fileId) || vaultFiles.find((f) => f.id === fileId);
    if (!targetFile) return null;

    const originalPath = targetFile.original_storage_path || targetFile.storage_path;
    triggerHaptic('medium');

    const res = await updateFile(fileId, {
      storage_path: originalPath,
      thumbnail_url: originalPath,
      edited_version_url: undefined,
      edit_history: [],
    });

    if (res) {
      showToast('Reverted to original photo', 'success');
    }
    return res;
  };

  // Albums
  const createAlbum = async (name: string, fileIds: string[] = []): Promise<AlbumItem | null> => {
    triggerHaptic('light');
    try {
      const res = await fetch('/api/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, file_ids: fileIds }),
      });
      if (res.ok) {
        const data = await res.json();
        showToast(`Created album "${name}"`, 'success');
        refreshData();
        return data.album;
      }
    } catch {
      showToast('Failed to create album', 'error');
    }
    return null;
  };

  const addToAlbum = async (albumId: string, fileIds: string[]) => {
    triggerHaptic('light');
    try {
      const res = await fetch(`/api/albums/${albumId}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_ids: fileIds }),
      });
      if (res.ok) {
        showToast(`Added ${fileIds.length} items to album`, 'success');
        refreshData();
      }
    } catch {
      showToast('Failed to add to album', 'error');
    }
  };

  const deleteAlbum = async (albumId: string) => {
    triggerHaptic('medium');
    try {
      const res = await fetch(`/api/albums/${albumId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Album deleted', 'info');
        if (activeAlbum?.id === albumId) setActiveAlbum(null);
        refreshData();
      }
    } catch {
      showToast('Failed to delete album', 'error');
    }
  };

  // Share Links
  const createShareLink = async (params: { fileId: string; expiresInDays?: number; allowDownload?: boolean; password?: string }): Promise<ShareLink | null> => {
    triggerHaptic('light');
    try {
      const res = await fetch('/api/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_id: params.fileId,
          expires_in_days: params.expiresInDays,
          allow_download: params.allowDownload,
          password: params.password,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        showToast('Share link created & copied', 'success');
        refreshData();
        return data.share;
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to create share link', 'error');
      }
    } catch {
      showToast('Network error creating share link', 'error');
    }
    return null;
  };

  const revokeShareLink = async (shareId: string) => {
    triggerHaptic('medium');
    try {
      const res = await fetch(`/api/shares/${shareId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Share link revoked', 'info');
        refreshData();
      }
    } catch {
      showToast('Failed to revoke link', 'error');
    }
  };

  // Multi-Selection
  const toggleSelectId = (id: string) => {
    triggerHaptic('light');
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const selectAll = () => {
    triggerHaptic('light');
    setSelectedIds(files.map((f) => f.id));
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setIsSelectMode(false);
  };

  // Upload Logic with SHA-256 Checksum Calculation & Duplicate Detection
  const calculateSha256 = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  const uploadFiles = async (fileList: FileList | File[], targetVault: boolean = false) => {
    const filesArray = Array.from(fileList);
    if (filesArray.length === 0) return;

    for (const file of filesArray) {
      const queueId = `${Date.now()}_${file.name}`;
      setUploadQueue((prev) => [
        ...prev,
        {
          id: queueId,
          name: file.name,
          size: file.size,
          progress: 10,
          status: 'uploading',
          speed: 'Verifying...',
          target_vault: targetVault,
        },
      ]);

      try {
        const hash = await calculateSha256(file);

        // Check duplicate
        const dupRes = await fetch('/api/files/check-duplicate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hash, filename: file.name }),
        });

        const dupData = await dupRes.json();
        if (dupData.exists) {
          setDuplicateConflict({
            file,
            hash,
            existingFile: dupData.file,
            targetVault,
          });
          setUploadQueue((prev) => prev.filter((q) => q.id !== queueId));
          return;
        }

        await doExecuteUpload(file, targetVault, queueId);
      } catch (err) {
        showToast(`Failed to upload ${file.name}`, 'error');
        setUploadQueue((prev) => prev.filter((q) => q.id !== queueId));
      }
    }
  };

  const captureVideoFrame = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith('video/')) return null;
    return new Promise((resolve) => {
      try {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;
        const url = URL.createObjectURL(file);
        video.src = url;

        video.onloadeddata = () => {
          video.currentTime = Math.min(1, video.duration ? video.duration / 3 : 0.5);
        };

        video.onseeked = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = Math.min(640, video.videoWidth || 640);
            canvas.height = Math.min(360, video.videoHeight || 360);
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
              URL.revokeObjectURL(url);
              resolve(dataUrl);
              return;
            }
          } catch {
            // ignore
          }
          URL.revokeObjectURL(url);
          resolve(null);
        };

        video.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(null);
        };

        setTimeout(() => {
          URL.revokeObjectURL(url);
          resolve(null);
        }, 2500);
      } catch {
        resolve(null);
      }
    });
  };

  const doExecuteUpload = async (file: File, targetVault: boolean, queueId: string, replaceId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('is_vault', String(targetVault));
    if (replaceId) formData.append('replace_existing_id', replaceId);

    // If uploading a video, extract a canvas thumbnail frame to send alongside the video
    if (file.type.startsWith('video/')) {
      try {
        const clientThumb = await captureVideoFrame(file);
        if (clientThumb) {
          formData.append('thumbnail_base64', clientThumb);
        }
      } catch {
        // fallback to server ffmpeg
      }
    }

    setUploadQueue((prev) =>
      prev.map((q) => (q.id === queueId ? { ...q, progress: 50, speed: '28.4 MB/s', status: 'uploading' } : q))
    );

    const res = await fetch('/api/files/upload', {
      method: 'POST',
      headers: targetVault && vaultToken ? { 'x-vault-token': vaultToken } : {},
      body: formData,
    });

    if (res.ok) {
      setUploadQueue((prev) =>
        prev.map((q) => (q.id === queueId ? { ...q, progress: 100, speed: 'Done', status: 'completed' } : q))
      );
      triggerHaptic('success');
      showToast(`${file.name} saved to Cloud`, 'success');
      setTimeout(() => {
        setUploadQueue((prev) => prev.filter((q) => q.id !== queueId));
      }, 2500);
      refreshData();
    } else {
      const err = await res.json();
      showToast(err.error || 'Upload error', 'error');
      setUploadQueue((prev) =>
        prev.map((q) => (q.id === queueId ? { ...q, status: 'failed', speed: 'Error' } : q))
      );
    }
  };

  const pauseUpload = (id: string) => {
    triggerHaptic('light');
    setUploadQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'paused', speed: 'Paused' } : item))
    );
  };

  const resumeUpload = (id: string) => {
    triggerHaptic('light');
    setUploadQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'uploading', speed: 'Resuming...' } : item))
    );
  };

  const cancelUpload = (id: string) => {
    triggerHaptic('medium');
    setUploadQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const resolveDuplicate = async (action: 'skip' | 'replace' | 'keep') => {
    if (!duplicateConflict) return;
    const { file, existingFile, targetVault } = duplicateConflict;
    setDuplicateConflict(null);

    if (action === 'skip') {
      showToast(`Skipped duplicate file: ${file.name}`, 'info');
      return;
    }

    const queueId = `${Date.now()}_${file.name}`;
    setUploadQueue((prev) => [
      ...prev,
      {
        id: queueId,
        name: file.name,
        size: file.size,
        progress: 30,
        status: 'uploading',
        speed: action === 'replace' ? 'Replacing...' : 'Copying...',
        target_vault: targetVault,
      },
    ]);

    let finalFile = file;
    if (action === 'keep') {
      const nameParts = file.name.split('.');
      const ext = nameParts.length > 1 ? nameParts.pop() : '';
      const base = nameParts.join('.');
      const newName = `${base} (Copy).${ext}`;
      finalFile = new File([file], newName, { type: file.type });
    }

    await doExecuteUpload(finalFile, targetVault, queueId, action === 'replace' ? existingFile.id : undefined);
  };

  // Hugging Face Cloud Storage
  const connectHuggingFace = async (repoId: string, token: string, isPrivate: boolean): Promise<boolean> => {
    try {
      const res = await fetch('/api/storage/huggingface/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_id: repoId, token, is_private: isPrivate }),
      });

      if (res.ok) {
        const data = await res.json();
        setHuggingFace(data.huggingface);
        showToast('Hugging Face Private Dataset Connected', 'success');
        triggerHaptic('success');
        refreshData();
        return true;
      } else {
        const err = await res.json();
        showToast(err.error || 'Connection failed', 'error');
        return false;
      }
    } catch {
      showToast('Network error connecting to Hugging Face', 'error');
      return false;
    }
  };

  const syncHuggingFace = async () => {
    triggerHaptic('light');
    showToast('Syncing with Hugging Face Dataset...', 'info');
    try {
      const res = await fetch('/api/storage/huggingface/sync', { method: 'POST' });
      if (res.ok) {
        showToast('Dataset Cloud Sync Completed', 'success');
        refreshData();
      }
    } catch {
      showToast('Sync failed', 'error');
    }
  };

  const disconnectHuggingFace = async () => {
    try {
      await fetch('/api/storage/huggingface/disconnect', { method: 'POST' });
      showToast('Disconnected from Hugging Face', 'info');
      refreshData();
    } catch {
      // silent
    }
  };

  const freeUpStorage = async () => {
    try {
      const res = await fetch('/api/backup/free-up', { method: 'POST' });
      const data = await res.json();
      showToast(data.message || 'Local copies freed', 'success');
      triggerHaptic('success');
      refreshData();
    } catch {
      showToast('Failed to free storage', 'error');
    }
  };

  return (
    <CloudContext.Provider
      value={{
        activeTab,
        setActiveTab,
        isNavbarVisible,
        setIsNavbarVisible,
        files,
        folders,
        albums,
        shares,
        trashItems,
        storage,
        huggingFace,
        isLoading,
        refreshData,
        searchQuery,
        setSearchQuery,
        activeFilter,
        setActiveFilter,
        sortOption,
        setSortOption,
        gridZoom,
        setGridZoom,
        isVaultUnlocked,
        vaultToken,
        vaultFiles,
        vaultFolders,
        isVaultModalOpen,
        setIsVaultModalOpen,
        unlockVault,
        lockVault,
        updateVaultConfig,
        activePhoto,
        universalViewerFile,
        setUniversalViewerFile,
        openViewer,
        closeViewer,
        nextPhoto,
        prevPhoto,
        toggleFavorite,
        trashFile,
        restoreTrash,
        emptyTrash,
        moveToVault,
        restoreFromVault,
        batchMoveToVault,
        batchDelete,
        updateFile,
        duplicateFile,
        revertFileToOriginal,
        isSelectMode,
        setIsSelectMode,
        selectedIds,
        toggleSelectId,
        selectAll,
        clearSelection,
        detailsFile,
        setDetailsFile,
        createAlbum,
        addToAlbum,
        deleteAlbum,
        activeAlbum,
        setActiveAlbum,
        shareTargetFile,
        setShareTargetFile,
        createShareLink,
        revokeShareLink,
        isUploadOpen,
        setIsUploadOpen,
        isUploadQueueOpen,
        setIsUploadQueueOpen,
        uploadQueue,
        uploadFiles,
        pauseUpload,
        resumeUpload,
        cancelUpload,
        duplicateConflict,
        resolveDuplicate,
        autoBackupConfig,
        updateAutoBackupConfig,
        isStorageManagerOpen,
        setIsStorageManagerOpen,
        isTrashOpen,
        setIsTrashOpen,
        isProfileOpen,
        setIsProfileOpen,
        isActionMenuOpen,
        setIsActionMenuOpen,
        connectHuggingFace,
        syncHuggingFace,
        disconnectHuggingFace,
        freeUpStorage,
        activeSpace,
        setActiveSpace,
        activeLibraryFolderId,
        setActiveLibraryFolderId,
        editingFile,
        setEditingFile,
        resetActiveTabToRoot,
        triggerHaptic,
        toasts,
        showToast,
        prefersReducedMotion,
      }}
    >
      {children}
    </CloudContext.Provider>
  );
};

export const useCloud = () => {
  const context = useContext(CloudContext);
  if (!context) throw new Error('useCloud must be used within CloudProvider');
  return context;
};
