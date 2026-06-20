# Kiss-Cut Sheet Builder — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** In WordPress mode, let the user **Send to sheet** from the cut step (kiss-cut), accumulate stickers into a shared collection shown by an **ARK (N)** badge, and open **ARK** (arrange-only) to lay out, set quantities, and Save the sheet to the WooCommerce cart.

**Architecture:** Lift a `sheetItems: PlannedFile[]` collection into `App` (WP mode). A `buildSheetItem` helper turns the flattened design into a kiss-cut PDF `PlannedFile`. The cut step gets a "Send to sheet" button; the header gets an ARK(N) badge; `WordpressPrintPlanningTab` becomes a **controlled, arrange-only** view fed by the collection (its old upload/shape/cut configurator is removed).

**Tech Stack:** React 18, Vite, TS, Tailwind, `@tanstack/react-query`, Vitest. Reuses `packer`, `LayoutCanvas`, `generatePdfBlob`/`exportPrintLayoutBlob`, `renderPdfFirstPage`.

**Repo:** `sticker-contour-frontend`, branch `diy-sticker-editor` (PR #1). **WordPress mode only** (`VITE_MODE=wordpress`); standalone is untouched. Spec: `docs/specs/2026-06-18-kiss-cut-sheet-builder-design.md`.

---

## File Structure

**New:**
- `src/lib/sheetItem.ts` — `SHEET_COLORS` + `buildSheetItem(file, params, wCm, hCm, colorIndex)` → `Promise<PlannedFile>` (kiss-cut PDF + thumbnail).
- `src/lib/sheetItem.test.ts` — unit test (mocks `api` + `pdfPreview`).

**Modified:**
- `src/lib/i18n.ts` — `sendToSheet`, `sentToSheet`, `arkBadge`, `sheetEmpty`, `sheetEmptyHint` (en + sv).
- `src/App.tsx` — `sheetItems` state + `handleSendToSheet`; "Send to sheet" button in the WP cut step; ARK(N) header badge; pass controlled props to `WordpressPrintPlanningTab`.
- `src/components/PrintPlanning/WordpressPrintPlanningTab.tsx` — full rewrite to controlled, arrange-only.
- `e2e/design-editor.spec.ts` — WP-flow E2E (added in Task 6, runs against the WP-mode build).

---

## Task 1: i18n strings

**Files:** Modify `src/lib/i18n.ts`

- [ ] **Step 1: Add to the `en` object** (near the other `ed*`/`cut*` keys):
```ts
    sendToSheet: 'Send to sheet',
    sentToSheet: 'Added to sheet ✓',
    arkBadge: 'Sheet',
    sheetEmpty: 'Your sheet is empty',
    sheetEmptyHint: 'Design a sticker and use “Send to sheet”, then arrange them here.',
```

- [ ] **Step 2: Add to the `sv` object:**
```ts
    sendToSheet: 'Skicka till ark',
    sentToSheet: 'Tillagd på arket ✓',
    arkBadge: 'Ark',
    sheetEmpty: 'Ditt ark är tomt',
    sheetEmptyHint: 'Designa ett klistermärke och använd ”Skicka till ark”, ordna dem sedan här.',
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` → no errors (en/sv keys match).

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n.ts
git commit -m "feat: i18n strings for kiss-cut sheet builder"
```

---

## Task 2: buildSheetItem helper (TDD)

**Files:** Create `src/lib/sheetItem.ts`, Test `src/lib/sheetItem.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/sheetItem.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./api.ts', () => ({
  generatePdfBlob: vi.fn(async () => new Blob(['pdf'], { type: 'application/pdf' })),
}));
vi.mock('./pdfPreview.ts', () => ({
  renderPdfFirstPage: vi.fn(async () => 'data:image/png;base64,AAAA'),
}));

import { buildSheetItem, SHEET_COLORS } from './sheetItem.ts';
import { generatePdfBlob } from './api.ts';
import type { ContourParams } from '../types/contour.ts';

