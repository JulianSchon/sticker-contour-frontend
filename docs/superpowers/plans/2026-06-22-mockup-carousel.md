# Sticker Mockup Carousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On the cut page's Live Preview, show the user's die-cut sticker composited onto realistic scene photos (laptop, bottle, notebook, window, hand) in an auto-rotating carousel — visual flair only, never saved or sent to the print file.

**Architecture:** Extract the existing sticker draw routine from `CanvasPreview` into a reusable `renderSticker()` that produces a transparent sticker bitmap. A pure `cornerPin()` util computes a CSS `matrix3d` projective transform that warps that bitmap onto four hand-measured corners of each scene photo. A `MockupCarousel` component layers photo → warped sticker (+ drop-shadow) → optional foreground PNG, and auto-rotates with hover/touch pause, arrows, dots, and `prefers-reduced-motion` support.

**Tech Stack:** React 18 + TypeScript, Vite, Vitest + jsdom + @testing-library/react. No new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-06-22-mockup-carousel-design.md`

**Important environment note:** Tests run under **jsdom**, which does **not** implement the canvas 2D context — `canvas.getContext('2d')` returns `null`. All canvas-drawing code MUST early-return on a null context (the existing code already does). Therefore we do **not** unit-test pixel output; we unit-test the pure math (`cornerPin`) and the component's logic (scene count, navigation, autoplay gating, hidden-when-empty). Visual correctness of the actual rendering is verified manually in the running app.

---

## File Structure

**Create**
- `src/lib/cornerPin.ts` — pure projective-homography math: `solveHomography`, `projectPoint`, `cornerPin` (→ `matrix3d` string). One responsibility: geometry.
- `src/lib/cornerPin.test.ts` — unit tests for the above.
- `src/lib/renderSticker.ts` — the extracted sticker draw routine (body + artwork + optional cut lines + finish), shared by `CanvasPreview` and the carousel.
- `src/lib/mockupScenes.ts` — `MockupScene` type + `MOCKUP_SCENES` manifest (photo paths, measured corners, optional foreground).
- `src/lib/mockupScenes.test.ts` — data-integrity test for the manifest.
- `src/components/MockupCarousel.tsx` — the carousel + per-scene composite.
- `src/components/MockupCarousel.test.tsx` — component logic tests (fixture scenes injected).
- `public/mockups/{laptop,bottle,notebook,window,hand}.jpg` — scene photos.
- `public/mockups/hand-thumb.png` — foreground thumb cutout for the hand scene.
- `public/mockups/measure.html` — dev-only corner-measuring aid (not shipped logic; harmless static file).

**Modify**
- `src/components/CanvasPreview.tsx` — replace the inline draw block with a `renderSticker(..., { showCutLines: true })` call. No behavior change.
- `src/App.tsx` — render `<MockupCarousel>` inside `previewColumn`, below `CanvasPreview`.
- `src/lib/i18n.ts` — scene labels + a section heading (en + sv).

---

## Task 1: Corner-pin geometry util

**Files:**
- Create: `src/lib/cornerPin.ts`
- Test: `src/lib/cornerPin.test.ts`

This is pure math with no DOM — fully unit-testable. `solveHomography` maps the sticker's rectangle `(0,0)-(w,h)` to four destination corners and returns the normalized 3×3 (row-major, `H[8]===1`). `projectPoint` applies it. `cornerPin` formats it as a CSS `matrix3d(...)` string (column-major, with the perspective terms in the w-row).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/cornerPin.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { solveHomography, projectPoint, cornerPin, type Pt } from './cornerPin.ts';

const RECT = 100; // square source for simplicity
const identityCorners: [Pt, Pt, Pt, Pt] = [
  { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 },
];

describe('solveHomography', () => {
  it('returns an identity-equivalent map when dst === src rectangle', () => {
    const H = solveHomography(RECT, RECT, identityCorners);
    const [x, y] = projectPoint(H, 50, 50);
    expect(x).toBeCloseTo(50, 4);
    expect(y).toBeCloseTo(50, 4);
  });

  it('maps each source corner onto its destination corner for a skewed quad', () => {
    const dst: [Pt, Pt, Pt, Pt] = [
      { x: 10, y: 20 }, { x: 110, y: 15 }, { x: 120, y: 130 }, { x: 5, y: 140 },
    ];
    const H = solveHomography(RECT, RECT, dst);
    const srcCorners: Pt[] = [
      { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 },
    ];
    srcCorners.forEach((s, i) => {
      const [x, y] = projectPoint(H, s.x, s.y);
      expect(x).toBeCloseTo(dst[i].x, 4);
      expect(y).toBeCloseTo(dst[i].y, 4);
    });
  });

  it('does not throw on a degenerate (collinear) quad', () => {
    const collinear: [Pt, Pt, Pt, Pt] = [
      { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }, { x: 30, y: 0 },
    ];
    expect(() => solveHomography(RECT, RECT, collinear)).not.toThrow();
  });
});

describe('cornerPin', () => {
  it('emits the identity matrix3d for an unwarped rectangle', () => {
    expect(cornerPin(100, 100, identityCorners)).toBe(
      'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)',
    );
  });

  it('emits a 16-component matrix3d string', () => {
    const dst: [Pt, Pt, Pt, Pt] = [
      { x: 10, y: 20 }, { x: 110, y: 15 }, { x: 120, y: 130 }, { x: 5, y: 140 },
    ];
    const out = cornerPin(100, 100, dst);
    expect(out.startsWith('matrix3d(')).toBe(true);
    const nums = out.slice('matrix3d('.length, -1).split(',');
    expect(nums).toHaveLength(16);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd /c/Users/hulle/scf-editor && npx vitest run src/lib/cornerPin.test.ts`
