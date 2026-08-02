import { describe, it, expect } from 'vitest';
import { orderLeftToRight, type BBox } from './shieldBBox';

describe('orderLeftToRight', () => {
  it('sorts boxes by x ascending', () => {
    const a: BBox = { x: 100, y: 0, w: 40, h: 80 };
    const b: BBox = { x: 10, y: 0, w: 40, h: 80 };
    expect(orderLeftToRight([a, b])).toEqual([b, a]);
  });
});
