# Graphtec CE8000 Registration Marks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add a "Graphtec CE8000" registration-mark option to the non-WP print-planning sheet export — four Type 1 corner L-marks the CE8000's ARMS reads to contour-cut a Roland-printed sheet.

**Architecture:** Mirrors the existing OPOS/Roland mark systems exactly. Frontend (`scf-editor`): a `graphtecMarks.ts` constants+geometry module, a `GraphtecLayer` preview in `LayoutCanvas`, a UI button, and a `'graphtec'` `RegmarkType`. Backend (`sticker-contour-backend`): inline constants (mirroring the frontend, as OPOS/Roland already do), a `drawGraphtecMarks()` built as a loop over a list of mark rows (so segment marks can be added later), plus the margin mapping and export dispatch.

**Tech Stack:** React 18 + TS + Vitest (frontend); Node/Express + TS + pdf-lib (backend). mm→pt via `MM_TO_PT = 72/25.4`.

**Spec:** `docs/superpowers/specs/2026-06-24-graphtec-ce8000-regmarks-design.md`

**Repos & branches:**
- Frontend: `c:\Users\hulle\scf-editor`, branch `feat/graphtec-regmarks` (exists).
- Backend: `c:\Users\hulle\sticker-contour-backend`, branch `feat/graphtec-regmarks` (Task 4 creates it).

**Coordinate convention (frontend helper + preview):** content-origin mm, **y increases downward** — `y=0` content top, `y=totalLengthMm` content bottom, negative `y` is inside the top margin band, `y>totalLengthMm` is inside the bottom band. (This matches `getRolandCorners` / `RolandLayer`.) The backend uses pdf-lib's **y-up** system and computes its own coords inline (as `drawRolandMarks` does).

**Testing note:** the pure geometry helper is unit-tested (Vitest). The PDF drawing + SVG preview are verified by a sample export + visual check; a real **CE8000 ARMS test cut** is final acceptance (operator-only).

---

## Task 1: Frontend — Graphtec mark geometry module (TDD)

**Files:**
- Create: `src/lib/graphtecMarks.ts`
- Test: `src/lib/graphtecMarks.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/graphtecMarks.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  GRAPHTEC_MARGIN_MM, GRAPHTEC_INSET_X_MM, GRAPHTEC_INSET_Y_MM,
  GRAPHTEC_MARK_LEN_MM, GRAPHTEC_MARK_W_MM, getGraphtecCorners,
} from './graphtecMarks.ts';

describe('graphtec mark constants', () => {
  it('mark length is within Graphtec ARMS range (4–20 mm)', () => {
    expect(GRAPHTEC_MARK_LEN_MM).toBeGreaterThanOrEqual(4);
    expect(GRAPHTEC_MARK_LEN_MM).toBeLessThanOrEqual(20);
  });
  it('line thickness is within range (0.3–1.0 mm)', () => {
    expect(GRAPHTEC_MARK_W_MM).toBeGreaterThanOrEqual(0.3);
    expect(GRAPHTEC_MARK_W_MM).toBeLessThanOrEqual(1.0);
  });
  it('margin band leaves room for a mark plus clearance', () => {
    expect(GRAPHTEC_MARGIN_MM).toBeGreaterThanOrEqual(GRAPHTEC_INSET_Y_MM + GRAPHTEC_MARK_LEN_MM / 2);
  });
});

describe('getGraphtecCorners', () => {
  const W = 500, H = 700;
  const marks = getGraphtecCorners(W, H);

  it('returns four marks', () => {
    expect(marks).toHaveLength(4);
  });
  it('places corners inset from the foil left/right edges', () => {
    const xs = marks.map(m => m.x).sort((a, b) => a - b);
    expect(xs[0]).toBeCloseTo(GRAPHTEC_INSET_X_MM, 5);
    expect(xs[3]).toBeCloseTo(W - GRAPHTEC_INSET_X_MM, 5);
  });
  it('top corners sit inside the top band (negative y), bottom inside the bottom band', () => {
    const top = marks.filter(m => m.y < 0);
    const bot = marks.filter(m => m.y > H);
    expect(top).toHaveLength(2);
    expect(bot).toHaveLength(2);
    top.forEach(m => expect(m.y).toBeCloseTo(-GRAPHTEC_MARGIN_MM + GRAPHTEC_INSET_Y_MM, 5));
    bot.forEach(m => expect(m.y).toBeCloseTo(H + GRAPHTEC_MARGIN_MM - GRAPHTEC_INSET_Y_MM, 5));
  });
  it('arms always point toward the content (inward)', () => {
    for (const m of marks) {
      // left corners point right (dirX +1), right corners point left (-1)
      expect(m.dirX).toBe(m.x < W / 2 ? 1 : -1);
      // top corners point down toward content (+1), bottom corners point up (-1)
      expect(m.dirY).toBe(m.y < 0 ? 1 : -1);
    }
  });
});
```

