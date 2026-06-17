import { describe, it, expect } from 'vitest';
import { cmToPx, exportDimensions, SIZE_PRESETS, MAX_EXPORT_PX, EXPORT_DPI } from './printSize.ts';

describe('cmToPx', () => {
  it('converts cm to px at 300 DPI', () => {
    expect(cmToPx(2.54, 300)).toBe(300);
  });
  it('rounds to nearest integer', () => {
    expect(cmToPx(7, 300)).toBe(827);
  });
});

describe('exportDimensions', () => {
  it('computes 300-DPI pixel size for an artboard', () => {
    const d = exportDimensions(5, 5);
    expect(d.dpi).toBe(EXPORT_DPI);
    expect(d.widthPx).toBe(591);
    expect(d.heightPx).toBe(591);
  });
  it('caps the longest side at MAX_EXPORT_PX and lowers effective DPI', () => {
    const d = exportDimensions(40, 20);
    expect(Math.max(d.widthPx, d.heightPx)).toBe(MAX_EXPORT_PX);
    expect(d.widthPx / d.heightPx).toBeCloseTo(2, 1);
    expect(d.dpi).toBeLessThan(EXPORT_DPI);
  });
});

describe('SIZE_PRESETS', () => {
  it('exposes square presets in cm', () => {
    expect(SIZE_PRESETS.map(p => p.wCm)).toContain(7);
  });
});
