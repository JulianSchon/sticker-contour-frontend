# Kiss-Cut Sheet Builder — Design Spec

**Date:** 2026-06-18
**Project:** sticker-contour-frontend (CUTZ / Nimstick) — WordPress mode
**Status:** Approved design — ready for implementation planning

## Summary

In the WordPress build, let a user build up a **kiss-cut sheet** from designs made in the editor. After designing and going to the cut step, they can **Send to sheet** (which produces a kiss-cut / CutContour version), design another, send it too, and so on. A persistent **ARK (N)** badge shows the running count; opening **ARK** shows the collected stickers on an A4/A5 sheet where they arrange them, set per-sticker quantities, pick material/finish, and **Save Sheet** to the WooCommerce cart.

This is largely an **integration**: the existing `WordpressPrintPlanningTab` (ARK) already packs stickers, supports drag-arrange + per-sticker quantity + kiss-cut PDFs + Save-to-cart. The work is to feed it from the design editor and lift its collection into shared state.

## Scope

- **WordPress mode only** (`VITE_MODE=wordpress`). The standalone Print-planning tab is unchanged.
- In scope: the "Send to sheet" bridge, the shared sheet collection, the ARK (N) badge/navigation, and refactoring ARK to be arrange-only + controlled.
- Out of scope: changes to the standalone flow; the single die-cut → cart path stays as-is (it remains one of the two cut actions).

## Decisions (locked during brainstorming)

| Topic | Decision |
|-------|----------|
| Cut-step actions | **Both**: "Add single sticker" (die-cut/perf → cart, current) **and** "Send to sheet" (kiss-cut → collection) |
| After "Send to sheet" | Stay in the editor (brief "Added ✓"); a persistent **ARK (N)** badge gives access to the sheet |
| ARK view | **Arrange-only**: layout + drag-arrange + per-sticker quantity + material/finish + Save Sheet → cart. Its own upload/shape/cut configurator is removed |
| Sheet cut type | Kiss-cut (CutContour); single stays perf/die-cut |
| Collection state | Session state lifted to `App` (no persistence) |

## Flow

```
Design editor ──Continue──▶ Cut step ──┬── Add single sticker ──▶ (perf PDF) ──▶ cart
                                       └── Send to sheet ──▶ (kiss PDF) ──▶ sheet collection [N]
                                                                              │  (stay; design another)
Header: ARK (N) badge ──────────────────────────────────────────────────────┘
                          │
                          ▼
                        ARK view (arrange-only): pack on A4/A5 · drag-arrange · per-sticker qty
                          · material/finish · Save Sheet ──▶ cart (kiss-cut sheet PDF)
```

## Architecture

### Shared collection
- A `sheetItems: PlannedFile[]` state lives in `App` (WP mode) alongside the existing `file`/`params`/size state.
- `PlannedFile` is the existing type (`types/printPlanning.ts`): `{ id, file (PDF), name, widthMm, heightMm, quantity, color, previewUrl }`.

### Send to sheet (the bridge)
- New action in the WP cut step. Handler in `App` (`handleSendToSheet`) because `App` owns `file`, `params`, size, and the collection.
- Steps: build kiss params `{ ...params, cutMode: 'kiss', kissOffset: params.perfOffset }` → `generatePdfBlob(file, kissParams)` → wrap as a `.pdf` `File` → `renderPdfFirstPage()` for the thumbnail → push a `PlannedFile` (`widthMm = size.wCm*10`, `heightMm = size.hCm*10`, `quantity: 1`, a cycling color) into `sheetItems`.
- UI: a "Send to sheet" button in the cut step's action area (next to the existing single "Save Design" / `DownloadButton`), with a brief success state. Shown only in WP mode.

### ARK (N) badge + navigation
- WP header shows an **ARK (N)** button when `sheetItems.length > 0`; clicking sets `wpMode = 'sheet'` (the ARK view). Count = total stickers (or total copies; use item count).
- ARK reachable from the editor and cut step via this badge.

### ARK view (controlled, arrange-only)
- `WordpressPrintPlanningTab` is refactored to **controlled props**: `items: PlannedFile[]`, `onItemsChange(items)`, `onGoToDesign()`. It no longer owns the collection or the left configurator (upload/shape/cut/preview/add are removed).
- Keeps: page size (A4/A5), `packItems` auto-layout + re-pack on change, `LayoutCanvas` drag-arrange (`onCopiesChange`), per-sticker **quantity** steppers + remove, **material/finish**, and **Save Sheet** (`exportPrintLayoutBlob` → `postMessage` `nimstick_save_design`, cutMode `kiss`).
- **Empty state:** if `items` is empty, show "No stickers on the sheet yet" + a button calling `onGoToDesign()` (→ `wpMode='design'`).

### Files
**Modified:**
- `src/App.tsx` — `sheetItems` state + `handleSendToSheet` + ARK(N) header badge; pass `items`/`onItemsChange`/`onGoToDesign` to `WordpressPrintPlanningTab`; render the "Send to sheet" button in the WP cut step.
- `src/components/PrintPlanning/WordpressPrintPlanningTab.tsx` — make controlled; remove the left configurator (upload/shape/cut/preview/add + their state); add empty state. (File shrinks substantially.)
- `src/lib/i18n.ts` — strings: `sendToSheet`, `addedToSheet`, `arkBadge`, `sheetEmpty`, `goDesign` (en + sv).

**New (optional helper):**
- `src/lib/sheetItem.ts` — `buildSheetItem(file, params, wCm, hCm, colorIndex): Promise<PlannedFile>` (the kiss-PDF + thumbnail + PlannedFile build), so `App` stays lean and the logic is unit-testable.

## Error handling
- `Send to sheet` disabled while a design isn't ready (`file` null) or while generating; on `generatePdfBlob` failure show an inline error and don't append.
- ARK Save Sheet keeps the existing error/success handling.
- Size missing: the editor always provides a cm size from the artboard, so size is always present (unlike the old uploader path).

## Testing
- **Unit:** `buildSheetItem` — given a fake `generatePdfBlob`/`renderPdfFirstPage`, returns a `PlannedFile` with correct mm dims, quantity 1, kiss cutMode params. (Pure-ish; mock the api + pdfPreview modules.)
- **E2E (Playwright, WP mode harness):** design → cut → **Send to sheet** → ARK (N) badge shows 1 → open ARK → sticker present in the layout + quantity stepper; (optionally) Save Sheet posts `nimstick_save_design`.
- **Manual (WP harness):** full loop — send two designs, arrange, set quantities, Save Sheet → confirm the captured kiss-cut sheet PDF in the simulator panel.

## Reused code
`packItems` (`lib/packer.ts`), `LayoutCanvas`, `generatePdfBlob` + `exportPrintLayoutBlob` (`lib/api.ts`), `renderPdfFirstPage` (`lib/pdfPreview.ts`), `MaterialFinishPicker`, `PlannedFile`/`PackedCopy`/`ExportCopy` types.