- [ ] **Step 2: Run it — expect FAIL** (module missing)

Run: `cd /c/Users/hulle/scf-editor && npx vitest run src/lib/graphtecMarks.test.ts`
Expected: FAIL — cannot resolve `./graphtecMarks.ts`.

- [ ] **Step 3: Create `src/lib/graphtecMarks.ts`**

```ts
/**
 * Graphtec CE8000 ARMS registration mark constants and geometry.
 *
 * Type 1 marks: four L-shaped (right-angle) marks at the sheet corners, OUTSIDE
 * the cut area. The CE8000's ARMS sensor reads them to register a Roland-printed
 * sheet for contour cutting. The operator sets the cutter's ARMS to Mark Type 1
 * with matching size/thickness.
 *
 * Spec (Graphtec CE-series manuals): mark size 4–20 mm, line thickness 0.3–1.0 mm.
 * Defaults are at the robust end and are tunable against the first real test cut.
 *
 * Coordinate convention (shared with the preview): content-origin mm, y DOWN.
 * y=0 content top, y=totalLengthMm content bottom; negative y = top margin band,
 * y>totalLengthMm = bottom margin band.
 */

export const GRAPHTEC_MARK_LEN_MM = 20;   // L arm length (max of 4–20 for reliable sensing)
export const GRAPHTEC_MARK_W_MM   = 1.0;  // line thickness (max of 0.3–1.0)
export const GRAPHTEC_MARGIN_MM   = 25;   // band added at TOP and BOTTOM for marks + quiet zone
export const GRAPHTEC_INSET_X_MM  = 10;   // L corner inset from foil left/right edge
export const GRAPHTEC_INSET_Y_MM  = 7;    // L corner inset from the outer edge of the band

export interface GraphtecMark {
  /** L corner = registration point (content-origin mm). */
  x: number;
  y: number;
  /** Horizontal arm direction toward content: +1 = right, -1 = left. */
  dirX: 1 | -1;
  /** Vertical arm direction toward content: +1 = down, -1 = up. */
  dirY: 1 | -1;
}

/** Four Type 1 corner marks (TL, TR, BL, BR), arms pointing inward toward the content. */
export function getGraphtecCorners(foilWidthMm: number, totalLengthMm: number): GraphtecMark[] {
  const topY  = -GRAPHTEC_MARGIN_MM + GRAPHTEC_INSET_Y_MM;                 // inside top band (<0)
  const botY  = totalLengthMm + GRAPHTEC_MARGIN_MM - GRAPHTEC_INSET_Y_MM;  // inside bottom band
  const leftX  = GRAPHTEC_INSET_X_MM;
  const rightX = foilWidthMm - GRAPHTEC_INSET_X_MM;
  return [
    { x: leftX,  y: topY, dirX: 1,  dirY: 1  },  // TL
    { x: rightX, y: topY, dirX: -1, dirY: 1  },  // TR
    { x: leftX,  y: botY, dirX: 1,  dirY: -1 },  // BL
    { x: rightX, y: botY, dirX: -1, dirY: -1 },  // BR
  ];
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run src/lib/graphtecMarks.test.ts`
Expected: PASS (all assertions).

- [ ] **Step 5: Commit**

```bash
git add src/lib/graphtecMarks.ts src/lib/graphtecMarks.test.ts
git commit -m "feat(printplan): Graphtec CE8000 mark geometry + tests"
```

---

## Task 2: Frontend — type, preview layer, UI button

**Files:**
- Modify: `src/types/printPlanning.ts`, `src/components/PrintPlanning/LayoutCanvas.tsx`, `src/components/PrintPlanning/PrintPlanningTab.tsx`

- [ ] **Step 1: Add `'graphtec'` to the type**

