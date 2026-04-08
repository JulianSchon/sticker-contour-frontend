import { useState, useCallback } from 'react';
import type { PlannedFile, PackedCopy, ExportCopy } from '../../types/printPlanning.ts';
import { packItems } from '../../lib/packer.ts';
import { exportPrintLayout } from '../../lib/api.ts';
import { FileSetupPanel } from './FileSetupPanel.tsx';
import { LayoutCanvas } from './LayoutCanvas.tsx';

const PAGE_SIZES = {
  a4: { label: 'A4', widthMm: 210, heightMm: 297 },
  a5: { label: 'A5', widthMm: 148, heightMm: 210 },
} as const;

type PageSizeKey = keyof typeof PAGE_SIZES;

export function WordpressPrintPlanningTab() {
  const [pageSize, setPageSize] = useState<PageSizeKey>('a4');
  const [files, setFiles] = useState<PlannedFile[]>([]);
  const [copies, setCopies] = useState<PackedCopy[]>([]);
  const [totalLengthMm, setTotalLengthMm] = useState(0);
  const [utilizationPct, setUtilizationPct] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);

  const page = PAGE_SIZES[pageSize];

  const runAutoLayout = useCallback(() => {
    if (files.length === 0) return;
    const result = packItems(files, page.widthMm, page.heightMm);
    setCopies(result.copies);
    setTotalLengthMm(result.totalLengthMm);
    setUtilizationPct(result.utilizationPct);
  }, [files, page]);

  async function handleExport() {
    if (copies.length === 0 || files.length === 0) return;
    setIsExporting(true);
    setExportError(null);
    setExportSuccess(false);
    try {
      const exportCopies: ExportCopy[] = copies.map(c => ({
        fileIndex: files.findIndex(f => f.id === c.fileId),
        x: c.x,
        y: c.y,
        widthMm: c.w,
        heightMm: c.h,
        rotated: c.rotated,
      }));
      await exportPrintLayout(
        files.map(f => f.file),
        { foilWidthMm: page.widthMm, totalLengthMm: page.heightMm, copies: exportCopies, regmarkType: 'none' },
        `print-${pageSize.toUpperCase()}.pdf`
      );
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  }

  const canLayout = files.length > 0;
  const canExport = copies.length > 0;
  const utilColor = utilizationPct >= 75 ? 'text-green-400' : utilizationPct >= 50 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="flex h-[calc(100vh-160px)] gap-0 rounded-xl overflow-hidden border border-white/10">

      {/* ── Sidebar ── */}
      <div className="w-72 flex-shrink-0 flex flex-col bg-nim-darker border-r border-white/10">

        <div className="px-5 py-4 border-b border-white/10">
          <p className="text-xs font-bold tracking-widest uppercase text-nim-yellow">Setup</p>
          <p className="text-xs text-white/30 mt-0.5">Page size · files · quantities</p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

          {/* Page size selector */}
          <div>
            <p className="nim-label mb-3">Page Size</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(PAGE_SIZES) as [PageSizeKey, typeof PAGE_SIZES[PageSizeKey]][]).map(([key, ps]) => (
                <button
                  key={key}
                  onClick={() => { setPageSize(key); setCopies([]); setTotalLengthMm(0); }}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all ${
                    pageSize === key
                      ? 'border-nim-yellow bg-nim-yellow/10 text-nim-yellow'
                      : 'border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'
                  }`}
                >
                  {/* Paper icon */}
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="4" y="2" width="16" height="20" rx="2" />
                    <line x1="8" y1="8" x2="16" y2="8" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                    <line x1="8" y1="16" x2="13" y2="16" />
                  </svg>
                  <span className="text-xs font-bold uppercase tracking-wider">{ps.label}</span>
                  <span className="text-xs opacity-60 font-normal">{ps.widthMm}×{ps.heightMm} mm</span>
                </button>
              ))}
            </div>
          </div>

          <FileSetupPanel
            foilWidthMm={page.widthMm}
            onFoilWidthChange={() => { /* fixed */ }}
            files={files}
            onFilesChange={setFiles}
            hideWidth
          />
        </div>

        {/* Stats */}
        {copies.length > 0 && (
          <div className="border-t border-white/10 px-5 py-4 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-base font-bold text-white">{copies.length}</p>
              <p className="text-xs text-white/30 leading-tight">copies</p>
            </div>
            <div className="border-x border-white/10">
              <p className="text-base font-bold text-white">{pageSize.toUpperCase()}</p>
              <p className="text-xs text-white/30 leading-tight">size</p>
            </div>
            <div>
              <p className={`text-base font-bold ${utilColor}`}>{utilizationPct}%</p>
              <p className="text-xs text-white/30 leading-tight">used</p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="border-t border-white/10 px-5 py-4 space-y-2">
          <button
            onClick={runAutoLayout}
            disabled={!canLayout}
            className="nim-btn-yellow w-full"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
            Auto-Layout
          </button>

          <button
            onClick={handleExport}
            disabled={!canExport || isExporting}
            className={`nim-btn-white w-full ${exportSuccess ? '!bg-green-500 !text-white' : ''}`}
          >
            {isExporting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Exporting…
              </>
            ) : exportSuccess ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Downloaded!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export PDF
              </>
            )}
          </button>

          {exportError && (
            <p className="text-xs text-red-400 bg-red-950/50 border border-red-800 rounded-lg px-3 py-2">
              {exportError}
            </p>
          )}
        </div>
      </div>

      {/* ── Canvas ── */}
      <div className="flex-1 min-w-0 flex flex-col bg-nim-black">
        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
          <p className="text-xs font-bold tracking-widest uppercase text-nim-yellow">Layout Preview</p>
          {copies.length === 0 && (
            <span className="text-xs text-white/30">Add files and click Auto-Layout to get started</span>
          )}
        </div>
        <div className="flex-1 min-h-0 p-3">
          <LayoutCanvas
            foilWidthMm={page.widthMm}
            totalLengthMm={totalLengthMm}
            copies={copies}
            files={files}
            regmarkType="none"
            onCopiesChange={setCopies}
            pageLengthMm={page.heightMm}
          />
        </div>
      </div>
    </div>
  );
}
