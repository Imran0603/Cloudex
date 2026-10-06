import React, { useState } from 'react';
import {
  Table,
  Search,
  Download,
  Share2,
  Filter,
  ArrowUpDown,
} from 'lucide-react';
import { CloudFile } from '../../types/cloud';
import { getSampleSpreadsheetContent } from '../../utils/filePreviewData';

interface SpreadsheetViewerProps {
  file: CloudFile;
  onShare: () => void;
  onDownload: () => void;
}

export const SpreadsheetViewer: React.FC<SpreadsheetViewerProps> = ({
  file,
  onShare,
  onDownload,
}) => {
  const data = getSampleSpreadsheetContent(file);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const filteredRows = data.rows.filter((row) =>
    row.some((cell) => cell.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full bg-[#0F0F12] rounded-2xl overflow-hidden border border-white/10 select-none">
      {/* Top Toolbar */}
      <div className="h-12 px-4 bg-black/40 border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <Table className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-white uppercase tracking-wider">
            Spreadsheet
          </span>
          <span className="text-xs text-[#8E8E93] tabular-nums">
            ({filteredRows.length} rows)
          </span>
        </div>

        {/* Search inside table */}
        <div className="flex-1 max-w-xs relative">
          <Search className="w-3.5 h-3.5 text-[#8E8E93] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cells..."
            className="w-full pl-8 pr-3 py-1 rounded-lg bg-white/10 border border-white/10 text-xs text-white placeholder-[#8E8E93] focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onDownload}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-[#D0D0D0] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Download CSV"
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

      {/* Table Container */}
      <div className="flex-1 overflow-auto bg-[#0A0A0C] p-4">
        <div className="border border-white/10 rounded-xl overflow-hidden shadow-2xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-900 border-b border-white/10 text-white font-semibold uppercase tracking-wider">
                {data.headers.map((h, i) => (
                  <th
                    key={i}
                    onClick={() => {
                      if (sortCol === i) setSortAsc(!sortAsc);
                      else {
                        setSortCol(i);
                        setSortAsc(true);
                      }
                    }}
                    className="p-3 border-r border-white/10 last:border-r-0 hover:bg-white/5 cursor-pointer whitespace-nowrap"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span>{h}</span>
                      <ArrowUpDown className="w-3 h-3 text-[#8E8E93]" />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredRows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className="hover:bg-white/[0.04] transition-colors odd:bg-transparent even:bg-white/[0.02]"
                >
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className="p-3 border-r border-white/5 last:border-r-0 text-neutral-300 whitespace-nowrap font-mono select-text"
                    >
                      {cell.startsWith('$') ? (
                        <span className="text-emerald-400 font-semibold">{cell}</span>
                      ) : cell === 'Paid' || cell === 'Verified' || cell === 'Delivered' ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
                          {cell}
                        </span>
                      ) : (
                        cell
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
