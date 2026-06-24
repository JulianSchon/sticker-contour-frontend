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
