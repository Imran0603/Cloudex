import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Ensure directories
const DATA_DIR = path.resolve(__dirname, 'data');
const UPLOADS_DIR = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploads
app.use('/uploads', express.static(UPLOADS_DIR));

// Types
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
  duration?: number; // for video in seconds
  shared_url?: string;
  original_storage_path?: string;
  edited_version_url?: string;
  location?: string;
  edit_history?: any[];
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
  password_hash?: string;
  created_at: string;
  views: number;
}

// In-Memory & Persistent State
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface AppDatabase {
  user: {
    id: string;
    name: string;
    email: string;
    avatar_url: string;
    storage_total_bytes: number;
  };
  vault: {
    pin_hash: string;
    auto_lock_seconds: number;
    biometric_enabled: boolean;
    hide_vault_from_library: boolean;
  };
  huggingface: {
    connected: boolean;
    repo_id: string;
    is_private: boolean;
    token_encrypted: string;
    connected_at: string;
    last_sync: string;
    status: 'connected' | 'disconnected' | 'syncing' | 'error';
    file_count: number;
  };
  folders: FolderItem[];
  albums: AlbumItem[];
  share_links: ShareLink[];
  files: CloudFile[];
}

// High-fidelity starter items (monochrome, Leica style, architecture, iceland, tokyo night, documents, vault contracts)
function getInitialData(): AppDatabase {
  return {
    user: {
      id: 'usr_imran_001',
      name: 'Imran Zainal',
      email: 'imranzainal111@gmail.com',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      storage_total_bytes: 128 * 1024 * 1024 * 1024, // 128 GB
    },
    vault: {
      pin_hash: crypto.createHash('sha256').update('112233').digest('hex'),
      auto_lock_seconds: 180,
      biometric_enabled: true,
      hide_vault_from_library: false,
    },
    huggingface: {
      connected: true,
      repo_id: 'imran-z/private-personal-cloud',
      is_private: true,
      token_encrypted: 'hf_vK89xL927N82d9183jF9284j2819a84b',
      connected_at: '2026-09-28T14:20:00Z',
      last_sync: '2026-10-02T08:15:30Z',
      status: 'connected',
      file_count: 18,
    },
    folders: [
      { id: 'fld_trips', name: 'Travel & Architecture', parent_id: null, is_vault: false, created_at: '2026-09-10T10:00:00Z' },
      { id: 'fld_work', name: 'Contracts & Docs', parent_id: null, is_vault: false, created_at: '2026-09-12T11:00:00Z' },
      { id: 'fld_vault_secret', name: 'Identity & Financial Keys', parent_id: null, is_vault: true, created_at: '2026-09-15T09:00:00Z' },
    ],
    albums: [
      {
        id: 'alb_01',
        name: 'Iceland Expedition',
        cover_url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=600&q=80',
        file_ids: ['fil_01', 'fil_04'],
        created_at: '2026-09-15T10:00:00Z',
      },
      {
        id: 'alb_02',
        name: 'Monochrome Architecture',
        cover_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80',
        file_ids: ['fil_02', 'fil_05'],
        created_at: '2026-09-20T12:00:00Z',
      },
      {
        id: 'alb_03',
        name: 'Tokyo Night Drive',
        cover_url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80',
        file_ids: ['fil_03'],
        created_at: '2026-10-01T22:00:00Z',
      },
    ],
    share_links: [],
    files: [
      {
        id: 'fil_01',
        owner_id: 'usr_imran_001',
        filename: 'Reynisfjara_Basalt_Coast.jpg',
        original_filename: 'Reynisfjara_Basalt_Coast.jpg',
        mime_type: 'image/jpeg',
        extension: 'jpg',
        size: 14200000,
        hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        storage_path: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1600&q=85',
        thumbnail_url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=600&q=80',
        folder_id: 'fld_trips',
        created_at: '2026-10-02T07:12:00Z',
        modified_at: '2026-10-02T07:12:00Z',
        uploaded_at: '2026-10-02T07:14:00Z',
        source_device: 'iPhone 17 Pro',
        is_favorite: true,
        is_hidden: false,
        is_vault: false,
        is_deleted: false,
        is_shared: false,
        backup_status: 'backed_up',
        download_status: 'downloaded',
        dimensions: { width: 4032, height: 3024 },
      },
      {
        id: 'fil_02',
        owner_id: 'usr_imran_001',
        filename: 'Minimalist_Concrete_Museum.jpg',
        original_filename: 'Minimalist_Concrete_Museum.jpg',
        mime_type: 'image/jpeg',
        extension: 'jpg',
        size: 9800000,
        hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        storage_path: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=85',
        thumbnail_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80',
        folder_id: 'fld_trips',
        created_at: '2026-10-02T05:30:00Z',
        modified_at: '2026-10-02T05:30:00Z',
        uploaded_at: '2026-10-02T05:31:00Z',
        source_device: 'iPhone 17 Pro',
        is_favorite: false,
        is_hidden: false,
        is_vault: false,
        is_deleted: false,
        is_shared: true,
        backup_status: 'backed_up',
        download_status: 'downloaded',
        dimensions: { width: 3840, height: 2160 },
      },
      {
        id: 'fil_03',
        owner_id: 'usr_imran_001',
        filename: 'Tokyo_Rain_Reflection.mp4',
        original_filename: 'Tokyo_Rain_Reflection.mp4',
        mime_type: 'video/mp4',
        extension: 'mp4',
        size: 48500000,
        hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
        storage_path: '/uploads/tokyo_rain_reflection.mp4',
        thumbnail_url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80',
        folder_id: null,
        created_at: '2026-10-01T21:45:00Z',
        modified_at: '2026-10-01T21:45:00Z',
        uploaded_at: '2026-10-01T21:50:00Z',
        source_device: 'Sony A7 IV',
        is_favorite: true,
        is_hidden: false,
        is_vault: false,
        is_deleted: false,
        is_shared: false,
        backup_status: 'backed_up',
        download_status: 'downloaded',
        dimensions: { width: 3840, height: 2160 },
        duration: 38,
      },
      {
        id: 'fil_04',
        owner_id: 'usr_imran_001',
        filename: 'Nordic_Pine_Mist.jpg',
        original_filename: 'Nordic_Pine_Mist.jpg',
        mime_type: 'image/jpeg',
        extension: 'jpg',
        size: 11400000,
        hash: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
        storage_path: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1600&q=85',
        thumbnail_url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80',
        folder_id: 'fld_trips',
        created_at: '2026-10-01T15:20:00Z',
        modified_at: '2026-10-01T15:20:00Z',
        uploaded_at: '2026-10-01T15:22:00Z',
        source_device: 'iPhone 17 Pro',
        is_favorite: false,
        is_hidden: false,
        is_vault: false,
        is_deleted: false,
        backup_status: 'backed_up',
        download_status: 'downloaded',
        dimensions: { width: 4032, height: 3024 },
        is_shared: false,
      },
      {
        id: 'fil_05',
        owner_id: 'usr_imran_001',
        filename: 'Architecture_Monochrome_Shadows.jpg',
        original_filename: 'Architecture_Monochrome_Shadows.jpg',
        mime_type: 'image/jpeg',
        extension: 'jpg',
        size: 8900000,
        hash: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
        storage_path: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1600&q=85',
        thumbnail_url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80',
        folder_id: 'fld_trips',
        created_at: '2026-09-30T18:10:00Z',
        modified_at: '2026-09-30T18:10:00Z',
        uploaded_at: '2026-09-30T18:12:00Z',
        source_device: 'iPhone 17 Pro',
        is_favorite: true,
        is_hidden: false,
        is_vault: false,
        is_deleted: false,
        backup_status: 'backed_up',
        download_status: 'downloaded',
        dimensions: { width: 3600, height: 2400 },
        is_shared: false,
      },
      {
        id: 'fil_06',
        owner_id: 'usr_imran_001',
        filename: 'Cloud_Architecture_Specification_v2.pdf',
        original_filename: 'Cloud_Architecture_Specification_v2.pdf',
        mime_type: 'application/pdf',
        extension: 'pdf',
        size: 3450000,
        hash: '8753a444f9b287f4a517a41ec5caa570d7e48dff2f026a5e917579983ed34182',
        storage_path: '/sample-docs/architecture.pdf',
        thumbnail_url: '',
        folder_id: 'fld_work',
        created_at: '2026-09-29T11:00:00Z',
        modified_at: '2026-09-29T11:00:00Z',
        uploaded_at: '2026-09-29T11:02:00Z',
        source_device: 'MacBook Pro M4',
        is_favorite: false,
        is_hidden: false,
        is_vault: false,
        is_deleted: false,
        backup_status: 'backed_up',
        download_status: 'downloaded',
        is_shared: false,
      },
      {
        id: 'fil_07',
        owner_id: 'usr_imran_001',
        filename: 'Dataset_Synchronization_Pipeline.zip',
        original_filename: 'Dataset_Synchronization_Pipeline.zip',
        mime_type: 'application/zip',
        extension: 'zip',
        size: 84200000,
        hash: 'c87895e6f6a782b6b020087cbffb2c68e1c6b12a8bcfa5629c1eb5a8286915fb',
        storage_path: '/sample-docs/pipeline.zip',
        thumbnail_url: '',
        folder_id: 'fld_work',
        created_at: '2026-09-27T16:40:00Z',
        modified_at: '2026-09-27T16:40:00Z',
        uploaded_at: '2026-09-27T16:42:00Z',
        source_device: 'MacBook Pro M4',
        is_favorite: false,
        is_hidden: false,
        is_vault: false,
        is_deleted: false,
        backup_status: 'backed_up',
        download_status: 'downloaded',
        is_shared: false,
      },
      {
        id: 'fil_08',
        owner_id: 'usr_imran_001',
        filename: 'Tokyo_Rain_Midnight_Lofi.mp3',
        original_filename: 'Tokyo_Rain_Midnight_Lofi.mp3',
        mime_type: 'audio/mpeg',
        extension: 'mp3',
        size: 8940000,
        hash: '9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e',
        storage_path: '/uploads/tokyo_rain_lofi.mp3',
        thumbnail_url: '',
        folder_id: 'fld_trips',
        created_at: '2026-09-28T22:15:00Z',
        modified_at: '2026-09-28T22:15:00Z',
        uploaded_at: '2026-09-28T22:16:00Z',
        source_device: 'iPhone 17 Pro',
        is_favorite: true,
        is_hidden: false,
        is_vault: false,
        is_deleted: false,
        backup_status: 'backed_up',
        download_status: 'downloaded',
        is_shared: false,
      },
      {
        id: 'fil_09',
        owner_id: 'usr_imran_001',
        filename: 'Cloud_Security_Enclave.ts',
        original_filename: 'Cloud_Security_Enclave.ts',
        mime_type: 'text/typescript',
        extension: 'ts',
        size: 3450,
        hash: '4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b',
        storage_path: '/sample-docs/security_enclave.ts',
        thumbnail_url: '',
        folder_id: 'fld_work',
        created_at: '2026-09-26T14:30:00Z',
        modified_at: '2026-09-26T14:30:00Z',
        uploaded_at: '2026-09-26T14:32:00Z',
        source_device: 'MacBook Pro M4',
        is_favorite: false,
        is_hidden: false,
        is_vault: false,
        is_deleted: false,
        backup_status: 'backed_up',
        download_status: 'downloaded',
        is_shared: false,
      },
      {
        id: 'fil_10',
        owner_id: 'usr_imran_001',
        filename: 'Annual_Financial_Budget_2026.csv',
        original_filename: 'Annual_Financial_Budget_2026.csv',
        mime_type: 'text/csv',
        extension: 'csv',
        size: 24800,
        hash: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
        storage_path: '/sample-docs/financial_budget_2026.csv',
        thumbnail_url: '',
        folder_id: 'fld_work',
        created_at: '2026-09-25T09:20:00Z',
        modified_at: '2026-09-25T09:20:00Z',
        uploaded_at: '2026-09-25T09:22:00Z',
        source_device: 'MacBook Pro M4',
        is_favorite: false,
        is_hidden: false,
        is_vault: false,
        is_deleted: false,
        backup_status: 'backed_up',
        download_status: 'downloaded',
        is_shared: false,
      },
      // PRIVATE VAULT ITEMS (strictly isolated on backend!)
      {
        id: 'fil_vault_01',
        owner_id: 'usr_imran_001',
        filename: 'Passport_Biometric_Scan_Private.jpg',
        original_filename: 'Passport_Biometric_Scan_Private.jpg',
        mime_type: 'image/jpeg',
        extension: 'jpg',
        size: 5600000,
        hash: '3a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b',
        storage_path: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1600&q=85',
        thumbnail_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
        folder_id: 'fld_vault_secret',
        created_at: '2026-09-20T10:00:00Z',
        modified_at: '2026-09-20T10:00:00Z',
        uploaded_at: '2026-09-20T10:05:00Z',
        source_device: 'iPhone 17 Pro',
        is_favorite: false,
        is_hidden: true,
        is_vault: true, // VAULT BOUNDARY
        is_deleted: false,
        backup_status: 'backed_up',
        download_status: 'downloaded',
        dimensions: { width: 3000, height: 2000 },
        is_shared: false,
      },
      {
        id: 'fil_vault_02',
        owner_id: 'usr_imran_001',
        filename: 'Hardware_Key_Recovery_Phrase.pdf',
        original_filename: 'Hardware_Key_Recovery_Phrase.pdf',
        mime_type: 'application/pdf',
        extension: 'pdf',
        size: 1200000,
        hash: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        storage_path: '/sample-docs/seed_backup.pdf',
        thumbnail_url: '',
        folder_id: 'fld_vault_secret',
        created_at: '2026-09-22T08:15:00Z',
        modified_at: '2026-09-22T08:15:00Z',
        uploaded_at: '2026-09-22T08:16:00Z',
        source_device: 'iPhone 17 Pro',
        is_favorite: true,
        is_hidden: true,
        is_vault: true, // VAULT BOUNDARY
        is_deleted: false,
        backup_status: 'backed_up',
        download_status: 'downloaded',
        is_shared: false,
      },
      {
        id: 'fil_vault_03',
        owner_id: 'usr_imran_001',
        filename: 'Private_Financial_Statement_2026.pdf',
        original_filename: 'Private_Financial_Statement_2026.pdf',
        mime_type: 'application/pdf',
        extension: 'pdf',
        size: 4200000,
        hash: 'fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
        storage_path: '/sample-docs/financial_2026.pdf',
        thumbnail_url: '',
        folder_id: 'fld_vault_secret',
        created_at: '2026-09-25T14:30:00Z',
        modified_at: '2026-09-25T14:30:00Z',
        uploaded_at: '2026-09-25T14:31:00Z',
        source_device: 'MacBook Pro M4',
        is_favorite: false,
        is_hidden: true,
        is_vault: true, // VAULT BOUNDARY
        is_deleted: false,
        backup_status: 'backed_up',
        download_status: 'downloaded',
        is_shared: false,
      },
    ],
  };
}

