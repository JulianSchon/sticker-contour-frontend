import { useEffect, useState } from 'react';
import type { PlannedFile, PackedCopy, ExportCopy } from '../../types/printPlanning.ts';
import { packItems } from '../../lib/packer.ts';
import { exportPrintLayout, exportPrintLayoutBlob } from '../../lib/api.ts';
import { LayoutCanvas } from './LayoutCanvas.tsx';
import { MaterialFinishPicker, MATERIALS } from '../MaterialFinishPicker.tsx';
import type { Material, Finish } from '../MaterialFinishPicker.tsx';
import { useLang } from '../../lib/LangContext.ts';

const SHEET_MATERIALS = MATERIALS.filter(m => m.value !== 'reflex') as ReadonlyArray<typeof MATERIALS[number]>;
const IS_WORDPRESS = import.meta.env.VITE_MODE === 'wordpress';

const PAGE_SIZES = {
  a4: { label: 'A4', widthMm: 210, heightMm: 297 },
  a5: { label: 'A5', widthMm: 148, heightMm: 210 },
} as const;
type PageSizeKey = keyof typeof PAGE_SIZES;

interface Props {
  items: PlannedFile[];
  onItemsChange: (items: PlannedFile[]) => void;
  onGoToDesign: () => void;
}

export function WordpressPrintPlanningTab({ items, onItemsChange, onGoToDesign }: Props) {
  const { t, lang } = useLang();
  const [pageSize, setPageSize] = useState<PageSizeKey>('a4');
  const [copies, setCopies] = useState<PackedCopy[]>([]);
  const [totalLengthMm, setTotalLengthMm] = useState(0);
  const [utilizationPct, setUtilizationPct] = useState(0);
  const [material, setMaterial] = useState<Material>('vinyl');
  const [finish, setFinish] = useState<Finish>('glossy');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);

  const page = PAGE_SIZES[pageSize];

  useEffect(() => {
    if (items.length === 0) {
      setCopies([]);
      setTotalLengthMm(0);
      setUtilizationPct(0);
      return;
    }
    const result = packItems(items, page.widthMm, page.heightMm);
    setCopies(result.copies);
    setTotalLengthMm(result.totalLengthMm);
    setUtilizationPct(result.utilizationPct);
  }, [items, page.widthMm, page.heightMm]);

  function removeItem(id: string) {
    onItemsChange(items.filter(f => f.id !== id));
  }

  function updateQuantity(id: string, qty: number) {
    onItemsChange(items.map(f => f.id === id ? { ...f, quantity: Math.max(1, qty) } : f));
  }

  async function handleExport() {
    if (copies.length === 0 || items.length === 0) return;
    setIsExporting(true);
    setExportError(null);
    setExportSuccess(false);
    try {
      // Drop any copies whose source item is no longer present (a stale
      // `copies` state between an item removal and the re-pack effect) so the
      // backend never receives a -1 fileIndex.
      const exportCopies: ExportCopy[] = copies
        .map(c => ({
          fileIndex: items.findIndex(f => f.id === c.fileId),
          x: c.x,
          y: c.y,
          widthMm: c.w,
          heightMm: c.h,
          rotated: c.rotated,
        }))
        .filter(c => c.fileIndex !== -1);
      if (exportCopies.length === 0) {
        setExportError(lang === 'sv' ? 'Layouten är inte synkad – försök igen.' : 'Layout is out of sync; please try again.');
        setIsExporting(false);
        return;
      }
      const layout = {
        foilWidthMm: page.widthMm,
        totalLengthMm: page.heightMm,
        copies: exportCopies,
        regmarkType: 'none' as const,
      };
      const filename = `Kiss-Cut-Ark-${page.label}.pdf`;

      if (IS_WORDPRESS) {
        const pdfBlob = await exportPrintLayoutBlob(items.map(f => f.file), layout);
        const imageFile = new File([new Uint8Array(0)], 'sheet.png', { type: 'image/png' });
        const widthCm = Math.ceil(page.widthMm / 10);
        const heightCm = Math.ceil(page.heightMm / 10);
        window.parent.postMessage(
          { type: 'nimstick_save_design', pdf: pdfBlob, image: imageFile, filename, width: widthCm, height: heightCm, cutMode: 'kiss', material, finish },
          '*'
        );
      } else {
        await exportPrintLayout(items.map(f => f.file), layout, filename);
      }

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
        <svg className="w-12 h-12 text-white/15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h10" />
        </svg>
        <p className="text-base font-black text-white uppercase tracking-wider">{t.sheetEmpty}</p>
        <p className="text-sm text-white/40 max-w-sm leading-relaxed">{t.sheetEmptyHint}</p>
        <button onClick={onGoToDesign} className="nim-btn-yellow mt-2">{t.cutGoToDesign}</button>
      </div>
    );
  }

  const utilColor = utilizationPct >= 75
    ? 'text-green-400'
    : utilizationPct >= 50
    ? 'text-yellow-400'
    : 'text-red-400';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
          {(Object.entries(PAGE_SIZES) as [PageSizeKey, typeof PAGE_SIZES[PageSizeKey]][]).map(([key, ps]) => (
            <button
              key={key}
              onClick={() => setPageSize(key)}
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
        {copies.length > 0 && (
          <div className="flex items-center gap-3 text-xs text-white/50 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
            <span><span className="font-bold text-white">{copies.length}</span> {lang === 'sv' ? 'kopior' : 'copies'}</span>
            <span className="w-px h-3 bg-white/20" />
            <span className={`font-bold ${utilColor}`}>{utilizationPct}%</span>
            <span>{lang === 'sv' ? 'använt' : 'used'}</span>
          </div>
        )}
      </div>

      <div className="rounded-2xl overflow-hidden border border-white/10" style={{ height: 520 }}>
        <LayoutCanvas
          foilWidthMm={page.widthMm}
          totalLengthMm={totalLengthMm}
          copies={copies}
          files={items}
          regmarkType="none"
          onCopiesChange={setCopies}
          pageLengthMm={page.heightMm}
        />
      </div>

      <div className="bg-nim-darker rounded-2xl border border-white/10 px-5 py-4">
        <p className="nim-label mb-3">{lang === 'sv' ? 'Material & finish' : 'Material & Finish'}</p>
        <MaterialFinishPicker
          material={material}
          finish={finish}
          onMaterialChange={setMaterial}
          onFinishChange={setFinish}
          allowedMaterials={SHEET_MATERIALS}
        />
      </div>

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
        {isExporting
          ? (lang === 'sv' ? 'Sparar…' : 'Saving…')
          : exportSuccess
          ? (lang === 'sv' ? 'Sparat!' : 'Saved!')
          : (lang === 'sv' ? 'Spara ark' : 'Save Sheet')}
      </button>

      <div className="bg-nim-darker rounded-2xl border border-white/10 px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="nim-label">{lang === 'sv' ? 'Klistermärken på arket' : 'Stickers on sheet'}</p>
          <span className="text-xs font-bold text-white/30 bg-white/5 px-2 py-0.5 rounded-full">{items.length}</span>
        </div>
        <div className="space-y-2">
          {items.map(f => (
            <div
              key={f.id}
              className="group flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 hover:border-white/20 transition-all"
            >
              <div className="flex-shrink-0 w-9 h-9 rounded-lg overflow-hidden border border-white/10">
                {f.previewUrl ? (
                  <img src={f.previewUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: `${f.color}22` }}>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: f.color }} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate leading-tight">{f.name}</p>
                <p className="text-xs text-white/30 leading-tight mt-0.5">
                  {Math.round(f.widthMm)} × {Math.round(f.heightMm)} mm
                </p>
              </div>
              <div className="flex items-center bg-white/5 rounded-lg border border-white/10 overflow-hidden flex-shrink-0">
                <button
                  onClick={() => updateQuantity(f.id, f.quantity - 1)}
                  className="w-6 h-7 flex items-center justify-center text-white/40 hover:text-nim-yellow transition-colors text-base leading-none"
                >−</button>
                <input
                  type="number"
                  min={1}
                  value={f.quantity}
                  onChange={e => updateQuantity(f.id, parseInt(e.target.value, 10) || 1)}
                  className="w-10 text-center text-xs font-bold text-white bg-transparent border-none focus:outline-none py-1"
                />
                <button
                  onClick={() => updateQuantity(f.id, f.quantity + 1)}
                  className="w-6 h-7 flex items-center justify-center text-white/40 hover:text-nim-yellow transition-colors text-base leading-none"
                >+</button>
              </div>
              <button
                onClick={() => removeItem(f.id)}
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all"
                title="Remove"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
