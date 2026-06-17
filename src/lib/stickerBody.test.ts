import { describe, it, expect } from 'vitest';
import { bodyRectFromBounds } from './stickerBody.ts';

describe('bodyRectFromBounds', () => {
  it('expands the content bounding box by the border in px on all sides', () => {
    const r = bodyRectFromBounds({ left: 100, top: 50, width: 200, height: 80 }, 24);
    expect(r.left).toBe(76);
    expect(r.top).toBe(26);
    expect(r.width).toBe(248);
    expect(r.height).toBe(128);
  });
  it('derives a corner radius proportional to the border', () => {
    const r = bodyRectFromBounds({ left: 0, top: 0, width: 100, height: 100 }, 20);
    expect(r.rx).toBeGreaterThan(0);
  });
});
