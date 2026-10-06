import React, { useState } from 'react';
import {
  FileArchive,
  Download,
  Share2,
  Folder,
  FileCode,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  Package,
} from 'lucide-react';
import { CloudFile } from '../../types/cloud';
import { getSampleArchiveContent } from '../../utils/filePreviewData';

interface ArchiveViewerProps {
  file: CloudFile;
  onShare: () => void;
  onDownload: () => void;
}

export const ArchiveViewer: React.FC<ArchiveViewerProps> = ({
  file,
  onShare,
  onDownload,
}) => {
  const items = getSampleArchiveContent(file);
  const [extracted, setExtracted] = useState<boolean>(false);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const totalUnpackedSize = items.reduce((acc, curr) => acc + curr.size, 0);

  return (
    <div className="flex flex-col h-full bg-[#0F0F12] rounded-2xl overflow-hidden border border-white/10 select-none">
      {/* Top Header */}
      <div className="h-12 px-4 bg-black/40 border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <FileArchive className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold text-white uppercase tracking-wider">
            Archive Explorer
          </span>
          <span className="text-xs text-[#8E8E93] tabular-nums">
            ({items.length} items · {formatBytes(totalUnpackedSize)})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setExtracted(true)}
            disabled={extracted}
            className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-emerald-600 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {extracted ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Extracted</span>
              </>
            ) : (
              <>
                <Package className="w-3.5 h-3.5" />
                <span>Extract All</span>
              </>
            )}
          </button>

          <button
            onClick={onDownload}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-[#D0D0D0] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Download Archive"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={onShare}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-[#D0D0D0] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Share"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Archive Items List */}
      <div className="flex-1 overflow-auto bg-[#0A0A0C] p-4">
        <div className="rounded-xl border border-white/10 overflow-hidden divide-y divide-white/5 bg-neutral-900/50">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="p-3 flex items-center justify-between hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                  {item.extension === 'pdf' ? (
                    <FileText className="w-4 h-4 text-red-400" />
                  ) : item.extension === 'png' ? (
                    <ImageIcon className="w-4 h-4 text-purple-400" />
                  ) : (
                    <FileCode className="w-4 h-4 text-blue-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white truncate font-mono">
                    {item.name}
                  </p>
                  <p className="text-[11px] text-[#8E8E93] tabular-nums">
                    Modified: {item.modified}
                  </p>
                </div>
              </div>

              <span className="text-xs font-mono text-neutral-400 tabular-nums">
                {formatBytes(item.size)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
