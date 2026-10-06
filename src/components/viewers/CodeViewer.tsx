import React, { useState } from 'react';
import {
  Code,
  Copy,
  Check,
  Search,
  WrapText,
  Download,
  Share2,
  FileCode,
  BookOpen,
} from 'lucide-react';
import { CloudFile } from '../../types/cloud';
import { getSampleCodeContent } from '../../utils/filePreviewData';

interface CodeViewerProps {
  file: CloudFile;
  onShare: () => void;
  onDownload: () => void;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  file,
  onShare,
  onDownload,
}) => {
  const codeData = getSampleCodeContent(file);
  const [copied, setCopied] = useState<boolean>(false);
  const [wordWrap, setWordWrap] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [fontSize, setFontSize] = useState<number>(13);
  const [isMarkdownPreview, setIsMarkdownPreview] = useState<boolean>(
    file.extension.toLowerCase() === 'md'
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(codeData.rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredLines = codeData.lines;

  return (
    <div className="flex flex-col h-full bg-[#0F0F12] rounded-2xl overflow-hidden border border-white/10 select-none">
      {/* Top Toolbar */}
      <div className="h-12 px-4 bg-black/40 border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold text-white uppercase tracking-wider">
            {codeData.language}
          </span>
          <span className="text-xs text-[#8E8E93] tabular-nums">
            ({codeData.lines.length} lines)
          </span>
        </div>

        {/* View mode toggle for Markdown */}
        {file.extension.toLowerCase() === 'md' && (
          <div className="flex items-center bg-white/10 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setIsMarkdownPreview(false)}
              className={`px-2 py-1 rounded-md transition-colors ${
                !isMarkdownPreview ? 'bg-white text-black font-semibold' : 'text-[#A1A1A1]'
              }`}
            >
              Raw
            </button>
            <button
              onClick={() => setIsMarkdownPreview(true)}
              className={`px-2 py-1 rounded-md transition-colors ${
                isMarkdownPreview ? 'bg-white text-black font-semibold' : 'text-[#A1A1A1]'
              }`}
            >
              Preview
            </button>
          </div>
        )}

        {/* Action icons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setWordWrap(!wordWrap)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
              wordWrap ? 'bg-blue-600/30 text-blue-400' : 'bg-white/10 text-[#D0D0D0]'
            }`}
            title="Toggle Word Wrap"
          >
            <WrapText className="w-4 h-4" />
          </button>

          <button
            onClick={handleCopy}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-[#D0D0D0] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Copy All Text"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            onClick={onDownload}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-[#D0D0D0] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Download Source"
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

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-4 bg-[#0A0A0C]">
        {isMarkdownPreview && file.extension.toLowerCase() === 'md' ? (
          <div className="max-w-2xl mx-auto p-6 bg-white/[0.03] rounded-2xl border border-white/5 space-y-4 text-neutral-200 select-text font-sans">
            <h1 className="text-2xl font-bold text-white border-b border-white/10 pb-2">
              {file.filename.replace(/\.[^/.]+$/, '')}
            </h1>
            <p className="text-sm text-neutral-300 leading-relaxed">
              This document contains the encrypted architecture guidelines and operational procedures for high-availability synchronization.
            </p>
            <h3 className="text-base font-semibold text-blue-400 pt-2">Key Features</h3>
            <ul className="list-disc list-inside text-sm space-y-1 text-neutral-300">
              <li><strong className="text-white">Zero-knowledge vault storage</strong> with local biometric verification.</li>
              <li><strong className="text-white">Hardware-accelerated rendering</strong> using 120Hz spring physics and GPU compositing.</li>
              <li><strong className="text-white">Bi-directional Hugging Face dataset synchronization</strong> with end-to-end checksum verification.</li>
            </ul>
            <blockquote className="p-3 bg-blue-500/10 border-l-4 border-blue-500 text-xs text-blue-200 rounded-r-lg">
              Note: All sensitive keys remain isolated within the local secure enclave.
            </blockquote>
          </div>
        ) : (
          <pre
            style={{ fontSize: `${fontSize}px` }}
            className={`font-mono leading-relaxed select-text ${
              wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
            }`}
          >
            {filteredLines.map((line, idx) => (
              <div key={idx} className="flex hover:bg-white/[0.04] transition-colors rounded px-1">
                <span className="w-10 select-none text-right pr-4 text-neutral-600 font-mono text-xs tabular-nums shrink-0">
                  {idx + 1}
                </span>
                <span className="text-neutral-300 font-mono flex-1">
                  {/* Basic syntax coloring highlights */}
                  {line.startsWith('import ') || line.startsWith('export ') || line.startsWith('def ') ? (
                    <span className="text-purple-400">{line}</span>
                  ) : line.includes('class ') || line.includes('function ') ? (
                    <span className="text-blue-400">{line}</span>
                  ) : line.trim().startsWith('//') || line.trim().startsWith('#') ? (
                    <span className="text-neutral-500 italic">{line}</span>
                  ) : line.includes(':') && codeData.language === 'json' ? (
                    <span>
                      <span className="text-blue-300">{line.split(':')[0]}:</span>
                      <span className="text-emerald-300">{line.split(':').slice(1).join(':')}</span>
                    </span>
                  ) : (
                    line
                  )}
                </span>
              </div>
            ))}
          </pre>
        )}
      </div>
    </div>
  );
};
