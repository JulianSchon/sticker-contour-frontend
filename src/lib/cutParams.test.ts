import { describe, it, expect } from 'vitest';
import { toContourParams } from './cutParams.ts';
import { DEFAULT_CUT } from '../types/editor.ts';

describe('toContourParams', () => {
  it('maps die-cut to contour shapeType with mm offsets', () => {
    const p = toContourParams({ ...DEFAULT_CUT, mode: 'diecut', borderMm: 3 });
    expect(p.shapeType).toBe('contour');
    expect(p.kissOffset).toBe(3);
    expect(p.perfOffset).toBe(3);
    expect(p.enclose).toBe(true);
  });

  it('maps shape mode to the chosen geometric shapeType', () => {
    const p = toContourParams({ ...DEFAULT_CUT, mode: 'shape', shapeType: 'circle' });
    expect(p.shapeType).toBe('circle');
  });

  it('defaults cutMode to perf (matches current app default)', () => {
    expect(toContourParams(DEFAULT_CUT).cutMode).toBe('perf');
  });
});
