import { useState, useCallback } from 'react';
import type { PlannedFile, PackedCopy, ExportCopy } from '../../types/printPlanning.ts';
import type { ContourParams } from '../../types/contour.ts';
import { packItems } from '../../lib/packer.ts';
import { exportPrintLayout, exportPrintLayoutBlob, generatePdfBlob } from '../../lib/api.ts';
import { LayoutCanvas } from './LayoutCanvas.tsx';
import { ImageUpload } from '../ImageUpload.tsx';
import { ShapeSelector } from '../ShapeSelector.tsx';
import { CanvasPreview } from '../CanvasPreview.tsx';
import { ParameterPanel } from '../ParameterPanel.tsx';
import { useContour } from '../../hooks/useContour.ts';
import { renderPdfFirstPage } from '../../lib/pdfPreview.ts';
import { useLang } from '../../lib/LangContext.ts';

const IS_WORDPRESS = import.meta.env.VITE_MODE === 'wordpress';

const FILE_COLORS = [
  '#FFE600', '#ef4444', '#10b981', '#3b82f6',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f59e0b',
];

const DEFAULT_PARAMS: ContourParams = {
  threshold: 128,
  kissOffset: 50,
  perfOffset: 50,
  smoothing: 4,
  enclose: false,
  cutMode: 'kiss',
  shapeType: 'contour',
  shapeSize: 90,
  shapeOffsetX: 0,
  shapeOffsetY: 0,
};

const PAGE_SIZES = {
  a4: { label: 'A4', widthMm: 210, heightMm: 297 },
  a5: { label: 'A5', widthMm: 148, heightMm: 210 },
} as const;

type PageSizeKey = keyof typeof PAGE_SIZES;

function StepLabel({ n, label }: { n: string; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <span className="w-5 h-5 rounded-md bg-nim-yellow flex items-center justify-center text-nim-black text-xs font-black leading-none shrink-0">
        {n}
      </span>
      <span className="text-xs font-bold uppercase tracking-widest text-white">{label}</span>
    </div>
  );
}

interface Props {
  initialFile?: File | null;
  initialImageDataUrl?: string | null;
  initialParams?: ContourParams | null;
  initialWidthCm?: number | null;
  initialHeightCm?: number | null;
}

