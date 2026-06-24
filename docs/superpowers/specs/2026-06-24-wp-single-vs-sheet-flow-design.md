# WP Single-vs-Sheet Flow Split — Design Spec

**Date:** 2026-06-24
**Status:** Approved (pending plan)
**Scope:** Frontend only (`scf-editor`), WordPress mode (`VITE_MODE=wordpress`). No backend or plugin changes.

## Goal

On the WordPress start page ("VAD VILL DU SKAPA?"), let the customer choose **Single sticker** or **Sheet (Kiss Cut Ark)**. Both open the same design editor; the **single-sticker** flow hides all sheet/ARK functionality, while the **sheet** flow keeps today's full sheet behavior.

## Current behavior (for reference)

In `src/App.tsx`, WP mode uses a `wpMode` view-router: `null` (start page) / `'design'` (editor) / `'single'` (cut step) / `'sheet'` (ARK arrange view). The start page has two cards:
- "Designa själv" (`modeDesign`) → `setWpMode('design')` (editor). From the cut step the **Send to sheet** button shows, and the **ARK(N)** header badge appears once items exist.
- "Kiss Cut Ark" (`modeSheet`) → `setWpMode('sheet')` (jumps straight to the empty arrange view).

So today the single-design path exposes the sheet features, and the sheet card skips the editor.

## Design

### State
Add an intent flag, separate from the `wpMode` view-router:
```ts
const [flow, setFlow] = useState<'single' | 'sheet'>('single');
```
`flow` is chosen on the start page and determines whether any sheet/ARK UI is shown. `wpMode` continues to route views.

### Start page (both cards → editor)
- **Single sticker card:** `setFlow('single'); setWpMode('design');` — labels from i18n `modeSingle` / `modeSingleDesc`.
- **Sheet card:** `setFlow('sheet'); setWpMode('design');` — labels from i18n `modeSheet` / `modeSheetDesc`.

Both land in the design editor (`wpMode === 'design'`). The difference is purely which affordances render.

### Gating (`flow === 'single'` hides all sheet UI)
1. **Send to sheet** button on the cut step — render only when `flow === 'sheet'`.
2. **ARK(N) header badge** — render only when `flow === 'sheet'` (and `sheetItems.length > 0`, as today).
3. **Post-cut "add another / go to sheet" prompt** modal — only when `flow === 'sheet'`.
4. **Sheet arrange view** (`wpMode === 'sheet'`) — only reachable in `flow === 'sheet'`.

Single flow path: editor → cut → **add to cart** (the existing single-sticker save/download action), nothing else.

Sheet flow path (unchanged): editor → cut → Send to sheet → ARK arrange → save sheet.

### View-name note
The cut step is the `wpMode === 'single'` *view*, which collides verbally with the new `flow === 'single'` *intent*. The view name is left unchanged (renaming to `'cut'` would churn the whole file); a code comment clarifies that `wpMode === 'single'` means "the cut view" and is independent of `flow`.

### Back navigation
The existing back-arrow to the start page (`setWpMode(null)`) lets the user re-pick a flow. `flow` persists until a card is chosen again.

## Edge cases / error handling

- **Items built then flow switched to single:** the ARK badge and arrange view hide (sheet items are kept in state, just not shown). Switching back to sheet restores them — no data loss. Acceptable; not worth clearing.
- **Non-WordPress build:** unaffected — `flow` only gates WP-mode UI; the non-WP tabbed layout is untouched.

## Files

- Modify: `src/App.tsx` — add `flow` state; wire both start cards; gate the four sheet UI elements on `flow === 'sheet'`.
- Possibly: `src/lib/i18n.ts` — only if the single card needs a label not already present (`modeSingle` / `modeSingleDesc` already exist; expected no change).

## Testing

`App.tsx` is the top-level integration shell and is not unit-tested in this project. Verification:
- `tsc --noEmit` + `npm run build` green; existing test suite still passes.
- **Manual (WP mode):** pick **Single sticker** → confirm NO sheet UI anywhere (no Send-to-sheet button, no ARK badge, no post-cut sheet prompt, arrange view unreachable) and that add-to-cart works. Pick **Sheet** → confirm the full sheet flow (send to sheet, ARK badge, arrange, save) still works.

## Non-Goals (YAGNI)

- No change to the design editor internals, the cut/contour logic, the add-to-cart/CPO behavior, or the sheet arrange view itself.
- No renaming of the `wpMode` view values.
- No change to the non-WordPress (standalone) layout.