Expected: FAIL — `Failed to resolve import './cornerPin.ts'` (module does not exist yet).

- [ ] **Step 3: Implement the util**

Create `src/lib/cornerPin.ts`:

```ts
export interface Pt {
  x: number;
  y: number;
}

// 3x3 matrices are stored row-major as length-9 arrays.
type Mat3 = number[];

function adjugate(m: Mat3): Mat3 {
  return [
    m[4] * m[8] - m[5] * m[7], m[2] * m[7] - m[1] * m[8], m[1] * m[5] - m[2] * m[4],
    m[5] * m[6] - m[3] * m[8], m[0] * m[8] - m[2] * m[6], m[2] * m[3] - m[0] * m[5],
    m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3],
  ];
}

function multMat(a: Mat3, b: Mat3): Mat3 {
  const c = new Array<number>(9);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let sum = 0;
      for (let k = 0; k < 3; k++) sum += a[3 * i + k] * b[3 * k + j];
      c[3 * i + j] = sum;
    }
  }
  return c;
}

function multVec(m: Mat3, v: [number, number, number]): [number, number, number] {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

// Map the projective basis onto four points (clockwise: TL, TR, BR, BL).
function basisToPoints(p: [Pt, Pt, Pt, Pt]): Mat3 {
  const m: Mat3 = [
    p[0].x, p[1].x, p[2].x,
    p[0].y, p[1].y, p[2].y,
    1, 1, 1,
  ];
  const v = multVec(adjugate(m), [p[3].x, p[3].y, 1]);
  return multMat(m, [
    v[0], 0, 0,
    0, v[1], 0,
    0, 0, v[2],
  ]);
}

/**
 * Projective transform mapping the source rectangle (0,0)-(w,h) onto `dst`
 * (clockwise from top-left). Returned row-major 3x3, normalized so H[8] === 1.
 */
export function solveHomography(w: number, h: number, dst: [Pt, Pt, Pt, Pt]): Mat3 {
  const src: [Pt, Pt, Pt, Pt] = [
    { x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h },
  ];
  const s = basisToPoints(src);
  const d = basisToPoints(dst);
  const H = multMat(d, adjugate(s));
  const k = H[8] || 1; // avoid divide-by-zero on degenerate input
  return H.map((n) => n / k);
}

/** Apply a row-major 3x3 homography to a point, returning [x, y]. */
export function projectPoint(H: Mat3, x: number, y: number): [number, number] {
  const w = H[6] * x + H[7] * y + H[8];
  return [
    (H[0] * x + H[1] * y + H[2]) / w,
    (H[3] * x + H[4] * y + H[5]) / w,
  ];
}

// Trim floating-point fuzz so identity renders as clean integers.
const fmt = (n: number): number => Number(n.toFixed(6));

/**
 * CSS `matrix3d(...)` (column-major) that warps an element's own box
 * (0,0)-(w,h) onto `corners`. Apply with `transform-origin: 0 0`.
 */
export function cornerPin(w: number, h: number, corners: [Pt, Pt, Pt, Pt]): string {
  const t = solveHomography(w, h, corners);
  const m = [
    t[0], t[3], 0, t[6],
    t[1], t[4], 0, t[7],
    0, 0, 1, 0,
    t[2], t[5], 0, t[8],
  ].map(fmt);
  return `matrix3d(${m.join(',')})`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/cornerPin.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/cornerPin.ts src/lib/cornerPin.test.ts
git commit -m "feat: corner-pin homography util for mockup compositing"
```

---

## Task 2: Extract `renderSticker` from `CanvasPreview`

