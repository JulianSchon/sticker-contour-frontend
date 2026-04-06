/**
 * Roland VersaWorks registration mark constants and geometry helpers.
 *
 * Geometry derived from the official Roland VersaWorks SVG specification
 * (SVG dimensions 40.18×50.29mm, viewBox 113.89×142.55 units, 1u=0.3528mm):
 *
 *   ┌────────────────────────────────────┐  ← outer top edge (y = -ROLAND_MARGIN_MM)
 *   │  header band ("VersaWorks")       │  ROLAND_HEADER_MM tall
 *   │  ●  top-left      top-right  ●   │  circles tangent to ALL outer edges
 *   ├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤  ← content top (y=0)
 *   │  ↕ 5 mm clearance zone            │  no printing/cutting within this band
 *   ├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤  safe area starts
 *   │         sticker content           │
 *   ├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤  safe area ends
 *   │  ↕ 5 mm clearance zone            │
 *   ├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤  ← content bottom (y = totalLengthMm)
 *   │  ●  bot-left      bot-right  ●   │  L-marks at content boundary corners
 *   │                      ■ rect ■    │  rect 4mm left of BR circle, same Y
 *   └────────────────────────────────────┘  ← outer bottom edge
 *
 * All dimensions in mm.
 */

// Total margin band added above AND below the content in the exported PDF.
// = 2 × radius + 5 mm clearance  →  2×5 + 5 = 15 mm
export const ROLAND_MARGIN_MM         = 15;

// Dark header strip at the very top of the top margin band
export const ROLAND_HEADER_MM         = 8;

// Circle radius → Ø10 mm as specified
export const ROLAND_CIRCLE_R_MM       = 5;

// Circle centres are tangent to the foil left/right edges (centre = radius from edge)
export const ROLAND_INSET_X_MM        = 5;   // = ROLAND_CIRCLE_R_MM

// Circle centres are tangent to the outer top/bottom of the margin band (centre = radius from outer edge)
export const ROLAND_INSET_Y_MM        = 5;   // = ROLAND_CIRCLE_R_MM

// L-mark arm length (both arms are equal, ~2 mm per SVG measurement)
export const ROLAND_LMARK_LEN         = 2;

// L-mark line thickness
export const ROLAND_LMARK_W           = 0.5;

// Bottom-right rectangle dimensions (measured from SVG: 7.2 × 3.9 mm)
export const ROLAND_BOT_W_MM          = 7;
export const ROLAND_BOT_H_MM          = 4;

// Gap between rectangle's right edge and the BR circle's left edge (~4 mm per SVG)
export const ROLAND_BOT_GAP_MM        = 4;

// Required clearance from content boundary into the safe working area
export const ROLAND_WORK_CLEARANCE_MM = 5;

export interface CornerPositions {
  tl: { x: number; y: number };
  tr: { x: number; y: number };
  bl: { x: number; y: number };
  br: { x: number; y: number };
}

/**
 * Returns the four circle-centre positions in mm.
 * Coordinate origin = top-left of the content area (y=0 is content top).
 * Negative y values are inside the top margin band.
 *
 * Circles are tangent to the outer edges of the margin band:
 *   top circles:    cy = -MARGIN + INSET_Y  = -15 + 5 = -10
 *   bottom circles: cy = totalLength + MARGIN - INSET_Y = totalLength + 10
 */
export function getRolandCorners(foilWidthMm: number, totalLengthMm: number): CornerPositions {
  const topY = -ROLAND_MARGIN_MM + ROLAND_INSET_Y_MM;         // = -10 mm
  const botY = totalLengthMm + ROLAND_MARGIN_MM - ROLAND_INSET_Y_MM; // = totalLength + 10 mm
  return {
    tl: { x: ROLAND_INSET_X_MM,                y: topY },
    tr: { x: foilWidthMm - ROLAND_INSET_X_MM,  y: topY },
    bl: { x: ROLAND_INSET_X_MM,                y: botY },
    br: { x: foilWidthMm - ROLAND_INSET_X_MM,  y: botY },
  };
}
