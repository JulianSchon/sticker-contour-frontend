/**
 * Roland VersaWorks registration mark constants and geometry helpers.
 *
 * Layout (top to bottom on the foil):
 *   ┌─────────────────────────────────────┐  ← outer top edge
 *   │  dark header band ("VersaWorks")    │  ROLAND_HEADER_MM tall
 *   │  ●─── tl circle    tr circle ───●  │  circles at ROLAND_INSET_X/Y from edges
 *   ├─────────────────────────────────────┤  ← content top (y = 0)
 *   │           sticker content           │
 *   ├─────────────────────────────────────┤  ← content bottom (y = totalLengthMm)
 *   │  ●─── bl circle    br circle ───●  │
 *   │           ■ bottom-centre rect ■   │
 *   └─────────────────────────────────────┘  ← outer bottom edge
 *
 * All dimensions in mm.
 */

export const ROLAND_MARGIN_MM   = 30;   // extra band added top AND bottom in export
export const ROLAND_HEADER_MM   = 10;   // dark header strip at top of top margin
export const ROLAND_CIRCLE_R_MM = 7;    // registration circle radius
export const ROLAND_INSET_X_MM  = 18;   // circle centre distance from left/right foil edge
export const ROLAND_INSET_Y_MM  = 20;   // circle centre distance from outer edge of margin
export const ROLAND_LMARK_LEN   = 7;    // L-mark arm length
export const ROLAND_LMARK_W     = 1.5;  // L-mark arm thickness
export const ROLAND_BOT_W_MM    = 20;   // bottom-centre rectangle width
export const ROLAND_BOT_H_MM    = 4;    // bottom-centre rectangle height
export const ROLAND_BOT_INSET_Y = 8;    // bottom rect centre from outer bottom edge

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
 */
export function getRolandCorners(foilWidthMm: number, totalLengthMm: number): CornerPositions {
  return {
    tl: { x: ROLAND_INSET_X_MM,                y: -ROLAND_MARGIN_MM + ROLAND_INSET_Y_MM },
    tr: { x: foilWidthMm - ROLAND_INSET_X_MM,  y: -ROLAND_MARGIN_MM + ROLAND_INSET_Y_MM },
    bl: { x: ROLAND_INSET_X_MM,                y: totalLengthMm + ROLAND_MARGIN_MM - ROLAND_INSET_Y_MM },
    br: { x: foilWidthMm - ROLAND_INSET_X_MM,  y: totalLengthMm + ROLAND_MARGIN_MM - ROLAND_INSET_Y_MM },
  };
}