**Files:**
- Create: `src/lib/renderSticker.ts`
- Modify: `src/components/CanvasPreview.tsx` (replace the inline draw block inside `img.onload`)

Pull the exact drawing logic (currently `CanvasPreview.tsx:59-134`) into a shared function, adding a `showCutLines` switch so the carousel can omit the colored guide strokes. No pixel test (jsdom has no 2D context); verified by existing tests staying green + the build + manual check.

- [ ] **Step 1: Create `src/lib/renderSticker.ts`**

```ts
import { scalePath } from './pathTransforms.ts';
import type { ContourPreviewResponse, ContourParams } from '../types/contour.ts';
import type { Finish } from '../components/MaterialFinishPicker.tsx';

const CANVAS_MAX = 600;

export interface RenderStickerOpts {
  /** Draw the pink/orange kiss/perf guide strokes. Off for realistic mockups. */
  showCutLines: boolean;
}

/**
 * Draw the die-cut sticker (white body clipped to the contour path, artwork,
 * optional cut-line guides, finish sheen/haze) into `canvas`, sizing the canvas
 * to fit the contour. The canvas is transparent outside the sticker body, so
 * the output doubles as a composite source. No-op if there is no 2D context
 * (e.g. jsdom in tests).
 */
export function renderSticker(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  contour: ContourPreviewResponse | null,
  params: ContourParams,
  finish: Finish,
  opts: RenderStickerOpts,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const pad = contour?.pad ?? 0;
  const totalW = img.naturalWidth + pad * 2;
  const totalH = img.naturalHeight + pad * 2;

  const scale = Math.min(CANVAS_MAX / totalW, CANVAS_MAX / totalH, 1);
  const canvasW = Math.round(totalW * scale);
  const canvasH = Math.round(totalH * scale);
  const padPx = Math.round(pad * scale);

  canvas.width = canvasW;
  canvas.height = canvasH;
  ctx.clearRect(0, 0, canvasW, canvasH);

  const showKiss = opts.showCutLines && (params.cutMode === 'kiss' || params.cutMode === 'both');
  const showPerf =
    (params.cutMode === 'perf' || params.cutMode === 'both') && !!contour?.perfSvgPath;

  if (!contour) {
    ctx.drawImage(img, padPx, padPx, Math.round(img.naturalWidth * scale), Math.round(img.naturalHeight * scale));
    return;
  }

  const scaleX = (img.naturalWidth * scale) / contour.width;
  const scaleY = (img.naturalHeight * scale) / contour.height;

  // White sticker body clipped to the cut path (the die-cut look).
  const bodySvg = showPerf && contour.perfSvgPath ? contour.perfSvgPath : contour.kissSvgPath;
  const bodyPath = new Path2D(scalePath(bodySvg, scaleX, scaleY, padPx, padPx));
  ctx.fillStyle = '#ffffff';
  ctx.fill(bodyPath);

  // Artwork on the white body.
  ctx.drawImage(img, padPx, padPx, Math.round(img.naturalWidth * scale), Math.round(img.naturalHeight * scale));

  // Cut-line guides (preview only; never the real product).
  if (showKiss) {
    const kissPath = new Path2D(scalePath(contour.kissSvgPath, scaleX, scaleY, padPx, padPx));
    ctx.save();
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.stroke(kissPath);
    ctx.restore();
  }
  if (showPerf && contour.perfSvgPath && opts.showCutLines) {
    const perfPath = new Path2D(scalePath(contour.perfSvgPath, scaleX, scaleY, padPx, padPx));
    ctx.save();
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.stroke(perfPath);
    ctx.restore();
  }

  // Surface finish over the body (clipped). Preview only.
  ctx.save();
  ctx.clip(bodyPath);
  if (finish === 'matte') {
    ctx.fillStyle = 'rgba(150,150,150,0.22)';
    ctx.fillRect(0, 0, canvasW, canvasH);
  } else {
    const sheen = ctx.createLinearGradient(0, 0, canvasW * 0.7, canvasH);
    sheen.addColorStop(0, 'rgba(255,255,255,0.30)');
    sheen.addColorStop(0.22, 'rgba(255,255,255,0.07)');
    sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
    sheen.addColorStop(1, 'rgba(0,0,0,0.12)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, canvasW, canvasH);
  }
  ctx.restore();
}
```

Note: when `showPerf` is true but `showCutLines` is false, the body still uses the perf path (correct — that is the real cut edge); only the colored *stroke* is suppressed. The `showKiss` guard already folds in `showCutLines`.

- [ ] **Step 2: Rewire `CanvasPreview.tsx` to use it**

In `src/components/CanvasPreview.tsx`:

