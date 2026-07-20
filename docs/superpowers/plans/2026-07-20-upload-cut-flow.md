# Upload & Cut Flow + Shape Additions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add a third WordPress start-page flow (upload image → pick cutline + size → add to cart, skipping the editor), add an **Oval** cut shape, and give the **Kvadrat** cut minimal machine-friendly rounded corners.

**Architecture:** Backend (`sticker-contour-backend`): extend `ShapeType`/`clampParams`/`buildGeometricPath` with `oval` + round the `square` corners. Frontend (`scf-editor`): add `oval` to the shape picker; a small `UploadStart` component wrapping the existing (currently-unused) `ImageUpload`; and an `App.tsx` third start card → new `wpMode='upload'` view that hands off to the existing `handleDesignComplete` → the existing cut page (no WP-plugin changes).

**Tech Stack:** React 18 + TS + Vitest (frontend); Node/Express + TS (backend). Cut PDF paths in SVG.

**Spec:** `docs/superpowers/specs/2026-07-20-upload-cut-flow-design.md`

**Repos & branches:**
- Backend: `c:\Users\hulle\sticker-contour-backend`, branch `feat/upload-cut-flow` (Task 1 creates it).
- Frontend: `c:\Users\hulle\scf-editor`, branch `feat/upload-cut-flow` (exists; spec committed there).

**Ordering note:** do the backend first (Task 1) so the deployed API accepts `shapeType=oval` before the frontend ships it.

---

## Task 1: Backend — Oval shape + rounded Square

**Files:**
- Modify: `src/types/contour.ts`, `src/services/pathSmoother.ts`, `src/services/geometricPaths.ts`
- Test: `tests/geometric-paths.test.mjs` (new, standalone)

Work from `c:\Users\hulle\sticker-contour-backend`. First: `git checkout master -q && git checkout -b feat/upload-cut-flow`.

- [ ] **Step 1: Write the failing standalone assertion `tests/geometric-paths.test.mjs`:**

```js
// Standalone assertions for buildGeometricPath. Run: npx tsx tests/geometric-paths.test.mjs
import { buildGeometricPath } from '../src/services/geometricPaths.ts';

let fail = 0;
const check = (label, cond) => { console.log((cond ? 'ok   - ' : 'FAIL - ') + label); if (!cond) fail++; };

// oval: distinct rx/ry ellipse arcs on a non-square image
const oval = buildGeometricPath(400, 200, 'oval', 0, 100, 0, 0);
check('oval emits arc commands', /\bA\b/.test(oval));
check('oval has two distinct radii (rx != ry)', (() => {
  const m = oval.match(/A ([\d.]+) ([\d.]+)/);      // first "A rx ry ..."
  return m && Math.abs(Number(m[1]) - Number(m[2])) > 1;
})());

// square: now rounded (contains arcs), radius small and <= half the shorter side
const sq = buildGeometricPath(300, 300, 'square', 0, 100, 0, 0);
check('square is rounded (arc commands present)', /\bA\b/.test(sq));
check('square radius is minimal (< 15% of side)', (() => {
  const m = sq.match(/A ([\d.]+) /);
  return m && Number(m[1]) > 0 && Number(m[1]) < 300 * 0.15;
})());

// circle + triangle unchanged (still produce a path)
check('circle still works', buildGeometricPath(300, 300, 'circle', 0, 100, 0, 0).includes('A'));
check('triangle still sharp (no arcs)', !/\bA\b/.test(buildGeometricPath(300, 300, 'triangle', 0, 100, 0, 0)));

console.log(fail ? `\n${fail} FAILED` : '\nALL PASSED');
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Run — expect FAIL** (oval returns '' → no arcs; square has no arcs yet)

Run: `cd /c/Users/hulle/sticker-contour-backend && npx tsx tests/geometric-paths.test.mjs`
Expected: the oval and square assertions FAIL.

- [ ] **Step 3: Add `'oval'` to `ShapeType`**

In `src/types/contour.ts`:
```ts
export type ShapeType = 'contour' | 'circle' | 'square' | 'triangle';
```
→
```ts
export type ShapeType = 'contour' | 'circle' | 'square' | 'triangle' | 'oval';
```

- [ ] **Step 4: Accept `'oval'` in `clampParams`**

In `src/services/pathSmoother.ts`, the `shapeType` parse chain (around lines 45–48):
```ts
  const shapeType = raw.shapeType === 'circle' ? 'circle' as const
    : raw.shapeType === 'square'   ? 'square' as const
    : raw.shapeType === 'triangle' ? 'triangle' as const
```
Add an `oval` branch right after `triangle` (before the final `: <default>`):
```ts
  const shapeType = raw.shapeType === 'circle' ? 'circle' as const
    : raw.shapeType === 'square'   ? 'square' as const
    : raw.shapeType === 'triangle' ? 'triangle' as const
    : raw.shapeType === 'oval'     ? 'oval' as const