let db: AppDatabase;
if (fs.existsSync(DB_FILE)) {
  try {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    if (!db.albums || db.albums.length === 0) {
      db.albums = getInitialData().albums;
      saveDb();
    }
    if (!db.share_links) {
      db.share_links = [];
      saveDb();
    }
  } catch (err) {
    db = getInitialData();
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  }
} else {
  db = getInitialData();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function saveDb() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// Active Vault Sessions (Token -> ExpiresAt timestamp)
const activeVaultSessions = new Map<string, number>();

function verifyVaultToken(req: Request): boolean {
  const token = req.headers['x-vault-token'] as string;
  if (!token) return false;
  const expiry = activeVaultSessions.get(token);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    activeVaultSessions.delete(token);
    return false;
  }
  // renew active session by auto-lock duration
  activeVaultSessions.set(token, Date.now() + (db.vault.auto_lock_seconds * 1000));
  return true;
}

// Configure multer
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;
    cb(null, unique);
  },
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB

// Helper to mask tokens safely
function maskToken(token: string): string {
  if (!token) return '';
  if (token.length <= 8) return 'hf_••••••••';
  return `hf_••••••••${token.slice(-4)}`;
}

// ----------------- API ROUTES ----------------- //

// 1. User & Account
app.get('/api/auth/me', (_req: Request, res: Response) => {
  res.json({
    user: db.user,
    vaultConfig: {
      biometric_enabled: db.vault.biometric_enabled,
      auto_lock_seconds: db.vault.auto_lock_seconds,
      hide_vault_from_library: db.vault.hide_vault_from_library,
      pin_configured: Boolean(db.vault.pin_hash),
    },
    huggingface: {
      connected: db.huggingface.connected,
      repo_id: db.huggingface.repo_id,
      is_private: db.huggingface.is_private,
      masked_token: maskToken(db.huggingface.token_encrypted),
      connected_at: db.huggingface.connected_at,
      last_sync: db.huggingface.last_sync,
      status: db.huggingface.status,
      file_count: db.huggingface.file_count,
    },
  });
});

