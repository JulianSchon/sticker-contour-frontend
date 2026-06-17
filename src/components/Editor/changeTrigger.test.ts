import { describe, it, expect } from 'vitest';
import { shouldBumpForLayerKind } from './changeTrigger.ts';

describe('shouldBumpForLayerKind', () => {
  it('does not bump for the sticker-body background layer', () => {
    expect(shouldBumpForLayerKind('background')).toBe(false);
  });
  it('bumps for content layers', () => {
    expect(shouldBumpForLayerKind('text')).toBe(true);
    expect(shouldBumpForLayerKind('image')).toBe(true);
    expect(shouldBumpForLayerKind(undefined)).toBe(true);
  });
});
