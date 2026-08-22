import { describe, it, expect } from 'vitest';
import { clampToRange, sizeMatches, sameSize, pillLabel } from './templateSize';

describe('templateSize helpers', () => {
  it('clampToRange clamps below, inside and above', () => {
    const r = { min: 30, max: 150 };
    expect(clampToRange(10, r)).toBe(30);
    expect(clampToRange(90, r)).toBe(90);
    expect(clampToRange(999, r)).toBe(150);
  });

  it('sizeMatches uses a sub-mm epsilon', () => {
    const s = { id: 'x', name: 'X', widthMm: 204, heightMm: 90 };
    expect(sizeMatches(s, { widthMm: 204, heightMm: 90 })).toBe(true);
    expect(sizeMatches(s, { widthMm: 204.0005, heightMm: 90 })).toBe(true);
    expect(sizeMatches(s, { widthMm: 204, heightMm: 91 })).toBe(false);
  });

  it('sameSize treats null as different and compares with epsilon', () => {
    expect(sameSize(null, { widthMm: 1, heightMm: 1 })).toBe(false);
    expect(sameSize({ widthMm: 204, heightMm: 90 }, { widthMm: 204, heightMm: 90 })).toBe(true);
    expect(sameSize({ widthMm: 204, heightMm: 90 }, { widthMm: 204, heightMm: 110 })).toBe(false);
  });

  it('pillLabel shortens standard-size names', () => {
    expect(pillLabel('33 cl — helt varv (204 × 90 mm)')).toBe('33 cl');
    expect(pillLabel('Standard (95 × 120 mm)')).toBe('Standard');
    expect(pillLabel('170 × 87,8 cm')).toBe('170 × 87,8 cm');
  });
});