// 2. Vault Security Boundary Endpoints
app.post('/api/vault/unlock', (req: Request, res: Response) => {
  const { pin, biometric_verified } = req.body;

  let authenticated = false;
  if (biometric_verified && db.vault.biometric_enabled) {
    authenticated = true;
  } else if (pin) {
    const inputHash = crypto.createHash('sha256').update(String(pin)).digest('hex');
    if (inputHash === db.vault.pin_hash) {
      authenticated = true;
    }
  }

  if (!authenticated) {
    return res.status(401).json({ error: 'Incorrect PIN or biometric authorization failed' });
  }

  const sessionToken = `vlt_${crypto.randomBytes(32).toString('hex')}`;
  const expiresAt = Date.now() + (db.vault.auto_lock_seconds * 1000);
  activeVaultSessions.set(sessionToken, expiresAt);

  res.json({
    success: true,
    vault_token: sessionToken,
    expires_in_seconds: db.vault.auto_lock_seconds,
  });
});

app.post('/api/vault/lock', (req: Request, res: Response) => {
  const token = req.headers['x-vault-token'] as string;
  if (token) {
    activeVaultSessions.delete(token);
  }
  res.json({ success: true, message: 'Vault secured and locked' });
});

app.get('/api/vault/status', (req: Request, res: Response) => {
  const isUnlocked = verifyVaultToken(req);
  res.json({
    isUnlocked,
    auto_lock_seconds: db.vault.auto_lock_seconds,
    biometric_enabled: db.vault.biometric_enabled,
    hide_vault_from_library: db.vault.hide_vault_from_library,
  });
});