const PARAMS: ContourParams = {
  threshold: 128, kissOffset: 0, perfOffset: 3, smoothing: 4, enclose: true,
  cutMode: 'perf', shapeType: 'contour', shapeSize: 90, shapeOffsetX: 0, shapeOffsetY: 0,
};

beforeEach(() => vi.clearAllMocks());

describe('buildSheetItem', () => {
  it('builds a kiss-cut PlannedFile with mm dims and quantity 1', async () => {
    const src = new File(['x'], 'cowgirl.png', { type: 'image/png' });
    const item = await buildSheetItem(src, PARAMS, 7, 5, 0);

    expect(item.widthMm).toBe(70);
    expect(item.heightMm).toBe(50);
    expect(item.quantity).toBe(1);
    expect(item.name).toBe('cowgirl');
    expect(item.file.type).toBe('application/pdf');
    expect(item.previewUrl).toBe('data:image/png;base64,AAAA');
    expect(item.color).toBe(SHEET_COLORS[0]);

    // PDF generated with kiss cut, offset carried over from perfOffset
    const passedParams = (generatePdfBlob as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as ContourParams;
    expect(passedParams.cutMode).toBe('kiss');
    expect(passedParams.kissOffset).toBe(3);
  });

  it('cycles colors by index and survives a thumbnail failure', async () => {
    const { renderPdfFirstPage } = await import('./pdfPreview.ts');
    (renderPdfFirstPage as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('no canvas'));
    const item = await buildSheetItem(new File(['x'], 'a.png'), PARAMS, 5, 5, SHEET_COLORS.length);
    expect(item.color).toBe(SHEET_COLORS[0]); // wraps
    expect(item.previewUrl).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- sheetItem`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement `src/lib/sheetItem.ts`**

```ts
import { generatePdfBlob } from './api.ts';
import { renderPdfFirstPage } from './pdfPreview.ts';
import type { ContourParams } from '../types/contour.ts';
import type { PlannedFile } from '../types/printPlanning.ts';

export const SHEET_COLORS = [
  '#FFE600', '#ef4444', '#10b981', '#3b82f6',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f59e0b',
];

/** Turn a flattened design into a kiss-cut (CutContour) sticker for the sheet. */
export async function buildSheetItem(
  file: File,
  params: ContourParams,
  wCm: number,
  hCm: number,
  colorIndex: number,
): Promise<PlannedFile> {
  const kissParams: ContourParams = { ...params, cutMode: 'kiss', kissOffset: params.perfOffset };
  const pdfBlob = await generatePdfBlob(file, kissParams);
  const baseName = file.name.replace(/\.[^.]+$/, '');
  const pdfFile = new File([pdfBlob], `${baseName}.pdf`, { type: 'application/pdf' });
  const previewUrl = await renderPdfFirstPage(pdfFile).catch(() => undefined);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    file: pdfFile,
    name: baseName,
    widthMm: wCm * 10,
    heightMm: hCm * 10,
    quantity: 1,
    color: SHEET_COLORS[colorIndex % SHEET_COLORS.length],
    previewUrl,
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- sheetItem` → PASS. Then `npm test` (full) → all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sheetItem.ts src/lib/sheetItem.test.ts
git commit -m "feat: buildSheetItem (kiss-cut PlannedFile from a design)"
```

---

## Task 3: WordpressPrintPlanningTab → controlled, arrange-only

**Files:** Modify (full rewrite) `src/components/PrintPlanning/WordpressPrintPlanningTab.tsx`

- [ ] **Step 1: Replace the whole file with the controlled version**

```tsx
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

  // Re-pack whenever the collection or page size changes.
  useEffect(() => {
    if (items.length === 0) { setCopies([]); setTotalLengthMm(0); setUtilizationPct(0); return; }
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
      const exportCopies: ExportCopy[] = copies.map(c => ({
        fileIndex: items.findIndex(f => f.id === c.fileId),
        x: c.x, y: c.y, widthMm: c.w, heightMm: c.h, rotated: c.rotated,
      }));
      const layout = { foilWidthMm: page.widthMm, totalLengthMm: page.heightMm, copies: exportCopies, regmarkType: 'none' as const };
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

  const utilColor = utilizationPct >= 75 ? 'text-green-400' : utilizationPct >= 50 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="flex flex-col gap-4">
      {/* Top bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
          {(Object.entries(PAGE_SIZES) as [PageSizeKey, typeof PAGE_SIZES[PageSizeKey]][]).map(([key, ps]) => (
            <button
              key={key}
              onClick={() => setPageSize(key)}
              className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-widest transition-all ${
                pageSize === key ? 'bg-nim-yellow text-nim-black shadow' : 'text-white/40 hover:text-white/70'
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

      {/* Canvas */}
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

      {/* Material & Finish */}
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
        <p className="text-xs text-red-400 bg-red-950/50 border border-red-800 rounded-lg px-3 py-2">{exportError}</p>
      )}
      <button
        onClick={handleExport}
        disabled={copies.length === 0 || isExporting}
        className={`nim-btn-yellow w-full ${exportSuccess ? '!bg-green-500 !text-white' : ''}`}
      >
        {isExporting ? (lang === 'sv' ? 'Sparar…' : 'Saving…')
          : exportSuccess ? (lang === 'sv' ? 'Sparat!' : 'Saved!')
          : (lang === 'sv' ? 'Spara ark' : 'Save Sheet')}
      </button>

      {/* Sticker list */}
      <div className="bg-nim-darker rounded-2xl border border-white/10 px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="nim-label">{lang === 'sv' ? 'Klistermärken på arket' : 'Stickers on sheet'}</p>
          <span className="text-xs font-bold text-white/30 bg-white/5 px-2 py-0.5 rounded-full">{items.length}</span>
        </div>
        <div className="space-y-2">
          {items.map(f => (
            <div key={f.id} className="group flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 hover:border-white/20 transition-all">
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
                <p className="text-xs text-white/30 leading-tight mt-0.5">{Math.round(f.widthMm)} × {Math.round(f.heightMm)} mm</p>
              </div>
              <div className="flex items-center bg-white/5 rounded-lg border border-white/10 overflow-hidden flex-shrink-0">
                <button onClick={() => updateQuantity(f.id, f.quantity - 1)} className="w-6 h-7 flex items-center justify-center text-white/40 hover:text-nim-yellow transition-colors text-base leading-none">−</button>
                <input type="number" min={1} value={f.quantity}
                  onChange={e => updateQuantity(f.id, parseInt(e.target.value, 10) || 1)}
                  className="w-10 text-center text-xs font-bold text-white bg-transparent border-none focus:outline-none py-1" />
                <button onClick={() => updateQuantity(f.id, f.quantity + 1)} className="w-6 h-7 flex items-center justify-center text-white/40 hover:text-nim-yellow transition-colors text-base leading-none">+</button>
              </div>
              <button onClick={() => removeItem(f.id)} className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all" title="Remove">
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
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: errors ONLY in `src/App.tsx` (it still renders `<WordpressPrintPlanningTab />` with no props — fixed in Task 5). The component file itself must be error-free. If `LayoutCanvas` prop names differ, check `LayoutCanvas.tsx` and match; report any change.

- [ ] **Step 3: Commit**

```bash
git add src/components/PrintPlanning/WordpressPrintPlanningTab.tsx
git commit -m "refactor: ARK becomes controlled + arrange-only (fed by shared collection)"
```

---

## Task 4: App — sheet collection state + send-to-sheet handler

**Files:** Modify `src/App.tsx`

- [ ] **Step 1: Add imports** (with the other imports near the top):
```tsx
import type { PlannedFile } from './types/printPlanning.ts';
import { buildSheetItem } from './lib/sheetItem.ts';
```

- [ ] **Step 2: Add state + handler** — after the `const [finish, setFinish] = …` line, add:
```tsx
  const [sheetItems, setSheetItems] = useState<PlannedFile[]>([]);
  const [sendingToSheet, setSendingToSheet] = useState(false);
  const [sentFlash, setSentFlash] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
```
Then, after the `goToCut` function, add:
```tsx
  const handleSendToSheet = async () => {
    if (!file || !stickerWidthCm || !stickerHeightCm || sendingToSheet) return;
    setSendingToSheet(true);
    setSheetError(null);
    try {
      const item = await buildSheetItem(file, params, stickerWidthCm, stickerHeightCm, sheetItems.length);
      setSheetItems(prev => [...prev, item]);
      setSentFlash(true);
      setTimeout(() => setSentFlash(false), 2500);
    } catch (err) {
      setSheetError(err instanceof Error ? err.message : 'Failed to add to sheet');
    } finally {
      setSendingToSheet(false);
    }
  };
```

- [ ] **Step 3: Verify compile**

Run: `npx tsc --noEmit` → may still error on the `<WordpressPrintPlanningTab />` render (Task 5) and unused `sentFlash`/`sheetError`/`handleSendToSheet` until Task 5 wires them. That's expected mid-task; proceed to Task 5 before relying on a clean build. (Do not commit yet — commit at the end of Task 5.)

---

## Task 5: App — Send-to-sheet button, ARK(N) badge, controlled ARK render

**Files:** Modify `src/App.tsx`

- [ ] **Step 1: Add the "Send to sheet" button in the WP cut step**

In the cut-step left column, the download card currently is:
```tsx
        <div className="bg-nim-darker rounded-2xl border border-white/10 overflow-hidden">
          <div className="px-5 pt-5 pb-2"><StepLabel n={IS_WORDPRESS ? '03' : '02'} label={IS_WORDPRESS ? t.step03wp : t.step03} /></div>
          <div className="px-5 pb-5">
            {IS_WORDPRESS
              ? <DownloadButton file={file} params={params} widthCm={stickerWidthCm} heightCm={stickerHeightCm} material={material} finish={finish} />
              : <DownloadButton file={file} params={params} widthCm={stickerWidthCm} heightCm={stickerHeightCm} />}
          </div>
        </div>
```
Replace the inner `<div className="px-5 pb-5">…</div>` with:
```tsx
          <div className="px-5 pb-5 flex flex-col gap-3">
            {IS_WORDPRESS
              ? <DownloadButton file={file} params={params} widthCm={stickerWidthCm} heightCm={stickerHeightCm} material={material} finish={finish} />
              : <DownloadButton file={file} params={params} widthCm={stickerWidthCm} heightCm={stickerHeightCm} />}
            {IS_WORDPRESS && (
              <>
                <button
                  onClick={handleSendToSheet}
                  disabled={!file || sendingToSheet}
                  className={`w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg border-2 font-bold text-sm uppercase tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    sentFlash ? 'border-green-500 text-green-400' : 'border-nim-yellow/60 text-nim-yellow hover:bg-nim-yellow/10'
                  }`}
                >
                  {sendingToSheet ? t.edPreparing : sentFlash ? t.sentToSheet : `+ ${t.sendToSheet}`}
                </button>
                {sheetError && (
                  <p className="text-xs text-red-400 bg-red-950/50 border border-red-800 rounded-lg px-3 py-2">{sheetError}</p>
                )}
              </>
            )}
          </div>
```

- [ ] **Step 2: Add the ARK(N) badge in the header**

In the header's right-hand control group (the `<div className="flex items-center gap-2">` block), add as the FIRST child (before the theme toggle):
```tsx
            {IS_WORDPRESS && sheetItems.length > 0 && (
              <button
                onClick={() => setWpMode('sheet')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-nim-yellow/15 border border-nim-yellow/40 text-xs font-bold uppercase tracking-widest text-nim-yellow hover:bg-nim-yellow/25 transition-all"
              >
                {t.arkBadge}
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-nim-yellow text-nim-black text-[10px] font-black">
                  {sheetItems.length}
                </span>
              </button>
            )}
```

- [ ] **Step 3: Pass controlled props to the ARK render**

Find the WP sheet render:
```tsx
        {IS_WORDPRESS && wpMode === 'sheet' && (
          <WordpressPrintPlanningTab />
        )}
```
Replace with:
```tsx
        {IS_WORDPRESS && wpMode === 'sheet' && (
          <WordpressPrintPlanningTab
            items={sheetItems}
            onItemsChange={setSheetItems}
            onGoToDesign={goToDesign}
          />
        )}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: clean; all tests pass; build succeeds. (`sentFlash`, `sheetError`, `handleSendToSheet`, `sheetItems` are now all used.)

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: Send-to-sheet action, ARK(N) badge, controlled ARK wiring"
```

---

## Task 6: E2E — send to sheet → ARK

**Files:** Modify `e2e/design-editor.spec.ts`

This test only runs meaningfully against the **WP-mode** build. It's written defensively so it's skipped in standalone mode (where there's no Send-to-sheet button). The cut step also needs the backend for PDF generation; if the backend isn't up, the send will error — so assert at the UI level (button appears) and guard the deeper assertions.

- [ ] **Step 1: Add the test**

```ts
test('WP: send a design to the sheet and open ARK', async ({ page }) => {
  await page.goto('/');

  // Build a design.
  await page.getByRole('button', { name: /^Text$/i }).first().click();
  await page.getByPlaceholder(/lägg till text|add text/i).fill('SHEET');
  await page.getByRole('button', { name: /lägg till text|add text/i }).click();
  await page.getByRole('button', { name: /fortsätt till skärval|continue to cut setup/i }).click();

  // "Send to sheet" only exists in WordPress mode — skip otherwise.
  const sendBtn = page.getByRole('button', { name: /skicka till ark|send to sheet/i });
  if (await sendBtn.count() === 0) test.skip(true, 'standalone mode — no sheet flow');

  await sendBtn.first().click();

  // ARK badge appears with a count; open it.
  const ark = page.getByRole('button', { name: /^(Ark|Sheet)\s*1$/i });
  await expect(ark).toBeVisible({ timeout: 15000 });
  await ark.click();

  // ARK shows the sticker list with our item + Save Sheet.
  await expect(page.getByRole('button', { name: /spara ark|save sheet/i })).toBeVisible();
});
```

- [ ] **Step 2: Run it (WP mode)**

Run: `npm run dev -- --mode wp --port 5174` in one shell (and the backend on :3001), then in another:
`npx playwright test --grep "send a design to the sheet"`
Expected: PASS (or `skipped` if run against the standalone server). If selectors need tweaking against the real DOM, adjust to keep the assertions meaningful.

- [ ] **Step 3: Commit**

```bash
git add e2e/design-editor.spec.ts
git commit -m "test: E2E for send-to-sheet → ARK (WP mode)"
```

---

## Self-Review (completed during planning)

**Spec coverage:**
- Both cut actions (single die-cut + Send to sheet) → Task 5 (button alongside DownloadButton). ✓
- Send to sheet = kiss-cut PlannedFile into shared collection → Tasks 2, 4. ✓
- Stay + persistent ARK(N) badge → Task 5 (badge; flash; no navigation on send). ✓
- ARK arrange-only + controlled + empty state → Task 3. ✓
- Shared state in App → Task 4. ✓
- WordPress-only (single die-cut path unchanged; standalone untouched) → buttons gated on `IS_WORDPRESS`; ARK already WP component. ✓
- Testing (unit + E2E) → Tasks 2, 6. ✓

**Placeholder scan:** none — every code step is complete.

**Type consistency:** `PlannedFile` (existing type) used in `sheetItem.ts`, `App`, and ARK props; `buildSheetItem(file, params, wCm, hCm, colorIndex)` signature matches its call in Task 4; ARK `Props { items, onItemsChange, onGoToDesign }` matches the render in Task 5; i18n keys (`sendToSheet`, `sentToSheet`, `arkBadge`, `sheetEmpty`, `sheetEmptyHint`) defined in Task 1 and used in Tasks 3/5. Reused `t.edPreparing` and `t.cutGoToDesign` already exist.

**Known simplifications (documented):** the sheet's `image` field on the cart postMessage is a blank PNG (the sheet PDF is the real artifact) — unchanged from current behavior; kiss offset reuses the cut step's offset value (`kissOffset = perfOffset`); ARK(N) counts distinct stickers.
