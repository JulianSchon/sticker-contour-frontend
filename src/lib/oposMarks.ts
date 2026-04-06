/**
 * Summa OPOS registration mark utilities.
 *
 * OPOS marks are solid black squares placed along the top and bottom of the
 * printed foil. The Summa cutter's optical sensor reads them to register the
 * exact position and correct for any skew or scaling error.
 *
 * Spec (from Summa OPOS manual):
 *   - Shape  : filled black square
 *   - Size   : 5 mm × 5 mm  (minimum 3 mm; 5 mm for foil printing)
 *   - Spacing: ≤ 200 mm between mark centres across the width
 *   - Inset  : 15 mm from left and right edges
 *   - Margin : 20 mm strip at top and bottom of the print reserved for marks
 *   - Centre Y of marks: 10 mm from the outer edge of the margin strip
 */

export const OPOS_MARK_SIZE_MM = 5;
export const OPOS_MARGIN_MM    = 20;   // extra strip added to top AND bottom in export
export const OPOS_MARK_INSET   = 15;   // mm from left / right foil edge
export const OPOS_MAX_SPACING  = 200;  // mm max between consecutive marks
export const OPOS_CENTER_DEPTH = 10;   // mm from outer edge of margin to mark centre

/**
 * Returns the X centre positions (in mm, from left foil edge) for a row of OPOS marks.
 */
export function getOposMarkXPositions(foilWidthMm: number): number[] {
  const left  = OPOS_MARK_INSET;
  const right = foilWidthMm - OPOS_MARK_INSET;

  if (right <= left) return [foilWidthMm / 2];   // very narrow foil – single mark

  const positions: number[] = [left];
  let cursor = left;
  while (cursor + OPOS_MAX_SPACING < right - OPOS_MAX_SPACING / 2) {
    cursor += OPOS_MAX_SPACING;
    positions.push(cursor);
  }
  positions.push(right);

  // Deduplicate positions that are too close together (< 10 mm apart)
  return positions.filter((x, i, arr) => i === 0 || x - arr[i - 1] >= 10);
}