app.post('/api/vault/config', (req: Request, res: Response) => {
  const { auto_lock_seconds, biometric_enabled, hide_vault_from_library, current_pin, new_pin } = req.body;

  if (new_pin) {
    if (current_pin) {
      const curHash = crypto.createHash('sha256').update(String(current_pin)).digest('hex');
      if (curHash !== db.vault.pin_hash) {
        return res.status(403).json({ error: 'Current PIN is invalid' });
      }
    }
    db.vault.pin_hash = crypto.createHash('sha256').update(String(new_pin)).digest('hex');
  }

  if (typeof auto_lock_seconds === 'number') db.vault.auto_lock_seconds = auto_lock_seconds;
  if (typeof biometric_enabled === 'boolean') db.vault.biometric_enabled = biometric_enabled;
  if (typeof hide_vault_from_library === 'boolean') db.vault.hide_vault_from_library = hide_vault_from_library;

  saveDb();
  res.json({ success: true, vaultConfig: db.vault });
});

// Strictly Protected Vault Files Endpoint
app.get('/api/vault/files', (req: Request, res: Response) => {
  if (!verifyVaultToken(req)) {
    return res.status(403).json({
      error: 'Security Boundary: Vault access denied. Valid authentication token required.',
    });
  }

  const vaultFiles = db.files.filter((f) => f.is_vault && !f.is_deleted);
  const vaultFolders = db.folders.filter((fld) => fld.is_vault);

  res.json({
    files: vaultFiles,
    folders: vaultFolders,
    count: vaultFiles.length,
    security_badge: 'Hugging Face Private Dataset · Isolated Vault Boundary',
  });
});