Add the import near the top (after the existing imports):

```ts
import { renderSticker } from '../lib/renderSticker.ts';
```

Replace the entire `img.onload = () => { ... };` body (the block currently spanning roughly lines 59–135) with:

```ts
    img.onload = () => {
      renderSticker(canvas, img, contour, params, finish, { showCutLines: true });
    };
```

Remove the now-unused `scalePath` import and the `CANVAS_MAX` constant from `CanvasPreview.tsx` (they live in `renderSticker.ts` now). Leave `MAX_TILT`, `WELL_STYLE`, the tilt handlers, and the JSX untouched.

- [ ] **Step 3: Verify existing tests + typecheck + build still pass**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: tsc clean; all existing tests PASS (no new failures); build succeeds. (No new test here — pixel output is not testable under jsdom; this is a behavior-preserving extraction.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/renderSticker.ts src/components/CanvasPreview.tsx
git commit -m "refactor: extract renderSticker from CanvasPreview (adds showCutLines)"
```

---

## Task 3: Generate & measure the scene assets

**Files:**
- Create: `public/mockups/{laptop,bottle,notebook,window,hand}.jpg`
- Create: `public/mockups/hand-thumb.png`
- Create: `public/mockups/measure.html`

This task produces the photo backplates and the four corner coordinates per scene. It is asset work, not code — its verification is visual (Task 6 wires it up). The corner numbers produced here are consumed verbatim by Task 4.

- [ ] **Step 1: Obtain five royalty-free scene photos**

Source from a royalty-free, no-attribution library (Unsplash License / CC0 — e.g. unsplash.com, pexels.com). Pick clean, evenly-lit shots with one obvious flat region for the sticker:
- `laptop.jpg` — closed/angled laptop lid, lid facing camera.
- `bottle.jpg` — matte water bottle, label area roughly front-facing.
- `notebook.jpg` — closed hardcover notebook/journal on a desk.
- `window.jpg` — a glass surface / car window from outside.
- `hand.jpg` — a hand holding a small blank card between thumb and fingers (thumb in front), like the reference screenshot.

Resize each so the longest edge is ~1200 px and save as JPEG (quality ~82) into `public/mockups/`. Keep them under ~250 KB each.

- [ ] **Step 2: Create the corner-measuring aid**

Create `public/mockups/measure.html`:

```html
<!doctype html>
<meta charset="utf-8" />
<title>Mockup corner measurer</title>
<style>
  body { font: 14px system-ui; margin: 16px; }
  #wrap { position: relative; display: inline-block; }
  img { display: block; max-width: 90vw; }
  #pts { white-space: pre; margin-top: 12px; }
</style>
<p>Pick an image, then click the 4 corners in order: top-left, top-right, bottom-right, bottom-left. Coordinates are in the image's natural pixels.</p>
<input type="file" id="file" accept="image/*" />
<div id="wrap"><img id="img" /></div>
<div id="pts"></div>
<script>
  const img = document.getElementById('img');
  const out = document.getElementById('pts');
  const pts = [];
  document.getElementById('file').onchange = (e) => {
    img.src = URL.createObjectURL(e.target.files[0]);
    pts.length = 0; out.textContent = '';
  };
  img.onclick = (e) => {
    const r = img.getBoundingClientRect();
    const x = Math.round((e.clientX - r.left) * (img.naturalWidth / r.width));
    const y = Math.round((e.clientY - r.top) * (img.naturalHeight / r.height));
    pts.push({ x, y });
    out.textContent =
      'photoW: ' + img.naturalWidth + ', photoH: ' + img.naturalHeight + '\n' +
      'corners: ' + JSON.stringify(pts);
  };
</script>
```

- [ ] **Step 3: Measure each scene's placement quad**

Run the dev server (`npm run dev`) and open `http://localhost:5173/mockups/measure.html`. For each photo, load it and click the four corners of the region where the sticker should sit (TL, TR, BR, BL), tilting the quad to match the surface's perspective. Record `photoW`, `photoH`, and the `corners` array for each scene. Keep these numbers for Task 4.

- [ ] **Step 4: Create the hand foreground (thumb) cutout**

From `hand.jpg`, make `public/mockups/hand-thumb.png`: the **same dimensions as `hand.jpg`**, fully transparent except for the thumb (and any fingers) that should appear *in front of* the sticker. (Cut it out in any editor, or run the existing `/remove-bg` on a cropped thumb and place it back on a transparent canvas of the full photo size.) When overlaid at the photo's full size with no transform, it lines up pixel-for-pixel with `hand.jpg`.

- [ ] **Step 5: Commit the assets**

```bash
git add public/mockups
git commit -m "assets: starter mockup scene photos + thumb foreground + measuring aid"
```

---

## Task 4: Scene manifest

**Files:**
- Create: `src/lib/mockupScenes.ts`
- Test: `src/lib/mockupScenes.test.ts`

Encodes the measured scenes as typed data. The test guards structural integrity (every scene has 4 corners, positive photo dimensions, a label key). Replace the example coordinate numbers below with the **actual values measured in Task 3** — the structure is fixed, only the numbers change.

- [ ] **Step 1: Write the failing test**

Create `src/lib/mockupScenes.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { MOCKUP_SCENES } from './mockupScenes.ts';

describe('MOCKUP_SCENES', () => {
  it('has at least the five starter scenes', () => {
    expect(MOCKUP_SCENES.length).toBeGreaterThanOrEqual(5);
  });

  it('every scene has a unique id', () => {
    const ids = MOCKUP_SCENES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every scene has exactly four corners and positive photo dimensions', () => {
    for (const s of MOCKUP_SCENES) {
      expect(s.corners).toHaveLength(4);
      s.corners.forEach((c) => {
        expect(Number.isFinite(c.x)).toBe(true);
        expect(Number.isFinite(c.y)).toBe(true);
      });
      expect(s.photoW).toBeGreaterThan(0);
      expect(s.photoH).toBeGreaterThan(0);
      expect(s.photo.startsWith('/mockups/')).toBe(true);
    }
  });

  it('exactly one scene (hand) declares a foreground overlay', () => {
    const withFg = MOCKUP_SCENES.filter((s) => s.foreground);
    expect(withFg).toHaveLength(1);
    expect(withFg[0].id).toBe('hand');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/mockupScenes.test.ts`
Expected: FAIL — `Failed to resolve import './mockupScenes.ts'`.

- [ ] **Step 3: Implement the manifest**

Create `src/lib/mockupScenes.ts`. **Replace the corner/photo numbers with the values measured in Task 3** (the values below are illustrative of the shape):

```ts
import type { Pt } from './cornerPin.ts';
import type { T } from './i18n.ts';

export interface MockupScene {
  id: string;
  /** i18n key for the human label. */
  labelKey: keyof T;
  /** Public path to the scene photo. */
  photo: string;
  /** The photo's intrinsic pixel dimensions. */
  photoW: number;
  photoH: number;
  /** Sticker placement quad in photo px, clockwise: [TL, TR, BR, BL]. */
  corners: [Pt, Pt, Pt, Pt];
  /** Optional PNG (same size as photo) drawn ABOVE the sticker, e.g. a thumb. */
  foreground?: string;
}

export const MOCKUP_SCENES: MockupScene[] = [
  {
    id: 'hand',
    labelKey: 'mockHand',
    photo: '/mockups/hand.jpg',
    photoW: 1200,
    photoH: 1200,
    corners: [{ x: 470, y: 360 }, { x: 760, y: 330 }, { x: 800, y: 760 }, { x: 500, y: 800 }],
    foreground: '/mockups/hand-thumb.png',
  },
  {
    id: 'laptop',
    labelKey: 'mockLaptop',
    photo: '/mockups/laptop.jpg',
    photoW: 1200,
    photoH: 800,
    corners: [{ x: 430, y: 210 }, { x: 690, y: 240 }, { x: 680, y: 470 }, { x: 420, y: 440 }],
  },
  {
    id: 'bottle',
    labelKey: 'mockBottle',
    photo: '/mockups/bottle.jpg',
    photoW: 900,
    photoH: 1200,
    corners: [{ x: 360, y: 470 }, { x: 560, y: 480 }, { x: 555, y: 760 }, { x: 365, y: 750 }],
  },
  {
    id: 'notebook',
    labelKey: 'mockNotebook',
    photo: '/mockups/notebook.jpg',
    photoW: 1200,
    photoH: 800,
    corners: [{ x: 470, y: 250 }, { x: 760, y: 270 }, { x: 745, y: 560 }, { x: 455, y: 540 }],
  },
  {
    id: 'window',
    labelKey: 'mockWindow',
    photo: '/mockups/window.jpg',
    photoW: 1200,
    photoH: 800,
    corners: [{ x: 520, y: 230 }, { x: 800, y: 250 }, { x: 790, y: 520 }, { x: 510, y: 500 }],
  },
];
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/mockupScenes.test.ts`
Expected: PASS (4 tests). (`keyof T` requires the i18n keys to exist — they are added in Task 6. If running Task 4 before Task 6, `npx tsc --noEmit` will report the missing keys; that is expected and resolved in Task 6. The Vitest run itself passes because esbuild strips types.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/mockupScenes.ts src/lib/mockupScenes.test.ts
git commit -m "feat: mockup scene manifest with measured corners"
```

---

## Task 5: MockupCarousel component

**Files:**
- Create: `src/components/MockupCarousel.tsx`
- Test: `src/components/MockupCarousel.test.tsx`

Renders one scene at a time: photo → warped sticker canvas → optional foreground. Auto-rotates every 4s (paused on hover/touch and under reduced-motion), with prev/next arrows and dots. Returns `null` when there is no image or contour. Accepts `scenes` as a prop (defaulting to `MOCKUP_SCENES`) so tests inject fixtures and the canvas-less jsdom path is exercised safely.

- [ ] **Step 1: Write the failing tests**

Create `src/components/MockupCarousel.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MockupCarousel } from './MockupCarousel.tsx';
import type { MockupScene } from '../lib/mockupScenes.ts';
import type { ContourPreviewResponse, ContourParams } from '../types/contour.ts';

const SCENES: MockupScene[] = [
  { id: 'a', labelKey: 'mockLaptop', photo: '/mockups/a.jpg', photoW: 100, photoH: 100,
    corners: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }] },
  { id: 'b', labelKey: 'mockBottle', photo: '/mockups/b.jpg', photoW: 100, photoH: 100,
    corners: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }] },
];

