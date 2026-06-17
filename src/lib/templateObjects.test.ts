import { describe, it, expect } from 'vitest';
import { pctToPx } from './templateObjects.ts';

describe('pctToPx', () => {
  it('maps a percentage of a dimension to pixels', () => {
    expect(pctToPx(50, 600)).toBe(300);
    expect(pctToPx(0, 600)).toBe(0);
    expect(pctToPx(100, 600)).toBe(600);
  });
  it('handles fractional percentages', () => {
    expect(pctToPx(12.5, 800)).toBe(100);
  });
});