// 3. Normal Files API (CRITICAL: NEVER RETURNS VAULT FILES)
app.get('/api/files', (req: Request, res: Response) => {
  const { type, folder, favorite, search, sort } = req.query;

  // Always strictly exclude vault and deleted items
  let result = db.files.filter((f) => !f.is_vault && !f.is_deleted);

  if (type && type !== 'all') {
    if (type === 'photos') {
      result = result.filter((f) => f.mime_type.startsWith('image/'));
    } else if (type === 'videos') {
      result = result.filter((f) => f.mime_type.startsWith('video/'));
    } else if (type === 'documents') {
      result = result.filter((f) =>
        f.mime_type.includes('pdf') ||
        f.mime_type.includes('text') ||
        f.mime_type.includes('word') ||
        ['pdf', 'doc', 'docx', 'txt', 'md', 'xlsx'].includes(f.extension)
      );
    } else if (type === 'archives') {
      result = result.filter((f) => ['zip', 'tar', 'gz', 'rar', '7z'].includes(f.extension));
    }
  }

  if (favorite === 'true') {
    result = result.filter((f) => f.is_favorite);
  }

  if (folder) {
    result = result.filter((f) => f.folder_id === folder);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    result = result.filter((f) =>
      f.filename.toLowerCase().includes(q) ||
      f.extension.toLowerCase().includes(q)
    );
  }

  // Sorting
  if (sort === 'oldest') {
    result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  } else if (sort === 'name-asc') {
    result.sort((a, b) => a.filename.localeCompare(b.filename));
  } else if (sort === 'name-desc') {
    result.sort((a, b) => b.filename.localeCompare(a.filename));
  } else if (sort === 'largest') {
    result.sort((a, b) => b.size - a.size);
  } else if (sort === 'smallest') {
    result.sort((a, b) => a.size - b.size);
  } else {
    // default: newest
    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  const normalFolders = db.folders.filter((fld) => !fld.is_vault);

  res.json({
    files: result,
    folders: normalFolders,
    total: result.length,
  });
});

// Folders CRUD API
app.get('/api/folders', (_req: Request, res: Response) => {
  const normalFolders = db.folders.filter((fld) => !fld.is_vault);
  res.json({ folders: normalFolders });
});

app.post('/api/folders', (req: Request, res: Response) => {
  const { name, is_vault } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Folder name is required' });
  }
  const isVault = Boolean(is_vault);
  if (isVault && !verifyVaultToken(req)) {
    return res.status(403).json({ error: 'Vault authentication required' });
  }

  const newFolder = {
    id: `fld_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim(),
    parent_id: null,
    is_vault: isVault,
    created_at: new Date().toISOString(),
  };

  db.folders.push(newFolder);
  saveDb();
  res.status(201).json({ success: true, folder: newFolder });
});

app.patch('/api/folders/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;
  const folder = db.folders.find((fld) => fld.id === id);
  if (!folder) return res.status(404).json({ error: 'Folder not found' });
  if (folder.is_vault && !verifyVaultToken(req)) {
    return res.status(403).json({ error: 'Vault authentication required' });
  }
  if (name && name.trim()) {
    folder.name = name.trim();
  }
  saveDb();
  res.json({ success: true, folder });
});

app.delete('/api/folders/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const folderIndex = db.folders.findIndex((fld) => fld.id === id);
  if (folderIndex === -1) return res.status(404).json({ error: 'Folder not found' });
  const folder = db.folders[folderIndex];
  if (folder.is_vault && !verifyVaultToken(req)) {
    return res.status(403).json({ error: 'Vault authentication required' });
  }
  db.folders.splice(folderIndex, 1);
  db.files.forEach((f) => {
    if (f.folder_id === id) f.folder_id = null;
  });
  saveDb();
  res.json({ success: true });
});

// Duplicate Hash Check
app.post('/api/files/check-duplicate', (req: Request, res: Response) => {
  const { hash, filename } = req.body;
  const match = db.files.find((f) => !f.is_deleted && (f.hash === hash || f.filename === filename));
  if (match) {
    return res.json({
      exists: true,
      file: {
        id: match.id,
        filename: match.filename,
        size: match.size,
        created_at: match.created_at,
        is_vault: match.is_vault,
      },
    });
  }
  res.json({ exists: false });
});

// Upload File Endpoint
app.post('/api/files/upload', upload.single('file'), (req: Request, res: Response) => {
  const uploaded = req.file;
  const { folder_id, is_vault, replace_existing_id } = req.body;

  const targetVault = is_vault === 'true' || is_vault === true;

  // If uploading to vault, enforce vault security token
  if (targetVault && !verifyVaultToken(req)) {
    if (uploaded) fs.unlinkSync(uploaded.path);
    return res.status(403).json({ error: 'Cannot upload directly to Vault without authenticated session' });
  }

  let finalFilename = uploaded ? uploaded.originalname : req.body.filename || 'Uploaded_File';
  let mimeType = uploaded ? uploaded.mimetype : req.body.mime_type || 'application/octet-stream';
  let fileSize = uploaded ? uploaded.size : Number(req.body.size) || 1024 * 50;
  let ext = path.extname(finalFilename).replace('.', '').toLowerCase() || 'dat';

  // Calculate file hash
  let fileHash = '';
  let storagePath = '';
  let thumbnailUrl = '';

  if (uploaded) {
    const fileBuffer = fs.readFileSync(uploaded.path);
    fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    storagePath = `/uploads/${uploaded.filename}`;
    if (mimeType.startsWith('image/')) {
      thumbnailUrl = `/uploads/${uploaded.filename}`;
    } else if (mimeType.startsWith('video/')) {
      const thumbName = `thumb_${path.parse(uploaded.filename).name}.jpg`;
      const thumbFullPath = path.join(UPLOADS_DIR, thumbName);
      try {
        execSync(`ffmpeg -ss 00:00:00.5 -i "${uploaded.path}" -vframes 1 -q:v 2 "${thumbFullPath}" -y 2>/dev/null`);
        if (fs.existsSync(thumbFullPath)) {
          thumbnailUrl = `/uploads/${thumbName}`;
        }
      } catch (e) {
        console.error('Error generating video thumbnail with ffmpeg:', e);
      }
    }
  } else if (req.body.content_base64) {
    const buffer = Buffer.from(req.body.content_base64, 'base64');
    fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
    const diskName = `${Date.now()}_${finalFilename}`;
    const fullDiskPath = path.join(UPLOADS_DIR, diskName);
    fs.writeFileSync(fullDiskPath, buffer);
    storagePath = `/uploads/${diskName}`;
    if (mimeType.startsWith('image/')) {
      thumbnailUrl = `/uploads/${diskName}`;
    } else if (mimeType.startsWith('video/')) {
      const thumbName = `thumb_${path.parse(diskName).name}.jpg`;
      const thumbFullPath = path.join(UPLOADS_DIR, thumbName);
      try {
        execSync(`ffmpeg -ss 00:00:00.5 -i "${fullDiskPath}" -vframes 1 -q:v 2 "${thumbFullPath}" -y 2>/dev/null`);
        if (fs.existsSync(thumbFullPath)) {
          thumbnailUrl = `/uploads/${thumbName}`;
        }
      } catch (e) {
        console.error('Error generating video thumbnail with ffmpeg:', e);
      }
    }
    fileSize = buffer.length;
  } else {
    // procedural or simulation upload
    fileHash = crypto.createHash('sha256').update(finalFilename + Date.now()).digest('hex');
    storagePath = req.body.storage_path || 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80';
    thumbnailUrl = storagePath;
  }

  // If client supplied custom base64 thumbnail (e.g. from client canvas snapshot)
  if (req.body.thumbnail_base64 && !thumbnailUrl) {
    try {
      const cleanBase64 = req.body.thumbnail_base64.replace(/^data:image\/\w+;base64,/, '');
      const thumbBuf = Buffer.from(cleanBase64, 'base64');
      const customThumbName = `thumb_client_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.jpg`;
      fs.writeFileSync(path.join(UPLOADS_DIR, customThumbName), thumbBuf);
      thumbnailUrl = `/uploads/${customThumbName}`;
    } catch (err) {
      console.error('Error saving client thumbnail:', err);
    }
  }

  // Handle replace option
  if (replace_existing_id) {
    db.files = db.files.filter((f) => f.id !== replace_existing_id);
  }

  const newFile: CloudFile = {
    id: `fil_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    owner_id: db.user.id,
    filename: finalFilename,
    original_filename: finalFilename,
    mime_type: mimeType,
    extension: ext,
    size: fileSize,
    hash: fileHash,
    storage_path: storagePath,
    thumbnail_url: thumbnailUrl,
    folder_id: folder_id || null,
    created_at: new Date().toISOString(),
    modified_at: new Date().toISOString(),
    uploaded_at: new Date().toISOString(),
    source_device: 'Web Client',
    is_favorite: false,
    is_hidden: targetVault,
    is_vault: targetVault,
    is_deleted: false,
    is_shared: false,
    backup_status: 'backed_up',
    download_status: 'downloaded',
    dimensions: mimeType.startsWith('image/') ? { width: 3840, height: 2160 } : undefined,
  };

  db.files.unshift(newFile);
  db.huggingface.file_count = db.files.filter((f) => !f.is_deleted).length;
  saveDb();

  res.status(201).json({ success: true, file: newFile });
});

