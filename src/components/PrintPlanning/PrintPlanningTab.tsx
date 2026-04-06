import { useState, useCallback } from 'react';
import type { PlannedFile, PackedCopy, ExportCopy } from '../../types/printPlanning.ts';
import { packItems } from '../../lib/packer.ts';
import { exportPrintLayout } from '../../lib/api.ts';
import { FileSetupPanel } from './FileSetupPanel.tsx';
import { LayoutCanvas } from './LayoutCanvas.tsx';

export function PrintPlanningTab() {
  const [foilWidthMm, setFoilWidthMm] = useState(320);
  const [files, setFiles] = useState<PlannedFile[]>([]);
  const [copies, setCopies] = useState<PackedCopy[]>([]);
  const [totalLengthMm, setTotalLengthMm] = useState(0);
  const [utilizationPct, setUtilizationPct] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);

  const runAutoLayout = useCallback(() => {
    if (files.length === 0) return;
    const result = packItems(files, foilWidthMm);
    setCopies(result.copies);
    setTotalLengthMm(result.totalLengthMm);
    setUtilizationPct(result.utilizationPct);
  }, [files, foilWidthMm]);

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
        { foilWidthMm, totalLengthMm, copies: exportCopies }
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

  // Utilization color
  const utilColor = utilizationPct >= 75 ? 'text-green-600' : utilizationPct >= 50 ? 'text-amber-600' : 'text-red-500';

  return (
    <div className="flex h-[calc(100vh-120px)] gap-0 rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-white">

      {/* ── Left sidebar ────────────────────────────────────────────────── */}
      <div className="w-72 flex-shrink-0 flex flex-col bg-gray-50 border-r border-gray-200">

        {/* Sidebar header */}
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-sm font-bold text-gray-800">Setup</h2>
          <p className="text-xs text-gray-400 mt-0.5">Configure foil and files</p>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <FileSetupPanel
            foilWidthMm={foilWidthMm}
            onFoilWidthChange={setFoilWidthMm}
            files={files}
            onFilesChange={setFiles}
          />
        </div>

        {/* ── Stats bar ── */}
        {copies.length > 0 && (
          <div className="px-5 py-4 border-t border-gray-200 grid grid-cols-3 gap-2">
            <div className="text-center">
              <p className="text-base font-bold text-gray-800">{copies.length}</p>
              <p className="text-xs text-gray-400 leading-tight">copies</p>
            </div>
            <div className="text-center border-x border-gray-200">
              <p className="text-base font-bold text-gray-800">{Math.round(totalLengthMm)}</p>
              <p className="text-xs text-gray-400 leading-tight">mm long</p>
            </div>
            <div className="text-center">
              <p className={`text-base font-bold ${utilColor}`}>{utilizationPct}%</p>
              <p className="text-xs text-gray-400 leading-tight">used</p>
            </div>
          </div>
        )}

        {/* ── Action buttons ── */}
        <div className="px-5 py-4 border-t border-gray-200 space-y-2">
          <button
            onClick={runAutoLayout}
            disabled={!canLayout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all
              bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]
              disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 shadow-sm"
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
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]
              disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 shadow-sm ${
              exportSuccess
                ? 'bg-green-500 text-white'
                : 'bg-gray-900 text-white hover:bg-gray-700'
            }`}
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
            <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {exportError}
            </div>
          )}
        </div>
      </div>

      {/* ── Canvas area ─────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Canvas toolbar */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-3">
          <h2 className="text-sm font-bold text-gray-800">Layout Preview</h2>
          {copies.length === 0 && (
            <span className="text-xs text-gray-400">
              Add files and click Auto-Layout to get started
            </span>
          )}
        </div>

        <div className="flex-1 min-h-0 p-3">
          <LayoutCanvas
            foilWidthMm={foilWidthMm}
            totalLengthMm={totalLengthMm}
            copies={copies}
            files={files}
            onCopiesChange={setCopies}
          />
        </div>
      </div>
    </div>
  );
}
