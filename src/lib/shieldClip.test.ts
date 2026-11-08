import { describe, it, expect } from 'vitest';
import { nearestShieldIndex } from './shieldClip';
import type { BBox } from './shieldBBox';

// Two shields side by side, like the Peltor template (mm space).
const LEFT: BBox = { x: 5, y: 3, w: 33, h: 62 };
const RIGHT: BBox = { x: 38.9, y: 3, w: 33, h: 62 };

describe('nearestShieldIndex', () => {
  it('picks the shield whose box contains the point', () => {
    expect(nearestShieldIndex({ x: 20, y: 30 }, [LEFT, RIGHT])).toBe(0);
    expect(nearestShieldIndex({ x: 55, y: 30 }, [LEFT, RIGHT])).toBe(1);
  });

  it('picks the nearest shield centre for points outside both boxes', () => {
    expect(nearestShieldIndex({ x: 1, y: 1 }, [LEFT, RIGHT])).toBe(0);
    expect(nearestShieldIndex({ x: 80, y: 68 }, [LEFT, RIGHT])).toBe(1);
  });

  it('resolves the gap between shields by distance to centre', () => {
    // Left centre x = 21.5, right centre x = 55.4 → midpoint ≈ 38.45.
    expect(nearestShieldIndex({ x: 38.3, y: 30 }, [LEFT, RIGHT])).toBe(0);
    expect(nearestShieldIndex({ x: 38.6, y: 30 }, [LEFT, RIGHT])).toBe(1);
  });

  it('is independent of the input order of the boxes', () => {
    expect(nearestShieldIndex({ x: 55, y: 30 }, [RIGHT, LEFT])).toBe(0);
  });

  it('returns -1 when there are no shields', () => {
    expect(nearestShieldIndex({ x: 10, y: 10 }, [])).toBe(-1);
  });
});
