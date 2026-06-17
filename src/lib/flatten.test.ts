import { describe, it, expect } from 'vitest';
import { computeExportMultiplier } from './flatten.ts';

describe('computeExportMultiplier', () => {
  it('returns the factor that scales the on-screen canvas to the target px width', () => {
    expect(computeExportMultiplier(700, 591)).toBeCloseTo(0.8443, 3);
  });
  it('handles upscaling (display smaller than target)', () => {
    expect(computeExportMultiplier(300, 591)).toBeCloseTo(1.97, 2);
  });
});