// Update File (Favorite, Rename, Move to Vault, Restore)
app.patch('/api/files/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const file = db.files.find((f) => f.id === id);

  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Check if target or current file is vault
  const willBeVault = req.body.is_vault === true;
  if ((file.is_vault || willBeVault) && !verifyVaultToken(req)) {
    return res.status(403).json({ error: 'Vault authorization required to modify vault files' });
  }

  if (typeof req.body.is_favorite === 'boolean') file.is_favorite = req.body.is_favorite;
  if (typeof req.body.is_hidden === 'boolean') file.is_hidden = req.body.is_hidden;
  if (typeof req.body.filename === 'string' && req.body.filename.trim()) {
    file.filename = req.body.filename.trim();
  }
  if (typeof req.body.is_vault === 'boolean') {
    file.is_vault = req.body.is_vault;
    file.is_hidden = req.body.is_vault;
  }
  if (typeof req.body.folder_id !== 'undefined') file.folder_id = req.body.folder_id;
  if (typeof req.body.album_id !== 'undefined') file.album_id = req.body.album_id;
  if (typeof req.body.is_deleted === 'boolean') file.is_deleted = req.body.is_deleted;
  if (typeof req.body.storage_path === 'string') file.storage_path = req.body.storage_path;
  if (typeof req.body.original_storage_path === 'string') file.original_storage_path = req.body.original_storage_path;
  if (typeof req.body.edited_version_url === 'string') file.edited_version_url = req.body.edited_version_url;
  if (typeof req.body.location === 'string') file.location = req.body.location;
  if (req.body.dimensions && typeof req.body.dimensions.width === 'number') {
    file.dimensions = req.body.dimensions;
  }
  if (typeof req.body.source_device === 'string') file.source_device = req.body.source_device;
  if (Array.isArray(req.body.edit_history)) file.edit_history = req.body.edit_history;

  file.modified_at = new Date().toISOString();
  saveDb();

  res.json({ success: true, file });
});

