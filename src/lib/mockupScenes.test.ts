import { describe, it, expect } from 'vitest';
import { MOCKUP_SCENES } from './mockupScenes.ts';

describe('MOCKUP_SCENES', () => {
  it('has at least the five starter scenes', () => {
    expect(MOCKUP_SCENES.length).toBeGreaterThanOrEqual(5);
  });

  it('every scene has a unique id', () => {
    const ids = MOCKUP_SCENES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every scene has exactly four corners and positive photo dimensions', () => {
    for (const s of MOCKUP_SCENES) {
      expect(s.corners).toHaveLength(4);
      s.corners.forEach((c) => {
        expect(Number.isFinite(c.x)).toBe(true);
        expect(Number.isFinite(c.y)).toBe(true);
      });
      expect(s.photoW).toBeGreaterThan(0);
      expect(s.photoH).toBeGreaterThan(0);
      expect(s.photo.startsWith('/mockups/')).toBe(true);
    }
  });

  it('any scene declaring a foreground overlay is the hand scene', () => {
    const withFg = MOCKUP_SCENES.filter((s) => s.foreground);
    withFg.forEach((s) => expect(s.id).toBe('hand'));
  });
});