export function WordpressPrintPlanningTab({
  initialFile = null,
  initialImageDataUrl = null,
  initialParams = null,
  initialWidthCm = null,
  initialHeightCm = null,
}: Props = {}) {
  const { lang } = useLang();

  // ── Left: sticker configurator ──────────────────────────────────────────────
  const [file, setFile] = useState<File | null>(initialFile);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(initialImageDataUrl);
  const [params, setParams] = useState<ContourParams>(initialParams ?? DEFAULT_PARAMS);
  const [stickerWidthCm, setStickerWidthCm] = useState<number | null>(initialWidthCm);
  const [stickerHeightCm, setStickerHeightCm] = useState<number | null>(initialHeightCm);
  const [quantity, setQuantity] = useState(1);
  const [paramsOpen, setParamsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const { data: contour, isLoading: contourLoading } = useContour(file, params);

  // ── Right: sheet ─────────────────────────────────────────────────────────────
  const [pageSize, setPageSize] = useState<PageSizeKey>('a4');
  const [files, setFiles] = useState<PlannedFile[]>([]);
  const [copies, setCopies] = useState<PackedCopy[]>([]);
  const [totalLengthMm, setTotalLengthMm] = useState(0);
  const [utilizationPct, setUtilizationPct] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);

  const page = PAGE_SIZES[pageSize];

  const runAutoLayout = useCallback((currentFiles: PlannedFile[], currentPage: typeof page) => {
    if (currentFiles.length === 0) { setCopies([]); setTotalLengthMm(0); setUtilizationPct(0); return; }
    const result = packItems(currentFiles, currentPage.widthMm, currentPage.heightMm);
    setCopies(result.copies);
    setTotalLengthMm(result.totalLengthMm);
    setUtilizationPct(result.utilizationPct);
  }, []);

  async function handleAddToSheet() {
    if (!file) return;
    if (!stickerWidthCm || !stickerHeightCm) {
      setAddError(lang === 'sv' ? 'Ange storlek (bredd × höjd) för klistermärket.' : 'Please set the sticker size (width × height).');
      return;
    }
    setIsAdding(true);
    setAddError(null);
    try {
      const pdfBlob = await generatePdfBlob(file, params);
      const pdfFile = new File([pdfBlob], file.name.replace(/\.[^.]+$/, '.pdf'), { type: 'application/pdf' });
      const previewUrl = await renderPdfFirstPage(pdfFile).catch(() => undefined);
      const colorIdx = files.length % FILE_COLORS.length;

      const newEntry: PlannedFile = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file: pdfFile,
        name: file.name.replace(/\.[^.]+$/, ''),
        widthMm: stickerWidthCm * 10,
        heightMm: stickerHeightCm * 10,
        quantity,
        color: FILE_COLORS[colorIdx],
        previewUrl,
      };

      const nextFiles = [...files, newEntry];
      setFiles(nextFiles);
      runAutoLayout(nextFiles, page);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to generate PDF');
    } finally {
      setIsAdding(false);
    }
  }

  function removeFile(id: string) {
    const nextFiles = files.filter(f => f.id !== id);
    setFiles(nextFiles);
    runAutoLayout(nextFiles, page);
  }

  function updateQuantity(id: string, qty: number) {
    const nextFiles = files.map(f => f.id === id ? { ...f, quantity: Math.max(1, qty) } : f);
    setFiles(nextFiles);
    runAutoLayout(nextFiles, page);
  }

  function changePageSize(key: PageSizeKey) {
    setPageSize(key);
    runAutoLayout(files, PAGE_SIZES[key]);
  }

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
      const layout = { foilWidthMm: page.widthMm, totalLengthMm: page.heightMm, copies: exportCopies, regmarkType: 'none' as const };
      const filename = `Kiss-Cut-Ark-${page.label}.pdf`;

      if (IS_WORDPRESS) {
        const pdfBlob = await exportPrintLayoutBlob(files.map(f => f.file), layout);
        // Use the first sticker's source image as the "image" field, or a blank PNG if none
        const imageFile = file ?? new File([new Uint8Array(0)], 'sheet.png', { type: 'image/png' });
        const widthCm  = Math.ceil(page.widthMm / 10);
        const heightCm = Math.ceil(page.heightMm / 10);
        window.parent.postMessage(
          { type: 'nimstick_save_design', pdf: pdfBlob, image: imageFile, filename, width: widthCm, height: heightCm, cutMode: 'kiss' },
          '*'
        );
      } else {
        await exportPrintLayout(files.map(f => f.file), layout, filename);
      }

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  }

  const utilColor = utilizationPct >= 75 ? 'text-green-400' : utilizationPct >= 50 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="grid grid-cols-[360px_1fr] gap-6">

      {/* ── Left: sticker configurator ── */}
      <div className="flex flex-col gap-4">

        {/* Upload */}
        <div className="bg-nim-darker rounded-2xl border border-white/10 overflow-hidden">
          <div className="px-5 pt-5 pb-2">
            <StepLabel n="01" label={lang === 'sv' ? 'Ladda upp bild' : 'Upload Image'} />
          </div>
          <div className="px-5 pb-5">
            <ImageUpload
              onImageSelected={(f, dataUrl) => { setFile(f); setImageDataUrl(dataUrl); }}
              onSizeChange={(w, h) => { setStickerWidthCm(w); setStickerHeightCm(h); }}
            />
          </div>
        </div>

        {/* Shape */}
        <div className="bg-nim-darker rounded-2xl border border-white/10 overflow-hidden">
          <div className="px-5 pt-5 pb-2">
            <StepLabel n="02" label={lang === 'sv' ? 'Välj form' : 'Cut Shape'} />
          </div>
          <div className="px-5 pb-5">
            <ShapeSelector
              value={params.shapeType}
              onChange={shape => setParams(p => ({ ...p, shapeType: shape }))}
              shapeSize={params.shapeSize}
              onSizeChange={size => setParams(p => ({ ...p, shapeSize: size }))}
              shapeOffsetX={params.shapeOffsetX}
              shapeOffsetY={params.shapeOffsetY}
              onOffsetChange={(x, y) => setParams(p => ({ ...p, shapeOffsetX: x, shapeOffsetY: y }))}
            />
          </div>
        </div>

        {/* Cut Parameters — collapsible */}
        <div className="bg-nim-darker rounded-2xl border border-white/10 overflow-hidden">
          <button
            onClick={() => setParamsOpen(o => !o)}
            className="w-full flex items-center justify-between px-5 py-4 text-left"
          >
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center text-white/40 text-xs font-black leading-none shrink-0">
                ✂
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-white/50">
                {lang === 'sv' ? 'Skärparametrar' : 'Cut Parameters'}
              </span>
            </div>
            <svg
              className={`w-4 h-4 text-white/30 transition-transform ${paramsOpen ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {paramsOpen && (
            <div className="px-5 pb-5 border-t border-white/10">
              <div className="pt-4">
                <ParameterPanel params={params} onChange={setParams} hideCutMode hideOffsets hideEnclose />
              </div>
            </div>
          )}
        </div>

        {/* Preview + Add to Sheet */}
        <div className="bg-nim-darker rounded-2xl border border-white/10 overflow-hidden">
          <div className="px-5 pt-5 pb-2">
            <StepLabel n="03" label={lang === 'sv' ? 'Förhandsvisning & lägg till' : 'Preview & Add'} />
          </div>
          <div className="px-5 pb-5 flex flex-col gap-3">

            {/* Kiss offset + enclose — always visible */}
            <ParameterPanel
              params={params}
              onChange={setParams}
              hideCutMode
              hideThreshold
              hideSmoothing
            />

            {/* Mini preview */}
            <div className="rounded-xl overflow-hidden border border-white/10" style={{ minHeight: 180 }}>
              <CanvasPreview
                imageDataUrl={imageDataUrl}
                contour={contour ?? null}
                params={params}
                isLoading={contourLoading}
              />
            </div>

            {/* Quantity */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-white">{lang === 'sv' ? 'Antal' : 'Quantity'}</span>
              <div className="flex items-center bg-white/5 rounded-lg border border-white/10 overflow-hidden">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-nim-yellow text-base"
                >−</button>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-10 text-center text-xs font-bold text-white bg-transparent border-none focus:outline-none py-1"
                />
                <button
                  onClick={() => setQuantity(q => q + 1)}
                  className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-nim-yellow text-base"
                >+</button>
              </div>
            </div>

            {addError && (
              <p className="text-xs text-red-400 bg-red-950/50 border border-red-800 rounded-lg px-3 py-2">
                {addError}
              </p>
            )}

            <button
              onClick={handleAddToSheet}
              disabled={!file || isAdding}
              className="nim-btn-yellow w-full"
            >
              {isAdding ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  {lang === 'sv' ? 'Genererar…' : 'Generating…'}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 4v16m8-8H4" />
                  </svg>
                  {lang === 'sv' ? 'Lägg till ark' : 'Add to Sheet'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Right: sheet ── */}
      <div className="flex flex-col gap-4">

        {/* Top bar */}
        <div className="flex items-center gap-3 flex-wrap">

          {/* Page size */}
          <div className="flex gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
            {(Object.entries(PAGE_SIZES) as [PageSizeKey, typeof PAGE_SIZES[PageSizeKey]][]).map(([key, ps]) => (
              <button
                key={key}
                onClick={() => changePageSize(key)}
                className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-widest transition-all ${
                  pageSize === key
                    ? 'bg-nim-yellow text-nim-black shadow'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                {ps.label} <span className="font-normal opacity-60">{ps.widthMm}×{ps.heightMm}</span>
              </button>
            ))}
          </div>

          {/* Stats */}
          {copies.length > 0 && (
            <div className="flex items-center gap-3 text-xs text-white/50 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
              <span><span className="font-bold text-white">{copies.length}</span> {lang === 'sv' ? 'kopior' : 'copies'}</span>
              <span className="w-px h-3 bg-white/20" />
              <span className={`font-bold ${utilColor}`}>{utilizationPct}%</span>
              <span>{lang === 'sv' ? 'använt' : 'used'}</span>
            </div>
          )}

        </div>

        {/* Canvas */}
        <div className="rounded-2xl overflow-hidden border border-white/10" style={{ height: 520 }}>
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

        {/* Save Sheet button */}
        {exportError && (
          <p className="text-xs text-red-400 bg-red-950/50 border border-red-800 rounded-lg px-3 py-2">
            {exportError}
          </p>
        )}
        <button
          onClick={handleExport}
          disabled={copies.length === 0 || isExporting}
          className={`nim-btn-yellow w-full ${exportSuccess ? '!bg-green-500 !text-white' : ''}`}
        >
          {isExporting ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              {lang === 'sv' ? 'Sparar…' : 'Saving…'}
            </>
          ) : exportSuccess ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              {lang === 'sv' ? 'Sparat!' : 'Saved!'}
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {lang === 'sv' ? 'Spara ark' : 'Save Sheet'}
            </>
          )}
        </button>

        {/* Sticker list */}
        {files.length > 0 && (
          <div className="bg-nim-darker rounded-2xl border border-white/10 px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="nim-label">{lang === 'sv' ? 'Klistermärken på arket' : 'Stickers on sheet'}</p>
              <span className="text-xs font-bold text-white/30 bg-white/5 px-2 py-0.5 rounded-full">{files.length}</span>
            </div>
            <div className="space-y-2">
              {files.map(f => (
                <div key={f.id}
                  className="group flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 hover:border-white/20 transition-all"
                >
                  {/* Color swatch / thumbnail */}
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg overflow-hidden border border-white/10">
                    {f.previewUrl ? (
                      <img src={f.previewUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: `${f.color}22` }}>
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: f.color }} />
                      </div>
                    )}
                  </div>

                  {/* Name + dims */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate leading-tight">{f.name}</p>
                    <p className="text-xs text-white/30 leading-tight mt-0.5">
                      {Math.round(f.widthMm)} × {Math.round(f.heightMm)} mm
                    </p>
                  </div>

                  {/* Quantity stepper */}
                  <div className="flex items-center bg-white/5 rounded-lg border border-white/10 overflow-hidden flex-shrink-0">
                    <button onClick={() => updateQuantity(f.id, f.quantity - 1)}
                      className="w-6 h-7 flex items-center justify-center text-white/40 hover:text-nim-yellow transition-colors text-base leading-none">−</button>
                    <input
                      type="number" min={1} value={f.quantity}
                      onChange={e => updateQuantity(f.id, parseInt(e.target.value, 10) || 1)}
                      className="w-10 text-center text-xs font-bold text-white bg-transparent border-none focus:outline-none py-1"
                    />
                    <button onClick={() => updateQuantity(f.id, f.quantity + 1)}
                      className="w-6 h-7 flex items-center justify-center text-white/40 hover:text-nim-yellow transition-colors text-base leading-none">+</button>
                  </div>

                  {/* Remove */}
                  <button onClick={() => removeFile(f.id)}
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all"
                    title="Remove">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