```
(Leave the existing default fall-through — likely `'contour'` — unchanged.)

- [ ] **Step 5: Add the `oval` case + round the `square` case in `geometricPaths.ts`**

Replace the existing `'square'` case and add an `'oval'` case. The full switch becomes:
```ts
  switch (shape) {
    case 'circle': {
      const cx = ox + sw / 2;
      const cy = oy + sh / 2;
      const r = Math.min(sw, sh) / 2 + o;
      if (r <= 0) return '';
      return `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`;
    }

    case 'oval': {
      const cx = ox + sw / 2;
      const cy = oy + sh / 2;
      const rx = sw / 2 + o;
      const ry = sh / 2 + o;
      if (rx <= 0 || ry <= 0) return '';
      return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx - rx} ${cy} Z`;
    }

    case 'square': {
      const x = ox - o;
      const y = oy - o;
      const w = sw + o * 2;
      const h = sh + o * 2;
      if (w <= 0 || h <= 0) return '';
      // Minimal corner radius so the cutter blade doesn't snag on sharp corners —
      // barely visible (~2% of the shorter side, capped at half the side). Machine
      // benefit only, not a customer-facing design choice.
      const r = Math.min(Math.min(sw, sh) * 0.02, Math.min(w, h) / 2);
      if (r <= 0) {
        return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
      }
      return `M ${x + r} ${y} L ${x + w - r} ${y} A ${r} ${r} 0 0 1 ${x + w} ${y + r} `
        + `L ${x + w} ${y + h - r} A ${r} ${r} 0 0 1 ${x + w - r} ${y + h} `
        + `L ${x + r} ${y + h} A ${r} ${r} 0 0 1 ${x} ${y + h - r} `
        + `L ${x} ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y} Z`;
    }

    case 'triangle': {
      const topX  = ox + sw / 2;
      const topY  = oy - o;
      const botY  = oy + sh + o;
      const leftX  = ox - o * 0.577;
      const rightX = ox + sw + o * 0.577;
      return `M ${topX} ${topY} L ${rightX} ${botY} L ${leftX} ${botY} Z`;
    }

    default:
      return '';
  }
```

- [ ] **Step 6: Run the assertion — expect PASS**

Run: `npx tsx tests/geometric-paths.test.mjs`
Expected: all `ok`, `ALL PASSED`.

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 8: Commit, push, PR**
```bash
git add src/types/contour.ts src/services/pathSmoother.ts src/services/geometricPaths.ts tests/geometric-paths.test.mjs
git commit -m "feat(shapes): add oval + minimal rounded-corner square cut paths"
git push -u origin feat/upload-cut-flow
gh pr create --base master --head feat/upload-cut-flow \
  --title "feat(shapes): oval + machine-rounded square cut paths" \
  --body "Adds 'oval' (ellipse) to the geometric cut shapes and gives 'square' a minimal barely-visible corner radius so the cutter blade doesn't snag. ShapeType + clampParams + buildGeometricPath, with a standalone path assertion. Pairs with the frontend upload-&-cut PR."
```
- [ ] **Step 9: Report the PR URL.**

---

## Task 2: Frontend — Oval in the shape picker

**Files:**
- Modify: `src/types/contour.ts`, `src/components/ShapeSelector.tsx`

Work from `c:\Users\hulle\scf-editor`, branch `feat/upload-cut-flow` (already checked out).

- [ ] **Step 1: Add `'oval'` to the frontend `ShapeType`**

In `src/types/contour.ts`:
```ts
export type ShapeType = 'contour' | 'circle' | 'square' | 'triangle';
```
→
```ts
export type ShapeType = 'contour' | 'circle' | 'square' | 'triangle' | 'oval';
```

- [ ] **Step 2: Add the Oval option to `ShapeSelector`**

In `src/components/ShapeSelector.tsx`, the `SHAPES` array — insert an Oval entry right after the `circle` entry (so order reads Kontur, Cirkel, Oval, Kvadrat, Triangel):
```tsx
  {
    value: 'oval',
    labelEn: 'Oval',
    labelSv: 'Oval',
    icon: (
      <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2">
        <ellipse cx="20" cy="20" rx="15" ry="10" />
      </svg>
    ),
  },
```
Then change the picker grid from 4 to 5 columns — find `<div className="grid grid-cols-4 gap-2">` and change to `<div className="grid grid-cols-5 gap-2">`.

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: tsc clean; build succeeds. (No test change here — ShapeSelector is presentational; the flow is verified in Task 5.)

- [ ] **Step 4: Commit**
```bash
git add src/types/contour.ts src/components/ShapeSelector.tsx
git commit -m "feat(printplan): add Oval cutline shape to the picker"
```