const contour: ContourPreviewResponse = {
  kissSvgPath: 'M0 0 H10 V10 H0 Z', perfSvgPath: null,
  width: 10, height: 10, originalWidth: 10, originalHeight: 10, pad: 0,
};
const params = { cutMode: 'perf', kissOffset: 0, perfOffset: 6, threshold: 50,
  smoothing: 2, enclose: false, shapeType: 'contour', shapeSize: 100,
  shapeOffsetX: 0, shapeOffsetY: 0 } as ContourParams;

const baseProps = { imageDataUrl: 'data:image/png;base64,AAAA', contour, params, finish: 'glossy' as const };

beforeEach(() => {
  // jsdom has no matchMedia; default to "motion allowed".
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }) as unknown as typeof window.matchMedia;
});

describe('MockupCarousel', () => {
  it('renders nothing when there is no image', () => {
    const { container } = render(<MockupCarousel {...baseProps} imageDataUrl={null} scenes={SCENES} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when there is no contour', () => {
    const { container } = render(<MockupCarousel {...baseProps} contour={null} scenes={SCENES} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the first scene photo initially', () => {
    render(<MockupCarousel {...baseProps} scenes={SCENES} />);
    const photo = screen.getByTestId('mockup-photo') as HTMLImageElement;
    expect(photo.getAttribute('src')).toBe('/mockups/a.jpg');
  });

  it('advances to the next scene when the next arrow is clicked', () => {
    render(<MockupCarousel {...baseProps} scenes={SCENES} />);
    fireEvent.click(screen.getByLabelText('next'));
    const photo = screen.getByTestId('mockup-photo') as HTMLImageElement;
    expect(photo.getAttribute('src')).toBe('/mockups/b.jpg');
  });

  it('wraps around from the last scene to the first', () => {
    render(<MockupCarousel {...baseProps} scenes={SCENES} />);
    fireEvent.click(screen.getByLabelText('prev'));
    const photo = screen.getByTestId('mockup-photo') as HTMLImageElement;
    expect(photo.getAttribute('src')).toBe('/mockups/b.jpg');
  });

  it('renders one dot per scene', () => {
    render(<MockupCarousel {...baseProps} scenes={SCENES} />);
    expect(screen.getAllByTestId('mockup-dot')).toHaveLength(2);
  });

  it('drops a scene whose photo fails to load', () => {
    render(<MockupCarousel {...baseProps} scenes={SCENES} />);
    fireEvent.error(screen.getByTestId('mockup-photo'));
    // The failed first scene is removed; the next becomes current.
    const photo = screen.getByTestId('mockup-photo') as HTMLImageElement;
    expect(photo.getAttribute('src')).toBe('/mockups/b.jpg');
    expect(screen.getAllByTestId('mockup-dot')).toHaveLength(1);
  });

  it('renders nothing once every scene photo has failed', () => {
    const { container } = render(<MockupCarousel {...baseProps} scenes={SCENES} />);
    fireEvent.error(screen.getByTestId('mockup-photo')); // drops 'a' → shows 'b'
    fireEvent.error(screen.getByTestId('mockup-photo')); // drops 'b' → empty
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/components/MockupCarousel.test.tsx`
Expected: FAIL — `Failed to resolve import './MockupCarousel.tsx'`.

- [ ] **Step 3: Implement the component**

Create `src/components/MockupCarousel.tsx`:

```tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { renderSticker } from '../lib/renderSticker.ts';
import { cornerPin } from '../lib/cornerPin.ts';
import { MOCKUP_SCENES, type MockupScene } from '../lib/mockupScenes.ts';
import { useLang } from '../lib/LangContext.ts';
import type { ContourPreviewResponse, ContourParams } from '../types/contour.ts';
import type { Finish } from './MaterialFinishPicker.tsx';

interface Props {
  imageDataUrl: string | null;
  contour: ContourPreviewResponse | null;
  params: ContourParams;
  finish: Finish;
  /** Injectable for tests; defaults to the bundled manifest. */
  scenes?: MockupScene[];
}

const ROTATE_MS = 4000;
const BOX_W = 460; // displayed width of the scene box in px

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function MockupCarousel({ imageDataUrl, contour, params, finish, scenes = MOCKUP_SCENES }: Props) {
  const { t } = useLang();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const stickerRef = useRef<HTMLCanvasElement>(null);

  const reduced = prefersReducedMotion();
  // Scenes whose photo loaded (or hasn't failed yet). Spec: drop on load error.
  const visible = useMemo(() => scenes.filter((s) => !failed.has(s.id)), [scenes, failed]);
  const count = visible.length;
  const scene = count > 0 ? visible[index % count] : undefined;

  // Keep the index in range as scenes drop out.
  useEffect(() => {
    if (count > 0 && index >= count) setIndex(0);
  }, [count, index]);

  // Render the die-cut sticker (no guide strokes) whenever inputs change.
  useEffect(() => {
    const canvas = stickerRef.current;
    if (!canvas || !imageDataUrl) return;
    const img = new Image();
    img.onload = () => renderSticker(canvas, img, contour, params, finish, { showCutLines: false });
    img.src = imageDataUrl;
  }, [imageDataUrl, contour, params.cutMode, params.kissOffset, params.perfOffset, finish, index, scene]);

  // Auto-rotate (unless paused or reduced-motion).
  useEffect(() => {
    if (paused || reduced || count <= 1) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => window.clearInterval(id);
  }, [paused, reduced, count]);

  const go = (delta: number) => setIndex((i) => (i + delta + count) % count);
  const dropScene = (id: string) => setFailed((prev) => new Set(prev).add(id));

  // Warp transform for the current scene. The sticker canvas lays out at its
  // bitmap size; we corner-pin that box onto the scene's measured quad.
  const transform = useMemo(() => {
    if (!scene) return 'none';
    const c = stickerRef.current;
    const w = c?.width || 1;
    const h = c?.height || 1;
    return cornerPin(w, h, scene.corners);
  }, [scene, imageDataUrl, contour, params.perfOffset, params.kissOffset, params.cutMode]);

  if (!imageDataUrl || !contour || !scene) return null;

  const boxScale = BOX_W / scene.photoW;
  const boxH = scene.photoH * boxScale;

  return (
    <div className="flex flex-col gap-2">
      <p className="nim-label">{t.mockHeading}</p>
      <div
        className="relative mx-auto overflow-hidden rounded-2xl border border-white/10 bg-black/20"
        style={{ width: BOX_W, height: boxH }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
      >
        {/* Unscaled photo-space coordinate box, scaled down to fit. */}
        <div
          style={{
            position: 'absolute', top: 0, left: 0,
            width: scene.photoW, height: scene.photoH,
            transform: `scale(${boxScale})`, transformOrigin: '0 0',
          }}
        >
          <img
            data-testid="mockup-photo"
            src={scene.photo}
            alt={String(t[scene.labelKey])}
            onError={() => dropScene(scene.id)}
            style={{ position: 'absolute', top: 0, left: 0, width: scene.photoW, height: scene.photoH }}
          />
          <canvas
            ref={stickerRef}
            style={{
              position: 'absolute', top: 0, left: 0,
              transformOrigin: '0 0', transform,
              filter: 'drop-shadow(0 8px 10px rgba(0,0,0,0.35))',
            }}
          />
          {scene.foreground && (
            <img
              src={scene.foreground}
              alt=""
              aria-hidden="true"
              style={{ position: 'absolute', top: 0, left: 0, width: scene.photoW, height: scene.photoH, pointerEvents: 'none' }}
            />
          )}
        </div>

        <button
          aria-label="prev"
          onClick={() => go(-1)}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white grid place-items-center hover:bg-black/70"
        >‹</button>
        <button
          aria-label="next"
          onClick={() => go(1)}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white grid place-items-center hover:bg-black/70"
        >›</button>
      </div>

      <div className="flex items-center justify-center gap-1.5">
        {visible.map((s, i) => (
          <button
            key={s.id}
            data-testid="mockup-dot"
            aria-label={String(t[s.labelKey])}
            onClick={() => setIndex(i)}
            className={`w-2 h-2 rounded-full transition-colors ${i === (index % count) ? 'bg-nim-yellow' : 'bg-white/25'}`}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/components/MockupCarousel.test.tsx`
Expected: PASS (6 tests). (The sticker canvas does not actually draw under jsdom — `renderSticker` no-ops on the null context — but photo/arrows/dots/visibility logic all assert correctly.)

- [ ] **Step 5: Commit**

```bash
git add src/components/MockupCarousel.tsx src/components/MockupCarousel.test.tsx
git commit -m "feat: MockupCarousel — auto-rotating sticker scene preview"
```

---

## Task 6: i18n labels + cut-page integration

**Files:**
- Modify: `src/lib/i18n.ts` (add keys to BOTH `en` and `sv`)
- Modify: `src/App.tsx` (render the carousel in `previewColumn`)

- [ ] **Step 1: Add the i18n keys**

In `src/lib/i18n.ts`, inside the `en` object, after the `livePreview: 'Live Preview',` line (near the "Preview" section), add:

```ts
    mockHeading: 'See it for real',
    mockHand: 'In hand',
    mockLaptop: 'On a laptop',
    mockBottle: 'On a bottle',
    mockNotebook: 'On a notebook',
    mockWindow: 'On glass',
```

In the `sv` object, after its `livePreview: 'Liveförhandsvisning',` line, add:

```ts
    mockHeading: 'Se den på riktigt',
    mockHand: 'I handen',
    mockLaptop: 'På en laptop',
    mockBottle: 'På en flaska',
    mockNotebook: 'På ett block',
    mockWindow: 'På glas',
```

- [ ] **Step 2: Render the carousel in the preview column**

In `src/App.tsx`, add the import after the `CanvasPreview` import (line 3 area):

```ts
import { MockupCarousel } from './components/MockupCarousel.tsx';
```

Then in the `previewColumn` JSX, immediately after the closing `</div>` of the block that wraps `<CanvasPreview ... />` (the `<div className="flex-1 rounded-2xl overflow-hidden border border-white/10" ...>` ending at line ~145), add:

```tsx
      <MockupCarousel imageDataUrl={imageDataUrl} contour={contour ?? null} params={params} finish={finish} />
```

- [ ] **Step 3: Typecheck, test, and build**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: tsc clean (the `keyof T` references in `mockupScenes.ts` now resolve); all tests PASS; build succeeds.

- [ ] **Step 4: Manual visual check**

Run `npm run dev`, design a sticker, continue to the cut page. Confirm: the "See it for real" carousel appears below the live preview; the sticker sits correctly on each scene; it auto-rotates ~every 4s; hovering pauses it; arrows and dots navigate; on the hand scene the thumb overlaps the sticker; switching matte/glossy and changing the offset updates the mockup. If any scene's sticker is misaligned, adjust that scene's `corners` in `mockupScenes.ts` and re-check.

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n.ts src/App.tsx
git commit -m "feat: show mockup carousel on the cut page"
```

---

## Task 7: Final verification & PR

**Files:** none (verification + git).

- [ ] **Step 1: Full green check**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: tsc clean; all tests PASS (including the new `cornerPin`, `mockupScenes`, `MockupCarousel` suites); build succeeds.

- [ ] **Step 2: Push and open the PR**

```bash
git push -u origin feat/mockup-carousel
gh pr create --base master --head feat/mockup-carousel \
  --title "feat: sticker mockup carousel on the cut page" \
  --body "Auto-rotating preview that composites the die-cut sticker onto real scenes (hand, laptop, bottle, notebook, glass) via CSS matrix3d corner-pin. Reuses the extracted renderSticker(); visual flair only — nothing is saved or sent to the print file. Spec: docs/superpowers/specs/2026-06-22-mockup-carousel-design.md"
```

- [ ] **Step 3: Report the PR URL to the user and await the merge decision.**

---

## Notes for the implementer

- **DRY:** `renderSticker` is the single source of truth for the die-cut look; `CanvasPreview` and `MockupCarousel` both consume it. Do not duplicate draw logic.
- **YAGNI:** No 3D, no auto-scene-selection, no export. If tempted, stop.
- **jsdom limit:** never assert on canvas pixels in tests; the 2D context is null there.
- **Corner numbers:** the manifest coordinates in Task 4 are illustrative — the real values come from measuring the Task 3 photos. Mismatched corners just look slightly off; fix by re-measuring, no code change.
- **Print safety:** this feature touches no backend route and no PDF generation. The mockup canvas is display-only.
