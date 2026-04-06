import { useState, useCallback } from 'react';
import type { PlannedFile, PackedCopy, ExportCopy, RegmarkType } from '../../types/printPlanning.ts';
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
  const [regmarkType, setRegmarkType] = useState<RegmarkType>('opos');
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
        { foilWidthMm, totalLengthMm, copies: exportCopies, regmarkType }
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

        {/* Sidebar header */}
        <div className="px-5 py-4 border-b border-white/10">
          <p className="text-xs font-bold tracking-widest uppercase text-nim-yellow">Setup</p>
          <p className="text-xs text-white/30 mt-0.5">Foil width · files · quantities</p>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          <FileSetupPanel
            foilWidthMm={foilWidthMm}
            onFoilWidthChange={setFoilWidthMm}
            files={files}
            onFilesChange={setFiles}
          />

          {/* Regmark switcher */}
          <div>
            <p className="nim-label mb-3">Registration Marks</p>
            <div className="grid grid-cols-2 gap-2">
              {([
                {
                  id: 'opos' as RegmarkType,
                  label: 'OPOS',
                  sub: 'Summa / Graphtec',
                  icon: (
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                      <rect x="3" y="3" width="5" height="5" />
                      <rect x="16" y="3" width="5" height="5" />
                      <rect x="3" y="16" width="5" height="5" />
                      <rect x="16" y="16" width="5" height="5" />
                      <rect x="9.5" y="3" width="5" height="5" />
                      <rect x="9.5" y="16" width="5" height="5" />
                    </svg>
                  ),
                },
                {
                  id: 'roland' as RegmarkType,
                  label: 'Roland',
                  sub: 'VersaWorks',
                  icon: (
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                      <circle cx="5" cy="5" r="3" />
                      <circle cx="19" cy="5" r="3" />
                      <circle cx="5" cy="19" r="3" />
                      <circle cx="19" cy="19" r="3" />
                      <rect x="9" y="19" width="6" height="2" />
                    </svg>
                  ),
                },
              ]).map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setRegmarkType(opt.id)}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all ${
                    regmarkType === opt.id
                      ? 'border-nim-yellow bg-nim-yellow/10 text-nim-yellow'
                      : 'border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'
                  }`}
                >
                  {opt.icon}
                  <span className="text-xs font-bold uppercase tracking-wider">{opt.label}</span>
                  <span className="text-xs opacity-60 font-normal">{opt.sub}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        {copies.length > 0 && (
          <div className="border-t border-white/10 px-5 py-4 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-base font-bold text-white">{copies.length}</p>
              <p className="text-xs text-white/30 leading-tight">copies</p>
            </div>
            <div className="border-x border-white/10">
              <p className="text-base font-bold text-white">{Math.round(totalLengthMm)}</p>
              <p className="text-xs text-white/30 leading-tight">mm</p>
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
            foilWidthMm={foilWidthMm}
            totalLengthMm={totalLengthMm}
            copies={copies}
            files={files}
            regmarkType={regmarkType}
            onCopiesChange={setCopies}
          />
        </div>
      </div>
    </div>
  );
}
