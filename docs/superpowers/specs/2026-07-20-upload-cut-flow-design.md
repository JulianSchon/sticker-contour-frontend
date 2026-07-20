# Upload & Cut — Third WP Flow + Shape Additions — Design Spec

**Date:** 2026-07-20
**Status:** Approved (pending plan)
**Scope:** Frontend `scf-editor` (WordPress mode) + backend `sticker-contour-backend` geometric shapes. **No WordPress-plugin changes.**

## Goal

Add a **third WordPress start-page flow**: the customer uploads their own image, picks a **cutline type** and **size**, and adds to cart — skipping the design editor. Cutline options: **Kontur** (contour, with adjustable offset), or a fixed shape — **Cirkel, Oval, Kvadrat, Triangel** — with adjustable size. Also add **Oval** to the shape set and give the **Kvadrat** cut a minimal, barely-visible corner radius (so the cutter blade doesn't snag on sharp corners — a machine concern, not a visible design change).

## Context (current state)

- WP start page (`App.tsx`, `wpMode === null`) has two cards after the earlier split: **Designa själv** (`flow='single'`, editor → cut) and **Klistermärkesark** (`flow='sheet'`). `flow: 'single' | 'sheet'` gates all sheet/ARK UI.
- The **cut page** (`cutDialog`) has live preview, material/finish, and **add-to-cart** (`DownloadButton`; in WP mode it routes through the configurator's save→cart path), and shows `ParameterPanel` (the contour **offset**, etc.). **`ShapeSelector` exists as a component but is NOT currently rendered** — so today `shapeType` is fixed to `'contour'`. This flow must render `ShapeSelector` so the customer can pick the cutline.
- Physical size (`stickerWidthCm/Height`) is currently set **only** by the editor's artboard (`handleDesignComplete`). A direct-upload flow must set it itself (CPO pricing = area).
- Backend `buildGeometricPath` (`src/services/geometricPaths.ts`) supports `circle` (arcs), `square` (hard rect), `triangle`. `ShapeType = 'contour'|'circle'|'square'|'triangle'` in both repos.

## Design

### Entry & flow (frontend)
- **Third start-page card** "Ladda upp & skär" (en: "Upload & Cut"): `onClick` sets a **new `flow` value `'upload'`** and `wpMode='upload'`. `flow` becomes `'single' | 'sheet' | 'upload'`; sheet UI still shows only for `flow==='sheet'`, so `'upload'` hides it (same as `'single'`). The distinct value lets the cut page show the shape picker only for this flow.
- **New `wpMode` view `'upload'`** — an **upload screen** = `ImageUpload` (which already includes W×H cm inputs + DPI check). On confirm it calls the existing `handleDesignComplete(file, dataUrl, widthCm, heightCm)` (same entry point the editor uses), which sets state and routes to the cut view (`wpMode='single'`).
- **Cut page reused**, with one addition: render `ShapeSelector` (wired to `params.shapeType/shapeSize/shapeOffsetX/Y`) **only when `flow==='upload'`**, above the existing `ParameterPanel`. Contour → offset (ParameterPanel); shapes → size (ShapeSelector). No sheet UI (flow≠sheet). Add-to-cart unchanged. Back-arrow → start page.
- Encapsulate the upload screen in a small component `src/components/UploadStart.tsx` (props: `onReady(file, dataUrl, widthCm, heightCm)`) so `App.tsx` stays lean.

### Shapes
- **Oval (new):** add `'oval'` to `ShapeType` (both repos); a `ShapeSelector` option (ellipse icon, sv "Oval" / en "Oval"); backend ellipse path — `rx = sw/2 + offset`, `ry = sh/2 + offset`, two-arc ellipse: `M cx-rx cy A rx ry 0 1 1 cx+rx cy A rx ry 0 1 1 cx-rx cy Z`. Uses the existing size slider.
- **Kvadrat → minimal rounded corners:** the `'square'` case builds a **rounded rectangle** with a small fixed radius `r = min(sw, sh) * SQUARE_CORNER_FRAC` (SQUARE_CORNER_FRAC ≈ **0.02**, ~barely visible), clamped to `≤ min(w, h)/2`. Rounded-rect path (with the offset-expanded rect `x,y,w,h`):
  `M x+r y  L x+w-r y  A r r 0 0 1 x+w y+r  L x+w y+h-r  A r r 0 0 1 x+w-r y+h  L x+r y+h  A r r 0 0 1 x y+h-r  L x y+r  A r r 0 0 1 x+r y  Z`.
  No label change, no new control, no new API param. **Triangle stays sharp** (not rounded).

### No CPO / plugin impact
Cut shape affects only the generated PDF, not pricing. The upload screen sets `width/height` (→ CPO as today), and add-to-cart reuses the existing WP save path. The WordPress plugin is untouched.

## Files

**Frontend (`scf-editor`)**
- `src/types/contour.ts` — `ShapeType` += `'oval'`.
- `src/components/ShapeSelector.tsx` — add the Oval option + icon.
- `src/components/UploadStart.tsx` — **new**: `ImageUpload` + size picker → `onReady(...)`.
- `src/App.tsx` — third start card; `wpMode==='upload'` renders `<UploadStart onReady={handleDesignComplete} />`; card sets `flow='single'`, `wpMode='upload'`.
- `src/lib/i18n.ts` — card label/desc, upload-screen strings, "Oval".

**Backend (`sticker-contour-backend`)**
- `src/services/geometricPaths.ts` — add `'oval'` case; round the `'square'` corners.
- `src/types/contour.ts` — `ShapeType` += `'oval'`.
- `src/services/pathSmoother.ts` — accept `'oval'` in the `shapeType` parse.

## Error handling / edge cases
- Upload screen: reuse `ImageUpload`'s format/DPI validation; the cut view is only reachable once a valid file + size are set (Continue disabled otherwise).
- `buildGeometricPath`: existing zero/negative-size guards retained; the rounded-rect radius is clamped so it never exceeds half the rectangle; oval returns `''` if `rx`/`ry` ≤ 0.
- Back-arrow from the upload screen returns to the start page without a partially-set state blocking re-entry.

## Testing
- **Backend (pure):** a small standalone assertion (the repo has no test harness) verifying `buildGeometricPath('oval', …)` emits elliptical arcs with distinct `rx`/`ry`, and `buildGeometricPath('square', …)` now contains arc (`A`) commands (rounded) with a radius ≤ half the side.
- **Frontend:** `ShapeSelector` includes the Oval option (unit/smoke if practical); the new flow is verified **manually in WP mode**: upload → size → each cutline (contour offset; each shape size) → preview → add to cart.

## Non-Goals (YAGNI)
- No triangle-corner rounding; no user-adjustable corner radius.
- No changes to the editor or sheet flows, pricing/CPO, or the WordPress plugin.
- No new shapes beyond Oval; no per-shape aspect controls beyond the existing size slider.
