import type { BBox } from './shieldBBox.ts';

/**
 * Which shield an object belongs to in "different designs" mode: the shield
 * whose box contains the point, else the one with the nearest centre. The point
 * and boxes share a unit (mm or px). Returns -1 when there are no shields.
 */
export function nearestShieldIndex(p: { x: number; y: number }, boxes: BBox[]): number {
  // Boxes can overlap slightly at the gap; containment is only decisive when unique.
  const containing = boxes
    .map((b, i) => (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h ? i : -1))
    .filter(i => i >= 0);
  if (containing.length === 1) return containing[0];

  let best = -1;
  let bestDist = Infinity;
  boxes.forEach((b, i) => {
    const d = Math.hypot(p.x - (b.x + b.w / 2), p.y - (b.y + b.h / 2));
    if (d < bestDist) { bestDist = d; best = i; }
  });
  return best;
}
