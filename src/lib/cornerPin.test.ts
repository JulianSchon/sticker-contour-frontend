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
