# Sticker Mockup Carousel — Design Spec

**Date:** 2026-06-22
**Status:** Approved (pending plan)
**Scope:** Frontend only (`scf-editor`). No backend, no print-file changes.

## Goal

On the cut page's Live Preview, show the user's die-cut sticker composited onto
realistic real-world scenes (laptop, water bottle, notebook, window, hand), in
an auto-rotating carousel. **Visual flair only** — nothing is saved, attached to
the cart, or included in the print file. The print PDF is generated server-side
and is entirely unaffected by this feature.

## Why

A "see it for real" mockup makes the product tangible before purchase and lifts
conversion. Reference: the held-in-hand sticker preview the user shared from a
competitor site, which uses the same corner-pin compositing technique.

## Decisions (locked during brainstorming)

- **Location:** Cut page, within the existing `previewColumn` (the "Live Preview"
  panel area).
- **Behavior:** Auto-rotating carousel — cycles scenes every ~4s, pauses on
  hover/touch, manual prev/next arrows + dot indicators. Respects
  `prefers-reduced-motion` (no autoplay; arrows only).
- **Compositing:** Approach A — CSS `matrix3d` corner-pin of the rendered sticker
  over static scene photos. No new dependencies, GPU-accelerated.
- **Scenes:** Flat surfaces (laptop lid, water bottle, notebook, window) **plus**
  a hand-holding scene that uses a foreground PNG (thumb cutout) layered over the
  sticker so the thumb reads as in front.
- **Assets:** A generated/curated **starter set** of royalty-free scene plates,
  bundled under `public/mockups/`. The scene manifest makes swapping in better or
  custom photos a one-line change later.

## Architecture & Data Flow

1. **Reusable sticker render.** Extract the draw routine currently inside
   `CanvasPreview`'s `useEffect` into a shared pure-ish helper:

   `renderSticker(canvas, img, contour, params, finish, opts: { showCutLines: boolean })`

   It draws: white body fill (clipped to the contour body path) → artwork →
   (optional) kiss/perf guide strokes → finish sheen/matte haze, clipped to the
   body. The canvas is transparent outside the body path, so the same output
   doubles as the composite source.
   - `CanvasPreview` calls it with `showCutLines: true` (unchanged behavior).
   - The mockup calls it with `showCutLines: false` — the colored guide strokes
     are setup aids, not the real product. The real die-cut sticker shows only
     the white border (from a positive cut offset) and no colored line.

2. **Scene manifest** (`mockupScenes.ts`): a typed array. Each scene:
   ```ts
   interface MockupScene {
     id: string;
     labelKey: keyof T;        // i18n label, e.g. "mockLaptop"
     photo: string;            // e.g. "/mockups/laptop.jpg"
     photoW: number;           // intrinsic photo px dimensions
     photoH: number;
     // Target quad in the photo's own pixel space, clockwise from top-left:
     corners: [Pt, Pt, Pt, Pt]; // [TL, TR, BR, BL]
     foreground?: string;      // optional PNG drawn ABOVE the sticker (e.g. thumb)
   }
   type Pt = { x: number; y: number };
   ```

3. **Corner-pin util** (`cornerPin.ts`): a pure function

   `cornerPin(srcW, srcH, corners: [Pt,Pt,Pt,Pt]) => string  // a CSS matrix3d(...)`

   Computes the 2D projective homography mapping the sticker's own rectangle
   `(0,0)-(srcW,srcH)` onto the four destination corners, and returns it as a CSS
   `matrix3d` string (column-major 4×4 with the homography's perspective terms in
   the w-row). The sticker `<canvas>` is positioned at the photo's origin with
   `transform-origin: 0 0` and this transform applied. Standard homogeneous
   solve (8 unknowns from 4 point correspondences).

4. **Composite layering** inside each scene cell (a positioned box scaled to the
   rendered display size, with the photo as the base):
   - `<img>` scene photo (base).
   - `<canvas>` rendered sticker, `matrix3d`-warped, with a CSS `drop-shadow`
     for grounding.
   - optional `<img>` foreground (thumb), warped/placed to sit above the sticker.

   The whole cell scales responsively: we render at the photo's natural size in a
   coordinate box, then CSS-scale the box to fit the available width.

5. **Carousel** (`MockupCarousel.tsx`): owns the active-scene index, a ~4s
   autoplay interval (cleared on hover/touch and when `prefers-reduced-motion`),
   prev/next arrows, and dot indicators. Re-renders the sticker on any change to
   `imageDataUrl`, `contour`, `params.cutMode`, `params.*Offset`, or `finish`, so
   matte↔glossy and offset edits show live in the mockups too.

## Files

**Create**
- `src/lib/cornerPin.ts` — homography → `matrix3d` string (pure; unit-tested).
- `src/lib/renderSticker.ts` — extracted sticker draw routine.
- `src/lib/mockupScenes.ts` — typed scene manifest.
- `src/components/MockupCarousel.tsx` — the carousel + per-scene composite.
- `public/mockups/*` — scene photos + the hand foreground PNG.

**Modify**
- `src/components/CanvasPreview.tsx` — call `renderSticker` (no behavior change).
- `src/App.tsx` — render `MockupCarousel` inside `previewColumn`, below the live
  preview (or behind a small "Live ⇄ Mockups" segmented toggle — see Open UI nit).
- `src/lib/i18n.ts` — scene labels + a section heading (en + sv).

## Edge Cases & Error Handling

- **No contour yet / empty design:** carousel hidden (only the plain live preview
  shows). It appears once `imageDataUrl` + `contour` exist.
- **Scene photo fails to load:** that scene is skipped (filtered out) so the
  carousel never shows a broken image.
- **`prefers-reduced-motion`:** no autoplay; user navigates with arrows/dots.
- **Tall vs wide stickers:** corner-pin maps the sticker rectangle to the quad
  regardless of aspect; no scene is aspect-locked. (We do not auto-pick scenes —
  carousel shows all.)
- **Finish/offset live edits:** re-render is keyed on those props, same as
  `CanvasPreview` today.

## Testing

- **Unit (`cornerPin`):** identity quad → identity-equivalent matrix; a known
  skewed quad → expected matrix (assert key terms within tolerance); degenerate
  quad does not throw.
- **Component smoke (`MockupCarousel`):** renders the expected number of scenes,
  advances index on next-arrow click, autoplay disabled under reduced-motion.
- No backend tests, no e2e — pure client-side visual flair.

## Asset Pipeline (starter set)

The starter plates will be sourced as **royalty-free (CC0/Unsplash-license)**
realistic photos — laptop lid, water bottle, notebook, window, and a hand — and/or
generated, then bundled under `public/mockups/`. For each, corner coordinates are
measured once (eyeballed against the photo and tuned) and recorded in
`mockupScenes.ts`. The hand scene additionally gets a thumb-cutout PNG as
`foreground`. Because all placement lives in the manifest, the shop's own product
photos can replace these later by editing one entry.

## Non-Goals (YAGNI)

- No 3D/WebGL, no curved-surface wrap, no peel-corner animation.
- No auto-selection of "best" scene per sticker.
- No saving/exporting the mockup, no cart attachment, no print-file involvement.
- No per-scene lighting match beyond a static drop-shadow.

## Open UI Nit (decide during implementation, low-risk)

Whether the mockups sit **below** the live preview (always visible) or behind a
small **"Live ⇄ Mockups" segmented toggle**. Default to below-the-preview; revisit
if it crowds the column on mobile.
