// Helper utility for generating rich interactive previews for all file types
import { CloudFile } from '../types/cloud';

export interface CodePreviewData {
  language: string;
  lines: string[];
  rawText: string;
}

export interface SpreadsheetPreviewData {
  headers: string[];
  rows: string[][];
  totalRows: number;
}

export interface ArchivePreviewItem {
  name: string;
  size: number;
  type: 'folder' | 'file';
  extension: string;
  modified: string;
}

export function getSampleCodeContent(file: CloudFile): CodePreviewData {
  const ext = file.extension.toLowerCase();
  
  if (ext === 'json') {
    const raw = JSON.stringify(
      {
        project: 'Private Personal Cloud & Vault',
        version: '2.4.0',
        author: 'Imran Zainal',
        security: {
          encryption: 'AES-256-GCM',
          zeroKnowledge: true,
          biometricAuth: true,
          argon2Iterations: 16,
        },
        storage: {
          localQuotaBytes: 137438953472,
          huggingFaceSync: {
            enabled: true,
            repo: 'imran-z/private-personal-cloud',
            autoSyncIntervalSec: 300,
          },
        },
        systemStatus: 'healthy',
        lastAudit: '2026-10-02T14:32:00Z',
      },
      null,
      2
    );
    return {
      language: 'json',
      lines: raw.split('\n'),
      rawText: raw,
    };
  }

  if (ext === 'md') {
    const raw = `# ${file.filename.replace(/\.[^/.]+$/, '')}

## Overview
This document contains the encrypted architecture guidelines and operational procedures for high-availability synchronization.

### Key Features
- **Zero-knowledge vault storage** with local biometric verification.
- **Hardware-accelerated rendering** using 120Hz spring physics and GPU compositing.
- **Bi-directional Hugging Face dataset synchronization** with end-to-end checksum verification.

### System Requirements
| Component | Minimum | Recommended |
|---|---|---|
| Memory | 4 GB | 16 GB Unified |
| Storage | 128 GB NVMe | 1 TB APFS |
| Network | 50 Mbps | 1 Gbps Fiber |

> *Note: All sensitive keys remain isolated within the local secure enclave.*
`;
    return {
      language: 'markdown',
      lines: raw.split('\n'),
      rawText: raw,
    };
  }

  if (['js', 'ts', 'jsx', 'tsx'].includes(ext)) {
    const raw = `import { CloudProvider } from '@apple/cloud-core';
import { SecurityEnclave } from './security';

export class CloudVaultManager {
  private readonly enclave = new SecurityEnclave();

  async authenticateUser(pin: string, biometricToken: string): Promise<boolean> {
    console.log('[Vault] Verifying cryptographic biometric handshake...');
    const isValid = await this.enclave.verifySignature(pin, biometricToken);
    if (!isValid) {
      throw new Error('Biometric validation rejected by local enclave');
    }
    return true;
  }

  async syncRemoteDataset(repoId: string): Promise<{ syncedBytes: number }> {
    return { syncedBytes: 104857600 };
  }
}`;
    return {
      language: ext === 'ts' || ext === 'tsx' ? 'typescript' : 'javascript',
      lines: raw.split('\n'),
      rawText: raw,
    };
  }

  if (ext === 'py') {
    const raw = `import os
import hashlib
from typing import Dict, List

def compute_sha256(file_path: str) -> str:
    """Compute cryptographic hash of dataset asset."""
    hasher = hashlib.sha256()
    with open(file_path, 'rb') as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()

if __name__ == "__main__":
    print("Initiating cloud storage validation routine...")
    print("All checksums verified.")`;
    return {
      language: 'python',
      lines: raw.split('\n'),
      rawText: raw,
    };
  }

  // Default plaintext
  const raw = `File: ${file.filename}
Created: ${file.created_at}
Size: ${(file.size / 1024).toFixed(1)} KB
MIME Type: ${file.mime_type}
Checksum: ${file.hash || '8753a444f9b287f4a517a41ec5caa570d7e48dff2f026a5e917579983ed34182'}

[LOG ENTRY - 2026-10-02 08:15:30]
Secure personal cloud node initialized.
Storage volume mounted at /data/vault.
Zero-knowledge isolation verified.
Ready for universal file reading and manipulation.`;
  return {
    language: 'plaintext',
    lines: raw.split('\n'),
    rawText: raw,
  };
}

export function getSampleSpreadsheetContent(file: CloudFile): SpreadsheetPreviewData {
  return {
    headers: ['Item ID', 'Description', 'Category', 'Quarter', 'Amount (USD)', 'Status'],
    rows: [
      ['EXP-001', 'Cloud Infrastructure & High Availability NVMe', 'Infrastructure', 'Q1 2026', '$4,850.00', 'Paid'],
      ['EXP-002', 'Optical Fiber Bandwidth (10 Gbps Uplink)', 'Network', 'Q1 2026', '$1,200.00', 'Paid'],
      ['EXP-003', 'Hardware Security Modules & YubiKey Keys', 'Security', 'Q2 2026', '$840.00', 'Verified'],
      ['EXP-004', 'Automated Hugging Face Dataset Backup Node', 'Backup', 'Q2 2026', '$2,150.00', 'Active'],
      ['EXP-005', 'Leica M11 & Sony A7R V Asset Processing', 'Media Assets', 'Q3 2026', '$9,400.00', 'Allocated'],
      ['EXP-006', 'High-Res Display Calibrator Pro', 'Hardware', 'Q3 2026', '$320.00', 'Delivered'],
      ['EXP-007', 'Encrypted Cold Storage Tape Vaults', 'Cold Storage', 'Q4 2026', '$3,600.00', 'Planned'],
      ['EXP-008', 'Biometric Enclave Firmware Licensure', 'Security', 'Q4 2026', '$1,750.00', 'Pending'],
    ],
    totalRows: 8,
  };
}

export function getSampleArchiveContent(file: CloudFile): ArchivePreviewItem[] {
  return [
    { name: 'src/main.ts', size: 14200, type: 'file', extension: 'ts', modified: '2026-09-28' },
    { name: 'src/config/enclave.json', size: 3400, type: 'file', extension: 'json', modified: '2026-09-28' },
    { name: 'assets/high_res_render.png', size: 4890000, type: 'file', extension: 'png', modified: '2026-09-25' },
    { name: 'docs/architecture_spec.pdf', size: 2840000, type: 'file', extension: 'pdf', modified: '2026-09-20' },
    { name: 'data/records_2026.csv', size: 182000, type: 'file', extension: 'csv', modified: '2026-09-26' },
    { name: 'scripts/backup_sync.sh', size: 2150, type: 'file', extension: 'sh', modified: '2026-09-27' },
    { name: 'README.md', size: 4500, type: 'file', extension: 'md', modified: '2026-09-29' },
  ];
}
