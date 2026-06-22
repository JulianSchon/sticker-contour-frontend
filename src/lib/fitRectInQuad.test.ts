import { describe, it, expect } from 'vitest';
import { fitRectInQuad } from './cornerPin.ts';
import type { Pt } from './cornerPin.ts';

const square: [Pt, Pt, Pt, Pt] = [
  { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 },
];

describe('fitRectInQuad', () => {
  it('returns the same quad when the sticker matches the quad aspect', () => {
    const r = fitRectInQuad(square, 1); // square sticker in square quad
    expect(r[0]).toEqual({ x: 0, y: 0 });
    expect(r[1]).toEqual({ x: 100, y: 0 });
    expect(r[2]).toEqual({ x: 100, y: 100 });
    expect(r[3]).toEqual({ x: 0, y: 100 });
  });

  it('letterboxes a wide sticker vertically (reduced height, full width)', () => {
    const r = fitRectInQuad(square, 2); // 2:1 sticker in square quad → height 50, centered
    expect(r[0].x).toBeCloseTo(0, 5);
    expect(r[1].x).toBeCloseTo(100, 5);
    expect(r[0].y).toBeCloseTo(25, 5);
    expect(r[2].y).toBeCloseTo(75, 5);
  });

  it('pillarboxes a tall sticker horizontally (reduced width, full height)', () => {
    const r = fitRectInQuad(square, 0.5); // 1:2 sticker in square quad → width 50, centered
    expect(r[0].y).toBeCloseTo(0, 5);
    expect(r[3].y).toBeCloseTo(100, 5);
    expect(r[0].x).toBeCloseTo(25, 5);
    expect(r[1].x).toBeCloseTo(75, 5);
  });

  it('stays inside a perspective (non-rectangular) quad', () => {
    const persp: [Pt, Pt, Pt, Pt] = [
      { x: 20, y: 10 }, { x: 90, y: 20 }, { x: 80, y: 90 }, { x: 10, y: 80 },
    ];
    const r = fitRectInQuad(persp, 1);
    // Centered fit must lie within the quad's bounding box.
    r.forEach((p) => {
      expect(p.x).toBeGreaterThanOrEqual(10);
      expect(p.x).toBeLessThanOrEqual(90);
      expect(p.y).toBeGreaterThanOrEqual(10);
      expect(p.y).toBeLessThanOrEqual(90);
    });
  });
});
