export interface CloudFile {
  id: string;
  owner_id: string;
  filename: string;
  original_filename: string;
  mime_type: string;
  extension: string;
  size: number;
  hash: string;
  storage_path: string;
  thumbnail_url?: string;
  folder_id?: string | null;
  album_id?: string | null;
  created_at: string;
  modified_at: string;
  uploaded_at: string;
  source_device: string;
  is_favorite: boolean;
  is_hidden: boolean;
  is_vault: boolean;
  is_deleted: boolean;
  is_shared: boolean;
  backup_status: 'backed_up' | 'backing_up' | 'paused' | 'failed' | 'local_only';
  download_status: 'downloaded' | 'cloud_only';
  dimensions?: { width: number; height: number };
  duration?: number;
  shared_url?: string;
  original_storage_path?: string;
  edited_version_url?: string;
  location?: string;
  edit_history?: any[];
  metadata?: Record<string, any>;
}

export interface FolderItem {
  id: string;
  name: string;
  parent_id: string | null;
  is_vault: boolean;
  created_at: string;
  item_count?: number;
}

export interface AlbumItem {
  id: string;
  name: string;
  cover_url?: string;
  file_ids: string[];
  created_at: string;
}

export interface ShareLink {
  id: string;
  file_id: string;
  file_name: string;
  file_url: string;
  expires_at: string | null;
  allow_download: boolean;
  has_password: boolean;
  created_at: string;
  views: number;
}

export interface AutoBackupConfig {
  enabled: boolean;
  wifi_only: boolean;
  charging_only: boolean;
  quality: 'original' | 'optimized';
  selected_albums: string[];
}

export interface UploadQueueItem {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: 'uploading' | 'paused' | 'waiting' | 'retry' | 'completed' | 'failed';
  speed: string;
  target_vault: boolean;
}

export interface StorageOverview {
  total_capacity_bytes: number;
  total_used_bytes: number;
  used_percentage: number;
  breakdown: {
    photos_bytes: number;
    photos_count: number;
    videos_bytes: number;
    videos_count: number;
    files_bytes: number;
    files_count: number;
    vault_bytes: number;
    vault_count: number;
    trash_bytes: number;
    trash_count: number;
  };
  huggingface: {
    repo_id: string;
    is_private: boolean;
    status: 'connected' | 'disconnected' | 'syncing' | 'error';
    last_sync: string;
  };
}

export interface HuggingFaceStatus {
  connected: boolean;
  repo_id: string;
  is_private: boolean;
  masked_token: string;
  connected_at: string;
  last_sync: string;
  status: 'connected' | 'disconnected' | 'syncing' | 'error';
  file_count: number;
}

export interface VaultConfig {
  biometric_enabled: boolean;
  auto_lock_seconds: number;
  hide_vault_from_library: boolean;
  pin_configured: boolean;
}

export type TabType = 'home' | 'gallery' | 'library';
export type FilterType = 'all' | 'photos' | 'videos' | 'favorites';
export type SortOption = 'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'largest' | 'smallest';
export type GridZoomLevel = 2 | 3 | 4 | 5;