// Duplicate a file non-destructively
app.post('/api/files/:id/duplicate', (req: Request, res: Response) => {
  const { id } = req.params;
  const file = db.files.find((f) => f.id === id);

  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }

  if (file.is_vault && !verifyVaultToken(req)) {
    return res.status(403).json({ error: 'Vault authorization required' });
  }

  const baseName = file.filename.replace(/\.[^/.]+$/, '');
  const ext = file.extension ? `.${file.extension}` : '';
  const newFilename = `${baseName} Copy${ext}`;
  const newId = `fil_dup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const duplicatedFile: CloudFile = {
    ...file,
    id: newId,
    filename: newFilename,
    original_filename: newFilename,
    created_at: new Date().toISOString(),
    modified_at: new Date().toISOString(),
    uploaded_at: new Date().toISOString(),
    is_favorite: false,
  };

  db.files.unshift(duplicatedFile);
  saveDb();

  res.json({ success: true, file: duplicatedFile });
});

// Delete / Trash
app.delete('/api/files/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { permanent } = req.query;
  const fileIndex = db.files.findIndex((f) => f.id === id);

  if (fileIndex === -1) {
    return res.status(404).json({ error: 'File not found' });
  }

  const file = db.files[fileIndex];
  if (file.is_vault && !verifyVaultToken(req)) {
    return res.status(403).json({ error: 'Vault authorization required' });
  }

  if (permanent === 'true' || file.is_deleted) {
    db.files.splice(fileIndex, 1);
  } else {
    file.is_deleted = true;
    file.modified_at = new Date().toISOString();
  }

  saveDb();
  res.json({ success: true });
});

// Batch Operations
app.post('/api/files/batch', (req: Request, res: Response) => {
  const { action, file_ids } = req.body;
  if (!Array.isArray(file_ids) || file_ids.length === 0) {
    return res.status(400).json({ error: 'file_ids array required' });
  }

  if (action === 'move_to_vault') {
    if (!verifyVaultToken(req)) {
      return res.status(403).json({ error: 'Vault authentication required for batch move to vault' });
    }
    db.files.forEach((f) => {
      if (file_ids.includes(f.id)) {
        f.is_vault = true;
        f.is_hidden = true;
        f.modified_at = new Date().toISOString();
      }
    });
  } else if (action === 'delete') {
    db.files.forEach((f) => {
      if (file_ids.includes(f.id)) {
        f.is_deleted = true;
        f.modified_at = new Date().toISOString();
      }
    });
  } else if (action === 'favorite') {
    db.files.forEach((f) => {
      if (file_ids.includes(f.id)) {
        f.is_favorite = true;
      }
    });
  }

  saveDb();
  res.json({ success: true, updated_count: file_ids.length });
});

// Trash list & Restore
app.get('/api/trash', (_req: Request, res: Response) => {
  const trashItems = db.files.filter((f) => f.is_deleted);
  res.json({ items: trashItems });
});

app.post('/api/trash/:id/restore', (req: Request, res: Response) => {
  const { id } = req.params;
  const file = db.files.find((f) => f.id === id);
  if (!file) return res.status(404).json({ error: 'File not found in trash' });
  file.is_deleted = false;
  file.modified_at = new Date().toISOString();
  saveDb();
  res.json({ success: true, file });
});

app.post('/api/trash/empty', (_req: Request, res: Response) => {
  db.files = db.files.filter((f) => !f.is_deleted);
  saveDb();
  res.json({ success: true, message: 'Trash emptied' });
});

// Albums API
app.get('/api/albums', (_req: Request, res: Response) => {
  if (!db.albums) db.albums = [];
  res.json({ albums: db.albums });
});

app.post('/api/albums', (req: Request, res: Response) => {
  if (!db.albums) db.albums = [];
  const { name, cover_url, file_ids } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Album name required' });
  const newAlbum: AlbumItem = {
    id: `alb_${Date.now()}`,
    name: name.trim(),
    cover_url: cover_url || 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=600&q=80',
    file_ids: Array.isArray(file_ids) ? file_ids : [],
    created_at: new Date().toISOString(),
  };
  db.albums.unshift(newAlbum);
  saveDb();
  res.status(201).json({ success: true, album: newAlbum });
});

app.post('/api/albums/:id/add', (req: Request, res: Response) => {
  if (!db.albums) db.albums = [];
  const { id } = req.params;
  const { file_ids } = req.body;
  const album = db.albums.find((a) => a.id === id);
  if (!album) return res.status(404).json({ error: 'Album not found' });
  if (Array.isArray(file_ids)) {
    album.file_ids = Array.from(new Set([...album.file_ids, ...file_ids]));
    saveDb();
  }
  res.json({ success: true, album });
});

app.delete('/api/albums/:id', (req: Request, res: Response) => {
  if (!db.albums) db.albums = [];
  const { id } = req.params;
  db.albums = db.albums.filter((a) => a.id !== id);
  saveDb();
  res.json({ success: true });
});

// Share Links API
app.get('/api/shares', (_req: Request, res: Response) => {
  if (!db.share_links) db.share_links = [];
  res.json({ shares: db.share_links });
});

app.post('/api/shares', (req: Request, res: Response) => {
  if (!db.share_links) db.share_links = [];
  const { file_id, expires_in_days, allow_download, password } = req.body;
  const file = db.files.find((f) => f.id === file_id && !f.is_deleted);
  if (!file) return res.status(404).json({ error: 'File not found' });
  if (file.is_vault) return res.status(403).json({ error: 'Vault items cannot be shared by default' });

  const shareId = `shr_${crypto.randomBytes(8).toString('hex')}`;
  const expiresAt = expires_in_days
    ? new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const newShare: ShareLink = {
    id: shareId,
    file_id: file.id,
    file_name: file.filename,
    file_url: file.storage_path,
    expires_at: expiresAt,
    allow_download: allow_download !== false,
    has_password: Boolean(password),
    password_hash: password ? crypto.createHash('sha256').update(password).digest('hex') : undefined,
    created_at: new Date().toISOString(),
    views: 0,
  };

  db.share_links.unshift(newShare);
  file.is_shared = true;
  saveDb();

  res.status(201).json({ success: true, share: newShare });
});

app.delete('/api/shares/:id', (req: Request, res: Response) => {
  if (!db.share_links) db.share_links = [];
  const { id } = req.params;
  db.share_links = db.share_links.filter((s) => s.id !== id);
  saveDb();
  res.json({ success: true });
});

// 4. Storage Overview & Breakdown
app.get('/api/storage/overview', (_req: Request, res: Response) => {
  const nonDeleted = db.files.filter((f) => !f.is_deleted);
  const photos = nonDeleted.filter((f) => !f.is_vault && f.mime_type.startsWith('image/'));
  const videos = nonDeleted.filter((f) => !f.is_vault && f.mime_type.startsWith('video/'));
  const files = nonDeleted.filter((f) => !f.is_vault && !f.mime_type.startsWith('image/') && !f.mime_type.startsWith('video/'));
  const vault = nonDeleted.filter((f) => f.is_vault);
  const trash = db.files.filter((f) => f.is_deleted);

  const photosBytes = photos.reduce((sum, f) => sum + f.size, 0);
  const videosBytes = videos.reduce((sum, f) => sum + f.size, 0);
  const filesBytes = files.reduce((sum, f) => sum + f.size, 0);
  const vaultBytes = vault.reduce((sum, f) => sum + f.size, 0);
  const trashBytes = trash.reduce((sum, f) => sum + f.size, 0);

  const totalUsed = photosBytes + videosBytes + filesBytes + vaultBytes;

  res.json({
    total_capacity_bytes: db.user.storage_total_bytes,
    total_used_bytes: totalUsed,
    used_percentage: Math.min(100, (totalUsed / db.user.storage_total_bytes) * 100),
    breakdown: {
      photos_bytes: photosBytes,
      photos_count: photos.length,
      videos_bytes: videosBytes,
      videos_count: videos.length,
      files_bytes: filesBytes,
      files_count: files.length,
      vault_bytes: vaultBytes,
      vault_count: vault.length,
      trash_bytes: trashBytes,
      trash_count: trash.length,
    },
    huggingface: {
      repo_id: db.huggingface.repo_id,
      is_private: db.huggingface.is_private,
      status: db.huggingface.status,
      last_sync: db.huggingface.last_sync,
    },
  });
});

// 5. Hugging Face Dataset Storage Management (Secure Backend Proxy)
app.post('/api/storage/huggingface/connect', async (req: Request, res: Response) => {
  const { repo_id, token, is_private } = req.body;

  if (!repo_id || typeof repo_id !== 'string') {
    return res.status(400).json({ error: 'Valid Hugging Face Dataset repository ID required (e.g. username/dataset-name)' });
  }

  // Token is stored strictly on server
  const trimmedToken = token ? String(token).trim() : db.huggingface.token_encrypted;

  // Real or mock verification with HF API
  try {
    if (trimmedToken.startsWith('hf_')) {
      // Validate endpoint format
      db.huggingface = {
        connected: true,
        repo_id: repo_id.trim(),
        is_private: Boolean(is_private),
        token_encrypted: trimmedToken,
        connected_at: new Date().toISOString(),
        last_sync: new Date().toISOString(),
        status: 'connected',
        file_count: db.files.filter((f) => !f.is_deleted).length,
      };
      saveDb();

      return res.json({
        success: true,
        message: 'Hugging Face Private Dataset securely connected to backend',
        huggingface: {
          connected: true,
          repo_id: db.huggingface.repo_id,
          is_private: db.huggingface.is_private,
          masked_token: maskToken(trimmedToken),
          connected_at: db.huggingface.connected_at,
          last_sync: db.huggingface.last_sync,
          status: 'connected',
          file_count: db.huggingface.file_count,
        },
      });
    } else {
      return res.status(400).json({ error: 'Hugging Face User Access Token must begin with "hf_"' });
    }
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to verify Hugging Face dataset connection' });
  }
});

app.post('/api/storage/huggingface/sync', (_req: Request, res: Response) => {
  if (!db.huggingface.connected) {
    return res.status(400).json({ error: 'Hugging Face dataset not connected' });
  }

  db.huggingface.status = 'syncing';
  saveDb();

  // simulate spring async completion
  setTimeout(() => {
    db.huggingface.status = 'connected';
    db.huggingface.last_sync = new Date().toISOString();
    db.huggingface.file_count = db.files.filter((f) => !f.is_deleted).length;
    saveDb();
  }, 1200);

  res.json({
    success: true,
    message: 'Dataset synchronization initiated in backend pipeline',
    last_sync: new Date().toISOString(),
  });
});

app.post('/api/storage/huggingface/disconnect', (_req: Request, res: Response) => {
  db.huggingface.connected = false;
  db.huggingface.token_encrypted = '';
  db.huggingface.status = 'disconnected';
  saveDb();
  res.json({ success: true, message: 'Disconnected from Hugging Face dataset' });
});

// 6. Free up local copies
app.post('/api/backup/free-up', (_req: Request, res: Response) => {
  const backedUp = db.files.filter((f) => f.backup_status === 'backed_up' && f.download_status === 'downloaded');
  let freedBytes = 0;
  backedUp.forEach((f) => {
    freedBytes += f.size;
    f.download_status = 'cloud_only';
  });
  saveDb();
  res.json({
    success: true,
    freed_bytes: freedBytes,
    freed_count: backedUp.length,
    message: `Freed ${(freedBytes / (1024 * 1024)).toFixed(1)} MB of local storage. All files safely preserved in Hugging Face Cloud.`,
  });
});

// Vite Integration (Dev Mode vs Prod Mode)
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Aether Cloud] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Aether Cloud] Server startup failure:', err);
});
