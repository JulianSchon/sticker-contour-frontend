# Graphtec CE8000 Registration Marks — Design Spec

**Date:** 2026-06-24
**Status:** Approved (pending plan)
**Scope:** The non-WordPress **Print Planning** (sheet-on-vinyl) export. Spans two repos — frontend `scf-editor` and backend `sticker-contour-backend`. No WordPress/plugin changes.

## Goal

Add a **"Graphtec CE8000"** registration-mark option to the print-planning sheet export, alongside the existing **OPOS** and **Roland** options. Workflow: set vinyl width → add stickers → choose **Graphtec CE8000** → print on the Roland → load on the CE8000, whose ARMS reads the marks and contour-cuts the stickers.

## Context (current architecture)

`RegmarkType = 'opos' | 'roland' | 'none'`. Each mark system has:
- a **frontend constants/geometry module** (`src/lib/oposMarks.ts`, `src/lib/rolandMarks.ts`),
- a **preview layer** in `src/components/PrintPlanning/LayoutCanvas.tsx`,
- a **UI button** in `src/components/PrintPlanning/PrintPlanningTab.tsx`,
- and a **backend draw function** in `src/routes/printPlanning.ts` (`drawOposMarks` / `drawRolandMarks`) called from the `/api/print-planning/export` route, which builds the PDF with `pdf-lib` (mm→pt via `MM_TO_PT = 72/25.4`, page = vinyl width × length + a per-type margin band).

Adding `'graphtec'` plugs into this exact seam — additive, no refactor.

## Graphtec CE8000 mark spec (from the manuals)

- **Type 1 marks**: L-shaped (right-angle) marks placed at the corners, **outside the cut area** (Type 1 = no marks inside the artwork). This is the type to draw.
- **Mark size (arm length): 4–20 mm.** Larger detects more reliably under skew — we use the max.
- **Line thickness: 0.3–1.0 mm.** We use the top of the range for robust sensing.
- A **clear quiet zone** must surround each mark (no other printing in it).

Sources: [CE8000 manual](https://mygraphtec.jp/site_download/manual/ce8000/CE8000-UM-151-02-01-ENG_Protect.pdf), [mark-size range (CE6000)](https://www.manualslib.com/manual/924008/Graphtec-Ce6000-Series.html?page=129), [Mark Type 1 (FC8000)](https://www.manualslib.com/manual/950580/Graphtec-Fc8000-Series.html?page=103).

## Decisions (locked)

- **4-corner Type 1 marks** now (one registration span over the sheet). Code structured so **segment marks** can be added later without rework (see Extensibility).
- **Fixed geometry constants** (not user-configurable), matching the OPOS/Roland pattern. The operator configures the CE8000's ARMS once to match.
- UI label: **"Graphtec CE8000"**.

## Mark geometry (defaults — tunable constants, confirmed by the first real test cut)

```
GRAPHTEC_MARK_LEN_MM   = 20    // L arm length (max of 4–20 for reliable sensing on rolls)
GRAPHTEC_MARK_W_MM     = 1.0   // line thickness (max of 0.3–1.0)
GRAPHTEC_MARGIN_MM     = 25    // band reserved on ALL sides for marks + quiet zone (≈ arm 20 + 5 clear)
GRAPHTEC_INSET_MM      = 5     // mark's outer corner sits this far in from the sheet edge
```

- Four **L marks**, one per corner, forming a registration rectangle that **encloses** the sticker area. Each L = two perpendicular arms (`GRAPHTEC_MARK_LEN_MM` long, `GRAPHTEC_MARK_W_MM` thick, solid black `rgb(0,0,0)`), the right-angle opening toward the artwork; the **inner corner of each L is the registration point**.
- The stickers pack **inside** the registration rectangle (foil width − 2·margin, length − 2·margin), keeping the quiet zone clear between marks and artwork.
- Mark corners come from a helper `getGraphtecCorners(foilWidthMm, contentHeightMm)` returning the four corner registration points + each arm's direction, so the draw code is a simple loop.

## Extensibility (segment marks later, no rework)

The backend `drawGraphtecMarks` iterates a **list of mark rows** (initially just the top and bottom corner rows). Adding segment marks later = push intermediate Y rows (at a spacing) into that list + a spacing constant — the corner logic is untouched. The spec does **not** build segments now.

## Files

**Frontend (`scf-editor`)**
- `src/types/printPlanning.ts` — add `'graphtec'` to `RegmarkType`.
- `src/lib/graphtecMarks.ts` — **new**: the constants above + `getGraphtecCorners(...)` (+ X/Y position helpers). Pure, unit-tested.
- `src/components/PrintPlanning/LayoutCanvas.tsx` — **new `GraphtecLayer`** preview (renders the four L-marks + the reserved margin), selected when `regmarkType === 'graphtec'`.
- `src/components/PrintPlanning/PrintPlanningTab.tsx` — new **"Graphtec CE8000"** button (with a short sub-label noting the operator sets the cutter's ARMS to Mark Type 1, matching size/thickness).

**Backend (`sticker-contour-backend`)**
- `src/routes/printPlanning.ts` — add `'graphtec'` to the `regmarkType` union; add `GRAPHTEC_MARGIN_MM` to the margin mapping; add `drawGraphtecMarks(page, foilWidthMm, contentHeightMm, marginMm, MM_TO_PT)`; dispatch it in the export route.

## Error handling / edge cases

- **Sheet too small** for marks + quiet zone (very narrow/short vinyl): clamp insets / skip gracefully (no crash), same defensive style as `drawOposMarks`/`drawRolandMarks`. If the content area would be non-positive after the margin band, the export still produces a valid PDF (marks may overlap minimally) rather than erroring.
- Marks are **vector overlays** drawn into the PDF — no artwork regeneration.
- `'graphtec'` flows through the existing FormData `layout` payload; no API-shape change beyond the new enum value.

## Testing

- **Unit (pure helpers):** `getGraphtecCorners`, the margin/inset math, and any X/Y position helpers — tested in the existing frontend Vitest setup, the way `oposMarks`/`rolandMarks` helpers are (if they have tests) or as new focused tests.
- **Backend:** `printPlanning.ts` mark drawing isn't unit-tested (PDF output); verify by generating a sample export and inspecting mark placement/size (a small Node script that parses the PDF page size + checks the four marks exist, mirroring how bleed was verified), plus visual check of the preview matching the PDF.
- **Acceptance (operator):** a real **CE8000 ARMS test cut** — print a sample on the Roland, run it on the CE8000 with ARMS set to Mark Type 1 / matching size, confirm the contour aligns. Defaults (length/thickness/margin) are tuned from this if needed.

## Non-Goals (YAGNI)

- No segment/intermediate marks now (designed-for, not built).
- No user-configurable mark size/thickness/count (fixed constants).
- No barcode/DataLink, no auto-generation of the cut file (the CE8000 generates the cut path from its own contour data + ARMS; we only print the marks + artwork).
- No changes to OPOS/Roland, the WordPress flow, or sticker packing logic.