---

## Task 3: Frontend — `UploadStart` component

**Files:**
- Create: `src/components/UploadStart.tsx`

`ImageUpload` (`src/components/ImageUpload.tsx`) already collects a file + W×H cm and reports via `onImageSelected(file, dataUrl)` and `onSizeChange(widthCm, heightCm)`. `UploadStart` wraps it with a Continue button that fires once a valid file + size exist.

- [ ] **Step 1: Create `src/components/UploadStart.tsx`:**

```tsx
import { useState } from 'react';
import { ImageUpload } from './ImageUpload.tsx';
import { useLang } from '../lib/LangContext.ts';

interface Props {
  /** Called when a valid image + size are set — same signature as the editor's onComplete. */
  onReady: (file: File, dataUrl: string, widthCm: number, heightCm: number) => void;
}

/** Upload-only entry: pick an image + size, then continue to the cut page. */
export function UploadStart({ onReady }: Props) {
  const { t } = useLang();
  const [file, setFile] = useState<File | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [widthCm, setWidthCm] = useState<number | null>(null);
  const [heightCm, setHeightCm] = useState<number | null>(null);

  const ready = !!file && !!dataUrl && !!widthCm && !!heightCm;

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-5">
      <ImageUpload
        onImageSelected={(f, d) => { setFile(f); setDataUrl(d); }}
        onSizeChange={(w, h) => { setWidthCm(w); setHeightCm(h); }}
      />
      <button
        onClick={() => { if (ready) onReady(file!, dataUrl!, widthCm!, heightCm!); }}
        disabled={!ready}
        className="nim-btn-yellow w-full disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {`${t.edContinue} →`}
      </button>
    </div>
  );
}
```
(`t.edContinue` = "Fortsätt till skärval" / "Continue to cut setup" — already exists. `nim-btn-yellow` is the existing button class used by the editor's Continue.)

- [ ] **Step 2: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: clean + succeeds.

- [ ] **Step 3: Commit**
```bash
git add src/components/UploadStart.tsx
git commit -m "feat: UploadStart — image upload + size entry for the upload flow"
```

---

## Task 4: Frontend — third start card + `upload` view + i18n

**Files:**
- Modify: `src/App.tsx`, `src/lib/i18n.ts`

- [ ] **Step 1: Add i18n strings** (in `src/lib/i18n.ts`, both `en` and `sv`, near the other `mode*` keys)

`en`:
```ts
    modeUpload: 'Upload & Cut',
    modeUploadDesc: 'Upload your own image, pick a cutline and size, and add it to the cart.',
```
`sv`:
```ts
    modeUpload: 'Ladda upp & skär',
    modeUploadDesc: 'Ladda upp din egen bild, välj skärlinje och storlek och lägg i varukorgen.',
```

- [ ] **Step 2: Imports + widen the `flow` union in `App.tsx`**

Add near the other component imports:
```ts
import { UploadStart } from './components/UploadStart.tsx';
import { ShapeSelector } from './components/ShapeSelector.tsx';
```
Find the `flow` state (added by the earlier single/sheet split):
```ts
  const [flow, setFlow] = useState<'single' | 'sheet'>('single');
```
Widen it to include the upload intent:
```ts
  const [flow, setFlow] = useState<'single' | 'sheet' | 'upload'>('single');
```
(Sheet UI is gated on `flow === 'sheet'`, so `'upload'` hides it exactly like `'single'`. The distinct value is what lets the cut page show the shape picker for this flow only.)

Also widen the `WpMode` type (top of `App.tsx`) so the new view typechecks:
```ts
type WpMode = null | 'single' | 'sheet' | 'design';
```
→
```ts
type WpMode = null | 'single' | 'sheet' | 'design' | 'upload';
```

- [ ] **Step 3: Add the third start card**

In the WP start-page block (`IS_WORDPRESS && wpMode === null`), the cards live in a grid `className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-2xl"`. Change `sm:grid-cols-2` → `sm:grid-cols-3` and `max-w-2xl` → `max-w-4xl`. Then add a THIRD card button after the Klistermärkesark (sheet) card's closing `</button>`:
```tsx
              {/* Upload & cut */}
              <button
                onClick={() => { setFlow('upload'); setWpMode('upload'); }}
                className="group flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-white/10 bg-nim-darker hover:border-nim-yellow hover:bg-nim-yellow/5 transition-all text-left"
              >
                <div className="w-16 h-16 rounded-xl bg-nim-yellow/10 border border-nim-yellow/20 flex items-center justify-center group-hover:bg-nim-yellow/20 transition-colors">
                  <svg className="w-8 h-8 text-nim-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <div className="w-full">
                  <p className="text-base font-black text-white uppercase tracking-wider group-hover:text-nim-yellow transition-colors">{t.modeUpload}</p>
                  <p className="text-xs text-white/40 mt-1 leading-relaxed">{t.modeUploadDesc}</p>
                </div>
                <div className="w-full flex justify-end">
                  <svg className="w-5 h-5 text-white/20 group-hover:text-nim-yellow transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
```

- [ ] **Step 4: Render the upload view**

Find the mode-select landing block `{IS_WORDPRESS && wpMode === null && ( … )}`. Immediately AFTER its closing `)}`, add the upload view:
```tsx
        {/* ── WordPress: upload-only entry (upload → cut, no editor) ── */}
        {IS_WORDPRESS && wpMode === 'upload' && (
          <div className="p-4 sm:p-6">
            <UploadStart onReady={handleDesignComplete} />
          </div>
        )}
```
(`handleDesignComplete(file, dataUrl, widthCm, heightCm)` already sets `file`/`imageDataUrl`/`stickerWidthCm/Height` and, in WP, `setWpMode('single')` → the cut view. `flow` stays `'single'` from the card, so no sheet UI appears.)

- [ ] **Step 5: Render the shape picker on the cut page for the upload flow**

The cut params card renders only `<ParameterPanel params={params} onChange={setParams} hideCutMode />` inside a `<div className="px-5 pb-5">`. Add `ShapeSelector` above it, shown only for the upload flow, wired to `params`:
```tsx
            <div className="px-5 pb-5">
              {flow === 'upload' && (
                <div className="mb-4">
                  <ShapeSelector
                    value={params.shapeType}
                    onChange={(s) => setParams(p => ({ ...p, shapeType: s }))}
                    shapeSize={params.shapeSize}
                    onSizeChange={(size) => setParams(p => ({ ...p, shapeSize: size }))}
                    shapeOffsetX={params.shapeOffsetX}
                    shapeOffsetY={params.shapeOffsetY}
                    onOffsetChange={(x, y) => setParams(p => ({ ...p, shapeOffsetX: x, shapeOffsetY: y }))}
                  />
                </div>
              )}
              {/* Cut mode hidden for now — perf-cut only (DEFAULT_PARAMS.cutMode='perf'). */}
              <ParameterPanel params={params} onChange={setParams} hideCutMode />
            </div>
```
(Contour → the ParameterPanel offset is the cutline offset; a geometric shape → ShapeSelector's size slider. `ShapeSelector` internally hides the size control when the shape is `contour`.)

- [ ] **Step 6: Typecheck, test, build**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: tsc clean (the `flow` and `WpMode` unions widened in Step 2 cover the new values); tests pass; build succeeds.

- [ ] **Step 7: Commit, push, PR**
```bash
git add src/App.tsx src/lib/i18n.ts
git commit -m "feat(wp): third start card 'Ladda upp & skär' → upload → cut flow"
git push -u origin feat/upload-cut-flow
gh pr create --base master --head feat/upload-cut-flow \
  --title "feat(wp): Upload & Cut flow + Oval shape" \
  --body "Third WP start card: upload an image → pick cutline (contour offset / shape size incl. new Oval) + size → add to cart, skipping the editor. Reuses ImageUpload + the existing cut page; flow='single' hides sheet UI. Kvadrat now cuts with a minimal machine-friendly corner radius (backend PR). Spec/plan in docs/superpowers. No WordPress-plugin changes."
```
- [ ] **Step 8: Report the PR URL.**

---

## Task 5: Verification & merge

- [ ] **Step 1:** Confirm both PRs are green (backend tsc + assertion; frontend tsc/tests/build).
- [ ] **Step 2 (merge order):** merge the **backend** PR first (so the API accepts `shapeType=oval`), then the frontend PR.
- [ ] **Step 3 (manual, WP mode, after deploy):** On the WP start page, pick **Ladda upp & skär** → upload an image, set a size → confirm it lands on the cut page with **no sheet UI**; try **Kontur** (offset slider changes the cut), **Cirkel / Oval / Kvadrat / Triangel** (size slider); confirm the preview + **add to cart** works and the order gets the PDF. Verify the **Kvadrat** cut has barely-visible rounded corners and **Triangel** stays sharp.

---

## Notes for the implementer

- **DRY:** `UploadStart` reuses `ImageUpload` and hands off through the existing `handleDesignComplete` — no duplicated upload/size/cut logic.
- **YAGNI:** only Oval is added; square rounding is a fixed 2% (no control); triangle unchanged; no editor/sheet/CPO/plugin changes.
- **Cross-repo:** the frontend sends `shapeType=oval`; the backend must accept it (Task 1) — hence backend merges first.
- **Keep the shape order** Kontur · Cirkel · Oval · Kvadrat · Triangel in the picker (grid-cols-5).