In `src/types/printPlanning.ts`, change:
```ts
export type RegmarkType = 'opos' | 'roland' | 'none';
```
to:
```ts
export type RegmarkType = 'opos' | 'roland' | 'graphtec' | 'none';
```

- [ ] **Step 2: Add the `GraphtecLayer` preview + wire it into `LayoutCanvas`**

In `src/components/PrintPlanning/LayoutCanvas.tsx`:

(a) Add to the imports from the mark libs (near the existing `getRolandCorners` import):
```ts
import {
  GRAPHTEC_MARGIN_MM,
  GRAPHTEC_MARK_LEN_MM,
  GRAPHTEC_MARK_W_MM,
  getGraphtecCorners,
} from '../../lib/graphtecMarks.ts';
```

(b) Add the layer component (place it right after the `RolandLayer` function):
```tsx
function GraphtecLayer({
  foilWidthMm, totalH, strokeW,
}: { foilWidthMm: number; totalH: number; zoom: number; strokeW: number }) {
  const marks = foilWidthMm > 0 ? getGraphtecCorners(foilWidthMm, totalH) : [];
  const len = GRAPHTEC_MARK_LEN_MM;
  const w   = GRAPHTEC_MARK_W_MM;
  return (
    <g>
      {/* reserved margin bands (visual quiet zone) */}
      <rect x={0} y={-GRAPHTEC_MARGIN_MM} width={foilWidthMm} height={GRAPHTEC_MARGIN_MM}
        fill="rgba(34,197,94,0.06)" stroke="rgba(34,197,94,0.4)" strokeWidth={strokeW} />
      <rect x={0} y={totalH} width={foilWidthMm} height={GRAPHTEC_MARGIN_MM}
        fill="rgba(34,197,94,0.06)" stroke="rgba(34,197,94,0.4)" strokeWidth={strokeW} />
      {/* four Type 1 L-marks (y DOWN convention; dirY +1 = down) */}
      {marks.map((m, i) => (
        <g key={i} fill="#000">
          {/* vertical arm */}
          <rect
            x={m.dirX > 0 ? m.x : m.x - w}
            y={m.dirY > 0 ? m.y : m.y - len}
            width={w} height={len}
          />
          {/* horizontal arm */}
          <rect
            x={m.dirX > 0 ? m.x : m.x - len}
            y={m.dirY > 0 ? m.y : m.y - w}
            width={len} height={w}
          />
        </g>
      ))}
    </g>
  );
}
```

(c) Extend the `marginMm` computation (the line currently `const marginMm = regmarkType === 'roland' ? ROLAND_MARGIN_MM : regmarkType === 'none' ? 0 : OPOS_MARGIN_MM;`) to:
```ts
  const marginMm = regmarkType === 'roland' ? ROLAND_MARGIN_MM
    : regmarkType === 'graphtec' ? GRAPHTEC_MARGIN_MM
    : regmarkType === 'none' ? 0
    : OPOS_MARGIN_MM;
```

(d) Add the layer to the render dispatch (after the `regmarkType === 'roland'` block):
```tsx
          {regmarkType === 'graphtec' && (
            <GraphtecLayer foilWidthMm={foilWidthMm} totalH={totalH} zoom={zoom} strokeW={strokeW} />
          )}
```

- [ ] **Step 3: Add the UI button**

In `src/components/PrintPlanning/PrintPlanningTab.tsx`:

(a) Change the button grid from 2 to 3 columns — find `<div className="grid grid-cols-2 gap-2">` (the regmark switcher) and change it to `<div className="grid grid-cols-3 gap-2">`.

(b) Add a third entry to the button array, after the `'roland'` object (before the closing `]`):
```tsx
                {
                  id: 'graphtec' as RegmarkType,
                  label: 'Graphtec',
                  sub: 'CE8000 ARMS',
                  icon: (
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M3 9V3h6" />
                      <path d="M21 9V3h-6" />
                      <path d="M3 15v6h6" />
                      <path d="M21 15v6h-6" />
                    </svg>
                  ),
                },
```

