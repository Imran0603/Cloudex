import React, { useState } from 'react';
import {
  FileText,
  Download,
  Share2,
  Printer,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Search,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { CloudFile } from '../../types/cloud';

interface DocumentViewerProps {
  file: CloudFile;
  onShare: () => void;
  onDownload: () => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  file,
  onShare,
  onDownload,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const totalPages = 4;
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const pagesContent = [
    {
      title: '1. Executive Summary & Zero-Knowledge Architecture',
      subtitle: 'Personal Cloud Cryptographic Security Model (v2.4)',
      body: `This specification outlines the technical parameters and cryptographic boundaries of the personal private storage enclave.

All user documents, biometric tokens, and dataset snapshots undergo AES-256-GCM symmetric envelope encryption. The key derivation function implements Argon2id with 64MB memory cost, ensuring immunity against offline dictionary analysis.

Key architectural tenants:
• Hardware Enclave isolation on host mobile and desktop units.
• Zero-knowledge dataset transport via TLS 1.3 with pinned SHA-256 certificates.
• Local-first indexing allowing instantaneous sub-millisecond retrieval.`,
    },
    {
      title: '2. High Availability Storage Subsystems & Hugging Face Sync',
      subtitle: 'Data Ingestion and Automated Parity Replication',
      body: `The secondary parity volume interfaces directly with private Hugging Face dataset repositories.

Replication cycle:
1. Client generates file fingerprint via chunked SHA-256 pipeline.
2. Differential tree comparison against upstream dataset commit hashes.
3. Automated compression via zstandard level 19 prior to packet broadcast.
4. Cryptographic signature confirmation stored in local ledger.

System resilience guarantees 99.999% file integrity across catastrophic hardware failures.`,
    },
    {
      title: '3. Private Vault Isolation & Biometric Handshake',
      subtitle: 'Hardware Enclave & Secure Element Protocols',
      body: `The Private Vault partition operates strictly outside normal filesystem browsing.

Access rules:
• Biometric verification requires hardware-attested Touch ID, Face ID, or WebAuthn credentials.
• Session tokens expire automatically after 180 seconds of background inactivity.
• Decrypted file streams are held exclusively in volatile RAM and overwritten with cryptographic random bytes upon session disposal.`,
    },
    {
      title: '4. Appendix & Certification Sign-Off',
      subtitle: 'Compliance and Cryptographic Audit Verification',
      body: `Certified by Internal Security Architecture Review.
Audit Timestamp: 2026-10-02T10:00:00Z
Target Platform: iOS / macOS / Modern Web Standards
Hash Verification: 8753a444f9b287f4a517a41ec5caa570d7e48dff2f026a5e917579983ed34182

End of Specification Document.`,
    },
  ];

  const activePage = pagesContent[currentPage - 1];

  return (
    <div className="flex flex-col h-full bg-[#0F0F12] rounded-2xl overflow-hidden border border-white/10 select-none">
      {/* Top Controls Toolbar */}
      <div className="h-12 px-4 bg-black/40 border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
        {/* Page navigation */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-white font-medium px-1 tabular-nums">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setZoomLevel((z) => Math.max(70, z - 15))}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-[#A1A1A1] font-mono tabular-nums w-12 text-center">
            {zoomLevel}%
          </span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(160, z + 15))}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => window.print()}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-[#D0D0D0] hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            title="Print Document"
          >
            <Printer className="w-4 h-4" />
          </button>
          <button
            onClick={onDownload}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-[#D0D0D0] hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            title="Download Document"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={onShare}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-[#D0D0D0] hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            title="Share Document"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Document Render Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex items-center justify-center bg-[#151518]">
        <div
          style={{
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'top center',
            transition: 'transform 0.2s ease',
          }}
          className="w-full max-w-2xl bg-white text-neutral-900 rounded-xl shadow-2xl p-8 sm:p-12 space-y-6 min-h-[560px] relative select-text"
        >
          {/* Document Header Watermark & Brand */}
          <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                Personal Cloud Secure Document
              </span>
            </div>
            <span className="text-[11px] font-mono text-neutral-400">
              DOC-ID: {file.id.toUpperCase()}
            </span>
          </div>

          {/* Page Content */}
          <div className="space-y-4">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 leading-snug">
              {activePage.title}
            </h1>
            <p className="text-sm font-semibold text-blue-600">
              {activePage.subtitle}
            </p>
            <div className="text-sm text-neutral-700 leading-relaxed whitespace-pre-line font-serif pt-2 border-t border-neutral-100">
              {activePage.body}
            </div>
          </div>

          {/* Document Footer */}
          <div className="pt-8 border-t border-neutral-200 flex items-center justify-between text-xs text-neutral-400">
            <span>Confidential & Cryptographically Verified</span>
            <span>Page {currentPage} of {totalPages}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