- [ ] **Step 4: Typecheck, test, build**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: tsc clean; all tests pass (incl. Task 1's); build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/types/printPlanning.ts src/components/PrintPlanning/LayoutCanvas.tsx src/components/PrintPlanning/PrintPlanningTab.tsx
git commit -m "feat(printplan): Graphtec CE8000 preview layer + option button"
```

---

## Task 3: Frontend — push & PR

- [ ] **Step 1:** `npx tsc --noEmit && npx vitest run && npm run build` → all green.
- [ ] **Step 2:** Push + PR:
```bash
git push -u origin feat/graphtec-regmarks
gh pr create --base master --head feat/graphtec-regmarks \
  --title "feat(printplan): Graphtec CE8000 registration marks (frontend)" \
  --body "Adds a 'Graphtec CE8000' regmark option (type + preview layer + button). Pairs with the backend PR that draws the marks in the export PDF. Spec: docs/superpowers/specs/2026-06-24-graphtec-ce8000-regmarks-design.md"
```
- [ ] **Step 3:** Report the PR URL.

---

## Task 4: Backend — draw Graphtec marks in the export PDF

**Files:**
- Modify: `c:\Users\hulle\sticker-contour-backend\src\routes\printPlanning.ts`

Work from the backend repo. First: `cd /c/Users/hulle/sticker-contour-backend && git checkout master -q && git checkout -b feat/graphtec-regmarks`.

- [ ] **Step 1: Add Graphtec constants** (after the Roland constants block, ~line 52):
```ts
// ---------------------------------------------------------------------------
// Graphtec CE8000 constants (must match frontend/src/lib/graphtecMarks.ts)
// ---------------------------------------------------------------------------
const GRAPHTEC_MARK_LEN_MM = 20;   // L arm length
const GRAPHTEC_MARK_W_MM   = 1.0;  // line thickness
const GRAPHTEC_MARGIN_MM   = 25;   // top + bottom band
const GRAPHTEC_INSET_X_MM  = 10;   // L corner inset from foil side edges
const GRAPHTEC_INSET_Y_MM  = 7;    // L corner inset from outer edge of the band
```

- [ ] **Step 2: Extend the layout type + margin mapping**

Change the `ExportLayout` union:
```ts
  regmarkType?: 'opos' | 'roland' | 'graphtec' | 'none';
```
Change the `marginMm` computation in the export route:
```ts
      const marginMm = regmarkType === 'roland' ? ROLAND_MARGIN_MM
        : regmarkType === 'graphtec' ? GRAPHTEC_MARGIN_MM
        : regmarkType === 'none' ? 0
        : OPOS_MARGIN_MM;
```
(`bleedMm` stays Roland-only — Graphtec needs no extra page bleed; its marks live inside the top/bottom margin bands.)

- [ ] **Step 3: Dispatch the Graphtec draw fn**

Change the regmark dispatch block to:
```ts
      if (regmarkType === 'roland') {
        drawRolandMarks(outPage, foilWidthMm, totalLengthMm, marginPt, contentHPt, pageHeightPt, bleedPt, MM_TO_PT);
      } else if (regmarkType === 'graphtec') {
        drawGraphtecMarks(outPage, foilWidthMm, marginPt, contentHPt, pageHeightPt, MM_TO_PT);
      } else if (regmarkType !== 'none') {
        drawOposMarks(outPage, foilWidthMm, marginPt, contentHPt, pageHeightPt, MM_TO_PT);
      }
```

- [ ] **Step 4: Add `drawGraphtecMarks`** (place after `drawRolandMarks`, before `export default router;`):
```ts
// ---------------------------------------------------------------------------
// Graphtec CE8000 mark drawing — four Type 1 L-marks at the sheet corners.
// Built as a loop over a list of mark rows so segment marks can be added later.
// ---------------------------------------------------------------------------
function drawGraphtecMarks(
  page: ReturnType<PDFDocument['addPage']>,
  foilWidthMm: number,
  marginPt: number,
  contentHPt: number,
  pageHeightPt: number,
  MM_TO_PT: number,
): void {
  const lLen   = GRAPHTEC_MARK_LEN_MM * MM_TO_PT;
  const lW     = GRAPHTEC_MARK_W_MM   * MM_TO_PT;
  const insetX = GRAPHTEC_INSET_X_MM  * MM_TO_PT;
  const insetY = GRAPHTEC_INSET_Y_MM  * MM_TO_PT;
  const foilWPt = foilWidthMm * MM_TO_PT;

  const leftX  = insetX;                 // L corner X, left marks
  const rightX = foilWPt - insetX;       // L corner X, right marks
  // pdf-lib Y is UP. Top band is at the top of the page, bottom band at the bottom.
  const topY   = pageHeightPt - insetY;  // L corner Y, top band
  const botY   = insetY;                 // L corner Y, bottom band

  // dx/dy = arm directions toward the content (pdf coords):
  //   top marks: content is BELOW  → dy = -1
  //   bottom marks: content is ABOVE → dy = +1
  //   left marks point right (+1), right marks point left (-1)
  const marks = [
    { cx: leftX,  cy: topY, dx:  1, dy: -1 }, // TL
    { cx: rightX, cy: topY, dx: -1, dy: -1 }, // TR
    { cx: leftX,  cy: botY, dx:  1, dy:  1 }, // BL
    { cx: rightX, cy: botY, dx: -1, dy:  1 }, // BR
  ];

  for (const m of marks) {
    // vertical arm (thickness lW, length lLen) — thickness on the dx side
    page.drawRectangle({
      x: m.dx > 0 ? m.cx : m.cx - lW,
      y: m.dy > 0 ? m.cy : m.cy - lLen,
      width: lW, height: lLen, color: rgb(0, 0, 0),
    });
    // horizontal arm (length lLen, thickness lW) — thickness on the dy side
    page.drawRectangle({
      x: m.dx > 0 ? m.cx : m.cx - lLen,
      y: m.dy > 0 ? m.cy : m.cy - lW,
      width: lLen, height: lW, color: rgb(0, 0, 0),
    });
  }
}
```

- [ ] **Step 5: Typecheck**

Run: `cd /c/Users/hulle/sticker-contour-backend && npx tsc --noEmit`
Expected: `` (clean).

- [ ] **Step 6: Verification scope**

The backend has no unit-test harness (consistent with the rest of `printPlanning.ts`), so the gate here is **`npx tsc --noEmit` clean (Step 5)** plus a visual diff of the dispatch/draw code. The actual rendered-PDF check is done end-to-end in Task 5 (export from the frontend against the running backend); the CE8000 cut is final acceptance.

- [ ] **Step 7: Commit, push, PR**
```bash
git add src/routes/printPlanning.ts
git commit -m "feat(printplan): draw Graphtec CE8000 Type 1 marks in export"
git push -u origin feat/graphtec-regmarks
gh pr create --base master --head feat/graphtec-regmarks \
  --title "feat(printplan): Graphtec CE8000 registration marks (backend)" \
  --body "Adds drawGraphtecMarks() (four Type 1 corner L-marks, 20mm/1mm) + 'graphtec' margin mapping + export dispatch. Pairs with the frontend PR. Built as a row-loop so segment marks can be added later. Spec in scf-editor docs."
```
- [ ] **Step 8: Report the PR URL.**

---

## Task 5: Verification & acceptance

- [ ] **Step 1:** With both PRs deployed (Vercel frontend + Railway backend), in the non-WP app: set a vinyl width, add stickers, choose **Graphtec CE8000**, confirm the preview shows four corner L-marks + reserved bands, and export → open the PDF and verify the four L-marks render at the corners outside the sticker area, sized ~20 mm.
- [ ] **Step 2 (operator):** Print the sample on the Roland, load on the CE8000 with ARMS set to **Mark Type 1** (matching size/thickness), run a contour cut, confirm alignment. Tune `GRAPHTEC_MARK_LEN_MM` / `_W_MM` / `_INSET_*` / `_MARGIN_MM` (in BOTH repos, keep them in sync) if the sensor needs it.

---

## Notes for the implementer

- **Keep constants in sync across repos** — the backend block comment says "must match frontend"; any tuning changes both `src/lib/graphtecMarks.ts` and `printPlanning.ts`.
- **DRY:** the frontend preview uses `getGraphtecCorners`; the backend computes pdf-coords inline (separate repo, mirrors `drawRolandMarks`). The shape/sizes come from the shared constants.
- **YAGNI:** four corner marks only; no segments, no configurable sizes, no barcode. The backend draw loops a `marks` list specifically so segments are an additive change later.
- **Extensibility seam:** to add segment marks later, push intermediate rows into the `marks` array (backend) and corresponding entries in `getGraphtecCorners` (frontend) + a spacing constant — corner logic untouched.
